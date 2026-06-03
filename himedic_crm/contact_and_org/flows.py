# -*- coding: utf-8 -*-
"""Contact / Organization CRUD + PDPA operations (desktop write path)."""
import json

import frappe
from frappe.utils import now_datetime

CONTACT_FIELDS = {"full_name", "phone", "email", "gender", "dob", "national_id",
                  "address", "region", "organization", "position", "customer_type",
                  "vip", "tags", "owner_user", "pid", "blood_type", "allergies",
                  "chronic_diseases", "medical_warning"}
ORG_FIELDS = {"organization_name", "tax_id", "industry", "organization_size", "region",
              "phone", "email", "website", "address", "owner_user", "vip", "is_b2b", "notes"}


def _clean(data, allowed):
    return {k: v for k, v in (data or {}).items() if k in allowed and v not in (None, "")}


@frappe.whitelist()
def create_contact(payload):
    data = json.loads(payload) if isinstance(payload, str) else payload
    doc = frappe.get_doc({"doctype": "HM Contact", **_clean(data, CONTACT_FIELDS)})
    doc.insert()
    return {"name": doc.name, "full_name": doc.full_name}


@frappe.whitelist()
def update_contact(name, payload):
    data = json.loads(payload) if isinstance(payload, str) else payload
    doc = frappe.get_doc("HM Contact", name)
    doc.check_permission("write")
    doc.update(_clean(data, CONTACT_FIELDS))
    doc.save()
    return {"ok": True}


@frappe.whitelist()
def create_organization(payload):
    data = json.loads(payload) if isinstance(payload, str) else payload
    doc = frappe.get_doc({"doctype": "HM Organization", **_clean(data, ORG_FIELDS)})
    doc.insert()
    return {"name": doc.name, "organization_name": doc.organization_name}


@frappe.whitelist()
def update_organization(name, payload):
    data = json.loads(payload) if isinstance(payload, str) else payload
    doc = frappe.get_doc("HM Organization", name)
    doc.check_permission("write")
    doc.update(_clean(data, ORG_FIELDS))
    doc.save()
    return {"ok": True}


@frappe.whitelist()
def record_consent(contact, version="v1.0"):
    """Stamp PDPA consent on a contact."""
    doc = frappe.get_doc("HM Contact", contact)
    doc.check_permission("write")
    doc.pdpa_consent_given = 1
    doc.pdpa_consent_date = now_datetime()
    doc.pdpa_consent_version = version
    doc.save()
    return {"ok": True, "date": str(doc.pdpa_consent_date)}


@frappe.whitelist()
def log_medical_access(contact, purpose):
    """BR-PDPA-001: every medical-record view is audited with user, time, purpose."""
    if not purpose:
        frappe.throw("Phải nhập lý do truy cập hồ sơ y tế (BR-PDPA-001)")
    frappe.get_doc("HM Contact", contact).check_permission("read")
    frappe.get_doc({
        "doctype": "HM Audit Log",
        "event_time": now_datetime(),
        "user": frappe.session.user,
        "action": "Xem hồ sơ y tế",
        "reference_doctype": "HM Contact",
        "reference_name": contact,
        "purpose": purpose,
        "data_class": "HIGH",
    }).insert(ignore_permissions=True)
    return {"ok": True}
