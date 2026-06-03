import { api, apiPost, refresh } from './app.js';
import { tag, avatar, initials, dfmt, screenHeader, emptyState, errorCard, disabledBtn, demoMark } from './lib.js';
import { toast, openModal, field, selectField, textareaField } from './ui.js';

const STAGE_COLOR = {'Mới':'sky','Đã liên hệ':'amber','Đủ điều kiện':'emerald','Chăm sóc':'violet','Đã chuyển đổi':'cyan','Đã hủy':'rose'};
const scoreColor = s => s>=80?'emerald':s>=60?'amber':'rose';
const sourceColor = s => ({'FB Ads':'blue','Google Ads':'amber','Zalo OA':'sky','Hotline':'rose','Walk-in':'violet','Referral':'cyan'}[s]||'slate');
const org = l => l.organization_name || l.customer_type || '—';

const SOURCES = ['FB Ads','Google Ads','Zalo OA','Hotline','Walk-in','Referral','Landing Page','KOL/PR'];
const REGIONS = ['Q.7','Q.10','Q.12','Bình Tân','Bình Thạnh'];
const CTYPES = ['Cá nhân','Phòng khám','Bệnh viện','Doanh nghiệp','Bảo hiểm'];
const DEAL_TYPES = ['Đơn lẻ','Gói combo','HĐ dài hạn B2B'];

let curLead = null;  // name of the lead shown on the detail screen

// ---- action handlers (exposed for inline onclick) ----
const LF = 'himedic_crm.lead.flows';
async function run(fn){ try { await fn(); } catch(e){ toast(e.message||String(e), 'err'); } }

window.__leadUI = {
  openCreate(){
    openModal({ title:'Thêm khách tiềm năng', submitLabel:'Tạo',
      bodyHtml: field('Họ tên','lead_name',{required:true}) + field('SĐT','phone',{required:true})
        + field('Email','email',{type:'email'}) + selectField('Loại khách','customer_type',CTYPES)
        + selectField('Nguồn','source',SOURCES) + selectField('Khu vực','region',REGIONS),
      onSubmit: async (v)=>{
        const r = await apiPost(`${LF}.create_lead`, { payload: JSON.stringify(v) });
        toast(`Đã tạo lead ${r.name}`); refresh();
      }});
  },
  action(act, label){
    run(async ()=>{
      const r = await apiPost(`${LF}.apply_action`, { lead_name: curLead, action: act });
      toast(`${label}: → ${r.status}`); refresh();
    });
  },
  log(type){
    const note = (document.getElementById('hm-act-note')||{}).value || '';
    run(async ()=>{
      await apiPost(`${LF}.log_activity`, { lead_name: curLead, activity_type: type, note });
      toast(`Đã ghi: ${type}`); refresh();
    });
  },
  convert(){
    openModal({ title:'Convert → Tạo cơ hội', submitLabel:'Tạo cơ hội',
      bodyHtml: field('Giá trị dự kiến (đ)','deal_value',{type:'number',value:'0'})
        + selectField('Loại cơ hội','deal_type',DEAL_TYPES)
        + field('Ngày dự kiến chốt','expected_close_date',{type:'date'}),
      onSubmit: async (v)=>{
        const r = await apiPost('himedic_crm.lead.conversion.convert_lead', {
          lead_name: curLead, deal_value: v.deal_value||0, deal_type: v.deal_type,
          expected_close_date: v.expected_close_date||null });
        toast(`Đã tạo cơ hội ${r.deal}`);
        window.__select('deal','detail');
      }});
  },
};

// map a workflow action → a labelled button
const ACTION_BTN = {
  'HM Submit':  ['Chuyển bước tiếp →','bg-brand-600 text-white', a=>window.__leadUI.action('HM Submit','Chuyển bước')],
  'HM Nurture': ['Đưa vào Chăm sóc','bg-violet-50 text-violet-700 border border-violet-200', a=>window.__leadUI.action('HM Nurture','Chăm sóc')],
  'HM Cancel':  ['Đánh dấu Đã hủy','bg-white border border-slate-200 text-slate-600', a=>window.__leadUI.action('HM Cancel','Hủy')],
  'HM Convert': ['Convert → Tạo cơ hội','bg-emerald-600 text-white', a=>window.__leadUI.convert()],
};

