# -*- coding: utf-8 -*-
import unittest

from himedic_crm.seed import demo
from himedic_crm.api.desk import lead


class TestDeskAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        demo()

    def test_lead_list_shape(self):
        out = lead.list()
        self.assertTrue({"rows", "total", "summary"}.issubset(out.keys()))
        self.assertIsInstance(out["rows"], list)
        if out["rows"]:
            self.assertIn("lead_name", out["rows"][0])

    def test_lead_kanban_shape(self):
        out = lead.kanban()
        self.assertIn("columns", out)
        self.assertIsInstance(out["columns"], list)
        for c in out["columns"]:
            self.assertTrue({"stage", "color", "count", "cards"}.issubset(c.keys()))

    def test_lead_detail_shape(self):
        out = lead.detail()
        self.assertTrue(out is None or "lead_name" in out)
