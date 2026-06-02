# -*- coding: utf-8 -*-
"""Idempotent demo data for the desktop CRM workspace.
Run:  bench --site himedic.local execute himedic_crm.seed.demo
Wipe: bench --site himedic.local execute himedic_crm.seed.demo --kwargs "{'clear': True}"
"""
import frappe

OWNER = "Administrator"  # owner_user / assigned_to link to User; only Administrator exists in this env

# (region_code == document name == the value stored in region Link fields, region_name)
REGIONS = [("Q.7", "Quận 7"), ("Q.10", "Quận 10"), ("Q.12", "Quận 12"),
           ("Bình Tân", "Bình Tân"), ("Bình Thạnh", "Bình Thạnh")]
TEAMS = [("DOI-Q7", "Đội Q.7"), ("DOI-BT", "Đội Bình Tân")]

# (lead_name, phone, customer_type, source, score, stage, region)
LEAD_NAMES = [
    ("Chị Hương Trần", "0908123456", "Cá nhân", "FB Ads", 82, "Mới", "Q.7"),
    ("PK Đa khoa Hoàng Anh", "02838951122", "Phòng khám", "Google Ads", 74, "Đã liên hệ", "Bình Tân"),
    ("Anh Phạm Quốc Hùng", "0913778901", "Doanh nghiệp", "Zalo OA", 91, "Đủ điều kiện", "Q.7"),
    ("BV Đa khoa Tâm Phúc", "02866778899", "Bệnh viện", "Walk-in", 68, "Chăm sóc", "Q.10"),
    ("Chị Lưu Diệu Linh", "0987555333", "Cá nhân", "Hotline", 55, "Mới", "Bình Thạnh"),
    ("Cty CP May Sao Mai", "02839440011", "Doanh nghiệp", "Referral", 78, "Đủ điều kiện", "Q.12"),
]
# (organization_name, tax_id, region, is_b2b)
ORG_NAMES = [
    ("Cty CP May Sao Mai", "0312345678", "Q.12", 1),
    ("PK Đa khoa Hoàng Anh", "0398765432", "Bình Tân", 0),
    ("BV Đa khoa Tâm Phúc", "0301122334", "Q.10", 0),
    ("Cty TNHH Hùng Phát", "0309988776", "Q.7", 1),
]
# (full_name, phone, customer_type, region, gender, vip)
CONTACT_NAMES = [
    ("Chị Hương Trần", "0908123456", "Cá nhân", "Q.7", "Nữ", 0),
    ("Anh Phạm Quốc Hùng", "0913778901", "Cá nhân", "Q.7", "Nam", 1),
    ("Chị Lưu Diệu Linh", "0987555333", "Cá nhân", "Bình Thạnh", "Nữ", 0),
    ("Nguyễn Văn Đại", "0901112223", "Doanh nghiệp NLĐ", "Q.12", "Nam", 0),
]
# (deal_title, stage, probability, grand_total, region)
DEALS = [
    ("Gói khám tổng quát Premium x2", "Báo giá", 60, 8400000, "Q.7"),
    ("HĐ khám SK định kỳ 250 NLĐ", "Đàm phán", 75, 425000000, "Q.12"),
    ("Gói tầm soát ung thư nữ", "Thẩm định", 40, 4200000, "Bình Thạnh"),
    ("HĐ khung 12 tháng", "Báo giá", 55, 180000000, "Bình Tân"),
    ("Gói tiền hôn nhân x1", "Đàm phán", 80, 3800000, "Q.7"),
]
# (campaign_code, campaign_name, channel, budget, spent, leads, won, revenue)
CAMPAIGNS = [
    ("DEMO-FB-T05", "Gói khám tổng quát T05", "FB", 30000000, 18500000, 142, 23, 196000000),
    ("DEMO-GG-Q2", "B2B Khám SK Q2", "Google", 50000000, 41000000, 88, 12, 605000000),
    ("DEMO-ZL-VSIP", "KCN VSIP T04", "Zalo", 12000000, 9200000, 64, 9, 178000000),
]
# (subject, task_type)
TASK_SUBJECTS = [
    ("Gọi chốt báo giá Sao Mai", "Cuộc gọi"),
    ("Khảo sát mặt bằng nhà máy", "Thăm khách"),
    ("Gửi kết quả XN cho khách VIP", "Follow-up"),
]


def _ensure(doctype, filters, values):
    name = frappe.db.exists(doctype, filters)
    if name:
        return name
    doc = frappe.get_doc({"doctype": doctype, **values})
    doc.insert(ignore_permissions=True)
    return doc.name


def _wipe():
    for dt, field, vals in [
        ("HM Task", "subject", [t[0] for t in TASK_SUBJECTS]),
        ("HM Campaign", "campaign_code", [c[0] for c in CAMPAIGNS]),
        ("HM Deal", "deal_title", [d[0] for d in DEALS]),
        ("HM Lead", "lead_name", [l[0] for l in LEAD_NAMES]),
        ("HM Contact", "full_name", [c[0] for c in CONTACT_NAMES]),
        ("HM Organization", "organization_name", [o[0] for o in ORG_NAMES]),
    ]:
        for n in frappe.get_all(dt, filters={field: ["in", vals]}, pluck="name"):
            frappe.delete_doc(dt, n, force=True, ignore_permissions=True)
    for n in frappe.get_all("HM Sample Order", filters={"address": ["like", "%[DEMO]%"]}, pluck="name"):
        frappe.delete_doc("HM Sample Order", n, force=True, ignore_permissions=True)
    for n in frappe.get_all("HM Sample Manifest", filters={"seal_no": ["like", "DEMO-%"]}, pluck="name"):
        frappe.delete_doc("HM Sample Manifest", n, force=True, ignore_permissions=True)


