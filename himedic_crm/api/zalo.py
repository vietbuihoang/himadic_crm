
# -*- coding: utf-8 -*-
"""Zalo OA outbound."""
import frappe, requests


def send_template(phone, template_code, params=None):
    s = frappe.get_single("HM CRM Settings")
    token = s.get_password("zalo_oa_token", raise_exception=False) if s.zalo_oa_token else None
    if not token:
        frappe.log_error("Zalo OA token not configured")
        return {"error": "no-token"}
    payload = {
        "phone": phone,
        "template_id": template_code,
        "template_data": params or {},
    }
    try:
        r = requests.post("https://openapi.zalo.me/v2.0/oa/message",
                          json=payload,
                          headers={"access_token": token, "Content-Type": "application/json"},
                          timeout=10)
        ok = r.ok
        rid = (r.json() or {}).get("data", {}).get("msg_id") if ok else None
        frappe.get_doc({
            "doctype": "HM Zalo Message",
            "phone": phone, "direction": "Outbound",
            "template_code": template_code,
            "body": frappe.as_json(params or {}),
            "zalo_message_id": rid,
            "status": "Sent" if ok else "Failed",
            "error_code": None if ok else str(r.status_code),
        }).insert(ignore_permissions=True)
        return {"ok": ok, "msg_id": rid}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "zalo.send_template")
        return {"error": str(e)}
