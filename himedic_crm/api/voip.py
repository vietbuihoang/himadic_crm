
# -*- coding: utf-8 -*-
"""VoIP integration: click-to-call + inbound webhook."""
import frappe, requests, json


@frappe.whitelist()
def click_to_call(phone, reference_doctype=None, reference_name=None):
    s = frappe.get_single("HM CRM Settings")
    endpoint = s.voip_webhook
    if not endpoint:
        return {"error": "VoIP not configured"}
    token = s.get_password("voip_api_token", raise_exception=False) if s.voip_api_token else None
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    payload = {"from": frappe.session.user, "to": phone}
    try:
        r = requests.post(endpoint, json=payload, headers=headers, timeout=10)
        # log
        frappe.get_doc({
            "doctype": "HM VoIP Call Log",
            "user": frappe.session.user,
            "phone": phone,
            "direction": "Outbound",
            "reference_doctype": reference_doctype,
            "reference_name": reference_name,
        }).insert(ignore_permissions=True)
        return r.json() if r.ok else {"error": r.text}
    except Exception as e:
        return {"error": str(e)}


@frappe.whitelist(allow_guest=True)
def voip_event():
    """Inbound VoIP webhook (call ended, recording ready, ...)."""
    raw = frappe.request.data.decode() if frappe.request and frappe.request.data else "{}"
    payload = json.loads(raw or "{}")
    frappe.get_doc({
        "doctype": "HM VoIP Call Log",
        "user": payload.get("user"),
        "phone": payload.get("phone"),
        "direction": payload.get("direction") or "Inbound",
        "duration_sec": payload.get("duration_sec") or 0,
        "recording_url": payload.get("recording_url"),
        "call_outcome": payload.get("outcome"),
        "reference_doctype": payload.get("reference_doctype"),
        "reference_name": payload.get("reference_name"),
    }).insert(ignore_permissions=True)
    return {"ok": True}
