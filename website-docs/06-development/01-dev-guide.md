# Guide de développement

L’environnement de développement démarre les services de dépendances via `docker-compose.dev.yml` et permet d’exécuter séparément le backend Go, le frontend Web et docreader. Après modification du code, lancez build et tests du module concerné, puis vérifiez les chemins d’intégration associés.

## Pile technique et prérequis {#pile-technique-et-prerequis}

WeKnora repose sur trois processus développables indépendamment :

| Composant | Répertoire | Langage / runtime | Versions requises (source) |
| --- | --- | --- | --- |
| Backend principal `app` | `cmd/server` + `internal/` | Go | **Go 1.26.0** (`go 1.26.0` dans `go.mod`), CGO requis (liaisons DuckDB, sqlite-vec) |
| Service d’analyse documentaire `docreader` | `docreader/` | Python + gRPC | **Python >= 3.10.18** (`requires-python` dans `docreader/pyproject.toml`), dépendances gérées avec **uv** (dépôt avec `uv.lock`, `uv sync --locked` dans Docker) |
| Frontend `frontend` | `frontend/` | Node.js + Vue 3 | Branche Node 22 (`devDependencies` : `@tsconfig/node22`, `@types/node ^22`), Vite 7 + TypeScript ~6.0 + Vue 3.5 + TDesign, version `0.8.3` |
| CLI | `cli/` (module Go séparé) | Go | Go 1.26 (matrice `go: ['1.26']` dans `.github/workflows/cli.yml`) |

Outils de développement recommandés en complément :

```bash
# CLI de migration base de données (utilisé par scripts/migrate.sh)
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Analyse statique (appelée par make lint)
# Installation : https://golangci-lint.run ; config à la racine dans .golangci.yml

# Génération Swagger (appelée par make docs)
make install-swagger    # go install github.com/swaggo/swag/cmd/swag@latest

# Gestion des dépendances Python
pip install uv          # docreader : uv sync pour installer les deps

# Docker + Docker Compose (plugin v2 ou binaire docker-compose ; scripts/dev.sh détecte automatiquement)
```

## Démarrage rapide : mode développement (recommandé) {#demarrage-rapide-mode-dev}

En mode développement, l’infrastructure tourne dans Docker et `app` / `frontend` sur l’hôte. Après modification du code applicatif, redémarrez le processus sans reconstruire les images de dépendances. Point d’entrée : `scripts/dev.sh` ; les cibles Makefile `dev-*` encapsulent les opérations.

```bash
# 1. Variables d’environnement : dev.sh charge .env (obligatoire), puis .env.local (optionnel)
cp .env.example .env

# 2. Démarrer l’infra (ParadeDB/Postgres + Redis + docreader, Langfuse par défaut)
make dev-start                      # équivalent ./scripts/dev.sh start
make dev-start DEV_ARGS=--qdrant    # profile optionnel en plus

# 3. Autre terminal : backend local (go run -ldflags=... ./cmd/server en interne)
make dev-app                        # équivalent ./scripts/dev.sh app

# 4. Autre terminal : frontend local (cd frontend && npm install && npm run dev)
make dev-frontend                   # équivalent ./scripts/dev.sh frontend

# Autres
make dev-status   # état des conteneurs
make dev-logs     # journaux
make dev-stop     # arrêt
make dev-restart  # redémarrage
```

Le serveur de dev frontend écoute sur `5173` (`server.port: 5173` dans `frontend/vite.config.ts`) et proxifie `/api`, `/files` et `/mcp/` vers le backend. La cible du proxy est choisie dans l’ordre : variable d’environnement `VITE_DEV_PROXY_TARGET`, puis `FRONTEND_BACKEND_URL` ; si les deux sont absentes ou vides, `http://localhost:8080`. `DEV_PROXY_TARGET` est une constante interne du fichier de config, pas une variable d’environnement.

