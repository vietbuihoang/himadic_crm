# -*- coding: utf-8 -*-
"""Marketing operations — campaign + lead-routing-rule management, ROI recompute."""
import json

import frappe
from frappe.utils import nowdate

CAMPAIGN_FIELDS = {"campaign_code", "campaign_name", "channel", "budget", "spent",
                   "start_date", "end_date", "status", "notes"}
RULE_FIELDS = {"rule_name", "priority", "is_active", "source", "region", "min_score",
               "assignment_type", "team", "fixed_user"}
CAMPAIGN_STATUSES = {"Mở", "Đang chạy", "Tạm dừng", "Kết thúc"}


def _clean(data, allowed):
    return {k: v for k, v in (data or {}).items() if k in allowed and v not in (None, "")}


def recompute_campaign(name):
    """Recompute a campaign's metrics from its linked leads/deals (BR-MKT-001)."""
    c = frappe.get_doc("HM Campaign", name)
    leads = frappe.db.count("HM Lead", {"campaign": name})
    won = frappe.db.count("HM Deal", {"campaign": name, "status": "Đã chốt"})
    rev = frappe.db.sql("""SELECT COALESCE(SUM(grand_total),0) FROM `tabHM Deal`
                           WHERE campaign=%s AND status='Đã chốt'""", name)[0][0] or 0
    cpl = round(c.budget / leads) if (c.budget and leads) else 0
    roas = round(rev / c.spent, 2) if c.spent else (round(rev / c.budget, 2) if c.budget else 0)
    frappe.db.set_value("HM Campaign", name,
                        {"leads_count": leads, "won_count": won, "revenue": rev, "cpl": cpl, "roas": roas})
    return {"leads_count": leads, "won_count": won, "revenue": rev, "cpl": cpl, "roas": roas}


@frappe.whitelist()
def create_campaign(payload):
    data = json.loads(payload) if isinstance(payload, str) else payload
    doc = frappe.get_doc({"doctype": "HM Campaign", "status": "Mở", **_clean(data, CAMPAIGN_FIELDS)})
    doc.insert()
    return {"name": doc.name, "campaign_name": doc.campaign_name}


@frappe.whitelist()
def update_campaign(name, payload):
    data = json.loads(payload) if isinstance(payload, str) else payload
    doc = frappe.get_doc("HM Campaign", name)
    doc.check_permission("write")
    doc.update(_clean(data, CAMPAIGN_FIELDS))
    doc.save()
    return {"ok": True}


@frappe.whitelist()
def set_status(name, status):
    if status not in CAMPAIGN_STATUSES:
        frappe.throw(f"Trạng thái không hợp lệ: {status}")
    doc = frappe.get_doc("HM Campaign", name)
    doc.check_permission("write")
    doc.status = status
    doc.save()
    return {"ok": True, "status": status}


@frappe.whitelist()
def recompute_roi(campaign=None):
    """Recompute ROI for one campaign or all; also store a snapshot."""
    names = [campaign] if campaign else frappe.get_all("HM Campaign", pluck="name")
    out = {}
    for n in names:
        m = recompute_campaign(n)
        c = frappe.db.get_value("HM Campaign", n, ["channel", "budget"], as_dict=True)
        frappe.get_doc({"doctype": "HM ROI Snapshot", "snapshot_date": nowdate(), "campaign": n,
                        "channel": c.channel, "spent": c.budget or 0, **m}).insert(ignore_permissions=True)
        out[n] = m
    return {"ok": True, "campaigns": len(names), "metrics": out}


@frappe.whitelist()
def create_rule(payload):
    data = json.loads(payload) if isinstance(payload, str) else payload
    clean = _clean(data, RULE_FIELDS)
    clean.setdefault("is_active", 1)
    doc = frappe.get_doc({"doctype": "HM Lead Assignment Rule", **clean})
    doc.insert()
    return {"name": doc.name}


@frappe.whitelist()
def update_rule(name, payload):
    data = json.loads(payload) if isinstance(payload, str) else payload
    doc = frappe.get_doc("HM Lead Assignment Rule", name)
    doc.check_permission("write")
    doc.update(_clean(data, RULE_FIELDS))
    doc.save()
    return {"ok": True}


@frappe.whitelist()
def toggle_rule(name):
    doc = frappe.get_doc("HM Lead Assignment Rule", name)
    doc.check_permission("write")
    doc.is_active = 0 if doc.is_active else 1
    doc.save()
    return {"ok": True, "is_active": doc.is_active}
