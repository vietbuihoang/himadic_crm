# -*- coding: utf-8 -*-
import frappe

LIST_FIELDS = ["name", "lead_name", "phone", "organization_name", "customer_type",
               "source", "score", "status", "owner_user", "region", "campaign", "modified"]


@frappe.whitelist()
def list(limit=50, start=0):
    rows = frappe.get_list("HM Lead", fields=LIST_FIELDS, limit_page_length=int(limit),
                           limit_start=int(start), order_by="modified desc")
    total = frappe.db.count("HM Lead")
    return {"rows": rows, "total": total,
            "summary": {"total": total, "new_today": frappe.db.count(
                "HM Lead", {"creation": [">=", frappe.utils.nowdate()]})}}


# Canonical pipeline order (matches the HM Lead Pipeline workflow), left → right.
STAGE_ORDER = ["Mới", "Đã liên hệ", "Đủ điều kiện", "Chăm sóc", "Đã chuyển đổi", "Đã hủy"]
STAGE_COLOR = {"Mới": "sky", "Đã liên hệ": "amber", "Đủ điều kiện": "emerald",
               "Chăm sóc": "violet", "Đã chuyển đổi": "cyan", "Đã hủy": "rose"}


@frappe.whitelist()
def kanban():
    columns = []
    for st in STAGE_ORDER:
        cards = frappe.get_list("HM Lead", filters={"status": st},
                                fields=LIST_FIELDS, limit_page_length=20, order_by="modified desc")
        columns.append({"stage": st, "color": STAGE_COLOR.get(st, "slate"),
                        "count": frappe.db.count("HM Lead", {"status": st}), "cards": cards})
    return {"columns": columns}


@frappe.whitelist()
def detail(name=None):
    if not name:
        name = frappe.db.get_value("HM Lead", {}, "name", order_by="modified desc")
    if not name:
        return None
    doc = frappe.get_doc("HM Lead", name)
    doc.check_permission("read")
    d = doc.as_dict()
    d["activities"] = [a.as_dict() for a in (doc.get("activities") or [])]
    return d
