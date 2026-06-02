# -*- coding: utf-8 -*-
import unittest

from himedic_crm.seed import demo
from himedic_crm.api.desk import (
    lead, deal, contact, sample, logistics, catalog, tasks, comm, marketing, reports, admin,
)

# (module, method, required keys in the returned dict)
CASES = [
    (lead, "list", {"rows", "total", "summary"}),
    (lead, "kanban", {"columns"}),
    (deal, "kanban", {"columns"}),
    (contact, "list", {"rows", "total", "by_type"}),
    (sample, "list", {"rows", "total", "status_color"}),
    (logistics, "manifest", {"rows", "status_color"}),
    (logistics, "reception", {"rows"}),
    (catalog, "tests", {"rows", "total"}),
    (catalog, "package", {"rows", "total"}),
    (tasks, "list", {"rows"}),
    (tasks, "board", {"columns"}),
    (comm, "inbox", {"feed"}),
    (marketing, "campaigns", {"rows", "totals"}),
    (marketing, "routing", {"rows"}),
    (reports, "sales", {"pipeline", "won", "lost", "win_rate", "forecast"}),
    (reports, "ops", {"orders_total", "reject_rate", "by_status"}),
    (admin, "users", {"rows", "hm_roles"}),
    (admin, "workflow", {"rows"}),
]


class TestDeskAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        demo()

    def test_all_module_methods_return_expected_shape(self):
        for module, method, keys in CASES:
            with self.subTest(method=f"{module.__name__}.{method}"):
                out = getattr(module, method)()
                self.assertIsInstance(out, dict)
                self.assertTrue(keys.issubset(out.keys()),
                                f"{module.__name__}.{method} missing {keys - set(out.keys())}")

    def test_detail_methods_tolerate_default(self):
        # detail/profile default to the most-recent record and must not raise
        self.assertTrue(lead.detail() is None or "lead_name" in lead.detail())
        self.assertTrue(deal.detail() is None or "deal_title" in deal.detail())
        self.assertTrue(contact.profile() is None or "full_name" in contact.profile())
