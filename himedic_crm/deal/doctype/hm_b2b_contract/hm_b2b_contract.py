
# -*- coding: utf-8 -*-
import frappe
from frappe.model.document import Document


class HMB2BContract(Document):
	def validate(self):
		self.remaining_slots = (self.total_slots or 0) - (self.used_slots or 0)
		if self.end_date and self.start_date and self.end_date < self.start_date:
			frappe.throw('Ngày hết hạn phải sau ngày bắt đầu')
