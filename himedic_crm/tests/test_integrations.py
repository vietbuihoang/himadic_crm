# -*- coding: utf-8 -*-
from unittest.mock import patch, MagicMock

import frappe
from frappe.tests.utils import FrappeTestCase

from himedic_crm.api import zalo


class TestZaloTokenRefresh(FrappeTestCase):
    def _settings(self, app_id=None, secret=None, refresh=None):
        s = frappe.get_single("HM CRM Settings")
        s.zalo_app_id = app_id
        s.zalo_app_secret = secret
        s.zalo_refresh_token = refresh
        s.zalo_oa_token = "OLD"
        s.save(ignore_permissions=True)
        frappe.db.commit()
        return s

    def tearDown(self):
        # leave no stub tokens behind
        s = frappe.get_single("HM CRM Settings")
        s.zalo_oa_token = None
        s.zalo_refresh_token = None
        s.save(ignore_permissions=True)
        frappe.db.commit()

    def test_refresh_not_configured_is_graceful(self):
        self._settings(app_id=None)
        out = zalo.refresh_oa_token()
        self.assertFalse(out["ok"])
        self.assertEqual(out["error"], "not-configured")

    def test_refresh_saves_and_rotates_tokens(self):
        self._settings(app_id="123", secret="appsecret", refresh="oldrt")
        fake = MagicMock(ok=True)
        fake.json.return_value = {"access_token": "NEWAT", "refresh_token": "NEWRT", "expires_in": 90000}
        with patch("himedic_crm.api.zalo.requests.post", return_value=fake) as m:
            out = zalo.refresh_oa_token()
        self.assertTrue(out["ok"])
        # called the Zalo OAuth endpoint
        self.assertIn("oauth.zaloapp.com", m.call_args[0][0])
        s = frappe.get_single("HM CRM Settings")
        self.assertEqual(s.get_password("zalo_oa_token"), "NEWAT")
        self.assertEqual(s.get_password("zalo_refresh_token"), "NEWRT")  # rotated
