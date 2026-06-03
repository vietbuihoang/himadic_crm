# -*- coding: utf-8 -*-
"""Deal business operations invoked from the desktop CRM (write path)."""
import json

import frappe
from frappe.utils import add_days, nowdate
from frappe.model.workflow import apply_workflow, get_transitions


def _recompute(deal):
    deal.subtotal = sum((i.amount or 0) for i in deal.items)
    deal.grand_total = (deal.subtotal or 0) - (deal.discount_amount or 0)


@frappe.whitelist()
def set_items(deal_name, items):
    """Replace the deal's service lines and recompute totals."""
    rows = json.loads(items) if isinstance(items, str) else (items or [])
    deal = frappe.get_doc("HM Deal", deal_name)
    deal.check_permission("write")
    deal.set("items", [])
    for r in rows:
        deal.append("items", {
            "test_or_package": r.get("test_or_package") or "Test",
            "test": r.get("test"), "package": r.get("package"),
            "item_name": r.get("item_name"), "qty": r.get("qty") or 1,
            "price": r.get("price") or 0, "amount": r.get("amount") or 0,
        })
    _recompute(deal)
    deal.save()
    return {"ok": True, "subtotal": deal.subtotal, "grand_total": deal.grand_total}


@frappe.whitelist()
def request_discount(deal_name, discount_pct):
    """BR-D-010: discount ≥5% routes through approval (≥10% to Director); <5% auto-approved."""
    pct = float(discount_pct or 0)
    deal = frappe.get_doc("HM Deal", deal_name)
    deal.check_permission("write")
    deal.discount_pct = pct
    deal.discount_amount = round((deal.subtotal or 0) * pct / 100)
    _recompute(deal)
    if pct >= 5:
        deal.discount_approval_status = "Đang chờ"
        deal.save()
        approver = (frappe.db.get_value("HM Team", deal.team, "manager") if deal.team else None) \
            or deal.owner_user or frappe.session.user
        frappe.get_doc({
            "doctype": "HM Task",
            "subject": f"Duyệt chiết khấu {pct:g}% – {deal.name}",
            "task_type": "Khác", "status": "Open", "assigned_to": approver,
            "due_date": add_days(nowdate(), 1),
            "reference_doctype": "HM Deal", "reference_name": deal.name,
        }).insert(ignore_permissions=True)
    else:
        deal.discount_approval_status = "Đã duyệt"
        deal.discount_approver = frappe.session.user
        deal.save()
    return {"ok": True, "approval_status": deal.discount_approval_status,
            "grand_total": deal.grand_total}


@frappe.whitelist()
def approve_discount(deal_name):
    deal = frappe.get_doc("HM Deal", deal_name)
    deal.check_permission("write")
    deal.discount_approval_status = "Đã duyệt"
    deal.discount_approver = frappe.session.user
    deal.save()
    _close_discount_task(deal_name)
    return {"ok": True}


@frappe.whitelist()
def reject_discount(deal_name, remark=None):
    deal = frappe.get_doc("HM Deal", deal_name)
    deal.check_permission("write")
    deal.discount_approval_status = "Từ chối"
    deal.discount_approver = frappe.session.user
    deal.save()
    _close_discount_task(deal_name)
    return {"ok": True}


def _close_discount_task(deal_name):
    for t in frappe.get_all("HM Task", filters={"reference_doctype": "HM Deal",
                            "reference_name": deal_name, "status": "Open"}, pluck="name"):
        frappe.db.set_value("HM Task", t, "status", "Done")


@frappe.whitelist()
def apply_action(deal_name, action):
    doc = frappe.get_doc("HM Deal", deal_name)
    doc.check_permission("write")
    apply_workflow(doc, action)
    return {"ok": True, "status": doc.status}


@frappe.whitelist()
def transitions(deal_name):
    doc = frappe.get_doc("HM Deal", deal_name)
    return [t.get("action") for t in get_transitions(doc)]


@frappe.whitelist()
def close_won(deal_name, win_reason=None, appointment_date=None):
    """Mark deal Won. The on_update_deal hook auto-creates the Sample Order (BR-D-005)."""
    deal = frappe.get_doc("HM Deal", deal_name)
    deal.check_permission("write")
    if not deal.items:
        frappe.throw("Cơ hội phải có ≥1 dịch vụ trước khi chốt (BR-S-001)")
    if not (win_reason or deal.win_reason):
        frappe.throw("Phải nhập lý do thắng khi chốt (Won)")
    # apply_workflow reloads the doc from DB, so persist the required fields first
    updates = {"probability": 100}
    if win_reason:
        updates["win_reason"] = win_reason
    frappe.db.set_value("HM Deal", deal_name, updates)
    deal.reload()
    if deal.status != "Đã chốt":
        apply_workflow(deal, "HM Close Won")  # save → on_update_deal → _spawn_sample_order
    else:
        deal.save()
    so_name = frappe.db.get_value("HM Deal", deal.name, "sample_order")
    if so_name and appointment_date:
        frappe.db.set_value("HM Sample Order", so_name, "appointment_date", appointment_date)
    return {"ok": True, "sample_order": so_name}


@frappe.whitelist()
def close_lost(deal_name, lost_reason=None):
    """BR-D-015: lost deal must have a reason."""
    deal = frappe.get_doc("HM Deal", deal_name)
    deal.check_permission("write")
    if not lost_reason:
        frappe.throw("Phải có lý do thua (BR-D-015)")
    # apply_workflow saves (status→Thất bại) and validate_deal checks lost_reason during
    # that save → persist the reason first, then transition.
    frappe.db.set_value("HM Deal", deal_name, {"lost_reason": lost_reason, "probability": 0})
    deal.reload()
    if deal.status != "Thất bại":
        apply_workflow(deal, "HM Close Lost")
    return {"ok": True}
