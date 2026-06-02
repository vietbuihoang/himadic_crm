
# -*- coding: utf-8 -*-
import frappe
from frappe.utils import now_datetime


def validate_lead(doc, method=None):
    # BR-L-002 duplicate detection — within 30 days
    if doc.phone and not doc.flags.get("ignore_dup"):
        from frappe.utils import add_days, now_datetime as nd
        cutoff = add_days(nd(), -30)
        existing = frappe.db.sql("""
            SELECT name FROM `tabHM Lead`
            WHERE phone=%s AND name!=%s AND creation > %s LIMIT 1
        """, (doc.phone, doc.name or "new", cutoff), as_dict=True)
        if existing:
            doc.add_comment("Comment", f"⚠ Trùng SĐT với lead {existing[0].name} trong 30 ngày")


def after_insert_lead(doc, method=None):
    """Auto-assign + push notification + apply scoring rules."""
    from himedic_crm.lead.assignment import auto_assign
    auto_assign(doc)
    if doc.owner_user:
        from himedic_crm.utils.notify import push_to_user
        push_to_user(
            doc.owner_user,
            f"Lead mới #{doc.name} — {doc.lead_name}",
            f"SĐT: {doc.phone} · Nguồn: {doc.source or ''} · Score: {doc.score}",
            ref_dt="HM Lead", ref_name=doc.name,
        )
    log_activity(doc, "Tạo lead", f"Lead {doc.name} được tạo từ {doc.source or 'thủ công'}")


def on_update_lead(doc, method=None):
    if doc.has_value_changed("status"):
        log_activity(doc, "Thay đổi stage", f"{doc.get_db_value('status')} → {doc.status}")
        if doc.status == "Đã liên hệ" and not doc.first_response_at:
            doc.db_set("first_response_at", now_datetime(), update_modified=False)


def log_activity(doc, atype, subject):
    frappe.get_doc({
        "doctype": "HM Activity",
        "activity_time": now_datetime(),
        "user": frappe.session.user,
        "activity_type": atype,
        "subject": subject,
        "reference_doctype": "HM Lead",
        "reference_name": doc.name,
    }).insert(ignore_permissions=True)
