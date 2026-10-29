# 11 — Cartographie d'intégration fichier par fichier (stratégie A)

Rien de ce qui suit n'a été modifié. « Nouveau » = fichier à créer dans le fork Global-IT-SS ; « Étendu » = fichier WK existant modifié de façon additive. Les chemins `internal/gis/…` sont proposés pour isoler les ajouts de l'amont.

Légende traitement : **R** réutilisé sans modification, **Ad** adaptateur, **Po** portage (réécriture Go à partir de la logique AM), **Ab** abandonné après validation (jamais supprimé du dépôt de référence).

## 1. Memory Engine

| Source AM | Cible WK | Trait. | Modification envisagée | Dépendances | Risques |
|---|---|---|---|---|---|
| `AM/MemoryCore/src/core/store/isolation.ts` | `WK/internal/types/memory.go` (Étendu), `WK/internal/application/service/memory/scope.go` (Étendu) | Po | Ajouter `ScopeType`/`ScopeRef` au sujet ; résolution de portée côté serveur | `WK/internal/types/interfaces/memory.go`, middleware auth | Ouvrir par erreur une portée trop large ; tests d'isolation obligatoires |
| — | `WK/migrations/versioned/000135_memory_scopes.{up,down}.sql` + équivalent `migrations/sqlite/` (Nouveau) | — | Colonnes nullables + index unique étendu, défaut `user` | golang-migrate | Index unique existant `idx_memory_subjects_scope` à recréer sans verrou long |
| `AM/MemoryCore/src/core/record/l1-extractor.ts`, `l1-dedup.ts`, `core/prompts/l1-extraction.ts`, `l1-dedup.ts` | `WK/internal/application/service/memory/extract.go` | R (côté WK) | **Pas de portage** : l'extraction WK équivaut au L1 ; ne reprendre que des idées de prompt si l'évaluation le justifie | Model Gateway | Doublon si porté |
| `AM/MemoryCore/src/core/scene/*.ts`, `core/prompts/scene-extraction.ts` | `WK/internal/gis/memory/scenario.go`, `scenario_prompts.go` (Nouveau) | Po | Génération/mise à jour de scénarios L2 stockés en base (pas en fichiers) ; l'agent fichier sandboxé d'AM est remplacé par une sortie structurée JSON | asynq (`WK/internal/router/task.go`), `WK/internal/models/chat` | Qualité des prompts ; coût LLM |
| `AM/MemoryCore/src/core/persona/*.ts`, `core/prompts/persona-generation.ts` | `WK/internal/gis/memory/persona.go` (Nouveau) | Po | Persona L3 par portée, garde de qualité inspirée de `jev-gate.ts` | idem | Hallucinations persistantes → statut `pending` WK réutilisé |
| `AM/MemoryCore/src/utils/pipeline-manager.ts`, `pipeline-factory.ts`, `services/pipeline-worker.ts` | `WK/internal/types/task.go` (Étendu : `memory:scenario`, `memory:persona`), `WK/internal/router/task.go` (Étendu) | Po | Cascade débouncée L1→L2→L3 avec leases asynq existants | Redis | Tempêtes de tâches ; utiliser `ExtractScheduledAt` comme verrou |
| — | `WK/migrations/versioned/000136_memory_scenarios_personas.{up,down}.sql` (Nouveau) | — | Tables `memory_scenarios`, `memory_personas` (+ embeddings) | pgvector | — |
| `AM/MemoryCore/src/core/hooks/auto-recall.ts` | `WK/internal/application/service/chat_pipeline/memory_recall.go` (Étendu) | Po (partiel) | Injecter L2/L3 de la portée active sous budget ; garder la recherche WK (lexical + vecteur) | `memory/search.go` | Dépassement de contexte ; budgets déjà présents (`types/memory.go:68-101`) |
| `AM/MemoryCore/src/core/tools/conversation-search.ts` | `WK/internal/agent/tools/search_conversations.go` | R | Déjà présent côté WK | — | — |
| `AM/MemoryCore/src/gateway/v2-router.ts` (`/v2/scenario/*`, `/v2/core/*`) | `WK/internal/router/routes_memory.go`, `WK/internal/handler/memory.go` (Étendus) | Po | Endpoints `/api/v1/memory/scenarios`, `/api/v1/memory/persona`, paramètre `scope` | RBAC | Rupture de compatibilité : uniquement additif |
| `AM/MemoryPanel/web/src/pages/ChatMemoryPage/` | `WK/frontend/src/views/settings/MemorySettings.vue`, `MemoryWorkspaceSettings.vue` (Étendus) + `WK/frontend/src/api/memory.ts` (Étendu) | Po | Vues scénarios/persona/portée en Vue + TDesign | — | `tea-component` interdit → réécriture |

