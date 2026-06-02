
import frappe


def execute(filters=None):
    columns = [
        {"label":"NV","fieldname":"assigned_to","fieldtype":"Link","options":"User","width":160},
        {"label":"Tổng SO","fieldname":"total","fieldtype":"Int","width":100},
        {"label":"Re-collection","fieldname":"rc","fieldtype":"Int","width":120},
        {"label":"Tỷ lệ (%)","fieldname":"rate","fieldtype":"Percent","width":120},
    ]
    rows = frappe.db.sql("""
        SELECT a.assigned_to,
          COUNT(a.name) total,
          SUM(CASE WHEN a.order_type='Re-collection' THEN 1 ELSE 0 END) rc,
          ROUND(SUM(CASE WHEN a.order_type='Re-collection' THEN 1 ELSE 0 END)*100/NULLIF(COUNT(a.name),0),2) rate
        FROM `tabHM Sample Order` a
        GROUP BY a.assigned_to ORDER BY rate DESC
    """, as_dict=True)
    return columns, rows
