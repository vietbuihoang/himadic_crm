
# -*- coding: utf-8 -*-
"""Lead scoring engine. Returns 0..100 from base score + active rules."""
import frappe


def compute_score(lead):
    score = 50
    if lead.source:
        bs = frappe.db.get_value("HM Lead Source", lead.source, "base_score") or 50
        score = bs
    rules = frappe.get_all("HM Lead Scoring Rule",
                           filters={"is_active": 1},
                           fields=["name","source","region","industry","customer_type","score_delta","set_priority"],
                           order_by="priority asc")
    for r in rules:
        match = True
        if r.source and r.source != lead.source: match = False
        if r.region and r.region != lead.region: match = False
        if r.customer_type and r.customer_type != lead.customer_type: match = False
        if r.industry: pass  # skip industry until field exists
        if match:
            score = max(0, min(100, score + (r.score_delta or 0)))
            if r.set_priority:
                lead.priority = r.set_priority
    return score
