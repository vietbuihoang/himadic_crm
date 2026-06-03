import { api, apiPost, refresh } from './app.js';
import { tag, avatar, initials, dfmt, screenHeader, emptyState, errorCard, disabledBtn, demoMark } from './lib.js';
import { toast, openModal, textareaField, field } from './ui.js';

const kindMeta = k => k === 'call'
  ? { label: 'Call', color: 'emerald', icon: '📞' }
  : { label: 'Zalo', color: 'blue', icon: '💬' };

const feedTitle = f => f.kind === 'call'
  ? (f.phone || 'Cuộc gọi')
  : 'Tin nhắn Zalo';

const feedPreview = f => f.kind === 'call'
  ? `Cuộc gọi ${f.direction || ''}`.trim()
  : 'Tin nhắn Zalo OA';

const CF = 'himedic_crm.communication.flows';
async function run(fn){ try { await fn(); } catch(e){ toast(e.message||String(e), 'err'); } }

async function contactSelect(name='contact'){
  const { rows } = await api('contact','list');
  return `<label class="block"><span class="text-slate-600">Khách hàng</span>
    <select name="${name}" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-brand-500">
      ${(rows||[]).map(r=>`<option value="${r.name}">${r.full_name} · ${r.phone||''}</option>`).join('')}
    </select></label>`;
}

window.__commUI = {
  async zalo(){
    const sel = await contactSelect();
    openModal({ title:'Gửi tin nhắn Zalo', submitLabel:'Gửi',
      bodyHtml: sel + textareaField('Nội dung','body','Xin chào, Hi-Medic …'),
      onSubmit: async (v)=>{
        const r = await apiPost(`${CF}.send_zalo`, { contact:v.contact, body:v.body,
          reference_doctype:'HM Contact', reference_name:v.contact });
        toast(`Đã gửi Zalo (${r.status})`); refresh(); }});
  },
  async email(){
    const sel = await contactSelect();
    const tpls = await apiPost(`${CF}.email_templates`, {});
    const tplOpts = `<label class="block"><span class="text-slate-600">Mẫu email</span>
      <select name="template" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
        <option value="">— Không dùng mẫu —</option>
        ${(tpls||[]).map(t=>`<option value="${t.name}">${t.template_name}</option>`).join('')}
      </select></label>`;
    openModal({ title:'Gửi Email', submitLabel:'Gửi',
      bodyHtml: sel + tplOpts + field('Tiêu đề','subject') + textareaField('Nội dung','body'),
      onSubmit: async (v)=>{
        const r = await apiPost(`${CF}.send_email`, { contact:v.contact, template:v.template||null,
          subject:v.subject||null, body:v.body||null, reference_doctype:'HM Contact', reference_name:v.contact });
        toast(r.sent ? `Đã gửi email tới ${r.to}` : `Đã ghi nhận (SMTP chưa cấu hình) · ${r.to}`); refresh(); }});
  },
  async call(){
    const sel = await contactSelect();
    openModal({ title:'Ghi nhận cuộc gọi', submitLabel:'Lưu',
      bodyHtml: sel + field('Kết quả','call_outcome',{placeholder:'VD: Đã kết nối, hẹn gọi lại'})
        + field('Thời lượng (giây)','duration_sec',{type:'number',value:'0'}),
      onSubmit: async (v)=>{
        await apiPost(`${CF}.log_call`, { contact:v.contact, call_outcome:v.call_outcome,
          duration_sec:v.duration_sec||0, reference_doctype:'HM Contact', reference_name:v.contact });
        toast('Đã ghi nhận cuộc gọi'); refresh(); }});
  },
};

const composeBar = `<div class="flex items-center gap-2">
  <button onclick="window.__commUI.zalo()" class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">💬 Zalo</button>
  <button onclick="window.__commUI.email()" class="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg">✉ Email</button>
  <button onclick="window.__commUI.call()" class="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg">📞 Cuộc gọi</button>
</div>`;

