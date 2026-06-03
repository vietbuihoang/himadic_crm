# -*- coding: utf-8 -*-
import frappe
from frappe.tests.utils import FrappeTestCase

from himedic_crm.seed import demo
from himedic_crm.api import portal


class TestCustomerPortal(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        demo()

    def _contact_with_result(self):
        r = frappe.db.get_value("HM Test Result", {"released_to_portal": 1}, "contact")
        return r, frappe.db.get_value("HM Contact", r, "phone")

    def setUp(self):
        # Redis cache is not rolled back between tests — clear OTP rate-limit keys.
        _, phone = self._contact_with_result()
        c = frappe.cache()
        for k in (f"hm_otp_cd::{phone}", f"hm_otp_h::{phone}", f"hm_otp_fail::{phone}",
                  f"hm_portal_otp::{phone}", "hm_otp_ip::?"):
            c.delete_value(k)

    @staticmethod
    def _fresh():
        # rate-limit reads Redis; each real call is a fresh HTTP request → reset the
        # request-local cache so the test sees committed Redis values (prod is per-request).
        frappe.local.cache = {}

    def test_otp_cooldown_blocks_immediate_resend(self):
        _, phone = self._contact_with_result()
        portal.request_otp(phone)
        self._fresh()
        with self.assertRaises(frappe.ValidationError):
            portal.request_otp(phone)  # within cooldown → blocked

    def test_verify_locks_after_repeated_fails(self):
        _, phone = self._contact_with_result()
        portal.request_otp(phone)
        for _ in range(5):
            self._fresh()
            with self.assertRaises(frappe.ValidationError):
                portal.verify_otp(phone, "000000")  # wrong code
        self._fresh()
        with self.assertRaises(frappe.ValidationError):
            portal.verify_otp(phone, "000000")  # now temporarily locked

    def test_request_otp_unknown_phone_raises(self):
        with self.assertRaises(frappe.ValidationError):
            portal.request_otp("0000000000")

    def test_request_otp_known_phone_sets_cache(self):
        _, phone = self._contact_with_result()
        out = portal.request_otp(phone)
        self.assertTrue(out["ok"])
        self.assertTrue(frappe.cache().get_value(f"hm_portal_otp::{phone}"))

    def test_verify_otp_wrong_code_raises(self):
        _, phone = self._contact_with_result()
        portal.request_otp(phone)
        with self.assertRaises(frappe.ValidationError):
            portal.verify_otp(phone, "000000")

    def test_customer_sees_own_results_and_appointments(self):
        contact, _ = self._contact_with_result()
        cu = f"customer.{contact}@hi-medic.local"
        if not frappe.db.exists("User", cu):
            frappe.get_doc({"doctype": "User", "email": cu, "first_name": contact,
                            "send_welcome_email": 0, "user_type": "Website User",
                            "roles": [{"role": "HM Customer"}]}).insert(ignore_permissions=True)
        frappe.set_user(cu)
        try:
            self.assertGreaterEqual(len(portal.my_results()), 1)
            # appointments may be empty for this contact, but the call must succeed
            self.assertIsInstance(portal.my_appointments(), list)
        finally:
            frappe.set_user("Administrator")
