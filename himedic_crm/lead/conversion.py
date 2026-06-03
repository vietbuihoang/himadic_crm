
# -*- coding: utf-8 -*-
import frappe
from frappe.utils import now_datetime


@frappe.whitelist()
def convert_lead(lead_name, deal_value=0, deal_type="Đơn lẻ", expected_close_date=None):
    """BR-D-001: only when stage = Đủ điều kiện."""
    lead = frappe.get_doc("HM Lead", lead_name)
    if lead.status != "Đủ điều kiện":
        frappe.throw("Lead phải ở stage 'Đủ điều kiện' trước khi convert.")
    # Contact
    contact = None
    if lead.phone:
        contact = frappe.db.exists("HM Contact", {"phone": lead.phone})
    if not contact:
        c = frappe.get_doc({
            "doctype": "HM Contact",
            "full_name": lead.lead_name,
            "phone": lead.phone,
            "email": lead.email,
            "gender": lead.gender,
            "dob": lead.dob,
            "address": lead.address,
            "region": lead.region,
            "customer_type": "Cá nhân" if lead.customer_type == "Cá nhân" else "Doanh nghiệp NLĐ",
            "owner_user": lead.owner_user,
        }).insert(ignore_permissions=True)
        contact = c.name
    # Organization (if any)
    org = None
    if lead.organization_name:
        org_name = lead.organization_name
        org = frappe.db.exists("HM Organization", {"organization_name": org_name}) or frappe.get_doc({
            "doctype": "HM Organization",
            "organization_name": org_name,
            "tax_id": lead.tax_id,
            "region": lead.region,
            "owner_user": lead.owner_user,
        }).insert(ignore_permissions=True).name
    # Deal
    deal = frappe.get_doc({
        "doctype": "HM Deal",
        "deal_title": f"Cơ hội từ {lead.lead_name}",
        "contact": contact,
        "organization": org,
        "lead": lead.name,
        "owner_user": lead.owner_user or frappe.session.user,
        "team": lead.team,
        "region": lead.region,
        "status": "Thẩm định",
        "probability": 20,
        "deal_type": deal_type,
        "expected_close_date": expected_close_date,
        "currency": "VND",
        "campaign": lead.campaign,
        "utm_source": lead.utm_source,
        "utm_campaign": lead.utm_campaign,
    }).insert(ignore_permissions=True)
    lead.status = "Đã chuyển đổi"
    lead.converted_at = now_datetime()
    lead.converted_deal = deal.name
    lead.save(ignore_permissions=True)
    return {"deal": deal.name, "contact": contact, "organization": org}
