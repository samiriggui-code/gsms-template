# Déploiement VPS (Global-IT-SS)

Production sur **`/opt/global-it-ss`** (`samiriggui-code/gsms-template`), projet Docker **`globalitss`**, réseau Traefik **`gsms`**.

## Surfaces publiques

| URL | Contenu | Service Compose |
|-----|---------|-----------------|
| `www.global-it-ss.com` / apex | **Homepage unifiée** + **`/docs/`** (FR/EN) | **`site`** → image `gsms-site` (build `website-docs/`) |
| `app.global-it-ss.com` | Back-office WeKnora | **`frontend`** → `gsms-weknora-ui` |

L’ancien dossier **`landing/`** et le conteneur **`landing`** ne sont plus utilisés.

## Mise à jour (VPS ou depuis ta machine)

```bash
cd /opt/global-it-ss
cp -a .env ".env.bak.$(date -u +%Y%m%dT%H%M%SZ)"
git fetch origin
git checkout feat/site-homepage-i18n   # ou main une fois la PR #24 mergée
git pull --ff-only
unset COMPOSE_PROJECT_NAME
chmod +x ./scripts/deploy-global-it-ss.sh
./scripts/deploy-global-it-ss.sh
```

Rebuild complet (site + UI) :

```bash
./scripts/deploy-global-it-ss.sh --no-cache
```

Wrapper local : `./scripts/deploy-vps.sh` (SSH alias `vps`, branche `feat/site-homepage-i18n` par défaut).

## Fichiers Compose

Trois fichiers fusionnés :

1. `docker-compose.yml` — services `site`, `frontend`, `app`, …
2. `deploy/docker-compose.traefik.yml` — routeurs `gsms-site` / `gsms-app`
3. `deploy/docker-compose.traefik.gsms.yml` — réseau `gsms`, pas de port hôte sur `app`

Détails : `deploy/deploy-global-it-ss-vps.md`.

## Vérifications

```bash
docker ps --filter name=globalitss --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
curl -sI https://www.global-it-ss.com/ | head -5
curl -sI https://www.global-it-ss.com/docs/ | head -5
curl -sI https://app.global-it-ss.com/ | head -5
```
