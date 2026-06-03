// Hi-Medic customer portal (phone+OTP login → appointments / results / consent).
const MAIN = () => document.getElementById('p-main');
const STATUS_COLOR = {'Đã phân công':'sky','Đã xác nhận':'amber','Đang lấy mẫu':'violet','Đã lấy mẫu':'emerald','Đang vận chuyển':'blue','Đã nhập Lab':'emerald','Hoàn tất':'emerald','Hủy bởi khách':'rose','Lỗi mẫu':'rose'};
const dfmt = d => { if(!d) return '—'; const p=String(d).slice(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d; };

function toast(msg, type='ok'){
  const c={ok:'bg-emerald-600',err:'bg-rose-600'}[type]||'bg-emerald-600';
  const el=document.createElement('div'); el.className=`fixed left-1/2 -translate-x-1/2 bottom-6 ${c} text-white text-sm px-4 py-2 rounded-full shadow-lg z-50`;
  el.textContent=msg; document.body.appendChild(el);
  setTimeout(()=>{el.style.transition='opacity .3s';el.style.opacity='0';setTimeout(()=>el.remove(),300);},2600);
}
async function apiGet(method, params={}){
  const qs=new URLSearchParams(params).toString();
  const r=await fetch(`/api/method/${method}`+(qs?`?${qs}`:''),{headers:{'Accept':'application/json','X-Frappe-CSRF-Token':window.csrf_token||''},credentials:'same-origin'});
  if(!r.ok) throw new Error('HTTP '+r.status); return (await r.json()).message;
}
async function apiPost(method, args={}){
  const r=await fetch(`/api/method/${method}`,{method:'POST',credentials:'same-origin',headers:{'Accept':'application/json','Content-Type':'application/json','X-Frappe-CSRF-Token':window.csrf_token||''},body:JSON.stringify(args)});
  let d={}; try{d=await r.json();}catch(e){}
  if(!r.ok){let m=d.exception||'';try{const sm=JSON.parse(d._server_messages||'[]');if(sm.length)m=JSON.parse(sm[0]).message||m;}catch(e){}throw new Error(m||('HTTP '+r.status));}
  return d.message;
}
const PF='himedic_crm.api.portal';
async function run(fn){ try{ await fn(); }catch(e){ toast(e.message||String(e),'err'); } }

// ---------- login ----------
function screenLogin(){
  document.getElementById('p-who').textContent='';
  MAIN().innerHTML = `
    <div class="text-center mb-6 mt-4">
      <div class="text-lg font-bold text-slate-800">Cổng tra cứu khách hàng</div>
      <p class="text-sm text-slate-500 mt-1">Đăng nhập bằng số điện thoại đã đăng ký</p>
    </div>
    <div class="space-y-3">
      <input id="p-phone" type="tel" inputmode="numeric" placeholder="Số điện thoại" class="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-brand-600">
      <button id="p-send" class="w-full py-3 bg-brand-700 text-white rounded-xl font-medium">Gửi mã OTP</button>
      <div id="p-otp-block" class="hidden space-y-3 pt-2">
        <input id="p-otp" inputmode="numeric" placeholder="Nhập mã OTP" class="w-full px-4 py-3 border border-slate-300 rounded-xl text-center tracking-widest outline-none focus:border-brand-600">
        <button id="p-verify" class="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium">Xác nhận & đăng nhập</button>
        <p class="text-xs text-slate-400 text-center">Mã OTP gửi qua Zalo/SMS, hiệu lực 5 phút.</p>
      </div>
    </div>`;
  document.getElementById('p-send').onclick = ()=>{
    const phone=document.getElementById('p-phone').value.trim();
    if(!phone) return toast('Nhập số điện thoại','err');
    run(async ()=>{ await apiPost(`${PF}.request_otp`, {phone}); document.getElementById('p-otp-block').classList.remove('hidden'); toast('Đã gửi OTP'); });
  };
  document.getElementById('p-verify').onclick = ()=>{
    const phone=document.getElementById('p-phone').value.trim();
    const code=document.getElementById('p-otp').value.trim();
    run(async ()=>{ const r=await apiPost(`${PF}.verify_otp`, {phone, code}); if(r&&r.ok){ toast('Đăng nhập thành công'); location.reload(); } });
  };
}

// ---------- dashboard ----------
async function screenDashboard(){
  document.getElementById('p-who').textContent = window.hmFullname || 'Khách hàng';
  MAIN().innerHTML = `<div class="text-center text-slate-400 pt-10">Đang tải…</div>`;
  const [appts, results] = await Promise.all([
    apiGet(`${PF}.my_appointments`).catch(()=>[]),
    apiGet(`${PF}.my_results`).catch(()=>[]),
  ]);
  MAIN().innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div class="font-semibold text-slate-800">Xin chào 👋</div>
      <button id="p-logout" class="text-xs text-slate-400">Đăng xuất</button>
    </div>

    <div class="text-xs font-semibold text-slate-500 uppercase mb-2">Kết quả xét nghiệm</div>
    ${results.length ? results.map(r=>`
      <div class="bg-white rounded-xl border border-slate-200 p-3 mb-2 flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-emerald-500 text-white grid place-items-center">✓</div>
        <div class="flex-1"><div class="font-medium text-sm">Kết quả ${dfmt(r.result_date)}</div>
          <div class="text-xs text-slate-500">${r.sample_order||''}</div></div>
        ${r.file_pdf?`<a href="${r.file_pdf}" target="_blank" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg">Tải PDF</a>`:'<span class="text-xs text-slate-400">Đang xử lý</span>'}
      </div>`).join('') : `<div class="bg-white rounded-xl border border-slate-200 p-4 text-center text-sm text-slate-400 mb-4">Chưa có kết quả</div>`}

    <div class="text-xs font-semibold text-slate-500 uppercase mb-2 mt-5">Lịch hẹn</div>
    ${appts.length ? appts.map(a=>`
      <div class="bg-white rounded-xl border border-slate-200 p-3 mb-2">
        <div class="flex items-center justify-between"><b class="text-sm">${dfmt(a.appointment_date)} ${String(a.appointment_time||'').slice(0,5)}</b>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-${STATUS_COLOR[a.status]||'slate'}-100 text-${STATUS_COLOR[a.status]||'slate'}-700">${a.status}</span></div>
        <div class="text-xs text-slate-500 mt-0.5">📍 ${a.address||'—'}</div>
      </div>`).join('') : `<div class="bg-white rounded-xl border border-slate-200 p-4 text-center text-sm text-slate-400">Chưa có lịch hẹn</div>`}

    <div class="mt-6 bg-brand-50 border border-cyan-200 rounded-xl p-4">
      <div class="font-medium text-sm text-brand-900">Đồng ý xử lý dữ liệu y tế (PDPA)</div>
      <p class="text-xs text-slate-600 mt-1">Cho phép Hi-Medic xử lý dữ liệu y tế của bạn để cung cấp dịch vụ.</p>
      <button id="p-consent" class="mt-2 px-3 py-1.5 bg-brand-700 text-white rounded-lg text-sm">Tôi đồng ý</button>
    </div>`;
  document.getElementById('p-logout').onclick = ()=>{ location.href='/?cmd=logout'; };
  document.getElementById('p-consent').onclick = ()=> run(async ()=>{ await apiPost(`${PF}.consent_pdpa`, {consent_version:'v1.0'}); toast('Cảm ơn, đã ghi nhận đồng ý'); });
}

// boot
if(window.hmIsCustomer) screenDashboard().catch(e=>{ MAIN().innerHTML=`<div class="text-rose-600 text-sm">Lỗi: ${e.message}</div>`; });
else screenLogin();
