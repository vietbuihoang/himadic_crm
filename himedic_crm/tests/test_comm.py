# -*- coding: utf-8 -*-
import frappe
from frappe.tests.utils import FrappeTestCase

from himedic_crm.seed import demo
from himedic_crm.communication import flows as comm


class TestCommFlows(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        demo()

    def _contact(self, with_email=False):
        c = frappe.db.get_value("HM Contact", {}, "name")
        if with_email and not frappe.db.get_value("HM Contact", c, "email"):
            frappe.db.set_value("HM Contact", c, "email", "qa@example.com")
        return c

    def test_email_templates_listed(self):
        self.assertGreaterEqual(len(comm.email_templates()), 1)

    def test_send_zalo_creates_message(self):
        c = self._contact()
        before = frappe.db.count("HM Zalo Message")
        out = comm.send_zalo(c, body="Xin chào")
        self.assertTrue(out["message"])
        self.assertEqual(frappe.db.count("HM Zalo Message"), before + 1)

    def test_send_sms_graceful_and_logs_activity(self):
        c = self._contact()
        out = comm.send_sms(c, "Xin chào", reference_doctype="HM Contact", reference_name=c)
        self.assertTrue(out["ok"])  # handled gracefully even when gateway unconfigured
        self.assertTrue(frappe.db.exists("HM Activity",
            {"reference_name": c, "activity_type": "SMS"}))

    def test_log_call_creates_voip_log(self):
        c = self._contact()
        before = frappe.db.count("HM VoIP Call Log")
        comm.log_call(c, call_outcome="Đã kết nối", duration_sec=60)
        self.assertEqual(frappe.db.count("HM VoIP Call Log"), before + 1)

    def test_send_email_logs_activity(self):
        c = self._contact(with_email=True)
        tpl = comm.email_templates()[0]["name"]
        out = comm.send_email(c, template=tpl, reference_doctype="HM Contact", reference_name=c)
        self.assertTrue(out["ok"])
        self.assertTrue(frappe.db.exists("HM Activity",
            {"reference_name": c, "activity_type": "Email"}))
