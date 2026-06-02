
# -*- coding: utf-8 -*-
"""Smoke test runnable: bench --site SITE execute himedic_crm.tests.smoke.run_smoke"""
import frappe


def run_smoke():
    """Verify install — print counts."""
    counts = {
        "Lab Test": frappe.db.count("HM Lab Test"),
        "Test Package": frappe.db.count("HM Test Package"),
        "Sample Type": frappe.db.count("HM Sample Type"),
        "Lead Source": frappe.db.count("HM Lead Source"),
        "Lead Stage": frappe.db.count("HM Lead Stage"),
        "Deal Stage": frappe.db.count("HM Deal Stage"),
        "Roles HM*": frappe.db.count("Role", {"role_name": ["like", "HM %"]}),
    }
    print("==== HI-MEDIC CRM SMOKE TEST ====")
    for k, v in counts.items():
        print(f"  {k}: {v}")
    settings = frappe.get_single("HM CRM Settings")
    print("  Settings.lead_sla_warn_minutes:", settings.lead_sla_warn_minutes)
    print("OK")
    return counts


def create_demo_lead():
    """Create one demo lead — useful in dev."""
    doc = frappe.get_doc({
        "doctype": "HM Lead",
        "lead_name": "Nguyễn Văn Demo",
        "phone": "0901000111",
        "email": "demo@example.com",
        "source": "FB Ads",
        "customer_type": "Cá nhân",
        "status": "Mới",
    }).insert(ignore_permissions=True)
    return doc.name
