# Référence API : infrastructure et sources de données

Enregistrement et gestion des magasins vectoriels, backends de stockage, services de recherche Web et connecteurs de sources ; tests de connexion et synchronisation.

Convention : lecture Viewer+, écriture / tests de connexion Admin+ (les tests interrogent les systèmes externes). Capabilities clé API : magasins vectoriels `manage_vector_stores`, backends `manage_storage_backends`, recherche Web `manage_web_search`, sources `manage_datasources` (full-access possible).

## Magasins vectoriels (`/api/v1/vector-stores`)

### GET /api/v1/vector-stores/types

Rôle : Types de moteur disponibles et schéma de configuration. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":[définitions de types]}`

```bash
curl $BASE/api/v1/vector-stores/types -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/vector-stores/test

Rôle : Tester la connexion avec une config brute (sans persistance). Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `engine_type` | string | oui (`binding:"required"`) | Type de moteur |
| `connection_config` | object | oui (`binding:"required"`) | Config connexion |

Réponse : 200 `{"success":true|false,"version":"...","error":"..."}`

```bash
curl -X POST $BASE/api/v1/vector-stores/test -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"engine_type":"qdrant","connection_config":{"addr":"qdrant:6334"}}'
```

### POST /api/v1/vector-stores

Rôle : Créer une configuration de magasin vectoriel. Permissions : Admin+.Champs : `name` (obligatoire), `engine_type` (obligatoire), `connection_config` (obligatoire), `index_config` (optionnel).

Réponse : 201 `{"success":true,"data":{VectorStoreResponse}}`（`id,tenant_id,name,engine_type,connection_config,index_config,...`）

```bash
curl -X POST $BASE/api/v1/vector-stores -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"qdrant-main","engine_type":"qdrant","connection_config":{"addr":"qdrant:6334"}}'
```

### GET /api/v1/vector-stores

Rôle : Lister les magasins (`__env_*` injectés par variables d’environnement en tête). Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":[VectorStoreResponse]}`

```bash
curl $BASE/api/v1/vector-stores -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/vector-stores/:id

Rôle : Détail d’un magasin (ID `__env_*` accepté). Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{VectorStoreResponse}}`

```bash
curl $BASE/api/v1/vector-stores/vs-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/vector-stores/:id

Rôle : Mettre à jour (renommage seul ; magasins env non modifiables). Permissions : Admin+. Corps : `{"name":"..."}` (`binding:"required"`).

Réponse : 200 `{"success":true,"data":{VectorStoreResponse}}`

```bash
curl -X PUT $BASE/api/v1/vector-stores/vs-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"qdrant-prod"}'
```

### DELETE /api/v1/vector-stores/:id

Rôle : Supprimer (magasins env non supprimables). Permissions : Admin+.

Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/vector-stores/vs-1 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/vector-stores/:id/test

Rôle : Tester un magasin enregistré ou env. Permissions : Admin+.

Réponse : 200 `{"success":true|false,"version","error"}`

```bash
curl -X POST $BASE/api/v1/vector-stores/vs-1/test -H "Authorization: Bearer $TOKEN"
```

## Backends de stockage (`/api/v1/storage-backends`)

Corps de requête (Create/Update/TestRaw partagent `storageBackendRequest`) :

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui (`binding:"required"`) | Nom |
| `provider` | string | oui (`binding:"required"`) | Fournisseur : `local`/`minio`/`cos`/`tos`/`s3`/`oss`/`ks3`/`obs`, filtré par `STORAGE_ALLOW_LIST` |
| `config` | object | non | Config du fournisseur ; champs : voir [Backends de stockage](../03-features/19-storage-backends.md#parametres-connexion) (credentials masqués en réponse) |
| `status` | string | non | `active` (défaut) / `disabled` |

### GET /api/v1/storage-backends/types

Rôle : Liste des noms de fournisseurs autorisés par `STORAGE_ALLOW_LIST` (tous si non défini). Permissions : Viewer+. Réponse : 200 `{"success":true,"data":["local","minio",...]}`

```bash
curl $BASE/api/v1/storage-backends/types -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/storage-backends/test

Rôle : Test de connexion avec config brute. Permissions : Admin+.Réponse : 200 `{"success":bool,"error"}`

```bash
curl -X POST $BASE/api/v1/storage-backends/test -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"t","provider":"minio","config":{"endpoint":"minio:9000"}}'
```

### POST /api/v1/storage-backends

Rôle : Créer un backend de stockage. Permissions : Admin+.Réponse : 201 `{"success":true,"data":{StorageBackend}}`

```bash
curl -X POST $BASE/api/v1/storage-backends -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"minio-main","provider":"minio","config":{"endpoint":"minio:9000"}}'
```

### GET /api/v1/storage-backends

