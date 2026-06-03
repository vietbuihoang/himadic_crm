# Office CRUD + PDPA Audit + Tasks — Implementation Plan

**Goal:** Make Contacts/Organizations, PDPA consent/medical-access, and Tasks interactive. Add backend flows (none exist for tasks; contacts only have a validate hook) and wire the screens. Enforce BR-PDPA-001 (medical access → audit log).

**Architecture:** New `contact_and_org/flows.py` + `task_and_activity/flows.py`, whitelisted, `check_permission` on user writes. HM Audit Log records medical access. Frontend reuses `apiPost`/`ui.js`.

**Verified:** HM Audit Log fields: event_time, user, action, reference_doctype, reference_name, purpose, ip_address, user_agent, data_class. HM Task reqd: subject, assigned_to; status Open/In Progress/Done/Cancelled. HM Contact reqd: full_name, phone; pdpa fields: pdpa_consent_given/date/version/file. HM Organization reqd: organization_name.

## Task 1: Backend flows + tests
- `contact_and_org/flows.py`:
  - `create_contact(payload)` / `update_contact(name, payload)` — whitelisted fields only; insert respects perms.
  - `create_organization(payload)` / `update_organization(name, payload)`.
  - `record_consent(contact, version="v1.0")` — set pdpa_consent_given=1, pdpa_consent_date=now, pdpa_consent_version; `check_permission("write")`.
  - `log_medical_access(contact, purpose)` — BR-PDPA-001: require purpose; insert HM Audit Log {event_time, user, action="Xem hồ sơ y tế", reference_doctype="HM Contact", reference_name=contact, purpose, data_class="Medical"}; return {ok}.
- `task_and_activity/flows.py`:
  - `create_task(payload)` — subject + assigned_to required; default status Open.
  - `complete_task(name)` — status Done, completed_at=now.
  - `set_status(name, status)` — validate against the 4 options.
- `tests/test_office.py` (FrappeTestCase): create_contact returns name; record_consent sets pdpa_consent_given; log_medical_access without purpose raises + with purpose writes one HM Audit Log; create_task then complete_task → status Done.

## Task 2: Frontend
- `contact.js`: header "+ Thêm khách" → create modal (full_name, phone, email, customer_type, region) → create_contact. Profile: "Sửa" edit modal → update_contact; "Ghi nhận đồng ý PDPA" → record_consent; the "Y tế (hạn chế)" tab: a button "Xem hồ sơ y tế" that opens a purpose modal → log_medical_access → then reveals the medical fields.
- `tasks.js`: board "+ Thêm việc" → create modal (subject, assigned_to via admin.users, task_type, due_date) → create_task; each card gets a "Hoàn tất" button → complete_task. toast + refresh.

## Task 3: Verify + handoff
- test_office.py green; full suite; bundle; /crm 200; POST 403 guest. Browser loop pending nginx reload.