export const list = async () => {
  let data;
  try { data = await api('lead', 'list'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const s = data.summary || {};
  const head = screenHeader('Danh sách Khách tiềm năng',
    `Tổng ${s.total||0} khách · ${s.new_today||0} mới hôm nay · Mục tiêu phản hồi 30 phút ${demoMark}`,
    `<button onclick="window.__leadUI.openCreate()" class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">+ Thêm khách</button>`);
  if(!rows.length) return head + emptyState('Chưa có khách tiềm năng');
  return head + `
    <div class="p-6">
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide"><tr>
            <th class="text-left p-3">Tên / Đơn vị</th><th class="text-left p-3">Liên hệ</th>
            <th class="text-left p-3">Nguồn</th><th class="text-left p-3">Score</th>
            <th class="text-left p-3">Trạng thái</th><th class="text-left p-3">Khu vực</th>
            <th class="text-left p-3">Phụ trách</th><th class="text-left p-3">Cập nhật</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100">
            ${rows.map(l=>`
              <tr class="hover:bg-slate-50 cursor-pointer" onclick="window.__leadOpen('${l.name}')">
                <td class="p-3"><div class="font-medium text-slate-800">${l.lead_name||'—'}</div>
                  <div class="text-xs text-slate-500">${org(l)}</div></td>
                <td class="p-3 text-slate-600">${l.phone||'—'}</td>
                <td class="p-3">${tag(l.source||'—', sourceColor(l.source))}</td>
                <td class="p-3"><div class="flex items-center gap-2">
                  <div class="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full bg-${scoreColor(l.score)}-500" style="width:${l.score||0}%"></div></div>
                  <span class="text-xs font-medium">${l.score||0}</span></div></td>
                <td class="p-3">${tag(l.status||'—', STAGE_COLOR[l.status]||'slate')}</td>
                <td class="p-3 text-slate-600">${l.region||'—'}</td>
                <td class="p-3"><div class="flex items-center gap-2">${avatar(initials(l.owner_user))}<span class="text-xs">${l.owner_user||'—'}</span></div></td>
                <td class="p-3 text-xs text-slate-500">${dfmt(l.modified)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">Hiển thị ${rows.length} / ${s.total||rows.length} lead</div>
      </div>
    </div>`;
};

// open a specific lead's detail (stash its id, then route)
window.__leadOpen = (name)=>{ curLead = name; window.__select('lead','detail'); };

export const kanban = async () => {
  let data;
  try { data = await api('lead', 'kanban'); } catch(e){ return errorCard(e); }
  const cols = data.columns || [];
  const head = screenHeader('Luồng chuyển đổi khách – Kanban', 'Bấm vào thẻ để mở & thao tác theo nghiệp vụ', '');
  return head + `
    <div class="p-6">
      <div class="flex gap-3 overflow-x-auto pb-4 scroll-thin">
        ${cols.map(c=>`
          <div class="w-72 flex-shrink-0">
            <div class="flex items-center gap-2 mb-2 px-1">
              <span class="w-2 h-2 rounded-full bg-${c.color}-500"></span>
              <span class="text-sm font-semibold text-slate-700">${c.stage}</span>
              <span class="text-xs text-slate-500 bg-slate-200 px-1.5 rounded">${c.count}</span>
            </div>
            <div class="bg-slate-50 rounded-xl p-2 min-h-[400px] space-y-2 border border-slate-200/60">
              ${(c.cards||[]).map(l=>`
                <div class="kanban-card bg-white rounded-lg p-3 border border-slate-200 cursor-pointer" onclick="window.__leadOpen('${l.name}')">
                  <div class="flex items-start justify-between gap-2">
                    <div class="font-medium text-sm text-slate-800">${l.lead_name||'—'}</div>
                    <span class="text-[10px] font-bold text-${scoreColor(l.score)}-600">${l.score||0}</span>
                  </div>
                  <div class="text-xs text-slate-500 mt-1">${org(l)}</div>
                  <div class="mt-2 flex gap-1 flex-wrap">${tag(l.source||'—','slate')}${tag(l.region||'—','slate')}</div>
                  <div class="mt-2 flex items-center justify-between">
                    ${avatar(initials(l.owner_user))}
                    <span class="text-[11px] text-slate-400">${dfmt(l.modified)}</span>
                  </div>
                </div>`).join('') || `<div class="text-center text-xs text-slate-300 pt-8">—</div>`}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
};

export const detail = async () => {
  let d;
  try {
    if(!curLead){ const { rows } = await api('lead','list',{limit:1}); curLead = rows && rows[0] ? rows[0].name : null; }
    d = curLead ? await api('lead','detail',{ name: curLead }) : null;
  } catch(e){ return errorCard(e); }
  if(!d) return emptyState('Chưa có khách tiềm năng');
  curLead = d.name;
  const acts = d.activities || [];
  const trans = d.transitions || [];
  const actionBtns = trans.filter(a=>ACTION_BTN[a]).map(a=>{
    const [label, cls] = ACTION_BTN[a];
    return `<button onclick="window.__leadActDispatch('${a}')" class="px-3 py-1.5 text-sm rounded-lg ${cls}">${label}</button>`;
  }).join('');
  window.__leadActDispatch = (a)=>{ ACTION_BTN[a] && ACTION_BTN[a][2](a); };

  const head = screenHeader(`Khách tiềm năng · ${d.lead_name||''}`,
    `Nguồn ${d.source||'—'} · ${tag(d.status,STAGE_COLOR[d.status]||'slate')} · Cập nhật ${dfmt(d.modified)}`,
    actionBtns || `<span class="text-xs text-slate-400">Không có thao tác khả dụng ở trạng thái này</span>`);
  const STAGES = ['Mới','Đã liên hệ','Đủ điều kiện','Chăm sóc','Đã chuyển đổi'];
  const curIdx = Math.max(0, STAGES.indexOf(d.status));
  const ACTS = [['Cuộc gọi','📞'],['Email','✉'],['Zalo','💬'],['Ghi chú','📝']];
  return head + `
    <div class="p-6 grid grid-cols-3 gap-6">
      <div class="col-span-2 space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="flex items-center gap-1 text-xs font-medium">
            ${STAGES.map((st,i)=>`
              <div class="flex-1 flex items-center gap-1">
                <div class="flex-1 h-7 grid place-items-center rounded ${i===curIdx?'bg-sky-500 text-white':i<curIdx?'bg-slate-100 text-slate-500':'bg-slate-50 text-slate-400'}">${st}</div>
                ${i<STAGES.length-1?'<svg class="w-3 h-3 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path d="M7 5l6 5-6 5V5z"/></svg>':''}
              </div>`).join('')}
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200">
          <div class="px-4 py-3 border-b border-slate-100 text-sm font-semibold">Lịch sử hoạt động</div>
          <div class="p-4 space-y-4 text-sm">
            ${acts.length ? acts.map(a=>`
              <div class="flex gap-3">
                <div class="w-8 h-8 rounded-full bg-sky-100 text-sky-600 grid place-items-center flex-shrink-0 text-xs">●</div>
                <div class="flex-1"><div class="flex items-center justify-between">
                  <div><b>${a.activity_type||'Hoạt động'}</b>${a.note?' — '+a.note:(a.subject?' — '+a.subject:'')}</div>
                  <span class="text-xs text-slate-400">${dfmt(a.activity_time)}</span></div></div>
              </div>`).join('') : `<div class="text-slate-400 text-xs">Chưa có hoạt động ghi nhận</div>`}
          </div>
          <div class="p-4 border-t border-slate-100">
            <textarea id="hm-act-note" class="w-full border border-slate-200 rounded-lg p-2 text-sm" rows="2" placeholder="Nội dung cuộc gọi / ghi chú…"></textarea>
            <div class="mt-2 flex gap-2 text-sm flex-wrap">
              ${ACTS.map(([t,ic])=>`<button onclick="window.__leadUI.log('${t}')" class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">${ic} ${t}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="flex items-center gap-3">
            <div class="w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white grid place-items-center text-lg font-bold">${initials(d.lead_name)}</div>
            <div><div class="font-semibold">${d.lead_name||'—'}</div>
            <div class="text-xs text-slate-500">${d.customer_type||'—'}</div></div>
          </div>
          <dl class="mt-4 space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-slate-500">SĐT</dt><dd class="font-medium">${d.phone||'—'}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Email</dt><dd class="font-medium">${d.email||'—'}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Khu vực</dt><dd class="font-medium">${d.region||'—'}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Score</dt><dd class="font-bold text-${scoreColor(d.score)}-600">${d.score||0} / 100</dd></div>
          </dl>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-sm">
          <div class="font-semibold mb-2">Nguồn & Chiến dịch</div>
          <div class="space-y-1.5 text-xs">
            <div>Nguồn: ${tag(d.source||'—', sourceColor(d.source))}</div>
            <div>Chiến dịch: <b>${d.campaign||'—'}</b></div>
            <div>Cost / lead: <b>87.000đ</b> ${demoMark}</div>
          </div>
        </div>
        ${d.converted_deal?`<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
          ✓ Đã chuyển đổi → <button class="underline" onclick="window.__select('deal','detail')">${d.converted_deal}</button></div>`:''}
      </div>
    </div>`;
};
