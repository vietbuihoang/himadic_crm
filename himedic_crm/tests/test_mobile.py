# -*- coding: utf-8 -*-
import frappe
from frappe.tests.utils import FrappeTestCase

from himedic_crm.seed import demo
from himedic_crm.sample import flows
from himedic_crm.api import mobile


class TestMobileCollection(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        demo()

    def _so(self):
        # demo SOs ([DEMO] address) have a valid contact; avoids polluted leftovers
        return frappe.db.get_value("HM Sample Order",
            {"status": "Đã phân công", "address": ["like", "%[DEMO]%"]}, "name") \
            or frappe.db.get_value("HM Sample Order", {"address": ["like", "%[DEMO]%"]}, "name")

    def test_my_day_shape(self):
        out = mobile.my_day()
        self.assertTrue({"user", "kpis", "orders"}.issubset(out.keys()))

    def test_verify_requires_cccd_BR_S_003(self):
        with self.assertRaises(frappe.ValidationError):
            flows.verify_identity(self._so(), national_id="")

    def test_add_tube_requires_verify_then_unique_BR_S_003_005(self):
        so = self._so()
        with self.assertRaises(frappe.ValidationError):
            flows.add_tube(so, "BC-AAA")  # before verify → BR-S-003
        flows.verify_identity(so, national_id="079200000001", match_score=96)
        flows.add_tube(so, "BC-AAA")
        with self.assertRaises(frappe.ValidationError):
            flows.add_tube(so, "BC-AAA")  # duplicate → BR-S-005

    def test_finalize_requires_signature_BR_S_006(self):
        so = self._so()
        with self.assertRaises(frappe.ValidationError):
            flows.finalize_collection(so, signature=None)

    def test_full_collection_flow(self):
        so = self._so()
        flows.checkin(so)
        flows.verify_identity(so, national_id="079200000002", match_score=97)
        flows.add_tube(so, "BC-FLOW-1")
        flows.finalize_collection(so, signature="data:image/png;base64,AAAA")
        self.assertEqual(frappe.db.get_value("HM Sample Order", so, "status"), "Đã lấy mẫu")
        self.assertEqual(frappe.db.get_value("HM Sample Order", so, "locked"), 1)
