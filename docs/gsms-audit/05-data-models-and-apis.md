# 05 — Modèles de données, stockage et API

## 1. Stockage : comparaison

| Aspect | WeKnora | Agent Memory |
|---|---|---|
| SGBD principal | PostgreSQL 17 (ParadeDB) ; SQLite en mode lite | SQLite (`node:sqlite`) ; MongoDB (expérimental) ; Tencent Cloud VectorDB |
| Schéma | Tables relationnelles, JSONB, clés UUID `varchar(36)`, `tenant_id uint64` | Tables SQLite à chaînes (`user_id`, `team_id`, `agent_id` texte), documents Mongo, fichiers Markdown pour L2/L3 |
| Migrations | `golang-migrate`, 270 fichiers `up/down` (`WK/migrations/versioned/`), séquence SQLite parallèle (104) | DDL `CREATE TABLE IF NOT EXISTS` au démarrage (`AM/MemoryCore/src/core/store/sqlite/memory-store.ts`, `metadata/store/sqlite-adapter.ts:140-347`) + scripts ponctuels (`AM/MemoryCore/scripts/migrate-v2-to-v3/v2-to-v3-migrate.py`, `migrate-sqlite-to-tcvdb/`) ; Drizzle pour Knowledge (`AM/MemoryKnowledge/package.json` `db:migrate`) |
| Vecteurs | pgvector `halfvec` + HNSW, table `embeddings` (`WK/migrations/versioned/000002_embeddings.up.sql`), `memory_item_embeddings` | `vec0` (sqlite-vec) `l0_vec`, `l1_vec`, `skill_vec` ; dimension 768 dans l'exemple de DDL (`memory-store.ts:1161`) |
| Plein texte | pg_search BM25 (ParadeDB), GIN `to_tsvector` pour le wiki | FTS5 `l0_fts`, `l1_fts`, `skill_fts` ; jieba |
| Fichiers | Stockage objet abstrait (local/MinIO/S3/COS/OSS/TOS/KS3) | FS local ; COS privé ; un répertoire par instance/scène |

**Conclusion** : les bases ne doivent pas être mélangées telles quelles. Le modèle cible conserve PostgreSQL de WeKnora comme référentiel unique et **réimplémente** les tables mémoire/Skills d'Agent Memory dans des migrations WeKnora (voir §4). Les données AM existantes, s'il y en a, passent par un import ETL ponctuel, jamais par un partage de base.

## 2. Entités principales

### WeKnora (extrait, `WK/migrations/versioned/*.up.sql`, `WK/internal/types/`)
- Identité et espaces : `users`, `auth_tokens`, `tenants`, `tenant_members`, `tenant_invitations`, `tenant_api_keys`, `organizations`, `organization_members`, `organization_tenant_members`, `resource_access_grants`, `audit_logs`.
- Connaissance : `knowledge_bases`, `knowledges`, `chunks`, `chunk_revisions`, `chunk_images`, `embeddings`, `knowledge_tags`, `kb_shares`, `data_sources`, `sync_logs`.
- Wiki : `wiki_pages`, `wiki_page_revisions`, `wiki_page_issues`, `wiki_folders`, `wiki_log_entries`.
- Conversation et agents : `sessions`, `messages`, `message_artifacts`, `custom_agents`, `agent_shares`, `agent_grants`, `agent_collaborations`, `agent_run_suspensions`, `automations`, `automation_runs`.
- Mémoire : `memory_subjects`, `memory_items`, `memory_item_embeddings`, `memory_tombstones`, `memory_topic_stats`, `memory_extraction_sessions`, `memory_doc_affinity`.
- Skills et outils : `tenant_skills`, `tenant_skill_snapshots`, `tenant_skill_catalog`, `mcp_services`, `mcp_endpoints`, `mcp_tool_approvals`, `mcp_oauth_*`, `tenant_sandbox_configs`, `session_sandbox_assignments`.
- Tâches : `task_dead_letters`, `task_pending_ops`.

### Agent Memory
- Métadonnées (`AM/MemoryCore/src/metadata/store/sqlite-adapter.ts`) : `meta_users`, `meta_user_keys`, `meta_teams`, `meta_team_members`, `meta_agents`, `meta_tasks`, `meta_task_agents`, `meta_participation_logs`, `meta_assets` (types `skill | llm_wiki | code_graph | chat_memory`), `meta_agent_fixed_assets`, `meta_asset_acl`, `meta_config_params`, `meta_user_session_defaults`, `meta_instance_upstream_config`.
- Mémoire (`AM/MemoryCore/src/core/store/sqlite/memory-store.ts`) : `l0_conversations`, `l1_records`, `embedding_meta`, `entity_teams`, `entity_users`, `entity_agents`, `entity_tasks`, `entity_knowledge`, `memory_audit`, `memory_prompts`, `memory_prompt_settings`, `memory_prompt_setting_logs`, `memory_generation_refs`.
- L2/L3 : fichiers `scene_blocks/*.md`, `scene_index`, `persona.md`, `checkpoint` (`AM/MemoryCore/src/core/scene/`, `core/persona/`, `utils/checkpoint.ts`).
- Skills : `skills` (+ versions), `skill_fts`, `skill_vec` (`AM/MemoryCore/src/core/skill/skill-store-ddl.ts`).
- Knowledge (`AM/MemoryKnowledge/src/db/schema.ts`) : `knowledge_code_graph`, `knowledge_wiki`, `knowledge_wiki_audit`, `knowledge_code_graph_audit`, `knowledge_source_credential`, `llm_binding`.

