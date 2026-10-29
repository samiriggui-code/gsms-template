# 06 — Sécurité, isolation multi-client et licences

> Ce document relève des faits techniques. Il ne constitue pas un avis juridique : la partie licences doit être validée par un juriste avant toute redistribution commerciale.

## 1. Sécurité et isolation

### WeKnora

| Contrôle | Constat | Preuve |
|---|---|---|
| Authentification | JWT Bearer, puis `X-API-Key` (clés par tenant), OIDC ; chemins publics explicitement listés | `WK/internal/middleware/auth.go:50-200` |
| Secret JWT | Refuse les valeurs par défaut (`weknora-jwt-secret`, `CHANGE-ME-jwt-secret`) et génère un secret aléatoire si absent. **Effet de bord** : sans `JWT_SECRET` fixé, les jetons sont invalidés au redémarrage et incohérents entre réplicas | `WK/internal/application/service/user.go:80-96` |
| Rôles | Tenant : owner/admin/contributor/viewer ; organisation : admin/editor/viewer ; propriété des ressources | `WK/internal/types/tenant_member.go:21-32`, `organization.go:14-18`, `WK/internal/middleware/rbac.go` |
| Isolation des données | `tenant_id` sur les entités, filtrage dans les dépôts et retrievers ; la portée mémoire est dérivée du contexte, jamais d'un ID client | `WK/internal/application/repository/retriever/postgres/repository.go`, `WK/internal/types/memory.go:188-191` |
| Audit | Table `audit_logs` + rétention | `WK/migrations/versioned/000044_audit_log.up.sql`, `audit_log_retention.go` |
| SSRF / fichiers | Tests SSRF dédiés, allowlist de stockage, validation d'URL de parseur ; `textract` désactivé « due to SSRF vulnerability » | `WK/internal/application/service/*ssrf_test.go`, `WK/internal/storageallowlist/`, `WK/docreader/parser/doc_parser.py:188` |
| Exécution de code | Sandbox Docker/E2B/Cube, approbation des commandes et des outils MCP | `WK/internal/sandbox/command_approval.go`, `WK/internal/agent/approval/` |
| Rate limiting | Limiteur sur routes publiques d'auth | `WK/internal/middleware/auth_public_ratelimit.go`, `WK/internal/ratelimit/` |
| Politique de sécurité | `SECURITY.md` présent | `WK/SECURITY.md` |

### Agent Memory

