
# -*- coding: utf-8 -*-
import frappe
from frappe.model.document import Document


class HMLead(Document):
	def before_save(self):
		from himedic_crm.lead.scoring import compute_score
		self.score = compute_score(self)

	def on_update_after_submit(self):
		pass

	@frappe.whitelist()
	def convert_to_deal(self, deal_value=0, deal_type='Đơn lẻ', expected_close_date=None):
		from himedic_crm.lead.conversion import convert_lead
		return convert_lead(self.name, deal_value, deal_type, expected_close_date)
