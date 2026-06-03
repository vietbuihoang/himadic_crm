# -*- coding: utf-8 -*-
"""Go-live readiness check — reports which integrations are configured.

Reports presence/absence only (never the secret values). Use after filling
credentials per docs/CLOUD_DEPLOYMENT_AND_INTEGRATIONS.md:

    bench --site <site> execute himedic_crm.api.health.integration_status
"""
import frappe


def _has(settings, field):
    return bool((settings.get(field) or "").strip()) if isinstance(settings.get(field), str) else bool(settings.get(field))


@frappe.whitelist()
def integration_status():
    """Return a checklist of integration configuration (admin/manager only)."""
    if "System Manager" not in frappe.get_roles() and "HM Admin" not in frappe.get_roles():
        frappe.throw("Chỉ Quản trị viên xem được trạng thái tích hợp")
    s = frappe.get_single("HM CRM Settings")
    conf = frappe.conf

    checks = {
        "email_outgoing": bool(frappe.get_all("Email Account",
            filters={"enable_outgoing": 1}, limit=1)),
        "sms": _has(s, "sms_endpoint") and _has(s, "sms_api_key"),
        "zalo_send": _has(s, "zalo_oa_token"),
        "zalo_auto_refresh": _has(s, "zalo_app_id") and _has(s, "zalo_app_secret")
                             and _has(s, "zalo_refresh_token"),
        "lis": _has(s, "lis_endpoint") and _has(s, "lis_api_key"),
        "voip": _has(s, "voip_webhook"),
        "maps": _has(s, "maps_api_key"),
        "ca_signature": _has(s, "ca_signature_endpoint"),
        "webhook_secret_fb": bool(conf.get("webhook_secret_fb")),
        "webhook_secret_google": bool(conf.get("webhook_secret_google")),
        "webhook_secret_zalo": bool(conf.get("webhook_secret_zalo")),
        "scheduler_enabled": not bool(conf.get("pause_scheduler")),
    }
    # critical for go-live (others are optional depending on channels used)
    critical = ["email_outgoing", "scheduler_enabled"]
    return {
        "checks": checks,
        "configured": sum(1 for v in checks.values() if v),
        "total": len(checks),
        "critical_ready": all(checks[k] for k in critical),
        "missing": [k for k, v in checks.items() if not v],
    }
