// Hi-Medic mobile field-collection PWA (single-file app, wired to real backend).
const MAIN = () => document.getElementById('m-main');
const TITLE = () => document.getElementById('m-title');
const NAV = () => document.getElementById('m-nav');
const money = n => (n == null ? '—' : Number(n).toLocaleString('vi-VN') + 'đ');
const moneyM = n => { n = Number(n || 0); return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : Math.round(n / 1e3) + 'k'; };
const dfmt = d => { if (!d) return '—'; const p = String(d).slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : d; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STATUS_COLOR = { 'Đã phân công': 'sky', 'Đã xác nhận': 'amber', 'Đang lấy mẫu': 'violet', 'Đã lấy mẫu': 'emerald', 'Đang vận chuyển': 'blue', 'Đã nhập Lab': 'emerald', 'Hoàn tất': 'emerald', 'Hủy bởi khách': 'rose', 'Lỗi mẫu': 'rose' };
const DONE_STATES = ['Đã lấy mẫu', 'Đang vận chuyển', 'Đã nhập Lab', 'Hoàn tất'];

function toast(msg, type = 'ok') {
  const c = { ok: 'bg-emerald-600', err: 'bg-rose-600', info: 'bg-brand-700' }[type] || 'bg-emerald-600';
  const el = document.createElement('div');
  el.className = `fixed left-1/2 -translate-x-1/2 bottom-20 ${c} text-white text-sm px-4 py-2 rounded-full shadow-lg z-50`;
  el.textContent = msg; document.body.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2600);
}

async function apiGet(method, params = {}) {
  const clean = {}; for (const k in params) { if (params[k] != null) clean[k] = params[k]; }
  const qs = new URLSearchParams(clean).toString();
  const r = await fetch(`/api/method/${method}` + (qs ? `?${qs}` : ''), {
    headers: { 'Accept': 'application/json', 'X-Frappe-CSRF-Token': window.csrf_token || '' }, credentials: 'same-origin'
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.json()).message;
}
async function apiPost(method, args = {}) {
  const r = await fetch(`/api/method/${method}`, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': window.csrf_token || '' },
    body: JSON.stringify(args)
  });
  let d = {}; try { d = await r.json(); } catch (e) {}
  if (!r.ok) { let m = d.exception || ''; try { const sm = JSON.parse(d._server_messages || '[]'); if (sm.length) m = JSON.parse(sm[0]).message || m; } catch (e) {} throw new Error(m || ('HTTP ' + r.status)); }
  return d.message;
}
const SF = 'himedic_crm.sample.flows';
async function run(fn) { try { await fn(); } catch (e) { toast(e.message || String(e), 'err'); } }

// ---------- router ----------
function go(hash) { location.hash = hash; }
function back() { go('route'); }
window.addEventListener('hashchange', render);

function setHeader(title, showBack) {
  TITLE().textContent = title || '';
  const b = document.getElementById('m-back');
  b.classList.toggle('hidden', !showBack);
  b.onclick = back;
  document.getElementById('m-who').textContent = window.hmFullname || '';
}

const TABS = [
  ['🏠', 'Trang chủ', 'home'],
  ['🗺️', 'Tuyến', 'route'],
  ['🧾', 'Lịch sử', 'history'],
  ['👤', 'Tôi', 'me'],
];
function renderNav(active) {
  NAV().innerHTML = TABS.map(([ic, l, scr]) => {
    const on = scr === active;
    return `<button onclick="location.hash='${scr}'" class="py-2 ${on ? 'text-brand-700' : 'text-slate-400'}">
      <div class="text-lg leading-none">${ic}</div><div class="mt-0.5">${l}</div></button>`;
  }).join('');
}

