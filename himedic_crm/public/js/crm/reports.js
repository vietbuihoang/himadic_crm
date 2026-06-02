import { api } from './app.js';
import { money, screenHeader, emptyState, errorCard, disabledBtn, demoMark } from './lib.js';

const STAGE_COLOR = {'Thẩm định':'sky','Báo giá':'amber','Đàm phán':'violet','Đã chốt':'emerald','Thất bại':'rose'};

export const sales = async () => {
  let d;
  try { d = await api('reports', 'sales'); } catch(e){ return errorCard(e); }
  const pipeline = d.pipeline || [];
  const head = screenHeader('Bảng điều khiển Kinh doanh', `T5/2026 · Real-time ${demoMark}`,
    disabledBtn('Xuất báo cáo','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg'));
  if(!pipeline.length) return head + emptyState('Chưa có dữ liệu cơ hội');
  const totalValue = pipeline.reduce((a,p)=>a+(p.value||0),0);
  const running = pipeline.filter(p=>p.stage!=='Đã chốt'&&p.stage!=='Thất bại').reduce((a,p)=>a+(p.count||0),0);
  const kpis = [
    ['Doanh thu đã chốt', money(totalValue), 'emerald'],
    ['Dự báo theo xác suất', money(d.forecast), 'blue'],
    ['Cơ hội đang chạy', String(running), 'amber'],
    ['Tỷ lệ chốt', `${d.win_rate||0}%`, 'violet'],
  ];
  const maxVal = Math.max(1, ...pipeline.map(p=>p.value||0));
  return head + `
    <div class="p-6 grid grid-cols-4 gap-4 mb-6">
      ${kpis.map(([l,v,c])=>`
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="text-xs text-slate-500">${l}</div>
          <div class="text-2xl font-bold text-${c}-600 mt-1">${v}</div>
        </div>`).join('')}
    </div>
    <div class="px-6 pb-6 grid grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="font-semibold text-sm">Giá trị pipeline theo giai đoạn</div>
          <div class="text-xs text-slate-500">Tổng ${money(totalValue)}</div>
        </div>
        <div class="space-y-3">
          ${pipeline.map(p=>`
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span>${p.stage} <span class="text-slate-400">· ${p.count||0} cơ hội</span></span>
                <b>${money(p.value)}</b>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-${STAGE_COLOR[p.stage]||'slate'}-500" style="width:${Math.round((p.value||0)/maxVal*100)}%"></div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="font-semibold text-sm mb-3">Kết quả chốt</div>
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="rounded-lg bg-emerald-50 p-3">
            <div class="text-xs text-emerald-700">Đã chốt</div>
            <div class="text-2xl font-bold text-emerald-600 mt-1">${d.won||0}</div>
          </div>
          <div class="rounded-lg bg-rose-50 p-3">
            <div class="text-xs text-rose-700">Thất bại</div>
            <div class="text-2xl font-bold text-rose-600 mt-1">${d.lost||0}</div>
          </div>
        </div>
        <div class="flex justify-between text-xs mb-1"><span>Tỷ lệ chốt</span><b>${d.win_rate||0}%</b></div>
        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-violet-500" style="width:${d.win_rate||0}%"></div>
        </div>
        <div class="mt-4 text-xs text-slate-500">Dự báo theo xác suất: <b class="text-blue-600">${money(d.forecast)}</b></div>
      </div>
    </div>`;
};

export const ops = async () => {
  let d;
  try { d = await api('reports', 'ops'); } catch(e){ return errorCard(e); }
  const by = d.by_status || {};
  const head = screenHeader('Bảng điều khiển Vận hành', `Vận hành lấy mẫu & vận chuyển – T5/2026 ${demoMark}`,
    disabledBtn('Xuất báo cáo','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg'));
  if(!d.orders_total) return head + emptyState('Chưa có đơn lấy mẫu');
  const kpis = [
    ['Đơn lấy mẫu', String(d.orders_total||0), 'sky'],
    ['Tỷ lệ mẫu lỗi', `${d.reject_rate||0}%`, 'rose'],
    ['Đang vận chuyển', String(by['Đang vận chuyển']||0), 'amber'],
    ['Hoàn tất', String(by['Hoàn tất']||0), 'violet'],
  ];
  const rows = [
    ['Đã phân công','slate'],['Đã lấy mẫu','sky'],['Đang vận chuyển','amber'],
    ['Đã nhập Lab','blue'],['Hoàn tất','emerald'],['Lỗi mẫu','rose'],
  ];
  const maxCount = Math.max(1, ...rows.map(([s])=>by[s]||0));
  return head + `
    <div class="p-6 grid grid-cols-4 gap-4 mb-6">
      ${kpis.map(([l,v,c])=>`
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="text-xs text-slate-500">${l}</div>
          <div class="text-2xl font-bold text-${c}-600 mt-1">${v}</div>
        </div>`).join('')}
    </div>
    <div class="px-6 pb-6">
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="font-semibold text-sm">Đơn lấy mẫu theo trạng thái</div>
          <div class="text-xs text-slate-500">Tổng ${d.orders_total||0} đơn</div>
        </div>
        <div class="space-y-3">
          ${rows.map(([s,c])=>`
            <div>
              <div class="flex justify-between text-xs mb-1"><span>${s}</span><b>${by[s]||0}</b></div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-${c}-500" style="width:${Math.round((by[s]||0)/maxCount*100)}%"></div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
};
