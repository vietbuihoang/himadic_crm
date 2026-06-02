
# -*- coding: utf-8 -*-
import frappe


def execute(filters=None):
    filters = filters or {}
    columns = [
        {"label":"NV KD","fieldname":"owner_user","fieldtype":"Link","options":"User","width":180},
        {"label":"Thẩm định","fieldname":"s1","fieldtype":"Int","width":100},
        {"label":"Báo giá","fieldname":"s2","fieldtype":"Int","width":100},
        {"label":"Đàm phán","fieldname":"s3","fieldtype":"Int","width":100},
        {"label":"Đã chốt","fieldname":"s4","fieldtype":"Int","width":100},
        {"label":"Tổng giá trị (VND)","fieldname":"total","fieldtype":"Currency","width":160},
    ]
    rows = frappe.db.sql("""
        SELECT owner_user,
          SUM(CASE WHEN status='Thẩm định' THEN 1 ELSE 0 END) s1,
          SUM(CASE WHEN status='Báo giá' THEN 1 ELSE 0 END) s2,
          SUM(CASE WHEN status='Đàm phán' THEN 1 ELSE 0 END) s3,
          SUM(CASE WHEN status='Đã chốt' THEN 1 ELSE 0 END) s4,
          COALESCE(SUM(grand_total),0) total
        FROM `tabHM Deal` GROUP BY owner_user ORDER BY total DESC
    """, as_dict=True)
    return columns, rows
