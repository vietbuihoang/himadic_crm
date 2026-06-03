# -*- coding: utf-8 -*-
import frappe


def get_context(context):
    # Portal is guest-accessible (login via phone+OTP happens in-page).
    context.no_cache = 1
    user = frappe.session.user
    context.user = user
    context.is_customer = 1 if user.startswith("customer.") else 0
    context.full_name = frappe.utils.get_fullname(user) if context.is_customer else ""
    try:
        context.csrf_token = frappe.sessions.get_csrf_token()
    except Exception:
        context.csrf_token = ""
    return context
