# Sample & Logistics Interactivity — Implementation Plan

**Goal:** Make Sample Order and Logistics screens perform real operations — assign/confirm/cancel sample orders, gather collected samples into a Manifest (BR-L-105), Lab reception that pushes to LIS only after confirm (BR-L-110), and Lab rejection that auto-creates a re-collection order (UC-008, BR-L-108).

**Architecture:** New endpoints in `sample/flows.py` (extend) and `logistics/flows.py` (currently placeholder). SO/Manifest statuses are plain Selects (no workflow) → set via `save()` with `check_permission("write")`. LIS push reuses `utils/lis.push_sample_to_lis`. Frontend reuses `apiPost`/`ui.js` from the previous phase.

**Verified prerequisites:** Manifest & SO not submittable, no workflows. SO statuses: Đã phân công/Đã xác nhận/Đang lấy mẫu/Đã lấy mẫu/Đang vận chuyển/Đã nhập Lab/Hoàn tất/Hủy bởi khách/Lỗi mẫu. Manifest statuses: Đang đóng gói/Đã giao shipper/Đang vận chuyển/Đã đến Lab/Đã đối soát/Đã đóng. Manifest item child: sample_order, tube_barcode, sample_type, received_at_lab, received_at, reject_reason.

## Task 1: Sample + Logistics backend flows
- `sample/flows.py`: add `assign(sample_order, user)`, `confirm(sample_order)` (Đã phân công→Đã xác nhận), `cancel(sample_order, reason)` (→Hủy bởi khách, cancel_reason). Factor `_create_recollection(so, reason)` from the existing `report_incident` and reuse.
- `logistics/flows.py`: write
  - `create_manifest(sample_orders, shipper=None, seal_no=None, from_region=None, to_lab=None, min_temp=None, max_temp=None)`: parse SO list; require ≥1 SO and a seal (BR-L-105). Create HM Sample Manifest (status "Đang đóng gói") with one item per SO (tube_barcode from SO tubes or `<SO>-T1`). Set those SOs status "Đang vận chuyển" + manifest link. Return manifest name.
  - `depart(manifest)`: status → "Đang vận chuyển".
  - `lab_receive(manifest)`: `check_permission("write")`; mark every item received_at_lab+received_at; manifest → "Đã đối soát"; each SO → "Đã nhập Lab"; call `push_sample_to_lis(so)` per item (BR-L-110). Return counts.
  - `reject_item(manifest, sample_order, reason)`: set item reject_reason; SO → "Lỗi mẫu"; `_create_recollection` (BR-L-108). Return re-collection name.
- Tests in `tests/test_logistics.py`: BR-L-105 (create_manifest without seal/SOs raises); lab_receive sets SO "Đã nhập Lab"; reject_item creates a Re-collection SO.

## Task 2: Sample + Logistics frontend
- `api/desk/sample.py`: add `detail(name)` (SO + items) if needed; ensure list returns enough.
- `sample.js`: per-row actions (Assign via user pick, Confirm, Cancel modal); a header "Gom mẫu → Tạo manifest" gathering all "Đã lấy mẫu" SOs (modal: shipper, seal, to_lab) → `create_manifest`.
- `logistics.js`: manifest screen per-row "Khởi hành" (depart) + "Lab nhận" (lab_receive); reception screen Reject button per item → reject modal.
- toast + refresh after each.

## Task 3: Verify + handoff
- `tests/test_logistics.py` green; full bundle; `/crm` 200; POST routing 403 guest. Browser loop pending nginx reload.
