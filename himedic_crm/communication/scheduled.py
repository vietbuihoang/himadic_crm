
# -*- coding: utf-8 -*-
import frappe
from frappe.utils import add_days, getdate
from himedic_crm.utils.notify import send_zalo_template


def send_nps_surveys():
    """Send NPS survey 7 days after Test Result released."""
    target = add_days(getdate(), -7)
    results = frappe.get_all("HM Test Result",
        filters={"released_to_portal": 1, "result_date": ["between", [add_days(target, -1), target]]},
        fields=["name","contact"])
    for r in results:
        phone = frappe.db.get_value("HM Contact", r.contact, "phone")
        if phone:
            try:
                send_zalo_template(phone, "NPS_SURVEY", {"result_id": r.name})
            except Exception:
                frappe.log_error(frappe.get_traceback(), "NPS send failed")
