import { icon } from './lib.js';
import { MODULES } from './app.js';
export const home = async () => `
  <div class="p-10 max-w-5xl mx-auto">
    <div class="rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-500 text-white p-10 shadow-xl">
      <h1 class="text-3xl font-extrabold">Hi-Medic CRM</h1>
      <p class="mt-3 text-cyan-50 max-w-2xl">Workspace nội bộ — 12 module quản lý khách tiềm năng, cơ hội, lấy mẫu, vận chuyển và báo cáo.</p>
    </div>
    <h3 class="mt-10 mb-4 font-semibold text-slate-700 text-sm uppercase tracking-wide">Module</h3>
    <div class="grid grid-cols-3 gap-4">
      ${MODULES.filter(m=>m.id!=='overview').map(m=>`
        <button onclick="window.__select('${m.id}','${m.screens[0].id}')" class="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-500 hover:shadow-md transition">
          <div class="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 grid place-items-center mb-3">${icon(m.icon)}</div>
          <div class="font-semibold text-slate-800 text-sm">${m.name}</div>
          <div class="text-xs text-slate-500 mt-1">${m.screens.length} màn hình</div>
        </button>`).join('')}
    </div>
  </div>`;
