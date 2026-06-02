
# -*- coding: utf-8 -*-
import frappe


@frappe.whitelist()
def close_won(deal_name, win_reason=None):
    deal = frappe.get_doc("HM Deal", deal_name)
    deal.status = "Đã chốt"
    deal.probability = 100
    if win_reason:
        deal.win_reason = win_reason
    deal.save(ignore_permissions=True)
    return {"ok": True, "sample_order": deal.sample_order}


@frappe.whitelist()
def close_lost(deal_name, lost_reason=None):
    deal = frappe.get_doc("HM Deal", deal_name)
    if not lost_reason:
        frappe.throw("Phải có lý do thua")
    deal.status = "Thất bại"
    deal.probability = 0
    deal.lost_reason = lost_reason
    deal.save(ignore_permissions=True)
    return {"ok": True}