Rôle : Lister (inclut `default_storage_backend_id`). Permissions : Viewer+.Réponse : 200 `{"success":true,"data":[...],"default_storage_backend_id":"..."}`

```bash
curl $BASE/api/v1/storage-backends -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/storage-backends/:id

Rôle : Détail (credentials masqués). Permissions : Viewer+.Réponse : 200 `{"success":true,"data":{StorageBackend}}`

```bash
curl $BASE/api/v1/storage-backends/sb-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/storage-backends/:id

Rôle : Mettre à jour.Permissions : Admin+.Réponse : 200 `{"success":true,"data":{StorageBackend}}`

```bash
curl -X PUT $BASE/api/v1/storage-backends/sb-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"minio-prod","provider":"minio"}'
```

### DELETE /api/v1/storage-backends/:id

Rôle : Supprimer.Permissions : Admin+.Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/storage-backends/sb-1 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/storage-backends/:id/test

Rôle : Tester un backend enregistré. Permissions : Admin+.Réponse : 200 `{"success":bool,"error"}`

```bash
curl -X POST $BASE/api/v1/storage-backends/sb-1/test -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/storage-backends/:id/default

Rôle : Définir comme backend par défaut. Permissions : Admin+.Réponse : 200 `{"success":true}`

```bash
curl -X PUT $BASE/api/v1/storage-backends/sb-1/default -H "Authorization: Bearer $TOKEN"
```

## Recherche Web (`/api/v1/web-search` et `/api/v1/web-search-providers`)

Quatorze fournisseurs de recherche sont enregistrés (Metaso, Exa, Bocha, Brave, Serply, etc.). Clés API et `extra_config` : voir [Recherche Web](../03-features/11-web-search.md).

### GET /api/v1/web-search/providers

Rôle : Catalogue des fournisseurs intégrés (lecture seule). Permissions : Viewer+, JWT uniquement (pas de politique clé API déclarée).Handler : `internal/handler/web_search.go`

Réponse : 200 `{"success":true,"data":[...]}`

```bash
curl $BASE/api/v1/web-search/providers -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/web-search-providers/types

Rôle : Types de fournisseur et schéma des paramètres. Permissions : Viewer+.Handler : `internal/handler/web_search_provider.go`

Réponse : 200 `{"success":true,"data":[...]}`

```bash
curl $BASE/api/v1/web-search-providers/types -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/web-search-providers/test

Rôle : Tester des credentials bruts (sans persistance). Permissions : Admin+. Corps : `provider` (`binding:"required"`), `parameters` (optionnel).

Réponse : 200 `{"success":bool,"error"}`

```bash
curl -X POST $BASE/api/v1/web-search-providers/test -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"provider":"tavily","parameters":{"api_key":"tvly-..."}}'
```

### POST /api/v1/web-search-providers

Rôle : Créer une configuration de fournisseur. Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui (`binding:"required"`) | Nom |
| `provider` | string | oui (`binding:"required"`) | Type (bing/tavily/google…) |
| `description` | string | non | Description |
| `parameters` | object | non | Paramètres (clé API de préférence via la sous-ressource credentials) |
| `is_default` | bool | non | Fournisseur par défaut |

Réponse : 201 `{"success":true,"data":{WebSearchProviderResponse}}`

```bash
curl -X POST $BASE/api/v1/web-search-providers -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"tavily-main","provider":"tavily"}'
```

### GET /api/v1/web-search-providers

Rôle : Lister les fournisseurs. Permissions : Viewer+.Réponse : 200 `{"success":true,"data":[...]}`

```bash
curl $BASE/api/v1/web-search-providers -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/web-search-providers/:id

Rôle : Détail.Permissions : Viewer+.Réponse : 200 `{"success":true,"data":{...}}`

```bash
curl $BASE/api/v1/web-search-providers/wsp-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/web-search-providers/:id

Rôle : Mettre à jour (champs vides conservés ; clé API préservée). Permissions : Admin+. Corps : `name` / `description` / `parameters` / `is_default` (tous optionnels).

Réponse : 200 `{"success":true,"data":{...}}`

```bash
curl -X PUT $BASE/api/v1/web-search-providers/wsp-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"is_default":true}'
```

### DELETE /api/v1/web-search-providers/:id

Rôle : Supprimer.Permissions : Admin+.Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/web-search-providers/wsp-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/web-search-providers/:id/credentials

Rôle : Définir la clé API (`{"api_key":"..."}` ; si omise, retourne l’état). Permissions : Admin+. Handler : `internal/handler/web_search_provider_credentials.go`

Réponse : 200 `{"success":true,"data":{"fields":{"api_key":{"configured":bool}}}}`

```bash
curl -X PUT $BASE/api/v1/web-search-providers/wsp-1/credentials -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"api_key":"tvly-..."}'
```

### DELETE /api/v1/web-search-providers/:id/credentials/:field

Rôle : Supprimer un champ de credentials（`field` = `api_key` uniquement）. Permissions : Admin+.Réponse : 204。

```bash
curl -X DELETE $BASE/api/v1/web-search-providers/wsp-1/credentials/api_key -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/web-search-providers/:id/test

