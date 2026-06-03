# -*- coding: utf-8 -*-
import frappe


@frappe.whitelist()
def tests(limit=200):
    rows = frappe.get_list("HM Lab Test",
        fields=["name", "test_code", "test_name_vi", "test_name_en", "test_group", "sample_type",
                "tat_hours", "retail_price", "b2b_price", "is_active"],
        limit_page_length=int(limit), order_by="test_group asc")
    return {"rows": rows, "total": frappe.db.count("HM Lab Test")}


@frappe.whitelist()
def package(limit=100):
    rows = frappe.get_list("HM Test Package",
        fields=["name", "package_code", "package_name", "category", "retail_price", "b2b_price", "is_active"],
        limit_page_length=int(limit), order_by="package_name asc")
    out = []
    for r in rows:
        doc = frappe.get_doc("HM Test Package", r["name"])
        r["item_count"] = len(doc.get("items") or [])
        out.append(r)
    return {"rows": out, "total": len(out)}
