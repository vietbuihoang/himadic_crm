
# -*- coding: utf-8 -*-
import frappe
from frappe.model.document import Document


class HMSampleManifest(Document):
	def validate(self):
		self.total_items = len(self.items or [])
		self.rejected_items = sum(1 for it in (self.items or []) if it.reject_reason)
		self.temperature_breached = any(l.breach for l in (self.temperature_logs or []))
