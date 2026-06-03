# Hi-Medic CRM — Triển khai Cloud & Cấu hình Tích hợp (Go-live)

> Mục tiêu: đưa hệ thống lên cloud để **chạy thật (go-live)**, đáp ứng đầy đủ nghiệp vụ, và **kết nối Email / SMS / Zalo / VoIP / LIS** mà môi trường local chưa làm được.
>
> Tài liệu này bám sát đúng code hiện tại: mọi tích hợp đều **đọc cấu hình từ `HM CRM Settings`** (hoặc Frappe Email Account / `site_config.json`), nên go-live = **điền credential + bật scheduler + HTTPS**, không phải sửa code.

---

## 0. Tóm tắt: hệ thống hiện trạng

| Surface | URL | Đối tượng | Trạng thái |
|---|---|---|---|
| CRM Desktop | `/crm` | Sales, Manager, Lab, Kế toán | Tương tác đầy đủ (tạo/sửa/duyệt/chuyển trạng thái) |
| Mobile field PWA | `/m` | NV lấy mẫu | Check-in → CCCD → barcode → ký số → bàn giao |
| Customer Portal | `/portal` | Khách hàng | OTP login → kết quả XN, lịch hẹn, PDPA |

- **Đã hết read-only**: các luồng nghiệp vụ chính (Lead→Deal→Sample→Lab, Contacts, Tasks, Comms, Marketing) đều thao tác thật, có kiểm tra quyền (`check_permission`) và workflow.
- **37 test nghiệp vụ** (BR-D/L/S/PDPA/MKT) đang xanh; đã kiểm chứng chạy được dưới vai trò **HM Sales** thật (không chỉ Administrator).
- **Quản trị danh mục / bảng giá / cấu hình** (Test Catalog, Price List, Workflow, Custom Field): dùng **Frappe Desk** (`/app`) cho power-user — đây là cách go-live hợp lệ, không cần dựng màn hình riêng.

### Những việc BẮT BUỘC để go-live (chi tiết bên dưới)
1. Dựng Frappe lên cloud + domain + **HTTPS** (§2–§4)
2. **Bật scheduler** + background workers (§4) — nếu không, SLA/ROI/NPS/nhắc gia hạn **không chạy**
3. Cấu hình **Email Account** (gửi mail thật) (§6)
4. Điền credential **SMS / Zalo / VoIP / LIS / Maps / CA** vào `HM CRM Settings` (§7–§12)
5. Đăng ký **webhook** chiều vào (FB/Google/Zalo/LIS) + secret trong `site_config.json` (§13)
6. Thay **dữ liệu demo** bằng **master data thật** + tạo **user theo vai trò** (§16–§17)
7. Quyết định **Tailwind**: CDN hay build (§15)

---

## 1. Kiến trúc tích hợp (đọc cấu hình từ đâu)

```
            ┌─────────────────────────── HM CRM Settings (Single DocType, /app/hm-crm-settings) ───────────────────────────┐
            │ zalo_oa_token, zalo_oa_id │ sms_endpoint, sms_api_key │ lis_endpoint, lis_api_key │ voip_webhook,            │
            │ voip_api_token │ maps_api_key │ ca_signature_endpoint, ca_signature_token │ SLA phút, ngưỡng chiết khấu …    │
            └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
Email  → Frappe "Email Account" (Outgoing, /app/email-account)         ← KHÔNG nằm trong HM CRM Settings
Webhook secret → site_config.json: webhook_secret_fb / _google / _zalo  ← bảo mật chữ ký webhook chiều vào
```

