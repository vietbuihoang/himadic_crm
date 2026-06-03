import { api, apiPost, refresh } from './app.js';
import { tag, money, screenHeader, emptyState, errorCard } from './lib.js';
import { toast, openModal, field, selectField } from './ui.js';

const channelColor = c => ({'FB':'blue','FB Ads':'blue','Google':'amber','Google Ads':'amber','Zalo':'sky','Zalo OA':'sky','Sự kiện':'violet'}[c]||'slate');
const statusColor = s => ({'Mở':'sky','Đang chạy':'emerald','Tạm dừng':'amber','Kết thúc':'slate','Đã kết thúc':'slate','Nháp':'slate'}[s]||'slate');

const CHANNELS = ['FB','Google','Zalo','Landing','SEO','Email','Offline'];
const STATUSES = ['Mở','Đang chạy','Tạm dừng','Kết thúc'];
const ASSIGN_TYPES = ['Round-robin','Load-balanced','Skill-based','Fixed user'];

const MF = 'himedic_crm.marketing.flows';
async function run(fn){ try { await fn(); } catch(e){ toast(e.message||String(e), 'err'); } }

window.__mktUI = {
  openCreateCampaign(){
    openModal({ title:'Thêm chiến dịch', submitLabel:'Tạo',
      bodyHtml: field('Mã chiến dịch','campaign_code',{required:true})
        + field('Tên chiến dịch','campaign_name',{required:true})
        + selectField('Kênh','channel',CHANNELS)
        + field('Ngân sách (đ)','budget',{type:'number',value:'0'}),
      onSubmit: async (v)=>{
        const r = await apiPost(`${MF}.create_campaign`, { payload: JSON.stringify(v) });
        toast(`Đã tạo chiến dịch ${r.name||v.campaign_code}`); refresh();
      }});
  },
  recomputeRoi(name){
    run(async ()=>{
      await apiPost(`${MF}.recompute_roi`, { campaign: name });
      toast('Đã tính lại ROI'); refresh();
    });
  },
  setStatus(name, status){
    run(async ()=>{
      await apiPost(`${MF}.set_status`, { name, status });
      toast(`Trạng thái → ${status}`); refresh();
    });
  },
  openCreateRule(){
    openModal({ title:'Thêm quy tắc phân khách', submitLabel:'Tạo',
      bodyHtml: field('Tên quy tắc','rule_name',{required:true})
        + selectField('Kiểu phân công','assignment_type',ASSIGN_TYPES)
        + field('Độ ưu tiên','priority',{type:'number',value:'0'})
        + field('Điểm tối thiểu','min_score',{type:'number',value:'0'}),
      onSubmit: async (v)=>{
        const r = await apiPost(`${MF}.create_rule`, { payload: JSON.stringify(v) });
        toast(`Đã tạo quy tắc ${r.name||v.rule_name}`); refresh();
      }});
  },
  toggleRule(name){
    run(async ()=>{
      await apiPost(`${MF}.toggle_rule`, { name });
      toast('Đã cập nhật trạng thái quy tắc'); refresh();
    });
  },
};

