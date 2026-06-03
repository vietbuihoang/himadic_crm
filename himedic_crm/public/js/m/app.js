// Hi-Medic mobile field-collection PWA (single-file app).
const MAIN = () => document.getElementById('m-main');
const TITLE = () => document.getElementById('m-title');
const money = n => (n==null?'—':Number(n).toLocaleString('vi-VN')+'đ');
const STATUS_COLOR = {'Đã phân công':'sky','Đã xác nhận':'amber','Đang lấy mẫu':'violet','Đã lấy mẫu':'emerald','Đang vận chuyển':'blue','Đã nhập Lab':'emerald','Hoàn tất':'emerald','Hủy bởi khách':'rose','Lỗi mẫu':'rose'};

function toast(msg, type='ok'){
  const c = {ok:'bg-emerald-600',err:'bg-rose-600',info:'bg-brand-700'}[type]||'bg-emerald-600';
  const el = document.createElement('div');
  el.className = `fixed left-1/2 -translate-x-1/2 bottom-6 ${c} text-white text-sm px-4 py-2 rounded-full shadow-lg z-50`;
  el.textContent = msg; document.body.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s'; el.style.opacity='0'; setTimeout(()=>el.remove(),300); }, 2600);
}

async function apiGet(method, params={}){
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`/api/method/${method}`+(qs?`?${qs}`:''), {
    headers:{'Accept':'application/json','X-Frappe-CSRF-Token':window.csrf_token||''}, credentials:'same-origin'});
  if(!r.ok) throw new Error('HTTP '+r.status);
  return (await r.json()).message;
}
async function apiPost(method, args={}){
  const r = await fetch(`/api/method/${method}`, {method:'POST', credentials:'same-origin',
    headers:{'Accept':'application/json','Content-Type':'application/json','X-Frappe-CSRF-Token':window.csrf_token||''},
    body:JSON.stringify(args)});
  let d={}; try{ d=await r.json(); }catch(e){}
  if(!r.ok){ let m=d.exception||''; try{ const sm=JSON.parse(d._server_messages||'[]'); if(sm.length) m=JSON.parse(sm[0]).message||m; }catch(e){} throw new Error(m||('HTTP '+r.status)); }
  return d.message;
}
const SF = 'himedic_crm.sample.flows';
async function run(fn){ try { await fn(); } catch(e){ toast(e.message||String(e), 'err'); } }

// ---------- router ----------
function go(hash){ location.hash = hash; }
function back(){ go('route'); }
window.addEventListener('hashchange', render);

function setHeader(title, showBack){
  TITLE().textContent = title || '';
  const b = document.getElementById('m-back');
  b.classList.toggle('hidden', !showBack);
  b.onclick = back;
  document.getElementById('m-who').textContent = window.hmFullname || '';
}

