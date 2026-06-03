# -*- coding: utf-8 -*-
import frappe


@frappe.whitelist()
def inbox(limit=40):
    calls = frappe.get_list("HM VoIP Call Log",
        fields=["name", "phone", "direction", "creation"],
        limit_page_length=int(limit), order_by="creation desc")
    zalo = frappe.get_list("HM Zalo Message",
        fields=["name", "creation"],
        limit_page_length=int(limit), order_by="creation desc")
    feed = ([{"kind": "call", **c} for c in calls] +
            [{"kind": "zalo", **z} for z in zalo])
    feed.sort(key=lambda x: str(x.get("creation")), reverse=True)
    return {"feed": feed[:int(limit)]}
