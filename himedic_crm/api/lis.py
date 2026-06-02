
# -*- coding: utf-8 -*-
"""LIS integration (inbound + outbound).
Inbound webhook: LIS posts results
  POST /api/method/himedic_crm.api.lis.receive_result
Outbound: push_sample_to_lis lives in utils/lis.py
"""
import frappe, json


@frappe.whitelist(allow_guest=True)
def receive_result():
    raw = frappe.request.data.decode() if frappe.request and frappe.request.data else "{}"
    payload = json.loads(raw or "{}")
    so_no = payload.get("so_no") or payload.get("order_no")
    result_pdf = payload.get("pdf_url") or payload.get("file_url")
    if not so_no:
        frappe.local.response.http_status_code = 400
        return {"error": "missing so_no"}
    so = frappe.get_doc("HM Sample Order", so_no)
    res = frappe.get_doc({
        "doctype": "HM Test Result",
        "contact": so.contact,
        "sample_order": so.name,
        "file_pdf": result_pdf,
        "released_to_portal": 1,
        "released_at": frappe.utils.now_datetime(),
    }).insert(ignore_permissions=True)
    # Notify customer via Zalo + Portal
    try:
        from himedic_crm.utils.notify import send_zalo_template, push_to_user
        phone = frappe.db.get_value("HM Contact", so.contact, "phone")
        if phone:
            send_zalo_template(phone, "RESULT_READY", {"result_id": res.name, "so": so.name})
        if so.assigned_to:
            push_to_user(so.assigned_to, f"📄 KQ XN cho {so.contact} đã sẵn sàng", "", "HM Test Result", res.name)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "lis.receive_result notification")
    return {"ok": True, "result": res.name}


@frappe.whitelist()
def reject_sample(sample_order, reason, photo=None):
    """Lab Coordinator rejects a sample → auto re-collection."""
    from himedic_crm.sample.flows import report_incident
    return report_incident(sample_order, reason, photo)
