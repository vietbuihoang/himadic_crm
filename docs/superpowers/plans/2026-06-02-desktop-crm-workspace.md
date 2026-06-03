# Desktop CRM Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Hi-Medic desktop CRM workspace at `/crm` — a Jinja-shell + client-side JS port of `docs/CRM_HiMedic_UI_Mockup.html`, wired read-only to the existing `HM *` DocTypes, with a demo-data seeder so all 12 modules render populated.

**Architecture:** A Frappe `www/crm` page (login required) serves a standalone HTML shell that loads Tailwind Play CDN and a small JS app. `app.js` holds the module config, a hash router, the sidebar, and an `api()` fetch helper. One JS file per module renders that module's screens by `await api(...)` against thin read-only whitelisted methods in `himedic_crm/api/desk/<module>.py`. No writes; action buttons render disabled.

**Tech Stack:** Frappe Framework v15 (Python, www pages, `@frappe.whitelist`), Tailwind CSS (Play CDN), vanilla ES2017 JS (`fetch`, async/await), MariaDB via Frappe ORM.

---

## Conventions used throughout this plan

**Spec reference:** `docs/superpowers/specs/2026-06-02-desktop-crm-workspace-design.md`. The screen→DocType field map is spec §4.

**Mockup is the canonical HTML source.** Each module's screen markup already exists in
`docs/CRM_HiMedic_UI_Mockup.html` as `SCREENS.<module>` (line ranges given per task). "Porting" a
screen means: copy that screen's template-literal HTML into the module JS file, then apply the
**Porting Recipe** below.

**Porting Recipe (apply to every ported screen):**
1. Change the screen function to `async`: `list: async () => { ... }`.
2. Replace the screen's hardcoded data array (e.g. `LEADS`, `DEALS`) with a fetch:
   `const data = await api('lead', 'list'); const rows = data.rows;` then iterate `rows`.
3. Map each mockup field to the real field per the task's field-map table.
4. Wrap the body in try/catch; on throw `return errorCard(e)`. If `rows.length === 0`, `return emptyState()`.
5. Make every action `<button>` (Convert, +Thêm, Gửi duyệt, 📞/✉/💬, Nhập Excel, etc.) **disabled**:
   add `disabled title="Chỉ đọc trong bản này"` and `opacity-60 cursor-not-allowed` classes.
6. For any number/label with **no backing field** (NPS, LTV, cost-per-lead, forecast %, "86% PID"),
   keep the mockup's literal value and add `title="demo placeholder"` plus a trailing
   `<span class="text-[10px] text-slate-400">·demo</span>` marker.
7. Money is returned raw by the API; format with `money()` from `lib.js`. Dates with `dfmt()`.

**Commit style:** end every commit message with a blank line then
`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

**Run a screen smoke test:** after seeding (Task 2), open `http://himedic.local/crm` logged in,
click the module in the sidebar, confirm the screen renders populated with no console errors.

**Branch:** all work lands on `feat/desktop-crm-workspace` (already created).

---

## File Structure

```
himedic_crm/
  www/crm/index.html        # standalone HTML shell (sidebar, topbar, #mainContent)
  www/crm/index.py          # get_context: require login, expose user/csrf
  public/css/crm.css        # phone-frame, scroll-thin, pulse-dot, kanban-card, tab-active
  public/js/crm/app.js      # MODULES, router, sidebar, api(), screen dispatch, boot
  public/js/crm/lib.js      # tag, avatar, screenHeader, tabs, money, dfmt, skeleton, emptyState, errorCard, icon
  public/js/crm/overview.js # SCREENS.overview
  public/js/crm/lead.js deal.js contact.js sample.js logistics.js
  public/js/crm/catalog.js tasks.js comm.js marketing.js reports.js admin.js
  api/desk/__init__.py
  api/desk/lead.py deal.py contact.py sample.py logistics.py
  api/desk/catalog.py tasks.py comm.py marketing.py reports.py admin.py
  seed.py                   # demo() seeder
  tests/test_desk_api.py    # API shape tests
```

Static JS/CSS under `public/` is served at `/assets/himedic_crm/...`. The shell references the
JS as ES modules (`<script type="module" src="/assets/himedic_crm/js/crm/app.js">`). After adding
files run `bench build --app himedic_crm` once (or `bench --site himedic.local clear-cache`) so
assets are picked up; in dev, files under `public/` are served directly.

---

## Task 1: App shell, router, shared lib, overview screen

**Files:**
- Create: `himedic_crm/www/crm/index.py`
- Create: `himedic_crm/www/crm/index.html`
- Create: `himedic_crm/public/css/crm.css`
- Create: `himedic_crm/public/js/crm/lib.js`
- Create: `himedic_crm/public/js/crm/app.js`
- Create: `himedic_crm/public/js/crm/overview.js`

- [ ] **Step 1: Create the page context (login gate)**

`himedic_crm/www/crm/index.py`:
```python
# -*- coding: utf-8 -*-
import frappe


def get_context(context):
    if frappe.session.user == "Guest":
        frappe.local.flags.redirect_location = "/login?redirect-to=/crm"
        raise frappe.Redirect
    context.no_cache = 1
    context.user = frappe.session.user
    context.full_name = frappe.utils.get_fullname(frappe.session.user)
    context.csrf_token = frappe.sessions.get_csrf_token()
    return context
```

- [ ] **Step 2: Create the HTML shell**

