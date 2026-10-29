# 03 — WeKnora : stack réelle et audit fonctionnel

Branche `main`, commit `40192ace214ca046a86b590d69c1fe7286f3423e` (v0.9.0+2). Chemins relatifs à la racine du dépôt (`WK/`).

## 1. Vue d'ensemble

WeKnora est une **plateforme RAG + agents multi-tenant** composée de :

| Composant | Rôle | Port | Preuve |
|---|---|---|---|
| **app** (Go) | API REST (≈ 434 routes Gin), agents ReAct, RAG, wiki, mémoire, sandbox, MCP, IM, connecteurs, tâches asynchrones | 8080 | `docker-compose.yml` (service `app`), `cmd/server/`, `internal/router/` |
| **frontend** (Vue 3) | SPA servie par Nginx (proxy `/api`) | 80 | `frontend/Dockerfile`, `frontend/nginx.conf` |
| **docreader** (Python) | Parsing documentaire (PDF, DOCX, XLSX, PPTX, EPUB, HTML, images/OCR…) exposé en **gRPC** | 50051 (interne) | `docreader/main.py`, `docreader/proto/docreader.proto`, `.env.lite.example` (`DOCREADER_TRANSPORT=grpc`) |
| **sandbox** | Exécution des Skills/outils (Docker, E2B ou Cube Sandbox) | — | `docker/Dockerfile.sandbox`, `internal/sandbox/` |
| **mcp-server** (Python) | Serveur MCP externe qui expose WeKnora | 8082→8000 | `mcp-server/`, `docker-compose.yml` (service `mcp`) |
| CLI, SDK Go, desktop | `cli/` (module Go séparé), `client/` (SDK Go), `cmd/desktop` (Wails v2) | — | `cli/go.mod`, `client/go.mod`, `go.mod` (`wailsapp/wails/v2`) |

Volumétrie : ≈ 509 700 lignes Go hors tests, **1 884 fichiers `_test.go`**, 263 fichiers `.vue`, 317 fichiers de test frontend, 53 fichiers de test Python (docreader + mcp-server), 3 801 commits depuis le 05/08/2025.

## 2. Fiche stack

