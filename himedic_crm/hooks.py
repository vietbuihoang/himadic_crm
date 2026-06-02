
# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from . import __version__ as app_version

app_name = "himedic_crm"
app_title = "Hi-Medic CRM"
app_publisher = "Hi-Medic"
app_description = "Hi-Medic CRM — Lead, Deal, Sampling, Logistics, Lab, Customer Portal"
app_email = "info@miyano.com.vn"
app_license = "MIT"

# Includes in <head>
app_include_js = [
    "/assets/himedic_crm/js/himedic.bundle.js",
]
app_include_css = [
    "/assets/himedic_crm/css/himedic.css",
]

web_include_js = [
    "/assets/himedic_crm/js/portal.js",
]
web_include_css = [
    "/assets/himedic_crm/css/portal.css",
]

# Home pages
home_page = "app"

# Website route rules for Customer Portal & Mobile PWA
website_route_rules = [
    {"from_route": "/portal/<path:app_path>", "to_route": "portal"},
    {"from_route": "/m/<path:app_path>",      "to_route": "m"},
]

# Document Events
doc_events = {
    "HM Lead": {
        "after_insert": "himedic_crm.lead.events.after_insert_lead",
        "validate":     "himedic_crm.lead.events.validate_lead",
        "on_update":    "himedic_crm.lead.events.on_update_lead",
    },
    "HM Deal": {
        "validate":     "himedic_crm.deal.events.validate_deal",
        "on_update":    "himedic_crm.deal.events.on_update_deal",
    },
    "HM Sample Order": {
        "validate":     "himedic_crm.sample.events.validate_sample_order",
        "after_insert": "himedic_crm.sample.events.after_insert_sample_order",
        "on_update":    "himedic_crm.sample.events.on_update_sample_order",
    },
    "HM Sample Manifest": {
        "validate":     "himedic_crm.logistics.events.validate_manifest",
        "on_submit":    "himedic_crm.logistics.events.on_submit_manifest",
    },
    "HM Contact": {
        "validate":     "himedic_crm.contact.events.validate_contact",
    },
    "HM Quotation": {
        "validate":     "himedic_crm.deal.events.validate_quotation",
        "on_submit":    "himedic_crm.deal.events.on_submit_quotation",
    },
}

# Scheduler events
scheduler_events = {
    "cron": {
        "*/5 * * * *": [
            "himedic_crm.lead.scheduled.enforce_lead_sla",
            "himedic_crm.sample.scheduled.refresh_route_status",
        ],
        "0 * * * *": [
            "himedic_crm.logistics.scheduled.check_temperature_alerts",
            "himedic_crm.deal.scheduled.nudge_b2b_renewal",
        ],
    },
    "daily": [
        "himedic_crm.marketing.scheduled.compute_daily_roi",
        "himedic_crm.report.scheduled.snapshot_kpi",
    ],
    "weekly": [
        "himedic_crm.communication.scheduled.send_nps_surveys",
    ],
}

# Fixtures
fixtures = [
    {"dt": "Role",         "filters": [["name", "like", "HM %"]]},
    {"dt": "Role Profile", "filters": [["name", "like", "HM %"]]},
    {"dt": "Workflow",     "filters": [["name", "like", "HM %"]]},
    {"dt": "Workflow State","filters": [["name", "like", "HM %"]]},
    {"dt": "Workflow Action Master","filters": [["name", "like", "HM %"]]},
    {"dt": "Custom Field", "filters": [["module", "in", ["Hi-Medic CRM","Lead","Deal","Sample","Logistics"]]]},
    {"dt": "Property Setter","filters":[["module","in",["Hi-Medic CRM"]]]},
    {"dt": "HM Lead Source"},
    {"dt": "HM Lead Stage"},
    {"dt": "HM Deal Stage"},
    {"dt": "HM Sample Type"},
    {"dt": "HM Lab Test"},
    {"dt": "HM Test Package"},
]

# Installation hooks
after_install = "himedic_crm.install.after_install"
before_uninstall = "himedic_crm.install.before_uninstall"

# Notification settings
notification_config = "himedic_crm.notifications.get_notification_config"

# Permissions hook: row-level for Sample Order / Lead etc.
permission_query_conditions = {
    "HM Lead":         "himedic_crm.permissions.lead_query",
    "HM Deal":         "himedic_crm.permissions.deal_query",
    "HM Sample Order": "himedic_crm.permissions.sample_order_query",
    "HM Contact":      "himedic_crm.permissions.contact_query",
}
has_permission = {
    "HM Lead":         "himedic_crm.permissions.has_lead_permission",
    "HM Deal":         "himedic_crm.permissions.has_deal_permission",
    "HM Sample Order": "himedic_crm.permissions.has_sample_order_permission",
}

# Boot session: inject CRM config into desk
boot_session = "himedic_crm.boot.boot_session"

# Standard portal menu items for Customer Portal
standard_portal_menu_items = [
    {"title": "Lịch hẹn của tôi",   "route": "/portal/appointments", "reference_doctype": "HM Sample Order", "role": "HM Customer"},
    {"title": "Kết quả xét nghiệm", "route": "/portal/results",      "reference_doctype": "HM Test Result",  "role": "HM Customer"},
    {"title": "Báo giá",            "route": "/portal/quotes",       "reference_doctype": "HM Quotation",    "role": "HM Customer"},
    {"title": "Hồ sơ của tôi",      "route": "/portal/profile",      "reference_doctype": "HM Contact",      "role": "HM Customer"},
]

# Audit override for all doctypes
override_doctype_class = {
    # placeholder for class overrides
}

# Translations
translator_url = "/translator"
