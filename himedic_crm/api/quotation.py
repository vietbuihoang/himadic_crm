
# -*- coding: utf-8 -*-
import frappe


@frappe.whitelist()
def send_quotation(name, channel="Email"):
    q = frappe.get_doc("HM Quotation", name)
    q.status = "Đã gửi"
    q.delivery_method = channel
    q.sent_at = frappe.utils.now_datetime()
    q.save(ignore_permissions=True)
    # In real life: build PDF, send via SMTP / Zalo
    return {"ok": True}


@frappe.whitelist()
def approve_discount(name):
    q = frappe.get_doc("HM Quotation", name)
    if q.approval_status != "Đang chờ":
        frappe.throw("Báo giá không ở trạng thái chờ duyệt")
    q.approval_status = "Đã duyệt"
    q.approver = frappe.session.user
    q.save(ignore_permissions=True)
    if q.deal:
        frappe.db.set_value("HM Deal", q.deal, "discount_approval_status", "Đã duyệt")
        frappe.db.set_value("HM Deal", q.deal, "discount_approver", frappe.session.user)
    return {"ok": True}


@frappe.whitelist()
def reject_discount(name, remark=None):
    q = frappe.get_doc("HM Quotation", name)
    q.approval_status = "Từ chối"
    q.approval_remark = remark
    q.approver = frappe.session.user
    q.save(ignore_permissions=True)
    if q.deal:
        frappe.db.set_value("HM Deal", q.deal, "discount_approval_status", "Từ chối")
    return {"ok": True}
