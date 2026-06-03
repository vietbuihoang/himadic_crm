import { api, apiPost, refresh } from './app.js';
import { tag, dfmt, screenHeader, emptyState, errorCard, disabledBtn, demoMark } from './lib.js';
import { toast, openModal, textareaField } from './ui.js';

const LF = 'himedic_crm.logistics.flows';
async function run(fn){ try { await fn(); } catch(e){ toast(e.message||String(e), 'err'); } }

window.__logiUI = {
  depart(manifest){ run(async ()=>{
    const r = await apiPost(`${LF}.depart`, { manifest });
    toast(`Đã khởi hành · ${r.status||''}`); refresh(); }); },
  labReceive(manifest){ run(async ()=>{
    const r = await apiPost(`${LF}.lab_receive`, { manifest });
    toast(`Lab đã nhận ${r.received||0} ống · ${r.orders||0} đơn`); refresh(); }); },
  reject(manifest, sample_order){
    openModal({ title:`Từ chối mẫu · ${sample_order}`, submitLabel:'Từ chối',
      bodyHtml: textareaField('Lý do từ chối','reason','VD: vỡ ống, thiếu thể tích, tan máu'),
      onSubmit: async (v)=>{
        if(!v.reason) throw new Error('Phải nhập lý do từ chối');
        const r = await apiPost(`${LF}.reject_item`, { manifest, sample_order, reason: v.reason });
        toast(`Đã tạo đơn lấy lại ${r.recollection||''}`); refresh(); }});
  },
};

const M_STATUS_COLOR = {'Đang đóng gói':'amber','Đã giao shipper':'sky','Đang vận chuyển':'blue','Đã đến Lab':'violet','Đã đối soát':'emerald','Đã đóng':'slate'};
// Chain-of-custody order, left → right; timeline steps derive from row.status position here.
const TRACK_ORDER = ['Đang đóng gói','Đã giao shipper','Đang vận chuyển','Đã đến Lab','Đã đối soát'];
const TRACK_STEPS = [
  ['Đã lấy mẫu & đóng gói','Đang đóng gói'],
  ['Đã giao shipper / gom xe lạnh','Đã giao shipper'],
  ['Đang trên đường về Lab','Đang vận chuyển'],
  ['Đã đến / bàn giao tại Lab','Đã đến Lab'],
  ['Lab đối soát & nhập LIS','Đã đối soát'],
];

