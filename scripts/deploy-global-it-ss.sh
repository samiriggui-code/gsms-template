#!/usr/bin/env bash
# VPS entrypoint for global-it-ss on the shared GSMS Traefik host.
# Builds site (website-docs: homepage + /docs/), frontend, app and docreader from repo sources,
# then starts the stack without implicit pulls/rebuilds.
#
# Requires .env with at least secrets and Traefik vars (see deploy/deploy-global-it-ss-vps.md).
# Set COMPOSE_PROJECT_NAME=globalitss in .env so containers/volumes stay isolated (Compose reads it from .env).
#
# Usage:
#   ./scripts/deploy-global-it-ss.sh
#   ./scripts/deploy-global-it-ss.sh --no-cache
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

  Validates the three-file Compose stack (includes deploy/docker-compose.traefik.gsms.yml:
  project-prefixed container names, no published app port), builds site,
  frontend, app and docreader locally, then runs `up -d --no-build --remove-orphans` (drops the legacy
  landing container). Does not pull any of them.

  GIT_DEPLOY_REF (default: main) selects the branch fast-forwarded before the build.

  COMPOSE_PROJECT_NAME (typically globalitss) must be set in .env — not passed on the CLI.
EOF
}

NO_CACHE=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-cache)
      NO_CACHE=(--no-cache)
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -f .env ]]; then
  echo "Missing .env in ${ROOT}. Copy .env.example or run ./scripts/bootstrap-global-it-ss-env.sh" >&2
  exit 1
fi

# Parse COMPOSE_PROJECT_NAME from .env (last assignment wins). Avoid bare `grep … | …` under pipefail.
PROJECT_NAME=""
if grep -qE '^[[:space:]]*COMPOSE_PROJECT_NAME[[:space:]]*=' .env 2>/dev/null; then
  PROJECT_NAME="$(
    grep -E '^[[:space:]]*COMPOSE_PROJECT_NAME[[:space:]]*=' .env | tail -1 \
      | sed -E 's/^[[:space:]]*COMPOSE_PROJECT_NAME[[:space:]]*=[[:space:]]*//' \
      | sed -e 's/[[:space:]]*$//' -e "s/^['\"]//" -e "s/['\"]$//"
  )"
fi

if [[ -n "${COMPOSE_PROJECT_NAME:-}" ]]; then
  if [[ -z "${PROJECT_NAME}" ]]; then
    echo "COMPOSE_PROJECT_NAME is set in the shell (${COMPOSE_PROJECT_NAME}) but missing in .env." >&2
    echo "Unset it (unset COMPOSE_PROJECT_NAME) or add COMPOSE_PROJECT_NAME=… to .env." >&2
    exit 1
  fi
  if [[ "${COMPOSE_PROJECT_NAME}" != "${PROJECT_NAME}" ]]; then
    echo "COMPOSE_PROJECT_NAME mismatch: shell=${COMPOSE_PROJECT_NAME} .env=${PROJECT_NAME}." >&2
    echo "Compose reads .env in this directory; an exported name would override it and attach the wrong volumes." >&2
    echo "Run: unset COMPOSE_PROJECT_NAME   (or export the same value as in .env)" >&2
    exit 1
  fi
fi

REQUIRED_PROJECT_NAME=globalitss
if [[ -z "${PROJECT_NAME}" ]]; then
  echo "COMPOSE_PROJECT_NAME must be set in .env (required: ${REQUIRED_PROJECT_NAME})." >&2
  exit 1
fi
if [[ "${PROJECT_NAME}" != "${REQUIRED_PROJECT_NAME}" ]]; then
  echo "COMPOSE_PROJECT_NAME in .env is '${PROJECT_NAME}'; this deploy requires '${REQUIRED_PROJECT_NAME}'." >&2
  exit 1
fi
echo "Using COMPOSE_PROJECT_NAME=${PROJECT_NAME} (from .env)"

if [[ -d .git ]]; then
  BR="${GIT_DEPLOY_REF:-main}"
  echo "Syncing git (origin/${BR})…"
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0="${ROOT}"
  git fetch origin
  git checkout "${BR}"
  git pull --ff-only origin "${BR}" || {
    echo "git pull failed — commit/push local changes or fix conflicts before deploy" >&2
    exit 1
  }
fi

echo "Validating Compose configuration…"
docker compose "${COMPOSE_FILES[@]}" config >/dev/null

echo "Building site, frontend, app and docreader (local gsms-* images)…"
docker compose "${COMPOSE_FILES[@]}" build "${NO_CACHE[@]}" site frontend app docreader

echo "Starting stack (up -d --no-build; no pull for locally built images; removes legacy landing)…"
docker compose "${COMPOSE_FILES[@]}" up -d --no-build --remove-orphans

echo "Deploy finished. Verify: docker ps --filter name=${PROJECT_NAME:-globalitss}"