Pour un backend distant, définissez dans `.env.local` à la racine du dépôt (remplacez l’URL d’exemple par la vôtre) :

```bash
VITE_DEV_PROXY_TARGET=https://kb.example.com
```

Puis exécutez `make dev-frontend` à la racine ; le script charge `.env`, applique `.env.local` et exporte les variables vers Vite. Redémarrez le serveur de dev frontend après changement de cible proxy.

Si vous lancez npm directement dans `frontend/`, passez la variable explicitement ; cette voie ne charge pas les fichiers d’env à la racine :

```bash
cd frontend
VITE_DEV_PROXY_TARGET=https://kb.example.com npm run dev
```

`vite preview` (port `4173`) sert la build de production : environnement de validation le plus proche de l’image release. Mêmes règles de proxy ; après `npm run build` dans `frontend/`, utilisez par exemple `VITE_DEV_PROXY_TARGET=https://kb.example.com npm run preview` pour un backend distant.

### Services dans docker-compose.dev.yml {#services-docker-compose-dev}

`docker-compose.dev.yml` ne contient que les services de dépendances, pas `app` / `frontend`. Services démarrés par défaut et services optionnels par profile (activés via les arguments de `dev.sh start`) :

| Service | Image | Port (défaut) | Condition de démarrage |
| --- | --- | --- | --- |
| `postgres` | `paradedb/paradedb:v0.25.11-pg17` (pg_search/BM25 intégré) | `5432` | par défaut |
| `redis` | `redis:7.0-alpine` (`--requirepass`) | `6379` | par défaut |
| `docreader` | build local `docker/Dockerfile.docreader` | `50051` (gRPC) | par défaut |
| `searxng` (+ `searxng-init`) | `searxng/searxng:latest` | `127.0.0.1:8888` | `--searxng` / `--full` (profile compose `searxng`) |
| `minio` | `pgsty/minio:latest` | `9000` / console `9001` | `--minio` / `--full` |
| `qdrant` | `qdrant/qdrant:v1.16.2` | `6333` / `6334` | `--qdrant` / `--full` |
| `opensearch` | `opensearchproject/opensearch:3.3.2` (security désactivée, HTTP seul) | `9200` | profile `opensearch` / `full` |
| `opensearch-dashboards` | `opensearchproject/opensearch-dashboards:3.3.0` | `5601` | profile `opensearch-ui` (démarrage séparé si besoin) |
| `milvus` | `milvusdb/milvus:v2.6.11` (standalone, etcd embarqué) | `19530` / `9091` | profile `milvus` / `full` |
| `neo4j` | `neo4j:latest` (plugin APOC) | `7474` / `7687` | `--neo4j` / `--full` |
| `dex` | `dexidp/dex:latest` (source OIDC de test, config `misc/dex-config.yaml`) | `5556` | `--dex` / `--full` |
| `langfuse-web` / `langfuse-worker` / `langfuse-clickhouse` / `langfuse-minio` / `langfuse-db-init` | stack Langfuse v3 self-hosted, réutilise postgres dev (base `langfuse`) et redis (DB 1) | web `3000`, minio `9100/9101` | `--langfuse` (activé par défaut dans `dev.sh`, `--no-langfuse` pour désactiver) |
| `odl-hybrid` | build local `docker/Dockerfile.odl-hybrid` (backend PDF Docling) | `5002` | `--odl-hybrid` (image volumineuse, à la demande) |
| `sandbox` | `wechatopenai/weknora-sandbox` (sandbox d’exécution de scripts Skills, build/pull uniquement, non résident) | - | profile `full` |

Arguments optionnels de `dev.sh start` : `--minio`, `--qdrant`, `--neo4j`, `--dex`, `--langfuse` (défaut activé), `--no-langfuse`, `--odl-hybrid`, `--full` (tous les services optionnels sauf odl-hybrid). Via Makefile : `make dev-start DEV_ARGS=--odl-hybrid`.

