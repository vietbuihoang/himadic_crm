# -*- coding: utf-8 -*-
import frappe

M_STATUS_COLOR = {"Đang đóng gói": "amber", "Đã giao shipper": "sky", "Đang vận chuyển": "blue",
                  "Đã đến Lab": "violet", "Đã đối soát": "emerald", "Đã đóng": "slate"}


@frappe.whitelist()
def manifest(limit=50):
    rows = frappe.get_list("HM Sample Manifest",
        fields=["name", "manifest_date", "shipper", "status", "from_region", "to_lab",
                "total_items", "rejected_items", "temperature_breached"],
        limit_page_length=int(limit), order_by="manifest_date desc")
    return {"rows": rows, "status_color": M_STATUS_COLOR}


@frappe.whitelist()
def reception():
    rows = frappe.get_list("HM Sample Manifest",
        filters={"status": ["in", ["Đã đến Lab", "Đã đối soát"]]},
        fields=["name", "manifest_date", "shipper", "status", "total_items", "rejected_items", "arrived_at"],
        limit_page_length=50, order_by="manifest_date desc")
    return {"rows": rows}
