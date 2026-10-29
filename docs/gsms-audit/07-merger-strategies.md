# 07 — Stratégies de fusion

Les estimations sont en **semaines-développeur** (1 développeur senior Go/TS), hors recette métier, avec une marge d'incertitude de ±30 %. Elles reposent sur la volumétrie mesurée (WK ≈ 510 k lignes Go, AM ≈ 250 k lignes TS) et sur la liste des capacités à porter ; aucune mesure de vélocité réelle n'a été faite.

## Ce que chaque projet apporte sans équivalent

| Apport unique | Source | Preuve |
|---|---|---|
| RAG documentaire complet, rerank, citations, évaluation | WK | `WK/internal/application/service/chat_pipeline/`, `metric/` |
| Runtime d'agents (ReAct, outils, sandbox, HITL, MCP) | WK | `WK/internal/agent/`, `WK/internal/sandbox/` |
| Multi-tenant, RBAC, OIDC, audit | WK | `WK/internal/middleware/`, `audit_logs` |
| Mémoire hiérarchique L2 (scénarios) et L3 (persona) | AM | `AM/MemoryCore/src/core/scene/`, `core/persona/` |
| Mémoire partagée par équipe / agent / tâche | AM | `AM/MemoryCore/src/core/store/isolation.ts`, `metadata/types.ts` |
| Extraction automatique de Skills depuis les conversations + versions append-only | AM | `AM/MemoryCore/src/core/skill/skill-extractor.ts`, `skill-versioning.ts` |
| Code-Graph et analyse d'impact | AM | `AM/MemoryKnowledge/src/engines/code/`, `openapi.yaml:612-662` |
| Proxy LLM transparent pour agents de code (Claude Code, Codex, CodeBuddy…) | AM | `AM/MemoryProxy/` |
| Offload/compaction de contexte pour agents de code | AM (WK a sa propre compaction) | `AM/MemoryCore/src/offload/`, `WK/internal/agent/compaction/` |

## Stratégie A — WeKnora comme socle

**Principe** : garder le backend Go, le frontend Vue, PostgreSQL, Redis/asynq et le modèle tenant/RBAC de WeKnora ; intégrer les capacités d'Agent Memory module par module.

| Capacité AM | Traitement | Justification | Effort |
|---|---|---|---|
| Portées team/agent/task de la mémoire | **Portage natif Go** (extension de `memory_subjects`) | Le service mémoire WK a déjà extraction, consolidation, tombstones ; il manque la dimension de portée | 3-4 sem. |
| L2 scénarios, L3 persona | **Portage natif Go** : prompts repris d'AM, stockage en tables Postgres (pas en fichiers), tâches asynq | Les algorithmes sont essentiellement des prompts + orchestration ; la plomberie WK (asynq, modèles, embeddings) existe | 4-6 sem. |
| Extraction de Skills + versions | **Portage natif Go** vers `tenant_skill_*` avec statut « proposition » validée par un humain | WK exécute déjà les Skills ; il manque l'apprentissage et l'historique de versions | 3-4 sem. |
| Code-Graph | **Rester isolé** : sidecar TS issu de `MemoryKnowledge/src/engines/code/` derrière un adaptateur Go | Dépend de binaires natifs Node ; le réécrire en Go n'apporte rien de démontrable | 2-3 sem. |
| MemoryProxy | **Rester isolé** (optionnel) : sidecar TS re-pointé sur l'API WK | Fonction de bord (proxy de trafic LLM) ; pas de raison de l'intégrer au processus principal | 3-4 sem. |
| Wiki AM | **Remplacé** par le wiki WK (après validation) | Doublon ; WK a révisions, issues, lint, citations, Postgres | 0 (validation 0,5 sem.) |
| Panel AM | **Remplacé** par des écrans Vue/TDesign | `tea-component` non redistribuable ; écrans à ajouter : mémoire d'équipe, scénarios, persona, propositions de Skills, code-graph | 3-4 sem. |
| Metadata AM (users/teams/ACL) | **Remplacé** par tenants/organisations/grants WK + entité tâche | Doublon ; WK plus sûr | 1-2 sem. (entité tâche) |
| Stores SQLite/Mongo/tcvdb AM | **Abandonnés** | Pilotes WK plus nombreux et testés | 0 |

**Total A : ≈ 17-25 semaines-développeur pour le cœur** (préparation, sécurité, portées, L2/L3, Skills, UI, stabilisation) et **≈ 22-32 avec les deux sidecars optionnels** (Code-Graph, Proxy). Détail par lot dans `09-migration-roadmap.md`.

