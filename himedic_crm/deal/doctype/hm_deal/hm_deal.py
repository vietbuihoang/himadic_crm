
# -*- coding: utf-8 -*-
import frappe
from frappe.model.document import Document


class HMDeal(Document):
	def validate(self):
		self._compute_totals()
		self._enforce_business_rules()

	def _compute_totals(self):
		st = 0.0; disc = 0.0
		for it in self.items or []:
			line = (it.qty or 0) * (it.price or 0)
			line_disc = line * ((it.discount_pct or 0) / 100.0)
			it.amount = line - line_disc
			st += line; disc += line_disc
		self.subtotal = st
		self.discount_amount = disc
		self.discount_pct = (disc / st * 100.0) if st else 0
		self.grand_total = st - disc

	def _enforce_business_rules(self):
		from himedic_crm.deal.rules import enforce_rules
		enforce_rules(self)

	@frappe.whitelist()
	def close_won(self, win_reason=None):
		from himedic_crm.deal.flows import close_won
		return close_won(self.name, win_reason)

	@frappe.whitelist()
	def close_lost(self, lost_reason=None):
		from himedic_crm.deal.flows import close_lost
		return close_lost(self.name, lost_reason)
