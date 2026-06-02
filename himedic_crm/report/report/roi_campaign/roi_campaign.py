
import frappe


def execute(filters=None):
    columns = [
        {"label":"Campaign","fieldname":"name","fieldtype":"Link","options":"HM Campaign","width":160},
        {"label":"Kênh","fieldname":"channel","fieldtype":"Data","width":100},
        {"label":"Ngân sách","fieldname":"budget","fieldtype":"Currency","width":140},
        {"label":"Lead","fieldname":"leads_count","fieldtype":"Int","width":80},
        {"label":"Won","fieldname":"won_count","fieldtype":"Int","width":80},
        {"label":"Doanh thu","fieldname":"revenue","fieldtype":"Currency","width":140},
        {"label":"CPL","fieldname":"cpl","fieldtype":"Currency","width":120},
        {"label":"ROAS","fieldname":"roas","fieldtype":"Float","width":80},
    ]
    rows = frappe.get_all("HM Campaign", fields=["name","channel","budget","leads_count","won_count","revenue","cpl","roas"], order_by="roas desc")
    return columns, rows