- Avantages : un seul langage principal (Go), une seule base, sécurité multi-client déjà en production, 1 884 fichiers de tests comme filet de non-régression, CI existante.
- Risques : divergence avec l'amont WeKnora (projet très actif : 3 801 commits en ~15 mois) ; qualité des prompts AM à revalider sans les tests d'origine ; deux sidecars TS à maintenir si on garde Code-Graph et Proxy.
- Atténuation : regrouper les ajouts dans des paquets dédiés (`internal/gis/...`) et des migrations additives pour limiter les conflits de rebase ; suivre l'amont par rebase mensuel.

## Stratégie B — Agent Memory comme socle

**Principe** : garder Node/TS, SQLite/Mongo, le modèle team/agent/task, puis apporter RAG, agents et documents de WeKnora.

| Capacité WK à apporter | Option 1 : réécrire en TS | Option 2 : garder WK comme service |
|---|---|---|
| Ingestion, chunking, 10 pilotes vectoriels, rerank, citations | 25-40 sem. | WK entier tourne à côté → **on maintient WK de toute façon** |
| Runtime d'agents, sandbox, MCP, HITL | 20-30 sem. | idem |
| Multi-tenant, RBAC, OIDC, audit | 8-12 sem. (à reconstruire sur une base sans tests) | double modèle d'identité à synchroniser |
| Wiki, graphe, IM, connecteurs | 15-25 sem. | idem |
| Infra manquante (Redis, COS, observabilité privés) | 4-6 sem. | — |

**Total B : ≈ 75-115 semaines-développeur** en option 1 ; en option 2, coût initial plus faible mais **deux stacks, deux modèles d'identité et deux bases** à maintenir indéfiniment, avec le socle le moins testé et le moins sûr en position centrale.

- Rejetée : elle place au centre le composant qui a 3 fichiers de tests publics, une CI qui ne lance pas les tests, une branche par défaut sans historique commun avec `main`, une API ouverte par défaut et des modules d'infrastructure privés manquants.

## Stratégie C — Nouveau noyau Global-IT-SS

**Principe** : écrire un noyau neuf (API, identité, modèle de données) et y brancher sélectivement des composants des deux projets.

| Poste | Effort |
|---|---|
| Noyau identité/tenant/RBAC/audit + migrations | 10-14 sem. |
| API unifiée + SDK | 6-8 sem. |
| Réintégration du Knowledge Engine WK (découplé de ses services internes) | 15-25 sem. (couplage fort via `dig` et `interfaces`) |
| Réintégration du runtime d'agents WK | 10-15 sem. |
| Portage mémoire/Skills AM | 10-14 sem. |
| UI | 10-15 sem. |
| **Total** | **≈ 60-90 semaines-développeur** |

- Avantage théorique : architecture « propre » maîtrisée de bout en bout.
- Démonstration de l'avantage : **non établie**. WeKnora est déjà un monolithe modulaire avec interfaces (`WK/internal/types/interfaces/`), injection de dépendances (`dig`), pipeline à plugins et pilotes interchangeables : la propreté recherchée existe déjà. Extraire ses composants pour les rebrancher sur un nouveau noyau coûte plus cher que de les étendre, et coupe le suivi des correctifs amont.
- Rejetée comme réécriture totale. Retenue seulement sous forme « C-légère » : une **façade de marque Global-IT-SS** (nom, API publique documentée, SDK) posée sur le socle WK, ce qui est en pratique la stratégie A.

## Un ou plusieurs processus ?

La fusion dans un **seul processus** est souhaitable pour tout ce qui partage identité, base et transactions : mémoire (portées, L2/L3), Skills, wiki, RAG, agents. Elle n'est **pas** souhaitable pour :
- **docreader** (Python, OCR, dépendances lourdes) — déjà séparé dans WK, à garder ;
- **Code-Graph** (binaires natifs Node, indexation CPU-intensive de dépôts) — sidecar ;
- **MemoryProxy** (trafic LLM à haut débit, cycle de vie différent) — sidecar optionnel ;
- **sandbox** — déjà séparé.

Résultat : **un seul moteur du point de vue produit et développeur** (une API, une identité, une base, une UI), reposant sur un processus Go principal et 2 à 4 modules internes spécialisés, sans imposer un langage unique.

## Recommandation

**Stratégie A**, avec Code-Graph et MemoryProxy en modules isolés, et portage natif en Go des trois capacités mémoire/Skills d'Agent Memory. Voir `08-target-architecture.md` et `09-migration-roadmap.md`.
