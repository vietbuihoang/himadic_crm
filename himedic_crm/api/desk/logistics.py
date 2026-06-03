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


@frappe.whitelist()
def detail(name):
    m = frappe.get_doc("HM Sample Manifest", name)
    items = [{
        "sample_order": it.sample_order,
        "tube_barcode": it.tube_barcode,
        "received_at_lab": it.received_at_lab,
        "reject_reason": it.reject_reason,
    } for it in (m.items or [])]
    return {
        "name": m.name,
        "manifest_date": m.manifest_date,
        "shipper": m.shipper,
        "status": m.status,
        "from_region": m.from_region,
        "to_lab": m.to_lab,
        "total_items": m.total_items,
        "rejected_items": m.rejected_items,
        "arrived_at": m.arrived_at,
        "items": items,
        "status_color": M_STATUS_COLOR,
    }
