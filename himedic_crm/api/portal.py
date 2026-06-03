
# -*- coding: utf-8 -*-
"""Customer-facing portal API: OTP login, results, appointments."""
import frappe, random, hashlib, json
from frappe.utils import now_datetime, add_to_date

# --- OTP rate-limit / anti-abuse (Redis-backed) ---
OTP_TTL_SEC = 300            # OTP validity
OTP_COOLDOWN_SEC = 60        # min gap between sends per phone
OTP_MAX_PER_HOUR = 5         # sends per phone / hour
OTP_IP_MAX_PER_HOUR = 20     # sends per IP / hour
OTP_MAX_VERIFY_FAILS = 5     # wrong codes before temporary lock
OTP_FAIL_WINDOW_SEC = 600    # lock window after too many fails


def _incr(key, ttl):
    c = frappe.cache()
    n = (c.get_value(key) or 0) + 1
    c.set_value(key, n, expires_in_sec=ttl)
    return n


@frappe.whitelist(allow_guest=True)
def request_otp(phone):
    if not phone:
        frappe.throw("Cần SĐT")
    ip = getattr(frappe.local, "request_ip", None) or "?"
    if _incr(f"hm_otp_ip::{ip}", 3600) > OTP_IP_MAX_PER_HOUR:
        frappe.throw("Quá nhiều yêu cầu từ thiết bị này. Vui lòng thử lại sau.")
    if frappe.cache().get_value(f"hm_otp_cd::{phone}"):
        frappe.throw("Vui lòng chờ ít phút trước khi yêu cầu mã mới.")
    if _incr(f"hm_otp_h::{phone}", 3600) > OTP_MAX_PER_HOUR:
        frappe.throw("Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau 1 giờ.")
    contact = frappe.db.get_value("HM Contact", {"phone": phone}, "name")
    if not contact:
        frappe.throw("Không tìm thấy khách hàng với SĐT này")
    code = f"{random.randint(0, 999999):06d}"
    frappe.cache().set_value(f"hm_portal_otp::{phone}", code, expires_in_sec=OTP_TTL_SEC)
    frappe.cache().set_value(f"hm_otp_cd::{phone}", 1, expires_in_sec=OTP_COOLDOWN_SEC)
    # SMS / Zalo
    try:
        from himedic_crm.utils.notify import send_zalo_template
        send_zalo_template(phone, "OTP_PORTAL", {"code": code})
    except Exception:
        pass
    return {"ok": True}


@frappe.whitelist(allow_guest=True)
def verify_otp(phone, code):
    fkey = f"hm_otp_fail::{phone}"
    if (frappe.cache().get_value(fkey) or 0) >= OTP_MAX_VERIFY_FAILS:
        frappe.throw("Nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới sau ít phút.")
    key = f"hm_portal_otp::{phone}"
    real = frappe.cache().get_value(key)
    if not real or str(code) != str(real):
        _incr(fkey, OTP_FAIL_WINDOW_SEC)
        frappe.throw("OTP không đúng hoặc đã hết hạn")
    # one-time use: consume the code + clear counters on success
    frappe.cache().delete_value(key)
    frappe.cache().delete_value(fkey)
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
