
def get_notification_config():
    return {
        "for_doctype": {
            "HM Lead":         {"status": ("not in", ["Đã chuyển đổi","Đã hủy"])},
            "HM Deal":         {"status": ("not in", ["Đã chốt","Thất bại"])},
            "HM Sample Order": {"status": ("in", ["Đã phân công","Đang lấy mẫu"])},
            "HM Task":         {"status": "Open"},
        }
    }
