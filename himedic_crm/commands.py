
# -*- coding: utf-8 -*-
"""Custom bench commands. Run: bench himedic <subcmd>"""
import click


@click.command("himedic-seed-demo")
def seed_demo():
    """Seed demo data: 5 leads, 2 deals, 1 sample order."""
    import frappe
    frappe.connect(site="himedic.local")
    from himedic_crm.tests.smoke import create_demo_lead
    for _ in range(5):
        create_demo_lead()
    print("Seeded.")
    frappe.destroy()


commands = [seed_demo]
