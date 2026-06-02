import { api } from './app.js';
import { tag, dfmt, screenHeader, emptyState, errorCard, disabledBtn, demoMark } from './lib.js';

const sched = r => {
  const d = dfmt(r.appointment_date);
  const t = r.appointment_time ? String(r.appointment_time).slice(0, 5) : '';
  return t ? `${d} · ${t}` : d;
};

export const list = async () => {
  let data;
  try { data = await api('sample', 'list'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const sc = data.status_color || {};
  const head = screenHeader('Đơn lấy mẫu',
    `Tổng ${data.total||0} đơn · Sáng 28 · Chiều 14 · Đã hoàn thành 9/42 ${demoMark}`,
    disabledBtn('+ Tạo Đơn lấy mẫu', 'px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg'));
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
              <tr class="hover:bg-slate-50 cursor-pointer">
                <td class="p-3 font-mono text-xs">${r.name||'—'}</td>
                <td class="p-3 font-medium">${r.contact||'—'}</td>
                <td class="p-3 text-slate-600">${r.address||'—'}</td>
                <td class="p-3 text-slate-600">${r.region||'—'}</td>
                <td class="p-3 text-slate-600">${sched(r)}</td>
                <td class="p-3 text-slate-600">${r.assigned_to||'Chưa phân'}</td>
                <td class="p-3 text-slate-600">${r.total_tubes!=null?r.total_tubes:'—'}</td>
                <td class="p-3">${tag(r.status||'—', sc[r.status]||'slate')}</td>
                <td class="p-3">${disabledBtn('Chi tiết →','text-xs text-brand-600')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">Hiển thị ${rows.length} / ${data.total||rows.length} đơn</div>
      </div>
    </div>`;
};
