# 01 — Synthèse exécutive

## Réponse courte

**Il faut intégrer Agent Memory dans WeKnora (stratégie A)**, pas l'inverse, et ne pas réécrire un noyau neuf. WeKnora devient le socle du moteur Global-IT-SS ; on porte nativement en Go les trois capacités qu'Agent Memory est seul à avoir (mémoire hiérarchique partagée, extraction de Skills, versions de Skills) et on garde en modules isolés les deux composants à runtime spécifique (Code-Graph, proxy pour agents de code).

Versions examinées : WeKnora `main@40192ace` (v0.9.0) et Agent Memory `feat/server_team@ecc01a54` (v2.0.3, branche par défaut du dépôt). Détail dans [README.md](README.md).

## Pourquoi WeKnora comme socle (preuves)

| Critère | WeKnora | Agent Memory |
|---|---|---|
| Couverture des 10 modules cibles | 8/10 en production (`04-feature-matrix.md` §2) | 3/10 partiels |
| Tests | 1 884 fichiers `_test.go` + 317 tests frontend + 53 Python, exécutés en CI (`.github/workflows/app.yml:144-150`) | 3 fichiers de test publics ; la CI ne lance pas de tests (`.github/workflows/pr-ci.yml`) ; `__tests__/` exclus du dépôt (`.gitignore`) |
| Migrations | 270 migrations versionnées `golang-migrate` (`migrations/versioned/`) | DDL au démarrage + scripts ponctuels |
| Sécurité multi-client | Tenants, organisations, RBAC, JWT/API key/OIDC, audit (`internal/middleware/`, `audit_logs`) | Clé partagée optionnelle, API ouverte si non définie (`MemoryCore/src/gateway/server.ts:809-831`) ; lectures Knowledge non authentifiées (`MemoryKnowledge/src/middleware/auth.ts`) |
| Complétude open source | Complète | Redis, COS, observabilité et mode multi-nœuds dans un sous-module **privé absent** (`MemoryCore/src/core/state/index.ts:60`, `gateway/server.ts:1913`) |
| Redistribution | MIT + notices tierces fournies | UI basée sur `tea-component` sous licence npm `UNLICENSED` |

## Ce qu'Agent Memory apporte et que WeKnora n'a pas

1. **Mémoire hiérarchique L0→L3** : scénarios de projet (L2) et persona (L3) au-dessus des faits (`MemoryCore/src/core/scene/`, `core/persona/`). WeKnora a déjà une très bonne mémoire « faits/préférences » par utilisateur (`internal/application/service/memory/`), mais ni L2 ni L3.
2. **Mémoire partagée par équipe, agent et tâche** (`MemoryCore/src/core/store/isolation.ts`) ; WeKnora limite la mémoire à un utilisateur dans un tenant (`internal/types/memory.go:188`).
3. **Apprentissage de Skills** depuis les conversations, avec versions append-only (`MemoryCore/src/core/skill/skill-extractor.ts`, `skill-versioning.ts`).
4. **Code-Graph et analyse d'impact** (`MemoryKnowledge/src/engines/code/`) ; WeKnora n'a aucune analyse de code.
5. **Proxy LLM transparent** pour brancher la mémoire sur Claude Code, Codex, etc. sans modifier les agents (`MemoryProxy/`).

## Ce qui est en doublon et sera abandonné après validation
Wiki d'Agent Memory (WK plus mature), métadonnées users/teams/ACL d'AM (WK plus sûr), stores SQLite/Mongo/TCVDB d'AM, Panel React d'AM (licence UI bloquante). Rien n'est supprimé des dépôts d'origine.

## Forme du moteur
Un seul produit pour les utilisateurs et les développeurs (une API `/api/v1`, une identité, une base PostgreSQL), servi par **un processus Go principal** plus des modules internes : docreader (Python, existant), sandbox (existant), Code Intelligence (Node, optionnel), proxy agents de code (Node, optionnel). Fusionner Code-Graph ou le proxy dans le processus Go n'apporterait pas d'avantage démontrable.

## Effort et calendrier (estimation, ±30 %)
- Cœur (sécurité, portées mémoire, L2/L3, Skills, UI, stabilisation) : **17-25 semaines-développeur**.
- Avec Code Intelligence et proxy : **22-32 semaines-développeur**.
- Stratégie B : 75-115 sem. ; stratégie C : 60-90 sem. (`07-merger-strategies.md`).

## Points bloquants à traiter avant toute redistribution
1. Retirer `ebooklib` (AGPL-3.0+) du docreader WeKnora (`docreader/parser/epub_parser.py:16`) — un repli ZIP existe déjà.
2. Ne pas reprendre `tea-component` (UI Agent Memory).
3. Avis juridique sur ParadeDB `pg_search` (AGPL), requis par WeKnora pour la recherche mots-clés sur Postgres, et sur MinIO/SearXNG/Neo4j s'ils sont livrés.
4. Fixer `JWT_SECRET` en production (sinon secret aléatoire par processus).

## Limites de l'audit
- Lecture du code uniquement : aucun build, test ou benchmark n'a été exécuté ; les performances ne sont pas mesurées.
- Les tests d'Agent Memory n'étant pas publiés, sa qualité réelle n'est pas vérifiable au-delà de la lecture.
- Les estimations d'effort ne reposent sur aucune vélocité d'équipe mesurée.

## Décision attendue (phase 6)
Valider (ou modifier) : 1) la stratégie A ; 2) le périmètre cœur vs optionnel (Code Intelligence, proxy) ; 3) l'emplacement du futur dépôt `global-it-ss-engine`. Aucune ligne de code ne sera écrite avant ton accord.
