
# -*- coding: utf-8 -*-
import frappe
from frappe.utils import now_datetime
from himedic_crm.utils.geocoding import haversine_m


@frappe.whitelist()
def checkin(sample_order, lat=None, lng=None, reason=None):
    so = frappe.get_doc("HM Sample Order", sample_order)
    so.checkin_at = now_datetime()
    so.checkin_lat = float(lat) if lat else None
    so.checkin_lng = float(lng) if lng else None
    dist = None
    if so.geo_lat and so.geo_lng and lat and lng:
        dist = haversine_m(so.geo_lat, so.geo_lng, float(lat), float(lng))
    so.checkin_distance_m = dist
    # BR-S-002 — > 100m must have reason
    if dist and dist > 100 and not reason:
        frappe.throw("Sai lệch GPS > 100m — yêu cầu nhập lý do")
    so.checkin_reason = reason
    if so.status == "Đã phân công" or so.status == "Đã xác nhận":
        so.status = "Đang lấy mẫu"
    so.save(ignore_permissions=True)
    return {"ok": True, "distance": dist}


@frappe.whitelist()
def finalize_collection(sample_order, signature=None):
    so = frappe.get_doc("HM Sample Order", sample_order)
    if not signature:
        frappe.throw("Cần chữ ký khách")
    so.signature_image = signature
    so.signed_at = now_datetime()
    so.locked = 1
    so.status = "Đã lấy mẫu"
    so.save(ignore_permissions=True)
    return {"ok": True}


@frappe.whitelist()
def report_incident(sample_order, reason, photo=None):
    so = frappe.get_doc("HM Sample Order", sample_order)
    so.incident = reason
    so.save(ignore_permissions=True)
    # BR-S-008 — auto-create re-collection SO
    rc = frappe.get_doc({
        "doctype": "HM Sample Order",
        "deal": so.deal,
        "contact": so.contact,
        "organization": so.organization,
        "order_type": "Re-collection",
        "parent_so": so.name,
        "assigned_to": so.assigned_to,
        "appointment_date": frappe.utils.add_days(frappe.utils.nowdate(), 1),
        "appointment_time": so.appointment_time,
        "address": so.address,
        "region": so.region,
        "status": "Đã phân công",
        "items": [{"item_type": i.item_type, "test": i.test, "package": i.package, "item_name": i.item_name, "qty": i.qty, "price": i.price} for i in so.items or []],
    }).insert(ignore_permissions=True)
    return {"ok": True, "recollection": rc.name}
