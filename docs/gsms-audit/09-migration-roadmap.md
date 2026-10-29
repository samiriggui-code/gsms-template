# 09 — Feuille de route de migration (stratégie A)

Rien ne démarre avant ta validation explicite (phase 6). Estimations en semaines-développeur, ±30 %.

## Phase 0 — Préparation (1-2 sem.)
- Créer un dépôt `global-it-ss-engine` = fork de WeKnora au commit `40192ace…`, remote `upstream` conservé ; Agent Memory reste un dépôt de **référence en lecture seule** (`ecc01a5…`).
- CI : reprendre les workflows WK + scan de licences (refus `UNLICENSED`/AGPL non validés) + SBOM.
- Environnement de préproduction isolé (jamais le VPS de production).
- **Licences** : retirer `ebooklib` du docreader (repli ZIP existant) ; décider pg_search vs OpenSearch après avis juridique.
- Critère de sortie : `go test ./...`, tests frontend et docreader verts sur le fork, sans modification fonctionnelle.

## Phase 1 — Security Core et modèle de portées (2-3 sem.)
- Migrations additives : `memory_subjects.scope_type/scope_ref`, `work_tasks*`, rôle `reviewer`.
- `JWT_SECRET` obligatoire hors mode dev ; jetons de service internes pour sidecars.
- Critère : tous les tests d'isolation existants (`*_scope_test.go`, `*_access_test.go`) verts + nouveaux tests de portée.

## Phase 2 — Memory Engine étendu (6-9 sem.)
- Portage des portées team/agent/task (lecture et écriture), règles d'héritage (utilisateur → tâche → agent → équipe).
- L2 scénarios et L3 persona : tables Postgres, tâches asynq (cascade débouncée), prompts portés depuis `AM/MemoryCore/src/core/scene/`, `core/persona/`, `core/prompts/`.
- Injection dans `chat_pipeline/memory_recall.go` et l'agent avec budgets de caractères (pattern déjà présent dans `WK/internal/types/memory.go:68-101`).
- Critère : jeux d'évaluation `WK/internal/application/service/memory/evalset.json` et `topic_evalset.json` sans régression + nouveau jeu L2/L3.

## Phase 3 — Skills Engine étendu (3-4 sem.)
- `skill_versions` append-only, `skill_proposals`, extraction post-conversation, écran de validation.
- Critère : une Skill extraite n'est jamais exécutable sans approbation ; rollback de version testé.

## Phase 4 — UI (3-4 sem., parallélisable avec 2-3)
- Écrans Vue/TDesign : mémoire d'équipe/agent/tâche, scénarios, persona, propositions de Skills, historique de versions.

## Phase 5 — Code Intelligence (2-3 sem., optionnelle)
- Extraire `AM/MemoryKnowledge/src/engines/code/` dans un sidecar minimal (sans wiki, sans iwiki/gongfeng), authentifié par jeton de service.
- Adaptateur Go + outils agent `code_search`, `code_impact`.

## Phase 6 — Proxy pour agents de code (3-4 sem., optionnelle)
- Re-pointer `AM/MemoryProxy` sur `/api/v1` (recall, skills, write-back), supprimer les dépendances internes Tencent (WeCom identity, crédits).

## Phase 7 — Stabilisation et décommission (2-3 sem.)
- Tests de charge, revue de sécurité, documentation API, import ETL éventuel de données AM existantes.
- Abandon formel (après validation) du wiki AM, du panel AM et des stores SQLite/Mongo/tcvdb AM : ils ne sont **pas supprimés** du dépôt de référence, simplement non repris.

## Synthèse

| Lot | Effort | Obligatoire |
|---|---|---|
| 0 Préparation | 1-2 | Oui |
| 1 Security Core | 2-3 | Oui |
| 2 Memory Engine | 6-9 | Oui |
| 3 Skills Engine | 3-4 | Oui |
| 4 UI | 3-4 | Oui |
| 5 Code Intelligence | 2-3 | Non |
| 6 Proxy agents de code | 3-4 | Non |
| 7 Stabilisation | 2-3 | Oui |
| **Total** | **17-25 (cœur) / 22-32 (complet)** | |

## Complexité et risques principaux

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Conflits de rebase avec l'amont WeKnora | Élevée | Moyen | Paquets dédiés, migrations additives, rebase mensuel, contributions amont si pertinent |
| Qualité des prompts L2/L3 sans tests d'origine | Moyenne | Élevé | Jeux d'évaluation construits avant portage ; comparaison A/B avec AM en préproduction |
| Fuite inter-clients via sidecars | Faible si réseau interne | Critique | Jetons signés, réseau privé, tests d'isolation dédiés |
| Coût LLM de la cascade L1→L3 | Moyenne | Moyen | Débounce, quotas par tenant, modèles locaux via Model Gateway |
| Licences (ParadeDB, binaires codegraph) | Moyenne | Élevé | Avis juridique en phase 0, alternatives prêtes |
