# 02 — TencentDB Agent Memory : stack réelle et audit fonctionnel

Branche `feat/server_team`, commit `ecc01a545da0b2ac6cae2f0f0af0d39d41469793` (v2.0.3+4). Chemins relatifs à la racine du dépôt (`AM/`).

## 1. Vue d'ensemble

Agent Memory n'est pas un seul service mais **quatre applications Node.js/TypeScript** plus des SDK et des plugins d'agents :

| Module | Rôle réel (d'après le code) | Port par défaut | Preuve |
|---|---|---|---|
| **MemoryCore** | Moteur de mémoire L0→L3, Skills, métadonnées (users/teams/agents/tasks/ACL), gateway HTTP v2/v3, pipelines LLM asynchrones, offload de contexte | 8420 | `MemoryCore/Dockerfile:151`, `MemoryCore/src/gateway/server.ts`, `MemoryCore/src/core/tdai-core.ts` |
| **MemoryKnowledge** | Service « Knowledge » : Wiki LLM (ingestion de sources → pages Markdown + graphe de liens) et Code-Graph (indexation de dépôts Git) ; serveur MCP | 8421 (8424 en image combinée) | `MemoryKnowledge/Dockerfile` (`EXPOSE 8421`), `MemoryKnowledge/openapi.yaml`, `MemoryKnowledge/src/mcp/server.ts` |
| **MemoryPanel** | BFF Hono + SPA React (console d'administration « Team Memory ») | 8125 | `deploy/panel-knowledge-combined/Dockerfile:88`, `MemoryPanel/src/panel/`, `MemoryPanel/web/` |
| **MemoryProxy** | Proxy LLM transparent (OpenAI / Anthropic / Codex Responses) qui injecte mémoire, Skills et Knowledge dans les requêtes des agents de code et réécrit les conversations dans MemoryCore | 8096 | `MemoryProxy/Dockerfile` (`EXPOSE 8096`), `MemoryProxy/README.md`, `MemoryProxy/src/server.ts` |
| **SDK** | Client TypeScript (undici) et Python (httpx) de l'API v2/v3 | — | `sdk/memory-core/typescript/package.json`, `sdk/memory-core/python/pyproject.toml` |
| **Plugins / adapters** | Plugins in-process OpenClaw, Hermes, Pi ; guides d'intégration Claude Code, Codex, CodeBuddy, OpenCode, WorkBuddy, DSH | — | `MemoryCore/openclaw-plugin/`, `MemoryCore/hermes-plugin/`, `MemoryCore/pi-plugin/`, `adapters/opencode/`, `agents/*/README.md` |

Volumétrie (lignes TS/TSX hors tests, `git ls-files`) : MemoryCore ≈ 114 900, MemoryProxy ≈ 66 100, MemoryPanel ≈ 47 600, MemoryKnowledge ≈ 17 700, SDK ≈ 4 000.

## 2. Fiche stack

| Élément | Constat | Preuve |
|---|---|---|
| Langage backend | TypeScript (ESM), **Node.js ≥ 22.16** pour MemoryCore, ≥ 22 pour Knowledge/Panel | `MemoryCore/package.json` (`engines.node`), `MemoryKnowledge/package.json`, `MemoryPanel/package.json` |
| Version TypeScript | 6.0 (Core, Knowledge), 5.7–5.8 (Panel, Proxy) — versions hétérogènes | `devDependencies` des quatre `package.json` |
| Exécution | `tsx` en production pour Core et Proxy (pas de build) ; `tsdown` pour Knowledge ; `tsc` pour Panel | `MemoryCore/Dockerfile:165` (`node --import tsx src/gateway/server.ts`), `MemoryProxy/Dockerfile` (ENTRYPOINT), `MemoryKnowledge/package.json` (`build: tsdown`) |
| Serveur HTTP | **MemoryCore : `node:http` brut** avec routage manuel ; Knowledge, Panel, Proxy : **Hono 4** + `@hono/node-server` | `MemoryCore/src/gateway/server.ts:17`, `MemoryKnowledge/package.json`, `MemoryPanel/package.json`, `MemoryProxy/package.json` |
| Frontend | **React 18.3** + react-router 7 + zustand 5 + i18next, build **Vite 6**, TypeScript 5.7 | `MemoryPanel/web/package.json`, `MemoryPanel/web/vite.config.ts` |
| Composants UI | **`tea-component` 2.8** (design system Tencent Cloud, licence npm `UNLICENSED`), `tea-icons-react`, Tailwind CSS 3, lucide-react, sigma/graphology (graphes) | `MemoryPanel/web/package.json`, `MemoryPanel/web/src/tea-override.css` |
| Gestion des dépendances | npm 11 (lockfile seulement pour Proxy et la build combinée) ; Python : setuptools/pyproject | `MemoryProxy/Dockerfile` (`package-lock.json`), `deploy/panel-knowledge-combined/Dockerfile` (`npm ci`) |
| Bases de données | **SQLite** (`node:sqlite` `DatabaseSync` pour les métadonnées, `sqlite-vec` + FTS5 pour la mémoire), **MongoDB** (expérimental, nécessite `mongot` pour `$search`), **Tencent Cloud VectorDB (tcvdb)** (service cloud managé) | `MemoryCore/src/metadata/store/sqlite-adapter.ts:13`, `MemoryCore/src/core/store/sqlite/memory-store.ts:484-969`, `MemoryCore/src/core/store/mongodb/memory-store.ts:2`, `MemoryCore/src/core/store/tcvdb/`, `MemoryCore/src/core/backend-selection/types.ts:17`, `README.md:46` (« MongoDB … experimental ») |
| Knowledge DB | SQLite via **better-sqlite3 + Drizzle ORM** ; un `index.db` SQLite par wiki | `MemoryKnowledge/src/db/schema.ts`, `MemoryKnowledge/src/engines/wiki/manager.ts:6-9` |
| Recherche lexicale | SQLite FTS5, BM25 client (`bm25-local.ts`) avec segmentation **jieba** ; Mongo `$search` (Lucene) ; MiniSearch historique côté wiki | `MemoryCore/src/core/store/bm25-local.ts`, `MemoryCore/src/core/store/tokenize.ts`, `MemoryCore/src/core/store/mongodb/doc-mappers.ts:5` |
| Recherche vectorielle | `sqlite-vec` (`vec0`), tcvdb hybridSearch (dense + sparse), Mongo | `MemoryCore/src/core/store/sqlite/memory-store.ts:542,664`, `MemoryCore/src/core/store/tcvdb/memory-store.ts:7` |
| Fusion / reranking | **RRF uniquement (k = 60)** ; aucun modèle de reranking (cross-encoder) | `MemoryCore/src/core/hooks/auto-recall.ts:644-777`, `MemoryCore/src/core/store/tcvdb/memory-store.ts:1087` |
| Embeddings | Fournisseur OpenAI-compatible, ou local via `node-llama-cpp` + `embeddinggemma-300m` GGUF ; **désactivé par défaut** (`provider: "none"`) | `MemoryCore/src/core/store/embedding.ts:4-8`, `MemoryCore/src/config.ts:132` |
| Cache / files | File locale par défaut ; **Redis Streams (XREADGROUP) uniquement via `src/integrations/redis/`, module privé absent du dépôt** | `MemoryCore/src/core/state/index.ts:50-60`, `MemoryCore/src/services/pipeline-worker.ts:1-15` |
| Stockage objet | Local FS ou COS ; **le backend COS est dans `src/integrations/cos/`, absent** | `MemoryCore/src/core/storage/factory.ts:34`, `MemoryCore/src/gateway/server.ts:1468` |
| LLM | **Vercel AI SDK v6** (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`), LLM local via `node-llama-cpp` (peer dep) pour l'offload | `MemoryCore/package.json`, `MemoryKnowledge/package.json`, `MemoryCore/src/offload/local-llm/` |
| Bibliothèques d'agents | Pas de framework d'agent générique ; intégration par plugins d'hôtes (OpenClaw ≥ 2026.3.7 en peer dep, Hermes, Pi) et par proxy | `MemoryCore/package.json` (`peerDependencies.openclaw`), `MemoryCore/openclaw-plugin/`, `MemoryProxy/src/agent-adapters/` |
| Code-Graph | `@colbymchenry/codegraph` 1.x (binaires natifs par plateforme, MIT) | `MemoryKnowledge/src/engines/code/bridge.ts:1-30` |
| Observabilité | OpenTelemetry, Langfuse, Opik, ClickHouse (télémétrie tool-calls) ; backend d'observabilité complet dans `src/integrations/observability/` **absent** | `MemoryCore/src/core/report/factory.ts:33-60`, `MemoryKnowledge/src/clickhouse-telemetry.ts`, `MemoryProxy/src/langfuse.ts`, `MemoryProxy/src/opik.ts` |
| Docker | Images `node:22-slim` multi-stage, `tini` ; compose Mongo local (`mongodb/mongodb-atlas-local:8.3`) ; image combinée Panel+Knowledge ; scripts `deploy/global-images/*.sh` | `MemoryCore/Dockerfile`, `MemoryCore/docker-compose.local-mongo.yaml`, `deploy/panel-knowledge-combined/Dockerfile`, `MemoryKnowledge/docker-compose.yml` |
| Tests | **3 fichiers de test dans tout le dépôt** : `MemoryCore/src/metadata/router/agent-task-visibility.test.ts`, `MemoryPanel/web/tests/i18n-storage.test.mjs`, `sdk/memory-core/python/tests/test_v3_transport_timeout.py`. Les configs Vitest référencent `__tests__/**` qui n'est pas publié (`.gitignore:11,64,101,109`) | `MemoryCore/vitest.config.ts` |
| CI/CD | Un workflow : install, `npm pack`, validation du manifeste OpenClaw, garde de taille, « Skill Queue Isolation » ; **ne lance pas `vitest`** ; déclenché uniquement sur PR vers `main` | `.github/workflows/pr-ci.yml` |

## 3. Audit fonctionnel par domaine

### 3.1 MemoryCore — mémoire conversationnelle L0/L1/L2/L3 — *Implémenté*

| Couche | Contenu | Stockage | Code |
|---|---|---|---|
| L0 Conversation | Messages bruts, horodatés, isolés par `user/agent/session(/team/task)` | table `l0_conversations` + `l0_fts` + `l0_vec` | `core/store/sqlite/memory-store.ts:606,664,969`, `core/conversation/` |
| L1 Atom | Faits, préférences, contraintes, événements extraits par LLM, dédupliqués | `l1_records` + `l1_fts` + `l1_vec` | `core/record/l1-extractor.ts`, `l1-dedup.ts`, `l1-writer.ts` |
| L2 Scenario | Blocs de connaissance par projet/scénario, **fichiers Markdown** écrits par un agent LLM sandboxé dans `scene_blocks/` | Système de fichiers (ou COS privé) | `core/scene/scene-extractor.ts:2-9`, `core/scene/scene-index.ts` |
| L3 Persona | Profil long terme (`persona.md`) généré à partir des scènes, avec garde « JEV » | Fichier | `core/persona/persona-generator.ts`, `core/persona/jev-gate.ts` |

- Orchestration : `utils/pipeline-factory.ts` (1 530 lignes), `utils/pipeline-manager.ts`, `services/pipeline-worker.ts` (cascade L1→L2→L3, verrous, retries 5 s/15 s/45 s, dead-letter — **ces garanties ne s'appliquent qu'au backend Redis privé**).
- Rappel : `core/hooks/auto-recall.ts` (modes keyword / embedding / hybrid + RRF), `core/tools/memory-search.ts`, `core/tools/conversation-search.ts`.
- Capture : `core/hooks/auto-capture.ts`.
- API v2 par couche : `/v2/conversation/*` (L0), `/v2/atomic/*` (L1), `/v2/scenario/*` (L2), `/v2/core/*` (L3) — `gateway/v2-router.ts`.
- Roadmap : édition L1-L3 et recherche L0/L1 depuis le panel **annoncées, pas livrées** (`ROADMAP.md`, sections « Editable memories » et « L0 / L1 memory search »).

### 3.2 Skills — *Implémenté*

- `core/skill/` (≈ 8 000 lignes) : `skill-core.ts`, `skill-versioning.ts` (versions append-only, copie de l'arbre de ressources, hash MD5), `skill-resource-store.ts`, `skill-extractor.ts` (extraction de Skills depuis les conversations), `skill-permission.ts`, `conversation-add/` (file par agent).
- Stockage : `skills`, `skill_fts`, `skill_vec` (`core/skill/skill-store-ddl.ts:22,72,93`), variantes Mongo et tcvdb.
- API : `/v3/skill/{create,get,list,search,update,patch,delete,versions,export,extract,files/*,conversation/add,…}` — `gateway/skill-handlers.ts`.

### 3.3 Métadonnées, utilisateurs, équipes, ACL — *Implémenté*

- Entités : `meta_users`, `meta_user_keys`, `meta_teams`, `meta_team_members`, `meta_agents`, `meta_tasks`, `meta_task_agents`, `meta_participation_logs`, `meta_assets`, `meta_agent_fixed_assets`, `meta_asset_acl`, `meta_config_params`, … (`metadata/store/sqlite-adapter.ts:140-347`, `scripts/db/sqlite-init.sql`).
- Rôles d'équipe : `admin | member | reviewer` ; types d'utilisateur `normal | system_admin` ; permissions `read | write | delete | assign | share | use` ; ACL sujet `user | team_role | agent`, effet `allow` (le `deny` est « réservé ») — `metadata/types.ts:15-61`.
- Visibilité des assets : `private | team | restricted | agent | task` (`metadata/types.ts:36`), vérifiée dans `metadata/service/permission-checker.ts`, `user-visibility.ts`.
- Mots de passe : scrypt + sel + pepper (`metadata/utils/crypto.ts`). Clés utilisateur : `metadata/utils/user-key.ts`.
- Isolation des données mémoire : `IsolationContext {teamId?, userId, agentId, sessionId, taskId?}` obligatoire en écriture (`core/store/isolation.ts`).

### 3.4 Authentification et API — *Implémenté, posture faible par défaut*

- Couche 1 : **une clé partagée** `Authorization: Bearer <TDAI_GATEWAY_API_KEY>` ; **si elle n'est pas définie, l'API est ouverte** (simple avertissement au démarrage) — `gateway/server.ts:809-831,1259-1290`.
- Couche 3 : `x-tdai-user-key` résolu en `user_id` pour `/v3/meta/*` — `gateway/server.ts:993-1006`, `metadata/router/auth.ts`.
- Knowledge : clé de service optionnelle ; **les lectures (`/tools/call`, `/wiki/get`, `/wiki/page/read`, …) restent ouvertes même avec clé**, et le périmètre est déduit d'en-têtes/corps fournis par l'appelant (`x-tdai-service-id`, `team_id`) — `MemoryKnowledge/src/middleware/auth.ts:1-60`, `MemoryKnowledge/src/routes/wiki.ts:169`.
- Panel : sessions JWT (`jose`), fournisseur SSO « WOA » (SSO interne Tencent / TAI) — `MemoryPanel/src/panel/auth/woa-provider.ts`.
- OpenAPI : `MemoryKnowledge/openapi.yaml` (1 270 lignes), `MemoryPanel/docs/api/meta-api.openapi.yaml`, modèles générés `MemoryCore/src/gateway/generated/` (Kubb).

### 3.5 Wiki — *Implémenté*

- `MemoryKnowledge/src/engines/wiki/` : ingestion LLM v2 (`ingest-v2/`: chunker, merge, cascade, overview, frontmatter, slug), index SQLite par wiki (`wiki_fts`, `page_meta`, `graph_edge`), recherche BM25 + expansion multi-saut sur liens `[[wikilink]]` (`graph-search.ts`), communautés Louvain.
- Sources : `wiki-source/providers/iwiki` (wiki interne Tencent) ; import de documents via `officeparser` (`document-converter/`).

### 3.6 Indexation de code / Code-Graph — *Implémenté (dépend d'un binaire tiers)*

- `MemoryKnowledge/src/engines/code/bridge.ts` encapsule `@colbymchenry/codegraph` ; endpoints `/code-graph/{create,sync,search,explore,callers,callees,impact,node,files}` (`MemoryKnowledge/openapi.yaml:433-697`) → **analyse d'impact disponible**.
- Fournisseurs Git : `code-source/providers/gongfeng.ts` (forge interne Tencent) et `ssh.ts` (générique).

### 3.7 MemoryProxy — *Implémenté*

- Routes `/:agent/:spaceId/v1/chat/completions`, `/v1/messages`, `/codex/:spaceId/responses`, variantes `cost-guard` et `analyse` (`MemoryProxy/src/server.ts`).
- Injection Skills/Knowledge/L2/L3 dans le prompt système, L0/L1 exposés comme outils ; write-back vers `/v3/skill/conversation/add` ; rate-limit TPM/QPM Redis ; facturation par crédits ; stockage d'état Redis/COS/SQLite/FS/mémoire (`MemoryProxy/src/storage/`).
- Dépend de `node-pty` (terminal) et de `@clickhouse/client`.

### 3.8 Offload de contexte — *Implémenté*

- `MemoryCore/src/offload/`, `offload_server/` (compactage, MMD, compteurs de tokens, LLM local) : réduction du contexte des agents de code.

### 3.9 Traitement asynchrone, erreurs, observabilité

- Workers : `services/pipeline-worker.ts`, `services/timer-scanner.ts`, `services/worker-permit-pool.ts`, `utils/serial-queue.ts`.
- Gestion d'erreurs : `gateway/error-handler.ts`, enveloppes `errorEnvelope` (`gateway/v2-router.ts`).
- Mode `deployMode=service` (multi-nœuds) : **échoue au démarrage sans `src/integrations/` privé** (`gateway/server.ts:1904-1920`).

## 4. Capacités : implémenté vs expérimental vs annoncé

| Statut | Capacités |
|---|---|
| Implémenté (mono-nœud, SQLite) | L0-L3, recall hybride RRF, Skills versionnés + extraction, métadonnées team/agent/task/ACL, Wiki LLM, Code-Graph, Proxy LLM, offload, SDK TS/Python |
| Expérimental | Backend MongoDB (`README.md:46`), embeddings (désactivés par défaut) |
| Absent du code public | Redis state backend, COS, `deployMode=service`, observabilité complète, adaptateurs quota/config (`src/integrations/*`) |
| Annoncé (roadmap) | Templates d'agents, édition L1-L3, recherche L0/L1 dans le panel, adaptateur Cursor (`ROADMAP.md`) |
| Non confirmé | Benchmarks de performance (scripts `scripts/bench-l0-mongo/` présents, résultats non publiés) |