export const inbox = async () => {
  let data;
  try { data = await api('comm', 'inbox'); } catch(e){ return errorCard(e); }
  const feed = data.feed || [];
  const head = screenHeader('Hộp thư hợp nhất', 'Email + Zalo + Cuộc gọi · Hợp nhất theo khách hàng', composeBar);
  if(!feed.length) return head + emptyState('Chưa có cuộc trao đổi nào — dùng nút soạn ở trên để bắt đầu');
  return head + `
    <div class="p-6 grid grid-cols-12 gap-4">
      <div class="col-span-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="border-b border-slate-200 p-3 flex gap-1 text-xs">
          ${[`Tất cả (${feed.length})`,'Chưa đọc','Đã gán'].map((t,i)=>disabledBtn(t,`px-2 py-1 rounded ${i===0?'bg-brand-50 text-brand-700':'text-slate-600'}`)).join('')}
        </div>
        <div class="divide-y divide-slate-100">
          ${feed.map(f=>{
            const m = kindMeta(f.kind);
            const n = feedTitle(f);
            return `
            <div class="p-3 hover:bg-slate-50 cursor-pointer">
              <div class="flex items-center gap-2">
                ${avatar(m.icon, m.color, m.color+'-600')}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2"><span class="font-medium text-sm truncate">${n}</span>${tag(m.label, m.color)}</div>
                  <div class="text-xs text-slate-500 truncate">${feedPreview(f)}</div>
                </div>
                <span class="text-[11px] text-slate-400">${dfmt(f.creation)}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="col-span-8 bg-white rounded-xl border border-slate-200 flex flex-col">
        <div class="border-b border-slate-200 p-3 flex items-center gap-3">
          ${avatar('HT','amber','amber-500')}
          <div class="flex-1">
            <div class="font-semibold">Chị Hương Trần ${demoMark}</div>
            <div class="text-xs text-slate-500">Zalo OA · KH tiềm năng đang chăm sóc · Phụ trách: bạn</div>
          </div>
          ${disabledBtn('Mở hồ sơ →','text-xs px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg')}
        </div>
        <div class="flex-1 p-4 space-y-3 bg-slate-50 min-h-[400px]">
          <div class="text-center text-xs text-slate-400">Hôm nay 10:30 ${demoMark}</div>
          <div class="flex justify-start"><div class="max-w-md bg-white px-3 py-2 rounded-2xl rounded-tl-sm text-sm border border-slate-200">Chào em, chị muốn đặt gói khám tổng quát cho mẹ nha.</div></div>
          <div class="flex justify-end"><div class="max-w-md bg-brand-600 text-white px-3 py-2 rounded-2xl rounded-tr-sm text-sm">Dạ chào chị! Em là Lan từ Hi-Medic. Em xin gửi báo giá Gói Tổng quát Premium phù hợp tuổi của bác ạ. (đính kèm)</div></div>
          <div class="flex justify-start"><div class="max-w-md bg-white px-3 py-2 rounded-2xl rounded-tl-sm text-sm border border-slate-200">Lấy mẫu tại nhà được không em? Sáng cuối tuần nhé.</div></div>
          <div class="flex justify-end"><div class="max-w-md bg-brand-600 text-white px-3 py-2 rounded-2xl rounded-tr-sm text-sm">Dạ được ạ. Em book sáng thứ 7 7:30 nhé chị. Em sẽ ghé đúng giờ.</div></div>
          <div class="flex justify-start"><div class="max-w-md bg-white px-3 py-2 rounded-2xl rounded-tl-sm text-sm border border-slate-200">Cảm ơn em, mai 7:30 nhé!</div></div>
        </div>
        <div class="border-t border-slate-200 p-3">
          <div class="flex items-center gap-2 mb-2 text-xs">
            ${disabledBtn('📋 Mẫu','px-2 py-1 bg-slate-100 rounded')}
            ${disabledBtn('📎 Đính kèm','px-2 py-1 bg-slate-100 rounded')}
            ${disabledBtn('✨ AI gợi ý','px-2 py-1 bg-slate-100 rounded')}
            <span class="ml-auto text-slate-400">Gửi qua: <b class="text-blue-600">Zalo</b></span>
          </div>
          <div class="flex gap-2">
            <input disabled title="Chỉ đọc trong bản này" class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm opacity-60 cursor-not-allowed" placeholder="Nhập tin nhắn…">
            ${disabledBtn('Gửi','px-4 py-2 bg-brand-600 text-white rounded-lg text-sm')}
          </div>
        </div>
      </div>
    </div>`;
};

export const portal = async () => `
  ${screenHeader('Cổng khách hàng – Xem trước', 'Khách đăng nhập bằng SĐT + OTP để xem kết quả')}
  <div class="p-8 bg-slate-100 grid place-items-center">
    <div class="w-[900px] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      <div class="h-12 bg-brand-700 text-white px-6 flex items-center gap-3 text-sm">
        <div class="w-7 h-7 rounded-lg bg-cyan-300 grid place-items-center text-brand-900 font-bold">H</div>
        <span class="font-semibold">Hi-Medic</span>
        <span class="ml-auto">Xin chào, anh Phạm Quốc Hùng ${demoMark}</span>
      </div>
      <div class="p-6 grid grid-cols-3 gap-4">
        ${[['Lần khám gần nhất','02/01/2026','sky'],['Kết quả mới','1 ✨','emerald'],['Lịch hẹn sắp tới','15/06','amber']].map(([l,v,c])=>`<div class="rounded-xl bg-${c}-50 border border-${c}-200 p-4"><div class="text-xs text-${c}-700">${l}</div><div class="font-bold text-xl text-${c}-700 mt-1">${v} ${demoMark}</div></div>`).join('')}
      </div>
      <div class="px-6 pb-6">
        <div class="font-semibold mb-3 text-sm">Kết quả xét nghiệm</div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-500 text-white grid place-items-center">✓</div>
          <div class="flex-1">
            <div class="font-semibold">Gói tiền hôn nhân – Kết quả đã có</div>
            <div class="text-xs text-emerald-700">14 chỉ số · Bác sĩ Lab đã ký · Tải PDF (có dấu) ${demoMark}</div>
          </div>
          ${disabledBtn('Xem kết quả','px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm')}
        </div>
        <div class="mt-4 font-semibold mb-3 text-sm">Đặt lịch mới</div>
        <div class="grid grid-cols-3 gap-3">
          ${['Khám tổng quát','Tầm soát ung thư','Theo dõi định kỳ'].map(t=>disabledBtn(t,'p-4 border border-slate-200 rounded-xl text-sm font-medium')).join('')}
        </div>
      </div>
    </div>
  </div>`;