| Contrôle | Constat | Preuve | Risque |
|---|---|---|---|
| Auth gateway | Une clé partagée unique ; **API ouverte si `TDAI_GATEWAY_API_KEY` vide** (log d'avertissement) | `AM/MemoryCore/src/gateway/server.ts:809-831,1259-1290` | Élevé si exposé |
| Compose fourni | `TDAI_GATEWAY_API_KEY=` vide dans l'exemple Mongo | `AM/MemoryCore/docker-compose.local-mongo.yaml` | Élevé |
| Identité utilisateur | `x-tdai-user-key` résolu en `user_id` pour `/v3/meta/*` | `AM/MemoryCore/src/metadata/router/auth.ts` | Moyen |
| Knowledge | Lectures (`tools/call`, `wiki/get`, `wiki/page/read`…) **sans authentification même quand une clé est configurée** ; périmètre pris dans `x-tdai-service-id` et `team_id` envoyés par l'appelant | `AM/MemoryKnowledge/src/middleware/auth.ts:1-60`, `AM/MemoryKnowledge/src/routes/wiki.ts:169` | **Élevé** : fuite inter-équipes si le service est joignable |
| Isolation mémoire | `IsolationContext` obligatoire en écriture ; en lecture, les champs non fournis **ne filtrent pas** (« unset means do not narrow ») | `AM/MemoryCore/src/core/store/isolation.ts:39-48` | Moyen : un appelant interne qui oublie un champ lit plus large |
| Permissions | Vérification de visibilité agent/tâche (corrigée récemment : commit `afadb9a` « enforce agent and task read permissions ») | `AM/MemoryCore/src/metadata/service/permission-checker.ts`, `AM/MemoryCore/src/metadata/router/agent-task-visibility.test.ts` | Signe que le modèle de permissions est encore en stabilisation |
| Mots de passe | scrypt + sel + pepper | `AM/MemoryCore/src/metadata/utils/crypto.ts` | Correct |
| Agent LLM des scènes | L'agent d'extraction L2 opère dans `scene_blocks/` uniquement | `AM/MemoryCore/src/core/scene/scene-extractor.ts:7-9` | Bonne pratique |
| Dépendance vulnérable | `xlsx` **0.18.5** depuis npm (versions npm non maintenues par SheetJS ; CVE-2023-30533 prototype pollution et CVE-2024-22363 ReDoS corrigées seulement sur le CDN SheetJS). WeKnora, lui, utilise `xlsx-0.20.2` depuis le CDN | `AM/MemoryPanel/web/package.json` vs `WK/frontend/package.json` | Moyen |
| Tests de sécurité | Aucun publié | — | Élevé pour un usage multi-client |

**Conclusion sécurité** : seul WeKnora offre aujourd'hui un socle multi-client défendable (tenant, RBAC, audit, SSO). Les composants Agent Memory réutilisés doivent être placés **derrière** l'authentification WeKnora, sur un réseau interne, avec une identité propagée et vérifiée côté serveur (jamais lue depuis le corps de la requête).

## 2. Licences

### Licences des dépôts
| Dépôt | Licence | Preuve |
|---|---|---|
| WeKnora | MIT (Tencent) « sauf composants tiers listés » | `WK/LICENSE`, `WK/THIRD_PARTY_NOTICES.md`, `WK/licenses/` |
| Agent Memory | MIT (Tencent) | `AM/LICENSE` |
| Sous-modules | Aucun `.gitmodules` dans les deux dépôts. AM référence un **sous-module privé** `src/integrations/` non publié | `AM/MemoryCore/src/core/state/index.ts:60`, `AM/MemoryCore/src/gateway/server.ts:1913` |
| Code vendorisé | `WK/third_party/anydoc-go` : MIT (Sideguide Technologies) | `WK/third_party/anydoc-go/LICENSE`, `Cargo.toml` |

### Composants à surveiller (ordre de criticité)

| Composant | Où | Licence | Impact commercial | Action |
|---|---|---|---|---|
| `tea-component` | AM MemoryPanel (UI) | **`UNLICENSED`** sur npm (registre consulté le 29/10/2026) | **Bloquant** : aucun droit de redistribution accordé | Ne pas réutiliser l'UI AM ; réécrire les écrans utiles en Vue/TDesign |
| `src/integrations/*` | AM (Redis, COS, observabilité, quotas) | Privé, absent | Fonctions non disponibles | Réimplémenter si nécessaire (WK les a déjà : Redis/asynq, stockage objet, OTel) |
| `ebooklib` | WK docreader (`docreader/parser/epub_parser.py:16`) | **AGPL-3.0+** (PyPI) | Copyleft réseau sur le service docreader | Supprimer la dépendance et utiliser le repli ZIP déjà présent (`epub_parser.py:70`) ou un parseur permissif |
| ParadeDB `pg_search` | WK base Postgres par défaut, requis pour la recherche mots-clés Postgres (`retriever/postgres/repository.go:57`) | AGPL-3.0 (extension ParadeDB) | Utilisé comme serveur séparé non modifié : risque généralement jugé faible, **à valider juridiquement** ; modification = obligation de publication | Option : Postgres + pgvector sans pg_search, avec recherche lexicale via OpenSearch/Elasticsearch (pilotes déjà présents) |
| MinIO (`pgsty/minio`) | WK compose (profil `minio`) | AGPL-3.0 | Service séparé ; idem | Préférer S3/COS/OSS ou un S3 compatible permissif |
| SearXNG | WK compose (profil `searxng`) | AGPL-3.0 | Service séparé | Optionnel ; fournisseurs de recherche web alternatifs déjà supportés |
| Neo4j Community | WK compose (profil `neo4j`) | GPL-3.0 (serveur), driver Go Apache-2.0 | Service séparé | Optionnel ; projection Postgres disponible |
| MongoDB Atlas Local | AM compose Mongo | Conditions MongoDB (SSPL pour le serveur) | Service séparé ; backend expérimental | Ne pas retenir |
| `go-sql-driver/mysql`, `go-m1cpu` | WK Go | MPL-2.0 (copyleft au niveau fichier) | Compatible si fichiers non modifiés + sources fournies ; WK fournit le bundle | Conserver `THIRD_PARTY_NOTICES.md` et `licenses/` |
| `embeddinggemma-300m` | AM embeddings locaux | Gemma Terms of Use (non OSI) | Conditions d'usage du modèle à accepter | Préférer un modèle d'embedding sous licence permissive via le Model Gateway WK |
| `@colbymchenry/codegraph` (+ binaires plateforme) | AM Knowledge | MIT (npm, y compris `-linux-x64`) | OK ; binaires précompilés tiers | Vérifier la provenance des binaires et figer la version |
| Tencent Cloud VectorDB, COS, TokenHub | Les deux | Services cloud propriétaires | Dépendance fournisseur, pas de redistribution | Optionnels |
| Licences des modèles RapidOCR | WK docreader | Voir `WK/licenses/rapidocr-MODEL_LICENSES.md` | À relire | Conserver les notices |

Les autres dépendances directes vérifiées sont permissives (MIT, Apache-2.0, BSD, ISC) : Gin, GORM, asynq, pgx, mcp-go, TDesign, Vue, Hono, AI SDK, drizzle, sqlite-vec (MIT/Apache), node-llama-cpp, officeparser, graphology, minisearch, jieba, markitdown, opendataloader-pdf (Apache-2.0), trafilatura (Apache-2.0), pypdfium2.

### Obligations pour un produit dérivé Global-IT-SS
1. Conserver les deux mentions de copyright Tencent MIT et les notices tierces (`WK/THIRD_PARTY_NOTICES.md`, `WK/licenses/`).
2. Produire un SBOM (Go, npm, Python) à chaque release et un contrôle de licences automatisé dans la CI (refus de `UNLICENSED`, `AGPL`, `SSPL`, `GPL` hors services séparés validés).
3. Retirer `ebooklib` et ne pas embarquer `tea-component`.
4. Faire valider par un juriste l'usage de ParadeDB, MinIO, SearXNG et Neo4j en mode SaaS ou on-premise distribué.
