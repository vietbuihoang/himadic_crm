# -*- coding: utf-8 -*-
"""Communication Hub operations — send Zalo / Email, log calls (desktop write path)."""
import frappe
from frappe.utils import now_datetime


def _activity(ref_dt, ref_name, atype, subject, note=None):
    if not (ref_dt and ref_name):
        return
    frappe.get_doc({
        "doctype": "HM Activity", "activity_time": now_datetime(), "user": frappe.session.user,
        "activity_type": atype, "subject": subject, "note": note,
        "reference_doctype": ref_dt, "reference_name": ref_name,
    }).insert(ignore_permissions=True)


@frappe.whitelist()
def email_templates():
    return frappe.get_all("HM Email Template", filters={"is_active": 1},
                          fields=["name", "template_name", "subject", "body"])


@frappe.whitelist()
def send_zalo(contact, body=None, template_code=None, reference_doctype=None, reference_name=None):
    phone = frappe.db.get_value("HM Contact", contact, "phone")
    if not phone:
        frappe.throw("Khách hàng chưa có số điện thoại để gửi Zalo")
    status = "Sent"
    try:
        from himedic_crm.utils.notify import send_zalo_template
        if template_code:
            send_zalo_template(phone, template_code, {})
    except Exception:
        status = "Pending"  # OA not configured in this environment
        frappe.log_error(frappe.get_traceback(), "send_zalo")
    msg = frappe.get_doc({
        "doctype": "HM Zalo Message", "sent_at": now_datetime(), "contact": contact, "phone": phone,
        "direction": "Outbound", "template_code": template_code, "body": body, "status": status,
        "reference_doctype": reference_doctype, "reference_name": reference_name,
    }).insert(ignore_permissions=True)
    _activity(reference_doctype, reference_name, "Zalo", "Gửi Zalo", body)
    return {"ok": True, "message": msg.name, "status": status}


@frappe.whitelist()
def send_email(contact, subject=None, body=None, template=None, reference_doctype=None, reference_name=None):
    email = frappe.db.get_value("HM Contact", contact, "email")
    if not email:
        frappe.throw("Khách hàng chưa có email")
    if template:
        t = frappe.get_doc("HM Email Template", template)
        subject = subject or t.subject
        body = body or t.body
    sent = True
    try:
        frappe.sendmail(recipients=[email], subject=subject or "(không tiêu đề)",
                        message=body or "", now=True)
    except Exception:
        sent = False  # SMTP not configured — logged as activity regardless
        frappe.log_error(frappe.get_traceback(), "send_email")
    _activity(reference_doctype, reference_name, "Email", subject or "Email", body)
    return {"ok": True, "sent": sent, "to": email}


@frappe.whitelist()
def send_sms(contact, body, reference_doctype=None, reference_name=None):
    phone = frappe.db.get_value("HM Contact", contact, "phone")
    if not phone:
        frappe.throw("Khách hàng chưa có số điện thoại")
    from himedic_crm.utils.sms import send_sms as _gw
    res = _gw(phone, body)
    _activity(reference_doctype, reference_name, "SMS", "Gửi SMS", body)
    return {"ok": True, "sent": bool(res.get("ok")), "gateway": res}


@frappe.whitelist()
def log_call(contact, call_outcome=None, duration_sec=0, reference_doctype=None, reference_name=None):
    phone = frappe.db.get_value("HM Contact", contact, "phone")
    log = frappe.get_doc({
        "doctype": "HM VoIP Call Log", "call_time": now_datetime(), "user": frappe.session.user,
        "contact": contact, "phone": phone, "direction": "Outbound",
        "duration_sec": int(duration_sec or 0), "call_outcome": call_outcome,
        "reference_doctype": reference_doctype, "reference_name": reference_name,
    }).insert(ignore_permissions=True)
    _activity(reference_doctype, reference_name, "Cuộc gọi", "Cuộc gọi đi", call_outcome)
    return {"ok": True, "call": log.name}