### Exécuter docreader seul en local {#docreader-local}

`dev-start` lance docreader en conteneur par défaut ; pour déboguer le code Python en local :

```bash
cd docreader
uv sync                       # deps selon uv.lock (conteneur : uv sync --locked --no-dev)
uv run -m docreader.main      # service gRPC (identique au CMD Dockerfile), port DOCREADER_GRPC_PORT (défaut 50051)
```

De nombreux paramètres docreader (DPI rendu PDF, détection scan, liste blanche SSRF, TLS gRPC, etc.) passent par des variables `DOCREADER_*` ; liste complète dans la section `docreader.environment` de `docker-compose.dev.yml`.

### Mode Lite (sans dépendances externes) {#mode-lite}

Le mode Lite compile SQLite (+ sqlite-vec) et une file en mémoire dans un binaire unique, adapté à la découverte rapide et au desktop :

```bash
make build-lite     # build frontend vers web/, puis Go CGO (tags: sqlite_fts5) ; SKIP_FRONTEND=1 pour ignorer le frontend
make run-lite       # utilise .env.lite, build et démarre WeKnora-lite
make package-lite   # tarball de release (scripts/package-lite.sh)
make package-mac-app  # .app macOS (scripts/package-mac-app.sh)
```

## Vue d’ensemble des cibles Makefile {#vue-ensemble-makefile}

Cibles définies dans le `Makefile` à la racine ; `make help` affiche aussi une aide (en chinois dans le dépôt upstream).

### Build et exécution de base {#build-et-execution-base}

| Cible | Rôle |
| --- | --- |
| `build` | `go build -o WeKnora ./cmd/server` |
| `run` | `build` puis exécution de `./WeKnora` |
| `test` | `go test -v ./...` |
| `clean` | `go clean` et suppression du binaire |
| `build-prod` | build prod : CGO_ENABLED=1, `-ldflags "-w -s"` injecte Version/CommitID/BuildTime/GoVersion (variables du package `internal/handler`), protobuf `conflictPolicy=warn` (évite conflits proto qdrant/milvus) |
| `fmt` | `go fmt ./...` |
| `lint` | `golangci-lint run` |
| `deps` | `go mod download` |
| `docs` | `swag init` (options dans le Makefile, dont `--overridesFile ./docs/swag.overrides`) pour générer la doc Swagger |
| `install-swagger` | installe le CLI `swag` |

### Images Docker et gestion des services {#docker-images-et-services}

| Cible | Rôle |
| --- | --- |
| `docker-build-app` | build `wechatopenai/weknora-app` (`docker/Dockerfile.app`, version via `scripts/get_version.sh`) |
| `docker-build-docreader` | build `wechatopenai/weknora-docreader` (`docker/Dockerfile.docreader`) |
| `docker-build-frontend` | build multi-étapes `wechatopenai/weknora-ui` (`npm ci` + `npm run build` dans le builder, pas de dist préalable sur l’hôte ; injection auto `VITE_FRONTEND_COMMIT` depuis git) |
| `docker-build-all` | les trois images ci-dessus |
| `docker-run` | vérifie `.env` (copie depuis `.env.example` ou touch si absent) puis `docker-compose up` |
| `docker-stop` / `docker-restart` | `docker-compose down` / `stop -t 60` + `up` |
| `start-all` / `stop-all` | `scripts/start_all.sh` (démarrage / arrêt de tous les services) |
| `start-ollama` / `start-docker` | `start_all.sh --ollama` / `--docker` |
| `build-images` / `build-images-app` / `build-images-docreader` / `build-images-frontend` / `clean-images` | `scripts/build_images.sh` build / nettoyage d’images depuis les sources |
| `check-env` / `list-containers` / `pull-images` | `start_all.sh --check / --list / --pull` |
| `show-platform` | affiche `uname -m` et la plateforme de build Docker (détection amd64/arm64) |
| `clean-db` | supprime les volumes Docker `weknora_postgres-data` / `weknora_minio_data` / `weknora_redis_data` (**efface les données**) |

