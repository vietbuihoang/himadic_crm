# -*- coding: utf-8 -*-
import frappe

LIST_FIELDS = ["name", "full_name", "customer_type", "phone", "email", "pid", "owner_user", "vip", "region"]


@frappe.whitelist()
def list(limit=50, start=0):
    rows = frappe.get_list("HM Contact", fields=LIST_FIELDS, limit_page_length=int(limit),
                           limit_start=int(start), order_by="modified desc")
    return {"rows": rows, "total": frappe.db.count("HM Contact"),
            "by_type": {t: frappe.db.count("HM Contact", {"customer_type": t})
                        for t in ["Cá nhân", "Phòng khám", "Bệnh viện", "Doanh nghiệp", "Bảo hiểm"]}}


@frappe.whitelist()
def profile(name=None):
    if not name:
        name = frappe.db.get_value("HM Contact", {}, "name", order_by="modified desc")
    if not name:
        return None
    doc = frappe.get_doc("HM Contact", name)
    doc.check_permission("read")
    d = doc.as_dict()
    d["deals"] = frappe.get_list("HM Deal", filters={"contact": name},
                                 fields=["name", "deal_title", "grand_total", "status", "modified"], limit_page_length=10)
    d["results"] = frappe.get_list("HM Test Result", filters={"contact": name},
                                   fields=["name", "result_date", "released_at"], limit_page_length=10)
    return d
