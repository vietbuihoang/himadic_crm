
# -*- coding: utf-8 -*-
import frappe
from frappe.utils import add_days, getdate
from himedic_crm.utils.notify import push_to_user


def nudge_b2b_renewal():
    settings = frappe.get_single("HM CRM Settings")
    notice_days = settings.b2b_renewal_notice_days or 60
    today = getdate()
    target = add_days(today, notice_days)
    contracts = frappe.get_all("HM B2B Contract",
        filters={"status": ["in", ["Đang hiệu lực","Sắp hết hạn"]], "end_date": ["<=", target], "renewal_notice_sent": 0},
        fields=["name","organization","end_date","deal"])
    for c in contracts:
        deal = frappe.db.get_value("HM Deal", c.deal, "owner_user") if c.deal else None
        if deal:
            push_to_user(deal, f"📅 HĐ B2B {c.name} sắp hết hạn ({c.end_date})", c.organization, "HM B2B Contract", c.name)
        frappe.db.set_value("HM B2B Contract", c.name, {"renewal_notice_sent": 1, "status": "Sắp hết hạn"})