### Migrations base de données (voir [Base de données et migrations](02-database-schema.md)) {#migrations-base-de-donnees}

| Cible | Rôle |
| --- | --- |
| `migrate-up` / `migrate-down` | `scripts/migrate.sh up / down` |
| `migrate-version` | version de migration courante |
| `migrate-create name=xxx` | crée une paire de fichiers de migration |
| `migrate-force version=N` | force la version (récupération dirty state) |
| `migrate-goto version=N` | migre jusqu’à la version indiquée |

### Mode dev et Lite {#mode-dev-et-lite}

| Cible | Rôle |
| --- | --- |
| `dev-start` / `dev-stop` / `dev-restart` / `dev-logs` / `dev-status` | `scripts/dev.sh start/stop/restart/logs/status` (arguments profile via `DEV_ARGS`) |
| `dev-app` | `go run ./cmd/server` en local (ldflags de version) |
| `dev-frontend` | `npm run dev` en local |
| `build-lite` / `run-lite` / `package-lite` / `package-mac-app` | build / run / packaging Lite (voir § 2.3) |
| `download_spatial` | `go run cmd/download/duckdb/duckdb.go` télécharge l’extension DuckDB spatial (outils d’analyse) |

### Catalogue des fournisseurs de modèles {#catalogue-fournisseurs-modeles}

| Cible | Rôle |
| --- | --- |
| `model-catalog-generate` | `python3 scripts/model-catalog/generate.py`, régénère métadonnées et overrides de protocole du catalogue |
| `model-catalog-check` | vérifie que la génération est à jour et exécute `go test ./internal/models/...` (idem CI) |
| `model-catalog-diff` | rapport de diff des métadonnées modèles (models.dev), revue manuelle uniquement, n’écrit pas les fichiers ; `VENDOR=deepseek` pour un seul fournisseur |

Pour brancher un fournisseur, voir [Guide des points d’extension](03-extension-points.md).

## Stratégie de tests {#strategie-de-tests}

### Tests unitaires Go (module principal) {#tests-unitaires-go}

```bash
make test          # go test -v ./...
# ou par package :
go test ./internal/infrastructure/chunker/...
go test -run TestXxx ./internal/application/service/...
```

Le module principal s’appuie largement sur `go-sqlmock`, `miniredis`, etc. (voir `go.mod`) : la plupart des tests tournent sans base réelle. Certains packages exigent CGO (DuckDB / sqlite-vec).

### Tests docreader (Python) {#tests-docreader-python}

Tests dans `docreader/tests/`, écrits avec `unittest` du stdlib (`unittest.main()` dans les fichiers), couvrant routage de parsing, concurrence, EPUB/Excel/MHTML/PDF, protection SSRF, etc. :

```bash
cd docreader
uv sync
uv run python -m unittest discover -s tests -v      # tout
uv run python -m unittest tests.test_parser_routing  # un fichier
```

### Tests CLI et tests d’acceptation {#tests-cli-et-acceptation}

`cli/` est un module Go séparé avec son `cli/Makefile` :

```bash
cd cli
make test            # go test ./...
make test-coverage   # avec couverture
make lint            # go vet
```

Tests contractuels / d’intégration transversaux dans `cli/acceptance/` (voir `cli/acceptance/doc.go`) :

- `cli/acceptance/contract/` — golden tests sur la forme JSON envelope + cohérence du registre `error.code` ;
- `cli/acceptance/e2e/` — tests boîte noire contre un serveur WeKnora réel (style testscript), variables d’env pointant vers le serveur de test ; CI via `.github/workflows/cli-e2e.yml`, **déclenchement à la demande** (`workflow_dispatch` manuel ou label PR `acceptance-e2e`), secrets `WEKNORA_E2E_HOST` / `WEKNORA_E2E_TOKEN`.

