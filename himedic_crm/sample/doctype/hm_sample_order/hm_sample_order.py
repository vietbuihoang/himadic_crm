
# -*- coding: utf-8 -*-
import frappe
from frappe.model.document import Document


class HMSampleOrder(Document):
	def validate(self):
		self._compute_totals(); self._sync_counts()

	def _compute_totals(self):
		st = 0
		for it in self.items or []:
			it.amount = (it.qty or 0) * (it.price or 0)
			st += it.amount or 0
		self.subtotal = st
		self.grand_total = st - (self.discount_amount or 0)

	def _sync_counts(self):
		self.total_tubes = len(self.tubes or [])
		self.collected_tubes = sum(1 for t in (self.tubes or []) if t.collected)

	@frappe.whitelist()
	def checkin(self, lat=None, lng=None, reason=None):
		from himedic_crm.sample.flows import checkin
		return checkin(self.name, lat, lng, reason)

	@frappe.whitelist()
	def finalize_collection(self, signature=None):
		from himedic_crm.sample.flows import finalize_collection
		return finalize_collection(self.name, signature)
