
# -*- coding: utf-8 -*-
import frappe, requests


def push_sample_to_lis(sample_order):
    """Push a sample to LIS via REST. Settings read from HM CRM Settings."""
    s = frappe.get_single("HM CRM Settings")
    endpoint = (s.lis_endpoint or "").rstrip("/")
    if not endpoint:
        frappe.log_error("LIS endpoint not configured", "push_sample_to_lis")
        return None
    so = frappe.get_doc("HM Sample Order", sample_order) if isinstance(sample_order, str) else sample_order
    payload = {
        "so_no": so.name,
        "patient_pid": frappe.db.get_value("HM Contact", so.contact, "pid"),
        "tests": [
            {"test_code": (i.test or i.package), "qty": i.qty} for i in (so.items or [])
        ],
        "tubes": [t.barcode for t in (so.tubes or [])],
    }
    headers = {"Authorization": f"Bearer {s.get_password('lis_api_key', raise_exception=False)}"} if s.lis_api_key else {}
    try:
        r = requests.post(f"{endpoint}/orders", json=payload, headers=headers, timeout=10)
        return r.json() if r.ok else {"error": r.text}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "push_sample_to_lis")
        return {"error": str(e)}
