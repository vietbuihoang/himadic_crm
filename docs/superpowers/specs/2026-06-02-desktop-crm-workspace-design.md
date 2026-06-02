# Hi-Medic CRM — Desktop Workspace (read-only, all 12 modules)

**Date:** 2026-06-02
**Status:** Approved design → ready for implementation plan
**Surface:** Desktop CRM workspace (office app). Mobile field PWA and customer portal are separate, later surfaces.

---

## 1. Goal

Build the **desktop CRM workspace** described in `docs/CRM_HiMedic_UI_Mockup.html` as a working
Frappe-served frontend. Every desktop screen across all 12 modules is built to the mockup's
visual design and **wired to live data** from the existing `HM *` DocTypes, **read-only** in this
pass (no create/edit/convert). A demo-data seeder populates the empty transactional tables so the
build is demonstrable.

### Success criteria
1. `/crm` loads (login required) and renders the mockup's shell: sidebar (12 modules), top bar, routed content.
2. All ~20 desktop screens render to the mockup's look and feel.
3. Lists, kanban columns, counts, pipeline sums, statuses, owners, dates show **real DocType data**.
4. `bench execute himedic_crm.seed.demo` populates realistic Vietnamese demo data; every screen is then non-empty.
5. Empty tables render a clean empty state, not a broken screen.
6. No write operations occur; action buttons are visibly disabled.

