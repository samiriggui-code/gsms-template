# 04 — Matrice comparative

Légende maturité : **P** Production (code + tests + CI), **I** Implémenté (peu/pas de tests publics), **E** Expérimental, **A** Annoncé, **∅** Absent, **Priv.** dans un module privé non publié.
WK = WeKnora (`main@40192ac`), AM = Agent Memory (`feat/server_team@ecc01a5`).

## 1. Matrice par axe demandé

| Axe | Qui | WK | AM | Preuves | Lecture |
|---|---|---|---|---|---|
| Architecture backend | Les deux | P — monolithe modulaire Go (Gin + dig), workers asynq, docreader Python gRPC | I — 4 services Node/TS (node:http, Hono), workers in-process | WK `internal/container/`, `internal/router/task.go` ; AM `MemoryCore/src/gateway/server.ts:17`, `MemoryProxy/src/server.ts` | WK plus homogène et outillé ; AM éclaté, MemoryCore sans framework HTTP |
| Frontend & UI | Les deux | P — Vue 3.5, TDesign (MIT), Pinia, Vite 7, 317 tests | I — React 18, tea-component (`UNLICENSED`), Tailwind, Vite 6, 1 test | WK `frontend/package.json` ; AM `MemoryPanel/web/package.json` | Deux frameworks incompatibles ; UI AM non redistribuable en l'état |
| Modèle de données | Les deux | P — PostgreSQL relationnel, 270 migrations versionnées, GORM | I — SQLite DDL inline `CREATE TABLE IF NOT EXISTS`, Mongo/tcvdb, L2/L3 en fichiers Markdown | WK `migrations/versioned/` ; AM `MemoryCore/src/core/store/sqlite/memory-store.ts`, `core/scene/scene-extractor.ts` | WK a un vrai système de migrations ; AM migre par scripts ad hoc (`scripts/migrate-v2-to-v3/`) |
| Utilisateurs & espaces | Les deux | P — tenants, organisations, membres, invitations, partages, API keys, OIDC | I — users, teams, agents, tasks, user keys, ACL assets | WK `internal/types/tenant_member.go`, `organization.go` ; AM `MemoryCore/src/metadata/types.ts` | Modèles différents : WK = tenant/org ; AM = team/agent/task |
| Mémoire courte | Les deux | P — historique de session, compaction, recherche conversations | I — L0 conversations indexées FTS+vec, offload | WK `internal/agent/compaction/`, `agent/tools/search_conversations.go` ; AM `core/conversation/`, `src/offload/` | Équivalent fonctionnel |
| Mémoire longue | Les deux | P — items typés par utilisateur, supersede, tombstones, pending, consolidation | I — L1 atomes + **L2 scénarios + L3 persona**, portée **team/agent/task** | WK `internal/application/service/memory/` ; AM `core/record/`, `core/scene/`, `core/persona/`, `core/store/isolation.ts` | **Apport unique d'AM : mémoire hiérarchique partagée d'équipe/agent/tâche** |
| Recherche doc & RAG | WK | P — multi-format, chunking adaptatif, 10 pilotes vectoriels, rerank, MMR, citations, évaluation | ∅ (pas de RAG documentaire ; wiki BM25 seulement) | WK `chat_pipeline/`, `retriever/*` ; AM `MemoryKnowledge/src/engines/wiki/` | WK seul |
| Reranking | WK | P — modèles de rerank + MMR | ∅ — RRF uniquement | WK `internal/reranking/` ; AM `core/hooks/auto-recall.ts:746` | WK seul |
| Skills | Les deux | P — catalogue, install, snapshots, exécution sandbox, vérification | I — versions append-only, ressources, **extraction auto depuis conversations**, recherche FTS+vec | WK `tenant_skill_*.go`, `agent/skills/` ; AM `core/skill/` | Complémentaires : WK exécute, AM apprend |
| Exécution d'agents | WK | P — ReAct, outils, HITL, collaboration, sandbox | ∅ — AM n'exécute pas d'agent ; il s'attache à des agents externes (plugins, proxy) | WK `internal/agent/engine.go` ; AM `MemoryProxy/`, `openclaw-plugin/` | WK seul pour le runtime ; AM pour brancher des agents tiers |
| Wiki | Les deux | P — révisions, issues, lint, citations, taxonomie, outils d'édition agent, Postgres | I — ingestion LLM v2, index SQLite par wiki, graphe `[[wikilink]]`, Louvain | WK `wiki_ingest*.go` ; AM `MemoryKnowledge/src/engines/wiki/` | **Doublon** ; WK plus mature |
| Graphes | Les deux | P — entités/relations, Neo4j optionnel | I — graphe de liens wiki (graphology) | WK `retriever/neo4j/` ; AM `engines/wiki/graph-search.ts` | Approches différentes |
| Analyse de code | AM | ∅ | I — Code-Graph : search, callers, callees, **impact** | AM `MemoryKnowledge/openapi.yaml:433-697`, `engines/code/bridge.ts` | AM seul (dépend d'un binaire tiers) |
| API & extensibilité | Les deux | P — REST `/api/v1` (~434 routes), Swagger, SDK Go, CLI, MCP serveur & client, plugins pipeline | I — HTTP v2/v3 de style RPC (presque tout en POST, `gateway/v2-router.ts:505`), OpenAPI Knowledge, SDK TS/Python, MCP Knowledge, plugins d'hôtes | WK `internal/router/`, `client/`, `internal/mcpserver/` ; AM `gateway/v2-router.ts`, `sdk/`, `MemoryKnowledge/src/mcp/` | WK plus large ; AM a des SDK Python/TS |
| Performances & ressources | — | Non mesuré ; binaire Go compilé, pools (`ants`), HNSW pgvector | Non mesuré ; Node + `tsx` à l'exécution, Proxy limité à 1,5 Go de heap | WK `go.mod` ; AM `MemoryProxy/Dockerfile` (`--max-old-space-size=1536`) | Aucun benchmark exécuté dans cet audit |
| Sécurité & isolation clients | WK | P — JWT/API key/OIDC, RBAC, audit, garde-fous SSRF, isolation tenant dans les requêtes | I — clé partagée **optionnelle** (API ouverte par défaut), lectures Knowledge non authentifiées, isolation par champs fournis par l'appelant | WK `internal/middleware/auth.go`, `rbac.go` ; AM `gateway/server.ts:809-831`, `MemoryKnowledge/src/middleware/auth.ts` | WK nettement plus sûr |
| Maintenance & mises à jour | WK | P — CI complète (`go vet` + `go test`), Helm, release régulière | I — CI sans tests, branche par défaut ≠ `main`, modules privés manquants | WK `.github/workflows/app.yml` ; AM `.github/workflows/pr-ci.yml`, `src/integrations/*` absent | Risque de maintenance élevé côté AM |
| Coût de la fusion | — | Socle | Donneur | voir `07-merger-strategies.md` | Porter ~6 capacités AM vers Go est moins coûteux que l'inverse |

## 2. Capacités du moteur cible : qui les possède

| Module cible | WK | AM | Verdict |
|---|---|---|---|
| Knowledge Engine (ingestion, hybride, RAG, citations, éval) | P | ∅ | **WeKnora** |
| Memory Engine (conversations, faits, contexte projet, long terme) | P (utilisateur) | I (L0-L3, team/agent/task) | **Les deux** → socle WK + portage des couches L2/L3 et des portées d'AM |
| Skills Engine (procédures versionnées, ressources, validations) | P (exécution, versions servies) | I (versions append-only, extraction) | **Les deux** → socle WK + extraction AM en « propositions » validées |
| Wiki Engine | P | I | **WeKnora** (abandon du wiki AM après validation) |
| Code Intelligence | ∅ | I | **Agent Memory** (sidecar) |
| Agent Runtime (exécution, outils, sandbox, HITL) | P | ∅ | **WeKnora** |
| Model Gateway (local/distant, embeddings, rerank) | P (33 fournisseurs, Ollama) | I (AI SDK, node-llama-cpp) | **WeKnora** |
| Security Core (identité, rôles, isolation, audit) | P | I | **WeKnora** (+ notions team/agent/task d'AM à modéliser) |
| API unifiée | P | I | **WeKnora** (`/api/v1`) + façade de compatibilité v2/v3 AM si besoin |
| Plugin System (connecteurs, extensions) | P (connecteurs, IM, MCP, plugins pipeline) | I (adapters d'agents) | **WeKnora** + adaptateurs d'agents AM (Proxy) |

Bilan : WeKnora couvre 8 modules sur 10 en production ; Agent Memory apporte trois capacités sans équivalent (mémoire hiérarchique partagée, extraction de Skills, Code-Graph) et un mode d'intégration original (proxy LLM transparent pour agents de code).
