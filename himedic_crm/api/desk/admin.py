# -*- coding: utf-8 -*-
import frappe

HM_ROLES = ["HM Sales", "HM Sales Manager", "HM Marketing", "HM Lab Coordinator",
            "HM Lab Doctor", "HM Accountant", "HM Admin", "HM BOD"]


@frappe.whitelist()
def users(limit=100):
    rows = frappe.get_list("User", filters={"enabled": 1, "user_type": "System User"},
        fields=["name", "full_name", "email"], limit_page_length=int(limit), order_by="full_name asc")
    for r in rows:
        r["roles"] = [x for x in frappe.get_roles(r["name"]) if x in HM_ROLES]
    return {"rows": rows, "hm_roles": HM_ROLES}


@frappe.whitelist()
def workflow(limit=100):
    rows = frappe.get_list("HM Workflow Definition", fields=["name"], limit_page_length=int(limit))
    return {"rows": [frappe.get_doc("HM Workflow Definition", r["name"]).as_dict() for r in rows]}