### Répertoire tests/ et tests frontend {#repertoire-tests-et-frontend}

- `tests/miniprogram/miniprogram.test.js` — test d’intégration client mini-programme (script Node) ; seul contenu actuel de `tests/` ;
- frontend : `cd frontend && npm run type-check` (vue-tsc) et `npm test` (`tsx --test`, Node test runner).

## Conventions de code et flux de contribution {#conventions-et-contribution}

### Conventions Go {#conventions-go}

`.golangci.yml` à la racine (format golangci-lint v2) :

```yaml
version: 2
linters-settings:
  lll:
    line-length: 120
    tab-width: 4
linters:
  enable:
    - lll           # largeur de ligne (120 colonnes)
    - govet
    - revive
formatters:
  enable:
    - gofmt
    - gofumpt
```

Avant commit, exécutez :

```bash
make fmt && make lint && make test
```

Le formateur de référence est **gofumpt** (plus strict que gofmt), largeur max. 120 colonnes.

Vous pouvez installer les hooks Git du dépôt (`./scripts/install-git-hooks.sh`, `core.hooksPath` → `scripts/git-hooks`) : pre-commit contrôle les espaces, gofmt auto et golangci-lint si installé ; pre-push aligné sur la CI (gofmt, `go vet` / `go test` / `go build`). `SKIP_HOOKS=1` pour tout ignorer temporairement ; `HOOK_SKIP_TEST=1` pour sauter uniquement les tests pre-push.

Ajout ou mise à jour de dépendances tierces, ou modification de fichiers de données livrés avec la release : mettre à jour `THIRD_PARTY_NOTICES.md` et `licenses/`, puis `scripts/check-license-bundle.sh` (même contrôle dans `app.yml`).

### CI et contribution {#ci-et-contribution}

Configuration réelle sous `.github/` :

| Fichier | Chemins déclencheurs | Rôle |
| --- | --- | --- |
| `workflows/app.yml` | code Go module racine, `go.mod`, `config/`, `migrations/`, `scripts/`, `docker/Dockerfile.app`, fichiers licence, données catalogue modèles | module principal : gofmt (commits du PR uniquement), `go vet`, `go test`, `go build ./cmd/server` ; bundle licences tierces, catalogue fournisseurs, tests hooks Git |
| `workflows/go-lint.yml` / `go-lint-cache.yml` | PR / main | golangci-lint ne signale que les problèmes nouveaux vs base de merge ; `go-lint-cache.yml` préchauffe le cache sur main |
| `workflows/frontend.yml` | `frontend/`, `scripts/build_frontend_dist.sh` | Node 24 : `npm test` + `npm run type-check` + `npm run build` ; build multi-étapes `frontend/Dockerfile` (sans push) et vérif. page embed + routes proxy MCP dans l’image (`scripts/test_embed_nginx.py`) |
| `workflows/docreader.yml` | `docreader/`, `testdata/`, `packages/`, Dockerfiles associés | uv install → `compileall` → `unittest discover docreader/tests` ; puis service gRPC docreader et `go test ./docreader/client ./docreader/proto` |
| `workflows/mcp-server.yml` | `mcp-server/` | matrice Python 3.10–3.13 ; après merge sur main, publication PyPI Trusted Publishing selon version dans `pyproject.toml` (skip si version déjà publiée, sans tag) |
| `workflows/cli.yml` | `cli/` | matrice ubuntu/macos/windows, Go 1.26, `go build` + `go test -race -coverprofile` + `go vet` + contrôle vocabulaire skill wire |
| `workflows/cli-e2e.yml` | manuel / label | acceptance E2E CLI (label `acceptance-e2e` ou déclenchement manuel, voir § 4.3) |
| `workflows/docker-image.yml` | — | build et publication d’images Docker |
| `workflows/release-lite.yml` | — | release Lite |
| `workflows/anydoc.yml` | `third_party/anydoc-go/`, `internal/infrastructure/docparser/` | build et tests moteur Office in-process |
| `workflows/dsh-plugin.yml` | `packages/dsh-weknora/` | tests et release plugin DeepSeek Harness |
| `pull_request_template.md` | — | modèle de PR |
| `ISSUE_TEMPLATE/` | — | modèles d’issue |
| `dependabot.yml` | — | mises à jour de dépendances |

