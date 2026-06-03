// Lightweight toast + modal helpers for the CRM workspace (no deps).

export function toast(message, type='ok'){
  const colors = { ok:'bg-emerald-600', err:'bg-rose-600', info:'bg-brand-700' };
  let wrap = document.getElementById('hm-toasts');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.id = 'hm-toasts';
    wrap.className = 'fixed bottom-5 right-5 z-[100] flex flex-col gap-2';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `${colors[type]||colors.ok} text-white text-sm px-4 py-2.5 rounded-lg shadow-lg max-w-sm`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s'; el.style.opacity='0'; setTimeout(()=>el.remove(),300); }, 3200);
}

export function closeModal(){
  const m = document.getElementById('hm-modal');
  if(m) m.remove();
}

/**
 * openModal({ title, bodyHtml, submitLabel, onSubmit })
 * - bodyHtml: form fields; inputs/selects/textareas with a `name` are collected.
 * - onSubmit(values): may be async; throw to show an inline error; resolve to close.
 */
export function openModal({ title, bodyHtml='', submitLabel='Lưu', onSubmit }){
  closeModal();
  const root = document.createElement('div');
  root.id = 'hm-modal';
  root.className = 'fixed inset-0 z-[90] bg-slate-900/40 flex items-center justify-center p-4';
  root.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
      <div class="px-5 py-4 border-b border-slate-200 flex items-center">
        <h3 class="font-semibold text-slate-800">${title}</h3>
        <button data-close class="ml-auto text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
      </div>
      <form data-form class="p-5 overflow-y-auto scroll-thin space-y-3 text-sm">${bodyHtml}</form>
      <div data-err class="px-5 text-xs text-rose-600 hidden"></div>
      <div class="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
        <button data-close class="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Hủy</button>
        <button data-submit class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">${submitLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(root);
  const form = root.querySelector('[data-form]');
  const errBox = root.querySelector('[data-err]');
  const submitBtn = root.querySelector('[data-submit]');
  root.querySelectorAll('[data-close]').forEach(b=> b.onclick = closeModal);
  root.addEventListener('mousedown', e=>{ if(e.target===root) closeModal(); });

  async function submit(){
    errBox.classList.add('hidden'); errBox.textContent='';
    const values = {};
    form.querySelectorAll('[name]').forEach(el=>{
      values[el.name] = el.type==='checkbox' ? el.checked : el.value;
    });
    submitBtn.disabled = true; submitBtn.textContent = 'Đang lưu…';
    try {
      if(onSubmit) await onSubmit(values);
      closeModal();
    } catch(e){
      errBox.textContent = e.message || String(e);
      errBox.classList.remove('hidden');
      submitBtn.disabled = false; submitBtn.textContent = submitLabel;
    }
  }
  submitBtn.onclick = submit;
  form.onsubmit = e=>{ e.preventDefault(); submit(); };
  const first = form.querySelector('input,select,textarea');
  if(first) first.focus();
}

// Field builders for modal bodies.
export const field = (label, name, opts={}) => {
  const { type='text', value='', placeholder='', required=false } = opts;
  return `<label class="block"><span class="text-slate-600">${label}${required?' *':''}</span>
    <input name="${name}" type="${type}" value="${value}" placeholder="${placeholder}" ${required?'required':''}
      class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-brand-500"></label>`;
};
export const selectField = (label, name, options, value='') =>
  `<label class="block"><span class="text-slate-600">${label}</span>
    <select name="${name}" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-brand-500">
      ${options.map(o=>`<option value="${o}" ${o===value?'selected':''}>${o}</option>`).join('')}
    </select></label>`;
export const textareaField = (label, name, placeholder='') =>
  `<label class="block"><span class="text-slate-600">${label}</span>
    <textarea name="${name}" rows="3" placeholder="${placeholder}"
      class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-brand-500"></textarea></label>`;