| Tích hợp | Code gửi đi | Đọc cấu hình từ |
|---|---|---|
| Email | `frappe.sendmail()` (trong `communication.flows.send_email`, `send_quotation`) | **Email Account (Outgoing)** |
| SMS | `himedic_crm.utils.sms.send_sms` → `communication.flows.send_sms` | `HM CRM Settings.sms_endpoint / sms_api_key` |
| Zalo OA/ZNS | `himedic_crm.api.zalo.send_template` → `openapi.zalo.me` | `HM CRM Settings.zalo_oa_token / zalo_oa_id` |
| VoIP click-to-call | `himedic_crm.api.voip.click_to_call` | `HM CRM Settings.voip_webhook / voip_api_token` |
| LIS đẩy mẫu | `himedic_crm.utils.lis.push_sample_to_lis` | `HM CRM Settings.lis_endpoint / lis_api_key` |
| Maps (lập tuyến) | front-end mobile | `HM CRM Settings.maps_api_key` |
| Chữ ký số (CA) | `ca_signature_endpoint` | `HM CRM Settings.ca_signature_*` |
| Webhook chiều vào | `himedic_crm.api.webhook.*`, `api.lis.receive_result`, `api.zalo.zalo_inbound` | `site_config.json` (secret) |

---

## 2. Chọn hạ tầng cloud

