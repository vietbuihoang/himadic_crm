# -*- coding: utf-8 -*-
"""SMS sending via a configurable HTTP gateway (eSMS.vn / SpeedSMS / Twilio / etc.).

Reads `sms_endpoint` + `sms_api_key` from HM CRM Settings. The exact JSON shape
differs per provider — adjust `_payload()` to match yours (see
docs/CLOUD_DEPLOYMENT_AND_INTEGRATIONS.md § SMS).
"""
import frappe
import requests


def _payload(phone, message, settings):
    # Generic shape; override per provider. Example here ~ eSMS.vn style.
    return {
        "ApiKey": settings.get_password("sms_api_key", raise_exception=False),
        "Phone": phone,
        "Content": message,
        "Brandname": settings.get("sms_brandname") or "HiMedic",
        "SmsType": "2",
    }


def send_sms(phone, message):
    """Send an SMS. Returns {ok, ...} and never raises (logs on failure)."""
    s = frappe.get_single("HM CRM Settings")
    endpoint = (s.sms_endpoint or "").strip()
    if not endpoint:
        frappe.log_error("SMS endpoint not configured", "send_sms")
        return {"ok": False, "error": "sms-not-configured"}
    try:
        r = requests.post(endpoint, json=_payload(phone, message, s), timeout=10)
        return {"ok": r.ok, "status": r.status_code, "response": (r.text or "")[:200]}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "send_sms")
        return {"ok": False, "error": str(e)}
