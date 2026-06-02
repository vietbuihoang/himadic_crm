import { api } from './app.js';
import { tag, avatar, initials, dfmt, screenHeader, emptyState, errorCard, disabledBtn, demoMark } from './lib.js';

// Hardcoded role-count / region-group reference panel + permission matrix below are demo
// placeholders (no backing fields in the API) — driven mostly off real hm_roles where possible.
const REGION_GROUPS = ['Q.7', 'Q.10', 'Bình Tân', 'Q.12', 'Bình Thạnh', 'Thủ Đức'];
const PERM_MATRIX = [
  ['Khách tiềm năng', 'R/W', 'R/W', 'R/W', '—', '—'],
  ['Cơ hội', 'R/W (mình)', 'R/W (đội)', 'R', '—', 'R (Đã chốt)'],
  ['Đơn lấy mẫu', 'R/W (mình)', 'R/W', '—', 'R', '—'],
  ['Logistics', 'R', 'R/W', '—', 'R/W', '—'],
  ['Hồ sơ y tế', 'R (giao)', 'R (đội)', '—', 'R/W', '—'],
  ['Báo cáo', 'R (mình)', 'R/W', 'R (MKT)', 'R (Lab)', 'R (Doanh thu)'],
];

export const users = async () => {
  let data;
  try { data = await api('admin', 'users'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const hmRoles = data.hm_roles || [];
  const head = screenHeader('Người dùng & Phân quyền',
    `${rows.length} user · ${hmRoles.length} vai trò · 8 nhóm theo khu vực ${demoMark}`,
    disabledBtn('+ Thêm user', 'px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg'));
  if(!rows.length) return head + emptyState('Chưa có người dùng');
  return head + `
    <div class="p-6 grid grid-cols-4 gap-6">
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-sm">
        <div class="font-semibold mb-3">Vai trò (Roles) ${demoMark}</div>
        ${hmRoles.map((n,i)=>`
          <div class="w-full flex items-center justify-between px-2 py-1.5 rounded ${i===0?'bg-brand-50 text-brand-700':''}">
            <span>${n}</span></div>`).join('')}
        <hr class="my-3">
        <div class="font-semibold mb-2 text-xs uppercase">Nhóm khu vực ${demoMark}</div>
        ${REGION_GROUPS.map(t=>`<div class="w-full text-left px-2 py-1 rounded text-slate-600">${t}</div>`).join('')}
      </div>
      <div class="col-span-3 space-y-4">
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500 uppercase"><tr>
              <th class="text-left p-3">User</th><th class="text-left p-3">Email</th>
              <th class="text-left p-3">Vai trò</th><th></th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100">
              ${rows.map(r=>`
                <tr class="hover:bg-slate-50">
                  <td class="p-3"><div class="flex items-center gap-2">${avatar(initials(r.full_name||r.name))}<span class="font-medium">${r.full_name||r.name}</span></div></td>
                  <td class="p-3 text-slate-600 text-xs">${r.email||r.name||'—'}</td>
                  <td class="p-3"><div class="flex flex-wrap gap-1">${(r.roles&&r.roles.length)?r.roles.map(role=>tag(role,'sky')).join(' '):'<span class="text-slate-400 text-xs">—</span>'}</div></td>
                  <td class="p-3">${disabledBtn('⋮','text-slate-400 px-1')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <div class="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">Hiển thị ${rows.length} người dùng hệ thống</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="font-semibold text-sm mb-3">Ma trận quyền (rút gọn) ${demoMark}</div>
          <table class="w-full text-xs">
            <thead><tr class="bg-slate-50 text-slate-500"><th class="text-left p-2">Module</th><th class="p-2">Sales</th><th class="p-2">Manager</th><th class="p-2">Marketing</th><th class="p-2">Lab</th><th class="p-2">Kế toán</th></tr></thead>
            <tbody class="divide-y divide-slate-100">
              ${PERM_MATRIX.map(r=>`<tr><td class="p-2 font-medium">${r[0]}</td>${r.slice(1).map(v=>`<td class="p-2 text-center ${v.includes('W')?'text-emerald-600':v==='—'?'text-slate-300':'text-slate-600'}">${v}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
};

export const workflow = async () => {
  let data;
  try { data = await api('admin', 'workflow'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];
  const head = screenHeader('Trình tạo quy trình', 'Danh sách quy trình tự động · bản chỉ đọc',
    disabledBtn('+ Tạo quy trình', 'px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg'));
  if(!rows.length) return head + emptyState('Chưa có quy trình nào được định nghĩa');
  return head + `
    <div class="p-6 space-y-3">
      ${rows.map(w=>`
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="flex items-start gap-3">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-slate-800">${w.workflow_name||w.name||'—'}</span>
                ${tag(w.is_active?'Đang bật':'Tắt', w.is_active?'emerald':'slate')}
              </div>
              <div class="text-xs text-slate-500 mt-1">Đối tượng: ${w.entity||'—'} · Mã: ${w.workflow_code||'—'}</div>
              ${w.description?`<p class="text-sm text-slate-600 mt-2">${w.description}</p>`:''}
            </div>
            ${disabledBtn('Sửa','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg')}
          </div>
        </div>`).join('')}
    </div>`;
};
