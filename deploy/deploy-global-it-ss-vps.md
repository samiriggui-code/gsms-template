# Deploy global-it-ss on the GSMS VPS

**Vitrine** = service **`site`** (`website-docs/` → Nginx, `/` + `/docs/`). **Plus de `landing/`.**

Stack isolée : projet Compose **`globalitss`**, réseau Traefik externe **`gsms`**.

## Mise à jour

```bash
cd /opt/global-it-ss
cp -a .env ".env.bak.$(date -u +%Y%m%dT%H%M%SZ)"
git pull --ff-only
unset COMPOSE_PROJECT_NAME
./scripts/deploy-global-it-ss.sh
```

Le script build **`site`** et **`frontend`**, puis `up -d --no-build --remove-orphans` (arrête l’ancien conteneur **landing**).

## `.env` minimal (déjà en place sur le VPS)

- `COMPOSE_PROJECT_NAME=globalitss`
- `TRAEFIK_NETWORK=gsms`
- `TRAEFIK_ROUTER_MIDDLEWARES=gsms-secure`
- `LANDING_HOST` / `LANDING_WWW_HOST` / `APP_HOST_FQDN` — inchangés (noms historiques pour les Host Traefik)

Ne pas écraser `.env` avec `.env.example` sur un serveur en production.
