# -*- coding: utf-8 -*-
import frappe


@frappe.whitelist()
def campaigns(limit=100):
    rows = frappe.get_list("HM Campaign",
        fields=["name", "campaign_code", "campaign_name", "channel", "budget", "spent",
                "leads_count", "won_count", "revenue", "cpl", "roas", "status"],
        limit_page_length=int(limit), order_by="modified desc")
    tot = {"budget": sum(r.get("budget") or 0 for r in rows),
           "spent": sum(r.get("spent") or 0 for r in rows),
           "revenue": sum(r.get("revenue") or 0 for r in rows),
           "leads": sum(r.get("leads_count") or 0 for r in rows)}
    return {"rows": rows, "totals": tot}


@frappe.whitelist()
def routing(limit=50):
    rows = frappe.get_list("HM Lead Assignment Rule",
        fields=["name"], limit_page_length=int(limit), order_by="priority asc")
    # include all readable fields per rule
    out = [frappe.get_doc("HM Lead Assignment Rule", r["name"]).as_dict() for r in rows]
    return {"rows": out}
