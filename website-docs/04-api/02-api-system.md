# Référence API : système et administration plateforme

Fournit les informations système au niveau déploiement et les interfaces d’administration plateforme : paramètres globaux, files de tâches, clés API plateforme, audit inter-espaces et réinitialisation de mot de passe utilisateur. Voir [Administration plateforme et administrateur système](../03-features/20-platform-admin.md).

Tout le groupe `/system/admin/*` est protégé par le garde `SystemAdmin()` ; les clés API plateforme sont découpées par capacité (`system_settings_read/manage`, `system_runtime_read/manage`, `system_tenants_read/manage`, `system_audit_read`).

## Informations système (`/api/v1/system`)

Handler : `internal/handler/system.go`. Clé API : `manage_vector_stores`/full-access. Les réponses de ce groupe utilisent l’enveloppe `{"code":0,"msg":"success","data":...}`.

### GET /api/v1/system/capabilities

Permissions : Viewer+ ; clé API en lecture. Renvoie `{code:0,data:{edition,capabilities}}`, chaque capability avec supported/reason. Le frontend pilote les entrées de menu selon l’édition déployée, les routes réellement enregistrées et les options Docker ; masquer un menu ne remplace pas le contrôle d’accès backend.

```bash
curl "$BASE/api/v1/system/capabilities" -H "Authorization: Bearer $TOKEN"
```

Dans `capabilities`, `settings.sandbox.host` indique si le déploiement peut utiliser le sandbox OS local ; aujourd’hui, seule l’application bureau native macOS peut être `supported`.

### POST /api/v1/system/host-project-dir

Rôle : Ouvrir sur la machine hébergeant WeKnora le sélecteur de dossier système, pour lier un répertoire de projet local à une nouvelle session (depuis v0.8.2, application bureau native uniquement). Permissions : Viewer+, JWT uniquement ; toute clé API est refusée. Sans corps.

Réponse : 200 `{"code":0,"msg":"success","data":{"dir":"/Users/me/project"}}` ; si l’utilisateur annule, `dir` est une chaîne vide ; déploiement non bureau → 404.

### GET /api/v1/system/info

Rôle : Version système et moteurs. Permissions : Viewer+.

Réponse : 200 `{"code":0,"msg":"success","data":{version,edition,commit_id,build_time,go_version,keyword_index_engine,vector_store_engine,graph_database_engine,minio_enabled,db_version,started_at,uptime_seconds}}`

```bash
curl $BASE/api/v1/system/info -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/system/parser-engines

Rôle : Liste des moteurs d’analyse et état de connexion DocReader. Permissions : Viewer+.

Réponse : 200 `{"code":0,"msg":"success","data":[...],"docreader_addr","docreader_transport","connected"}`

```bash
curl $BASE/api/v1/system/parser-engines -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/system/parser-engines/check

Rôle : Sonder un moteur d’analyse avec la configuration fournie (corps `types.ParserEngineConfig`). Permissions : Admin+.

Réponse : 200, même forme que ci-dessus.

```bash
curl -X POST $BASE/api/v1/system/parser-engines/check -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{}'
```

### POST /api/v1/system/docreader/reconnect

Rôle : Reconnecter DocReader. Permissions : Admin+. Corps : `{"addr":"host:port"}` (`binding:"required"`).

Réponse : 200 `{"code":0,"msg":"…",...,"connected":true}` (message de succès côté serveur)

```bash
curl -X POST $BASE/api/v1/system/docreader/reconnect -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"addr":"docreader:50051"}'
```

### GET /api/v1/system/storage-engine-status

Rôle : Disponibilité du moteur de stockage objet. Permissions : Viewer+.

Réponse : 200 `{"code":0,"msg":"success","data":{"engines":[{name,allowed,available,description}],"allowed_providers":[...],"minio_env_available":bool}}`

```bash
curl $BASE/api/v1/system/storage-engine-status -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/system/storage-engine-check

Rôle : Valider une configuration de stockage (sondage après protection SSRF). Permissions : Admin+. Corps : `provider` (obligatoire, `minio/cos/tos/s3/oss/ks3/obs`) + objet de config `minio|cos|tos|s3|oss|ks3|obs` correspondant.

Réponse : 200 `{"code":0,"data":{"ok","message","bucket_created"}}`

```bash
curl -X POST $BASE/api/v1/system/storage-engine-check -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"provider":"minio","minio":{"endpoint":"minio:9000"}}'
```

## Administration système (`/api/v1/system/admin`, réservé SystemAdmin)

Garde de groupe `SystemAdmin()` (toujours appliqué, indépendamment de EnableRBAC) ; clé API plateforme avec capacité `system_*` correspondante. Beaucoup d’interfaces de lecture renvoient des lignes/tableaux bruts (sans enveloppe). Handler : `internal/handler/system.go`, `internal/handler/audit_log.go`.

### POST /api/v1/system/admin/promote

Rôle : Accorder SystemAdmin. Corps : `user_id` (UUID, prioritaire) ou `email` (l’un des deux).

Réponse : 200 `UserInfo` (objet brut).

```bash
curl -X POST $BASE/api/v1/system/admin/promote -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"email":"admin@ex.com"}'
```

### POST /api/v1/system/admin/revoke

Rôle : Révoquer SystemAdmin. Corps : `{"user_id":"..."}` (`binding:"required"`).

Réponse : 200 `UserInfo`

```bash
curl -X POST $BASE/api/v1/system/admin/revoke -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"user_id":"u-1"}'
```

### GET /api/v1/system/admin/list

Rôle : Liste des SystemAdmin. Paramètres : `offset` (défaut 0), `limit` (défaut 50, plafond 200).

Réponse : 200 `{"total":N,"admins":[UserInfo]}`

```bash
curl $BASE/api/v1/system/admin/list -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/system/admin/users/create

