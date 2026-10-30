# Déploiement VPS (Global-IT-SS)

VPS Hostinger repéré : **`server.hosting-global-it-ss.com`** (`187.77.166.124`, VM id `1722028`).

Deux surfaces distinctes :

| Surface | Contenu | Chemin typique sur le VPS |
|--------|---------|---------------------------|
| **Site vitrine + doc** | `website-docs/` → `static-site/` | `/srv/www/weknora/current` (symlink vers un release daté) |
| **Application WeKnora** | `docker compose` (UI + app + postgres + redis + …) | `/opt/WeKnora` (clone git + `.env`) |

## Prérequis

- Accès SSH (`root` ou utilisateur avec droits Docker + écriture site).
- Sur le VPS : Docker + Compose v2, Nginx (ou autre) servant `root` → répertoire site statique ; proxy `/api` → conteneur `app` si besoin.
- Sur la machine de déploiement : Node 24 pour builder le site, `rsync`, `ssh`.

## Déploiement manuel (recommandé en dev)

Depuis la racine du dépôt :

```bash
export VPS_HOST=187.77.166.124
export VPS_USER=root
# export VPS_APP_DIR=/opt/WeKnora
# export VPS_SITE_DIR=/srv/www/weknora/current

chmod +x scripts/deploy-vps.sh
./scripts/deploy-vps.sh          # site + app
./scripts/deploy-vps.sh --site-only   # homepage FR/EN + doc seulement
./scripts/deploy-vps.sh --app-only    # pull images + rebuild conteneurs
```

Le script :

1. `npm run build` dans `website-docs/` (homepage unifiée + VitePress FR/EN).
2. `rsync` vers un release daté, bascule du symlink `current`, reload Nginx si disponible.
3. `git pull` + `docker compose pull/up -d --build` dans `VPS_APP_DIR`.

## GitHub Actions

Workflow **Deploy VPS (site + app)** : `.github/workflows/deploy-vps.yml` (déclenchement manuel).

Secrets à définir dans le dépôt GitHub :

| Secret | Exemple |
|--------|---------|
| `VPS_HOST` | `187.77.166.124` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | clé privée SSH (PEM, une ligne par `\n` dans l’UI GitHub) |
| `VPS_APP_DIR` | `/opt/WeKnora` (optionnel) |
| `VPS_SITE_DIR` | `/srv/www/weknora/current` (optionnel) |

Choisir la branche (`ref`, ex. `main` ou `feat/site-homepage-i18n`) et **site-only / app-only / both**.

## Ordre conseillé après merge PR site (#24)

1. Merger **#24** (homepage + traductions).
2. `./scripts/deploy-vps.sh --site-only` pour publier la doc FR/EN.
3. Merger **#23** (Tencent Meeting) si souhaité, puis `./scripts/deploy-vps.sh --app-only` ou rebuild images custom.

## Vérifications

- Site : `/`, `/docs/`, `/docs/en/…`
- App : `GET /health`, connexion UI, `docker compose ps` sur le VPS.
