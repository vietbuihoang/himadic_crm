import { api, apiPost, refresh } from './app.js';
import { tag, avatar, initials, money, dfmt, screenHeader, emptyState, errorCard, demoMark } from './lib.js';
import { toast, openModal, field, selectField, textareaField } from './ui.js';

const STAGE_COLOR = {'Thẩm định':'sky','Báo giá':'amber','Đàm phán':'violet','Đã chốt':'emerald','Thất bại':'rose'};
const org = d => d.organization || d.contact || '—';
const DF = 'himedic_crm.deal.flows';
let curDeal = null;

async function run(fn){ try { await fn(); } catch(e){ toast(e.message||String(e), 'err'); } }
window.__dealOpen = (name)=>{ curDeal = name; window.__select('deal','detail'); };

window.__dealUI = {
  action(act, label){ run(async ()=>{
    const r = await apiPost(`${DF}.apply_action`, { deal_name: curDeal, action: act });
    toast(`${label}: → ${r.status}`); refresh(); }); },
  closeWon(){
    openModal({ title:'Chốt cơ hội → Tạo đơn lấy mẫu', submitLabel:'Chốt Won',
      bodyHtml: field('Lý do thắng','win_reason',{required:true,placeholder:'VD: giá tốt, dịch vụ tận nơi'})
        + field('Ngày hẹn lấy mẫu','appointment_date',{type:'date'}),
      onSubmit: async (v)=>{
        const r = await apiPost(`${DF}.close_won`, { deal_name: curDeal, win_reason: v.win_reason, appointment_date: v.appointment_date||null });
        toast(`Đã chốt Won · tạo đơn lấy mẫu ${r.sample_order||''}`); refresh(); }});
  },
  closeLost(){
    openModal({ title:'Đánh dấu Thất bại', submitLabel:'Xác nhận',
      bodyHtml: textareaField('Lý do thua (bắt buộc – BR-D-015)','lost_reason','VD: khách chọn đối thủ, ngân sách'),
      onSubmit: async (v)=>{
        if(!v.lost_reason) throw new Error('Phải nhập lý do thua');
        await apiPost(`${DF}.close_lost`, { deal_name: curDeal, lost_reason: v.lost_reason });
        toast('Đã đánh dấu Thất bại'); refresh(); }});
  },
  addService(){
    run(async ()=>{
      const [pkgs, deal] = [await api('catalog','package'), await api('deal','detail',{name:curDeal})];
      const options = (pkgs.rows||[]).map(p=>p.package_name);
      const priceByName = {}; (pkgs.rows||[]).forEach(p=>priceByName[p.package_name]={code:p.name,price:p.retail_price||0});
      openModal({ title:'Thêm dịch vụ vào cơ hội', submitLabel:'Thêm',
        bodyHtml: selectField('Gói dịch vụ','pkg',options) + field('Số lượng','qty',{type:'number',value:'1'}),
        onSubmit: async (v)=>{
          const pk = priceByName[v.pkg]; const qty = Number(v.qty||1);
          const existing = (deal.items||[]).map(i=>({test_or_package:i.test_or_package, test:i.test, package:i.package,
            item_name:i.item_name, qty:i.qty, price:i.price, amount:i.amount}));
          existing.push({test_or_package:'Package', package:pk.code, item_name:v.pkg, qty, price:pk.price, amount:pk.price*qty});
          const r = await apiPost(`${DF}.set_items`, { deal_name: curDeal, items: JSON.stringify(existing) });
          toast(`Đã cập nhật dịch vụ · tổng ${money(r.grand_total)}`); refresh(); }});
    });
  },
  applyDiscount(){
    const pct = (document.getElementById('hm-disc')||{}).value;
    run(async ()=>{
      const r = await apiPost(`${DF}.request_discount`, { deal_name: curDeal, discount_pct: pct||0 });
      toast(r.approval_status==='Đang chờ' ? 'Chiết khấu ≥5% → đã gửi duyệt (BR-D-010)' : `Đã áp chiết khấu · ${r.approval_status}`);
      refresh(); }); },
  approveDisc(){ run(async ()=>{ await apiPost(`${DF}.approve_discount`, { deal_name: curDeal }); toast('Đã duyệt chiết khấu'); refresh(); }); },
  rejectDisc(){ run(async ()=>{ await apiPost(`${DF}.reject_discount`, { deal_name: curDeal, remark:'' }); toast('Đã từ chối chiết khấu'); refresh(); }); },
};

