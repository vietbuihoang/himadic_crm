
# -*- coding: utf-8 -*-
import re

VN_PREFIX = "84"


def normalize_phone(phone):
    if not phone:
        return ""
    s = re.sub(r"\D", "", str(phone))
    if s.startswith("0"):
        s = VN_PREFIX + s[1:]
    if s.startswith("84"):
        return "+" + s
    if s.startswith("+"):
        return s
    return "+" + s
