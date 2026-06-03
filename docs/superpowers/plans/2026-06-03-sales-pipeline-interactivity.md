# Sales Pipeline Interactivity (Lead + Deal) — Implementation Plan

> **For agentic workers:** execute task-by-task; verify business rules headlessly; the browser click-loop is a handoff (needs nginx reload + login).

**Goal:** Make the Lead and Deal desktop screens perform real business operations per the BA — create/advance/convert leads, log activities, edit deal items, route discounts through approval, and close Won (auto-creating a Sample Order) / Lost — enforcing BR-L-002, BR-D-001, BR-D-005, BR-D-010, BR-D-015. Add backend endpoints + the missing "Chăm sóc" workflow transitions where the business flow needs them.

**Architecture:** New whitelisted endpoints in `lead/flows.py` + `deal/flows.py` (reusing `lead.conversion.convert_lead`, extending `deal.flows.close_won`). Frontend gains a POST helper (`apiPost`, CSRF) + `ui.js` (toast/modal); action buttons are rendered from the workflow's `get_transitions` so only allowed moves appear. Every user-initiated write calls `doc.check_permission("write")`.

**Tech Stack:** Frappe v15 (`@frappe.whitelist`, `frappe.model.workflow.apply_workflow`/`get_transitions`), vanilla ES modules, Tailwind.

**Verified prerequisites:** `Administrator` holds `HM Sales` → can perform transitions/convert. Deal-item→SO-item map: `test_or_package→item_type`, `test`, `package`, `item_name`, `qty`, `price`, `amount`. HM Activity reqd: `activity_time`. HM Team.manager → User.

---

## Task 1: Lead backend flows + workflow "Chăm sóc" extension

**Files:** `himedic_crm/lead/flows.py` (replace placeholder), `himedic_crm/lead/workflow_patch.py` (new), `himedic_crm/api/desk/lead.py` (modify detail), `himedic_crm/tests/test_pipeline.py` (new).

- [ ] **Lead flows** — `lead/flows.py`:
  - `create_lead(payload)`: parse JSON `payload`, `frappe.get_doc({"doctype":"HM Lead", ...}).insert()` (no ignore_permissions — respects create perm). Returns `{name}`. Dedupe handled by existing `validate_lead` (BR-L-002).
  - `log_activity(lead_name, activity_type, note=None, subject=None)`: `frappe.get_doc("HM Lead", lead_name).check_permission("read")`; insert `HM Activity` (`activity_time=now`, `user=session.user`, `activity_type`, `subject` or default, `note`, `reference_doctype="HM Lead"`, `reference_name=lead_name`). activity_type must be one of `Cuộc gọi/Email/Zalo/SMS/Ghi chú/Thăm khám`. Returns `{ok:True}`.
  - `apply_action(lead_name, action)`: `doc=get_doc("HM Lead", lead_name); doc.check_permission("write"); from frappe.model.workflow import apply_workflow; apply_workflow(doc, action)`. Returns `{ok:True, status:doc.status}`.
  - `transitions(lead_name)`: return `[t.action for t in get_transitions(get_doc("HM Lead", lead_name))]`.
- [ ] **Workflow extension** — `lead/workflow_patch.py::ensure_nurturing_transitions()`: idempotently add to `HM Lead Pipeline` (if missing): states `Chăm sóc` (doc_status 0) and transitions `Đủ điều kiện —HM Nurture→ Chăm sóc`, `Chăm sóc —HM Submit→ Đủ điều kiện`, `Chăm sóc —HM Cancel→ Đã hủy`, all allowed `HM Sales`. Call it from `seed.demo()` (so demo + workflow stay consistent) and make demo re-seed leads only into reachable states.
- [ ] **lead.detail timeline** — in `api/desk/lead.py::detail`, replace child-table `activities` with linked HM Activity: `d["activities"] = frappe.get_all("HM Activity", filters={"reference_doctype":"HM Lead","reference_name":name}, fields=["activity_type","subject","note","activity_time"], order_by="activity_time desc")`. Also return `d["transitions"]` = available workflow actions.
- [ ] **Tests** — `tests/test_pipeline.py::TestLeadFlows`: BR-D-001 (`convert_lead` raises when lead not "Đủ điều kiện"); `log_activity` creates an HM Activity; `apply_action(Mới,"HM Submit")` → status "Đã liên hệ".
- [ ] **Verify** headless via console; **commit**.

