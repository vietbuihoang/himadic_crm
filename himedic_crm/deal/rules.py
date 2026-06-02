
# -*- coding: utf-8 -*-
import frappe


def enforce_rules(deal):
    """BR-D-* enforcement."""
    settings = frappe.get_single("HM CRM Settings")
    thr_low = settings.discount_approve_threshold_low or 5
    thr_high = settings.discount_approve_threshold_high or 10
    if (deal.discount_pct or 0) >= thr_high:
        deal.discount_approval_status = deal.discount_approval_status or "Đang chờ"
    if deal.status == "Đã chốt":
        if not deal.items:
            frappe.throw("Cơ hội Won phải có ít nhất 1 dịch vụ.")
