
// Hi-Medic CRM — desk-side helpers
frappe.provide("himedic_crm");

himedic_crm.convert_lead = function(lead_name) {
  frappe.prompt(
    [
      { fieldname: "deal_value", label: "Giá trị dự kiến (VND)", fieldtype: "Currency" },
      { fieldname: "deal_type", label: "Loại Cơ hội", fieldtype: "Select", options: ["Đơn lẻ","Gói combo","HĐ dài hạn B2B"], default: "Đơn lẻ" },
      { fieldname: "expected_close_date", label: "Ngày dự kiến đóng", fieldtype: "Date" },
    ],
    function(values) {
      frappe.call({
        method: "himedic_crm.lead.conversion.convert_lead",
        args: { lead_name, ...values },
        callback: (r) => {
          if (r.message && r.message.deal) {
            frappe.set_route("Form","HM Deal", r.message.deal);
          }
        },
      });
    },
    "Convert Lead → Cơ hội",
  );
};

himedic_crm.click_to_call = function(phone, ref_dt, ref_name) {
  frappe.call({
    method: "himedic_crm.api.voip.click_to_call",
    args: { phone, reference_doctype: ref_dt, reference_name: ref_name },
    callback: (r) => frappe.show_alert({message:"📞 Gọi: "+phone, indicator:"green"}),
  });
};