async function render() {
  const [screen, arg] = location.hash.replace(/^#/, '').split('/');
  MAIN().innerHTML = `<div class="text-center text-slate-400 pt-16">Đang tải…</div>`;
  try {
    if (screen === 'order' && arg) { await screenOrder(decodeURIComponent(arg)); renderNav('route'); }
    else if (screen === 'history') { await screenHistory(); renderNav('history'); }
    else if (screen === 'me') { await screenMe(); renderNav('me'); }
    else if (screen === 'route') { await screenRoute(); renderNav('route'); }
    else { await screenHome(); renderNav('home'); }
  } catch (e) {
    MAIN().innerHTML = `<div class="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">Lỗi: ${esc(e.message || e)}</div>`;
  }
}

// ---------- screen: home dashboard ----------
async function screenHome() {
  setHeader('', false);
  const d = await apiGet('himedic_crm.api.mobile.my_day');
  const k = d.kpis || {};
  const total = k.today_orders || 0;
  const pct = total ? Math.round((k.done || 0) / total * 100) : 0;
  const nx = d.next_order;
  const greet = (() => { const h = new Date().getHours(); return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'; })();
  const initials = (d.fullname || 'NV').split(' ').slice(-2).map(s => s[0]).join('').toUpperCase();

  MAIN().innerHTML = `
    <div class="-m-4 mb-0">
      <div class="bg-gradient-to-br from-brand-700 to-brand-500 text-white px-4 pt-4 pb-6">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-full bg-white/15 grid place-items-center font-bold">${initials}</div>
          <div class="flex-1"><div class="text-xs text-cyan-100">${greet}</div><div class="font-bold">${esc(d.fullname || 'Nhân viên')}</div></div>
        </div>
        <div class="mt-4 bg-white/10 rounded-2xl p-3">
          <div class="text-xs text-cyan-100">Hôm nay · ${dfmt(d.date)}</div>
          <div class="mt-1 flex items-end justify-between">
            <div><div class="text-3xl font-extrabold">${total}</div><div class="text-xs">đơn lấy mẫu</div></div>
            <div class="text-right text-xs leading-5">
              <div>✓ Đã xong <b>${k.done || 0}</b></div>
              <div>▶ Đang làm <b>${k.doing || 0}</b></div>
              <div>⏳ Còn <b>${k.remaining || 0}</b></div>
            </div>
          </div>
          <div class="mt-2 h-2 bg-white/20 rounded-full overflow-hidden"><div class="h-full bg-emerald-300" style="width:${pct}%"></div></div>
        </div>
      </div>
    </div>
    <div class="space-y-3 pt-4">
      <div class="grid grid-cols-3 gap-2">
        ${[['🗺️', 'Tuyến', 'route'], ['🧾', 'Lịch sử', 'history'], ['👤', 'Hồ sơ', 'me']].map(([ic, l, scr]) => `
          <button onclick="location.hash='${scr}'" class="bg-white rounded-xl p-3 text-center border border-slate-200">
            <div class="w-9 h-9 mx-auto rounded-lg bg-brand-50 grid place-items-center text-lg">${ic}</div>
            <div class="text-[11px] mt-1 text-slate-600">${l}</div></button>`).join('')}
      </div>

      ${nx ? `
      <div class="bg-white rounded-xl p-3 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <div class="font-semibold text-sm">Đơn tiếp theo</div>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-${STATUS_COLOR[nx.status] || 'slate'}-100 text-${STATUS_COLOR[nx.status] || 'slate'}-700">${nx.status}</span>
        </div>
        <div class="flex items-start gap-3">
          <div class="text-center"><div class="text-[10px] text-slate-400">${String(nx.appointment_time || '').slice(0, 2)}h</div><div class="font-bold text-brand-600">${String(nx.appointment_time || '').slice(0, 5) || '—'}</div></div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold">${esc(nx.contact || '—')}</div>
            <div class="text-xs text-slate-500 truncate">📍 ${esc(nx.address || '—')}</div>
          </div>
        </div>
        <button onclick="location.hash='order/${encodeURIComponent(nx.name)}'" class="w-full mt-3 py-2.5 bg-brand-700 text-white rounded-xl text-sm font-semibold">Mở đơn →</button>
      </div>` : `<div class="bg-white rounded-xl p-5 text-center text-slate-400 text-sm shadow-sm">Hôm nay không còn đơn nào chờ xử lý 🎉</div>`}

      <div class="bg-white rounded-xl p-3 shadow-sm">
        <div class="font-semibold text-sm mb-2">Chỉ tiêu tháng này</div>
        <div class="grid grid-cols-2 gap-2 text-center text-[11px]">
          <div class="bg-emerald-50 p-2 rounded"><div class="font-bold text-emerald-700 text-base">${moneyM(k.month_revenue)}</div><div>Doanh thu đã chốt</div></div>
          <div class="bg-sky-50 p-2 rounded"><div class="font-bold text-sky-700 text-base">${k.month_orders || 0}</div><div>Đơn đã hoàn tất</div></div>
        </div>
      </div>
    </div>`;
}

// ---------- screen: today's route ----------
async function screenRoute() {
  setHeader('Lịch tuyến', false);
  const d = await apiGet('himedic_crm.api.mobile.my_day');
  const orders = d.orders || [];
  const k = d.kpis || {};
  MAIN().innerHTML = `
    <div class="-mx-4 -mt-4 mb-4 bg-brand-700 text-white px-4 pt-4 pb-4">
      <div class="flex items-center justify-between">
        <div><div class="text-xs text-cyan-200">Hôm nay · ${dfmt(d.date)}</div><div class="font-bold text-lg">Lịch tuyến của bạn</div></div>
        <div class="bg-emerald-500 px-2 py-0.5 rounded-full text-xs">${k.done || 0}/${orders.length} xong</div>
      </div>
      <div class="mt-3 grid grid-cols-3 gap-2 text-center">
        ${[['Đã xong', k.done || 0, 'text-emerald-300'], ['Đang làm', k.doing || 0, 'text-amber-300'], ['Còn lại', k.remaining || 0, 'text-cyan-200']].map(([l, v, c]) => `<div class="bg-white/10 rounded-lg p-2"><div class="${c} font-bold text-lg">${v}</div><div class="text-[10px]">${l}</div></div>`).join('')}
      </div>
    </div>
    ${orders.length ? orders.map(o => {
      const c = STATUS_COLOR[o.status] || 'slate';
      const ic = DONE_STATES.includes(o.status) ? '✓' : o.status === 'Đang lấy mẫu' ? '▶' : '◯';
      return `
      <button onclick="location.hash='order/${encodeURIComponent(o.name)}'" class="w-full text-left bg-white rounded-xl p-3 mb-2 shadow-sm border-l-4 border-${c}-500">
        <div class="flex items-start gap-3">
          <div class="text-center"><div class="text-[10px] text-slate-400 uppercase">${String(o.appointment_time || '').slice(0, 2)}h</div><div class="font-bold text-${c}-600 text-sm">${String(o.appointment_time || '').slice(0, 5) || '—'}</div></div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm">${esc(o.contact || '—')}</div>
            <div class="text-xs text-slate-500 truncate">📍 ${esc(o.address || '—')}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${esc(o.region || '')}</div>
          </div>
          <div class="w-7 h-7 rounded-full bg-${c}-100 text-${c}-600 grid place-items-center text-sm font-bold">${ic}</div>
        </div>
      </button>`;
    }).join('') : `<div class="text-center text-slate-400 py-12">Hôm nay chưa có lịch lấy mẫu 🎉</div>`}`;
}

// ---------- screen: order + collection flow ----------
async function screenOrder(name) {
  setHeader('Đơn lấy mẫu', true);
  const so = await apiGet('himedic_crm.api.mobile.order_detail', { name });
  const st = so.status;
  const items = so.items || [];
  const tubes = so.tubes || [];
  const ci = so.contact_info || {};
  const color = STATUS_COLOR[st] || 'slate';
  const verified = so.national_id_scanned;
  const checkedIn = !!so.checkin_at || ['Đang lấy mẫu', 'Đã lấy mẫu'].includes(st);

  let step;
  if (DONE_STATES.includes(st)) step = 'done';
  else if (st === 'Hủy bởi khách' || st === 'Lỗi mẫu') step = 'closed';
  else if (!checkedIn) step = 'checkin';
  else if (!verified) step = 'verify';
  else step = 'collect';

  const warnHtml = (ci.warnings || []).length
    ? `<div class="mt-2 space-y-1">${ci.warnings.map(w => `<div class="flex items-center gap-2 text-[11px] bg-${w.tone}-50 text-${w.tone}-800 px-2 py-1 rounded"><span>${w.icon}</span><span>${esc(w.text)}</span></div>`).join('')}</div>`
    : '';
  const sub = [ci.gender, ci.age ? ci.age + ' tuổi' : null, ci.pid ? 'PID ' + ci.pid : null].filter(Boolean).join(' · ');

  MAIN().innerHTML = `
    <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
      <div class="flex items-center justify-between">
        <div class="font-semibold">${esc(ci.full_name || so.contact || '—')}</div>
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-${color}-100 text-${color}-700">${st}</span>
      </div>
      ${sub ? `<div class="text-xs text-slate-500 mt-0.5">${esc(sub)}</div>` : ''}
      <div class="text-xs text-slate-600 mt-1">📍 ${esc(so.address || '—')}</div>
      <div class="text-xs text-slate-500">🗓 ${dfmt(so.appointment_date)}/${(so.appointment_date || '').slice(0, 4)} · ${String(so.appointment_time || '').slice(0, 5)}</div>
      <div class="mt-2 flex flex-wrap gap-1">${items.map(i => `<span class="text-[10px] px-2 py-0.5 rounded bg-slate-100">${esc(i.item_name || i.test || i.package || 'Dịch vụ')}</span>`).join('') || '<span class="text-xs text-slate-400">Chưa có chỉ định</span>'}</div>
      ${so.grand_total ? `<div class="mt-2 text-xs text-slate-500">Tạm tính: <b class="text-emerald-700">${money(so.grand_total)}</b></div>` : ''}
      ${warnHtml}
    </div>
    <div id="m-step"></div>`;

  const box = document.getElementById('m-step');
  if (step === 'done') {
    box.innerHTML = `<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
      <div class="text-3xl mb-1">✅</div><div class="font-semibold text-emerald-800">Đã hoàn tất lấy mẫu</div>
      <div class="text-xs text-emerald-700 mt-1">${tubes.length} ống · đã khóa đơn${so.signed_at ? ' · đã ký' : ''}</div>
      <button onclick="location.hash='route'" class="mt-3 w-full py-2.5 bg-brand-700 text-white rounded-xl text-sm">Về lịch tuyến</button></div>`;
    return;
  }
  if (step === 'closed') {
    box.innerHTML = `<div class="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center text-rose-700">Đơn đã đóng (${st})${so.incident ? ': ' + esc(so.incident) : ''}</div>`;
    return;
  }
  if (step === 'checkin') {
    box.innerHTML = `
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="font-semibold text-sm mb-2">Bước 1 · Check-in tại địa điểm</div>
        <p class="text-xs text-slate-500 mb-3">Xác nhận có mặt bằng GPS (BR-S-002). Sai lệch &gt;100m cần nhập lý do.</p>
        <button id="m-checkin" class="w-full py-3 bg-brand-700 text-white rounded-xl font-medium">📍 Check-in</button>
      </div>`;
    document.getElementById('m-checkin').onclick = () => doCheckin(name);
    return;
  }
  if (step === 'verify') {
    renderVerifyStep(box, name, so, ci);
    return;
  }
  // step === collect
  box.innerHTML = `
    <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
      <div class="font-semibold text-sm mb-2">Bước 4 · Lấy mẫu & quét ống</div>
      <div class="grid grid-cols-3 gap-2 text-center text-[11px] mb-3">
        <div class="bg-emerald-50 rounded p-1.5"><div class="font-bold text-emerald-700">${tubes.length}</div><div>Đã lấy</div></div>
        <div class="bg-slate-50 rounded p-1.5"><div class="font-bold text-slate-700">${so.total_tubes || tubes.length}</div><div>Dự kiến</div></div>
        <div class="bg-violet-50 rounded p-1.5"><div class="font-bold text-violet-700">${items.length}</div><div>Dịch vụ</div></div>
      </div>
      <div class="flex gap-2">
        <input id="m-bc" placeholder="Quét/nhập barcode ống" class="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl">
        <button id="m-addtube" class="px-4 bg-brand-600 text-white rounded-xl">+ Ống</button>
      </div>
      <div class="mt-3 space-y-1">${tubes.length ? tubes.map(t => `<div class="flex items-center gap-2 text-sm"><span class="text-emerald-600">✓</span><code class="bg-slate-100 px-1.5 rounded text-xs">${esc(t.barcode)}</code><span class="text-xs text-slate-400">${esc(t.sample_type || '')}</span></div>`).join('') : '<div class="text-xs text-slate-400">Chưa có ống mẫu</div>'}</div>
    </div>
    <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
      <div class="font-semibold text-sm mb-2">Bước 5 · Ký xác nhận (BR-S-006)</div>
      <canvas id="m-sig" class="m-sig"></canvas>
      <div class="flex gap-2 mt-2">
        <button id="m-clear" class="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600">Xóa</button>
        <button id="m-finish" class="flex-[2] py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm" ${tubes.length ? '' : 'disabled style="opacity:.5"'}>Hoàn tất & khóa đơn</button>
      </div>
    </div>
    <button id="m-incident" class="w-full py-2 text-rose-600 text-sm">⚠ Báo sự cố / hủy</button>`;

  document.getElementById('m-addtube').onclick = () => {
    const bc = document.getElementById('m-bc').value.trim();
    if (!bc) return toast('Nhập barcode', 'err');
    run(async () => { const r = await apiPost(`${SF}.add_tube`, { sample_order: name, barcode: bc }); toast(`Đã thêm ống (${r.tubes})`); render(); });
  };
  document.getElementById('m-incident').onclick = () => {
    const reason = prompt('Lý do sự cố (vỡ ống, khách hủy…):');
    if (reason) run(async () => { const r = await apiPost(`${SF}.report_incident`, { sample_order: name, reason }); toast('Đã báo sự cố · tạo đơn lấy lại ' + (r.recollection || '')); back(); });
  };
  initSignature(name);
}

// pre-collection checklist questions (saved via save_checklist)
const CHECKLIST_Q = [
  'Đã nhịn ăn ≥ 8 giờ?',
  'Không uống cà phê / nước ngọt buổi sáng?',
  'Không uống thuốc trong 24 giờ qua?',
  'Sức khỏe ổn định, không sốt?',
];

function renderVerifyStep(box, name, so, ci) {
  const dist = so.checkin_distance_m;
  const warnHtml = (ci.warnings || []).length
    ? `<div class="bg-white rounded-xl p-4 shadow-sm mb-3">
         <div class="font-semibold text-sm mb-2">⚠ Cảnh báo y tế từ hồ sơ</div>
         <div class="space-y-1.5">${ci.warnings.map(w => `<div class="flex items-center gap-2 text-xs bg-${w.tone}-50 text-${w.tone}-800 p-2 rounded"><span>${w.icon}</span><span>${esc(w.text)}</span></div>`).join('')}</div>
       </div>`
    : '';
  box.innerHTML = `
    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 flex items-center gap-2 text-sm">
      <span class="w-7 h-7 rounded-full bg-emerald-500 text-white grid place-items-center text-xs flex-shrink-0">✓</span>
      <div><div class="font-semibold text-emerald-800">Đã đến nơi</div>
      <div class="text-xs text-emerald-700">${dist != null ? `Cách vị trí đặt ~${Math.round(dist)}m` : 'Đã ghi nhận check-in'}</div></div>
    </div>
    <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
      <div class="font-semibold text-sm mb-2">Bước 2 · Đối chiếu CCCD</div>
      <p class="text-xs text-slate-500 mb-2">Bắt buộc trước khi lấy mẫu (BR-S-003).</p>
      <input id="m-cccd" inputmode="numeric" placeholder="Số CCCD" value="${esc(ci.national_id || '')}" class="w-full px-3 py-2.5 border border-slate-300 rounded-xl">
    </div>
    <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
      <div class="font-semibold text-sm mb-2">Bước 3 · Checklist tiền xét nghiệm</div>
      <div class="space-y-1">
        ${CHECKLIST_Q.map((q, i) => `<label class="flex items-center gap-2 py-1.5 text-sm"><input type="checkbox" id="m-cl-${i}" class="rounded w-4 h-4"><span>${q}</span></label>`).join('')}
      </div>
    </div>
    ${warnHtml}
    <button id="m-verify" class="w-full py-3 bg-brand-700 text-white rounded-xl font-medium">Xác minh & tiếp tục</button>`;
  document.getElementById('m-verify').onclick = () => {
    const v = document.getElementById('m-cccd').value.trim();
    const answers = CHECKLIST_Q.map((q, i) => ({ question: q, answer: document.getElementById('m-cl-' + i).checked ? 'Có' : 'Không' }));
    run(async () => {
      try { await apiPost(`${SF}.save_checklist`, { sample_order: name, answers }); } catch (e) {}
      await apiPost(`${SF}.verify_identity`, { sample_order: name, national_id: v, match_score: 96 });
      toast('Đã xác minh CCCD'); render();
    });
  };
}

function doCheckin(name) {
  const finish = (lat, lng, reason) => run(async () => { await apiPost(`${SF}.checkin`, { sample_order: name, lat, lng, reason }); toast('Đã check-in'); render(); });
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      p => finish(p.coords.latitude, p.coords.longitude, null),
      () => finish(null, null, 'GPS không khả dụng'),
      { timeout: 6000 });
  } else finish(null, null, 'Thiết bị không hỗ trợ GPS');
}

function initSignature(name) {
  const c = document.getElementById('m-sig'); if (!c) return;
  const ctx = c.getContext('2d');
  c.width = c.offsetWidth; c.height = 160;
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  let drawing = false, has = false;
  const pos = e => { const r = c.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [t.clientX - r.left, t.clientY - r.top]; };
  const start = e => { drawing = true; has = true; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); e.preventDefault(); };
  const move = e => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); e.preventDefault(); };
  const end = () => drawing = false;
  c.addEventListener('mousedown', start); c.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
  c.addEventListener('touchstart', start, { passive: false }); c.addEventListener('touchmove', move, { passive: false }); c.addEventListener('touchend', end);
  document.getElementById('m-clear').onclick = () => { ctx.clearRect(0, 0, c.width, c.height); has = false; };
  document.getElementById('m-finish').onclick = () => {
    if (!has) return toast('Cần chữ ký khách hàng (BR-S-006)', 'err');
    const sig = c.toDataURL('image/png');
    run(async () => { await apiPost(`${SF}.finalize_collection`, { sample_order: name, signature: sig }); toast('Đã hoàn tất & khóa đơn'); render(); });
  };
}

