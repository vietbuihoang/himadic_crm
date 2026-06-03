export function icon(name){
  const I = {
    'layout-grid':'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    'user-plus':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
    'handshake':'<path d="m11 17 2 2a1 1 0 0 0 3 0c0-.5-.5-1-1-1l-2-2"/><path d="m14 14 2.5 2.5a1 1 0 0 0 3 0c0-.5-.5-1-1-1L17 14"/><path d="m17 11 2 2a1 1 0 0 0 3 0c0-.5-.5-1-1-1l-5-5-5 5"/><path d="m4 13 4-4 4 4-4 4z"/>',
    'users':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'test-tube':'<path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/>',
    'truck':'<rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    'flask':'<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/>',
    'check-square':'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    'message-square':'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    'megaphone':'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    'bar-chart':'<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    'settings':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  };
  return `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[name]||''}</svg>`;
}
export const tag = (txt,color='slate') => `<span class="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-${color}-100 text-${color}-700">${txt??''}</span>`;
export const avatar = (init='?',from='emerald',to='emerald-600') => `<div class="w-7 h-7 rounded-full bg-gradient-to-br from-${from}-400 to-${to} text-white grid place-items-center text-[11px] font-semibold flex-shrink-0">${init}</div>`;
export const initials = (name='') => { const n=(name||'').trim(); if(!n) return '?'; const parts=n.split(/\s+/); return ((parts.slice(-1)[0]||'?')[0]||'?').toUpperCase(); };
export const money = (n) => (n==null?'—':Number(n).toLocaleString('vi-VN')+'đ');
export const dfmt = (d) => { if(!d) return '—'; const p=String(d).slice(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d; };
export const demoMark = `<span class="text-[10px] text-slate-400" title="demo placeholder">·demo</span>`;
export const disabledBtn = (label,cls='') => `<button disabled title="Chỉ đọc trong bản này" class="${cls} opacity-60 cursor-not-allowed">${label}</button>`;
export function screenHeader(title, subtitle, actionsHtml=''){
  return `<div class="px-6 pt-5 pb-3 bg-white border-b border-slate-200"><div class="flex items-start gap-4">
    <div><h2 class="text-lg font-semibold text-slate-800">${title}</h2>
    <p class="text-xs text-slate-500 mt-0.5">${subtitle}</p></div>
    <div class="ml-auto flex items-center gap-2">${actionsHtml}</div></div></div>`;
}
export function tabs(screens, current, moduleId){
  return `<div class="px-6 pt-3 bg-white border-b border-slate-200 flex gap-1 text-sm">
    ${screens.map(s=>`<button onclick="window.__select('${moduleId}','${s.id}')"
      class="px-4 py-2 border-b-2 ${s.id===current?'border-brand-600 text-brand-700 font-medium':'border-transparent text-slate-500 hover:text-slate-800'}">${s.name}</button>`).join('')}
  </div>`;
}
export const skeleton = () => `<div class="p-6 space-y-3 animate-pulse">${Array.from({length:6}).map(()=>`<div class="h-12 bg-white rounded-xl border border-slate-200"></div>`).join('')}</div>`;
export const emptyState = (msg='Chưa có dữ liệu') => `<div class="p-16 text-center text-slate-400"><div class="text-4xl mb-2">📭</div><div>${msg}</div></div>`;
export const errorCard = (e) => `<div class="p-6"><div class="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700">Lỗi tải dữ liệu: ${e?.message||e}</div></div>`;
