
# -*- coding: utf-8 -*-
"""Customer-facing portal API: OTP login, results, appointments."""
import frappe, random, hashlib, json
from frappe.utils import now_datetime, add_to_date


@frappe.whitelist(allow_guest=True)
def request_otp(phone):
    if not phone:
        frappe.throw("Cần SĐT")
    contact = frappe.db.get_value("HM Contact", {"phone": phone}, "name")
    if not contact:
        frappe.throw("Không tìm thấy khách hàng với SĐT này")
    code = f"{random.randint(0, 999999):06d}"
    key = f"hm_portal_otp::{phone}"
    frappe.cache().set_value(key, code, expires_in_sec=300)
    # SMS / Zalo
    try:
        from himedic_crm.utils.notify import send_zalo_template
        send_zalo_template(phone, "OTP_PORTAL", {"code": code})
    except Exception:
        pass
    return {"ok": True}


@frappe.whitelist(allow_guest=True)
def verify_otp(phone, code):
    key = f"hm_portal_otp::{phone}"
    real = frappe.cache().get_value(key)
    if not real or str(code) != str(real):
        frappe.throw("OTP không đúng hoặc đã hết hạn")
    contact = frappe.db.get_value("HM Contact", {"phone": phone}, "name")
    user_email = f"customer.{contact}@hi-medic.local"
    if not frappe.db.exists("User", user_email):
        u = frappe.get_doc({
            "doctype": "User",
            "email": user_email,
            "first_name": contact,
            "send_welcome_email": 0,
            "user_type": "Website User",
            "roles": [{"role": "HM Customer"}],
        }).insert(ignore_permissions=True)
    frappe.local.login_manager.user = user_email
    frappe.local.login_manager.post_login()
    return {"ok": True, "user": user_email}


@frappe.whitelist()
def my_results():
    user = frappe.session.user
    contact = _resolve_contact(user)
    if not contact:
        return []
    return frappe.get_all("HM Test Result",
        filters={"contact": contact, "released_to_portal": 1},
        fields=["name","result_date","file_pdf","sample_order","viewed_at"],
        order_by="result_date desc")


@frappe.whitelist()
def my_appointments():
    user = frappe.session.user
    contact = _resolve_contact(user)
    if not contact:
        return []
    return frappe.get_all("HM Sample Order",
        filters={"contact": contact},
        fields=["name","appointment_date","appointment_time","address","status"],
        order_by="appointment_date desc")


def _resolve_contact(user):
    if user.startswith("customer."):
        c = user.split(".", 1)[1].split("@")[0]
        return c
    return None


@frappe.whitelist()
def consent_pdpa(consent_version="v1.0"):
    user = frappe.session.user
    contact = _resolve_contact(user)
    if not contact:
        return {"error": "no-contact"}
    doc = frappe.get_doc({
        "doctype": "HM PDPA Consent",
        "contact": contact,
        "consent_version": consent_version,
        "signed_on": now_datetime(),
        "is_active": 1,
        "signed_by_ip": frappe.local.request_ip,
    }).insert(ignore_permissions=True)
    frappe.db.set_value("HM Contact", contact, {
        "pdpa_consent_given": 1,
        "pdpa_consent_date": now_datetime(),
        "pdpa_consent_version": consent_version,
    })
    return {"ok": True, "id": doc.name}