### Non-goals (YAGNI)
Create/edit/convert actions · mobile PWA (`www/m`) · customer portal (`www/portal`) ·
charting libraries (reuse the mockup's CSS bars) · real-time updates · compiled Tailwind build.

---

## 2. Architecture

A **Frappe `www` page at `/crm`** (login required) serves a Jinja shell that boots a
**client-side JS app** — a faithful port of the mockup's SPA, fed by **real data** from thin
read-only whitelisted API methods. Hash-based routing (`#<module>/<screen>`) switches screens
without page reloads, matching the mockup.

```
Browser ──► /crm  (Jinja shell + Tailwind Play CDN + app JS)
   │           app.js (MODULES config, router, sidebar) → module JS renders the screen
   ▼
fetch /api/method/himedic_crm.api.desk.<module>.<method>
   │           @frappe.whitelist read methods — permissions enforced by Frappe
   ▼
HM Lead / HM Deal / HM Contact / HM Sample Order / …   ◄── seed.demo() populates
```

### Data flow (per screen)
1. Router resolves `#lead/kanban` → calls `SCREENS.lead.kanban()`.
2. Screen shows a loading skeleton, then `await api('lead', 'kanban', {params})`.
3. `api()` wraps `frappe.call` to `himedic_crm.api.desk.lead.kanban`.
4. The Python method queries DocTypes, shapes a screen-ready dict, returns JSON.
5. JS renders HTML from the data and injects it into `#mainContent`.
6. Errors → inline error card; empty results → empty state.

---

## 3. File layout (per-module isolation — no 2000-line blobs)

```
himedic_crm/
  www/crm/
    index.html              # Jinja shell: sidebar mount, topbar, #mainContent; loads CDN + JS
    index.py                # get_context: require login (guest → /login), pass user/roles
  public/js/crm/
    app.js                  # MODULES config, hash router, sidebar render, api() fetch helper, dispatch
    lib.js                  # shared render helpers: tag, avatar, screenHeader, tabs, money/date fmt,
                            #   skeleton, emptyState, errorCard
    overview.js             # Tổng quan / welcome
    lead.js                 # list, kanban, detail
    deal.js                 # kanban, detail
    contact.js              # list, profile (360°)
    sample.js               # list (đơn lấy mẫu)   [mobile screen belongs to mobile surface — skip]
    logistics.js            # manifest, reception
    catalog.js              # tests, package
    tasks.js                # calendar, board
    comm.js                 # inbox, portal-preview
    marketing.js            # campaigns, routing
    reports.js              # sales, ops
    admin.js                # users, workflow
  public/css/crm.css        # phone-frame, scroll-thin, pulse-dot, kanban-card, tab-active (from mockup <style>)
  api/desk/
    __init__.py
    lead.py deal.py contact.py sample.py logistics.py
    catalog.py tasks.py comm.py marketing.py reports.py admin.py overview.py
  seed.py                   # demo() — idempotent Vietnamese demo data
```

**Why per-module split:** each JS file and each API module owns one module's screens and can be
read, edited, and tested in isolation. A single generated 2000-line blob cannot be safely hand-edited.

---

## 4. Screen → DocType mapping

All DocTypes are prefixed `HM `. Real fields verified from the JSON definitions.

| Module / screen | Source DocType(s) | Key real fields | Derived / placeholder |
|---|---|---|---|
| **overview**/home | (static welcome) | module list | counts may be added if cheap |
| **lead**/list | HM Lead | lead_name, phone, organization_name, source, score, status, owner_user, region, campaign, modified | response-time-avg banner = placeholder |
| **lead**/kanban | HM Lead grouped by status; HM Lead Stage for columns | per-stage count, cards | — |
| **lead**/detail | HM Lead (+ activities child, notes) | all fields, activity timeline | cost/lead = placeholder |
| **deal**/kanban | HM Deal grouped by status; HM Deal Stage | per-stage count + grand_total sum | forecast/win-rate KPIs = real sums where possible, else placeholder |
| **deal**/detail | HM Deal (+ items child) | deal_title, org/contact, items, subtotal, grand_total, probability, status, owner_user, expected_close_date, deal_type | discount approval shown read-only |
| **contact**/list | HM Contact | full_name, customer_type, phone, email, pid, owner_user, vip | LTV / last-visit = placeholder unless aggregable |
| **contact**/profile | HM Contact (+ HM Organization, HM Deal, HM Test Result) | full_name, pid, pdpa_consent_*, organization, medical fields (RBAC) | NPS / LTV tiles = placeholder |
| **sample**/list | HM Sample Order | contact, appointment_date/time, address, region, status, assigned_to, total_tubes | — |
| **logistics**/manifest | HM Sample Manifest (+ items) | manifest_date, shipper, status, from_region, to_lab, total_items, temperature_breached | tracking timeline from status |
| **logistics**/reception | HM Sample Manifest (status at Lab) + HM Sample Order | lab_received_at, rejected_items | — |
| **catalog**/tests | HM Lab Test | test_code, test_name_vi/en, test_group, sample_type, tat_hours, retail_price, b2b_price | — |
| **catalog**/package | HM Test Package (+ items) | package_code, package_name, category, retail_price, b2b_price, is_active | — |
| **tasks**/calendar | HM Task | subject, due_date, task_type, status, assigned_to | calendar grid client-rendered |
| **tasks**/board | HM Task grouped by status | per-status cards | — |
| **comm**/inbox | HM VoIP Call Log, HM Zalo Message, HM Email Template (recent) | direction, phone, channel, timestamps | unified feed merge |
| **comm**/portal | (static preview of portal look) | — | placeholder preview |
| **marketing**/campaigns | HM Campaign | campaign_name, channel, budget, spent, leads_count, won_count, revenue, cpl, roas, status | all real (fields exist) |
| **marketing**/routing | HM Lead Assignment Rule | rule fields | — |
| **reports**/sales | HM Deal / HM Lead aggregates | pipeline by stage, win counts, revenue sums | forecast = weighted sum (real) |
| **reports**/ops | HM Sample Order / HM Sample Manifest aggregates | orders/day, reject rate, avg collect→lab | computed where data allows, else placeholder |
| **admin**/users | User + HM role list | users, roles (HM Sales, HM Sales Manager, …) | — |
| **admin**/workflow | HM Workflow Definition | workflow rows | — |

**Note:** the mockup's `sample` module has a `📱 Quy trình Mobile` screen — that belongs to the
**mobile** surface and is **out of scope** here. The desktop `sample` module ships the list screen only.

---

## 5. Real-vs-placeholder policy (explicit)

- **Real** wherever a field or a cheap aggregation exists: all lists, kanban grouping/counts,
  pipeline value sums, statuses, owners, scores, dates, campaign metrics (cpl/roas/revenue are real fields).
- **Labeled placeholder** for invented/derived metrics with no backing field or expensive
  computation — NPS, lifetime LTV, cost-per-lead at lead level, "86% PID-linked", response-time
  averages. These keep the mockup's static value and carry a `title="demo placeholder"` attribute
  (and a subtle visual marker) so the screen is honest about what is live.
- **Action buttons** (Convert, Gửi duyệt, +Thêm, 📞/✉/💬, Nhập Excel, etc.) render **visible but
  `disabled`** with a tooltip "Chỉ đọc trong bản này" — faithful to the design, clearly read-only.

---

## 6. Demo seeder

`himedic_crm/seed.py::demo()`:
- **Idempotent:** tags demo records (e.g., a known naming prefix or a `notes` marker) and clears
  prior demo records before re-inserting, so re-running is safe. Inserts with `ignore_permissions=True`.
- **Volume:** ~15 leads across all stages/sources, ~8 deals across the pipeline, ~12 contacts +
  ~6 organizations, ~5 sample orders (+ tubes), 1–2 manifests, 3 campaigns (with real cpl/roas),
  a handful of tasks, and ensures the 2 existing test packages + some HM Lab Test rows exist.
- **Data style:** realistic Vietnamese names/addresses/regions echoing the mockup (Chị Hương Trần,
  Cty CP May Sao Mai, Q.7, FB Ads, …).
- **Run:** `bench execute himedic_crm.seed.demo`. Optional `demo(clear=True)` to wipe demo rows.

---

## 7. Cross-cutting concerns

- **Tailwind:** Play CDN (`cdn.tailwindcss.com`) with the mockup's inline `tailwind.config`
  (brand/accent palette, Inter font). **This is load-bearing** — the mockup builds class names
  dynamically (`bg-${color}-500`, `text-${c}-700`, `from-${from}-400`), which only the CDN's runtime
  JIT resolves. **Known one-way door:** moving to a compiled/local Tailwind build later would purge
  these dynamic classes unless every used color/shade is safelisted. Recorded here intentionally.
- **States:** every data screen implements (1) loading skeleton, (2) empty state ("Chưa có dữ liệu"),
  (3) inline error card on fetch failure.
- **Auth & permissions:** `/crm` requires login; guests redirect to `/login`. All `api/desk` methods
  are `@frappe.whitelist()` (login-only, not `allow_guest`) and rely on Frappe DocType permissions,
  so row-level/role visibility is enforced server-side. The RBAC medical fields on contact/profile
  are only returned when the caller has permission.
- **Routing/serving:** the `www/crm` page is auto-routed by Frappe at `/crm`; no `website_route_rules`
  entry needed (those exist for `/portal` and `/m`). The SPA uses hash routing internally.

---

## 8. API contract (read-only)

Each `api/desk/<module>.py` exposes `@frappe.whitelist()` functions returning JSON-serializable
dicts shaped for the screen. Conventions:
- List methods accept optional `filters`, `limit`, `start` and return
  `{ "rows": [...], "total": N, "summary": {...} }`.
- Kanban methods return `{ "columns": [{ "stage", "color", "count", "value", "cards": [...] }] }`.
- Detail methods accept `name` and return the shaped document + related rows.
- Aggregate/report methods return pre-computed numbers.
- No method mutates data. Money formatted client-side; raw numbers returned by the API.

---

## 9. Testing

Light, proportionate to a read-only build:
1. **Seeder:** `bench execute himedic_crm.seed.demo` runs clean and is idempotent (run twice, no dupes/errors).
2. **API shape:** a few Python tests in `himedic_crm/tests/` assert each `api/desk` method returns
   the documented keys and JSON-serializes.
3. **Smoke:** manually load each screen at `/crm` after seeding; verify it renders populated and
   navigates. (Optionally drive via the project's run/verify skill.)

---

## 10. Open risks

- **CDN dependency** at the browser (clients need internet to load Tailwind). Acceptable for an
  internal tool; flagged as the one-way door above.
- **Aggregate cost:** report/overview aggregations are computed on request. With demo-scale data
  this is trivial; if real data grows large, cache or precompute later (out of scope now).