Réservé aux administrateurs système ; cette interface n’est pas ouverte aux clés API plateforme. Champs : username (2–50 caractères), email (valide), password (optionnel ou null pour génération auto). Une chaîne vide explicite passe quand même la politique de mot de passe ; ce n’est pas une génération auto.

| Statut HTTP | Réponse et signification |
| --- | --- |
| 201 | `{user:UserInfo,generated_password?}` — création ; le mot de passe n’est renvoyé qu’en génération auto |
| 200 | `{user:UserInfo}` — identité existante, compte/mot de passe inchangés |
| 400 | Paramètres ou politique de mot de passe non respectés |
| 409 | E-mail et nom d’utilisateur pointent vers des identités différentes |

Réponse brute, sans enveloppe success/data ni champ idempotent. Distinguer création vs compte existant via le statut HTTP. L’attribution d’espace suit `auth.default_tenant_mode`.

```bash
curl -i -X POST "$BASE/api/v1/system/admin/users/create" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"username":"alice","email":"alice@example.com"}'
```

### POST /api/v1/system/admin/users/reset-password

Rôle : Réinitialiser le mot de passe utilisateur. Corps : `email` (`binding:"required,email"`), `new_password` (`binding:"required"`).

Réponse : 200 `{"message":"Password reset successfully"}`

```bash
curl -X POST $BASE/api/v1/system/admin/users/reset-password -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"email":"a@ex.com","new_password":"newpass1"}'
```

### GET /api/v1/system/admin/api-keys

Rôle : Liste des clés API plateforme (masquées).

Réponse : 200 `{"success":true,"data":[{id,name,api_key,capabilities,expires_at_unix,...}]}`

```bash
curl $BASE/api/v1/system/admin/api-keys -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/system/admin/api-keys

Rôle : Créer une clé API plateforme (plaintext renvoyé une seule fois). Corps : `name` (non vide), `capabilities` (liste `system_*`, obligatoire), `expires_at_unix` (optionnel, doit être dans le futur).

Réponse : 201 `{"success":true,"data":{...,"api_key":"<plaintext>","token":"<plaintext>"}}`

```bash
curl -X POST $BASE/api/v1/system/admin/api-keys -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"ops","capabilities":["system_tenants_read"]}'
```

### DELETE /api/v1/system/admin/api-keys/:key_id

Rôle : Supprimer une clé API plateforme.

Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/system/admin/api-keys/3 -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/system/admin/settings et GET /api/v1/system/admin/settings/:key

Rôle : Liste / entrée unique des paramètres runtime plateforme (clé plateforme : `system_settings_read|manage`).

Réponse : 200 `[SystemSetting]` / `SystemSetting` (brut, sans enveloppe ; champs : `key,value,value_type,description,last_modified_by,last_modified_at`).

```bash
curl $BASE/api/v1/system/admin/settings -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/system/admin/settings/:key

Rôle : Mettre à jour un paramètre (clé plateforme : `system_settings_manage`). Corps : `{"value":<JSON quelconque, validé selon le registre>}` (obligatoire).

Réponse : 200 `SystemSetting`

```bash
curl -X PUT $BASE/api/v1/system/admin/settings/default_storage_quota -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"value":10737418240}'
```

### DELETE /api/v1/system/admin/settings/:key

Rôle : Restaurer la valeur par défaut du paramètre.

Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/system/admin/settings/default_storage_quota -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/system/admin/runtime/queues

Rôle : Profondeur des files asynq et état de concurrence (mode Lite → `available:false` ; clé plateforme : `system_runtime_read|manage`).

Réponse : 200 `{"available",upstream_concurrency,parse_concurrency,wiki_concurrency,pools,queues,model_limiter_available,models,timestamp}`

```bash
curl $BASE/api/v1/system/admin/runtime/queues -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/system/admin/runtime/queues/:queue/tasks

Rôle : Liste des tâches d’une file. Paramètres : `state` (`pending/active/scheduled/retry/archived/completed`), `cursor`, `page_size` (défaut 20, plafond 100).

Réponse : 200 `{"available","tasks":[RuntimeTaskInfo],"page_size","has_more","next_cursor"}`

```bash
curl "$BASE/api/v1/system/admin/runtime/queues/default/tasks?state=pending" -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/system/admin/runtime/queues/:queue/tasks/:task_id/actions/:action

