
# -*- coding: utf-8 -*-
import frappe
from frappe.utils import nowdate


def compute_daily_roi():
    """Snapshot ROI per campaign every day."""
    campaigns = frappe.get_all("HM Campaign", filters={"status": ["in", ["Đang chạy","Mở"]]}, fields=["name","campaign_code","channel","budget"])
    for c in campaigns:
        leads = frappe.db.count("HM Lead", {"campaign": c.name})
        won = frappe.db.count("HM Deal", {"campaign": c.name, "status": "Đã chốt"})
        rev = frappe.db.sql("SELECT COALESCE(SUM(grand_total),0) FROM `tabHM Deal` WHERE campaign=%s AND status='Đã chốt'", c.name)[0][0] or 0
        cpl = (c.budget / leads) if leads else 0
        roas = (rev / c.budget) if c.budget else 0
        frappe.get_doc({
            "doctype": "HM ROI Snapshot",
            "snapshot_date": nowdate(),
            "channel": c.channel,
            "campaign": c.name,
            "leads_count": leads,
            "won_count": won,
            "revenue": rev,
            "spent": c.budget or 0,
            "cpl": cpl,
            "roas": roas,
        }).insert(ignore_permissions=True)
        frappe.db.set_value("HM Campaign", c.name, {
            "leads_count": leads, "won_count": won, "revenue": rev, "cpl": cpl, "roas": roas,
        })
