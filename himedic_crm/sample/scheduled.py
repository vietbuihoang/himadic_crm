
# -*- coding: utf-8 -*-
import frappe


def refresh_route_status():
    """Update field visit completion counters."""
    visits = frappe.get_all("HM Field Visit", filters={"status": ["in", ["Mở","Đang chạy"]]}, pluck="name")
    for v in visits:
        # Placeholder: real algorithm joins SO by date+assigned_to
        pass
