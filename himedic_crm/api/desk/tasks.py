# -*- coding: utf-8 -*-
import frappe


@frappe.whitelist()
def list(limit=200):
    rows = frappe.get_list("HM Task",
        fields=["name", "subject", "task_type", "priority", "assigned_to", "due_date", "status"],
        limit_page_length=int(limit), order_by="due_date asc")
    return {"rows": rows}


@frappe.whitelist()
def board():
    statuses = (frappe.get_meta("HM Task").get_field("status").options or "").split("\n")
    statuses = [s for s in statuses if s]
    cols = [{"status": s,
             "cards": frappe.get_list("HM Task", filters={"status": s},
                      fields=["name", "subject", "task_type", "due_date", "assigned_to"], limit_page_length=30)}
            for s in statuses]
    return {"columns": cols}