def demo(clear=False):
    """Create (or with clear=True, just remove) demo data. Idempotent."""
    _wipe()
    if clear:
        frappe.db.commit()
        return {"cleared": True}

    for code, name in REGIONS:
        _ensure("HM CRM Region", {"region_code": code},
                {"region_code": code, "region_name": name})
    for code, name in TEAMS:
        _ensure("HM Team", {"team_code": code}, {"team_code": code, "team_name": name})

    for name, phone, ctype, region, gender, vip in CONTACT_NAMES:
        frappe.get_doc({"doctype": "HM Contact", "full_name": name, "phone": phone,
            "customer_type": ctype, "region": region, "gender": gender, "vip": vip,
            "owner_user": OWNER}).insert(ignore_permissions=True)
    for name, tax, region, isb2b in ORG_NAMES:
        frappe.get_doc({"doctype": "HM Organization", "organization_name": name, "tax_id": tax,
            "region": region, "is_b2b": isb2b, "owner_user": OWNER}).insert(ignore_permissions=True)
    # Lead/Deal status fields are workflow-controlled: insert at the initial state,
    # then force the target stage via db.set_value (bypasses workflow transition checks).
    for name, phone, ctype, source, score, stage, region in LEAD_NAMES:
        d = frappe.get_doc({"doctype": "HM Lead", "lead_name": name, "phone": phone, "customer_type": ctype,
            "source": source, "score": score, "status": "Mới", "region": region, "owner_user": OWNER})
        d.insert(ignore_permissions=True)
        if stage != "Mới":
            frappe.db.set_value("HM Lead", d.name, "status", stage, update_modified=False)
    for title, stage, prob, total, region in DEALS:
        d = frappe.get_doc({"doctype": "HM Deal", "deal_title": title, "status": "Thẩm định", "probability": prob,
            "grand_total": total, "subtotal": total, "region": region, "owner_user": OWNER,
            "expected_close_date": frappe.utils.add_days(frappe.utils.nowdate(), 10)})
        d.insert(ignore_permissions=True)
        if stage != "Thẩm định":
            frappe.db.set_value("HM Deal", d.name, "status", stage, update_modified=False)
    for code, cname, channel, budget, spent, leads, won, revenue in CAMPAIGNS:
        cpl = round(budget / leads) if leads else 0
        roas = round(revenue / spent, 2) if spent else 0
        frappe.get_doc({"doctype": "HM Campaign", "campaign_code": code, "campaign_name": cname,
            "channel": channel, "budget": budget, "spent": spent, "leads_count": leads,
            "won_count": won, "revenue": revenue, "cpl": cpl, "roas": roas,
            "status": "Đang chạy"}).insert(ignore_permissions=True)
    contact0 = frappe.db.get_value("HM Contact", {"full_name": CONTACT_NAMES[0][0]}, "name")
    so_tests = [("LIPID", "Mỡ máu (Lipid)", 350000), ("HBA1C", "HbA1c", 250000), ("URINE", "Tổng phân tích nước tiểu", 80000)]
    for i, status in enumerate(["Đã phân công", "Đã lấy mẫu", "Đang vận chuyển"]):
        test_code, test_name, price = so_tests[i % len(so_tests)]
        frappe.get_doc({"doctype": "HM Sample Order", "contact": contact0, "assigned_to": OWNER,
            "appointment_date": frappe.utils.add_days(frappe.utils.nowdate(), i),
            "appointment_time": "08:30:00", "address": "123 Nguyễn Thị Thập, Q.7 [DEMO]",
            "region": "Q.7", "status": status, "total_tubes": 3,
            "items": [{"item_type": "Test", "test": test_code, "item_name": test_name,
                       "qty": 1, "price": price, "amount": price}]}).insert(ignore_permissions=True)
    demo_so = frappe.get_all("HM Sample Order", filters={"address": ["like", "%[DEMO]%"]},
                             pluck="name", limit_page_length=2)
    manifest_items = [{"sample_order": so, "tube_barcode": f"DEMO-TUBE-{idx+1:03d}"}
                      for idx, so in enumerate(demo_so)] or [{"tube_barcode": "DEMO-TUBE-001"}]
    frappe.get_doc({"doctype": "HM Sample Manifest", "manifest_date": frappe.utils.nowdate(),
        "seal_no": "DEMO-0001", "created_by": OWNER, "shipper": OWNER, "from_region": "Q.7",
        "to_lab": "Lab Trung tâm Q.7", "status": "Đang vận chuyển",
        "total_items": len(manifest_items), "items": manifest_items}).insert(ignore_permissions=True)
    for subj, ttype in TASK_SUBJECTS:
        frappe.get_doc({"doctype": "HM Task", "subject": subj, "task_type": ttype, "status": "Open",
            "assigned_to": OWNER,
            "due_date": frappe.utils.add_days(frappe.utils.nowdate(), 2)}).insert(ignore_permissions=True)

    frappe.db.commit()
    counts = {dt: frappe.db.count(dt) for dt in
              ["HM Lead", "HM Deal", "HM Contact", "HM Organization", "HM Sample Order",
               "HM Sample Manifest", "HM Campaign", "HM Task"]}
    return {"seeded": True, "counts": counts}
