
# -*- coding: utf-8 -*-
import math


def haversine_m(lat1, lon1, lat2, lon2):
    """Return distance in metres between two GPS points."""
    if None in (lat1, lon1, lat2, lon2):
        return None
    R = 6371000.0
    p1 = math.radians(lat1); p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1); dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))
