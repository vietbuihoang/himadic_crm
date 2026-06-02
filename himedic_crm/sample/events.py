
# -*- coding: utf-8 -*-
import frappe


def validate_sample_order(doc, method=None):
    # BR-S-001 — at least one test
    if not doc.items:
        frappe.throw("Sample Order phải có ≥ 1 test/gói")
    # BR-S-005 — tubes have unique barcodes
    seen = set()
    for t in doc.tubes or []:
        if t.barcode in seen:
            frappe.throw(f"Barcode {t.barcode} bị trùng")
        seen.add(t.barcode)


def after_insert_sample_order(doc, method=None):
    pass


def on_update_sample_order(doc, method=None):
    # BR-S-006: signature required before lock
    if doc.locked and not doc.signature_image:
        frappe.throw("Khách phải ký số trước khi lock đơn")