## Task 2: Deal backend flows (items, discount approval, close won→SO, close lost)

**Files:** `himedic_crm/deal/flows.py` (extend), `himedic_crm/tests/test_pipeline.py` (add).

- [ ] `set_items(deal_name, items)`: `doc.check_permission("write")`; replace `doc.items` from JSON (`test_or_package, test, package, item_name, qty, price, amount`); recompute `subtotal=sum(amount)`, `grand_total=subtotal - (discount_amount or 0)`; save. Returns totals.
- [ ] `request_discount(deal_name, discount_pct)`: `check_permission("write")`. Set `discount_pct`, `discount_amount = subtotal*pct/100`, `grand_total`. **BR-D-010**: if `pct >= 5` → `discount_approval_status="Đang chờ"` and create an `HM Task` (subject `Duyệt CK {pct}% – {deal}`, `assigned_to` = team manager or owner_user, `task_type="Khác"`, `status="Open"`, `due_date`=+1, reference to deal); else `discount_approval_status="Đã duyệt"`. Save. Returns `{approval_status}`.
  - `approve_discount(deal_name)` / `reject_discount(deal_name, remark=None)`: set `discount_approval_status` to `Đã duyệt`/`Từ chối`, `discount_approver=session.user`; close the approval task. (Manager action — `check_permission("write")`.)
- [ ] `apply_action(deal_name, action)`: same pattern as lead (`apply_workflow`). `transitions(deal_name)` helper.
- [ ] **Extend `close_won(deal_name, win_reason=None, appointment_date=None)`** — keep status→"Đã chốt", probability=100; **BR-D-005**: if no `deal.sample_order`, create `HM Sample Order` (contact=deal.contact, organization, deal=deal.name, assigned_to=deal.owner_user, appointment_date=appointment_date or +1 day, appointment_time="08:30:00", region=deal.region, status="Đã phân công", items mapped from deal.items: `item_type←test_or_package`, test, package, item_name, qty, price, amount). Guard BR-S-001 (deal must have ≥1 item else throw "Cơ hội phải có ≥1 dịch vụ trước khi chốt"). Set `deal.sample_order`. Returns `{ok, sample_order}`. Use `apply_workflow(doc,"HM Close Won")` if status transition needed, else direct (deal must be in "Đàm phán").
- [ ] `close_lost` already enforces BR-D-015 — leave, add `check_permission`.
- [ ] **Tests** — `TestDealFlows`: BR-D-005 (`close_won` on a Đàm phán deal w/ items creates an SO); BR-D-010 (`request_discount(8)` → "Đang chờ" + a task exists); BR-D-015 (`close_lost` without reason raises); `set_items` recomputes totals.
- [ ] **Verify** headless; **commit**.

## Task 3: Frontend infra — POST helper, CSRF, toast/modal

**Files:** `www/crm/index.py` (re-add csrf), `www/crm/index.html` (inject csrf), `public/js/crm/lib.js` (add `apiPost`, re-export), `public/js/crm/ui.js` (new), `public/js/crm/app.js` (expose helpers + `refresh()`).

