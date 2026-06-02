
# -*- coding: utf-8 -*-
import frappe
import re


def validate_contact(doc, method=None):
    if doc.phone:
        s = re.sub(r"\D", "", doc.phone)
        if len(s) < 8:
            frappe.throw("SĐT không hợp lệ")
