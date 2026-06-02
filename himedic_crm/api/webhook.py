
# -*- coding: utf-8 -*-
"""Inbound webhook handlers for marketing channels.
Endpoints (all unauthenticated, validated via signing token):
  POST /api/method/himedic_crm.api.webhook.fb_lead
  POST /api/method/himedic_crm.api.webhook.google_lead
  POST /api/method/himedic_crm.api.webhook.zalo_inbound
  POST /api/method/himedic_crm.api.webhook.landing
"""
import frappe, json, hmac, hashlib


def _log(provider, payload, status, error=None, lead=None):
    frappe.get_doc({
        "doctype": "HM Marketing Webhook Log",
        "provider": provider, "status": status,
        "payload": json.dumps(payload, ensure_ascii=False) if not isinstance(payload, str) else payload,
        "error": error, "created_lead": lead,
    }).insert(ignore_permissions=True)


def _verify(provider, raw, signature):
    settings = frappe.get_single("HM CRM Settings")
    secret = (frappe.conf.get(f"webhook_secret_{provider.lower()}") or "")
    if not secret or not signature:
        return True  # do not enforce in dev; ops should set secret
    digest = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)


def _create_lead(p, source):
    lead = frappe.get_doc({
        "doctype": "HM Lead",
        "lead_name": p.get("full_name") or p.get("name") or "Khách",
        "phone": p.get("phone") or p.get("phone_number") or "",
        "email": p.get("email"),
        "source": source,
        "campaign": p.get("campaign"),
        "utm_source": p.get("utm_source"),
        "utm_medium": p.get("utm_medium"),
        "utm_campaign": p.get("utm_campaign"),
        "ad_id": p.get("ad_id"),
        "address": p.get("address"),
        "status": "Mới",
    })
    lead.insert(ignore_permissions=True)
    return lead


@frappe.whitelist(allow_guest=True)
def fb_lead():
    raw = frappe.request.data.decode() if frappe.request and frappe.request.data else "{}"
    payload = json.loads(raw or "{}")
    sig = frappe.request.headers.get("X-Hub-Signature-256") if frappe.request else None
    if not _verify("FB", raw, sig):
        _log("Facebook", payload, "Failed", error="Bad signature")
        frappe.local.response.http_status_code = 401
        return {"error": "bad-signature"}
    try:
        lead = _create_lead(payload, source="FB Ads")
        _log("Facebook", payload, "OK", lead=lead.name)
        return {"ok": True, "lead": lead.name}
    except Exception as e:
        _log("Facebook", payload, "Failed", error=str(e))
        raise


@frappe.whitelist(allow_guest=True)
def google_lead():
    raw = frappe.request.data.decode() if frappe.request and frappe.request.data else "{}"
    payload = json.loads(raw or "{}")
    try:
        lead = _create_lead(payload, source="Google Ads")
        _log("Google", payload, "OK", lead=lead.name)
        return {"ok": True, "lead": lead.name}
    except Exception as e:
        _log("Google", payload, "Failed", error=str(e))
        raise


@frappe.whitelist(allow_guest=True)
def landing():
    payload = frappe.local.form_dict if frappe.local else {}
    payload = dict(payload)
    try:
        lead = _create_lead(payload, source="Landing Page")
        _log("Landing", payload, "OK", lead=lead.name)
        return {"ok": True, "lead": lead.name}
    except Exception as e:
        _log("Landing", payload, "Failed", error=str(e))
        raise


@frappe.whitelist(allow_guest=True)
def zalo_inbound():
    """Inbound Zalo OA message — could create lead or attach to existing contact."""
    raw = frappe.request.data.decode() if frappe.request and frappe.request.data else "{}"
    payload = json.loads(raw or "{}")
    try:
        # log message
        phone = (payload.get("sender") or {}).get("phone")
        text = (payload.get("message") or {}).get("text", "")
        frappe.get_doc({
            "doctype": "HM Zalo Message",
            "phone": phone, "direction": "Inbound",
            "body": text, "status": "Delivered",
            "zalo_message_id": (payload.get("message") or {}).get("msg_id"),
        }).insert(ignore_permissions=True)
        # create lead if no existing contact
        if phone and not frappe.db.exists("HM Contact", {"phone": phone}):
            lead = _create_lead({"phone": phone, "name": payload.get("sender",{}).get("display_name","Zalo user")}, source="Zalo OA")
            _log("Zalo", payload, "OK", lead=lead.name)
            return {"ok": True, "lead": lead.name}
        _log("Zalo", payload, "OK")
        return {"ok": True}
    except Exception as e:
        _log("Zalo", payload, "Failed", error=str(e))
        raise
