
# -*- coding: utf-8 -*-
"""Post-install hooks: create default roles, lead sources, stages, seed test catalog."""
from __future__ import unicode_literals
import frappe


DEFAULT_ROLES = [
    "HM Admin",
    "HM Sales Manager",
    "HM Sales",
    "HM Marketing",
    "HM Lab Coordinator",
    "HM Lab Doctor",
    "HM Accountant",
    "HM BOD",
    "HM Customer",
]


def after_install():
    create_roles()
    seed_lead_sources()
    seed_lead_stages()
    seed_deal_stages()
    seed_sample_types()
    create_default_settings()
    frappe.db.commit()


def create_roles():
    for role in DEFAULT_ROLES:
        if not frappe.db.exists("Role", role):
            doc = frappe.get_doc({"doctype": "Role", "role_name": role, "desk_access": 1 if role != "HM Customer" else 0})
            doc.insert(ignore_permissions=True)


def seed_lead_sources():
    sources = [
        ("FB Ads",       80, "Facebook"),
        ("Google Ads",   75, "Google"),
        ("Zalo OA",      70, "Zalo"),
        ("Landing Page", 65, "Web"),
        ("Walk-in",      60, "Office"),
        ("Hotline",      85, "Phone"),
        ("Referral",     90, "Referral"),
        ("KOL/PR",       70, "Marketing"),
    ]
    for name, score, channel in sources:
        if not frappe.db.exists("HM Lead Source", name):
            frappe.get_doc({"doctype": "HM Lead Source", "source_name": name, "base_score": score, "channel": channel}).insert(ignore_permissions=True)


def seed_lead_stages():
    stages = [
        ("Mới",            1, 0, 0),
        ("Đã liên hệ",     2, 0, 0),
        ("Đủ điều kiện",   3, 1, 0),
        ("Chăm sóc",       4, 0, 0),
        ("Đã chuyển đổi",  5, 0, 1),
        ("Đã hủy",         6, 0, 1),
    ]
    for name, order, is_qualified, is_closed in stages:
        if not frappe.db.exists("HM Lead Stage", name):
            frappe.get_doc({
                "doctype": "HM Lead Stage", "stage_name": name,
                "order_no": order, "is_qualified": is_qualified, "is_closed": is_closed,
            }).insert(ignore_permissions=True)


def seed_deal_stages():
    stages = [
        ("Thẩm định",    1, 20, 0, 0),
        ("Báo giá",       2, 40, 0, 0),
        ("Đàm phán",      3, 60, 0, 0),
        ("Đã chốt",       4,100, 1, 0),
        ("Thất bại",      5,  0, 0, 1),
    ]
    for name, order, prob, is_won, is_lost in stages:
        if not frappe.db.exists("HM Deal Stage", name):
            frappe.get_doc({
                "doctype": "HM Deal Stage", "stage_name": name,
                "order_no": order, "default_probability": prob,
                "is_won": is_won, "is_lost": is_lost,
            }).insert(ignore_permissions=True)


def seed_sample_types():
    types = [
        ("Máu EDTA",       "Tube tím",  3.0, "2-8°C",  4),
        ("Máu Heparin",    "Tube xanh", 3.0, "2-8°C",  4),
        ("Máu sinh hóa",   "Tube vàng", 5.0, "2-8°C",  6),
        ("Nước tiểu",      "Lọ nhựa",   30.0, "2-8°C", 24),
        ("Phân",           "Lọ phân",   10.0, "2-8°C", 24),
        ("Dịch họng",      "Que",        0.0, "Phòng",  4),
    ]
    for name, container, vol, storage, tat in types:
        if not frappe.db.exists("HM Sample Type", name):
            frappe.get_doc({
                "doctype": "HM Sample Type", "sample_type_name": name,
                "container": container, "default_volume_ml": vol,
                "storage_condition": storage, "max_transport_hours": tat,
            }).insert(ignore_permissions=True)


def create_default_settings():
    if not frappe.db.exists("HM CRM Settings", "HM CRM Settings"):
        frappe.get_doc({
            "doctype": "HM CRM Settings",
            "lead_sla_warn_minutes": 30,
            "lead_sla_escalate_minutes": 45,
            "lead_sla_reassign_minutes": 60,
            "discount_approve_threshold_low": 5,
            "discount_approve_threshold_high": 10,
            "b2b_renewal_notice_days": 60,
            "default_currency": "VND",
        }).insert(ignore_permissions=True)


def before_uninstall():
    pass