## 3. Incompatibilités de modèle

| Sujet | WeKnora | Agent Memory | Conséquence |
|---|---|---|---|
| Unité d'isolation | `tenant_id` (uint64) + principal | `instance/spaceId` + `team_id` + `user_id` + `agent_id` + `session_id` (+ `task_id`) en chaînes | Il faut un mapping : instance AM → tenant WK ; team AM → organisation ou groupe dans le tenant ; agent AM → `custom_agents` |
| Équipe | Organisation (rôles admin/editor/viewer) et membres du tenant (owner/admin/contributor/viewer) | Team (admin/member/reviewer) | Rôle `reviewer` à ajouter ou mapper sur `contributor` + droit d'approbation |
| Tâche | Pas d'entité « task » métier (les tâches WK sont des jobs asynq) | `meta_tasks`, `meta_task_agents` | Nouvelle entité `work_tasks` (nom à choisir pour éviter la collision) |
| Mémoire | Items plats typés par sujet | Hiérarchie L0→L3, L2/L3 en fichiers | Nouvelles tables `memory_scenarios`, `memory_personas` en base (pas en fichiers) |
| ACL | Grants de ressources + rôles | ACL par asset `allow` (deny réservé), sujets user/team_role/agent | Étendre `resource_access_grants` plutôt que dupliquer |
| Skills | Skill installé par tenant, version servie | Skill versionné append-only, propriétaire user/agent/task | Ajouter une table de versions et un statut « proposé » |
| Identifiants | UUID | ULID / chaînes libres | Conserver l'ID AM dans une colonne `external_ref` lors d'un import |

## 4. Migrations à prévoir (dans le socle WeKnora, sans toucher aux migrations existantes)

Toutes les nouvelles migrations sont **additives** (nouvelles tables/colonnes nullables), numérotées après `000134`, avec leur `down` et leur équivalent SQLite :

1. `memory_subjects` : ajout d'un `scope_type` (`user | team | agent | task`) et `scope_ref`, avec index unique étendu — rétrocompatible (défaut `user`).
2. `memory_scenarios` (L2) : `id, tenant_id, subject_id, title, body_md, source_refs jsonb, version, updated_at` + embeddings.
3. `memory_personas` (L3) : `id, tenant_id, subject_id, body_md, version, generated_at, gate_report jsonb`.
4. `work_tasks`, `work_task_agents`, `work_task_participation` (portage de `meta_tasks*`).
5. `skill_versions` (append-only) + `tenant_skills.origin` (`installed | extracted | manual`) + `skill_proposals` (statut `pending/approved/rejected`).
6. `code_graphs` (registre des dépôts indexés, référence vers le sidecar) — le graphe lui-même reste dans le sidecar.

## 5. API

| Aspect | WeKnora | Agent Memory |
|---|---|---|
| Style | REST classique sous `/api/v1`, verbes HTTP, ≈ 434 routes (`WK/internal/router/routes_*.go`) | RPC sur POST : `/v2/{conversation,atomic,scenario,core}/*`, `/v3/{meta,skill,session,knowledge,chat-memory,memory-prompt,memory-generation-log,task-source,analytics}/*` (`AM/MemoryCore/src/gateway/server.ts`, `v2-router.ts`, `skill-handlers.ts`) |
| Auth | JWT, `X-API-Key`, OIDC | Bearer partagé (optionnel), `x-tdai-user-key`, `x-tdai-service-id` |
| Contrat | Swagger (`swaggo`), SDK Go `WK/client/` | OpenAPI (`AM/MemoryKnowledge/openapi.yaml`, `AM/MemoryPanel/docs/api/meta-api.openapi.yaml`), types générés Kubb, SDK TS/Python |
| Streaming | SSE (`WK/internal/stream/`) | SSE via le proxy LLM |
| MCP | Serveur (`WK/internal/mcpserver/`) et client | Serveur Knowledge (`AM/MemoryKnowledge/src/mcp/server.ts`) |

### API à conserver ou versionner
- **Conserver** `/api/v1` de WeKnora comme contrat principal du moteur Global-IT-SS ; toute extension (scopes mémoire, L2/L3, tâches, propositions de Skills, code-graph) s'ajoute sous `/api/v1` sans casser l'existant.
- **Introduire** `/api/v2` uniquement si un changement cassant devient nécessaire (aucun identifié à ce stade).
- **Façade optionnelle** `/compat/am/v2|v3/*` si des agents déjà branchés sur Agent Memory (plugins OpenClaw/Hermes, SDK TS/Python, MemoryProxy) doivent continuer à fonctionner ; elle traduit vers `/api/v1` et est dépréciée dès que les clients ont migré.
