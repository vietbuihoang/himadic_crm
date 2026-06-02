
# -*- coding: utf-8 -*-
"""Round-robin / load-balanced auto-assignment for leads."""
import frappe


def auto_assign(lead):
    if lead.owner_user:
        return
    rules = frappe.get_all("HM Lead Assignment Rule",
                           filters={"is_active": 1},
                           fields=["name","source","region","min_score","assignment_type","team","fixed_user"],
                           order_by="priority asc")
    for r in rules:
        if r.source and r.source != lead.source: continue
        if r.region and r.region != lead.region: continue
        if (r.min_score or 0) > (lead.score or 0): continue
        user = _pick_user(r, lead)
        if user:
            lead.owner_user = user
            lead.team = r.team
            return user
    return None


def _pick_user(rule, lead):
    if rule.assignment_type == "Fixed user":
        return rule.fixed_user
    # Default to round-robin within team
    team = rule.team or lead.team
    if not team:
        return None
    users = frappe.db.sql("SELECT name FROM `tabUser` WHERE team=%s AND enabled=1", team, as_dict=True) if frappe.db.has_column("User", "team") else []
    if not users:
        return None
    # cycle counter stored on team
    key = f"hm_team_cursor::{team}"
    cur = frappe.cache().get_value(key) or 0
    pick = users[cur % len(users)].name
    frappe.cache().set_value(key, (cur + 1) % len(users))
    return pick