export const manifest = async () => {
  let data;
  try { data = await api('logistics', 'manifest', { limit: 1 }); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const m0 = rows[0];
  const canDepart = m0 && ['Đang đóng gói','Đã giao shipper'].includes(m0.status);
  const canReceive = m0 && ['Đang vận chuyển','Đã đến Lab'].includes(m0.status);
  const actions = `${disabledBtn('In manifest','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg')}
     ${canDepart?`<button onclick="window.__logiUI.depart('${m0.name}')" class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg">Khởi hành</button>`:''}
     ${canReceive?`<button onclick="window.__logiUI.labReceive('${m0.name}')" class="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg">Lab nhận</button>`:''}`;
  const head = screenHeader('Vận chuyển mẫu · Phiếu giao & Theo dõi',
    `Theo dõi lô vận chuyển realtime · Chuỗi hành trình mẫu (chain of custody) · Lạnh 2-8°C ${demoMark}`,
    actions);
  if(!rows.length) return head + emptyState('Chưa có lô vận chuyển');
  const m = rows[0];
  const curIdx = Math.max(0, TRACK_ORDER.indexOf(m.status));
  const breached = !!m.temperature_breached;
  return head + `
    <div class="p-6 grid grid-cols-3 gap-6">
      <div class="col-span-2 space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="font-semibold text-sm mb-3">Chain of custody – realtime</div>
          <div class="relative">
            <div class="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200"></div>
            ${TRACK_STEPS.map(([label],i)=>{
              const done = i < curIdx, active = i === curIdx;
              const c = done?'emerald':active?'blue':'slate';
              const ic = done?'✓':active?'🚚':'◯';
              return `
              <div class="relative pl-12 pb-4">
                <div class="absolute left-1 top-0 w-7 h-7 rounded-full bg-${c}-500 text-white grid place-items-center text-xs ${active?'pulse-dot':''}">${ic}</div>
                <div class="font-medium text-sm ${done||active?'text-slate-800':'text-slate-400'}">${label}</div>
                <div class="text-xs text-slate-500">${active?'Đang diễn ra':done?'Hoàn tất':'—'}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200">
          <div class="px-4 py-3 border-b border-slate-100 font-semibold text-sm flex items-center gap-3">
            Nhật ký nhiệt độ
            <span class="text-xs ${breached?'text-rose-600':'text-emerald-600'} ml-auto">● ${breached?'Vượt ngưỡng':'Trong ngưỡng (2-8°C)'}</span>
          </div>
          <div class="p-4">
            <div class="h-32 relative">
              <svg viewBox="0 0 400 100" class="w-full h-full">
                <line x1="0" y1="20" x2="400" y2="20" stroke="#ef4444" stroke-dasharray="3 3" stroke-width="1"/>
                <line x1="0" y1="80" x2="400" y2="80" stroke="#3b82f6" stroke-dasharray="3 3" stroke-width="1"/>
                <polyline fill="none" stroke="#10b981" stroke-width="2" points="0,50 40,52 80,48 120,45 160,55 200,50 240,48 280,52 320,49 360,51 400,50"/>
                <text x="2" y="16" font-size="8" fill="#ef4444">8°C max</text>
                <text x="2" y="92" font-size="8" fill="#3b82f6">2°C min</text>
              </svg>
            </div>
            <div class="text-xs text-slate-500 mt-2">Datalogger IoT TempTrack-08 · 1 mẫu/30s · 4.5°C avg ${demoMark}</div>
          </div>
        </div>
      </div>
      <div class="space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-sm">
          <div class="font-semibold mb-3">Lô ${m.name||'—'}</div>
          <dl class="space-y-2">
            <div class="flex justify-between"><dt class="text-slate-500">Ngày</dt><dd class="font-medium">${dfmt(m.manifest_date)}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Tuyến</dt><dd class="font-medium">${(m.from_region||'—')} → ${(m.to_lab||'Lab')}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Shipper</dt><dd class="font-medium">${m.shipper||'—'}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Trạng thái</dt><dd>${tag(m.status||'—', M_STATUS_COLOR[m.status]||'slate')}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Tổng ống mẫu</dt><dd class="font-medium">${m.total_items??'—'}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Ống lỗi/từ chối</dt><dd class="font-medium text-${(m.rejected_items||0)>0?'rose':'slate'}-600">${m.rejected_items??0}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">SLA về Lab</dt><dd class="font-medium text-emerald-600">Còn 1h25 ${demoMark}</dd></div>
          </dl>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="font-semibold text-sm mb-2">Vị trí xe</div>
          <div class="h-40 rounded-lg bg-gradient-to-br from-sky-100 to-emerald-100 grid place-items-center text-slate-500 text-sm">
            🗺️ Bản đồ realtime (Mapbox) ${demoMark}
          </div>
          <div class="text-xs text-slate-500 mt-2">Đang ở Cầu Khánh Hội · ETA Lab 10:42 ${demoMark}</div>
        </div>
      </div>
    </div>`;
};

export const reception = async () => {
  let data, det;
  try { data = await api('logistics', 'reception'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const head = screenHeader('Tiếp nhận tại Lab · Nhận mẫu',
    `${rows.length} lô đang chờ tại Lab · Quét barcode để nhập LIS ${demoMark}`,
    disabledBtn('In phiếu','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg'));
  if(!rows.length) return head + emptyState('Chưa có lô chờ tiếp nhận');
  const m = rows[0];
  const next = rows.slice(1);
  try { det = await api('logistics', 'detail', { name: m.name }); } catch(e){ return head + errorCard(e); }
  const items = (det && det.items) || [];
  return head + `
    <div class="p-6 grid grid-cols-3 gap-6">
      <div class="col-span-2">
        <div class="bg-white rounded-xl border border-slate-200">
          <div class="border-b border-slate-100 p-4 flex items-center gap-4">
            <div class="flex-1">
              <div class="font-semibold">Lô ${m.name||'—'} · ${tag(m.status||'—', M_STATUS_COLOR[m.status]||'slate')}</div>
              <div class="text-xs text-slate-500">Shipper: ${m.shipper||'—'} · Đến lúc ${dfmt(m.arrived_at)} · ${m.total_items??'—'} ống · ${m.rejected_items??0} lỗi</div>
            </div>
            <button onclick="window.__logiUI.labReceive('${m.name}')" class="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg">Xác nhận nhận đủ</button>
            <input type="text" placeholder="Scan barcode ống mẫu..." disabled title="Chỉ đọc trong bản này"
              class="px-3 py-2 text-sm bg-slate-100 border border-transparent rounded-lg outline-none w-56 opacity-60 cursor-not-allowed">
          </div>
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500 uppercase"><tr>
              <th class="text-left p-3 w-10">#</th><th class="text-left p-3">Barcode</th><th class="text-left p-3">Đơn lấy mẫu</th><th class="text-left p-3">Tình trạng</th><th class="text-right p-3">Thao tác</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100">
              ${items.length ? items.map((it,i)=>{
                const rejected = !!it.reject_reason;
                const received = !rejected && it.received_at_lab;
                const st = rejected ? tag('Từ chối','rose') : received ? tag('Đã nhận','emerald') : tag('Chờ nhận','slate');
                return `
                <tr>
                  <td class="p-3 text-slate-500">${i+1}</td>
                  <td class="p-3"><code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs">${it.tube_barcode||'—'}</code></td>
                  <td class="p-3">${it.sample_order||'—'}</td>
                  <td class="p-3">${st}${rejected?`<div class="text-xs text-rose-500 mt-0.5">${it.reject_reason}</div>`:''}</td>
                  <td class="p-3 text-right">${rejected?'':`<button onclick="window.__logiUI.reject('${m.name}','${it.sample_order}')" class="px-2.5 py-1 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">Từ chối</button>`}</td>
                </tr>`;
              }).join('') : `<tr><td colspan="5" class="p-6 text-center text-slate-400 text-xs">Lô chưa có ống mẫu</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div class="space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-sm">
          <div class="font-semibold mb-3">Checklist tiếp nhận ${demoMark}</div>
          ${['Đúng số lượng ống','Nhiệt độ trong ngưỡng','Niêm phong nguyên vẹn','Manifest khớp barcode','Phiếu chỉ định đầy đủ'].map((t,i)=>`
            <label class="flex items-center gap-2 py-1.5 text-sm"><input type="checkbox" ${i<4?'checked':''} disabled class="rounded text-emerald-500 opacity-60 cursor-not-allowed"><span class="${i<4?'':'text-slate-500'}">${t}</span></label>`).join('')}
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-sm">
          <div class="font-semibold mb-2">Hàng chờ tiếp theo</div>
          <div class="space-y-2">
            ${next.length ? next.map(n=>`
              <div class="p-2 border border-slate-200 rounded text-xs flex items-center gap-2 flex-wrap">
                <span class="font-mono">${n.name}</span>
                <span class="ml-auto text-slate-500">${dfmt(n.manifest_date)}</span>
                <div class="w-full text-slate-500">${n.shipper||'—'} · ${n.total_items??'—'} ống · ${tag(n.status||'—', M_STATUS_COLOR[n.status]||'slate')}</div>
                <button onclick="window.__logiUI.labReceive('${n.name}')" class="w-full mt-1 px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">Xác nhận nhận đủ</button>
              </div>`).join('') : `<div class="text-xs text-slate-400">Không còn lô nào trong hàng chờ</div>`}
          </div>
        </div>
      </div>
    </div>`;
};
