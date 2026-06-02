# Hi-Medic CRM — Frappe v15 App

Hệ thống CRM đặc thù y khoa cho **Công ty TNHH Hi-Medic**: quản lý Lead, Cơ hội,
Khách hàng, Lấy mẫu hiện trường, Vận chuyển mẫu, Tích hợp LIS, Customer Portal,
PWA cho đội Sales-Phlebotomist.

Xây dựng trên **Frappe Framework v15** theo BA: `CRM_HiMedic_BA_TaiLieuPhanTichNghiepVu_v1.docx`.

---

## 1. Yêu cầu hệ thống

- Python ≥ 3.10
- Node.js 18+
- MariaDB 10.11 (RowFormat = Dynamic)
- Redis 6+
- bench (Frappe CLI) ≥ 5.20
- Browser hỗ trợ: Chrome 100+, Edge 100+, Firefox 100+

## 2. Cài đặt nhanh (Quick start)

```bash
# 1. Tạo bench mới (nếu chưa có)
bench init --frappe-branch version-15 frappe-bench
cd frappe-bench

# 2. Tạo site
bench new-site himedic.local --admin-password admin --mariadb-root-password root

# 3. Lấy app
bench get-app himedic_crm /đường/dẫn/đến/Codebase\ himedic_crm

# 4. Install
bench --site himedic.local install-app himedic_crm

# 5. Sync fixtures & migrate
bench --site himedic.local migrate
bench --site himedic.local clear-cache
bench build

# 6. Chạy
bench start
# Mở:  http://himedic.local:8000
# Portal: http://himedic.local:8000/portal
# PWA:    http://himedic.local:8000/m
```

## 3. Cấu trúc thư mục

```
himedic_crm/
├── hooks.py                 # doc events, scheduler, fixtures, perm queries
├── install.py               # post-install seeding
├── boot.py                  # desk boot session
├── notifications.py         # bell-icon counters
├── permissions.py           # row-level permissions
├── modules.txt              # 13 modules
├── patches.txt
│
├── common/                  # shared (Settings, Region, Team, Audit)
├── lead/                    # Module 1 — Lead
├── deal/                    # Module 2 — Deal, Quotation, B2B Contract
├── contact/                 # Module 3 — Contact, Org, PDPA, Health Record
├── sample/                  # Module 4 — Sample Order (mobile flow)
├── logistics/               # Module 5 — Manifest, Temperature, Lab Reception
├── catalog/                 # Module 6 — Test, Package, Sample Type, Price List
├── task/                    # Module 7 — Task, Activity
├── communication/           # Module 8 — Email Template, Zalo, VoIP, Test Result
├── marketing/               # Module 9 — Campaign, ROI, Webhook Log
├── report/                  # Module 10 — KPI Snapshot, Script Reports
├── mobile/                  # Module 11 — Mobile Session, Offline Sync Queue
├── admin/                   # Module 12 — Workflow Definition, Notification Setting
│
├── api/                     # Webhook & integration endpoints
│   ├── webhook.py           # FB Ads, Google, Zalo, Landing
│   ├── lis.py               # LIS results push + sample reject
│   ├── zalo.py              # Zalo OA outbound
│   ├── voip.py              # Click-to-call + inbound
│   ├── mobile.py            # PWA endpoints (my_day, order_detail, sync)
│   ├── portal.py            # OTP login, results, appointments, PDPA
│   └── quotation.py         # send/approve/reject quotation
│
├── fixtures/                # Seed: Roles, Workflows, Lead Sources, Stages, Tests, Packages...
├── public/{css,js}/         # bundle.js, portal.js, himedic.css
├── www/portal/              # Customer Portal pages (HTML)
└── www/m/                   # Mobile PWA pages (HTML)
```

## 4. Modules nghiệp vụ

| # | Module                | DocType chính | Mục tiêu |
|---|----------------------|---------------|----------|
| 1 | Lead                 | HM Lead, HM Lead Source, Stage, Scoring/Assignment Rule | Pipeline 6 stage, scoring 0-100, SLA 30/45/60' |
| 2 | Deal                 | HM Deal, HM Quotation, HM B2B Contract | Pipeline 4 stage, workflow duyệt CK, B2B renewal |
| 3 | Contact & Org        | HM Contact, HM Organization, HM Health Record, HM PDPA Consent | Hồ sơ 360°, PDPA audit |
| 4 | Sample Order         | HM Sample Order, Items, Tubes, Pre-checklist, Field Visit | Mobile workflow: check-in→OCR→tư vấn→lấy mẫu→ký số |
| 5 | Logistics            | HM Sample Manifest, Manifest Item, Temperature Log | Vận chuyển mẫu, nhiệt độ, bàn giao Lab |
| 6 | Catalog              | HM Lab Test, HM Test Package, HM Sample Type, HM Price List | Danh mục XN, gói, sample type, bảng giá nhiều cấp |
| 7 | Task                 | HM Task, HM Activity | Lịch tuần/tháng, recurring, timeline polymorphic |
| 8 | Communication        | HM Email Template, HM Zalo Message, HM VoIP Call Log, HM Test Result | Multi-channel, ghi log đầy đủ |
| 9 | Marketing            | HM Campaign, HM ROI Snapshot, HM Marketing Webhook Log | UTM, ROI, webhook FB/Google/Zalo |
| 10| Reports & Dashboard  | HM KPI Snapshot, Number Cards, Script Reports | Pipeline Team, ROI Campaign, TAT, Sample Error |
| 11| Mobile               | HM Mobile Session, HM Offline Sync Queue | Offline-first sync queue |
| 12| Admin                | HM Workflow Definition, HM Notification Setting, HM Audit Log | RBAC, workflow no-code |

