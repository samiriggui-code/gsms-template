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

Validate Compose:

```bash
docker compose -f docker-compose.yml -f deploy/docker-compose.traefik.yml -f deploy/docker-compose.traefik.gsms.yml config
```

## Build: landing **and** frontend (required)

Compose tags the GSMS UI as **`gsms-weknora-ui:${WEKNORA_VERSION:-latest}`** (not `wechatopenai/weknora-ui`), so `docker compose pull` cannot silently replace it with the official Chinese multi-language image. You still **must** build from `./frontend` at least once on the VPS — there is no public registry for `gsms-weknora-ui`.

```bash
docker compose -f docker-compose.yml -f deploy/docker-compose.traefik.yml -f deploy/docker-compose.traefik.gsms.yml build landing frontend
docker compose -f docker-compose.yml -f deploy/docker-compose.traefik.yml -f deploy/docker-compose.traefik.gsms.yml up -d
```

**Still seeing Chinese / zh-CN on `app.global-it-ss.com`?** The running container is almost certainly still `wechatopenai/weknora-ui`. After `git pull` (this PR merged), rebuild and recreate frontend:

```bash
docker compose -f docker-compose.yml -f deploy/docker-compose.traefik.yml -f deploy/docker-compose.traefik.gsms.yml build --no-cache frontend && docker compose -f docker-compose.yml -f deploy/docker-compose.traefik.yml -f deploy/docker-compose.traefik.gsms.yml up -d --force-recreate frontend
docker inspect globalitss-WeKnora-frontend-1 2>/dev/null | grep -E '"Image"|gsms-weknora-ui' || docker ps --filter name=frontend --format '{{.Names}} {{.Image}}'
```

Add `DEFAULT_LOCALE=fr-FR` to `.env` if missing, then `docker compose … up -d frontend` again so `config.js` picks it up.

## Do not touch

- Other Compose projects on the host.
- The Traefik container itself — only new labels on new containers.

## Verify

```bash
docker ps --filter name=globalitss
```

Browser: `https://www.global-it-ss.com` and `https://app.global-it-ss.com` — login should be FR/EN, not Chinese.