## 2. Skills Engine

| Source AM | Cible WK | Trait. | Modification envisagée | Dépendances | Risques |
|---|---|---|---|---|---|
| `AM/MemoryCore/src/core/skill/skill-versioning.ts`, `skill-store-ddl.ts` | `WK/internal/types/tenant_skill.go` (Étendu), `WK/migrations/versioned/000137_skill_versions.{up,down}.sql` (Nouveau) | Po | Table `skill_versions` append-only, hash de contenu (SHA-256 plutôt que MD5), lien avec `tenant_skill_snapshots` | stockage objet WK | Cohérence fichiers/ligne : transaction + nettoyage best-effort comme AM |
| `AM/MemoryCore/src/core/skill/skill-extractor.ts`, `conversation-add/*`, `skill/prompts/*` | `WK/internal/gis/skills/extractor.go`, `proposals.go` (Nouveaux) | Po | Extraction post-conversation → `skill_proposals` en attente | asynq, Model Gateway | Skills de mauvaise qualité ; validation humaine obligatoire |
| `AM/MemoryCore/src/core/skill/skill-permission.ts` | `WK/internal/application/service/tenant_skill_*.go` + `access/` | Ab | Remplacé par RBAC WK | — | — |
| `AM/MemoryCore/src/gateway/skill-handlers.ts` | `WK/internal/router/routes_agent.go` / handler skills (Étendus) | Po | `/api/v1/skills/{id}/versions`, `/api/v1/skills/proposals` | — | — |

## 3. Code Intelligence (optionnel)

| Source AM | Cible | Trait. | Modification envisagée | Dépendances | Risques |
|---|---|---|---|---|---|
| `AM/MemoryKnowledge/src/engines/code/bridge.ts`, `normalize.ts`, `routes/code-graph.ts` (≈ 670 lignes) | Sidecar `gis-codeintel/` (Nouveau dépôt ou dossier `services/codeintel/`) | R + Ad | Extraire uniquement le moteur code + routes ; supprimer wiki, `iwiki`, `gongfeng` ; auth par jeton de service signé obligatoire | `@colbymchenry/codegraph` 1.x + binaires plateforme, `simple-git`, Hono, better-sqlite3 | Binaire tiers précompilé ; suivi de version |
| `AM/MemoryKnowledge/src/code-source/providers/ssh.ts`, `source-auth/`, `ssh-key/` | Sidecar | R | Garder SSH générique ; ajouter GitHub/GitLab HTTPS si besoin | — | Gestion de secrets : stocker les clés dans WK (`datasource_credentials`), pas dans le sidecar |
| — | `WK/internal/gis/codeintel/client.go`, `WK/internal/agent/tools/code_search.go`, `code_impact.go` (Nouveaux) | Ad | Client HTTP Go + outils agent enregistrés dans `WK/internal/agent/tools/registry.go` (Étendu) | — | Latence ; timeouts |
| `AM/MemoryKnowledge/src/db/schema.ts` (`knowledge_code_graph`) | `WK/migrations/versioned/000138_code_graphs.{up,down}.sql` (Nouveau) | Po | Registre des dépôts indexés par tenant | — | — |

