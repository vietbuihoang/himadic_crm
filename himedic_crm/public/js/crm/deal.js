import { api } from './app.js';
import { tag, avatar, initials, money, dfmt, screenHeader, emptyState, errorCard, disabledBtn, demoMark } from './lib.js';

const STAGE_COLOR = {'Thẩm định':'sky','Báo giá':'amber','Đàm phán':'violet','Đã chốt':'emerald','Thất bại':'rose'};
const org = d => d.organization || d.contact || '—';

export const kanban = async () => {
  let data;
  try { data = await api('deal', 'kanban'); } catch(e){ return errorCard(e); }
  const cols = data.columns || [];
  const s = data.summary || {};
  const head = screenHeader('Luồng Cơ hội',
    `Cơ hội đang mở ${s.open||0} · Dự báo T6: 4.8 tỷ · Tỷ lệ chốt: 32% · Chu kỳ TB: 18 ngày ${demoMark}`,
    disabledBtn('+ Thêm cơ hội','px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg'));
  if(!cols.length) return head + emptyState('Chưa có cơ hội');
  const kpis = [
    ['Tổng giá trị luồng','5.2 tỷ','emerald'],
    ['Dự báo theo xác suất','1.86 tỷ','blue'],
    ['Cơ hội đang mở', String(s.open||0),'violet'],
    ['Đã chốt T5','24','cyan'],
    ['Tỷ lệ chốt','32%','amber'],
  ];
  return head + `
    <div class="p-6">
      <div class="grid grid-cols-5 gap-3 mb-4">
        ${kpis.map(([l,v,c],i)=>`<div class="bg-white rounded-xl border border-slate-200 p-3">
          <div class="text-xs text-slate-500">${l}</div>
          <div class="mt-1 font-bold text-${c}-600 text-lg">${v} ${i===2?'':demoMark}</div></div>`).join('')}
      </div>
      <div class="flex gap-3 overflow-x-auto pb-4 scroll-thin">
        ${cols.map(c=>`
          <div class="w-72 flex-shrink-0">
            <div class="flex items-center justify-between mb-2 px-1">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-${c.color}-500"></span>
                <div class="font-semibold text-sm text-slate-700">${c.stage}</div>
              </div>
              <div class="text-xs text-slate-500"><b>${c.count}</b> · ${money(c.value)}</div>
            </div>
            <div class="bg-slate-50 rounded-xl p-2 min-h-[400px] space-y-2 border border-slate-200/60">
              ${(c.cards||[]).map(d=>`
                <div class="kanban-card bg-white rounded-lg p-3 border border-slate-200 cursor-pointer" onclick="window.__select('deal','detail')">
                  <div class="text-sm font-medium text-slate-800 leading-snug">${d.deal_title||'—'}</div>
                  <div class="text-xs text-slate-500 mt-1">${org(d)}</div>
                  <div class="mt-2 flex items-center justify-between">
                    <div class="font-bold text-emerald-600 text-sm">${money(d.grand_total)}</div>
                    <div class="text-xs px-1.5 py-0.5 rounded bg-slate-100">${d.probability||0}%</div>
                  </div>
                  <div class="mt-2 flex gap-1 flex-wrap text-[10px]">${tag(d.deal_type||'—','slate')}</div>
                  <div class="mt-2 flex items-center justify-between text-[11px]">
                    ${avatar(initials(d.owner_user))}
                    <span class="text-slate-400">Đóng: ${dfmt(d.expected_close_date)}</span>
                  </div>
                </div>`).join('') || `<div class="text-center text-xs text-slate-300 pt-8">—</div>`}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
};

