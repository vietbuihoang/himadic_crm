
# -*- coding: utf-8 -*-
import frappe


def validate_manifest(doc, method=None):
    if not doc.items:
        frappe.throw("Manifest phải có ≥ 1 ống mẫu (BR-L-105)")
    if not doc.seal_no:
        frappe.throw("Phải có số seal niêm phong")


def on_submit_manifest(doc, method=None):
    # Push to LIS for each item when received_at_lab
    from himedic_crm.utils.lis import push_sample_to_lis
    for it in doc.items or []:
        if it.received_at_lab and it.sample_order:
            try:
                push_sample_to_lis(it.sample_order)
            except Exception:
                frappe.log_error(frappe.get_traceback(), "LIS push failed")
