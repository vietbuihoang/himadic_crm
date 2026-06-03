# -*- coding: utf-8 -*-
"""Wire the BA's 'Chăm sóc' (Nurturing) stage into the HM Lead Pipeline workflow.

The shipped workflow only connects Mới → Đã liên hệ → Đủ điều kiện → Đã chuyển đổi/Đã hủy,
leaving 'Chăm sóc' unreachable (a lead parked there would show no available actions).
This idempotently adds the state + transitions so the full BA pipeline works.
"""
import frappe

NURTURE_TRANSITIONS = [
    ("Đủ điều kiện", "HM Nurture", "Chăm sóc"),
    ("Chăm sóc", "HM Submit", "Đủ điều kiện"),
    ("Chăm sóc", "HM Cancel", "Đã hủy"),
]


def _ensure_master(doctype, field, value):
    if not frappe.db.exists(doctype, value):
        frappe.get_doc({"doctype": doctype, field: value}).insert(ignore_permissions=True)


def ensure_nurturing_transitions():
    # Workflow transitions Link to Workflow State / Workflow Action Master records;
    # create the new ones before referencing them.
    _ensure_master("Workflow State", "workflow_state_name", "Chăm sóc")
    _ensure_master("Workflow Action Master", "workflow_action_name", "HM Nurture")

    wf = frappe.get_doc("Workflow", "HM Lead Pipeline")
    states = {s.state for s in wf.states}
    trans = {(t.state, t.action, t.next_state) for t in wf.transitions}
    changed = False
    if "Chăm sóc" not in states:
        wf.append("states", {"state": "Chăm sóc", "doc_status": "0", "allow_edit": "HM Sales"})
        changed = True
    for state, action, nxt in NURTURE_TRANSITIONS:
        if (state, action, nxt) not in trans:
            wf.append("transitions", {"state": state, "action": action, "next_state": nxt,
                                      "allowed": "HM Sales", "allow_self_approval": 1})
            changed = True
    # A sales pipeline is not an approval flow: a rep must advance their own lead/deal.
    # Enable self-approval on every transition (else "Self approval is not allowed").
    if _enable_self_approval(wf):
        changed = True
    if changed:
        wf.save(ignore_permissions=True)
    # The Deal pipeline needs the same fix (no nurturing states to add there).
    dwf = frappe.get_doc("Workflow", "HM Deal Pipeline")
    if _enable_self_approval(dwf):
        dwf.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "changed": changed}


def _enable_self_approval(wf):
    changed = False
    for t in wf.transitions:
        if not t.allow_self_approval:
            t.allow_self_approval = 1
            changed = True
    return changed