Quatre workflows path-triggered (app / frontend / docreader / mcp-server) couvrent les modules principaux ; un passage local reste plus rapide. Pour le frontend : `scripts/verify_frontend_pr.sh` reproduit l’ordre CI `npm test` → `npm run type-check` → `npm run build`.

Flux : fork / branche → local `fmt + lint + test` → PR (modèle) → CI selon chemins modifiés.

## Débogage {#debogage}

### Niveau de journalisation {#niveau-journalisation}

Implémentation dans `internal/logger/logger.go` (logrus). Niveau via `LOG_LEVEL` : `debug` / `info` / `warn` (`warning`) / `error` / `fatal` ; défaut **debug** si absent ou invalide (`getLogLevelFromEnv()`). `LOG_PATH` fixe la sortie ; les deux s’appliquent après chargement de `.env` dans `main()`. docreader lit aussi `LOG_LEVEL` (transmis par compose).

Chaque requête porte un `X-Request-ID` dans les logs app et docreader (`init_logging_request_id` côté docreader) ; en cas d’incident, récupérez d’abord cet identifiant.

### GIN_MODE et Swagger {#gin-mode-et-swagger}

- Avec `GIN_MODE=release`, Swagger UI est désactivé (`internal/router/router.go`) et le comportement de sécurité des canaux embed en est affecté. En dev source, utilisez `debug` ; Docker Compose laisse par défaut `release` si la variable n’est pas définie.
- Swagger est servi par le **backend app**. URL par défaut `http://localhost:8080/swagger/index.html` ; si `APP_PORT` est modifié dans Compose, utilisez le port mappé sur l’hôte. Le frontend (défaut `80`) et le port Vite dev (défaut `5173`) ne proxifient pas `/swagger/`.
- Les images release incluent déjà la doc Swagger ; lancez `make docs` seulement si vous modifiez les annotations d’API et devez régénérer puis rebuild le backend.

#### Accès via Docker Compose

Dans `.env` du projet, définissez `GIN_MODE=debug`, puis recréez le conteneur app pour appliquer l’env (`docker compose restart app` seul ne met pas à jour l’environnement du conteneur) :

```bash
docker compose up -d --no-deps --force-recreate app
docker compose exec app printenv GIN_MODE
docker compose port app 8080
```

La première commande doit afficher `debug` ; utilisez le port affiché par la seconde pour joindre le backend. Ex. `0.0.0.0:8080` → `http://localhost:8080/swagger/index.html` en local ; depuis une autre machine, remplacez `localhost` par l’hôte de déploiement. Après dépannage, repassez `GIN_MODE` à `release` et recréez le conteneur app.

#### Page blanche ou échec de chargement

Vérifiez que la requête atteint le backend (exemple port backend `8080`) :

```bash
curl -i http://localhost:8080/swagger/index.html
curl -i http://localhost:8080/swagger/doc.json
```

En succès, les deux renvoient `200` : HTML avec `swagger-ui`, puis JSON avec champs `swagger` et `paths`.

| Symptôme | Piste |
| --- | --- |
| `200` mais HTML = page SPA frontend (`<div id="app">`), écran blanc ou redirection login | Requête tombée dans le fallback SPA frontend. Utilisez le port mappé du backend app ; le frontend connecté n’ajoute pas de proxy `/swagger/`. |
| Backend `401` ou `404`, pas de Swagger UI | Vérifier port d’accès et `GIN_MODE` effectif dans le conteneur ; en `release`, routes Swagger absentes, requêtes non matchées peuvent passer par l’auth. |
| Swagger UI visible mais définition API introuvable | Tester `/swagger/doc.json` sur le même backend ; derrière un reverse proxy maison, forwarder tout `/swagger/` et les assets statiques vers app. |

