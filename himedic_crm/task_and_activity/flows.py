# -*- coding: utf-8 -*-
"""Task lifecycle operations (desktop write path)."""
import json

import frappe
from frappe.utils import now_datetime

TASK_FIELDS = {"subject", "description", "task_type", "priority", "assigned_to",
               "due_date", "reference_doctype", "reference_name"}
STATUSES = {"Open", "In Progress", "Done", "Cancelled"}


@frappe.whitelist()
def create_task(payload):
    data = json.loads(payload) if isinstance(payload, str) else payload
    clean = {k: v for k, v in (data or {}).items() if k in TASK_FIELDS and v not in (None, "")}
    clean.setdefault("status", "Open")
    clean.setdefault("task_type", "Khác")
    doc = frappe.get_doc({"doctype": "HM Task", **clean})
    doc.insert()
    return {"name": doc.name, "subject": doc.subject}


@frappe.whitelist()
def complete_task(name):
    doc = frappe.get_doc("HM Task", name)
    doc.check_permission("write")
    doc.status = "Done"
    doc.completed_at = now_datetime()
    doc.save()
    return {"ok": True, "status": doc.status}


@frappe.whitelist()
def set_status(name, status):
    if status not in STATUSES:
        frappe.throw(f"Trạng thái không hợp lệ: {status}")
    doc = frappe.get_doc("HM Task", name)
    doc.check_permission("write")
    doc.status = status
    if status == "Done":
        doc.completed_at = now_datetime()
    doc.save()
    return {"ok": True, "status": doc.status}