const ACTION_BTN = {
  'HM Submit':     ['Chuyển bước tiếp →','bg-brand-600 text-white', ()=>window.__dealUI.action('HM Submit','Chuyển bước')],
  'HM Close Won':  ['Chốt → Tạo đơn lấy mẫu','bg-emerald-600 text-white', ()=>window.__dealUI.closeWon()],
  'HM Close Lost': ['Đánh dấu Thất bại','bg-rose-50 text-rose-700 border border-rose-200', ()=>window.__dealUI.closeLost()],
};
window.__dealActDispatch = (a)=>{ ACTION_BTN[a] && ACTION_BTN[a][2](); };

export const kanban = async () => {
  let data;
  try { data = await api('deal', 'kanban'); } catch(e){ return errorCard(e); }
  const cols = data.columns || [];
  const s = data.summary || {};
  const head = screenHeader('Luồng Cơ hội',
    `Cơ hội đang mở ${s.open||0} · Dự báo T6: 4.8 tỷ · Tỷ lệ chốt: 32% ${demoMark}`,
    `<span class="text-xs text-slate-400">Bấm thẻ để mở & thao tác</span>`);
  if(!cols.length) return head + emptyState('Chưa có cơ hội');
  return head + `
    <div class="p-6">
      <div class="flex gap-3 overflow-x-auto pb-4 scroll-thin">
        ${cols.map(c=>`
          <div class="w-72 flex-shrink-0">
            <div class="flex items-center justify-between mb-2 px-1">
              <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-${c.color}-500"></span>
                <div class="font-semibold text-sm text-slate-700">${c.stage}</div></div>
              <div class="text-xs text-slate-500"><b>${c.count}</b> · ${money(c.value)}</div>
            </div>
            <div class="bg-slate-50 rounded-xl p-2 min-h-[400px] space-y-2 border border-slate-200/60">
              ${(c.cards||[]).map(d=>`
                <div class="kanban-card bg-white rounded-lg p-3 border border-slate-200 cursor-pointer" onclick="window.__dealOpen('${d.name}')">
                  <div class="text-sm font-medium text-slate-800 leading-snug">${d.deal_title||'—'}</div>
                  <div class="text-xs text-slate-500 mt-1">${org(d)}</div>
                  <div class="mt-2 flex items-center justify-between">
                    <div class="font-bold text-emerald-600 text-sm">${money(d.grand_total)}</div>
                    <div class="text-xs px-1.5 py-0.5 rounded bg-slate-100">${d.probability||0}%</div>
                  </div>
                  <div class="mt-2 flex gap-1 flex-wrap text-[10px]">${tag(d.deal_type||'—','slate')}</div>
                  <div class="mt-2 flex items-center justify-between text-[11px]">${avatar(initials(d.owner_user))}
                    <span class="text-slate-400">Đóng: ${dfmt(d.expected_close_date)}</span></div>
                </div>`).join('') || `<div class="text-center text-xs text-slate-300 pt-8">—</div>`}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
};

