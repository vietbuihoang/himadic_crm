import { api } from './app.js';
import { tag, avatar, initials, dfmt, screenHeader, emptyState, errorCard, disabledBtn, demoMark } from './lib.js';

const STATUS_COLOR = {'Open':'sky','In Progress':'violet','Done':'emerald','Cancelled':'rose'};
const STATUS_LABEL = {'Open':'Cần làm','In Progress':'Đang làm','Done':'Hoàn thành','Cancelled':'Đã hủy'};
const typeColor = t => ({'Cuộc gọi':'sky','Follow-up':'amber','Họp':'violet','Thăm khách':'emerald','Khác':'slate'}[t]||'slate');

// Monday of the week containing `base` (a Date).
function weekStart(base){
  const d = new Date(base);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const DOW = ['T2','T3','T4','T5','T6','T7','CN'];

export const calendar = async () => {
  let data;
  try { data = await api('tasks', 'list'); } catch(e){ return errorCard(e); }
  const rows = data.rows || [];

  const today = new Date();
  const start = weekStart(today);
  const days = Array.from({length:7}, (_,i)=>{ const d = new Date(start); d.setDate(start.getDate()+i); return d; });
  const end = new Date(start); end.setDate(start.getDate()+6);
  const todayKey = ymd(today);

  // group real tasks by their due_date (YYYY-MM-DD)
  const byDay = {};
  rows.forEach(t=>{
    const key = t.due_date ? String(t.due_date).slice(0,10) : null;
    if(!key) return;
    (byDay[key] = byDay[key] || []).push(t);
  });

  const head = screenHeader('Lịch tuần',
    `Tuần ${ymd(start).slice(8)}/${ymd(start).slice(5,7)} - ${ymd(end).slice(8)}/${ymd(end).slice(5,7)}/${end.getFullYear()} · ${rows.length} công việc`,
    `${disabledBtn('◀','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg')}
     ${disabledBtn('Hôm nay','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg')}
     ${disabledBtn('▶','px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg')}
     ${disabledBtn('+ Sự kiện','px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg')}`);

  if(!rows.length) return head + emptyState('Chưa có công việc nào');

  return head + `
    <div class="p-6">
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="grid grid-cols-7 border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
          ${days.map(d=>{ const key = ymd(d); const on = key===todayKey;
            return `<div class="p-2 text-center ${on?'bg-brand-50 text-brand-700':''}">${DOW[(d.getDay()+6)%7]} ${d.getDate()}/${d.getMonth()+1}</div>`;
          }).join('')}
        </div>
        <div class="grid grid-cols-7 min-h-[420px]">
          ${days.map(d=>{ const key = ymd(d); const items = byDay[key]||[]; const on = key===todayKey;
            return `<div class="border-l border-slate-100 first:border-l-0 p-2 space-y-2 align-top ${on?'bg-brand-50/40':''}">
              ${items.map(t=>`
                <div class="rounded-lg bg-${STATUS_COLOR[t.status]||'slate'}-100 text-${STATUS_COLOR[t.status]||'slate'}-800 border border-${STATUS_COLOR[t.status]||'slate'}-300 px-2 py-1.5 text-xs font-medium">
                  <div class="leading-snug">${t.subject||'—'}</div>
                  <div class="mt-1 flex items-center justify-between gap-1 text-[10px] opacity-80">
                    <span>${t.task_type||''}</span>
                    <span>${t.assigned_to?initials(t.assigned_to):''}</span>
                  </div>
                </div>`).join('') || `<div class="text-center text-[11px] text-slate-300 pt-6">—</div>`}
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="mt-3 text-xs text-slate-400">Lịch dựng từ <b>due_date</b> của công việc · tuần hiện tại</div>
    </div>`;
};

export const board = async () => {
  let data;
  try { data = await api('tasks', 'board'); } catch(e){ return errorCard(e); }
  const cols = data.columns || [];
  const total = cols.reduce((n,c)=>n + (c.cards||[]).length, 0);

  const head = screenHeader('Bảng công việc',
    `Của tôi · ${total} công việc · ${cols.length} trạng thái`,
    disabledBtn('+ Thêm việc','px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg'));

  if(!total) return head + emptyState('Chưa có công việc nào');

  return head + `
    <div class="p-6 grid grid-cols-${Math.min(cols.length||1,4)} gap-3">
      ${cols.map(c=>{ const color = STATUS_COLOR[c.status]||'slate'; const cards = c.cards||[];
        return `<div class="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div class="flex items-center gap-2 mb-2 px-1">
            <span class="w-2 h-2 rounded-full bg-${color}-500"></span>
            <span class="font-semibold text-sm text-slate-700">${STATUS_LABEL[c.status]||c.status}</span>
            <span class="text-xs text-slate-400">(${cards.length})</span>
          </div>
          <div class="space-y-2">
            ${cards.map(t=>`
              <div class="bg-white rounded-lg p-2.5 border border-slate-200">
                <div class="text-sm text-slate-800">${t.subject||'—'}</div>
                <div class="mt-1.5 flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1 flex-wrap">
                    ${tag(t.task_type||'—', typeColor(t.task_type))}
                    ${t.due_date?`<span class="text-[10px] text-slate-400">${dfmt(t.due_date)}</span>`:''}
                  </div>
                  ${t.assigned_to?avatar(initials(t.assigned_to)):''}
                </div>
              </div>`).join('') || `<div class="text-center text-xs text-slate-300 pt-4">—</div>`}
          </div>
        </div>`;
      }).join('')}
    </div>`;
};
