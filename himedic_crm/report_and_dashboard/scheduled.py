
# -*- coding: utf-8 -*-
import frappe
from frappe.utils import nowdate


def snapshot_kpi():
    """Daily KPI snapshot for dashboards."""
    today = nowdate()
    # Company-wide
    new_leads = frappe.db.count("HM Lead", {"creation": [">=", today + " 00:00:00"]})
    won_deals = frappe.db.count("HM Deal", {"status": "Đã chốt", "closed_at": [">=", today + " 00:00:00"]})
    sos = frappe.db.count("HM Sample Order", {"appointment_date": today})
    for code, label, val, unit in [
        ("LEAD_NEW",  "Lead mới hôm nay", new_leads, "lead"),
        ("DEAL_WON",  "Deal Won hôm nay", won_deals, "deal"),
        ("SO_TODAY",  "Đơn lấy mẫu hôm nay", sos, "đơn"),
    ]:
        frappe.get_doc({
            "doctype": "HM KPI Snapshot",
            "snapshot_date": today, "scope": "Toàn công ty",
            "kpi_code": code, "kpi_label": label,
            "value_numeric": val, "unit": unit,
        }).insert(ignore_permissions=True)
