# 10 — Plan de tests

## 1. Point de départ

| | WeKnora | Agent Memory |
|---|---|---|
| Tests unitaires/intégration publics | 1 884 fichiers `_test.go`, 317 tests frontend, 53 tests Python | 3 fichiers au total |
| Exécutés en CI | Oui (`go vet` + `go test` sur tous les paquets, `npm test`, `vue-tsc`, docreader, CLI e2e, Helm) — `WK/.github/workflows/app.yml:144-150` | Non (`AM/.github/workflows/pr-ci.yml` ne lance pas `vitest`) |
| Jeux d'évaluation mémoire | `WK/internal/application/service/memory/evalset.json`, `topic_evalset.json` | Scripts de bench (`AM/MemoryCore/scripts/bench-l0-mongo/`), pas de résultats publiés |

Conséquence : **les tests WeKnora sont le filet de non-régression** ; tout code porté depuis Agent Memory doit arriver avec ses propres tests, écrits pendant le portage.

## 2. Non-régression du socle (à chaque PR)
1. `go vet` + `go test ./...` (hors `docreader`), `go test -tags desktop ./internal/container` — identique à `WK/.github/workflows/app.yml`.
2. Frontend : `npm test`, `npm run type-check`, `npm run build`, `check-i18n`.
3. Docreader : `uv sync --locked`, `compileall`, pytest ; **test spécifique EPUB** après retrait de `ebooklib` (`WK/docreader/tests/test_epub_parser.py`, `test_epub_external_images.py` doivent passer avec le repli ZIP).
4. Migrations : application `up` complète sur Postgres vierge **et** sur une copie anonymisée d'une base existante, puis `down` de chaque nouvelle migration ; parité SQLite.
5. Licences : scan SBOM, échec si licence interdite.

## 3. Tests des nouvelles capacités

### Memory Engine
- Unitaires : résolution de portée (user/team/agent/task), héritage, budgets d'injection, supersede/tombstone par portée.
- **Isolation** (bloquants) : un utilisateur du tenant A ne lit jamais une mémoire du tenant B ; un membre hors équipe ne lit pas la mémoire d'équipe ; un agent désactivé pour la mémoire ne lit ni n'écrit (cas déjà traité par `MemoryAllowedForAgent`, `WK/internal/types/memory.go:151-186`, à étendre).
- Cascade asynchrone : L1 → L2 → L3 idempotente, reprise après crash (lease asynq), dead-letter.
- Qualité : jeux d'évaluation existants sans régression ; nouveau jeu L2/L3 (rappel du bon scénario, précision du persona) avec seuils fixés avant portage ; comparaison A/B contre Agent Memory sur le même corpus de conversations.

### Skills Engine
- Une proposition extraite n'est ni listée comme active ni exécutable avant approbation.
- Versions : création, diff, rollback, intégrité des ressources (hash), concurrence de deux éditions.
- Exécution sandbox inchangée (tests `tenant_skill_*_test.go` existants).

### Code Intelligence (si retenu)
- Contrat de l'adaptateur Go ↔ sidecar (tests de contrat sur `search`, `callers`, `callees`, `impact`).
- Sidecar non joignable sans jeton de service ; refus d'un `team_id` non signé.
- Dépôts de référence (petit, moyen, monorepo) : temps d'indexation et mémoire mesurés.

### Proxy agents de code (si retenu)
- Transparence protocolaire OpenAI `/v1/chat/completions`, Anthropic `/v1/messages`, Responses (streaming compris).
- Aucune clé ou jeton de service dans le prompt visible par le LLM.
- Write-back exact une fois par tour.

## 4. Sécurité
- Tests d'autorisation par route (matrice rôle × route) générés depuis `WK/internal/router/`.
- Tests SSRF existants + nouveaux sur l'URL du sidecar.
- `JWT_SECRET` absent en mode production → démarrage refusé.
- Revue de dépendances (govulncheck, npm audit, pip-audit) en CI.

## 5. Performance et ressources
Aucun benchmark n'a été exécuté dans l'audit. À établir en préproduction avant la phase 2 :
- Latence p50/p95 d'une question RAG avec et sans injection L2/L3.
- Débit d'ingestion (documents/min) et coût LLM de la cascade mémoire par conversation.
- Empreinte mémoire du processus Go et des sidecars.

## 6. Recette
- Scénarios métier Global-IT-SS fournis par toi (au moins deux applications métier pilotes), exécutés en préproduction, avec validation humaine avant toute mise en production.
