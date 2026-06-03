# -*- coding: utf-8 -*-
"""Logistics / Lab-reception operations (desktop write path)."""
import json

import frappe
from frappe.utils import now_datetime, nowdate

from himedic_crm.sample.flows import create_recollection


@frappe.whitelist()
def create_manifest(sample_orders, shipper=None, seal_no=None, from_region=None,
                    to_lab=None, min_temp=None, max_temp=None):
    """Gather collected sample orders into a transport manifest (BR-L-105)."""
    sos = json.loads(sample_orders) if isinstance(sample_orders, str) else (sample_orders or [])
    if not sos:
        frappe.throw("Phải chọn ≥1 đơn đã lấy mẫu để gom (BR-L-105)")
    if not seal_no:
        frappe.throw("Phải có số seal niêm phong (BR-L-105)")
    items = []
    for so_name in sos:
        so = frappe.get_doc("HM Sample Order", so_name)
        if so.status not in ("Đã lấy mẫu", "Đang vận chuyển"):
            frappe.throw(f"Đơn {so_name} chưa ở trạng thái 'Đã lấy mẫu'")
        tubes = [t.barcode for t in (so.get("tubes") or []) if getattr(t, "barcode", None)] or [f"{so_name}-T1"]
        for bc in tubes:
            items.append({"sample_order": so_name, "tube_barcode": bc})
    manifest = frappe.get_doc({
        "doctype": "HM Sample Manifest",
        "manifest_date": nowdate(),
        "created_by": frappe.session.user,
        "shipper": shipper, "seal_no": seal_no,
        "from_region": from_region, "to_lab": to_lab,
        "required_min_temp": min_temp, "required_max_temp": max_temp,
        "status": "Đang đóng gói", "total_items": len(items), "items": items,
    }).insert()
    for so_name in sos:
        frappe.db.set_value("HM Sample Order", so_name,
                            {"status": "Đang vận chuyển", "manifest": manifest.name})
    return {"ok": True, "manifest": manifest.name, "tubes": len(items)}


@frappe.whitelist()
def depart(manifest):
    m = frappe.get_doc("HM Sample Manifest", manifest)
    m.check_permission("write")
    m.status = "Đang vận chuyển"
    m.departed_at = now_datetime()
    m.save()
    return {"ok": True, "status": m.status}


@frappe.whitelist()
def lab_receive(manifest):
    """Lab Coordinator confirms receipt → mark items/SOs, push to LIS (BR-L-110)."""
    m = frappe.get_doc("HM Sample Manifest", manifest)
    m.check_permission("write")
    received = 0
    pushed = 0
    sos = set()
    for it in m.items or []:
        if it.reject_reason:
            continue
        it.received_at_lab = 1
        it.received_at = now_datetime()
        received += 1
        if it.sample_order:
            sos.add(it.sample_order)
    m.status = "Đã đối soát"
    m.arrived_at = now_datetime()
    m.lab_receiver = frappe.session.user
    m.save()
    from himedic_crm.utils.lis import push_sample_to_lis
    for so_name in sos:
        frappe.db.set_value("HM Sample Order", so_name,
                            {"status": "Đã nhập Lab", "lab_received_at": now_datetime()})
        try:
            push_sample_to_lis(so_name)  # BR-L-110: only after Lab confirm
            pushed += 1
        except Exception:
            frappe.log_error(frappe.get_traceback(), "lab_receive LIS push")
    return {"ok": True, "received": received, "orders": len(sos), "pushed": pushed}


@frappe.whitelist()
def reject_item(manifest, sample_order, reason):
    """Lab rejects a sample → mark it and auto-create a re-collection SO (UC-008, BR-L-108)."""
    if not reason:
        frappe.throw("Phải nhập lý do từ chối")
    m = frappe.get_doc("HM Sample Manifest", manifest)
    m.check_permission("write")
    hit = False
    for it in m.items or []:
        if it.sample_order == sample_order:
            it.reject_reason = reason
            hit = True
    if not hit:
        frappe.throw(f"Không tìm thấy đơn {sample_order} trong manifest")
    m.rejected_items = (m.rejected_items or 0) + 1
    m.save()
    frappe.db.set_value("HM Sample Order", sample_order, "status", "Lỗi mẫu")
    rc = create_recollection(sample_order, f"Lab từ chối: {reason}")  # BR-L-108
    return {"ok": True, "recollection": rc}