## 4. Proxy pour agents de code (optionnel)

| Source AM | Cible | Trait. | Modification envisagée | Risques |
|---|---|---|---|---|
| `AM/MemoryProxy/src/server.ts`, `pipeline/`, `injection/`, `agent-adapters/*` | Sidecar `gis-agent-proxy/` | R + Ad | Remplacer les appels MemoryCore (`/v3/meta/auth/verify`, `/v3/skill/*`, `/v2/*`) par `/api/v1` WK ; auth par `X-API-Key` WK | Couplage fort à l'API AM (≈ 66 k lignes) |
| `AM/MemoryProxy/src/wecom-identity*.ts`, `credit-reporter.ts`, `pricing.ts`, `storage/cos-*.ts` | — | Ab | Spécifiques Tencent/WeCom | — |
| `AM/MemoryProxy/src/rate-limit/` | Comparer à `WK/internal/ratelimit/` | Ad | Garder côté proxy si trafic LLM élevé | — |

## 5. Composants abandonnés (après validation)

| Source AM | Remplacé par | Raison |
|---|---|---|
| `AM/MemoryKnowledge/src/engines/wiki/**`, `wiki-source/**` | `WK/internal/application/service/wiki_*.go` | Doublon moins mature |
| `AM/MemoryCore/src/metadata/**` | `WK/internal/types/tenant*.go`, `organization.go`, `application/access/` | Doublon ; sécurité WK supérieure |
| `AM/MemoryCore/src/core/store/{sqlite,mongodb,tcvdb}/**` | `WK/internal/application/repository/retriever/**` | Pilotes WK testés |
| `AM/MemoryPanel/**` | `WK/frontend/**` | `tea-component` `UNLICENSED`, React vs Vue |
| `AM/MemoryCore/src/offload*/**` | `WK/internal/agent/compaction/**` | Fonction équivalente côté WK pour ses propres agents ; à réévaluer seulement si le proxy est retenu |
| `AM/MemoryCore/openclaw-plugin`, `hermes-plugin`, `pi-plugin` | Façade `/compat/am/*` ou proxy | Plugins liés à l'API AM |

## 6. Composants WeKnora réutilisés sans modification (R)

`WK/internal/infrastructure/chunker/`, `WK/docreader/` (hors retrait `ebooklib`), `WK/internal/application/repository/retriever/**`, `WK/internal/reranking/`, `WK/internal/models/**`, `WK/internal/agent/**` (hors enregistrement de nouveaux outils), `WK/internal/sandbox/**`, `WK/internal/mcp/**`, `WK/internal/mcpserver/**`, `WK/internal/datasource/**`, `WK/internal/im/**`, `WK/internal/middleware/**` (hors jetons de service), `WK/helm/**` (hors ajout des sidecars).

## 7. Fichiers de câblage à étendre

| Fichier | Ajout |
|---|---|
| `WK/internal/container/container.go:405` | `Provide` des services `gis/memory`, `gis/skills`, `gis/codeintel` |
| `WK/internal/router/router.go`, `routes_memory.go`, `routes_agent.go` | Nouvelles routes additives |
| `WK/internal/router/task.go`, `WK/internal/types/task.go:257` | Nouveaux types de tâches asynq |
| `WK/internal/agent/tools/registry.go`, `definitions.go` | Outils `code_search`, `code_impact`, `memory_scenario_read` |
| `WK/config/config.yaml`, `WK/.env.example` | Section `gis:` (URL sidecars, budgets, activation) |
| `WK/docker-compose.yml`, `WK/helm/templates/` | Services optionnels `gis-codeintel`, `gis-agent-proxy` |
| `WK/docreader/pyproject.toml`, `WK/docreader/parser/epub_parser.py` | Retrait d'`ebooklib` (AGPL) au profit du repli ZIP |
