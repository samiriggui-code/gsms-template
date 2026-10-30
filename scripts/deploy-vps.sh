#!/usr/bin/env bash
# Met à jour /opt/global-it-ss : homepage + docs (site) + app WeKnora.
set -euo pipefail

VPS_SSH="${VPS_SSH:-vps}"
VPS_APP_DIR="${VPS_APP_DIR:-/opt/global-it-ss}"
GIT_REF="${GIT_REF:-feat/site-homepage-i18n}"

NO_CACHE=()
for arg in "$@"; do
  case "$arg" in
    --no-cache) NO_CACHE=(--no-cache) ;;
    --main) GIT_REF=main ;;
    -h|--help)
      echo "Usage: GIT_REF=feat/site-homepage-i18n $0 [--no-cache] [--main]"
      exit 0
      ;;
    *) echo "Option inconnue: $arg" >&2; exit 2 ;;
  esac
done

REMOTE_CMD="set -euo pipefail
cd '$VPS_APP_DIR'
cp -a .env \".env.bak.\$(date -u +%Y%m%dT%H%M%SZ)\"
git fetch origin
git checkout '$GIT_REF'
git pull --ff-only origin '$GIT_REF'
unset COMPOSE_PROJECT_NAME
chmod +x ./scripts/deploy-global-it-ss.sh
./scripts/deploy-global-it-ss.sh ${NO_CACHE[*]:-}"

echo "==> ${VPS_SSH}:${VPS_APP_DIR} ref=${GIT_REF}"
ssh -o BatchMode=yes -o ConnectTimeout=20 "$VPS_SSH" "$REMOTE_CMD"
echo "OK"
