# -*- coding: utf-8 -*-
import frappe

SO_STATUS_COLOR = {"Đã phân công": "sky", "Đã xác nhận": "amber", "Đang lấy mẫu": "violet",
                   "Đã lấy mẫu": "cyan", "Đang vận chuyển": "blue", "Đã nhập Lab": "emerald",
                   "Hoàn tất": "emerald", "Hủy bởi khách": "rose", "Lỗi mẫu": "rose"}


@frappe.whitelist()
def list(limit=50, start=0):
    rows = frappe.get_list("HM Sample Order",
        fields=["name", "contact", "appointment_date", "appointment_time", "address", "region",
                "status", "assigned_to", "total_tubes"],
        limit_page_length=int(limit), limit_start=int(start), order_by="appointment_date desc")
    return {"rows": rows, "total": frappe.db.count("HM Sample Order"),
            "status_color": SO_STATUS_COLOR}