export const campaigns = async () => {
  let data;
  try { data = await api('marketing', 'campaigns'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const t = data.totals || {};
  const head = screenHeader('Hiệu quả Chiến dịch',
    `Tổng chi ${money(t.spent)} · ${t.leads||0} khách tiềm năng · Doanh thu ${money(t.revenue)} · Ngân sách ${money(t.budget)}`,
    `<button onclick="window.__mktUI.openCreateCampaign()" class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">+ Chiến dịch</button>`);
  if(!rows.length) return head + emptyState('Chưa có chiến dịch');
  const roiOverall = (t.spent ? (t.revenue/t.spent) : 0).toFixed(1);
  const cplOverall = t.leads ? Math.round(t.spent/t.leads) : 0;
  const tiles = [
    ['Chi phí / Khách', money(cplOverall), 'sky'],
    ['Tổng ngân sách', money(t.budget), 'amber'],
    ['Tổng doanh thu', money(t.revenue), 'emerald'],
    ['ROAS chung', roiOverall+'x', 'violet'],
  ];
  return head + `
    <div class="p-6 grid grid-cols-4 gap-4 mb-2">
      ${tiles.map(([l,v,c])=>`<div class="bg-white rounded-xl border border-slate-200 p-4"><div class="text-xs text-slate-500">${l}</div><div class="text-2xl font-bold text-${c}-600 mt-1">${v}</div></div>`).join('')}
    </div>
    <div class="px-6 pb-6">
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500 uppercase"><tr>
            <th class="text-left p-3">Chiến dịch</th><th class="text-left p-3">Kênh</th>
            <th class="text-right p-3">Chi phí</th><th class="text-right p-3">Khách</th>
            <th class="text-right p-3">Chi/Khách</th>
            <th class="text-right p-3">Đã chốt</th><th class="text-right p-3">Doanh thu</th>
            <th class="text-right p-3">ROAS</th><th class="text-left p-3">Trạng thái</th>
            <th class="text-right p-3">Thao tác</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100">
            ${rows.map(r=>`
              <tr class="hover:bg-slate-50">
                <td class="p-3 font-medium">${r.campaign_name||r.campaign_code||'—'}</td>
                <td class="p-3">${tag(r.channel||'—', channelColor(r.channel))}</td>
                <td class="p-3 text-right">${money(r.spent)}</td>
                <td class="p-3 text-right">${r.leads_count||0}</td>
                <td class="p-3 text-right text-slate-600">${money(r.cpl)}</td>
                <td class="p-3 text-right text-emerald-700 font-medium">${r.won_count||0}</td>
                <td class="p-3 text-right font-semibold text-emerald-700">${money(r.revenue)}</td>
                <td class="p-3 text-right font-bold">${r.roas!=null?Number(r.roas).toFixed(1)+'x':'—'}</td>
                <td class="p-3">
                  <select onchange="window.__mktUI.setStatus('${r.name}', this.value)" class="text-xs px-2 py-1 border border-slate-200 rounded-lg bg-white outline-none focus:border-brand-500">
                    ${STATUSES.map(s=>`<option value="${s}" ${s===r.status?'selected':''}>${s}</option>`).join('')}
                  </select>
                </td>
                <td class="p-3 text-right">
                  <button onclick="window.__mktUI.recomputeRoi('${r.name}')" class="text-xs px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 whitespace-nowrap">↻ Tính lại ROI</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">Hiển thị ${rows.length} chiến dịch</div>
      </div>
    </div>`;
};

const cond = r => {
  const parts = [];
  if(r.source) parts.push(`Nguồn = ${r.source}`);
  if(r.region) parts.push(`Khu vực = ${r.region}`);
  if(r.min_score) parts.push(`Điểm ≥ ${r.min_score}`);
  return parts.length ? parts.join(' VÀ ') : '(Không khớp quy tắc nào)';
};
const actionText = r => {
  if(r.assignment_type === 'Cố định' || r.assignment_type === 'Fixed user' || r.fixed_user) return `Gán cho ${r.fixed_user||'—'}`;
  if(r.team) return `${r.assignment_type||'Phân công'} trong nhóm ${r.team}`;
  return r.assignment_type || 'Vào nhóm chung – NV Kinh doanh tự nhận';
};

export const routing = async () => {
  let data;
  try { data = await api('marketing', 'routing'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const head = screenHeader('Quy tắc Phân khách tự động', 'Phân khách tiềm năng từ Tiếp thị → Kinh doanh',
    `<button onclick="window.__mktUI.openCreateRule()" class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">+ Quy tắc</button>`);
  if(!rows.length) return head + emptyState('Chưa có quy tắc phân khách');
  return head + `
    <div class="p-6 space-y-4">
      ${rows.map(r=>`
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 grid place-items-center font-bold">#${r.priority!=null?r.priority:'—'}</div>
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <div class="font-semibold">${r.rule_name||r.name||'—'}</div>
                ${tag(r.is_active?'Đang chạy':'Tắt', r.is_active?'emerald':'slate')}
                <div class="ml-auto">
                  <button onclick="window.__mktUI.toggleRule('${r.name}')" class="text-xs px-3 py-1.5 rounded-lg ${r.is_active?'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100':'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}">${r.is_active?'Tắt':'Bật'}</button>
                </div>
              </div>
              <div class="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div><div class="text-xs text-slate-500">Điều kiện</div><div class="font-mono text-xs mt-0.5 text-slate-700 bg-slate-50 p-2 rounded">${cond(r)}</div></div>
                <div><div class="text-xs text-slate-500">Hành động</div><div class="mt-0.5">${actionText(r)}</div></div>
                <div><div class="text-xs text-slate-500">Phân công</div><div class="mt-0.5 font-semibold text-emerald-700">${r.assignment_type||'—'}</div></div>
              </div>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
};
