# Hướng dẫn cài đặt chi tiết — Hi-Medic CRM

## A. Chuẩn bị server (Ubuntu 22.04)

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install python3.10 python3.10-venv python3-pip python3-dev \
    mariadb-server mariadb-client redis-server nginx supervisor \
    nodejs npm git wkhtmltopdf libmysqlclient-dev curl xvfb fonts-noto-color-emoji

# Node 18 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 18

# Yarn
sudo npm install -g yarn

# Bench
sudo -H pip3 install frappe-bench
```

## B. Cấu hình MariaDB

```bash
sudo mysql_secure_installation
# Edit /etc/mysql/mariadb.conf.d/50-server.cnf
sudo bash -c 'cat >> /etc/mysql/mariadb.conf.d/50-server.cnf <<EOF
[mysqld]
character-set-client-handshake = FALSE
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
innodb_file_format = barracuda
innodb_large_prefix = 1
innodb_default_row_format = dynamic

[mysql]
default-character-set = utf8mb4
EOF'
sudo systemctl restart mariadb
```

## C. Khởi tạo Bench + Site

```bash
cd ~
bench init --frappe-branch version-15 frappe-bench
cd frappe-bench
bench new-site himedic.local \
    --mariadb-root-password root \
    --admin-password admin \
    --install-app frappe
bench use himedic.local
```

## D. Cài app

```bash
# Copy hoặc git clone source
cp -r "/Codebase himedic_crm" apps/himedic_crm
# hoặc
# bench get-app himedic_crm <git-url>

# Install
bench --site himedic.local install-app himedic_crm

# Migrate + reload
bench --site himedic.local migrate
bench --site himedic.local clear-cache
bench build --app himedic_crm
```

## E. Tạo user khởi tạo

```bash
bench --site himedic.local execute himedic_crm.install.after_install
```

## F. Mở thủ công Settings

Vào **Hi-Medic CRM → HM CRM Settings**:
- Thiết lập SLA Lead, ngưỡng duyệt CK, B2B renewal
- Cấu hình LIS endpoint, Zalo OA, VoIP, Maps, SMS, CA

## G. Production

```bash
bench setup production <linux-user>     # nginx + supervisor + redis socket
bench --site himedic.local enable-scheduler
bench --site himedic.local set-config server_name "himedic.example.com"
bench setup add-domain himedic.example.com --site himedic.local
sudo bench setup lets-encrypt himedic.example.com   # SSL
```

## H. Kiểm tra sau cài

| URL                                    | Vai trò      |
|----------------------------------------|--------------|
| `https://himedic.example.com/app`      | Desk (nội bộ)|
| `https://himedic.example.com/portal`   | Customer Portal |
| `https://himedic.example.com/m`        | Mobile PWA (NV) |
| `https://himedic.example.com/api/method/...` | API endpoints |

## I. Troubleshooting

- **Fixtures không nạp:** `bench --site himedic.local execute himedic_crm.install.after_install`
- **Webhook 401:** kiểm tra `webhook_secret_*` trong `sites/himedic.local/site_config.json`
- **Zalo gửi lỗi:** kiểm tra `zalo_oa_token` trong `HM CRM Settings`
- **LIS push lỗi:** xem `error log` tại Desk → Error Log
- **Scheduler không chạy:** `bench --site himedic.local enable-scheduler` + `supervisorctl restart all`
