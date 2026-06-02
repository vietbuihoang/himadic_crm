
# -*- coding: utf-8 -*-
import frappe
from frappe.model.document import Document


class HMContact(Document):
	def validate(self):
		import re
		if self.phone:
			self.phone = re.sub(r'\D','', self.phone)
		if self.national_id and not self.national_id.isdigit():
			frappe.throw('CCCD phải là số')
