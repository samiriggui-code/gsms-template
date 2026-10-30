#!/usr/bin/env bash
# Create .env on the VPS with generated secrets (Hostinger GSMS / Traefik gsms).
# Usage: ./scripts/bootstrap-global-it-ss-env.sh admin@example.com
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ADMIN_EMAIL="${1:-}"
if [[ -z "$ADMIN_EMAIL" ]]; then
  echo "Usage: $0 <admin-email>" >&2
  exit 1
fi
umask 077
JWT_SECRET="$(openssl rand -hex 32)"
SYSTEM_AES_KEY="$(openssl rand -hex 32)"
DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
REDIS_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
cat > .env <<EOF
TRAEFIK_NETWORK=gsms
TRAEFIK_ENTRYPOINT=websecure
TRAEFIK_CERT_RESOLVER=letsencrypt
TRAEFIK_ROUTER_MIDDLEWARES=gsms-secure
LANDING_HOST=global-it-ss.com
LANDING_WWW_HOST=www.global-it-ss.com
APP_HOST_FQDN=app.global-it-ss.com
NEXT_PUBLIC_SITE_URL=https://www.global-it-ss.com
NEXT_PUBLIC_APP_URL=https://app.global-it-ss.com
APP_EXTERNAL_URL=https://app.global-it-ss.com
FRONTEND_BASE_URL=https://app.global-it-ss.com
JWT_SECRET=${JWT_SECRET}
SYSTEM_AES_KEY=${SYSTEM_AES_KEY}
DB_DRIVER=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=WeKnora_globalitss
STREAM_MANAGER_TYPE=redis
REDIS_ADDR=redis:6379
REDIS_PASSWORD=${REDIS_PASSWORD}
GIN_MODE=release
TZ=Europe/Paris
WEKNORA_VERSION=latest
AUTO_MIGRATE=true
DOCREADER_ADDR=docreader:50051
DOCREADER_TRANSPORT=grpc
RETRIEVE_DRIVER=postgres
WEKNORA_BOOTSTRAP_SYSTEM_ADMIN_EMAIL=${ADMIN_EMAIL}
EOF
echo "Wrote ${ROOT}/.env (secrets generated on this server)."
