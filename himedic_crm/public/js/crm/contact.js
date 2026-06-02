import { api } from './app.js';
import { tag, avatar, initials, money, dfmt, screenHeader, emptyState, errorCard, disabledBtn, demoMark } from './lib.js';

const typeColor = t => t==='Cá nhân'?'cyan':t==='Bệnh viện'?'rose':t==='Phòng khám'?'amber':t==='Bảo hiểm'?'violet':'emerald';

export const list = async () => {
  let data;
  try { data = await api('contact', 'list'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const byType = data.by_type || {};
  const total = data.total || 0;
  const head = screenHeader('Khách hàng',
    `${total} contact · — đơn vị ${demoMark} · 86% đã liên kết PID Lab ${demoMark}`,
    disabledBtn('+ Thêm khách','px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg'));
  if(!rows.length) return head + emptyState('Chưa có khách hàng');
  const chips = [`Tất cả (${total})`, ...Object.entries(byType).map(([t,n])=>`${t} (${n})`)];
  return head + `
    <div class="p-6 flex gap-2 mb-2 text-xs flex-wrap">
      ${chips.map((t,i)=>disabledBtn(t,`px-3 py-1.5 rounded-lg border ${i===0?'bg-brand-50 border-brand-300 text-brand-700':'bg-white border-slate-200 text-slate-600'}`)).join('')}
    </div>
    <div class="px-6 pb-6">
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500 uppercase"><tr>
            <th class="text-left p-3">Tên</th><th class="text-left p-3">Loại</th>
            <th class="text-left p-3">SĐT / Email</th><th class="text-left p-3">PID Lab</th>
            <th class="text-left p-3">LTV</th><th class="text-left p-3">Lần khám gần nhất</th>
            <th class="text-left p-3">Phụ trách</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-100">
            ${rows.map(r=>`
              <tr class="hover:bg-slate-50 cursor-pointer" onclick="window.__select('contact','profile')">
                <td class="p-3 font-medium">${r.full_name||'—'}${r.vip?` ${tag('VIP','amber')}`:''}</td>
                <td class="p-3">${tag(r.customer_type||'—', typeColor(r.customer_type))}</td>
                <td class="p-3 text-slate-600">${r.phone||'—'}${r.email?`<div class="text-xs text-slate-400">${r.email}</div>`:''}</td>
                <td class="p-3">${r.pid?`<code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs">${r.pid}</code>`:'<span class="text-slate-400">—</span>'}</td>
                <td class="p-3 text-slate-400">—</td>
                <td class="p-3 text-slate-400">—</td>
                <td class="p-3"><div class="flex items-center gap-2">${avatar(initials(r.owner_user||'—'))}<span class="text-xs">${r.owner_user||'—'}</span></div></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">Hiển thị ${rows.length} / ${total} contact</div>
      </div>
    </div>`;
};

export const profile = async () => {
  let d;
  try { d = await api('contact', 'profile'); } catch(e){ return errorCard(e); }
  if(!d) return emptyState('Chưa có khách hàng');
  const deals = d.deals || [];
  const results = d.results || [];
  const pdpa = d.pdpa_consent_given
    ? `Đã đồng ý xử lý dữ liệu y tế (PDPA)${d.pdpa_consent_date?` · ${dfmt(d.pdpa_consent_date)}`:''}`
    : 'Chưa đồng ý xử lý dữ liệu y tế (PDPA)';
  const head = screenHeader(`Hồ sơ 360° · ${d.full_name||''}`,
    `${d.pid||'—'} · ${d.vip?'Khách VIP · ':''}${pdpa}`,
    `${disabledBtn('In hồ sơ','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg')}
     ${disabledBtn('+ Đặt lịch lấy mẫu','px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg')}`);
  const tiles = [['LTV trọn đời','12.6M','emerald'],['Số lần khám','4','sky'],['Cơ hội đang chạy','1','amber'],['NPS','9/10','violet']];
  const tabsRow = ['Tổng quan','Lịch sử khám','Cơ hội & Khách tiềm năng','Tài liệu','Y tế (hạn chế)'];
  const medRows = [
    d.blood_type ? `<div class="flex justify-between"><span class="text-slate-500">Nhóm máu</span><b>${d.blood_type}</b></div>` : '',
    d.allergies ? `<div class="flex justify-between"><span class="text-slate-500">Dị ứng</span><b>${d.allergies}</b></div>` : '',
    d.chronic_diseases ? `<div class="flex justify-between"><span class="text-slate-500">Bệnh nền</span><b>${d.chronic_diseases}</b></div>` : '',
  ].filter(Boolean).join('');
  const timeline = [
    ...deals.map(x=>`<div class="flex gap-3"><div class="w-1 bg-emerald-400 rounded"></div><div class="flex-1"><b>${x.status||'Cơ hội'}</b> – ${x.deal_title||'—'} – ${money(x.grand_total)} · <span class="text-xs text-slate-500">${dfmt(x.modified)}</span></div></div>`),
    ...results.map(x=>`<div class="flex gap-3"><div class="w-1 bg-violet-400 rounded"></div><div class="flex-1"><b>Kết quả XN</b>${x.released_at?' đã trả':''} · <span class="text-xs text-slate-500">${dfmt(x.result_date)}</span></div></div>`),
  ].join('');
  return head + `
    <div class="p-6 grid grid-cols-3 gap-6">
      <div class="col-span-2 space-y-4">
        <div class="bg-white rounded-xl border border-slate-200">
          <div class="border-b border-slate-100 px-4 pt-3 flex gap-1 text-sm">
            ${tabsRow.map((t,i)=>`<button disabled title="Chỉ đọc trong bản này" class="px-3 py-2 border-b-2 ${i===0?'border-brand-500 text-brand-700 font-medium':'border-transparent text-slate-500'} opacity-60 cursor-not-allowed">${t}</button>`).join('')}
          </div>
          <div class="p-4 grid grid-cols-4 gap-4 text-sm">
            ${tiles.map(([l,v,c])=>`<div class="rounded-lg bg-${c}-50 border border-${c}-200 p-3"><div class="text-xs text-${c}-700">${l} ${demoMark}</div><div class="font-bold text-xl text-${c}-700">${v}</div></div>`).join('')}
          </div>
          <div class="p-4 border-t border-slate-100">
            <div class="font-semibold text-sm mb-3">Timeline tương tác</div>
            <div class="space-y-3 text-sm">
              ${timeline || '<div class="text-slate-400 text-xs">Chưa có hoạt động ghi nhận</div>'}
            </div>
          </div>
        </div>
        ${d.organization?`<div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="font-semibold text-sm mb-3">Liên kết tổ chức</div>
          <div class="flex items-center justify-between p-2 border border-slate-200 rounded">
            <div><div class="font-medium text-sm">${d.organization}</div><div class="text-xs text-slate-500">${d.position||'—'}</div></div>
            ${disabledBtn('Xem đơn vị →','text-xs text-brand-600')}
          </div>
        </div>`:''}
      </div>
      <div class="space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-300 to-emerald-500 text-white grid place-items-center text-2xl font-bold">${initials(d.full_name||'?')}</div>
          <div class="mt-2 font-semibold">${d.full_name||'—'}</div>
          <div class="text-xs text-slate-500">${[d.gender, d.region].filter(Boolean).join(' · ')||'—'}</div>
          <div class="mt-3 flex justify-center gap-2">
            ${disabledBtn('📞','p-2 rounded-lg bg-emerald-50 text-emerald-600')}
            ${disabledBtn('✉','p-2 rounded-lg bg-sky-50 text-sky-600')}
            ${disabledBtn('💬','p-2 rounded-lg bg-blue-50 text-blue-600')}
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 text-sm space-y-2">
          <div class="font-semibold">Hồ sơ y tế (RBAC)</div>
          <div class="text-xs text-slate-500">Chỉ Sales được giao + Bác sĩ Lab xem được</div>
          ${medRows ? `<div class="space-y-1.5">${medRows}</div>` : '<div class="text-xs text-slate-400">Không có dữ liệu y tế / không đủ quyền</div>'}
        </div>
        <div class="bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-xs text-cyan-800">
          🔒 PDPA: ${pdpa}
        </div>
      </div>
    </div>`;
};
