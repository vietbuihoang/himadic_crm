
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


@frappe.whitelist()
def refresh_oa_token():
    """Refresh the Zalo OA access token (they expire ~25h). Run via scheduler + manual.

    POST https://oauth.zaloapp.com/v4/oa/access_token
      form: refresh_token, app_id, grant_type=refresh_token   header: secret_key
    Refresh tokens are single-use → rotate and store the new one.
    """
    s = frappe.get_single("HM CRM Settings")
    app_id = s.zalo_app_id
    secret = s.get_password("zalo_app_secret", raise_exception=False) if s.zalo_app_secret else None
    refresh = s.get_password("zalo_refresh_token", raise_exception=False) if s.zalo_refresh_token else None
    if not (app_id and secret and refresh):
        frappe.log_error("Zalo OAuth chưa cấu hình đủ (app_id/secret/refresh_token)", "zalo.refresh_oa_token")
        return {"ok": False, "error": "not-configured"}
    try:
        r = requests.post(
            "https://oauth.zaloapp.com/v4/oa/access_token",
            data={"refresh_token": refresh, "app_id": app_id, "grant_type": "refresh_token"},
            headers={"secret_key": secret, "Content-Type": "application/x-www-form-urlencoded"},
            timeout=15)
        data = r.json() if r.ok else {}
        access_token = data.get("access_token")
        new_refresh = data.get("refresh_token")
        if not access_token:
            frappe.log_error(f"Zalo refresh thất bại: {r.status_code} {(r.text or '')[:300]}", "zalo.refresh_oa_token")
            return {"ok": False, "error": data.get("error_description") or (r.text or "")[:120]}
        s.zalo_oa_token = access_token
        if new_refresh:
            s.zalo_refresh_token = new_refresh  # rotate (single-use)
        s.save(ignore_permissions=True)
        frappe.db.commit()
        return {"ok": True, "expires_in": data.get("expires_in")}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "zalo.refresh_oa_token")
        return {"ok": False, "error": str(e)}