Rôle : Action sur une tâche (`action` ∈ `cancel/run_now/delete` ; clé plateforme : `system_runtime_manage`).

Réponse : 200 `{"success":true}`

```bash
curl -X POST $BASE/api/v1/system/admin/runtime/queues/default/tasks/t-1/actions/cancel \
  -H "Authorization: Bearer $TOKEN"
```

### DELETE /api/v1/system/admin/runtime/queues/:queue/archived

Rôle : Vider les tâches archivées.

Réponse : 200 `{"success":true,"deleted":N}`

```bash
curl -X DELETE $BASE/api/v1/system/admin/runtime/queues/default/archived -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/system/admin/tenants/apply-default-storage-quota

Rôle : Appliquer le quota de stockage par défaut courant à tous les espaces (clé plateforme : `system_tenants_manage`). Sans corps.

Réponse : 200 `{"affected":N,"quota_bytes":N,"quota_gb":N}`

```bash
curl -X POST $BASE/api/v1/system/admin/tenants/apply-default-storage-quota -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/system/admin/audit-log

Rôle : Journal d’audit plateforme (lignes tenant_id=0 ; clé plateforme : `system_audit_read`). Paramètres de requête identiques à l’audit espace (`after_id/limit/action/outcome/actor`). Handler : `internal/handler/audit_log.go`

Réponse : 200 `{"success":true,"data":[AuditLog],"next_cursor":N}`

```bash
curl $BASE/api/v1/system/admin/audit-log -H "Authorization: Bearer $TOKEN"
```

## Référence d’implémentation

Enregistrement des routes : `RegisterSystemAdminRoutes` et `RegisterSystemRoutes` dans `internal/router/routes_auth_tenant.go`. Handler : `internal/handler/system.go`, `internal/handler/audit_log.go`.

## Gestion des utilisateurs plateforme

Les interfaces ci-dessous ne sont accessibles qu’à une session utilisateur administrateur système ; les clés API ne sont pas autorisées.

### GET /api/v1/system/admin/users

Liste paginée de tous les utilisateurs du déploiement. Paramètre `offset` défaut 0 ; `limit` défaut 50, max 200. Réponse brute `{"users":[UserInfo],"offset":0,"limit":50,"has_more":false}` ; pas de mot de passe ni hash.

### POST /api/v1/system/admin/users/status

Corps `{"user_id":"ID utilisateur cible","is_active":false}`, les deux champs obligatoires. La désactivation révoque les sessions existantes de l’utilisateur cible ; impossible de se désactiver soi-même ou le dernier administrateur système actif (400) ; utilisateur absent → 404. Succès : `{"message":"User status updated","user":UserInfo,"is_active":false}`. Création de compte et reset mot de passe : `/users/create` et `/users/reset-password` ci-dessus.

## Catalogue de modèles (`/api/v1/system/admin/model-catalog`)

Session administrateur système uniquement ; ce groupe n’est pas ouvert aux clés API.

| Méthode et chemin | Rôle |
| --- | --- |
| `GET /system/admin/model-catalog` | Renvoie `version`, `baseline`, `overlay` admin, les 20 dernières versions historiques, et les catalogues `builtin` / `deployment` / `effective` |
| `POST /system/admin/model-catalog/preview` | Valide le document de surcharge et renvoie le catalogue candidat (seulement `effective` et `overlay` normalisé ; `history` / `builtin` / `deployment` à `null`), sans persistance ni publication |
| `PUT /system/admin/model-catalog` | Valide, enregistre une nouvelle version et publie ; l’audit ne retient que les métadonnées de version |

Preview et publication partagent le même corps :

```json
{
  "version": 0,
  "baseline": "identifiant de baseline déploiement renvoyé par GET",
  "overlay": {
    "providers": {
      "openai": {
        "models": [{"id": "gpt-5", "context_window": 128000}]
      }
    }
  }
}
```

Réponse : objet d’état du catalogue non enveloppé. Chaque entrée fournisseur inclut en plus `model_thinking_levels` (niveaux disponibles après activation de la réflexion, par id de modèle de dialogue, fusion mappage fournisseur et capacités protocole) et `vendor_thinking_levels` (niveaux par défaut fournisseur pour les modèles sans niveau dédié). Document invalide → 400 ; version obsolète ou baseline déploiement de l’instance incohérente → 409. La publication persiste d’abord puis bascule sur cette instance ; les autres instances se synchronisent en ~5 s. Rollback : republier un `overlay` historique avec `version` / `baseline` courants. Règles complètes : [Gestion des modèles](../03-features/06-models.md#ladministrateur-systeme-entretient-le-repertoire-des-modeles).