async function render(){
  const [screen, arg] = location.hash.replace(/^#/,'').split('/');
  MAIN().innerHTML = `<div class="text-center text-slate-400 pt-16">Đang tải…</div>`;
  try {
    if(screen === 'order' && arg) await screenOrder(decodeURIComponent(arg));
    else await screenRoute();
  } catch(e){
    MAIN().innerHTML = `<div class="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">Lỗi: ${e.message||e}</div>`;
  }
}

// ---------- screen: today's route ----------
async function screenRoute(){
  setHeader('Lịch tuyến', false);
  const d = await apiGet('himedic_crm.api.mobile.my_day');
  const orders = d.orders || [];
  MAIN().innerHTML = `
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-white rounded-xl p-3 text-center shadow-sm"><div class="text-2xl font-bold text-brand-700">${d.kpis?.today_orders||0}</div><div class="text-xs text-slate-500">Đơn hôm nay</div></div>
      <div class="bg-white rounded-xl p-3 text-center shadow-sm"><div class="text-2xl font-bold text-amber-600">${d.kpis?.open_leads||0}</div><div class="text-xs text-slate-500">Lead đang mở</div></div>
    </div>
    <div class="text-xs font-semibold text-slate-500 uppercase mb-2">Tuyến hôm nay (${orders.length})</div>
    ${orders.length ? orders.map((o,i)=>`
      <button onclick="location.hash='order/${encodeURIComponent(o.name)}'" class="w-full text-left bg-white rounded-xl p-3 mb-2 shadow-sm flex items-start gap-3">
        <div class="w-7 h-7 rounded-full bg-brand-600 text-white grid place-items-center text-xs font-bold flex-shrink-0">${i+1}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between"><b class="text-sm">${o.appointment_time||''}</b>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-${STATUS_COLOR[o.status]||'slate'}-100 text-${STATUS_COLOR[o.status]||'slate'}-700">${o.status}</span></div>
          <div class="text-xs text-slate-600 mt-0.5 truncate">📍 ${o.address||'—'}</div>
          <div class="text-xs text-slate-500">👤 ${o.contact||'—'} · ${o.region||''}</div>
        </div>
        <span class="text-slate-300">›</span>
      </button>`).join('') : `<div class="text-center text-slate-400 py-12">Hôm nay chưa có lịch lấy mẫu 🎉</div>`}`;
}

// ---------- screen: order + collection flow ----------
async function screenOrder(name){
  setHeader('Đơn lấy mẫu', true);
  const so = await apiGet('himedic_crm.api.mobile.order_detail', {name});
  const st = so.status;
  const items = so.items || [];
  const tubes = so.tubes || [];
  const color = STATUS_COLOR[st]||'slate';
  const verified = so.national_id_scanned;
  const checkedIn = !!so.checkin_at || ['Đang lấy mẫu','Đã lấy mẫu'].includes(st);

  // determine the current step
  let step;
  if(['Đã lấy mẫu','Đang vận chuyển','Đã nhập Lab','Hoàn tất'].includes(st)) step='done';
  else if(st==='Hủy bởi khách'||st==='Lỗi mẫu') step='closed';
  else if(!checkedIn) step='checkin';
  else if(!verified) step='verify';
  else step='collect';

  MAIN().innerHTML = `
    <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
      <div class="flex items-center justify-between">
        <div class="font-semibold">${so.contact||'—'}</div>
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-${color}-100 text-${color}-700">${st}</span>
      </div>
      <div class="text-xs text-slate-600 mt-1">📍 ${so.address||'—'}</div>
      <div class="text-xs text-slate-500">🗓 ${(so.appointment_date||'').slice(0,10)} ${String(so.appointment_time||'').slice(0,5)}</div>
      <div class="mt-2 flex flex-wrap gap-1">${items.map(i=>`<span class="text-[10px] px-2 py-0.5 rounded bg-slate-100">${i.item_name||i.test||i.package}</span>`).join('')||'<span class="text-xs text-slate-400">Chưa có chỉ định</span>'}</div>
    </div>
    <div id="m-step"></div>`;

  const box = document.getElementById('m-step');
  if(step==='done'){
    box.innerHTML = `<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
      <div class="text-3xl mb-1">✅</div><div class="font-semibold text-emerald-800">Đã hoàn tất lấy mẫu</div>
      <div class="text-xs text-emerald-700 mt-1">${tubes.length} ống · đã khóa đơn${so.signed_at?' · đã ký':''}</div>
      <button onclick="location.hash='route'" class="mt-3 w-full py-2.5 bg-brand-700 text-white rounded-xl text-sm">Về lịch tuyến</button></div>`;
    return;
  }
  if(step==='closed'){
    box.innerHTML = `<div class="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center text-rose-700">Đơn đã đóng (${st})${so.incident?': '+so.incident:''}</div>`;
    return;
  }
  if(step==='checkin'){
    box.innerHTML = `
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="font-semibold text-sm mb-2">Bước 1 · Check-in tại địa điểm</div>
        <p class="text-xs text-slate-500 mb-3">Xác nhận có mặt bằng GPS (BR-S-002). Sai lệch &gt;100m cần nhập lý do.</p>
        <button id="m-checkin" class="w-full py-3 bg-brand-700 text-white rounded-xl font-medium">📍 Check-in</button>
      </div>`;
    document.getElementById('m-checkin').onclick = ()=> doCheckin(name);
    return;
  }
  if(step==='verify'){
    box.innerHTML = `
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="font-semibold text-sm mb-2">Bước 2 · Đối chiếu CCCD</div>
        <p class="text-xs text-slate-500 mb-2">Bắt buộc trước khi lấy mẫu (BR-S-003).</p>
        <input id="m-cccd" inputmode="numeric" placeholder="Số CCCD" class="w-full px-3 py-2.5 border border-slate-300 rounded-xl mb-2">
        <button id="m-verify" class="w-full py-3 bg-brand-700 text-white rounded-xl font-medium">Xác minh & tiếp tục</button>
      </div>`;
    document.getElementById('m-verify').onclick = ()=>{
      const v = document.getElementById('m-cccd').value.trim();
      run(async ()=>{ await apiPost(`${SF}.verify_identity`, {sample_order:name, national_id:v, match_score:96}); toast('Đã xác minh CCCD'); render(); });
    };
    return;
  }
  // step === collect
  box.innerHTML = `
    <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
      <div class="font-semibold text-sm mb-2">Bước 3 · Lấy mẫu & quét ống</div>
      <div class="flex gap-2">
        <input id="m-bc" placeholder="Quét/nhập barcode ống" class="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl">
        <button id="m-addtube" class="px-4 bg-brand-600 text-white rounded-xl">+ Ống</button>
      </div>
      <div class="mt-3 space-y-1">${tubes.length ? tubes.map(t=>`<div class="flex items-center gap-2 text-sm"><span class="text-emerald-600">✓</span><code class="bg-slate-100 px-1.5 rounded text-xs">${t.barcode}</code><span class="text-xs text-slate-400">${t.sample_type||''}</span></div>`).join('') : '<div class="text-xs text-slate-400">Chưa có ống mẫu</div>'}</div>
    </div>
    <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
      <div class="font-semibold text-sm mb-2">Bước 4 · Ký xác nhận (BR-S-006)</div>
      <canvas id="m-sig" class="m-sig"></canvas>
      <div class="flex gap-2 mt-2">
        <button id="m-clear" class="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600">Xóa</button>
        <button id="m-finish" class="flex-[2] py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm" ${tubes.length?'':'disabled style="opacity:.5"'}>Hoàn tất & khóa đơn</button>
      </div>
    </div>
    <button id="m-incident" class="w-full py-2 text-rose-600 text-sm">⚠ Báo sự cố / hủy</button>`;

  document.getElementById('m-addtube').onclick = ()=>{
    const bc = document.getElementById('m-bc').value.trim();
    if(!bc) return toast('Nhập barcode', 'err');
    run(async ()=>{ const r = await apiPost(`${SF}.add_tube`, {sample_order:name, barcode:bc}); toast(`Đã thêm ống (${r.tubes})`); render(); });
  };
  document.getElementById('m-incident').onclick = ()=>{
    const reason = prompt('Lý do sự cố (vỡ ống, khách hủy…):');
    if(reason) run(async ()=>{ const r = await apiPost(`${SF}.report_incident`, {sample_order:name, reason}); toast('Đã báo sự cố · tạo đơn lấy lại '+(r.recollection||'')); back(); });
  };
  initSignature(name);
}

function doCheckin(name){
  const finish = (lat,lng,reason)=> run(async ()=>{ await apiPost(`${SF}.checkin`, {sample_order:name, lat, lng, reason}); toast('Đã check-in'); render(); });
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      p => finish(p.coords.latitude, p.coords.longitude, null),
      () => finish(null, null, 'GPS không khả dụng'),
      {timeout:6000});
  } else finish(null,null,'Thiết bị không hỗ trợ GPS');
}

