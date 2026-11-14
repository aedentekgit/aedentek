#!/usr/bin/env bash
# Rebuild the aedentek-crm vhost for HTTPS and obtain the cert.
# Prereq: crm/staging/dev .aedentek.in A records point at this VPS IP,
# and webroot dir exists for certbot.
set -euo pipefail
CFG="/etc/nginx/sites-available/aedentek-crm"
mkdir -p /var/www/letsencrypt
cat > "$CFG" <<'NGINX'
# Aedentek CRM (Tessly) — HTTPS
#   crm.aedentek.in            -> LIVE     (5063, aedentek_crm_live)
#   staging.crm.aedentek.in    -> STAGING  (5064, aedentek_crm_staging)
#   dev.crm.aedentek.in        -> STAGING  (dev/testing reuses staging)
server {
    listen 80; listen [::]:80;
    server_name crm.aedentek.in www.crm.aedentek.in staging.crm.aedentek.in dev.crm.aedentek.in;
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 301 https://crm.aedentek.in$request_uri; }
}
server {
    listen 443 ssl; listen [::]:443 ssl;
    server_name crm.aedentek.in www.crm.aedentek.in;
    ssl_certificate     /etc/letsencrypt/live/crm.aedentek.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.aedentek.in/privkey.pem;
    client_max_body_size 50M;
    location / {
        proxy_pass http://127.0.0.1:5063;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
server {
    listen 443 ssl; listen [::]:443 ssl;
    server_name staging.crm.aedentek.in dev.crm.aedentek.in;
    ssl_certificate     /etc/letsencrypt/live/staging.crm.aedentek.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.crm.aedentek.in/privkey.pem;
    client_max_body_size 50M;
    location / {
        proxy_pass http://127.0.0.1:5064;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
ln -sf "$CFG" /etc/nginx/sites-enabled/aedentek-crm

echo "Obtaining Let's Encrypt certs (HTTP-01 via webroot)..."
certbot certonly --webroot -w /var/www/letsencrypt -d crm.aedentek.in -d www.crm.aedentek.in || true
certbot certonly --webroot -w /var/www/letsencrypt -d staging.crm.aedentek.in -d dev.crm.aedentek.in || true

nginx -t && systemctl reload nginx && echo "HTTPS vhost enabled & nginx reloaded"