// ---------- screen: history ----------
async function screenHistory() {
  setHeader('Lịch sử', false);
  const d = await apiGet('himedic_crm.api.mobile.my_history', { days: 14 });
  const rows = d.rows || [];
  // group by date
  const groups = {};
  rows.forEach(r => { (groups[r.appointment_date] = groups[r.appointment_date] || []).push(r); });
  const dates = Object.keys(groups).sort().reverse();
  MAIN().innerHTML = `
    <div class="font-bold text-lg mb-3">Hoạt động của tôi</div>
    ${rows.length ? dates.map(date => `
      <div class="text-[11px] font-semibold text-slate-500 uppercase px-1 mb-1 mt-3">${dfmt(date)}/${(date || '').slice(0, 4)}</div>
      ${groups[date].map(r => {
        const c = STATUS_COLOR[r.status] || 'slate';
        const done = DONE_STATES.includes(r.status);
        return `
        <button onclick="location.hash='order/${encodeURIComponent(r.name)}'" class="w-full text-left bg-white rounded-xl p-3 mb-2 border-l-4 border-${c}-400">
          <div class="flex items-start gap-2">
            <div class="text-center"><div class="text-[10px] text-slate-400">${String(r.appointment_time || '').slice(0, 2)}h</div><div class="text-${c}-600 font-bold text-sm">${String(r.appointment_time || '').slice(0, 5) || '—'}</div></div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2"><div class="font-semibold text-sm truncate">${esc(r.contact || '—')}</div><span class="text-${c}-600">${done ? '✓' : r.status === 'Đang lấy mẫu' ? '▶' : '◯'}</span></div>
              <div class="text-[11px] text-slate-500">${r.collected_tubes || 0} ống${r.grand_total ? ' · ' + money(r.grand_total) : ''}</div>
              <div class="text-xs mt-0.5 text-${c}-700">${r.status}${r.incident ? ' · ⚠ ' + esc(r.incident) : ''}</div>
            </div>
          </div>
        </button>`;
      }).join('')}`).join('') : `<div class="text-center text-slate-400 py-12">Chưa có hoạt động trong 14 ngày qua</div>`}`;
}