## 5. Endpoints quan trọng

### Inbound webhooks
- `POST /api/method/himedic_crm.api.webhook.fb_lead`     — FB Lead Ads
- `POST /api/method/himedic_crm.api.webhook.google_lead` — Google Lead Form
- `POST /api/method/himedic_crm.api.webhook.zalo_inbound`— Zalo OA tin nhắn vào
- `POST /api/method/himedic_crm.api.webhook.landing`     — Landing page form
- `POST /api/method/himedic_crm.api.lis.receive_result`  — LIS đẩy kết quả
- `POST /api/method/himedic_crm.api.voip.voip_event`     — VoIP webhook

### Outbound / RPC (cần đăng nhập)
- `himedic_crm.api.voip.click_to_call(phone, ref_dt, ref_name)`
- `himedic_crm.api.zalo.send_template` (gián tiếp qua `utils/notify`)
- `himedic_crm.lead.conversion.convert_lead(lead_name, ...)`
- `himedic_crm.deal.flows.close_won(deal_name, win_reason)`
- `himedic_crm.deal.flows.close_lost(deal_name, lost_reason)`
- `himedic_crm.sample.flows.checkin(sample_order, lat, lng, reason)`
- `himedic_crm.sample.flows.finalize_collection(sample_order, signature)`
- `himedic_crm.sample.flows.report_incident(sample_order, reason, photo)`
- `himedic_crm.api.quotation.send_quotation(name, channel)`
- `himedic_crm.api.quotation.approve_discount(name)` / `reject_discount(name, remark)`

### Portal (Customer)
- `POST /api/method/himedic_crm.api.portal.request_otp` (phone)
- `POST /api/method/himedic_crm.api.portal.verify_otp` (phone, code)
- `GET  /api/method/himedic_crm.api.portal.my_results`
- `GET  /api/method/himedic_crm.api.portal.my_appointments`
- `POST /api/method/himedic_crm.api.portal.consent_pdpa`

### Mobile PWA
- `GET  /api/method/himedic_crm.api.mobile.my_day`
- `GET  /api/method/himedic_crm.api.mobile.order_detail?name=…`
- `POST /api/method/himedic_crm.api.mobile.submit_offline_batch`

## 6. Cấu hình tích hợp (sau khi cài)

Vào **Hi-Medic CRM → HM CRM Settings**:
- `lis_endpoint`, `lis_api_key`
- `zalo_oa_token`, `zalo_oa_id`
- `voip_webhook`, `voip_api_token`
- `maps_api_key`
- `sms_endpoint`, `sms_api_key`
- `ca_signature_endpoint`, `ca_signature_token`

Webhook signing secrets được đặt trong `site_config.json`:
```json
{
  "webhook_secret_fb":     "...",
  "webhook_secret_google": "...",
  "webhook_secret_zalo":   "..."
}
```

## 7. Quy tắc nghiệp vụ đã cài

Tham chiếu `BR-*` trong BA — code thực thi:
- BR-L-002 — trùng SĐT trong 30 ngày → `lead/events.validate_lead`
- BR-L-010 — quá SLA 60' → re-assign tự động → `lead/scheduled.enforce_lead_sla`
- BR-D-005 — Deal Won tự sinh SO → `deal/events.on_update_deal`
- BR-D-010 — chiết khấu ≥5% workflow duyệt → `fixtures/workflow.json`
- BR-D-021 — nhắc gia hạn HĐ B2B 60 ngày → `deal/scheduled.nudge_b2b_renewal`
- BR-S-001 — SO có ≥ 1 test → `sample/events.validate_sample_order`
- BR-S-002 — GPS sai >100m bắt nhập lý do → `sample/flows.checkin`
- BR-S-006 — ký số trước khi lock → `sample/events.on_update_sample_order`
- BR-S-008 — lỗi mẫu tự tạo Re-collection → `sample/flows.report_incident`
- BR-L-101/102 — nhiệt độ vận chuyển → `logistics/scheduled.check_temperature_alerts`
- BR-PDPA-001 — audit log truy cập HSYT → `HM Audit Log` + `boot.py`

## 8. Roles & Permissions

```
HM Admin            — toàn quyền
HM Sales Manager    — RW team, duyệt CK
HM Sales            — RW của mình
HM Marketing        — RW Lead/Campaign, R Deal
HM Lab Coordinator  — RW Sample/Manifest, R Contact
HM Lab Doctor       — RW Health Record (audit-log)
HM Accountant       — R Deal Won, R B2B Contract
HM BOD              — R toàn bộ dashboard
HM Customer         — Portal only (kq XN của chính mình)
```

Row-level: `permissions.py` enforce theo `owner_user / assigned_to / team`.

## 9. Test data (sau install)

```bash
bench --site himedic.local console
```
```python
>>> import frappe
>>> frappe.get_all("HM Lab Test", pluck="test_code")
['CBC','GLU','HBA1C','LIPID','URINE']
>>> frappe.get_all("HM Test Package", pluck="package_code")
['GOI-CB','GOI-TD']
```

## 10. Smoke test sau khi cài

```bash
bench --site himedic.local execute himedic_crm.tests.smoke.run_smoke
```

## 11. Backup & Restore
```bash
bench --site himedic.local backup --with-files
bench --site himedic.local restore /path/to/backup.sql.gz
```

## 12. Phát triển tiếp

- Workflow no-code: thêm trong **HM Workflow Definition** + JSON
- Custom field: dùng **Customize Form**, sau đó `bench export-fixtures`
- Hook mới: thêm vào `hooks.py:doc_events` hoặc `scheduler_events`

## 13. License
MIT — © 2026 Hi-Medic.
