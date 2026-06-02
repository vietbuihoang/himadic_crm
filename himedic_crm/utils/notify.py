
# -*- coding: utf-8 -*-
import frappe


def push_to_user(user, title, message, ref_dt=None, ref_name=None):
    """Push a Frappe Notification Log entry visible in the bell icon."""
    try:
        n = frappe.new_doc("Notification Log")
        n.subject = title
        n.email_content = message
        n.type = "Alert"
        n.document_type = ref_dt
        n.document_name = ref_name
        n.for_user = user
        n.insert(ignore_permissions=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "push_to_user failed")


def send_zalo_template(phone, template_code, params=None):
    """Hook for Zalo OA API — wired in himedic_crm.api.zalo."""
    from himedic_crm.api.zalo import send_template
    return send_template(phone=phone, template_code=template_code, params=params or {})
