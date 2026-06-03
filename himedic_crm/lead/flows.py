# -*- coding: utf-8 -*-
"""Lead business operations invoked from the desktop CRM (write path).

All user-initiated mutations check permission on the target document; system
records (activities) insert with ignore_permissions after the gate passes.
"""
import json

import frappe
from frappe.utils import now_datetime
from frappe.model.workflow import apply_workflow, get_transitions

VALID_ACTIVITY_TYPES = {"Cuộc gọi", "Email", "Zalo", "SMS", "Ghi chú", "Thăm khám"}


@frappe.whitelist()
def create_lead(payload):
    """Create a lead from the UI. Dedupe (BR-L-002) is enforced by validate_lead."""
    data = json.loads(payload) if isinstance(payload, str) else (payload or {})
    allowed = {"lead_name", "phone", "email", "customer_type", "organization_name",
               "source", "region", "campaign", "interest_group", "gender", "dob", "address"}
    doc = frappe.get_doc({"doctype": "HM Lead", "status": "Mới",
                          **{k: v for k, v in data.items() if k in allowed and v not in (None, "")}})
    # the rep owns leads they create (auto_assign may reassign); never leave it empty
    doc.owner_user = doc.owner_user or frappe.session.user
    doc.insert()  # respects create permission
    return {"name": doc.name, "lead_name": doc.lead_name}


@frappe.whitelist()
def log_activity(lead_name, activity_type, note=None, subject=None):
    """Append a call/email/Zalo/note to the lead timeline (UC-001)."""
    lead = frappe.get_doc("HM Lead", lead_name)
    lead.check_permission("read")
    if activity_type not in VALID_ACTIVITY_TYPES:
        frappe.throw(f"Loại hoạt động không hợp lệ: {activity_type}")
    frappe.get_doc({
        "doctype": "HM Activity",
        "activity_time": now_datetime(),
        "user": frappe.session.user,
        "activity_type": activity_type,
        "subject": subject or f"{activity_type} – {lead.lead_name}",
        "note": note,
        "reference_doctype": "HM Lead",
        "reference_name": lead.name,
    }).insert(ignore_permissions=True)
    # First contact marks first_response_at (supports BR-L-001 SLA reporting)
    if not lead.first_response_at:
        lead.db_set("first_response_at", now_datetime(), update_modified=False)
    return {"ok": True}


@frappe.whitelist()
def apply_action(lead_name, action):
    """Advance the lead through its workflow (HM Submit / HM Cancel / HM Nurture)."""
    doc = frappe.get_doc("HM Lead", lead_name)
    doc.check_permission("write")
    apply_workflow(doc, action)
    return {"ok": True, "status": doc.status}


@frappe.whitelist()
def transitions(lead_name):
    """Workflow actions currently available to the user for this lead."""
    doc = frappe.get_doc("HM Lead", lead_name)
    return [t.get("action") for t in get_transitions(doc)]