Rôle : Tester un fournisseur enregistré. Permissions : Admin+.Réponse : 200 `{"success":bool,"error"}`

```bash
curl -X POST $BASE/api/v1/web-search-providers/wsp-1/test -H "Authorization: Bearer $TOKEN"
```

## Sources de données (`/api/v1/datasource`)

Connecteurs de contenu externe (Feishu, Notion, Yuque, etc.) ; la synchronisation écrit dans la base de connaissances. Handler : `internal/handler/datasource.go`. La plupart des réponses sont des objets/tableaux bruts (sans enveloppe `success`).

Types enregistrés : feishu, lark, feishu_drive, lark_drive, notion, confluence, yuque, dingtalk, ima, rss, gitlab. Credentials, sélection de ressources et limites : voir [Import de sources](../03-features/10-datasource.md). Avec `sync_deletions`, les connaissances supprimées côté source sont réellement effacées ; `source_created_at` / `source_updated_at` sont stockés dans les métadonnées.

### GET /api/v1/datasource/types

Rôle : Catalogue des connecteurs disponibles. Permissions : Viewer+.

Réponse : 200 `[{type,name,description,icon,priority,auth_type,capabilities}]`

```bash
curl $BASE/api/v1/datasource/types -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/datasource/validate-credentials

Rôle : Valider des credentials bruts (bouton « Tester la connexion », sans persistance). Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `type` | string | oui (`binding:"required"`) | Type de connecteur |
| `credentials` | map | oui (`binding:"required"`) | Credentials |

Réponse : 200 `{"status":"connected"}` ; échec 400 `{"error":"..."}`

```bash
curl -X POST $BASE/api/v1/datasource/validate-credentials -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"type":"notion","credentials":{"api_key":"ntn_xxx"}}'
```

### POST /api/v1/datasource

Rôle : Créer une source de données. Permissions : Admin+. Corps (`types.DataSource`) :

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `knowledge_base_id` | string | oui | Base cible (doit appartenir à l’espace) |
| `name` | string | oui | Nom |
| `type` | string | oui | Type de connecteur |
| `config` | object | oui | Credentials (chiffrés) + sélection de ressources + réglages |
| `sync_schedule` | string | non | Expression cron |
| `sync_mode` | string | non | `incremental` (défaut) / `full` |
| `conflict_strategy` | string | non | `overwrite` (défaut) / `skip` |
| `sync_deletions` | bool | non | true par défaut |
| `sync_log_retention_days` | int | non | Rétention des journaux de sync pour cette source (défaut 30 jours ; valeur ≤ 0 → 30) |

Réponse : 201 `DataSourceResponse` (credentials retirés, voir `internal/handler/dto/datasource.go`).

Chaque nuit (fuseau du service), purge des journaux de sync expirés (`success`, `partial`, `canceled`), y compris sources en pause ou manuelles. La rétention part de l’heure de fin ; si absente sur d’anciens journaux, l’heure de début. Les journaux en cours ou en attente ne sont pas purgés ; les `failed` existants sont conservés tant qu’un retry est possible. Après suppression logique d’une source, la rétention reste la même et les `failed` peuvent être purgés ; sans source, 30 jours par défaut.

```bash
curl -X POST $BASE/api/v1/datasource -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"knowledge_base_id":"kb-1","name":"sync Notion","type":"notion","config":{}}'
```

### GET /api/v1/datasource

Rôle : Lister les sources de données. Permissions : Viewer+.Paramètre : `kb_id` (obligatoire).

Réponse : 200 `[DataSourceResponse]`

```bash
curl "$BASE/api/v1/datasource?kb_id=kb-1" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/datasource/:id

Rôle : Détail.Permissions : Viewer+.Réponse : 200 `DataSourceResponse`；404 `{"error":"data source not found"}`