`himedic_crm/www/crm/index.html` (standalone page; ports the mockup shell, mockup lines 1–97):
```html
{% raw %}<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hi-Medic CRM</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = { theme: { extend: {
    colors: {
      brand: {50:'#ecfeff',100:'#cffafe',200:'#a5f3fc',500:'#0891b2',600:'#0e7490',700:'#155e75',800:'#164e63',900:'#083344'},
      accent:{500:'#10b981',600:'#059669'} },
    fontFamily: { sans:['Inter','system-ui','sans-serif'] } } } }
</script>
<link rel="stylesheet" href="/assets/himedic_crm/css/crm.css">
</head>
<body class="text-slate-800" style="background:#f1f5f9">{% endraw %}
<script>window.__USER__ = "{{ user }}"; window.__FULLNAME__ = "{{ full_name }}"; window.csrf_token = "{{ csrf_token }}";</script>
{% raw %}<div class="flex h-screen overflow-hidden">
  <aside class="w-72 bg-brand-900 text-brand-100 flex flex-col flex-shrink-0">
    <div class="px-5 py-5 border-b border-brand-700/60">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-300 to-cyan-600 flex items-center justify-center text-brand-900 font-extrabold text-lg">H</div>
        <div><div class="font-bold text-white text-base leading-none">Hi-Medic CRM</div>
        <div class="text-xs text-brand-200 mt-1">Workspace</div></div>
      </div>
    </div>
    <nav id="navList" class="flex-1 overflow-y-auto scroll-thin py-3 px-3 space-y-1 text-sm"></nav>
  </aside>
  <main class="flex-1 flex flex-col overflow-hidden">
    <header class="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
      <div class="text-sm text-slate-500 flex items-center gap-2">
        <span>Hi-Medic CRM</span><span class="text-slate-300">/</span>
        <span id="moduleTitle" class="text-slate-800 font-medium">Tổng quan</span>
      </div>
      <div class="ml-auto flex items-center gap-3">
        <div id="userChip" class="flex items-center gap-2 pl-3 border-l border-slate-200"></div>
      </div>
    </header>
    <section id="mainContent" class="flex-1 overflow-y-auto scroll-thin" style="background:#f1f5f9"></section>
  </main>
</div>{% endraw %}
<script type="module" src="/assets/himedic_crm/js/crm/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create the CSS (mockup `<style>`, lines 21–36)**

`himedic_crm/public/css/crm.css`:
```css
body{font-family:Inter,system-ui,sans-serif}
.scroll-thin::-webkit-scrollbar{width:6px;height:6px}
.scroll-thin::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
.phone-frame{width:380px;height:760px;border-radius:42px;background:#0f172a;padding:14px;box-shadow:0 30px 60px -20px rgba(0,0,0,.35)}
.phone-screen{width:100%;height:100%;border-radius:30px;background:#f8fafc;overflow:hidden;position:relative;display:flex;flex-direction:column}
.kanban-card{transition:transform .15s ease, box-shadow .15s ease}
.kanban-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px -8px rgba(15,23,42,.18)}
.tab-active{background:white;color:#0e7490}
details>summary{list-style:none;cursor:pointer}
details>summary::-webkit-details-marker{display:none}
.pulse-dot{position:relative}
.pulse-dot::before{content:"";position:absolute;inset:0;border-radius:9999px;background:inherit;animation:pulse 1.6s ease-out infinite;opacity:.6}
@keyframes pulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.6);opacity:0}}
```

- [ ] **Step 4: Create shared helpers `lib.js`**

`himedic_crm/public/js/crm/lib.js` (ports mockup helpers lines 145–205, adds data-state helpers):
```javascript
export function icon(name){
  const I = {
    'layout-grid':'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    'user-plus':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
    'handshake':'<path d="m11 17 2 2a1 1 0 0 0 3 0c0-.5-.5-1-1-1l-2-2"/><path d="m14 14 2.5 2.5a1 1 0 0 0 3 0c0-.5-.5-1-1-1L17 14"/><path d="m17 11 2 2a1 1 0 0 0 3 0c0-.5-.5-1-1-1l-5-5-5 5"/><path d="m4 13 4-4 4 4-4 4z"/>',
    'users':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'test-tube':'<path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/>',
    'truck':'<rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    'flask':'<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/>',
    'check-square':'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    'message-square':'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    'megaphone':'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    'bar-chart':'<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    'settings':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  };
  return `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[name]||''}</svg>`;
}
export const tag = (txt,color='slate') => `<span class="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-${color}-100 text-${color}-700">${txt??''}</span>`;
export const avatar = (initials='?',from='emerald',to='emerald-600') => `<div class="w-7 h-7 rounded-full bg-gradient-to-br from-${from}-400 to-${to} text-white grid place-items-center text-[11px] font-semibold flex-shrink-0">${initials}</div>`;
export const initials = (name='') => (name.trim().split(/\s+/).slice(-1)[0]||'?')[0] + (name.trim()[0]||'');
export const money = (n) => (n==null?'—':Number(n).toLocaleString('vi-VN')+'đ');
export const dfmt = (d) => { if(!d) return '—'; const p=String(d).slice(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d; };
export const demoMark = `<span class="text-[10px] text-slate-400" title="demo placeholder">·demo</span>`;
export const disabledBtn = (label,cls='') => `<button disabled title="Chỉ đọc trong bản này" class="${cls} opacity-60 cursor-not-allowed">${label}</button>`;
export function screenHeader(title, subtitle, actionsHtml=''){
  return `<div class="px-6 pt-5 pb-3 bg-white border-b border-slate-200"><div class="flex items-start gap-4">
    <div><h2 class="text-lg font-semibold text-slate-800">${title}</h2>
    <p class="text-xs text-slate-500 mt-0.5">${subtitle}</p></div>
    <div class="ml-auto flex items-center gap-2">${actionsHtml}</div></div></div>`;
}
export function tabs(screens, current, moduleId){
  return `<div class="px-6 pt-3 bg-white border-b border-slate-200 flex gap-1 text-sm">
    ${screens.map(s=>`<button onclick="window.__select('${moduleId}','${s.id}')"
      class="px-4 py-2 border-b-2 ${s.id===current?'border-brand-600 text-brand-700 font-medium':'border-transparent text-slate-500 hover:text-slate-800'}">${s.name}</button>`).join('')}
  </div>`;
}
export const skeleton = () => `<div class="p-6 space-y-3 animate-pulse">${Array.from({length:6}).map(()=>`<div class="h-12 bg-white rounded-xl border border-slate-200"></div>`).join('')}</div>`;
export const emptyState = (msg='Chưa có dữ liệu') => `<div class="p-16 text-center text-slate-400"><div class="text-4xl mb-2">📭</div><div>${msg}</div></div>`;
export const errorCard = (e) => `<div class="p-6"><div class="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">Lỗi tải dữ liệu: ${e?.message||e}</div></div>`;
```

- [ ] **Step 5: Create the router + boot `app.js`**

`himedic_crm/public/js/crm/app.js`:
```javascript
import { icon, tabs, skeleton, errorCard } from './lib.js';
import * as overview from './overview.js';
import * as lead from './lead.js';
import * as deal from './deal.js';
import * as contact from './contact.js';
import * as sample from './sample.js';
import * as logistics from './logistics.js';
import * as catalog from './catalog.js';
import * as tasks from './tasks.js';
import * as comm from './comm.js';
import * as marketing from './marketing.js';
import * as reports from './reports.js';
import * as admin from './admin.js';

const SCREENS = { overview, lead, deal, contact, sample, logistics, catalog, tasks, comm, marketing, reports, admin };

export const MODULES = [
  { id:'overview', name:'Tổng quan', icon:'layout-grid', screens:[{id:'home',name:'Welcome'}] },
  { id:'lead', name:'1. Quản lý Khách tiềm năng', icon:'user-plus', screens:[{id:'list',name:'Danh sách khách'},{id:'kanban',name:'Luồng chuyển đổi'},{id:'detail',name:'Chi tiết khách'}] },
  { id:'deal', name:'2. Quản lý Cơ hội', icon:'handshake', screens:[{id:'kanban',name:'Luồng cơ hội'},{id:'detail',name:'Chi tiết cơ hội'}] },
  { id:'contact', name:'3. Khách hàng & Đơn vị', icon:'users', screens:[{id:'list',name:'Danh sách liên hệ'},{id:'profile',name:'Hồ sơ 360°'}] },
  { id:'sample', name:'4. Lấy mẫu', icon:'test-tube', screens:[{id:'list',name:'Đơn lấy mẫu'}] },
  { id:'logistics', name:'5. Vận chuyển mẫu', icon:'truck', screens:[{id:'manifest',name:'Phiếu giao & Theo dõi'},{id:'reception',name:'Tiếp nhận tại Lab'}] },
  { id:'catalog', name:'6. Danh mục Xét nghiệm', icon:'flask', screens:[{id:'tests',name:'Danh mục test'},{id:'package',name:'Gói combo'}] },
  { id:'tasks', name:'7. Công việc & Lịch', icon:'check-square', screens:[{id:'calendar',name:'Lịch'},{id:'board',name:'Bảng công việc'}] },
  { id:'comm', name:'8. Giao tiếp đa kênh', icon:'message-square', screens:[{id:'inbox',name:'Hộp thư hợp nhất'},{id:'portal',name:'Cổng khách hàng'}] },
  { id:'marketing', name:'9. Tiếp thị & Phân khách', icon:'megaphone', screens:[{id:'campaigns',name:'Hiệu quả chiến dịch'},{id:'routing',name:'Quy tắc phân khách'}] },
  { id:'reports', name:'10. Báo cáo & Phân tích', icon:'bar-chart', screens:[{id:'sales',name:'Bảng KD'},{id:'ops',name:'Bảng vận hành'}] },
  { id:'admin', name:'12. Admin & Settings', icon:'settings', screens:[{id:'users',name:'Người dùng & Quyền'},{id:'workflow',name:'Trình tạo quy trình'}] },
];

export async function api(module, method, params={}){
  const qs = new URLSearchParams(params).toString();
  const url = `/api/method/himedic_crm.api.desk.${module}.${method}` + (qs?`?${qs}`:'');
  const res = await fetch(url, { headers:{ 'Accept':'application/json', 'X-Frappe-CSRF-Token': window.csrf_token||'' }, credentials:'same-origin' });
  if(!res.ok) throw new Error('HTTP '+res.status);
  const data = await res.json();
  return data.message;
}
window.__api = api; // module files import api directly; this is a convenience for inline handlers

function buildSidebar(){
  const nav = document.getElementById('navList');
  nav.innerHTML = '';
  MODULES.forEach(m=>{
    const b = document.createElement('button');
    b.className = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-brand-800 text-left transition';
    b.innerHTML = `<span class="text-brand-200">${icon(m.icon)}</span><span>${m.name}</span>`;
    b.dataset.module = m.id;
    b.onclick = ()=> select(m.id, m.screens[0].id);
    nav.appendChild(b);
  });
  document.getElementById('userChip').innerHTML =
    `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white grid place-items-center text-sm font-semibold">${(window.__FULLNAME__||'U')[0]}</div>
     <div class="text-xs leading-tight"><div class="font-medium">${window.__FULLNAME__||'User'}</div><div class="text-slate-500">${window.__USER__||''}</div></div>`;
}

export async function select(moduleId, screenId){
  const mod = MODULES.find(m=>m.id===moduleId); if(!mod) return;
  if(!mod.screens.find(s=>s.id===screenId)) screenId = mod.screens[0].id;
  location.hash = `${moduleId}/${screenId}`;
  document.querySelectorAll('#navList button').forEach(b=>{
    const on = b.dataset.module===moduleId;
    b.classList.toggle('bg-brand-700', on); b.classList.toggle('text-white', on);
  });
  document.getElementById('moduleTitle').textContent = mod.name;
  const main = document.getElementById('mainContent');
  let head = mod.screens.length>1 ? tabs(mod.screens, screenId, moduleId) : '';
  main.innerHTML = head + skeleton();
  const fn = SCREENS[moduleId] && SCREENS[moduleId][screenId];
  try {
    const body = fn ? await fn() : `<div class="p-10 text-slate-400">Màn hình đang được phác thảo…</div>`;
    main.innerHTML = head + body;
  } catch(e){ main.innerHTML = head + errorCard(e); }
  main.scrollTop = 0;
}
window.__select = select;

function fromHash(){
  const [m,s] = (location.hash.replace(/^#/,'').split('/'));
  return m ? [m, s] : ['overview','home'];
}
window.addEventListener('hashchange', ()=>{ const [m,s]=fromHash(); select(m,s); });
buildSidebar();
{ const [m,s]=fromHash(); select(m,s); }
```

- [ ] **Step 6: Create `overview.js` (mockup lines 210–234)**

`himedic_crm/public/js/crm/overview.js`:
```javascript
import { icon } from './lib.js';
import { MODULES } from './app.js';
export const home = async () => `
  <div class="p-10 max-w-5xl mx-auto">
    <div class="rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-500 text-white p-10 shadow-xl">
      <h1 class="text-3xl font-extrabold">Hi-Medic CRM</h1>
      <p class="mt-3 text-cyan-50 max-w-2xl">Workspace nội bộ — 12 module quản lý khách tiềm năng, cơ hội, lấy mẫu, vận chuyển và báo cáo.</p>
    </div>
    <h3 class="mt-10 mb-4 font-semibold text-slate-700 text-sm uppercase tracking-wide">Module</h3>
    <div class="grid grid-cols-3 gap-4">
      ${MODULES.filter(m=>m.id!=='overview').map(m=>`
        <button onclick="window.__select('${m.id}','${m.screens[0].id}')" class="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-500 hover:shadow-md transition">
          <div class="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 grid place-items-center mb-3">${icon(m.icon)}</div>
          <div class="font-semibold text-slate-800 text-sm">${m.name}</div>
          <div class="text-xs text-slate-500 mt-1">${m.screens.length} màn hình</div>
        </button>`).join('')}
    </div>
  </div>`;
```

- [ ] **Step 7: Create empty placeholder module files so `app.js` imports resolve**

For each of `lead, deal, contact, sample, logistics, catalog, tasks, comm, marketing, reports, admin`,
create `himedic_crm/public/js/crm/<module>.js` with a temporary stub for every screen id (filled in later tasks).
Example `lead.js` stub (repeat the pattern with the correct screen ids per module from `MODULES`):
```javascript
export const list = async () => `<div class="p-10 text-slate-400">lead/list — sắp có</div>`;
export const kanban = async () => `<div class="p-10 text-slate-400">lead/kanban — sắp có</div>`;
export const detail = async () => `<div class="p-10 text-slate-400">lead/detail — sắp có</div>`;
```
Screen ids per module: deal→`kanban,detail`; contact→`list,profile`; sample→`list`; logistics→`manifest,reception`;
catalog→`tests,package`; tasks→`calendar,board`; comm→`inbox,portal`; marketing→`campaigns,routing`;
reports→`sales,ops`; admin→`users,workflow`.

- [ ] **Step 8: Verify the shell loads**

Run: `cd /home/hoangvietyeuem/frappe-bench && bench --site himedic.local clear-cache`
Then open `http://himedic.local/crm` while logged in.
Expected: sidebar lists 12 modules; Overview renders with module cards; clicking a module shows its stub; no console errors; URL hash updates (e.g. `#lead/list`).

- [ ] **Step 9: Commit**

```bash
git add himedic_crm/www/crm himedic_crm/public/css/crm.css himedic_crm/public/js/crm
git commit -m "feat(crm): /crm shell, router, shared lib, overview + module stubs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Demo-data seeder

**Files:**
- Create: `himedic_crm/seed.py`
- Test: `himedic_crm/tests/test_seed.py`

Verified facts used below: Lead sources exist (`FB Ads, Google Ads, Zalo OA, Hotline, Walk-in, Referral, Landing Page, KOL/PR`);
Lead stages (`Mới, Đã liên hệ, Đủ điều kiện, Chăm sóc, Đã chuyển đổi, Đã hủy`); Deal stages (`Thẩm định, Báo giá, Đàm phán, Đã chốt, Thất bại`);
`HM CRM Region` and `HM Team` are EMPTY (seeder creates them); 5 `HM Lab Test`, 2 `HM Test Package` exist;
SO status options include `Đã phân công, Đã lấy mẫu, Đang vận chuyển, Đã nhập Lab, Hoàn tất`;
Manifest status options include `Đang đóng gói, Đang vận chuyển, Đã đến Lab, Đã đối soát`;
Lead `customer_type` options `Cá nhân, Phòng khám, Bệnh viện, Doanh nghiệp, Bảo hiểm`; Campaign `channel` options `FB, Google, Zalo, Landing, SEO, Email, Offline`.

- [ ] **Step 1: Write the seeder**

`himedic_crm/seed.py`:
```python
# -*- coding: utf-8 -*-
"""Idempotent demo data for the desktop CRM workspace.
Run:  bench --site himedic.local execute himedic_crm.seed.demo
Wipe: bench --site himedic.local execute himedic_crm.seed.demo --kwargs "{'clear': True}"
"""
import frappe

REGIONS = ["Q.7", "Q.10", "Q.12", "Bình Tân", "Bình Thạnh"]
TEAMS = ["Đội Q.7", "Đội Bình Tân"]
LEAD_NAMES = [
    ("Chị Hương Trần", "0908123456", "Cá nhân", "FB Ads", 82, "Mới", "Q.7"),
    ("PK Đa khoa Hoàng Anh", "02838951122", "Phòng khám", "Google Ads", 74, "Đã liên hệ", "Bình Tân"),
    ("Anh Phạm Quốc Hùng", "0913778901", "Doanh nghiệp", "Zalo OA", 91, "Đủ điều kiện", "Q.7"),
    ("BV Đa khoa Tâm Phúc", "02866778899", "Bệnh viện", "Walk-in", 68, "Chăm sóc", "Q.10"),
    ("Chị Lưu Diệu Linh", "0987555333", "Cá nhân", "Hotline", 55, "Mới", "Bình Thạnh"),
    ("Cty CP May Sao Mai", "02839440011", "Doanh nghiệp", "Referral", 78, "Đủ điều kiện", "Q.12"),
]
ORG_NAMES = [
    ("Cty CP May Sao Mai", "0312345678", "Q.12", 1),
    ("PK Đa khoa Hoàng Anh", "0398765432", "Bình Tân", 0),
    ("BV Đa khoa Tâm Phúc", "0301122334", "Q.10", 0),
    ("Cty TNHH Hùng Phát", "0309988776", "Q.7", 1),
]
CONTACT_NAMES = [
    ("Chị Hương Trần", "0908123456", "Cá nhân", "Q.7", "Nữ", 0),
    ("Anh Phạm Quốc Hùng", "0913778901", "Cá nhân", "Q.7", "Nam", 1),
    ("Chị Lưu Diệu Linh", "0987555333", "Cá nhân", "Bình Thạnh", "Nữ", 0),
    ("Nguyễn Văn Đại", "0901112223", "Doanh nghiệp", "Q.12", "Nam", 0),
]
DEALS = [
    ("Gói khám tổng quát Premium x2", "Báo giá", 60, 8400000, "Q.7"),
    ("HĐ khám SK định kỳ 250 NLĐ", "Đàm phán", 75, 425000000, "Q.12"),
    ("Gói tầm soát ung thư nữ", "Thẩm định", 40, 4200000, "Bình Thạnh"),
    ("HĐ khung 12 tháng", "Báo giá", 55, 180000000, "Bình Tân"),
    ("Gói tiền hôn nhân x1", "Đàm phán", 80, 3800000, "Q.7"),
]
CAMPAIGNS = [
    ("DEMO-FB-T05", "Gói khám tổng quát T05", "FB", 30000000, 18500000, 142, 23, 196000000),
    ("DEMO-GG-Q2", "B2B Khám SK Q2", "Google", 50000000, 41000000, 88, 12, 605000000),
    ("DEMO-ZL-VSIP", "KCN VSIP T04", "Zalo", 12000000, 9200000, 64, 9, 178000000),
]
TASK_SUBJECTS = [
    ("Gọi chốt báo giá Sao Mai", "Cuộc gọi", "Đàm phán"),
    ("Khảo sát mặt bằng nhà máy", "Công việc", "Mới"),
    ("Gửi kết quả XN cho khách VIP", "Công việc", "Mới"),
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

    for r in REGIONS:
        _ensure("HM CRM Region", {"region_name": r}, {"region_name": r})
    for t in TEAMS:
        _ensure("HM Team", {"team_name": t}, {"team_name": t})

    for name, phone, ctype, region, gender, vip in CONTACT_NAMES:
        frappe.get_doc({"doctype": "HM Contact", "full_name": name, "phone": phone,
            "customer_type": ctype, "region": region, "gender": gender, "vip": vip}).insert(ignore_permissions=True)
    for name, tax, region, isb2b in ORG_NAMES:
        frappe.get_doc({"doctype": "HM Organization", "organization_name": name, "tax_id": tax,
            "region": region, "is_b2b": isb2b}).insert(ignore_permissions=True)
    for name, phone, ctype, source, score, stage, region in LEAD_NAMES:
        frappe.get_doc({"doctype": "HM Lead", "lead_name": name, "phone": phone, "customer_type": ctype,
            "source": source, "score": score, "status": stage, "region": region}).insert(ignore_permissions=True)
    for title, stage, prob, total, region in DEALS:
        frappe.get_doc({"doctype": "HM Deal", "deal_title": title, "status": stage, "probability": prob,
            "grand_total": total, "subtotal": total, "region": region,
            "expected_close_date": frappe.utils.add_days(frappe.utils.nowdate(), 10)}).insert(ignore_permissions=True)
    for code, cname, channel, budget, spent, leads, won, revenue in CAMPAIGNS:
        cpl = round(budget / leads) if leads else 0
        roas = round(revenue / spent, 2) if spent else 0
        frappe.get_doc({"doctype": "HM Campaign", "campaign_code": code, "campaign_name": cname,
            "channel": channel, "budget": budget, "spent": spent, "leads_count": leads,
            "won_count": won, "revenue": revenue, "cpl": cpl, "roas": roas, "status": "Active"}).insert(ignore_permissions=True)
    contact0 = frappe.db.get_value("HM Contact", {"full_name": CONTACT_NAMES[0][0]}, "name")
    for i, status in enumerate(["Đã phân công", "Đã lấy mẫu", "Đang vận chuyển"]):
        frappe.get_doc({"doctype": "HM Sample Order", "contact": contact0,
            "appointment_date": frappe.utils.add_days(frappe.utils.nowdate(), i),
            "appointment_time": "08:30:00", "address": f"123 Nguyễn Thị Thập, Q.7 [DEMO]",
            "region": "Q.7", "status": status, "total_tubes": 3}).insert(ignore_permissions=True)
    frappe.get_doc({"doctype": "HM Sample Manifest", "manifest_date": frappe.utils.nowdate(),
        "seal_no": "DEMO-0001", "shipper": "Shipper A", "from_region": "Q.7",
        "status": "Đang vận chuyển", "total_items": 6}).insert(ignore_permissions=True)
    for subj, ttype, _stage in TASK_SUBJECTS:
        frappe.get_doc({"doctype": "HM Task", "subject": subj, "task_type": ttype, "status": "Mở",
            "due_date": frappe.utils.add_days(frappe.utils.nowdate(), 2)}).insert(ignore_permissions=True)

    frappe.db.commit()
    counts = {dt: frappe.db.count(dt) for dt in
              ["HM Lead", "HM Deal", "HM Contact", "HM Organization", "HM Sample Order", "HM Campaign", "HM Task"]}
    return {"seeded": True, "counts": counts}
```

> **NOTE for implementer:** the `status`/`task_type`/`gender` select values above are best-effort
> from the inspected options. Before finalizing, run
> `bench --site himedic.local execute himedic_crm.seed.demo` and fix any Frappe validation error by
> checking the offending field's options with
> `frappe.get_meta("<DocType>").get_field("<field>").options`. Adjust the literal and re-run. The
> seeder is idempotent, so re-running is safe.

- [ ] **Step 2: Write the test**

`himedic_crm/tests/test_seed.py`:
```python
import frappe
from himedic_crm.seed import demo


def test_demo_seeds_and_is_idempotent():
    demo()
    first = frappe.db.count("HM Lead")
    assert first >= 5
    demo()  # run again — must not duplicate
    second = frappe.db.count("HM Lead")
    assert second == first
```

- [ ] **Step 3: Run the seeder, fix any option mismatches**

Run: `cd /home/hoangvietyeuem/frappe-bench && bench --site himedic.local execute himedic_crm.seed.demo`
Expected: prints `{'seeded': True, 'counts': {...}}` with non-zero counts. If a `ValidationError` for a
Select/Link field appears, correct that literal per the NOTE above and re-run.

- [ ] **Step 4: Run the test**

Run: `bench --site himedic.local run-tests --module himedic_crm.tests.test_seed`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add himedic_crm/seed.py himedic_crm/tests/test_seed.py
git commit -m "feat(crm): idempotent demo-data seeder

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Lead module (API + screens) — the exemplar

**Files:**
- Create: `himedic_crm/api/desk/__init__.py` (empty)
- Create: `himedic_crm/api/desk/lead.py`
- Modify: `himedic_crm/public/js/crm/lead.js` (replace stub)
- Test: `himedic_crm/tests/test_desk_api.py`

**Mockup source:** `SCREENS.lead`, lines 251–471 (list 252–313, kanban 315–358, detail 360–470).

**Field map (mockup → real):** `name→lead_name`, `phone→phone`, `org→organization_name` (fallback `customer_type`),
`source→source`, `score→score`, `stage→status`, `owner→owner_user`, `area→region`, `campaign→campaign`,
`last→modified` (via `dfmt`).

- [ ] **Step 1: Write the API**

`himedic_crm/api/desk/lead.py`:
```python
# -*- coding: utf-8 -*-
import frappe

LIST_FIELDS = ["name", "lead_name", "phone", "organization_name", "customer_type",
               "source", "score", "status", "owner_user", "region", "campaign", "modified"]


@frappe.whitelist()
def list(limit=50, start=0):
    rows = frappe.get_list("HM Lead", fields=LIST_FIELDS, limit_page_length=int(limit),
                           limit_start=int(start), order_by="modified desc")
    total = frappe.db.count("HM Lead")
    return {"rows": rows, "total": total,
            "summary": {"total": total, "new_today": frappe.db.count(
                "HM Lead", {"creation": [">=", frappe.utils.nowdate()]})}}


@frappe.whitelist()
def kanban():
    stages = frappe.get_all("HM Lead Stage", fields=["name"], order_by="idx asc") or \
             [{"name": s} for s in ["Mới", "Đã liên hệ", "Đủ điều kiện", "Chăm sóc", "Đã chuyển đổi", "Đã hủy"]]
    colors = {"Mới": "sky", "Đã liên hệ": "amber", "Đủ điều kiện": "emerald",
              "Chăm sóc": "violet", "Đã chuyển đổi": "cyan", "Đã hủy": "rose"}
    columns = []
    for s in stages:
        st = s["name"]
        cards = frappe.get_list("HM Lead", filters={"status": st},
                                fields=LIST_FIELDS, limit_page_length=20, order_by="modified desc")
        columns.append({"stage": st, "color": colors.get(st, "slate"),
                        "count": frappe.db.count("HM Lead", {"status": st}), "cards": cards})
    return {"columns": columns}


@frappe.whitelist()
def detail(name):
    doc = frappe.get_doc("HM Lead", name)
    doc.check_permission("read")
    d = doc.as_dict()
    d["activities"] = [a.as_dict() for a in (doc.get("activities") or [])]
    return d
```

- [ ] **Step 2: Write the API shape test**

`himedic_crm/tests/test_desk_api.py`:
```python
import frappe
from himedic_crm.seed import demo
from himedic_crm.api.desk import lead


def setup_module(module):
    demo()


def test_lead_list_shape():
    out = lead.list()
    assert set(["rows", "total", "summary"]).issubset(out.keys())
    assert isinstance(out["rows"], _list_type())
    if out["rows"]:
        assert "lead_name" in out["rows"][0]


def test_lead_kanban_shape():
    out = lead.kanban()
    assert "columns" in out and isinstance(out["columns"], _list_type())
    assert all({"stage", "color", "count", "cards"}.issubset(c.keys()) for c in out["columns"])


def _list_type():
    return type([])
```
(`list` is shadowed by the imported module method name in Python; `_list_type()` avoids the clash.)

- [ ] **Step 3: Run the test to verify it fails**

Run: `bench --site himedic.local run-tests --module himedic_crm.tests.test_desk_api`
Expected: FAIL (e.g. `ModuleNotFoundError` / `AttributeError`) until `lead.py` exists with these methods.
If you wrote Step 1 first, instead expect PASS — that's fine; the point is the assertions hold.

- [ ] **Step 4: Port the three lead screens into `lead.js`**

Replace `himedic_crm/public/js/crm/lead.js` stub with the ported screens. Start each file with:
```javascript
import { api } from './app.js';
import { tag, avatar, initials, dfmt, screenHeader, emptyState, errorCard, disabledBtn, demoMark } from './lib.js';

const STAGE_COLOR = {'Mới':'sky','Đã liên hệ':'amber','Đủ điều kiện':'emerald','Chăm sóc':'violet','Đã chuyển đổi':'cyan','Đã hủy':'rose'};
const scoreColor = s => s>=80?'emerald':s>=60?'amber':'rose';
const sourceColor = s => ({'FB Ads':'blue','Google Ads':'amber','Zalo OA':'sky','Hotline':'rose','Walk-in':'violet'}[s]||'slate');
```
Then implement:
- `export const list = async () => { ... }` — port mockup 252–313. Fetch `const {rows,summary}=await api('lead','list')`.
  Header subtitle uses `summary.total`/`summary.new_today` (real) plus the SLA phrase as `${demoMark}` (placeholder).
  Replace `LEADS.map((l,i)=>...)` with `rows.map(l=>...)`, mapping fields per the field map; `tag(l.status, STAGE_COLOR[l.status])`,
  score bar `width:${l.score}%`, owner `avatar(initials(l.owner_user))`, updated `dfmt(l.modified)`.
  The "Nhập từ Excel"/"+ Thêm khách" buttons → `disabledBtn('Nhập từ Excel','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg')` etc.
  If `!rows.length` return `emptyState()`. Wrap in try/catch → `errorCard(e)`.
- `export const kanban = async () => { ... }` — port mockup 315–358. Fetch `const {columns}=await api('lead','kanban')`.
  Replace the hardcoded `cols` with `columns`; each column header shows `c.stage`, dot `bg-${c.color}-500`, count `c.count`;
  cards iterate `c.cards` mapping fields as above. Card click stays `onclick="window.__select('lead','detail')"`.
- `export const detail = async () => { ... }` — port mockup 360–470. Detail needs a record; for this read-only
  pass, fetch the most recent lead: `const {rows}=await api('lead','list',{limit:1}); const d = rows[0] ? await api('lead','detail',{name:rows[0].name}) : null;`
  If `!d` return `emptyState('Chưa có khách tiềm năng')`. Bind the right-rail fields from `d`
  (`d.lead_name`, `d.phone`, `d.email`, `d.region`, `d.score`, `d.source`, `d.campaign`).
  The activity timeline iterates `d.activities` if present, else show `emptyState`-style inline note.
  Cost/lead, "phản hồi 30 phút" banner → keep literal + `demoMark`. All action buttons → `disabledBtn(...)`.

- [ ] **Step 5: Run the API tests to verify they pass**

Run: `bench --site himedic.local run-tests --module himedic_crm.tests.test_desk_api`
Expected: PASS.

- [ ] **Step 6: Smoke-test the screens**

`bench --site himedic.local clear-cache`, open `/crm` → module 1. Confirm list (table populated), kanban
(columns with cards), detail (right rail filled) all render with no console errors.

- [ ] **Step 7: Commit**

```bash
git add himedic_crm/api/desk/__init__.py himedic_crm/api/desk/lead.py himedic_crm/public/js/crm/lead.js himedic_crm/tests/test_desk_api.py
git commit -m "feat(crm): lead module — list, kanban, detail wired read-only

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Tasks 4–13: Remaining modules (same pattern)

Each task below follows the **identical structure as Task 3**: (1) write `api/desk/<module>.py` with the
exact methods given; (2) add the method's assertions to `tests/test_desk_api.py` and run them; (3) port
the mockup screens into `<module>.js` applying the **Porting Recipe** and the field map; (4) smoke-test;
(5) commit. Apply the Porting Recipe's disabled-button and demo-placeholder rules everywhere.

### Task 4: Deal module
**Mockup:** `SCREENS.deal` lines 486–617 (kanban 487–533, detail 536–616). **Screens:** `kanban, detail`.
**Field map:** `name→deal_title`, `org→organization`(fallback `contact`), `val→grand_total`(use `money()`),
`prob→probability`, `stage→status`, `owner→owner_user`, `due→expected_close_date`(`dfmt`), `mode→deal_type`.
**API `himedic_crm/api/desk/deal.py`:**
```python
# -*- coding: utf-8 -*-
import frappe
LIST_FIELDS = ["name","deal_title","contact","organization","grand_total","probability",
               "status","owner_user","expected_close_date","deal_type","region"]

@frappe.whitelist()
def kanban():
    stages = frappe.get_all("HM Deal Stage", fields=["name"], order_by="idx asc") or \
             [{"name": s} for s in ["Thẩm định","Báo giá","Đàm phán","Đã chốt","Thất bại"]]
    colors = {"Thẩm định":"sky","Báo giá":"amber","Đàm phán":"violet","Đã chốt":"emerald","Thất bại":"rose"}
    columns = []
    for s in stages:
        st = s["name"]
        cards = frappe.get_list("HM Deal", filters={"status": st}, fields=LIST_FIELDS,
                                limit_page_length=20, order_by="modified desc")
        val = sum((c.get("grand_total") or 0) for c in cards)
        columns.append({"stage": st, "color": colors.get(st,"slate"),
                        "count": frappe.db.count("HM Deal", {"status": st}), "value": val, "cards": cards})
    total_open = frappe.db.count("HM Deal", {"status": ["not in", ["Đã chốt","Thất bại"]]})
    return {"columns": columns, "summary": {"open": total_open}}

@frappe.whitelist()
def detail(name=None):
    if not name:
        name = frappe.db.get_value("HM Deal", {}, "name", order_by="modified desc")
    if not name:
        return None
    doc = frappe.get_doc("HM Deal", name); doc.check_permission("read")
    d = doc.as_dict(); d["items"] = [i.as_dict() for i in (doc.get("items") or [])]
    return d
```
**JS notes:** kanban column header shows `c.count · ${money(c.value)}`; the 5 KPI tiles above the board
(`Tổng giá trị luồng`, `Tỷ lệ chốt 32%`, …) — `open` count is real, the rest keep literals + `demoMark`.
detail: `await api('deal','detail')`; items table from `d.items` (`item_name/qty/rate/amount` — confirm child
field names via `frappe.get_meta("HM Deal Item").fields`); discount-approval row read-only; buttons disabled.

### Task 5: Contact module
**Mockup:** `SCREENS.contact` lines 622–715 (list 623–655, profile 657–715). **Screens:** `list, profile`.
**Field map:** `name→full_name`, `type→customer_type`, `phone→phone`/`email`, `pid→pid`, `owner→owner_user`,
LTV/last-visit → placeholders (`demoMark`).
**API `himedic_crm/api/desk/contact.py`:**
```python
# -*- coding: utf-8 -*-
import frappe
LIST_FIELDS = ["name","full_name","customer_type","phone","email","pid","owner_user","vip","region"]

@frappe.whitelist()
def list(limit=50, start=0):
    rows = frappe.get_list("HM Contact", fields=LIST_FIELDS, limit_page_length=int(limit),
                           limit_start=int(start), order_by="modified desc")
    return {"rows": rows, "total": frappe.db.count("HM Contact"),
            "by_type": {t: frappe.db.count("HM Contact", {"customer_type": t})
                        for t in ["Cá nhân","Phòng khám","Bệnh viện","Doanh nghiệp","Bảo hiểm"]}}

@frappe.whitelist()
def profile(name=None):
    if not name:
        name = frappe.db.get_value("HM Contact", {}, "name", order_by="modified desc")
    if not name:
        return None
    doc = frappe.get_doc("HM Contact", name); doc.check_permission("read")
    d = doc.as_dict()
    d["deals"] = frappe.get_list("HM Deal", filters={"contact": name},
                                 fields=["name","deal_title","grand_total","status","modified"], limit_page_length=10)
    d["results"] = frappe.get_list("HM Test Result", filters={"contact": name},
                                   fields=["name","result_date","released_at"], limit_page_length=10)
    return d
```
**JS notes:** list filter chips use `by_type` counts (real); medical/RBAC tiles (NPS, LTV) keep literals + `demoMark`;
profile timeline iterates `d.deals` + `d.results`. The medical section renders only fields present in `d`
(server already omits them if no permission).

### Task 6: Sample module
**Mockup:** `SCREENS.sample` lines 718–765 — **use the `list` screen only** (the `mobile` screen is out of scope).
**Screens:** `list`. **Field map:** `contact→contact`, `appointment→appointment_date`+`appointment_time`,
`address→address`, `area→region`, `status→status`, `assignee→assigned_to`, `tubes→total_tubes`.
**API `himedic_crm/api/desk/sample.py`:**
```python
# -*- coding: utf-8 -*-
import frappe
SO_STATUS_COLOR = {"Đã phân công":"sky","Đã xác nhận":"amber","Đang lấy mẫu":"violet",
                   "Đã lấy mẫu":"cyan","Đang vận chuyển":"blue","Đã nhập Lab":"emerald",
                   "Hoàn tất":"emerald","Hủy bởi khách":"rose","Lỗi mẫu":"rose"}

@frappe.whitelist()
def list(limit=50, start=0):
    rows = frappe.get_list("HM Sample Order",
        fields=["name","contact","appointment_date","appointment_time","address","region",
                "status","assigned_to","total_tubes"],
        limit_page_length=int(limit), limit_start=int(start), order_by="appointment_date desc")
    return {"rows": rows, "total": frappe.db.count("HM Sample Order"),
            "status_color": SO_STATUS_COLOR}
```
**JS notes:** if the `list` screen is part of a `sample` module mockup that mixes desktop+mobile, port only the
desktop list table portion; render status via `status_color[row.status]`.

### Task 7: Logistics module
**Mockup:** `SCREENS.logistics` lines 768–896 (manifest 769–~835, reception ~836–896). **Screens:** `manifest, reception`.
**Field map (manifest):** `date→manifest_date`, `shipper→shipper`, `status→status`, `from→from_region`,
`to→to_lab`, `items→total_items`, `temp→temperature_breached`.
**API `himedic_crm/api/desk/logistics.py`:**
```python
# -*- coding: utf-8 -*-
import frappe
M_STATUS_COLOR = {"Đang đóng gói":"amber","Đã giao shipper":"sky","Đang vận chuyển":"blue",
                  "Đã đến Lab":"violet","Đã đối soát":"emerald","Đã đóng":"slate"}

@frappe.whitelist()
def manifest(limit=50):
    rows = frappe.get_list("HM Sample Manifest",
        fields=["name","manifest_date","shipper","status","from_region","to_lab",
                "total_items","rejected_items","temperature_breached"],
        limit_page_length=int(limit), order_by="manifest_date desc")
    return {"rows": rows, "status_color": M_STATUS_COLOR}

@frappe.whitelist()
def reception():
    rows = frappe.get_list("HM Sample Manifest",
        filters={"status": ["in", ["Đã đến Lab","Đã đối soát"]]},
        fields=["name","manifest_date","shipper","status","total_items","rejected_items","lab_received_at"],
        limit_page_length=50, order_by="manifest_date desc")
    return {"rows": rows}
```
**JS notes:** tracking timeline derives the 4 steps (Đã lấy→Đang chuyển→Đến Lab→Đã nhập) from `row.status`
ordering; reception screen barcode-scan input rendered disabled.

### Task 8: Catalog module
**Mockup:** `SCREENS.catalog` lines 899–993 (tests 900–~950, package ~951–993). **Screens:** `tests, package`.
**Field map (tests):** `code→test_code`, `name→test_name_vi`(+`test_name_en`), `group→test_group`,
`sample→sample_type`, `tat→tat_hours`, `price→retail_price`/`b2b_price` (`money()`).
**API `himedic_crm/api/desk/catalog.py`:**
```python
# -*- coding: utf-8 -*-
import frappe

@frappe.whitelist()
def tests(limit=200):
    rows = frappe.get_list("HM Lab Test",
        fields=["name","test_code","test_name_vi","test_name_en","test_group","sample_type",
                "tat_hours","retail_price","b2b_price","is_active"],
        limit_page_length=int(limit), order_by="test_group asc")
    return {"rows": rows, "total": frappe.db.count("HM Lab Test")}

@frappe.whitelist()
def package(limit=100):
    rows = frappe.get_list("HM Test Package",
        fields=["name","package_code","package_name","category","retail_price","b2b_price","is_active"],
        limit_page_length=int(limit), order_by="package_name asc")
    out = []
    for r in rows:
        doc = frappe.get_doc("HM Test Package", r["name"])
        r["item_count"] = len(doc.get("items") or [])
        out.append(r)
    return {"rows": out, "total": len(out)}
```
**JS notes:** group tests by `test_group` for section headers; package cards show `item_count` + prices.

### Task 9: Tasks module
**Mockup:** `SCREENS.tasks` lines 996–1068 (calendar 997–~1035, board ~1036–1068). **Screens:** `calendar, board`.
**Field map:** `subject→subject`, `due→due_date`, `type→task_type`, `status→status`, `assignee→assigned_to`.
**API `himedic_crm/api/desk/tasks.py`:**
```python
# -*- coding: utf-8 -*-
import frappe

@frappe.whitelist()
def list(limit=200):
    rows = frappe.get_list("HM Task",
        fields=["name","subject","task_type","priority","assigned_to","due_date","status"],
        limit_page_length=int(limit), order_by="due_date asc")
    return {"rows": rows}

@frappe.whitelist()
def board():
    statuses = (frappe.get_meta("HM Task").get_field("status").options or "").split("\n")
    statuses = [s for s in statuses if s]
    cols = [{"status": s,
             "cards": frappe.get_list("HM Task", filters={"status": s},
                      fields=["name","subject","task_type","due_date","assigned_to"], limit_page_length=30)}
            for s in statuses]
    return {"columns": cols}
```
**JS notes:** calendar renders a simple week grid client-side, placing `list().rows` by `due_date`; board
groups by `board().columns`.

### Task 10: Communication module
**Mockup:** `SCREENS.comm` lines 1071–1163 (inbox 1072–~1130, portal ~1131–1163). **Screens:** `inbox, portal`.
**API `himedic_crm/api/desk/comm.py`:**
```python
# -*- coding: utf-8 -*-
import frappe

@frappe.whitelist()
def inbox(limit=40):
    calls = frappe.get_list("HM VoIP Call Log",
        fields=["name","phone","direction","creation"], limit_page_length=int(limit), order_by="creation desc")
    zalo = frappe.get_list("HM Zalo Message",
        fields=["name","creation"], limit_page_length=int(limit), order_by="creation desc")
    feed = ([{"kind": "call", **c} for c in calls] + [{"kind": "zalo", **z} for z in zalo])
    feed.sort(key=lambda x: str(x.get("creation")), reverse=True)
    return {"feed": feed[:int(limit)]}
```
**JS notes:** `inbox` renders the merged `feed` (icon by `kind`); `portal` screen is a **static preview** of the
customer-portal look (no API) — keep mockup markup as-is, mark any metrics with `demoMark`.

### Task 11: Marketing module
**Mockup:** `SCREENS.marketing` lines 1166–1235 (campaigns 1167–~1205, routing ~1206–1235). **Screens:** `campaigns, routing`.
**Field map (all REAL — fields exist):** `campaign→campaign_name`, `channel→channel`, `budget→budget`,
`spent→spent`, `leads→leads_count`, `won→won_count`, `revenue→revenue`(`money()`), `cpl→cpl`, `roas→roas`, `status→status`.
**API `himedic_crm/api/desk/marketing.py`:**
```python
# -*- coding: utf-8 -*-
import frappe

@frappe.whitelist()
def campaigns(limit=100):
    rows = frappe.get_list("HM Campaign",
        fields=["name","campaign_code","campaign_name","channel","budget","spent",
                "leads_count","won_count","revenue","cpl","roas","status"],
        limit_page_length=int(limit), order_by="modified desc")
    tot = {"budget": sum(r.get("budget") or 0 for r in rows),
           "spent": sum(r.get("spent") or 0 for r in rows),
           "revenue": sum(r.get("revenue") or 0 for r in rows),
           "leads": sum(r.get("leads_count") or 0 for r in rows)}
    return {"rows": rows, "totals": tot}

@frappe.whitelist()
def routing(limit=50):
    rows = frappe.get_list("HM Lead Assignment Rule",
        fields=["name"], limit_page_length=int(limit))
    # include all readable fields per rule
    out = [frappe.get_doc("HM Lead Assignment Rule", r["name"]).as_dict() for r in rows]
    return {"rows": out}
```
**JS notes:** campaigns table + summary tiles all from real data (no `demoMark` needed here); routing lists
assignment rules (confirm field names from `HM Lead Assignment Rule` meta and bind accordingly).

### Task 12: Reports module
**Mockup:** `SCREENS.reports` lines 1238–1314 (sales 1239–~1280, ops ~1281–1314). **Screens:** `sales, ops`.
**API `himedic_crm/api/desk/reports.py`:**
```python
# -*- coding: utf-8 -*-
import frappe

@frappe.whitelist()
def sales():
    stages = frappe.get_all("HM Deal Stage", pluck="name") or \
             ["Thẩm định","Báo giá","Đàm phán","Đã chốt","Thất bại"]
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
                       filters={"status": ["not in", ["Đã chốt","Thất bại"]]},
                       fields=["grand_total","probability"], limit_page_length=0))
    return {"pipeline": pipeline, "won": won, "lost": lost, "win_rate": win_rate, "forecast": forecast}

@frappe.whitelist()
def ops():
    total = frappe.db.count("HM Sample Order")
    bad = frappe.db.count("HM Sample Order", {"status": "Lỗi mẫu"})
    return {"orders_total": total, "reject_rate": (round(100 * bad / total) if total else 0),
            "by_status": {s: frappe.db.count("HM Sample Order", {"status": s})
                          for s in ["Đã phân công","Đã lấy mẫu","Đang vận chuyển","Đã nhập Lab","Hoàn tất","Lỗi mẫu"]}}
```
**JS notes:** sales screen bars from `pipeline` (CSS-bar widths scaled to max value); `win_rate`, `forecast`
(`money()`) real; ops KPIs from `by_status`. Any chart the mockup draws beyond bars → keep CSS-bar version.

### Task 13: Admin module
**Mockup:** `SCREENS.admin` lines 1952–~2050 (users + workflow). **Screens:** `users, workflow`.
**API `himedic_crm/api/desk/admin.py`:**
```python
# -*- coding: utf-8 -*-
import frappe

HM_ROLES = ["HM Sales","HM Sales Manager","HM Marketing","HM Lab Coordinator",
            "HM Lab Doctor","HM Accountant","HM Admin","HM BOD"]

@frappe.whitelist()
def users(limit=100):
    rows = frappe.get_list("User", filters={"enabled": 1, "user_type": "System User"},
        fields=["name","full_name","email"], limit_page_length=int(limit), order_by="full_name asc")
    for r in rows:
        r["roles"] = [x for x in frappe.get_roles(r["name"]) if x in HM_ROLES]
    return {"rows": rows, "hm_roles": HM_ROLES}

@frappe.whitelist()
def workflow(limit=100):
    rows = frappe.get_list("HM Workflow Definition", fields=["name"], limit_page_length=int(limit))
    return {"rows": [frappe.get_doc("HM Workflow Definition", r["name"]).as_dict() for r in rows]}
```
**JS notes:** users table shows `roles` chips via `tag()`; workflow screen lists definitions read-only;
all create/edit controls disabled.

---

## Task 14: Final read-only audit + full smoke pass

**Files:** any `public/js/crm/*.js` needing fixes.

- [ ] **Step 1: Audit every screen against the Porting Recipe**

For each module file confirm: (a) every action button is `disabled` with the tooltip; (b) every non-field
metric carries `demoMark`; (c) empty + error states return correctly; (d) no leftover hardcoded mockup arrays
remain (grep): `grep -RnE "const (LEADS|DEALS|cols) *=" himedic_crm/public/js/crm` → expect no data arrays
(only color/config maps).

- [ ] **Step 2: Run the full API test suite**

Run: `bench --site himedic.local run-tests --module himedic_crm.tests.test_desk_api`
Expected: PASS for all module shape tests.

- [ ] **Step 3: Full manual smoke**

`bench --site himedic.local clear-cache`; at `/crm`, visit all 12 modules and every screen/tab. Confirm each
renders populated (after seeding), navigation + hash work, no console errors.

- [ ] **Step 4: Commit**

```bash
git add himedic_crm/public/js/crm himedic_crm/tests/test_desk_api.py
git commit -m "feat(crm): read-only audit + full smoke pass across 12 modules

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (spec coverage)

- Spec §2 architecture (Jinja shell + JS app + `api/desk`) → Task 1, 3.
- Spec §3 file layout → Tasks 1–13 create exactly those files.
- Spec §4 screen→DocType map → each module task carries its field map; all desktop screens covered;
  `sample → 📱 mobile` explicitly excluded (Task 6).
- Spec §5 real-vs-placeholder → Porting Recipe steps 5–6, applied per task, audited in Task 14.
- Spec §6 seeder → Task 2 (idempotent, verified master/option names).
- Spec §7 cross-cutting (CDN, states, auth) → Task 1 (shell/login/CDN), lib.js states, applied per screen.
- Spec §8 API contract (rows/total/summary; columns; detail by name; no writes) → every `api/desk/*.py` here.
- Spec §9 testing → Task 2 seeder test + Task 3/14 API shape tests + manual smoke.

**No placeholders:** all API methods are complete code; JS porting references exact mockup line ranges
(canonical source in-repo) + explicit field maps + the shared Porting Recipe, not "similar to Task N".
**Type consistency:** API return keys (`rows/total/summary`, `columns[].{stage,color,count,cards}`,
`feed`, `pipeline`, `by_status`, `by_type`, `status_color`) are used consistently by the named JS consumers.
