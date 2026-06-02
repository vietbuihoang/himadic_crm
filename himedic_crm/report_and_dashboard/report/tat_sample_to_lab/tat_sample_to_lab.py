
import frappe


def execute(filters=None):
    columns = [
        {"label":"Sample Order","fieldname":"name","fieldtype":"Link","options":"HM Sample Order","width":180},
        {"label":"Ngày","fieldname":"appointment_date","fieldtype":"Date","width":100},
        {"label":"NV","fieldname":"assigned_to","fieldtype":"Link","options":"User","width":140},
        {"label":"Khu vực","fieldname":"region","fieldtype":"Link","options":"HM CRM Region","width":120},
        {"label":"TAT (phút)","fieldname":"tat_minutes","fieldtype":"Float","width":120},
        {"label":"Trạng thái","fieldname":"status","fieldtype":"Data","width":120},
    ]
    rows = frappe.db.sql("""
        SELECT name, appointment_date, assigned_to, region, status,
          TIMESTAMPDIFF(MINUTE, checkin_at, lab_received_at) tat_minutes
        FROM `tabHM Sample Order`
        WHERE lab_received_at IS NOT NULL AND checkin_at IS NOT NULL
        ORDER BY appointment_date DESC
        LIMIT 1000
    """, as_dict=True)
    return columns, rows
