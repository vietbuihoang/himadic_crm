# -*- coding: utf-8 -*-
import json

import frappe
from frappe.tests.utils import FrappeTestCase

from himedic_crm.seed import demo
from himedic_crm.logistics import flows as log_flows


class TestLogisticsFlows(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        demo()

    def _collected_so(self):
        so = frappe.db.get_value("HM Sample Order", {"status": "Đã lấy mẫu"}, "name")
        if not so:
            so = frappe.db.get_value("HM Sample Order", {}, "name")
            frappe.db.set_value("HM Sample Order", so, "status", "Đã lấy mẫu")
        return so

    def test_create_manifest_requires_seal_BR_L_105(self):
        so = self._collected_so()
        with self.assertRaises(frappe.ValidationError):
            log_flows.create_manifest(json.dumps([so]), seal_no=None)

    def test_create_manifest_requires_orders(self):
        with self.assertRaises(frappe.ValidationError):
            log_flows.create_manifest(json.dumps([]), seal_no="SEAL-1")

    def test_lab_receive_marks_orders_received(self):
        so = self._collected_so()
        m = log_flows.create_manifest(json.dumps([so]), seal_no="SEAL-LR", shipper="Administrator")
        out = log_flows.lab_receive(m["manifest"])
        self.assertGreaterEqual(out["orders"], 1)
        self.assertEqual(frappe.db.get_value("HM Sample Order", so, "status"), "Đã nhập Lab")

    def test_reject_creates_recollection_BR_L_108(self):
        so = self._collected_so()
        m = log_flows.create_manifest(json.dumps([so]), seal_no="SEAL-RJ", shipper="Administrator")
        before = frappe.db.count("HM Sample Order", {"order_type": "Re-collection"})
        out = log_flows.reject_item(m["manifest"], so, "vỡ ống")
        self.assertTrue(out["recollection"])
        self.assertEqual(frappe.db.get_value("HM Sample Order", so, "status"), "Lỗi mẫu")
        self.assertEqual(frappe.db.count("HM Sample Order", {"order_type": "Re-collection"}), before + 1)