### Base de données et migrations {#debogage-migrations}

- `AUTO_MIGRATE=false` désactive la migration auto au démarrage ; `AUTO_RECOVER_DIRTY` (activé par défaut, `false` pour couper) contrôle la récupération auto du dirty state (`internal/container/container.go`). Échec de migration : alerte sans bloquer le démarrage — surveiller `Database migration failed` dans les logs.
- `make migrate-version` pour confirmer rapidement la version de schéma.

### Traçage des appels LLM (Langfuse) {#tracage-llm-langfuse}

`dev.sh start` lance par défaut Langfuse self-hosted (`http://localhost:3000`). Pour un app en `go run` local, exportez :

```bash
export LANGFUSE_HOST=http://localhost:3000
export LANGFUSE_PUBLIC_KEY=pk-lf-xxx
export LANGFUSE_SECRET_KEY=sk-lf-xxx
```

Les traces d’appels modèle par session sont visibles dans l’UI Langfuse (les spans de traitement document sont aussi persistés dans `knowledge_processing_spans`, visualisables côté frontend).

### pprof {#pprof}

Le code **n’expose pas** aujourd’hui d’endpoint `net/http/pprof` (aucune référence pprof sous `internal/`, `cmd/`). Pour du profilage, ajoutez temporairement dans `cmd/server/main.go` `import _ "net/http/pprof"` et un `http.ListenAndServe("localhost:6060", nil)` dédié, ou `go test -bench . -cpuprofile` sur un package ciblé.

### Diagnostic de stratégie de découpage {#diagnostic-decoupage}

Le chunker expose `SplitWithDiagnostics()` (`internal/infrastructure/chunker/strategy.go`) : chaîne de stratégies, raisons de rejet par tier et profil document ; avec `LOG_LEVEL=debug` (logs `chunker: tier %s rejected`) pour analyser la qualité du chunking.

### Scripts de maintenance d’images cloud {#cloud-image-scripts}

`scripts/cloud-image/` prépare des images de distribution sur une machine Linux dédiée et jetable. Le déploiement courant passe par [Installation et déploiement](../01-getting-started/02-installation.md) ; inutile d’exécuter ces scripts dans ce cas.

- `prepare.sh` télécharge les artefacts pour `WEKNORA_REF`, pull les images et installe les unités systemd. Cette ref fixe aussi la version d’image : vérifiez que le tag existe. Les unités systemd fournies utilisent `/opt/WeKnora` ; changer uniquement une variable de répertoire dans le script ne suffit pas pour déplacer l’installation.
- `cleanup.sh` efface données, secrets, clés SSH autorisées, journaux et cache Docker sur la machine de fabrication puis arrête la VM ; impact au-delà du dossier WeKnora — réservé à une machine de build dédiée et validée.
- `firstboot.sh` sur une nouvelle instance génère les secrets, écrit `.env` et démarre Compose ; désactive ensuite le service first-boot sans supprimer le script.

Avant de fabriquer une image, validez la cohérence scripts / version choisie. Avant distribution, testez sur une instance neuve : démarrage, santé des services, indépendance des secrets. Ce guide ne certifie pas l’homologation sur une plateforme cloud particulière.

Dépannage first-boot : `journalctl -u weknora-firstboot`, `/var/log/weknora-firstboot.log`, état Compose sous `/opt/WeKnora`. `.firstboot.done` est écrit après génération des secrets et avant le démarrage Compose ; sa présence n’implique pas que les services sont sains. En cas d’échec au démarrage, conservez `.env` et le marqueur, corrigez la cause puis relancez Compose ; supprimer le marqueur pour regénérer les secrets peut désaligner la config et une base déjà initialisée.