export const detail = async () => {
  let d;
  try {
    if(!curDeal){ const k = await api('deal','detail'); d = k; curDeal = k && k.name; }
    else d = await api('deal','detail',{name:curDeal});
  } catch(e){ return errorCard(e); }
  if(!d) return emptyState('Chưa có cơ hội');
  curDeal = d.name;
  const items = d.items || [];
  const trans = d.transitions || [];
  const actionBtns = trans.filter(a=>ACTION_BTN[a]).map(a=>{
    const [label, cls] = ACTION_BTN[a];
    return `<button onclick="window.__dealActDispatch('${a}')" class="px-3 py-1.5 text-sm rounded-lg ${cls}">${label}</button>`;
  }).join('');
  const head = screenHeader(`Cơ hội · ${d.deal_title||''}${org(d)!=='—'?' – '+org(d):''}`,
    `Giá trị ${money(d.grand_total)} · ${tag(d.status,STAGE_COLOR[d.status]||'slate')} · ${d.probability||0}% · Dự kiến chốt ${dfmt(d.expected_close_date)}`,
    actionBtns || `<span class="text-xs text-slate-400">Không có thao tác khả dụng</span>`);
  const STAGES = ['Thẩm định','Báo giá','Đàm phán','Đã chốt'];
  const curIdx = Math.max(0, STAGES.indexOf(d.status));
  const ds = d.discount_approval_status;
  const dsBadge = ds==='Đang chờ' ? tag('Chờ duyệt','amber') : ds==='Đã duyệt' ? tag('Đã duyệt','emerald') : ds==='Từ chối' ? tag('Từ chối','rose') : '';
  return head + `
    <div class="p-6 grid grid-cols-3 gap-6">
      <div class="col-span-2 space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="flex items-center gap-1 text-xs font-medium">
            ${STAGES.map((st,i)=>`<div class="flex-1 flex items-center gap-1">
              <div class="flex-1 h-7 grid place-items-center rounded ${i<=curIdx?'bg-violet-500 text-white':'bg-slate-50 text-slate-400'}">${st}</div>
              ${i<STAGES.length-1?'<svg class="w-3 h-3 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path d="M7 5l6 5-6 5V5z"/></svg>':''}</div>`).join('')}
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200">
          <div class="px-4 py-3 border-b border-slate-100 flex items-center text-sm">
            <span class="font-semibold">Dịch vụ trong Cơ hội</span>
            <button onclick="window.__dealUI.addService()" class="ml-auto text-xs px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg">+ Thêm dịch vụ</button>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500"><tr>
              <th class="text-left p-3">Gói / Test</th><th class="text-left p-3">SL</th>
              <th class="text-right p-3">Đơn giá</th><th class="text-right p-3">Thành tiền</th></tr></thead>
            <tbody class="divide-y divide-slate-100">
              ${items.length ? items.map(it=>`<tr><td class="p-3"><b>${it.item_name||'—'}</b></td>
                <td class="p-3">${it.qty||0}</td><td class="p-3 text-right">${money(it.price)}</td>
                <td class="p-3 text-right font-medium">${money(it.amount)}</td></tr>`).join('') +
                `<tr class="bg-slate-50 font-semibold"><td class="p-3" colspan="3">Tổng</td>
                  <td class="p-3 text-right text-emerald-700">${money(d.grand_total)}</td></tr>`
              : `<tr><td colspan="4" class="p-6 text-center text-slate-400 text-xs">Chưa có dịch vụ — bấm “+ Thêm dịch vụ”</td></tr>`}
            </tbody>
          </table>
          <div class="p-3 border-t border-slate-100 text-xs flex items-center gap-2 flex-wrap bg-slate-50">
            <span>Chiết khấu:</span>
            <input id="hm-disc" type="number" value="${d.discount_pct||0}" class="w-16 px-2 py-1 border border-slate-300 rounded">%
            <button onclick="window.__dealUI.applyDiscount()" class="px-2.5 py-1 bg-brand-600 text-white rounded">Áp dụng</button>
            ${dsBadge}
            ${ds==='Đang chờ' ? `<span class="ml-2"></span>
              <button onclick="window.__dealUI.approveDisc()" class="px-2.5 py-1 bg-emerald-600 text-white rounded">Duyệt</button>
              <button onclick="window.__dealUI.rejectDisc()" class="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded">Từ chối</button>` : ''}
            <span class="ml-auto text-slate-400">≥5% cần duyệt · ≥10% lên GĐ (BR-D-010)</span>
          </div>
        </div>
      </div>
      <div class="space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-sm">
          <div class="font-semibold mb-3">Thông tin Cơ hội</div>
          <dl class="space-y-2">
            <div class="flex justify-between"><dt class="text-slate-500">Khách hàng</dt><dd class="font-medium">${org(d)}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Loại</dt><dd class="font-medium">${d.deal_type||'—'}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Khu vực</dt><dd class="font-medium">${d.region||'—'}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Phụ trách</dt><dd class="font-medium">${d.owner_user||'—'}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Giá trị</dt><dd class="font-bold text-emerald-600">${money(d.grand_total)}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Xác suất</dt><dd class="font-bold">${d.probability||0}%</dd></div>
          </dl>
        </div>
        ${d.sample_order?`<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
          ✓ Đã tạo đơn lấy mẫu: <b>${d.sample_order}</b> <button class="underline" onclick="window.__select('sample','list')">xem</button></div>`:''}
      </div>
    </div>`;
};
