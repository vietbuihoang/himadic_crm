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
  { id:'catalog', name:'6. Danh mục Xét nghiệm', icon:'flask', screens:[{id:'tests',name:'Danh mục test'},{id:'packages',name:'Gói combo'}] },
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
window.__api = api;

// POST to any whitelisted dotted method path (write operations).
export async function apiPost(method, args={}){
  const res = await fetch(`/api/method/${method}`, {
    method:'POST', credentials:'same-origin',
    headers:{ 'Accept':'application/json', 'Content-Type':'application/json', 'X-Frappe-CSRF-Token': window.csrf_token||'' },
    body: JSON.stringify(args),
  });
  let data = {};
  try { data = await res.json(); } catch(e){ /* non-JSON */ }
  if(!res.ok){
    let msg = data.exception || '';
    try {
      const sm = JSON.parse(data._server_messages || '[]');
      if(sm.length) msg = JSON.parse(sm[0]).message || msg;
    } catch(e){ /* ignore */ }
    throw new Error(msg || ('HTTP '+res.status));
  }
  return data.message;
}
window.__apiPost = apiPost;

// Re-render the currently routed screen (after a mutating action).
export function refresh(){ const [m,s]=fromHash(); select(m,s); }
window.hmRefresh = refresh;

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
    `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white grid place-items-center text-sm font-semibold">${(window.hmFullname||'U')[0]}</div>
     <div class="text-xs leading-tight"><div class="font-medium">${window.hmFullname||'User'}</div><div class="text-slate-500">${window.hmUser||''}</div></div>`;
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
  const parts = location.hash.replace(/^#/,'').split('/');
  return parts[0] ? [parts[0], parts[1]] : ['overview','home'];
}
window.addEventListener('hashchange', ()=>{ const [m,s]=fromHash(); select(m,s); });
buildSidebar();
{ const [m,s]=fromHash(); select(m,s); }
