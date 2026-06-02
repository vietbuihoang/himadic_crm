
# -*- coding: utf-8 -*-
"""Row-level permission query conditions for Lead / Deal / Sample Order / Contact."""
import frappe


def _team_users(user):
    """Return list of users in same team as `user` (manager sees team members)."""
    team = frappe.db.get_value("User", user, "team") if frappe.db.has_column("User", "team") else None
    if not team:
        return [user]
    rows = frappe.db.sql("SELECT name FROM `tabUser` WHERE team=%s", team, as_dict=False)
    return [r[0] for r in rows] or [user]


def _has_role(user, role):
    return role in frappe.get_roles(user)


def lead_query(user=None):
    user = user or frappe.session.user
    if _has_role(user, "HM Admin") or _has_role(user, "HM BOD") or _has_role(user, "HM Marketing"):
        return ""
    if _has_role(user, "HM Sales Manager"):
        team = _team_users(user)
        return "(`tabHM Lead`.owner_user IN ({0}) OR `tabHM Lead`.owner IN ({0}))".format(
            ",".join([frappe.db.escape(u) for u in team])
        )
    if _has_role(user, "HM Sales"):
        return "(`tabHM Lead`.owner_user={0} OR `tabHM Lead`.owner={0})".format(frappe.db.escape(user))
    return "1=0"


def deal_query(user=None):
    user = user or frappe.session.user
    if _has_role(user, "HM Admin") or _has_role(user, "HM BOD"):
        return ""
    if _has_role(user, "HM Accountant"):
        return "`tabHM Deal`.status='Đã chốt'"
    if _has_role(user, "HM Sales Manager"):
        team = _team_users(user)
        return "(`tabHM Deal`.owner_user IN ({0}))".format(
            ",".join([frappe.db.escape(u) for u in team])
        )
    if _has_role(user, "HM Sales"):
        return "(`tabHM Deal`.owner_user={0})".format(frappe.db.escape(user))
    return "1=0"


def sample_order_query(user=None):
    user = user or frappe.session.user
    if _has_role(user, "HM Admin") or _has_role(user, "HM BOD") or _has_role(user, "HM Lab Coordinator"):
        return ""
    if _has_role(user, "HM Sales Manager"):
        team = _team_users(user)
        return "(`tabHM Sample Order`.assigned_to IN ({0}))".format(
            ",".join([frappe.db.escape(u) for u in team])
        )
    if _has_role(user, "HM Sales"):
        return "(`tabHM Sample Order`.assigned_to={0})".format(frappe.db.escape(user))
    return "1=0"


def contact_query(user=None):
    user = user or frappe.session.user
    if _has_role(user, "HM Admin") or _has_role(user, "HM BOD") or _has_role(user, "HM Lab Doctor"):
        return ""
    if _has_role(user, "HM Sales Manager"):
        team = _team_users(user)
        return "(`tabHM Contact`.owner_user IN ({0}))".format(
            ",".join([frappe.db.escape(u) for u in team])
        )
    if _has_role(user, "HM Sales"):
        return "(`tabHM Contact`.owner_user={0})".format(frappe.db.escape(user))
    return ""


def has_lead_permission(doc, user=None, permission_type=None):
    user = user or frappe.session.user
    if _has_role(user, "HM Admin"):
        return True
    if doc.get("owner_user") == user or doc.get("owner") == user:
        return True
    if _has_role(user, "HM Sales Manager") and doc.get("owner_user") in _team_users(user):
        return True
    return False


def has_deal_permission(doc, user=None, permission_type=None):
    user = user or frappe.session.user
    if _has_role(user, "HM Admin") or _has_role(user, "HM BOD"):
        return True
    if _has_role(user, "HM Accountant") and doc.get("status") == "Đã chốt":
        return True if permission_type == "read" else False
    if doc.get("owner_user") == user:
        return True
    if _has_role(user, "HM Sales Manager") and doc.get("owner_user") in _team_users(user):
        return True
    return False


def has_sample_order_permission(doc, user=None, permission_type=None):
    user = user or frappe.session.user
    if _has_role(user, "HM Admin") or _has_role(user, "HM BOD") or _has_role(user, "HM Lab Coordinator"):
        return True
    if doc.get("assigned_to") == user:
        return True
    if _has_role(user, "HM Sales Manager") and doc.get("assigned_to") in _team_users(user):
        return True
    return False
