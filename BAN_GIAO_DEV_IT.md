# Bàn giao Dev IT — Hi-Medic CRM

## Tóm tắt
- Frappe v15 app `himedic_crm` đầy đủ 12 module nghiệp vụ + Customer Portal + Mobile PWA + tích hợp.
- ~45 DocType, 8 Role, 3 Workflow, 3 Print Format, 4 Script Report, 4 Number Card.
- Webhook FB / Google / Zalo / LIS / VoIP đã sẵn endpoint.
- Hooks scheduler 5'/giờ/ngày/tuần đã cài đặt sẵn cho SLA, nhiệt độ, ROI, NPS, B2B renewal.

## Bước bàn giao (kiểm tra nhanh trên môi trường dev)

```bash
cd frappe-bench
bench get-app himedic_crm /đường/dẫn
bench --site himedic.local install-app himedic_crm
bench --site himedic.local migrate
bench --site himedic.local execute himedic_crm.tests.smoke.run_smoke
```

Output mong đợi (smoke):
```
Lab Test: 5
Test Package: 2
Sample Type: 6
Lead Source: 8
Lead Stage: 6
Deal Stage: 5
Roles HM*: 9
Settings.lead_sla_warn_minutes: 30
OK
```

## Nơi tìm thông tin
- README.md — tổng quan
- INSTALL.md — cài chi tiết
- himedic_crm/hooks.py — toàn bộ hook & fixtures
- himedic_crm/permissions.py — row-level RBAC
- himedic_crm/api/*.py — webhook & integration

Liên hệ: info@miyano.com.vn