| Élément | Constat | Preuve |
|---|---|---|
| Langage backend | **Go 1.26** | `go.mod:3`, `docker/Dockerfile.app` (`golang:1.26-bookworm`) |
| Framework HTTP | **Gin 1.12** + `gin-contrib/cors`, Swagger (`swaggo`) | `go.mod`, `internal/router/router.go` |
| Injection de dépendances | `go.uber.org/dig` | `go.mod`, `internal/container/` |
| ORM / SQL | **GORM 1.31** (drivers Postgres, SQLite), `pgx/v5`, `golang-migrate` | `go.mod`, `migrations/versioned/` |
| Service Python | **Python 3.10.18**, gRPC, `uv` (lockfile), markitdown, pypdf, pypdfium2, opendataloader-pdf, RapidOCR + ONNX Runtime, Playwright | `docreader/pyproject.toml`, `docreader/uv.lock`, `docker/Dockerfile.docreader:4` |
| Frontend | **Vue 3.5** + vue-router 4 + **Pinia 3** + vue-i18n 11, **Vite 7**, TypeScript 6, `vue-tsc` | `frontend/package.json` |
| Composants UI | **TDesign Vue Next 1.19** (MIT) + tdesign-icons ; xterm, noVNC, mermaid, KaTeX, pdf.js | `frontend/package.json` |
| Gestion des dépendances | Go modules, npm (`package-lock.json`), uv (Python) | `go.sum`, `frontend/package-lock.json`, `docreader/uv.lock` |
| Base relationnelle | **PostgreSQL 17 (image ParadeDB v0.25.11)** par défaut, **SQLite** en mode « lite », MySQL (init seulement) | `docker-compose.yml` (service `postgres`), `.env.example:140` (`DB_DRIVER=postgres`), `.env.lite.example`, `migrations/mysql/00-init-db.sql` |
| Migrations | **270 fichiers versionnés** (dernier `000134_tenant_default_settings`) + 104 pour SQLite | `migrations/versioned/`, `migrations/sqlite/` |
| Recherche lexicale | ParadeDB **pg_search** (`paradedb.score`, BM25) — obligatoire pour la recherche mots-clés sur Postgres ; alternatives Elasticsearch 7/8, OpenSearch, SQLite FTS | `internal/application/repository/retriever/postgres/repository.go:34-58`, `migrations/versioned/000099_pg_search_0226.up.sql` |
| Recherche vectorielle | **pgvector (halfvec, HNSW)** par défaut ; pilotes Milvus, Qdrant, Weaviate, Elasticsearch, OpenSearch, Doris, Tencent VectorDB, SQLite (`sqlite-vec`) ; recherche parallèle multi-pilotes | `migrations/versioned/000002_embeddings.up.sql:35-70`, `internal/application/repository/retriever/*`, `.env.example:283-284` |
| Graphe | Neo4j (optionnel, `NEO4J_ENABLE`) + projection Postgres | `internal/application/repository/retriever/neo4j/`, `internal/application/repository/graph_search.go` |
| Cache / files | **Redis 7** ; files de tâches **asynq** (avec dead-letter `task_dead_letters`) ; flux SSE via Redis ou mémoire | `internal/router/task.go:98,139`, `.env.example:157-159`, `migrations/versioned/*task_queue*` |
| Stockage objet | Local, MinIO, S3, COS, OSS (Aliyun), TOS (Volcengine), KS3 | `go.mod`, `internal/storageurl/`, `.env.example:200` |
| LLM / modèles | Couche maison `internal/models/` : chat, embeddings, rerank, VLM, ASR ; 33 fournisseurs (OpenAI, Anthropic, Gemini, DeepSeek, Ollama, Azure, Hunyuan, Zhipu, OpenRouter, LiteLLM, HF TEI, Jina, Cohere, Nvidia…) | `internal/models/providers/*.go`, `internal/models/api/*` |
| Reranking | Modèles de rerank (Cohere, Jina, TEI, NIM, DashScope, Pinecone…) + **MMR** + rerank image | `internal/models/api/*rank*`, `internal/reranking/mmr.go`, `internal/application/service/chat_pipeline/rerank.go` |
| Agents | Moteur **ReAct** maison (`AgentEngine`), steer/suspend/resume, compaction de contexte, collaboration multi-agents, HITL | `internal/agent/engine.go:33,380`, `internal/agent/compaction/`, `internal/agent/hitl/`, `internal/agent/collaboration/` |
| MCP | Client MCP (`mark3labs/mcp-go`, OAuth) + serveur MCP intégré | `internal/mcp/`, `internal/mcpserver/` |
| Observabilité | OpenTelemetry (OTLP HTTP), **Langfuse** (traces agents/modèles), logrus + lumberjack | `internal/tracing/`, `internal/logger/logger.go:17-19`, `docker-compose.yml` (services `langfuse-*`) |
| Configuration | `config/config.yaml` + variables d'environnement (`.env.example`, 51 Ko) via Viper ; presets d'agents, prompts YAML | `config/`, `internal/config/config.go` |
| Docker / déploiement | Compose avec profils (`full`, `neo4j`, `qdrant`, `milvus`, `weaviate`, `doris`, `minio`, `langfuse`, `dex`, `searxng`) ; **chart Helm** | `docker-compose.yml`, `helm/` |
| Tests | Go (`go test` sur tous les paquets), frontend (`tsx --test`, `vue-tsc`), docreader (pytest), e2e CLI, tests Helm | `.github/workflows/app.yml:144-150`, `frontend.yml`, `docreader.yml`, `cli-e2e.yml`, `helm.yml` |
| CI/CD | 13 workflows : app, frontend, docreader, CLI, CLI e2e, Helm, images Docker, lint Go, MCP server, release lite, anydoc, plugin DSH | `.github/workflows/` |

## 3. Audit fonctionnel par domaine

### 3.1 Ingestion, parsing, chunking — *Production*
- Parsing : `docreader/parser/*.py` (≈ 30 parseurs, dont `pdf_parser.py`, `docx_parser.py`, `excel_parser.py`, `epub_parser.py`, `image_parser.py`, `web_parser.py`) ; parseur Go `firecrawl/anydoc` (`third_party/anydoc-go`).
- Chunking : `internal/infrastructure/chunker/` (heading splitter, heuristique, profils adaptatifs, validation).
- Traitement : `internal/application/service/knowledge_process*.go`, post-traitement (résumés, questions générées, tags auto, graphe, wiki).
- Connecteurs : Confluence, DingTalk, Feishu, GitLab, IMA, Notion, RSS, Seafile, Yuque (`internal/datasource/connector/`), planifiés (`internal/datasource/scheduler.go`).

### 3.2 Recherche hybride, RAG, citations, évaluation — *Production* (évaluation : *Implémenté*)
- Pipeline par plugins événementiels : `internal/application/service/chat_pipeline/` (`query_understand.go`, `query_expansion.go`, `search_parallel.go`, `rerank.go`, `merge*.go`, `wiki_boost.go`, `memory_recall.go`, `citation_sources.go`, `references.go`).
- Fusion : `knowledgebase_search_fusion.go`, fan-out multi-KB `knowledgebase_search_fanout.go`.
- Évaluation : métriques BLEU, ROUGE, MRR, MAP, NDCG, précision, rappel (`internal/application/service/metric/`) ; **les résultats d'évaluation sont stockés en mémoire du processus** (`evaluation.go:65`, `evaluationMemoryStorage`) → non persistés.

