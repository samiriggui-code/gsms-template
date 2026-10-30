#!/usr/bin/env bash
# VPS Global-IT-SS : build site (homepage + doc) + UI WeKnora, puis stack Traefik.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILES=(
  --env-file .env
  -f docker-compose.yml
  -f deploy/docker-compose.traefik.yml
  -f deploy/docker-compose.traefik.gsms.yml
)

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy-global-it-ss.sh [--no-cache]

  Builds gsms-site (website-docs) and gsms-weknora-ui (frontend), then
  `docker compose up -d --no-build --remove-orphans` (drops legacy landing).

  COMPOSE_PROJECT_NAME=globalitss must be set in .env.
EOF
}

NO_CACHE=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-cache) NO_CACHE=(--no-cache); shift ;;
    -h | --help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ ! -f .env ]]; then
  echo "Missing .env in ${ROOT}" >&2
  exit 1
fi

PROJECT_NAME=""
if grep -qE '^[[:space:]]*COMPOSE_PROJECT_NAME[[:space:]]*=' .env 2>/dev/null; then
  PROJECT_NAME="$(
    grep -E '^[[:space:]]*COMPOSE_PROJECT_NAME[[:space:]]*=' .env | tail -1 \
      | sed -E 's/^[[:space:]]*COMPOSE_PROJECT_NAME[[:space:]]*=[[:space:]]*//' \
      | sed -e 's/[[:space:]]*$//' -e "s/^['\"]//" -e "s/['\"]$//"
  )"
fi

if [[ -n "${COMPOSE_PROJECT_NAME:-}" && -n "${PROJECT_NAME}" && "${COMPOSE_PROJECT_NAME}" != "${PROJECT_NAME}" ]]; then
  echo "COMPOSE_PROJECT_NAME mismatch: shell vs .env — run: unset COMPOSE_PROJECT_NAME" >&2
  exit 1
fi

REQUIRED_PROJECT_NAME=globalitss
if [[ "${PROJECT_NAME}" != "${REQUIRED_PROJECT_NAME}" ]]; then
  echo "COMPOSE_PROJECT_NAME in .env must be '${REQUIRED_PROJECT_NAME}' (got: '${PROJECT_NAME:-<unset>}')" >&2
  exit 1
fi

echo "Using COMPOSE_PROJECT_NAME=${PROJECT_NAME} (from .env)"

if [[ -d .git ]]; then
  echo "Syncing git (assets homepage/doc depuis GitHub)…"
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0="${ROOT}"
  git fetch origin
  BR="${GIT_DEPLOY_REF:-$(git branch --show-current)}"
  git pull --ff-only origin "${BR}" || {
    echo "git pull failed — commit/push tes changements ou fixe les conflits avant deploy" >&2
    exit 1
  }
fi

echo "Validating Compose configuration…"
docker compose "${COMPOSE_FILES[@]}" config >/dev/null

echo "Building site + frontend (gsms-site / gsms-weknora-ui)…"
docker compose "${COMPOSE_FILES[@]}" build "${NO_CACHE[@]}" site frontend

echo "Starting stack (remove legacy landing container if present)…"
docker compose "${COMPOSE_FILES[@]}" up -d --no-build --remove-orphans

echo "Deploy finished. Verify: docker ps --filter name=${PROJECT_NAME}"
