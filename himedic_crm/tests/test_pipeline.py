# -*- coding: utf-8 -*-
import json

import frappe
from frappe.tests.utils import FrappeTestCase

from himedic_crm.seed import demo
from himedic_crm.lead import flows as lead_flows
from himedic_crm.lead import conversion
from himedic_crm.deal import flows as deal_flows


class TestLeadFlows(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        demo()  # also applies the Chăm sóc workflow patch

    def test_log_activity_appears_on_timeline(self):
        lead = frappe.db.get_value("HM Lead", {}, "name")
        before = frappe.db.count("HM Activity", {"reference_name": lead})
        lead_flows.log_activity(lead, "Cuộc gọi", note="gọi tư vấn")
        after = frappe.db.count("HM Activity", {"reference_name": lead})
        self.assertEqual(after, before + 1)

    def test_apply_action_advances_stage(self):
        name = lead_flows.create_lead(json.dumps(
            {"lead_name": "QA Advance", "phone": "0900111222", "customer_type": "Cá nhân"}))["name"]
        self.assertEqual(frappe.db.get_value("HM Lead", name, "status"), "Mới")
        lead_flows.apply_action(name, "HM Submit")
        self.assertEqual(frappe.db.get_value("HM Lead", name, "status"), "Đã liên hệ")

    def test_convert_requires_qualified_BR_D_001(self):
        name = lead_flows.create_lead(json.dumps(
            {"lead_name": "QA Convert", "phone": "0900333444", "customer_type": "Cá nhân"}))["name"]
        with self.assertRaises(frappe.ValidationError):
            conversion.convert_lead(name)  # status 'Mới' → must raise

    def test_chamsoc_stage_is_reachable(self):
        cs = frappe.db.get_value("HM Lead", {"status": "Chăm sóc"}, "name")
        if cs:
            self.assertTrue(len(lead_flows.transitions(cs)) >= 1)


class TestDealFlows(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        demo()

    def _deal_in(self, status):
        return frappe.db.get_value("HM Deal", {"status": status}, "name")

    def test_close_lost_requires_reason_BR_D_015(self):
        name = self._deal_in("Đàm phán")
        with self.assertRaises(frappe.ValidationError):
            deal_flows.close_lost(name)

    def test_set_items_recomputes_total(self):
        name = self._deal_in("Báo giá") or self._deal_in("Thẩm định")
        items = [{"test_or_package": "Test", "test": "LIPID", "item_name": "Mỡ máu",
                  "qty": 2, "price": 350000, "amount": 700000}]
        out = deal_flows.set_items(name, json.dumps(items))
        self.assertEqual(out["subtotal"], 700000)

    def test_request_discount_over_5pct_needs_approval_BR_D_010(self):
        name = self._deal_in("Báo giá") or self._deal_in("Thẩm định")
        deal_flows.set_items(name, json.dumps(
            [{"test_or_package": "Test", "test": "LIPID", "item_name": "Mỡ máu",
              "qty": 1, "price": 1000000, "amount": 1000000}]))
        out = deal_flows.request_discount(name, 8)
        self.assertEqual(out["approval_status"], "Đang chờ")
        self.assertTrue(frappe.db.exists("HM Task", {"reference_name": name}))

    def test_close_won_creates_sample_order_BR_D_005(self):
        name = self._deal_in("Đàm phán")
        deal_flows.set_items(name, json.dumps(
            [{"test_or_package": "Test", "test": "HBA1C", "item_name": "HbA1c",
              "qty": 1, "price": 250000, "amount": 250000}]))
        out = deal_flows.close_won(name, win_reason="giá tốt")
        self.assertTrue(out.get("sample_order"))
        self.assertEqual(frappe.db.get_value("HM Sample Order", out["sample_order"], "deal"), name)