### 3.3 Mémoire longue durée — *Production*
- Service : `internal/application/service/memory/` (`extract.go`, `consolidate.go`, `lexical.go`, `vector.go`, `topic_resolve.go`, `scope.go`).
- Modèle : `memory_subjects`, `memory_items`, `memory_item_embeddings`, `memory_tombstones`, `memory_topic_stats`, `memory_extraction_sessions`, `memory_doc_affinity` (`migrations/versioned/000084_memory.up.sql`, `000094_memory_consistency.up.sql`, `internal/types/memory.go`).
- Types : `profile`, `preference`, `fact`, `task`, `interest` ; statuts `active`, `superseded`, `archived`, `pending` (confirmation humaine) ; tombstones (« oubli » respecté) ; consolidation quotidienne ou forcée ; bloc « résident » injecté à chaque tour (`internal/types/memory.go:21-57,188-232`).
- **Portée : un sujet = un principal dans un tenant** (`MemorySubject.TenantID + SubjectID`). Pas de mémoire partagée d'équipe, d'agent ou de tâche ; pas de couches « scénario » ni « persona » distinctes.
- API : `/api/v1/memory/{settings,items,topics,documents,export,consolidate}` (`internal/router/routes_memory.go:23-38`).
- Outil agent : `internal/agent/tools/search_memory.go` ; recherche dans les conversations : `search_conversations.go`.

### 3.4 Wiki et graphe de connaissances — *Production*
- Wiki généré par LLM depuis les bases de connaissances : `wiki_ingest*.go` (batch, citations, déduplication, taxonomie, retry, annulation), `wiki_lint.go`, `wiki_linkify.go`, révisions et issues (`wiki_page_revisions`, `wiki_page_issues`), dossiers (`wiki_folders`).
- Outils agents d'édition du wiki : `internal/agent/tools/wiki_*.go`.
- Graphe : extraction entités/relations (`extract.go`, `config/prompt_templates/graph_extraction.yaml`), recherche `graph_search.go`, Neo4j optionnel.

### 3.5 Skills, sandbox, outils, MCP — *Production*
- Skills au format « Agent Skills » (SKILL.md + frontmatter, divulgation progressive) : `internal/agent/skills/`, catalogue / installation / snapshots / vérification par tenant (`tenant_skill_*.go`, tables `tenant_skills`, `tenant_skill_snapshots`, `tenant_skill_catalog`).
- Versionnement : champ `Version` + `SkillServedVersion` (version servie) — `internal/types/tenant_skill.go:64,105,153`. **Pas d'extraction automatique de Skills depuis les conversations.**
- Sandbox : Docker, E2B, Cube (`internal/sandbox/docker_*.go`, `e2b_*.go`, `cube_*.go`), terminal et bureau distants, sandbox locale (`internal/localsandbox/`).
- Approbation humaine : `internal/agent/approval/` (politique d'outils, risque MCP, `ask_user`), `mcp_tool_approvals`.
- Outils agents : ≈ 90 fichiers dans `internal/agent/tools/` (recherche KB, mémoire, web, shell, fichiers, base de données, analyse de données, navigateur…).

### 3.6 Authentification, multi-tenant, RBAC, audit — *Production*
- Authentification : JWT Bearer, `X-API-Key` (clés par tenant `tenant_api_keys`), OIDC (Dex en compose) — `internal/middleware/auth.go:119-200`, `internal/config/config.go:27,674`.
- Multi-tenant : `tenants`, `tenant_members` (rôles `owner/admin/contributor/viewer` — `internal/types/tenant_member.go:21-32`), `organizations` (rôles `admin/editor/viewer` — `internal/types/organization.go:14-18`), partages KB/agents (`kb_shares`, `agent_shares`), grants (`resource_access_grants`).
- RBAC / propriété : `internal/middleware/rbac.go` (`RequireOwnershipOrRole`), `internal/application/access/`.
- Journal d'audit : `audit_logs` + rétention (`migrations/versioned/000044_audit_log.up.sql`, `audit_log_retention.go`).
- Garde-fous SSRF : `*_ssrf_test.go`, `internal/storageallowlist/`, `parser_url_security.go`.

### 3.7 Code Intelligence — *Absent*
- Aucune indexation de code, aucun graphe d'appels (recherche `tree-sitter|codegraph|call graph` négative hors Neo4j générique). Le connecteur GitLab importe des fichiers comme documents (`internal/datasource/connector/gitlab/`).

## 4. Capacités : implémenté vs expérimental vs annoncé

| Statut | Capacités |
|---|---|
| Production | Ingestion multi-format, chunking, RAG hybride + rerank, multi-KB, agents ReAct, Skills + sandbox, MCP client/serveur, wiki LLM, graphe, mémoire utilisateur, multi-tenant + RBAC + audit, IM (Slack, Telegram, Feishu, WeCom, DingTalk, Mattermost, QQ, WeChat), connecteurs |
| Implémenté (persistance partielle) | Évaluation RAG (résultats en mémoire) |
| Preview | CLI `weknora` (« preview » en v0.5.2, `README.md:225`) |
| Absent | Indexation/analyse de code, mémoire d'équipe/agent/tâche, proxy LLM transparent pour agents de code |
