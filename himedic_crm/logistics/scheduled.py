
# -*- coding: utf-8 -*-
import frappe
from himedic_crm.utils.notify import push_to_user


def check_temperature_alerts():
    """BR-L-101/102 — alert if temperature out-of-range."""
    open_manifests = frappe.get_all("HM Sample Manifest", filters={"status": ["in", ["Đang vận chuyển","Đã giao shipper"]]}, fields=["name","created_by","required_min_temp","required_max_temp"])
    for m in open_manifests:
        # check last 6 logs
        rows = frappe.db.sql("""SELECT log_time, temperature_c FROM `tabHM Temperature Log` WHERE parent=%s ORDER BY log_time DESC LIMIT 6""", m.name, as_dict=True)
        if not rows:
            continue
        for r in rows:
            if m.required_min_temp is not None and r.temperature_c < m.required_min_temp:
                push_to_user(m.created_by, f"❄ Nhiệt độ thấp ở Manifest {m.name}", f"{r.temperature_c}°C", "HM Sample Manifest", m.name); break
            if m.required_max_temp is not None and r.temperature_c > m.required_max_temp:
                push_to_user(m.created_by, f"🔥 Nhiệt độ cao ở Manifest {m.name}", f"{r.temperature_c}°C", "HM Sample Manifest", m.name); break
