
# -*- coding: utf-8 -*-
import frappe


def boot_session(bootinfo):
    """Inject CRM config and current-user team info into the desk boot."""
    bootinfo.himedic_crm = {
        "version": "1.0.0",
        "brand_primary": "#0E7490",
        "settings": frappe.db.get_singles_dict("HM CRM Settings") if frappe.db.exists("DocType", "HM CRM Settings") else {},
    }
