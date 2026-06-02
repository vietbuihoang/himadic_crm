import { api } from './app.js';
import { tag, money, screenHeader, emptyState, errorCard, disabledBtn, demoMark } from './lib.js';

export const tests = async () => {
  let data;
  try { data = await api('catalog', 'tests'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const head = screenHeader('Danh mục Test',
    `${data.total||rows.length} test · Đồng bộ LIS lần cuối 10:15 ${demoMark}`,
    `${disabledBtn('⟲ Sync LIS','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg')}
     ${disabledBtn('+ Thêm test','px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg')}`);
  if(!rows.length) return head + emptyState('Chưa có test nào');

  // Group rows by test_group, preserving first-seen order.
  const groups = [];
  const idx = {};
  rows.forEach(r=>{
    const g = r.test_group || 'Khác';
    if(idx[g]===undefined){ idx[g]=groups.length; groups.push({ name:g, items:[] }); }
    groups[idx[g]].items.push(r);
  });

  const groupHtml = groups.map(g=>`
    <tbody class="divide-y divide-slate-100">
      <tr class="bg-slate-50"><td colspan="7" class="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">${g.name} · ${g.items.length}</td></tr>
      ${g.items.map(r=>`
        <tr class="hover:bg-slate-50">
          <td class="p-3"><code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">${r.test_code||'—'}</code></td>
          <td class="p-3"><div class="font-medium text-slate-800">${r.test_name_vi||'—'}</div>
            ${r.test_name_en?`<div class="text-xs text-slate-500">${r.test_name_en}</div>`:''}</td>
          <td class="p-3 text-slate-600">${r.sample_type||'—'}</td>
          <td class="p-3 text-slate-600">${r.tat_hours!=null?r.tat_hours+'h':'—'}</td>
          <td class="p-3 text-right">${money(r.retail_price)}</td>
          <td class="p-3 text-right text-emerald-600 font-medium">${money(r.b2b_price)}</td>
          <td class="p-3">${r.is_active?tag('Đang bán','emerald'):tag('Ngừng','slate')}</td>
        </tr>`).join('')}
    </tbody>`).join('');

  return head + `
    <div class="p-6">
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide"><tr>
            <th class="text-left p-3">Mã</th><th class="text-left p-3">Tên test (VN/EN)</th>
            <th class="text-left p-3">Mẫu</th><th class="text-left p-3">TAT</th>
            <th class="text-right p-3">Giá lẻ</th><th class="text-right p-3">Giá B2B</th>
            <th class="text-left p-3">Trạng thái</th>
          </tr></thead>
          ${groupHtml}
        </table>
        <div class="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">${rows.length} test · ${groups.length} nhóm chuyên khoa</div>
      </div>
    </div>`;
};

export const packages = async () => {
  let data;
  try { data = await api('catalog', 'package'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const head = screenHeader('Gói combo',
    `${data.total||rows.length} gói · Áp dụng cho hợp đồng B2B`,
    `${disabledBtn('Sao chép gói','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg')}
     ${disabledBtn('Lưu phiên bản','px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg')}`);
  if(!rows.length) return head + emptyState('Chưa có gói combo');

  return head + `
    <div class="p-6 grid grid-cols-3 gap-4">
      ${rows.map(p=>`
        <div class="bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-500 hover:shadow-md transition">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="font-semibold text-slate-800">${p.package_name||'—'}</div>
              <code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">${p.package_code||'—'}</code>
            </div>
            ${p.is_active?tag('Đang bán','emerald'):tag('Ngừng','slate')}
          </div>
          ${p.category?`<div class="mt-2">${tag(p.category,'cyan')}</div>`:''}
          <div class="mt-3 text-xs text-slate-500">${p.item_count||0} test trong gói</div>
          <dl class="mt-3 space-y-1.5 text-sm border-t border-slate-100 pt-3">
            <div class="flex justify-between"><dt class="text-slate-500">Giá lẻ</dt><dd class="font-medium">${money(p.retail_price)}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-500">Giá B2B</dt><dd class="font-semibold text-emerald-600">${money(p.b2b_price)}</dd></div>
          </dl>
        </div>`).join('')}
    </div>`;
};
