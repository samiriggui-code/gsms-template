# Global-IT-SS AI Engine — Audit WeKnora × TencentDB Agent Memory

Audit en lecture seule, réalisé le 29/10/2026. Aucun code n'a été modifié, aucune fusion n'a été commencée (phase 6 : attente de validation).

**Nouveau clone du repo :** les dépôts Tencent de veille ne sont pas dans Git — lancer `./scripts/clone-research.sh` à la racine (voir [README-GLOBAL-IT-SS.md](../../README-GLOBAL-IT-SS.md)).

## Versions examinées

| Dépôt | URL | Branche examinée | Commit | Date du commit | Tag le plus proche |
|---|---|---|---|---|---|
| WeKnora | https://github.com/Tencent/WeKnora | `main` (branche par défaut) | `40192ace214ca046a86b590d69c1fe7286f3423e` | 2026-10-29 | `v0.9.0-2-g40192ace2` (fichier `VERSION` = `0.9.0`) |
| TencentDB Agent Memory | https://github.com/TencentCloud/TencentDB-Agent-Memory | `feat/server_team` (branche **par défaut** du dépôt) | `ecc01a545da0b2ac6cae2f0f0af0d39d41469793` | 2026-10-28 | `v2.0.3-4-gecc01a5` |

Point d'attention sur Agent Memory : la branche par défaut n'est pas `main`. `origin/main` (`a3c2d8600b5d…`, 2026-10-19) n'a **aucun ancêtre commun** avec `feat/server_team` (`git merge-base` vide) et contient une version beaucoup plus petite et ancienne du produit (`git diff --stat` : 1 321 fichiers, −305 388 lignes). L'audit porte sur `feat/server_team`, qui contient la v2.0.3 complète (MemoryCore, MemoryKnowledge, MemoryPanel, MemoryProxy). La CI (`.github/workflows/pr-ci.yml`) ne se déclenche que sur les PR vers `main`.

Les clones sont conservés séparément et intacts (aucun `git status` modifié). Aucun `npm install`, `go build` ou conteneur n'a été lancé : toutes les conclusions viennent de la lecture du code, des manifestes et des métadonnées de registres publics (npm, PyPI) pour les licences.

## Conventions

- `WK/…` = chemin relatif à la racine de WeKnora ; `AM/…` = chemin relatif à la racine d'Agent Memory.
- Niveaux de maturité : **Production** (code + tests + CI + migrations), **Implémenté** (code présent, peu ou pas de tests publics), **Expérimental** (marqué comme tel dans le code ou la doc, ou désactivé par défaut), **Annoncé** (doc/roadmap uniquement), **Absent du code public** (référencé mais livré dans un module privé).
- « Non confirmé » signifie que la preuve n'a pas pu être trouvée dans le code.

## Livrables

| Fichier | Contenu |
|---|---|
| [01-executive-summary.md](01-executive-summary.md) | Conclusion et recommandation |
| [02-agent-memory-stack.md](02-agent-memory-stack.md) | Fiche stack et audit fonctionnel d'Agent Memory |
| [03-weknora-stack.md](03-weknora-stack.md) | Fiche stack et audit fonctionnel de WeKnora |
| [04-feature-matrix.md](04-feature-matrix.md) | Matrice comparative avec preuves |
| [05-data-models-and-apis.md](05-data-models-and-apis.md) | Modèles de données, stockage, API |
| [06-security-and-licensing.md](06-security-and-licensing.md) | Sécurité, isolation multi-client, licences |
| [07-merger-strategies.md](07-merger-strategies.md) | Stratégies A, B, C |
| [08-target-architecture.md](08-target-architecture.md) | Architecture cible en 10 modules |
| [09-migration-roadmap.md](09-migration-roadmap.md) | Feuille de route par phases et estimation |
| [10-test-plan.md](10-test-plan.md) | Plan de tests et non-régression |
| [11-file-level-integration-map.md](11-file-level-integration-map.md) | Cartographie fichier par fichier |
| [diagrams/architecture-actuelle.md](diagrams/architecture-actuelle.md) | Diagrammes Mermaid des deux projets |
| [diagrams/architecture-cible.md](diagrams/architecture-cible.md) | Diagramme Mermaid de la cible |
