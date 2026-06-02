# -*- coding: utf-8 -*-
import frappe

LIST_FIELDS = ["name", "deal_title", "contact", "organization", "grand_total", "probability",
               "status", "owner_user", "expected_close_date", "deal_type", "region"]


@frappe.whitelist()
def kanban():
    stages = frappe.get_all("HM Deal Stage", fields=["name"], order_by="idx asc") or \
             [{"name": s} for s in ["Thẩm định", "Báo giá", "Đàm phán", "Đã chốt", "Thất bại"]]
    colors = {"Thẩm định": "sky", "Báo giá": "amber", "Đàm phán": "violet", "Đã chốt": "emerald", "Thất bại": "rose"}
    columns = []
    for s in stages:
        st = s["name"]
        cards = frappe.get_list("HM Deal", filters={"status": st}, fields=LIST_FIELDS,
                                limit_page_length=20, order_by="modified desc")
        val = sum((c.get("grand_total") or 0) for c in cards)
        columns.append({"stage": st, "color": colors.get(st, "slate"),
                        "count": frappe.db.count("HM Deal", {"status": st}), "value": val, "cards": cards})
    total_open = frappe.db.count("HM Deal", {"status": ["not in", ["Đã chốt", "Thất bại"]]})
    return {"columns": columns, "summary": {"open": total_open}}


@frappe.whitelist()
def detail(name=None):
    if not name:
        name = frappe.db.get_value("HM Deal", {}, "name", order_by="modified desc")
    if not name:
        return None
    doc = frappe.get_doc("HM Deal", name)
    doc.check_permission("read")
    d = doc.as_dict()
    d["items"] = [i.as_dict() for i in (doc.get("items") or [])]
    return d