**Phương án A — Frappe Cloud (khuyến nghị, nhanh nhất):** [frappecloud.com](https://frappecloud.com) — managed bench, HTTPS tự động, backup, scheduler bật sẵn, worker có sẵn. Push app `himedic_crm` lên Git → tạo bench → cài app → mở site. Bỏ qua §3–§4 phần thủ công.

**Phương án B — Tự dựng VPS** (Ubuntu 22.04, ≥4GB RAM, ≥2 vCPU). Phù hợp khi cần kiểm soát dữ liệu y tế tại VN (DC trong nước, tuân thủ PDPA).

**Phương án C — Docker** ([frappe_docker](https://github.com/frappe/frappe_docker)) — dễ scale, hợp CI/CD.

> Dữ liệu y tế (PDPA): ưu tiên **data center tại Việt Nam** hoặc VPC riêng; bật mã hóa đĩa; giới hạn IP truy cập `/app`.

---

## 3. Dựng VPS (Phương án B) — tóm tắt lệnh

```bash
# 1. Cài bench (theo tài liệu chính thức Frappe v15)
sudo apt update && sudo apt install -y python3-dev python3.11-venv redis-server mariadb-server \
     nginx supervisor git curl
# cài nvm + node 18, yarn, wkhtmltopdf… (xem https://frappeframework.com/docs/v15/user/en/installation)
pip install frappe-bench
bench init --frappe-branch version-15 frappe-bench && cd frappe-bench

# 2. Tạo site production cho domain thật
bench new-site crm.hi-medic.vn --db-root-password '****' --admin-password '****'

# 3. Lấy app từ Git của bạn + cài
bench get-app https://github.com/vietbuihoang/himadic_crm --branch main
bench --site crm.hi-medic.vn install-app himedic_crm

# 4. Production mode (gunicorn + workers + scheduler qua supervisor + nginx)
sudo bench setup production <user>
bench --site crm.hi-medic.vn enable-scheduler
```

---

## 4. Cấu hình production bắt buộc

```bash
# Domain + HTTPS (Let's Encrypt)
bench config dns_multitenant on
bench setup add-domain crm.hi-medic.vn --site crm.hi-medic.vn
sudo bench setup nginx && sudo bench setup supervisor && sudo supervisorctl reload
sudo bench setup lets-encrypt crm.hi-medic.vn        # cấp SSL tự động

# BẬT SCHEDULER (rất quan trọng — nếu thiếu, các cron nghiệp vụ không chạy)
bench --site crm.hi-medic.vn enable-scheduler
bench --site crm.hi-medic.vn set-config -g pause_scheduler 0
```

Các cron đã khai báo trong `hooks.py` (`scheduler_events`) — chỉ chạy khi scheduler bật:

| Lịch | Tác vụ | Nghiệp vụ |
|---|---|---|
| `*/5 phút` | `lead.scheduled.enforce_lead_sla` | **BR-L-001/010** leo cấp SLA phản hồi lead |
| `*/5 phút` | `sample.scheduled.refresh_route_status` | cập nhật trạng thái tuyến |
| `hằng giờ` | `logistics.scheduled.check_temperature_alerts` | **BR-L-102** cảnh báo nhiệt độ |
| `hằng giờ` | `deal.scheduled.nudge_b2b_renewal` | **BR-D-021** nhắc gia hạn HĐ B2B |
| `hằng ngày` | `marketing.scheduled.compute_daily_roi` | snapshot ROI kênh |
| `hằng ngày` | `report_and_dashboard.scheduled.snapshot_kpi` | snapshot KPI |
| `hằng tuần` | `communication.scheduled.send_nps_surveys` | **BR-CX-001** khảo sát NPS |

> Email gửi nền (`now=False`) và thông báo cần **background worker** chạy (`bench worker` qua supervisor) — `setup production` đã tạo.

---

## 5. Nơi điền cấu hình tích hợp

`/app/hm-crm-settings` (đăng nhập Administrator → tìm "HM CRM Settings"). Các trường `Password` được **mã hóa** trong DB. Hoặc set bằng lệnh:

```bash
bench --site crm.hi-medic.vn console
>>> s = frappe.get_single("HM CRM Settings")
>>> s.sms_endpoint = "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/"
>>> s.sms_api_key  = "<ESMS_API_KEY>"      # field Password → tự mã hóa
>>> s.zalo_oa_id   = "<OA_ID>"
>>> s.zalo_oa_token= "<ZALO_OA_ACCESS_TOKEN>"
>>> s.save(); frappe.db.commit()
```

---

## 6. Email (gửi thật)

Code dùng `frappe.sendmail()` → cần **một Email Account Outgoing** trong Frappe (không nằm ở HM CRM Settings).

1. `/app/email-account/new` → bật **Enable Outgoing**, chọn **Default Outgoing**.
2. Chọn nhà cung cấp:
   - **Google Workspace**: SMTP `smtp.gmail.com:587 (TLS)`, dùng **App Password** (bật 2FA).
   - **Amazon SES** (khuyến nghị khối lượng lớn): SMTP endpoint SES + SMTP credentials; xác thực domain (SPF/DKIM/DMARC).
   - **SendGrid / Mailgun**: SMTP API key.
3. SPF/DKIM/DMARC cho domain `hi-medic.vn` để tránh vào spam.
4. Test: `/app/email-account` → "Send Test Email", hoặc CRM → mở Khách hàng → **✉ Email**.

> Mẫu email động: `/app/hm-email-template` (đã seed 2 mẫu demo) — placeholder theo nghiệp vụ.

---

## 7. SMS (eSMS.vn / SpeedSMS / Twilio)

Code: `himedic_crm/utils/sms.py::send_sms()` đọc `sms_endpoint` + `sms_api_key`. **Hàm `_payload()` đang theo dạng eSMS.vn — chỉnh lại cho đúng nhà cung cấp của bạn.**

| Nhà cung cấp | Ghi chú |
|---|---|
| **eSMS.vn** | Phổ biến tại VN, có Brandname. `_payload` mặc định theo eSMS (`ApiKey/SecretKey/Brandname/Content/Phone/SmsType`). Cần đăng ký Brandname. |
| **SpeedSMS.vn** | API token Bearer; sửa `_payload` + header. |
| **Twilio** | Quốc tế; `from`/`to`/`body`, auth basic (SID/Token). |

Bước:
1. Đăng ký tài khoản + Brandname (eSMS cần duyệt brandname).
2. `HM CRM Settings.sms_endpoint` = URL gateway, `sms_api_key` = key. (Nếu provider cần thêm SecretKey/Brandname → thêm field hoặc đặt trong `site_config.json` rồi đọc trong `_payload`.)
3. Sửa `utils/sms.py::_payload()` đúng schema provider (đã chú thích sẵn).
4. Test: CRM → Giao tiếp → **(thêm nút SMS)** hoặc `frappe.call('himedic_crm.communication.flows.send_sms', {contact, body})`.

---

## 8. Zalo OA / ZNS (Zalo Notification Service)

Code: `himedic_crm/api/zalo.py::send_template()` POST `https://openapi.zalo.me/v2.0/oa/message` với header `access_token` + `template_id`. Dùng cho: nhắc lịch, gửi kết quả, OTP portal.

1. Tạo **Zalo Official Account** (oa.zalo.me) → xác thực doanh nghiệp.
2. Vào **Zalo for Developers** (developers.zalo.me) → tạo App → liên kết OA → bật **ZNS**.
3. **Đăng ký template ZNS** (mỗi loại tin: OTP, nhắc lịch, trả kết quả) → được **template_id**. Map các `template_code` đang dùng trong code: `OTP_PORTAL`, `RESULT_READY`, `APPOINTMENT_REMINDER` → điền template_id thật (đặt ở `HM CRM Settings` hoặc bảng map).
4. Lấy **OA Access Token** (OAuth) → `HM CRM Settings.zalo_oa_token`, `zalo_oa_id` = OA ID.
   > ⚠️ Access token Zalo **hết hạn** (cần refresh token định kỳ). Khuyến nghị: lưu `refresh_token` và thêm cron làm mới token (chưa có sẵn — xem "Việc nên bổ sung" §18).
5. Webhook chiều vào (khách nhắn lại) → §13.
6. Test: gửi nhắc lịch từ CRM → kiểm tra `/app/hm-zalo-message`.

---

## 9. VoIP (3CX / Pano) — click-to-call

Code: `himedic_crm/api/voip.py::click_to_call()` POST tới `voip_webhook` (Bearer `voip_api_token`); webhook chiều về `voip_event` ghi `HM VoIP Call Log` (thời lượng, ghi âm).

1. Tổng đài 3CX/Pano → bật API/Webhook click-to-call.
2. `HM CRM Settings.voip_webhook` = endpoint tổng đài, `voip_api_token` = token.
3. Cấu hình tổng đài gọi về `https://crm.hi-medic.vn/api/method/himedic_crm.api.voip.voip_event` khi cuộc gọi kết thúc (push `user/phone/duration/recording_url`).

---

## 10. LIS (Lab Information System)

Code chiều ra: `utils/lis.py::push_sample_to_lis()` POST `{lis_endpoint}/orders` (Bearer `lis_api_key`) — gọi sau khi Lab xác nhận nhận mẫu (**BR-L-110**). Chiều vào: `api/lis.receive_result` nhận kết quả → tạo `HM Test Result` → thông báo khách + Sales.

1. `HM CRM Settings.lis_endpoint` = base URL LIS, `lis_api_key` = key.
2. Cấu hình LIS gọi callback kết quả về:
   `POST https://crm.hi-medic.vn/api/method/himedic_crm.api.lis.receive_result`
   body `{so_no, pdf_url}`.
3. Đồng bộ mã test (`lis_test_code` trên `HM Lab Test`) khớp danh mục LIS.

---

## 11. Maps (lập tuyến đường mobile)

`HM CRM Settings.maps_api_key` = Google Maps API key (bật Directions + Maps JS + Geocoding). Dùng cho chỉ đường tuyến lấy mẫu ở `/m`. Giới hạn key theo HTTP referrer `crm.hi-medic.vn`.

## 12. Chữ ký số CA (VNPT-CA / FPT-CA)

`HM CRM Settings.ca_signature_endpoint` + `ca_signature_token` để ký số hợp đồng/biên bản (thư viện văn bản). Tích hợp theo API nhà cung cấp CA đã chọn.

---

## 13. Webhook chiều vào + Secret (chống giả mạo)

Lead ingestion & callback gọi vào các endpoint `allow_guest`:

| Kênh | URL đăng ký tại nền tảng nguồn |
|---|---|
| Facebook Lead Ads | `https://crm.hi-medic.vn/api/method/himedic_crm.api.webhook.fb_lead` |
| Google Lead Form | `…/api/method/himedic_crm.api.webhook.google_lead` |
| Landing page | `…/api/method/himedic_crm.api.webhook.landing` |
| Zalo OA (tin đến) | `…/api/method/himedic_crm.api.zalo.zalo_inbound` |
| LIS kết quả | `…/api/method/himedic_crm.api.lis.receive_result` |

**Secret xác thực chữ ký** đọc từ `site_config.json` (`frappe.conf.get("webhook_secret_<provider>")`):

```bash
bench --site crm.hi-medic.vn set-config webhook_secret_fb     "<FB_APP_SECRET>"
bench --site crm.hi-medic.vn set-config webhook_secret_google "<GOOGLE_SECRET>"
bench --site crm.hi-medic.vn set-config webhook_secret_zalo   "<ZALO_SECRET>"
```
> Khi secret được set, `api/webhook.py::_verify()` sẽ kiểm HMAC-SHA256. Để trống = không ép (chỉ dùng khi dev).

---

## 14. Bảo mật & tuân thủ PDPA

- **HTTPS bắt buộc** (Let's Encrypt §4). Bật HSTS (đã có header trong nginx.conf).
- **Mật khẩu tích hợp**: dùng field `Password` (đã mã hóa) — **không** commit secret vào Git.
- **RBAC**: gán đúng vai trò (HM Sales / Sales Manager / Lab Coordinator / Kế toán / Customer) — §17. Không cho user thường vào `/app` nếu không cần.
- **BR-PDPA-001**: mọi lần xem hồ sơ y tế đã ghi `HM Audit Log` (user/time/lý do). Định kỳ review audit log.
- **BR-PDPA-005**: chỉ Manager+ được xuất dữ liệu y tế — review permission export.
- **Backup**: `bench --site … backup --with-files` + cron hằng ngày + đẩy off-site (S3). Frappe Cloud có sẵn.
- Giới hạn IP cho `/app` và `/api/method/*` nhạy cảm (nginx allow/deny hoặc WAF).

---

## 15. Tailwind: CDN hay build? (one-way door)

Hiện 3 surface nạp **Tailwind Play CDN** (`cdn.tailwindcss.com`) + sinh class động (`bg-${color}-500`). Ưu/nhược:

- **Giữ CDN (nhanh, đang chạy)**: cần internet phía client; không hợp CSP chặt; cảnh báo "không dùng cho production" của Tailwind. Chấp nhận được cho nội bộ.
- **Build production (chuẩn hơn)**: biên dịch CSS tĩnh → phải **safelist** mọi màu/sắc độ động đang dùng (sky/amber/emerald/violet/rose/cyan/blue/slate × 50–700), nếu không class động bị purge. Thêm `tailwind.config.js` với `safelist` + bước `bench build`.

> Khuyến nghị go-live nội bộ: giữ CDN giai đoạn đầu; lên kế hoạch build có safelist khi cần CSP/offline.

---

## 16. Thay dữ liệu DEMO bằng MASTER DATA thật

`himedic_crm/seed.py::demo()` chỉ để demo — **không chạy trên production**. Thay bằng:

1. **Danh mục xét nghiệm** (`HM Lab Test`) + **Gói** (`HM Test Package`) + **Bảng giá** — nhập qua Frappe Desk hoặc import CSV; khớp `lis_test_code` với LIS.
2. **Khu vực** (`HM CRM Region`), **Đội** (`HM Team`).
3. **Nguồn lead / Stage** — đã có qua fixtures; chỉnh theo thực tế.
4. **Mẫu Email/Zalo template** thật.
5. **Quy tắc phân lead** (`HM Lead Assignment Rule`) theo địa bàn/đội thật.

> Có thể giữ `seed.py` như script tham chiếu nhưng KHÔNG gọi trên site production.

---

## 17. Tạo user thật theo vai trò (RBAC)

```bash
bench --site crm.hi-medic.vn console
>>> frappe.get_doc({"doctype":"User","email":"sale.an@hi-medic.vn","first_name":"An",
...   "send_welcome_email":1,"roles":[{"role":"HM Sales"}]}).insert()
```
Vai trò: `HM Sales`, `HM Sales Manager`, `HM Marketing`, `HM Lab Coordinator`, `HM Lab Doctor`, `HM Accountant`, `HM Admin`, `HM BOD`. (Khách hàng portal tự tạo qua OTP — role `HM Customer`.)

> Đã sửa: pipeline chạy đúng cho **HM Sales** (self-approval + owner_user). Không bắt mọi người dùng Administrator.

---

## 18. Việc NÊN bổ sung để "hoàn toàn" mượt (gợi ý)

| Hạng mục | Vì sao | Mức |
|---|---|---|
| **Refresh token Zalo OA** | access_token Zalo hết hạn ~ngày → thêm cron làm mới bằng refresh_token | Cao |
| Nút **SMS** trên màn Giao tiếp | endpoint `communication.flows.send_sms` đã có, cần thêm nút UI (song song Zalo/Email) | Trung |
| **Safelist Tailwind** + `bench build` | nếu cần CSP/offline | Trung |
| **PWA service worker** cho `/m` | lấy mẫu offline-first thật (hiện online); đã có `submit_offline_batch` ở backend | Trung |
| **Rate-limit OTP** portal | chống spam `request_otp` | Cao |
| **Map template_code → template_id ZNS** | tránh hard-code | Trung |
| Đồng bộ ERP (Kế toán/Kho) | xuất hóa đơn từ Deal Won | Theo lộ trình |

---

## 19. Checklist GO-LIVE (in ra & tick)

**Hạ tầng**
- [ ] Site production + domain + **HTTPS** hoạt động
- [ ] `enable-scheduler` + `pause_scheduler=0`; worker chạy (kiểm `bench doctor`)
- [ ] Backup tự động + off-site

**Tích hợp** (test gửi thật 1 lần mỗi kênh)
- [ ] Email Account Outgoing + SPF/DKIM → gửi thử OK
- [ ] SMS gateway (`_payload` đúng provider) → gửi thử OK
- [ ] Zalo OA token + template_id ZNS → nhắc lịch thử OK
- [ ] VoIP click-to-call + webhook về OK
- [ ] LIS: đẩy mẫu (sau Lab confirm) + nhận kết quả callback OK
- [ ] Webhook FB/Google/Zalo + secret → tạo lead thử OK
- [ ] Maps key (chỉ đường mobile) OK

**Dữ liệu & quyền**
- [ ] Master data thật (catalog, giá, khu vực, đội); **không** chạy `seed.demo`
- [ ] User thật theo vai trò; phân quyền row-level kiểm tra
- [ ] Audit log PDPA hoạt động

**Nghiệp vụ (smoke test trên trình duyệt)**
- [ ] `/crm`: Lead → log hoạt động → chuyển stage → **Convert** → Deal → thêm dịch vụ → **chiết khấu ≥5% (duyệt)** → **Chốt Won → sinh Sample Order** → Lost (lý do)
- [ ] `/crm` Logistics: gom mẫu → Manifest → Lab nhận (đẩy LIS) → từ chối → re-collection
- [ ] `/m`: route → check-in (GPS) → CCCD → barcode → ký số → bàn giao
- [ ] `/portal`: OTP login → xem kết quả/lịch hẹn → đồng ý PDPA
- [ ] Đăng nhập bằng **user HM Sales thật** (không phải Administrator) chạy trọn pipeline

---

## 20. Lệnh vận hành nhanh

```bash
bench --site crm.hi-medic.vn doctor                 # kiểm scheduler/worker/redis
bench --site crm.hi-medic.vn show-config            # xem config (ẩn password)
bench --site crm.hi-medic.vn console                # set HM CRM Settings
bench --site crm.hi-medic.vn backup --with-files    # backup thủ công
tail -f sites/crm.hi-medic.vn/logs/*.log            # log lỗi (gồm tích hợp)
# Lỗi tích hợp được ghi vào Error Log: /app/error-log
```