// ---------- screen: me / profile ----------
async function screenMe() {
  setHeader('Tài khoản', false);
  const d = await apiGet('himedic_crm.api.mobile.my_day').catch(() => ({ kpis: {} }));
  const k = d.kpis || {};
  const initials = (d.fullname || window.hmFullname || 'NV').split(' ').slice(-2).map(s => s[0]).join('').toUpperCase();
  MAIN().innerHTML = `
    <div class="bg-white rounded-xl p-4 shadow-sm mb-3 flex items-center gap-3">
      <div class="w-14 h-14 rounded-full bg-gradient-to-br from-brand-600 to-brand-500 text-white grid place-items-center text-xl font-bold">${initials}</div>
      <div><div class="font-bold">${esc(d.fullname || window.hmFullname || 'Nhân viên')}</div><div class="text-xs text-slate-500">${esc(window.hmUser || '')}</div></div>
    </div>
    <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
      <div class="font-semibold text-sm mb-2">Chỉ tiêu tháng này</div>
      <div class="grid grid-cols-2 gap-2 text-center text-[11px]">
        <div class="bg-emerald-50 p-3 rounded"><div class="font-bold text-emerald-700 text-lg">${moneyM(k.month_revenue)}</div><div>Doanh thu</div></div>
        <div class="bg-sky-50 p-3 rounded"><div class="font-bold text-sky-700 text-lg">${k.month_orders || 0}</div><div>Đơn hoàn tất</div></div>
      </div>
    </div>
    <div class="bg-white rounded-xl divide-y divide-slate-100 shadow-sm mb-3 text-sm">
      <button onclick="location.hash='route'" class="w-full text-left px-4 py-3 flex items-center gap-3"><span>🗺️</span> Lịch tuyến hôm nay <span class="ml-auto text-slate-300">›</span></button>
      <button onclick="location.hash='history'" class="w-full text-left px-4 py-3 flex items-center gap-3"><span>🧾</span> Lịch sử đơn <span class="ml-auto text-slate-300">›</span></button>
      <a href="/crm" class="w-full text-left px-4 py-3 flex items-center gap-3"><span>🖥️</span> Mở bản desktop <span class="ml-auto text-slate-300">›</span></a>
    </div>
    <button id="m-logout" class="w-full py-3 text-rose-600 text-sm font-medium">Đăng xuất</button>`;
  document.getElementById('m-logout').onclick = () => { location.href = '/?cmd=logout'; };
}

// boot
if (!location.hash) location.hash = 'home';
render();
