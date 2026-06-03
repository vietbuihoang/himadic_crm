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
    # Read-only admin display. get_all avoids per-doc permission checks that 403'd
    # for users without explicit HM Workflow Definition read perms (e.g. System Manager).
    rows = frappe.get_all("HM Workflow Definition", fields=["*"], limit_page_length=int(limit))
    return {"rows": rows}
