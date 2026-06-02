# -*- coding: utf-8 -*-
import frappe


@frappe.whitelist()
def sales():
    stages = frappe.get_all("HM Deal Stage", pluck="name") or \
             ["Thẩm định", "Báo giá", "Đàm phán", "Đã chốt", "Thất bại"]
    pipeline = []
    for s in stages:
        deals = frappe.get_list("HM Deal", filters={"status": s}, fields=["grand_total"], limit_page_length=0)
        pipeline.append({"stage": s, "count": len(deals),
                         "value": sum((d.get("grand_total") or 0) for d in deals)})
    won = frappe.db.count("HM Deal", {"status": "Đã chốt"})
    lost = frappe.db.count("HM Deal", {"status": "Thất bại"})
    win_rate = round(100 * won / (won + lost)) if (won + lost) else 0
    forecast = sum(((d.get("grand_total") or 0) * (d.get("probability") or 0) / 100)
                   for d in frappe.get_list("HM Deal",
                       filters={"status": ["not in", ["Đã chốt", "Thất bại"]]},
                       fields=["grand_total", "probability"], limit_page_length=0))
    return {"pipeline": pipeline, "won": won, "lost": lost, "win_rate": win_rate, "forecast": forecast}


@frappe.whitelist()
def ops():
    total = frappe.db.count("HM Sample Order")
    bad = frappe.db.count("HM Sample Order", {"status": "Lỗi mẫu"})
    return {"orders_total": total, "reject_rate": (round(100 * bad / total) if total else 0),
            "by_status": {s: frappe.db.count("HM Sample Order", {"status": s})
                          for s in ["Đã phân công", "Đã lấy mẫu", "Đang vận chuyển", "Đã nhập Lab", "Hoàn tất", "Lỗi mẫu"]}}
