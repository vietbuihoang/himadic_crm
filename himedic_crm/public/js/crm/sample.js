import { api, apiPost, refresh } from './app.js';
import { tag, dfmt, screenHeader, emptyState, errorCard, demoMark } from './lib.js';
import { toast, openModal, field, selectField, textareaField } from './ui.js';

const SF = 'himedic_crm.sample.flows';
const LF = 'himedic_crm.logistics.flows';

let curSO = null;            // name of the sample order being acted on
let rowsByName = {};         // lookup of last-fetched rows by SO name

async function run(fn){ try { await fn(); } catch(e){ toast(e.message||String(e), 'err'); } }

const sched = r => {
  const d = dfmt(r.appointment_date);
  const t = r.appointment_time ? String(r.appointment_time).slice(0, 5) : '';
  return t ? `${d} · ${t}` : d;
};

window.__sampleUI = {
  async assign(name){
    curSO = name;
    const row = rowsByName[name] || {};
    let users = [];
    try { const u = await api('admin','users'); users = (u.rows||[]).map(r=>r.name); }
    catch(e){ toast(e.message||String(e), 'err'); return; }
    openModal({ title:`Phân công · ${name}`, submitLabel:'Phân công',
      bodyHtml: selectField('Nhân viên','user', users, row.assigned_to || ''),
      onSubmit: async (v)=>{
        await apiPost(`${SF}.assign`, { sample_order: name, user: v.user });
        toast(`Đã phân công ${name} → ${v.user}`); refresh();
      }});
  },
  confirm(name){
    curSO = name;
    run(async ()=>{
      await apiPost(`${SF}.confirm`, { sample_order: name });
      toast(`Đã xác nhận ${name}`); refresh();
    });
  },
  cancel(name){
    curSO = name;
    openModal({ title:`Hủy đơn · ${name}`, submitLabel:'Hủy đơn',
      bodyHtml: textareaField('Lý do hủy','reason','Nhập lý do hủy…'),
      onSubmit: async (v)=>{
        await apiPost(`${SF}.cancel`, { sample_order: name, reason: v.reason });
        toast(`Đã hủy ${name}`); refresh();
      }});
  },
  createManifest(){
    const names = Object.values(rowsByName).filter(r=>r.status==='Đã lấy mẫu').map(r=>r.name);
    if(!names.length){ toast('Không có đơn Đã lấy mẫu để gom','err'); return; }
    openModal({ title:`Gom mẫu → Tạo manifest (${names.length} đơn)`, submitLabel:'Tạo manifest',
      bodyHtml: field('Shipper','shipper') + field('Số seal','seal_no',{required:true}) + field('Lab nhận','to_lab'),
      onSubmit: async (v)=>{
        const r = await apiPost(`${LF}.create_manifest`, {
          sample_orders: JSON.stringify(names), shipper: v.shipper, seal_no: v.seal_no, to_lab: v.to_lab });
        toast(`Đã tạo manifest ${r.name||r.manifest||''}`); refresh();
      }});
  },
};

const rowActions = r => {
  const n = r.name;
  if(!n) return '';
  const btns = [
    `<button onclick="window.__sampleUI.assign('${n}')" class="text-xs px-2 py-1 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100">Phân công</button>`,
  ];
  if(r.status === 'Đã phân công')
    btns.push(`<button onclick="window.__sampleUI.confirm('${n}')" class="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100">Xác nhận</button>`);
  btns.push(`<button onclick="window.__sampleUI.cancel('${n}')" class="text-xs px-2 py-1 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100">Hủy</button>`);
  return `<div class="flex gap-1.5 justify-end">${btns.join('')}</div>`;
};

export const list = async () => {
  let data;
  try { data = await api('sample', 'list'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const sc = data.status_color || {};
  rowsByName = {};
  rows.forEach(r=>{ if(r.name) rowsByName[r.name] = r; });
  const head = screenHeader('Đơn lấy mẫu',
    `Tổng ${data.total||0} đơn · Sáng 28 · Chiều 14 · Đã hoàn thành 9/42 ${demoMark}`,
    `<button onclick="window.__sampleUI.createManifest()" class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">Gom mẫu → Tạo manifest</button>`);
  if(!rows.length) return head + emptyState('Chưa có đơn lấy mẫu');
  const tiles = [
    ['Chờ phân công','8','amber'],
    ['Đã phân công','25','blue'],
    ['Đang đi','7','violet'],
    ['Đã lấy mẫu','9','emerald'],
  ];
  return head + `
    <div class="p-6 grid grid-cols-4 gap-4 pb-0">
      ${tiles.map(([l,v,c])=>`<div class="bg-white rounded-xl border border-slate-200 p-4"><div class="text-xs text-slate-500">${l}</div><div class="text-2xl font-bold text-${c}-600 mt-1">${v} ${demoMark}</div></div>`).join('')}
    </div>
    <div class="p-6">
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide"><tr>
            <th class="text-left p-3">SO #</th><th class="text-left p-3">Khách hàng</th>
            <th class="text-left p-3">Địa điểm</th><th class="text-left p-3">Khu vực</th>
            <th class="text-left p-3">Lịch</th><th class="text-left p-3">Phlebotomist</th>
            <th class="text-left p-3">Ống mẫu</th><th class="text-left p-3">Trạng thái</th><th></th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100">
            ${rows.map(r=>`
              <tr class="hover:bg-slate-50">
                <td class="p-3 font-mono text-xs">${r.name||'—'}</td>
                <td class="p-3 font-medium">${r.contact||'—'}</td>
                <td class="p-3 text-slate-600">${r.address||'—'}</td>
                <td class="p-3 text-slate-600">${r.region||'—'}</td>
                <td class="p-3 text-slate-600">${sched(r)}</td>
                <td class="p-3 text-slate-600">${r.assigned_to||'Chưa phân'}</td>
                <td class="p-3 text-slate-600">${r.total_tubes!=null?r.total_tubes:'—'}</td>
                <td class="p-3">${tag(r.status||'—', sc[r.status]||'slate')}</td>
                <td class="p-3">${rowActions(r)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">Hiển thị ${rows.length} / ${data.total||rows.length} đơn</div>
      </div>
    </div>`;
};
