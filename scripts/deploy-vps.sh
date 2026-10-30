#!/usr/bin/env bash
# Déploie le site statique (homepage + doc) et met à jour WeKnora (Docker Compose) sur le VPS.
# Usage (depuis la racine du dépôt) :
#   VPS_HOST=187.77.166.124 VPS_USER=root ./scripts/deploy-vps.sh
#   ./scripts/deploy-vps.sh --site-only | --app-only
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

VPS_HOST="${VPS_HOST:-187.77.166.124}"
VPS_USER="${VPS_USER:-root}"
VPS_SSH="${VPS_SSH:-${VPS_USER}@${VPS_HOST}}"
VPS_APP_DIR="${VPS_APP_DIR:-/opt/WeKnora}"
VPS_SITE_DIR="${VPS_SITE_DIR:-/srv/www/weknora/current}"
VPS_SITE_RELEASE="${VPS_SITE_RELEASE:-/srv/www/weknora/releases/$(date +%Y%m%d-%H%M%S)}"

DO_SITE=1
DO_APP=1
for arg in "$@"; do
  case "$arg" in
    --site-only) DO_APP=0 ;;
    --app-only) DO_SITE=0 ;;
    -h|--help)
      echo "Usage: VPS_HOST=… VPS_USER=… $0 [--site-only|--app-only]"
      exit 0
      ;;
    *) echo "Option inconnue: $arg" >&2; exit 2 ;;
  esac
done

ssh_cmd() {
  ssh -o BatchMode=yes -o ConnectTimeout=15 "$VPS_SSH" "$@"
}

rsync_site() {
  echo "==> Build site (website-docs/)"
  cd "$REPO_ROOT/website-docs"
  if [[ ! -d node_modules ]]; then
    npm run setup
  fi
  npm run build
  npm run package:site

  echo "==> Upload static site → ${VPS_SSH}:${VPS_SITE_RELEASE}"
  ssh_cmd "mkdir -p '$VPS_SITE_RELEASE' '$VPS_SITE_DIR'"
  rsync -az --delete -e "ssh -o BatchMode=yes -o ConnectTimeout=15" \
    "$REPO_ROOT/website-docs/static-site/" \
    "${VPS_SSH}:${VPS_SITE_RELEASE}/"

  echo "==> Switch live root + reload nginx (si présent)"
  ssh_cmd "set -e
    ln -sfn '$VPS_SITE_RELEASE' '$VPS_SITE_DIR'
    if command -v nginx >/dev/null && nginx -t 2>/dev/null; then
      nginx -s reload || systemctl reload nginx
    fi
  "
  echo "Site OK: https://${VPS_HOST}/ (ou votre domaine → ce répertoire)"
}

deploy_app() {
  echo "==> Mise à jour WeKnora (Docker) dans ${VPS_APP_DIR}"
  ssh_cmd "set -e
    cd '$VPS_APP_DIR'
    if [[ -d .git ]]; then
      git fetch --all --prune
      git pull --ff-only
    fi
    if [[ ! -f docker-compose.yml ]]; then
      echo 'docker-compose.yml introuvable dans $VPS_APP_DIR' >&2
      exit 1
    fi
    docker compose pull
    docker compose up -d --build --remove-orphans
    docker compose ps
  "
  echo "App OK: vérifiez GET /health sur le port exposé (souvent :8080 ou :80 via frontend)"
}

echo "Cible: ${VPS_SSH} (site=${DO_SITE}, app=${DO_APP})"
if (( DO_SITE )); then rsync_site; fi
if (( DO_APP )); then deploy_app; fi
echo "Déploiement terminé."
