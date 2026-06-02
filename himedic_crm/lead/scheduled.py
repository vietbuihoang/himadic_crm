
# -*- coding: utf-8 -*-
"""SLA enforcement — runs every 5 minutes."""
import frappe
from frappe.utils import now_datetime, time_diff_in_seconds
from himedic_crm.utils.notify import push_to_user


def enforce_lead_sla():
    settings = frappe.get_single("HM CRM Settings")
    warn = (settings.lead_sla_warn_minutes or 30) * 60
    escalate = (settings.lead_sla_escalate_minutes or 45) * 60
    reassign = (settings.lead_sla_reassign_minutes or 60) * 60

    new_leads = frappe.get_all("HM Lead",
        filters={"status": "Mới", "first_response_at": ["is", "not set"]},
        fields=["name","creation","owner_user","team","lead_name"])
    now = now_datetime()
    for L in new_leads:
        age = time_diff_in_seconds(now, L.creation)
        if age >= reassign:
            _reassign(L)
        elif age >= escalate:
            _escalate(L)
        elif age >= warn:
            if L.owner_user:
                push_to_user(L.owner_user, f"⏰ Lead {L.name} sắp quá SLA", f"{L.lead_name}", "HM Lead", L.name)


def _escalate(lead):
    team = lead.get("team")
    if not team:
        return
    mgr = frappe.db.get_value("HM Team", team, "manager")
    if mgr:
        push_to_user(mgr, f"🚨 Lead {lead.name} quá SLA escalate", lead.lead_name, "HM Lead", lead.name)


def _reassign(lead):
    """BR-L-010: auto re-assign to another user in team."""
    team = lead.get("team")
    if not team:
        return
    members = frappe.db.sql("SELECT name FROM `tabUser` WHERE team=%s AND enabled=1", team, as_dict=True) if frappe.db.has_column("User","team") else []
    others = [m.name for m in members if m.name != lead.owner_user]
    if not others:
        return
    frappe.db.set_value("HM Lead", lead.name, {"owner_user": others[0], "sla_breached": 1})
    push_to_user(others[0], f"🔁 Lead {lead.name} đã re-assign cho bạn", lead.lead_name, "HM Lead", lead.name)
