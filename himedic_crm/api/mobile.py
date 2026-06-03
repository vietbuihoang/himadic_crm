
# -*- coding: utf-8 -*-
"""Endpoints used by the mobile PWA (offline-first)."""
import frappe, json


_DONE_STATES = ["Đã lấy mẫu", "Đang vận chuyển", "Đã nhập Lab", "Hoàn tất"]


@frappe.whitelist()
def my_day():
    """Return today's KPIs + appointments + month stats for the current user."""
    user = frappe.session.user
    today = frappe.utils.nowdate()
    sos = frappe.get_all("HM Sample Order",
        filters={"assigned_to": user, "appointment_date": today},
        fields=["name","contact","appointment_time","address","region","status","grand_total"],
        order_by="appointment_time asc")
    leads = frappe.db.count("HM Lead", {"owner_user": user, "status": ["in", ["Mới","Đã liên hệ","Chăm sóc"]]})

    done = len([s for s in sos if s.status in _DONE_STATES])
    doing = len([s for s in sos if s.status == "Đang lấy mẫu"])
    remaining = len(sos) - done - doing
    next_order = next((s for s in sos if s.status not in _DONE_STATES and s.status not in ("Hủy bởi khách", "Lỗi mẫu")), None)

    # month-to-date stats
    month_start = frappe.utils.get_first_day(today)
    month_sos = frappe.get_all("HM Sample Order",
        filters={"assigned_to": user, "appointment_date": [">=", month_start], "status": ["in", _DONE_STATES]},
        fields=["grand_total"])
    month_revenue = sum([float(s.grand_total or 0) for s in month_sos])

    return {
        "user": user,
        "fullname": frappe.utils.get_fullname(user),
        "date": today,
        "kpis": {
            "open_leads": leads,
            "today_orders": len(sos),
            "done": done, "doing": doing, "remaining": remaining,
            "month_orders": len(month_sos),
            "month_revenue": month_revenue,
        },
        "next_order": next_order,
        "orders": sos,
    }


@frappe.whitelist()
def my_history(days=14):
    """Past & today's orders for the current user, newest first (history tab)."""
    user = frappe.session.user
    start = frappe.utils.add_days(frappe.utils.nowdate(), -int(days))
    rows = frappe.get_all("HM Sample Order",
        filters={"assigned_to": user, "appointment_date": [">=", start]},
        fields=["name","contact","appointment_date","appointment_time","status",
                "grand_total","incident","collected_tubes","region"],
        order_by="appointment_date desc, appointment_time desc")
    return {"rows": rows}


@frappe.whitelist()
def order_detail(name):
    so = frappe.get_doc("HM Sample Order", name)
    d = so.as_dict()
    d["contact_info"] = _contact_card(so.contact)
    return d


def _contact_card(contact):
    """Real contact card incl. medical fields — only populated values, never fabricated."""
    if not contact:
        return {}
    c = frappe.db.get_value("HM Contact", contact,
        ["full_name", "gender", "dob", "pid", "phone", "blood_type",
         "allergies", "chronic_diseases", "medical_warning", "vip"], as_dict=True)
    if not c:
        return {}
    if c.get("dob"):
        try:
            c["age"] = int(frappe.utils.date_diff(frappe.utils.nowdate(), c["dob"]) // 365)
        except Exception:
            pass
    warnings = []
    if c.get("allergies"):
        warnings.append({"icon": "💊", "text": "Dị ứng: " + c["allergies"], "tone": "rose"})
    if c.get("chronic_diseases"):
        warnings.append({"icon": "🩺", "text": c["chronic_diseases"], "tone": "amber"})
    if c.get("medical_warning"):
        warnings.append({"icon": "⚠", "text": c["medical_warning"], "tone": "violet"})
    c["warnings"] = warnings
    return c


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