```bash
curl $BASE/api/v1/datasource/ds-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/datasource/:id

Rôle : Mettre à jour (`id` / `tenant_id` / `knowledge_base_id` verrouillés). Permissions : Admin+. Corps identique à la création.

PUT remplace toute la configuration (pas de PATCH partiel) : GET le détail, modifiez, renvoyez l’objet complet (`name`, `type`, `config`, `sync_schedule`, `sync_mode`, `conflict_strategy`, `sync_deletions`, `sync_log_retention_days`, `status`, etc.). `sync_schedule` et `sync_deletions` suivent toujours le corps : omettre `sync_schedule` → chaîne vide (sync manuelle, cron supprimé) ; omettre `sync_deletions` → false ; pour les autres champs omis, la conservation de l’ancienne valeur n’est pas garantie. Les credentials ne passent pas par cette route : `config.credentials` est ignoré et les credentials stockés sont conservés.

Réponse : 200 `DataSourceResponse`

```bash
curl -X PUT $BASE/api/v1/datasource/ds-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"sync Notion v2","type":"notion","knowledge_base_id":"kb-1",
       "config":{"type":"notion","resource_ids":["page-1"]},
       "sync_schedule":"0 0 */6 * * *","sync_mode":"incremental","conflict_strategy":"overwrite",
       "sync_deletions":true,"sync_log_retention_days":30,"status":"active"}'
```

### DELETE /api/v1/datasource/:id

Rôle : Supprimer.Permissions : Admin+.Réponse : 204。

```bash
curl -X DELETE $BASE/api/v1/datasource/ds-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/datasource/:id/credentials

Rôle : Remplacer entièrement les credentials (map atomique du champ logique unique `credentials`). Permissions : Admin+. Corps : `{"credentials":{...}}` (map non vide obligatoire). Handler : `internal/handler/datasource_credentials.go`

Réponse : 200 `{"success":true,"data":{"fields":{"credentials":{"configured":bool}}}}`

```bash
curl -X PUT $BASE/api/v1/datasource/ds-1/credentials -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"credentials":{"api_key":"ntn_xxx"}}'
```

### DELETE /api/v1/datasource/:id/credentials/:field

Rôle : Effacer les credentials（`field` doit être `credentials`）. Permissions : Admin+.Réponse : 204。

```bash
curl -X DELETE $BASE/api/v1/datasource/ds-1/credentials/credentials -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/datasource/:id/validate

Rôle : Valider la connexion d’une source enregistrée. Permissions : Admin+.Réponse : 200 `{"status":"connected"}`

```bash
curl -X POST $BASE/api/v1/datasource/ds-1/validate -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/datasource/:id/resources

Rôle : Parcourir l’arborescence de ressources externes (lazy load). Permissions : Admin+.Paramètre : `parent_id` (optionnel, vide = racine).

Réponse : 200 `[{external_id,name,type,description,url,modified_at,parent_id,has_children,metadata}]`

```bash
curl "$BASE/api/v1/datasource/ds-1/resources?parent_id=" -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/datasource/:id/resource-ancestors

Rôle : Résoudre la chaîne d’ancêtres (dépliage du sélecteur). Permissions : Admin+. Corps : `{"resource_ids":["..."]}` (obligatoire).

Réponse : 200 `{"ancestors":[...]}`

```bash
curl -X POST $BASE/api/v1/datasource/ds-1/resource-ancestors -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"resource_ids":["page-1"]}'
```

### POST /api/v1/datasource/:id/sync

Rôle : Déclencher une synchronisation manuelle. Permissions : Admin+.Réponse : 200 `SyncLog`（`id,status,started_at,items_total,items_created,items_updated,items_deleted,items_failed,...`）

```bash
curl -X POST $BASE/api/v1/datasource/ds-1/sync -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/datasource/:id/pause et POST /api/v1/datasource/:id/resume

Rôle : Suspendre / reprendre la synchronisation planifiée. Permissions : Admin+.

Réponse : 200 `{"status":"paused"}` / `{"status":"active"}`

```bash
curl -X POST $BASE/api/v1/datasource/ds-1/pause -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/datasource/:id/logs

Rôle : Lister les journaux de synchronisation. Permissions : Viewer+.Paramètres : `limit` (défaut 10, max 100), `offset` (défaut 0).

Réponse : 200 `[SyncLog]`

```bash
curl "$BASE/api/v1/datasource/ds-1/logs?limit=10" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/datasource/logs/:log_id

Rôle : Détail d’un journal de synchronisation. Permissions : Viewer+.Réponse : 200 `SyncLog`；404 `{"error":"sync log not found"}`

```bash
curl $BASE/api/v1/datasource/logs/log-1 -H "Authorization: Bearer $TOKEN"
```

## Référence d’implémentation

Enregistrement des routes : `RegisterVectorStoreRoutes`, `RegisterStorageBackendRoutes`, `RegisterWebSearchRoutes`, `RegisterWebSearchProviderRoutes`, `RegisterDataSourceRoutes` dans `internal/router/routes_infra.go`. Handlers : `internal/handler/vectorstore.go`, `internal/handler/storagebackend.go`, `internal/handler/web_search.go`, `internal/handler/web_search_provider.go`, `internal/handler/web_search_provider_credentials.go`, `internal/handler/datasource.go`, `internal/handler/datasource_credentials.go`.