function initSignature(name){
  const c = document.getElementById('m-sig'); if(!c) return;
  const ctx = c.getContext('2d');
  c.width = c.offsetWidth; c.height = 160;
  ctx.strokeStyle='#0f172a'; ctx.lineWidth=2; ctx.lineCap='round';
  let drawing=false, has=false;
  const pos = e=>{ const r=c.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return [t.clientX-r.left, t.clientY-r.top]; };
  const start = e=>{ drawing=true; has=true; const [x,y]=pos(e); ctx.beginPath(); ctx.moveTo(x,y); e.preventDefault(); };
  const move = e=>{ if(!drawing) return; const [x,y]=pos(e); ctx.lineTo(x,y); ctx.stroke(); e.preventDefault(); };
  const end = ()=> drawing=false;
  c.addEventListener('mousedown',start); c.addEventListener('mousemove',move); window.addEventListener('mouseup',end);
  c.addEventListener('touchstart',start,{passive:false}); c.addEventListener('touchmove',move,{passive:false}); c.addEventListener('touchend',end);
  document.getElementById('m-clear').onclick = ()=>{ ctx.clearRect(0,0,c.width,c.height); has=false; };
  document.getElementById('m-finish').onclick = ()=>{
    if(!has) return toast('Cần chữ ký khách hàng (BR-S-006)', 'err');
    const sig = c.toDataURL('image/png');
    run(async ()=>{ await apiPost(`${SF}.finalize_collection`, {sample_order:name, signature:sig}); toast('Đã hoàn tất & khóa đơn'); render(); });
  };
}

// boot
if(!location.hash) location.hash = 'route';
render();
