# 08 — Architecture cible : moteur Global-IT-SS

Diagramme : [diagrams/architecture-cible.md](diagrams/architecture-cible.md).

## Principes
1. **Un produit, une API, une identité, une base de référence** (PostgreSQL), plusieurs processus spécialisés quand c'est justifié.
2. **Socle WeKnora conservé et suivi en amont** : ajouts dans des paquets dédiés et des migrations additives, aucune suppression de fichier ni de migration existante.
3. **Portage natif** des capacités Agent Memory qui partagent données et transactions avec le socle ; **isolation** de celles qui ont un runtime spécifique.
4. Toute identité est résolue par le Security Core et propagée aux modules internes ; aucun module n'accepte un `tenant_id`/`team_id` venant du corps de requête.

## Les 10 modules

| # | Module | Composant retenu | Origine | Mode | Ce qui est ajouté |
|---|---|---|---|---|---|
| 1 | **Knowledge Engine** | `WK/internal/application/service/knowledge*.go`, `chat_pipeline/`, `retriever/`, `infrastructure/chunker/`, `docreader/`, `metric/` | WK | Processus Go + docreader Python (gRPC) | Persistance des résultats d'évaluation (aujourd'hui en mémoire, `evaluation.go:65`) |
| 2 | **Memory Engine** | `WK/internal/application/service/memory/` étendu | WK + portage AM | Processus Go | Portées `team/agent/task`, couches L2 scénarios et L3 persona (prompts AM `core/scene/`, `core/persona/`, `core/prompts/`), recherche L0 sur `messages` |
| 3 | **Skills Engine** | `WK/internal/agent/skills/`, `tenant_skill_*.go` | WK + portage AM | Processus Go + sandbox | Table de versions append-only, extraction depuis conversations (logique de `AM/MemoryCore/src/core/skill/skill-extractor.ts`) en **propositions** validées par un humain |
| 4 | **Wiki Engine** | `WK/internal/application/service/wiki_*.go` | WK | Processus Go | Rien d'obligatoire ; reprise éventuelle de la recherche multi-saut sur liens (`AM/MemoryKnowledge/src/engines/wiki/graph-search.ts`) si gain mesuré |
| 5 | **Code Intelligence** | `AM/MemoryKnowledge/src/engines/code/` + routes `code-graph` | AM | **Sidecar Node** interne, sans exposition publique | Adaptateur Go `internal/gis/codeintel/` ; identité propagée par jeton de service signé ; outils agent `code_search`, `code_impact` |
| 6 | **Agent Runtime** | `WK/internal/agent/`, `internal/sandbox/`, `internal/mcp/`, `internal/agent/approval/` | WK | Processus Go + sandbox | Injection du contexte mémoire L2/L3 par portée ; outils code |
| 7 | **Model Gateway** | `WK/internal/models/` | WK | Processus Go | Rien d'obligatoire (Ollama et OpenAI-compatible couvrent le local) |
| 8 | **Security Core** | `WK/internal/middleware/auth.go`, `rbac.go`, `application/access/`, `audit_logs` | WK | Processus Go | Entité « tâche de travail », rôle `reviewer`, jetons de service internes pour les sidecars, `JWT_SECRET` obligatoire en production |
| 9 | **API unifiée** | `WK/internal/router/` `/api/v1`, `WK/client/`, `internal/mcpserver/` | WK | Processus Go | Endpoints mémoire étendus, propositions de Skills, code-intel ; façade `/compat/am/*` optionnelle et temporaire |
| 10 | **Plugin System** | Connecteurs `WK/internal/datasource/connector/`, IM `WK/internal/im/`, MCP, plugins `chat_pipeline` | WK | Processus Go | **MemoryProxy** AM en sidecar optionnel pour brancher les agents de code externes |

## Flux principaux

1. **Question utilisateur** : Frontend Vue → `/api/v1` → Security Core (tenant, rôle) → Agent Runtime → Memory Engine (bloc résident + L2/L3 de la portée) → Knowledge Engine (hybride + rerank) → Model Gateway → réponse avec citations.
2. **Après le tour** : tâche asynq → extraction mémoire (L1) → cascade L2 → L3 (débouncée) ; extraction de Skills → proposition en attente de validation.
3. **Agent de code externe** : agent → MemoryProxy (sidecar) → `/api/v1` (recall, skills, code-intel) → LLM amont ; write-back de la conversation vers `/api/v1`.
4. **Analyse d'impact** : outil agent `code_impact` → adaptateur Go → sidecar Code-Graph (réseau interne) → résultat.

## Déploiement cible (référence)

| Service | Image | Obligatoire |
|---|---|---|
| `gis-app` (Go) | dérivée de `WK/docker/Dockerfile.app` | Oui |
| `gis-frontend` (Vue) | dérivée de `WK/frontend/Dockerfile` | Oui |
| `docreader` | `WK/docker/Dockerfile.docreader` sans `ebooklib` | Oui |
| `postgres` (pgvector ; pg_search selon avis juridique) + `redis` | officielles | Oui |
| `sandbox` | `WK/docker/Dockerfile.sandbox` | Si Skills exécutables |
| `gis-codeintel` (Node) | dérivée de `AM/MemoryKnowledge/Dockerfile`, limitée au moteur code | Optionnel |
| `gis-agent-proxy` (Node) | dérivée de `AM/MemoryProxy/Dockerfile` | Optionnel |

Aucune installation n'est prévue sur un VPS de production avant validation ; les premiers déploiements se font sur un environnement de préproduction isolé.
