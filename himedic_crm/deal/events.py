
# -*- coding: utf-8 -*-
import frappe
from frappe.utils import now_datetime


def validate_deal(doc, method=None):
    # BR-D-015: lost requires reason
    if doc.status == "Thất bại" and not doc.lost_reason:
        frappe.throw("Phải nhập lý do thua khi đóng Lost.")
    if doc.status == "Đã chốt" and not doc.win_reason:
        frappe.throw("Phải nhập lý do thắng khi đóng Won.")
    # BR-D-010: discount approval
    if (doc.discount_pct or 0) >= 5 and not doc.discount_approval_status:
        doc.discount_approval_status = "Đang chờ"


def on_update_deal(doc, method=None):
    if doc.has_value_changed("status") and doc.status == "Đã chốt":
        doc.db_set("closed_at", now_datetime(), update_modified=False)
        _spawn_sample_order(doc)


def validate_quotation(doc, method=None):
    if (doc.requested_discount_pct or 0) >= 5 and not doc.approval_status:
        doc.approval_status = "Đang chờ"


def on_submit_quotation(doc, method=None):
    # mark Deal latest_quotation
    if doc.deal:
        frappe.db.set_value("HM Deal", doc.deal, "latest_quotation", doc.name)


def _spawn_sample_order(deal):
    """BR-D-005: auto-create SO when Deal Won."""
    if deal.sample_order:
        return
    so = frappe.get_doc({
        "doctype": "HM Sample Order",
        "deal": deal.name,
        "contact": deal.contact,
        "organization": deal.organization,
        "order_type": "Tại nhà" if deal.deal_type == "Đơn lẻ" else "Hợp đồng",
        "assigned_to": deal.owner_user,
        "team": deal.team,
        "region": deal.region,
        "appointment_date": frappe.utils.nowdate(),
        "appointment_time": "09:00:00",
        "items": [
            {"item_type": it.test_or_package, "test": it.test, "package": it.package,
             "item_name": it.item_name, "qty": it.qty, "price": it.price, "amount": it.amount}
            for it in (deal.items or [])
        ],
        "discount_amount": deal.discount_amount,
        "status": "Đã phân công",
    }).insert(ignore_permissions=True)
    deal.db_set("sample_order", so.name)
