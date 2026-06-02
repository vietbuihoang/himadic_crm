
# -*- coding: utf-8 -*-
import frappe
from frappe.model.document import Document


class HMQuotation(Document):
	def validate(self):
		total = 0.0; d = 0.0
		for it in self.items or []:
			line = (it.qty or 0) * (it.price or 0)
			disc = line * ((it.discount_pct or 0) / 100.0)
			it.amount = line - disc
			total += line; d += disc
		self.subtotal = total; self.discount_amount = d; self.grand_total = total - d
