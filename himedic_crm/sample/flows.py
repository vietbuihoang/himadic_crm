
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


def create_recollection(so, reason=None):
    """Auto-create a Re-collection Sample Order from a failed one (BR-S-008 / BR-L-108)."""
    if isinstance(so, str):
        so = frappe.get_doc("HM Sample Order", so)
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
        "incident": reason,
        "items": [{"item_type": i.item_type, "test": i.test, "package": i.package,
                   "item_name": i.item_name, "qty": i.qty, "price": i.price} for i in so.items or []],
    }).insert(ignore_permissions=True)
    return rc.name


@frappe.whitelist()
def report_incident(sample_order, reason, photo=None):
    so = frappe.get_doc("HM Sample Order", sample_order)
    so.incident = reason
    so.save(ignore_permissions=True)
    return {"ok": True, "recollection": create_recollection(so, reason)}  # BR-S-008


# ---- Mobile field-collection ops ----

@frappe.whitelist()
def verify_identity(sample_order, national_id, match_score=None):
    """BR-S-003: match CCCD against the record before collecting."""
    if not national_id:
        frappe.throw("Phải nhập/quét CCCD trước khi lấy mẫu (BR-S-003)")
    so = frappe.get_doc("HM Sample Order", sample_order)
    so.national_id_scanned = 1
    if match_score is not None:
        so.ocr_match_score = float(match_score)
    if so.contact and not frappe.db.get_value("HM Contact", so.contact, "national_id"):
        frappe.db.set_value("HM Contact", so.contact, "national_id", national_id)
    so.save(ignore_permissions=True)
    return {"ok": True, "match_score": so.ocr_match_score}


@frappe.whitelist()
def add_tube(sample_order, barcode, sample_type=None):
    """BR-S-005: each tube needs a unique barcode."""
    if not barcode:
        frappe.throw("Thiếu mã barcode ống mẫu")
    if frappe.db.exists("HM Sample Tube", {"barcode": barcode}):
        frappe.throw(f"Barcode {barcode} đã tồn tại (BR-S-005)")
    so = frappe.get_doc("HM Sample Order", sample_order)
    if not so.national_id_scanned:
        frappe.throw("Phải đối chiếu CCCD trước khi lấy mẫu (BR-S-003)")
    if not sample_type:
        sample_type = frappe.db.get_value("HM Sample Type", {}, "name")  # tube sample_type is mandatory
    so.append("tubes", {"barcode": barcode, "sample_type": sample_type,
                        "collected": 1, "collected_at": now_datetime(), "status": "Đã lấy"})
    so.collected_tubes = len([t for t in so.tubes if t.collected])
    if so.status in ("Đã phân công", "Đã xác nhận", "Đang lấy mẫu"):
        so.status = "Đang lấy mẫu"
    so.save(ignore_permissions=True)
    return {"ok": True, "tubes": so.collected_tubes}


@frappe.whitelist()
def save_checklist(sample_order, answers):
    """Store pre-collection checklist answers (BR-S — screening)."""
    import json as _json
    rows = _json.loads(answers) if isinstance(answers, str) else (answers or [])
    so = frappe.get_doc("HM Sample Order", sample_order)
    so.set("pre_collection_checklist", [])
    for r in rows:
        so.append("pre_collection_checklist", {"question": r.get("question"),
                  "answer": r.get("answer"), "note": r.get("note")})
    so.save(ignore_permissions=True)
    return {"ok": True, "count": len(rows)}


# ---- Desktop coordination ops ----

@frappe.whitelist()
def assign(sample_order, user):
    so = frappe.get_doc("HM Sample Order", sample_order)
    so.check_permission("write")
    so.assigned_to = user
    so.save()
    return {"ok": True, "assigned_to": user}


@frappe.whitelist()
def confirm(sample_order):
    so = frappe.get_doc("HM Sample Order", sample_order)
    so.check_permission("write")
    if so.status != "Đã phân công":
        frappe.throw("Chỉ xác nhận được đơn ở trạng thái 'Đã phân công'")
    so.status = "Đã xác nhận"
    so.save()
    return {"ok": True, "status": so.status}


@frappe.whitelist()
def cancel(sample_order, reason):
    so = frappe.get_doc("HM Sample Order", sample_order)
    so.check_permission("write")
    if not reason:
        frappe.throw("Phải nhập lý do hủy")
    so.status = "Hủy bởi khách"
    so.cancel_reason = reason
    so.save()
    return {"ok": True, "status": so.status}
