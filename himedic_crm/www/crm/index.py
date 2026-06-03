# -*- coding: utf-8 -*-
import frappe


def get_context(context):
    if frappe.session.user == "Guest":
        frappe.local.flags.redirect_location = "/login?redirect-to=/crm"
        raise frappe.Redirect
    context.no_cache = 1
    context.user = frappe.session.user
    context.full_name = frappe.utils.get_fullname(frappe.session.user)
    # CSRF token for write (POST) calls. Guard: session_obj is absent during
    # console/test rendering, present on real HTTP requests.
    try:
        context.csrf_token = frappe.sessions.get_csrf_token()
    except Exception:
        context.csrf_token = ""
    return context
