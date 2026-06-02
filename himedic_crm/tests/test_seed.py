# -*- coding: utf-8 -*-
import unittest

import frappe

from himedic_crm.seed import demo


class TestDemoSeeder(unittest.TestCase):
    def test_demo_seeds_and_is_idempotent(self):
        demo()
        first = frappe.db.count("HM Lead")
        self.assertGreaterEqual(first, 5)
        demo()  # run again — must not duplicate
        second = frappe.db.count("HM Lead")
        self.assertEqual(first, second)
