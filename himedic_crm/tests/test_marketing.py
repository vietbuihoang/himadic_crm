# -*- coding: utf-8 -*-
import json

import frappe
from frappe.tests.utils import FrappeTestCase

from himedic_crm.seed import demo
from himedic_crm.marketing import flows as mk


class TestMarketingFlows(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        demo()
        # natural-key records (campaign_code / rule_name are the PK) must not collide
        # across runs since demo() commits and breaks per-test rollback isolation.
        for dt, key in [("HM Campaign", "QA-CMP"), ("HM Lead Assignment Rule", "QA Rule")]:
            if frappe.db.exists(dt, key):
                frappe.delete_doc(dt, key, force=True, ignore_permissions=True)
        frappe.db.commit()

    def test_create_campaign_and_status(self):
        r = mk.create_campaign(json.dumps({"campaign_code": "QA-CMP", "campaign_name": "QA Campaign",
                                           "channel": "FB", "budget": 1000000}))
        self.assertTrue(r["name"])
        mk.set_status(r["name"], "Đang chạy")
        self.assertEqual(frappe.db.get_value("HM Campaign", r["name"], "status"), "Đang chạy")
        with self.assertRaises(frappe.ValidationError):
            mk.set_status(r["name"], "Bogus")

    def test_recompute_roi_counts_linked_leads_BR_MKT_001(self):
        camp = frappe.db.get_value("HM Campaign", {}, "name")
        lead = frappe.db.get_value("HM Lead", {}, "name")
        frappe.db.set_value("HM Lead", lead, "campaign", camp)
        out = mk.recompute_roi(camp)
        self.assertGreaterEqual(out["metrics"][camp]["leads_count"], 1)
        self.assertGreaterEqual(frappe.db.get_value("HM Campaign", camp, "leads_count"), 1)

    def test_create_and_toggle_rule(self):
        r = mk.create_rule(json.dumps({"rule_name": "QA Rule", "assignment_type": "Round-robin",
                                       "priority": 10}))
        self.assertEqual(frappe.db.get_value("HM Lead Assignment Rule", r["name"], "is_active"), 1)
        mk.toggle_rule(r["name"])
        self.assertEqual(frappe.db.get_value("HM Lead Assignment Rule", r["name"], "is_active"), 0)
