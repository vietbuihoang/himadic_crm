# -*- coding: utf-8 -*-
import json

import frappe
from frappe.tests.utils import FrappeTestCase

from himedic_crm.seed import demo
from himedic_crm.contact_and_org import flows as cflows
from himedic_crm.task_and_activity import flows as tflows


class TestContactFlows(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        demo()

    def test_create_contact(self):
        r = cflows.create_contact(json.dumps({"full_name": "QA Liên hệ", "phone": "0901234567"}))
        self.assertTrue(r["name"])

    def test_record_consent_stamps_fields(self):
        c = frappe.db.get_value("HM Contact", {}, "name")
        cflows.record_consent(c, "v2.0")
        self.assertEqual(frappe.db.get_value("HM Contact", c, "pdpa_consent_given"), 1)
        self.assertEqual(frappe.db.get_value("HM Contact", c, "pdpa_consent_version"), "v2.0")

    def test_medical_access_requires_purpose_and_audits_BR_PDPA_001(self):
        c = frappe.db.get_value("HM Contact", {}, "name")
        with self.assertRaises(frappe.ValidationError):
            cflows.log_medical_access(c, "")
        before = frappe.db.count("HM Audit Log", {"reference_name": c})
        cflows.log_medical_access(c, "Tư vấn kết quả")
        after = frappe.db.count("HM Audit Log", {"reference_name": c})
        self.assertEqual(after, before + 1)


class TestTaskFlows(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        demo()

    def test_create_then_complete(self):
        r = tflows.create_task(json.dumps({"subject": "QA việc", "assigned_to": "Administrator"}))
        self.assertEqual(frappe.db.get_value("HM Task", r["name"], "status"), "Open")
        tflows.complete_task(r["name"])
        self.assertEqual(frappe.db.get_value("HM Task", r["name"], "status"), "Done")

    def test_set_status_validates(self):
        r = tflows.create_task(json.dumps({"subject": "QA việc 2", "assigned_to": "Administrator"}))
        with self.assertRaises(frappe.ValidationError):
            tflows.set_status(r["name"], "Bogus")
