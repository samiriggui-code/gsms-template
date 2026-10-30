# Deploy global-it-ss on a VPS (one-time)

**Rules:**

1. **Isolated stack** — `global-it-ss` uses its own Compose project: containers, Postgres, Redis, docreader, volumes, and workers. No shared databases or queues with logistics, qualiopi, ichivol, etc.
2. **Shared network only** — Docker network **`gsms`** lets Traefik terminate HTTPS (like a shared plug), not shared application data.
3. Do **not** stop, remove, or change other apps’ containers.

## What you get

- Compose project **`globalitss`** (container prefix `globalitss-*`).
- **Landing** + **WeKnora** (frontend, app, postgres, redis, docreader…) from `gsms-template`.
- Traefik on **`gsms`**, TLS via `websecure` + `letsencrypt` + `gsms-secure`.
- Hostnames: `www.global-it-ss.com`, `global-it-ss.com`, `app.global-it-ss.com`.

## DNS (before deploy)

Point A/AAAA to your VPS IP for `www`, apex, and `app`.

## On the VPS

```bash
mkdir -p /opt/global-it-ss && cd /opt/global-it-ss
git clone https://github.com/samiriggui-code/gsms-template.git .
git pull && git checkout main
cp .env.example .env
# Or: ./scripts/bootstrap-global-it-ss-env.sh admin@example.com
```

Edit `.env` — minimum:

- `COMPOSE_PROJECT_NAME=globalitss`
- `TRAEFIK_NETWORK=gsms`
- `TRAEFIK_ENTRYPOINT=websecure`
- `TRAEFIK_CERT_RESOLVER=letsencrypt`
- `TRAEFIK_ROUTER_MIDDLEWARES=gsms-secure`
- `NEXT_PUBLIC_SITE_URL=https://www.global-it-ss.com`
- `NEXT_PUBLIC_APP_URL=https://app.global-it-ss.com`
- `DEFAULT_LOCALE=fr-FR` (optional if using bootstrap script; enables French auth UI via runtime config)
- `JWT_SECRET=` and `SYSTEM_AES_KEY=` (unique secrets)

## Deploy (primary)

From the repo root on the VPS:

```bash
chmod +x ./scripts/deploy-global-it-ss.sh   # once
./scripts/deploy-global-it-ss.sh
```

The script validates three Compose files (base + Traefik + **`deploy/docker-compose.traefik.gsms.yml`**). The GSMS overlay clears fixed `container_name` values and **`app` host ports** so stacks stay isolated under **`COMPOSE_PROJECT_NAME=globalitss`** and the API is not exposed beside Traefik.

It **`build`s `landing` and `frontend`** (local `./landing` and `./frontend` — images **`gsms-landing`** and **`gsms-weknora-ui`**), then **`up -d --no-build`**. It does **not** `pull` frontend/landing.

Force a clean frontend/landing rebuild:

```bash
./scripts/deploy-global-it-ss.sh --no-cache
```

Do **not** use bare `docker compose … up -d` without building frontend first — that can leave an old container or pull upstream **`wechatopenai/weknora-ui`** (Chinese-first Hub image). Root `docker-compose.yml` sets **`pull_policy: build`** on frontend/landing to block Hub pulls when both `image` and `build` are set.

## Manual equivalent (debug only)

```bash
docker compose -f docker-compose.yml -f deploy/docker-compose.traefik.yml -f deploy/docker-compose.traefik.gsms.yml config
docker compose -f docker-compose.yml -f deploy/docker-compose.traefik.yml -f deploy/docker-compose.traefik.gsms.yml build landing frontend
docker compose -f docker-compose.yml -f deploy/docker-compose.traefik.yml -f deploy/docker-compose.traefik.gsms.yml up -d --no-build
```

**Still seeing Chinese / zh-CN on `app.global-it-ss.com`?** The running container is almost certainly still **`wechatopenai/weknora-ui`**. Re-run `./scripts/deploy-global-it-ss.sh --no-cache`, then check:

```bash
docker ps --filter name=globalitss --format '{{.Names}} {{.Image}}' | grep -i frontend
```

Add `DEFAULT_LOCALE=fr-FR` to `.env` if missing, then `./scripts/deploy-global-it-ss.sh` again so `config.js` picks it up.

## Do not touch

- Other Compose projects on the host.
- The Traefik container itself — only new labels on new containers.

## Verify

```bash
docker ps --filter name=globalitss
```

Browser: `https://www.global-it-ss.com` and `https://app.global-it-ss.com` — login should be FR/EN, not Chinese.