export const detail = async () => {
  let d;
  try { d = await api('deal', 'detail'); } catch(e){ return errorCard(e); }
  if(!d) return emptyState('Chưa có cơ hội');
  const items = d.items || [];
  const head = screenHeader(`Cơ hội · ${d.deal_title||''}${org(d)!=='—'?' – '+org(d):''}`,
    `Giá trị ${money(d.grand_total)} · ${d.status||'—'} · ${d.probability||0}% · Dự kiến chốt ${dfmt(d.expected_close_date)}`,
    `${disabledBtn('Đánh dấu Thất bại','px-3 py-1.5 text-sm bg-rose-50 text-rose-700 rounded-lg')}
     ${disabledBtn('Chốt → Tạo đơn lấy mẫu','px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg')}`);
  const STAGES = ['Thẩm định','Báo giá','Đàm phán','Đã chốt'];
  const curIdx = Math.max(0, STAGES.indexOf(d.status));
  return head + `
    <div class="p-6 grid grid-cols-3 gap-6">
      <div class="col-span-2 space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="flex items-center gap-1 text-xs font-medium">
            ${STAGES.map((st,i)=>`
              <div class="flex-1 flex items-center gap-1">
                <div class="flex-1 h-7 grid place-items-center rounded ${i<=curIdx?'bg-violet-500 text-white':'bg-slate-50 text-slate-400'}">${st}</div>
                ${i<STAGES.length-1?'<svg class="w-3 h-3 text-slate-300" fill="currentColor" viewBox="0 0 20 20"><path d="M7 5l6 5-6 5V5z"/></svg>':''}
              </div>`).join('')}
          </div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200">
          <div class="px-4 py-3 border-b border-slate-100 font-semibold text-sm">Dịch vụ trong Cơ hội</div>
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500"><tr>
              <th class="text-left p-3">Gói / Test</th><th class="text-left p-3">SL</th>
              <th class="text-right p-3">Đơn giá</th><th class="text-right p-3">Thành tiền</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100">
              ${items.length ? items.map(it=>`
                <tr><td class="p-3"><b>${it.item_name||'—'}</b></td>
                  <td class="p-3">${it.qty||0}</td>
                  <td class="p-3 text-right">${money(it.price)}</td>
                  <td class="p-3 text-right font-medium">${money(it.amount)}</td></tr>`).join('') +
                `<tr class="bg-slate-50 font-semibold"><td class="p-3" colspan="3">Tổng</td>
                  <td class="p-3 text-right text-emerald-700">${money(d.grand_total)}</td></tr>`
              : `<tr><td colspan="4" class="p-6 text-center text-slate-400 text-xs">Chưa có dịch vụ trong cơ hội</td></tr>`}
            </tbody>
          </table>
          <div class="p-3 border-t border-slate-100 text-xs flex items-center gap-2 text-amber-700 bg-amber-50">
            ⚠ Chiết khấu ${d.discount_pct||0}% ${d.discount_approval_status?`(${d.discount_approval_status})`:'(yêu cầu Trưởng nhóm KD duyệt)'} –
            ${disabledBtn('Gửi duyệt','text-brand-700 font-medium')}
          </div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200">
          <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between text-sm">
            <span class="font-semibold">Mốc tiếp theo</span>
            ${disabledBtn('+ Thêm','text-xs text-brand-600')}
          </div>
          <div class="p-4 space-y-2 text-sm">
            <div class="flex items-center gap-3 p-2 border border-slate-200 rounded-lg">
              <input type="checkbox" disabled class="rounded opacity-60 cursor-not-allowed">
              <div class="flex-1">Họp chốt giá với GĐ Nhân sự ${demoMark}</div><span class="text-xs text-slate-500">31/05 14h</span>
            </div>
            <div class="flex items-center gap-3 p-2 border border-slate-200 rounded-lg">
              <input type="checkbox" disabled class="rounded opacity-60 cursor-not-allowed">
              <div class="flex-1">Khảo sát mặt bằng nhà máy + lập kế hoạch lấy mẫu theo ca ${demoMark}</div><span class="text-xs text-slate-500">02/06</span>
            </div>
            <div class="flex items-center gap-3 p-2 border border-slate-200 rounded-lg">
              <input type="checkbox" disabled class="rounded opacity-60 cursor-not-allowed">
              <div class="flex-1">Trình hợp đồng khung 12 tháng để 2 bên ký ${demoMark}</div><span class="text-xs text-slate-500">10/06</span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-sm">
          <div class="font-semibold mb-3">Thông tin Cơ hội</div>
          <dl class="space-y-2">
            <div class="flex justify-between"><dt class="text-slate-500">Khách hàng</dt><dd class="font-medium">${org(d)}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Loại cơ hội</dt><dd class="font-medium">${d.deal_type||'—'}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Khu vực</dt><dd class="font-medium">${d.region||'—'}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Phụ trách</dt><dd class="font-medium">${d.owner_user||'—'}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Dự kiến chốt</dt><dd class="font-medium">${dfmt(d.expected_close_date)}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Giá trị</dt><dd class="font-bold text-emerald-600">${money(d.grand_total)}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Xác suất</dt><dd class="font-bold">${d.probability||0}%</dd></div>
          </dl>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-sm">
          <div class="font-semibold mb-2">Nguồn & Chiến dịch</div>
          <div class="space-y-1.5 text-xs">
            <div>Chiến dịch: <b>${d.campaign||'—'}</b></div>
            <div>UTM source: <b>${d.utm_source||'—'}</b></div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-sm">
          <div class="font-semibold mb-2">Tài liệu</div>
          <div class="space-y-1.5 text-xs">
            <div class="flex items-center gap-2"><span>📄</span><span class="flex-1">BaoGia_v3.pdf</span><span class="text-slate-400">2.4MB</span> ${demoMark}</div>
            <div class="flex items-center gap-2"><span>📄</span><span class="flex-1">HopDongKhung_Draft.docx</span><span class="text-slate-400">340KB</span> ${demoMark}</div>
          </div>
        </div>
      </div>
    </div>`;
};