- [ ] `index.py`: re-add `context.csrf_token` inside `try/except` (so console render still works): `try: context.csrf_token = frappe.sessions.get_csrf_token() except Exception: context.csrf_token = ""`.
- [ ] `index.html`: add `window.csrf_token = "{{ csrf_token }}";` to the inject script (no `.__`).
- [ ] `app.js`: add `export async function apiPost(method, args={})` → POST to `/api/method/<method>` with headers `X-Frappe-CSRF-Token: window.csrf_token`, `Content-Type: application/json`, body `JSON.stringify(args)`; parse `{message}` or throw `_server_messages`/`exception` text. Add `export function refresh()` that re-invokes the current `select(...)` from `location.hash`. Expose `window.hmRefresh`.
- [ ] `ui.js` (new): `toast(msg, type='ok')` (fixed bottom-right, auto-dismiss), `openModal({title, bodyHtml, submitLabel, onSubmit})` (overlay + card; `onSubmit` gets a `FormData`/values object, may be async, closes on success, shows error inline), `closeModal()`. Tailwind-styled to match the app.
- [ ] **Verify**: esbuild bundle resolves; **commit**.

## Task 4: Lead screen interactivity

**Files:** `public/js/crm/lead.js`.

- [ ] List: **+ Thêm khách** opens a create modal (lead_name, phone, email, customer_type, source, region) → `apiPost('himedic_crm.lead.flows.create_lead', {payload: JSON.stringify(values)})` → toast + `refresh()`.
- [ ] Detail: load `d.transitions` (from the modified `detail`). Render only allowed actions:
  - `HM Submit` → button "Chuyển bước tiếp" → `apiPost('...lead.flows.apply_action',{lead_name, action:'HM Submit'})`.
  - `HM Cancel` → "Đánh dấu Đã hủy" → apply_action HM Cancel.
  - `HM Nurture` → "Chăm sóc" → apply_action HM Nurture.
  - `HM Convert` → "Convert → Tạo cơ hội" → convert modal (deal_value, deal_type, expected_close_date) → `apiPost('himedic_crm.lead.conversion.convert_lead', {...})` → toast w/ new deal name + navigate to deal/detail.
  - Activity composer: Gọi/Email/Zalo/Lưu ghi chú buttons + textarea → `apiPost('...lead.flows.log_activity',{lead_name, activity_type, note})` → refresh timeline. Timeline renders `d.activities` (now real HM Activity rows).
- [ ] Remove `disabledBtn` for these now-live actions; keep disabled only for genuinely-out-of-scope ones.
- [ ] **Verify** bundle; **commit**.

## Task 5: Deal screen interactivity

**Files:** `public/js/crm/deal.js`, `api/desk/deal.py` (detail returns `transitions` + `discount_approval_status`).

- [ ] `deal.py::detail`: add `d["transitions"] = [...get_transitions...]`.
- [ ] Detail:
  - Items: "Sửa dịch vụ" opens modal to add/remove rows (test/package pick from `catalog.tests`/`catalog.package`, qty, price) → `apiPost('...deal.flows.set_items',{deal_name, items:JSON.stringify(rows)})`.
  - Discount: input %, "Áp dụng" → `request_discount`; if `discount_approval_status=='Đang chờ'` show pending badge + (for managers) Approve/Reject buttons → `approve_discount`/`reject_discount`.
  - Actions from `transitions`: `HM Submit` → "Chuyển bước"; `HM Close Won` → close-won modal (appointment_date, win_reason) → `close_won` → toast w/ SO name; `HM Close Lost` → close-lost modal (lost_reason required) → `close_lost`.
  - Each action → toast + `refresh()`.
- [ ] **Verify** bundle; **commit**.

## Task 6: Phase verification + handoff

- [ ] Run `tests/test_pipeline.py` (all BR assertions) — must pass.
- [ ] Prove one **authenticated POST** path via werkzeug client (guest POST → 403; shape of error). Document that the full click-loop needs nginx reload + browser login.
- [ ] Full esbuild bundle; re-render `/crm` 200.
- [ ] **Commit**; present honest status + acceptance checklist.

---

**Out of scope (later phases):** mobile collection, logistics/lab reception, contacts/org CRUD, tasks board actions, comms send, marketing — unchanged read-only.
