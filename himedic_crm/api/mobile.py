
# -*- coding: utf-8 -*-
"""Endpoints used by the mobile PWA (offline-first)."""
import frappe, json


@frappe.whitelist()
def my_day():
    """Return today's KPIs + appointments for current user."""
    user = frappe.session.user
    today = frappe.utils.nowdate()
    sos = frappe.get_all("HM Sample Order",
        filters={"assigned_to": user, "appointment_date": today},
        fields=["name","contact","appointment_time","address","region","status"],
        order_by="appointment_time asc")
    leads = frappe.db.count("HM Lead", {"owner_user": user, "status": ["in", ["Mới","Đã liên hệ","Chăm sóc"]]})
    return {
        "user": user,
        "date": today,
        "kpis": {"open_leads": leads, "today_orders": len(sos)},
        "orders": sos,
    }


@frappe.whitelist()
def order_detail(name):
    so = frappe.get_doc("HM Sample Order", name)
    return so.as_dict()


@frappe.whitelist()
def submit_offline_batch(payload):
    """Receive a batch of offline operations and replay them."""
    import json as _json
    items = _json.loads(payload) if isinstance(payload, str) else payload
    results = []
    for it in items or []:
        q = frappe.get_doc({
            "doctype": "HM Offline Sync Queue",
            "user": frappe.session.user,
            "device_id": it.get("device_id"),
            "status": "Processing",
            "action": it.get("action"),
            "reference_doctype": it.get("reference_doctype"),
            "reference_name": it.get("reference_name"),
            "payload": _json.dumps(it),
        }).insert(ignore_permissions=True)
        try:
            _apply(it)
            q.status = "Done"
            q.synced_at = frappe.utils.now_datetime()
            results.append({"ok": True, "id": q.name})
        except Exception as e:
            q.status = "Failed"
            q.error = str(e)
            results.append({"ok": False, "error": str(e)})
        q.save(ignore_permissions=True)
    return {"results": results}


def _apply(op):
    action = op.get("action")
    if action == "checkin":
        from himedic_crm.sample.flows import checkin
        checkin(op["reference_name"], op.get("lat"), op.get("lng"), op.get("reason"))
    elif action == "finalize":
        from himedic_crm.sample.flows import finalize_collection
        finalize_collection(op["reference_name"], op.get("signature"))
    elif action == "incident":
        from himedic_crm.sample.flows import report_incident
        report_incident(op["reference_name"], op.get("reason"), op.get("photo"))
    elif action == "update":
        doc = frappe.get_doc(op["reference_doctype"], op["reference_name"])
        doc.update(op.get("fields") or {})
        doc.save(ignore_permissions=True)
