# Référence API : locataire (espace) et membres

Gestion des espaces de travail, membres, invitations, clés API et journaux d’audit. Les opérations ciblent l’espace actif ; l’accès inter-espaces dépend des permissions de chaque interface.

Toutes les routes `/tenants/:id/*` utilisent `PathTenantMatch()` au niveau du groupe (`internal/middleware/access.go`) : `:id` dans l’URL doit correspondre à l’espace actif (sauf super-admin cross-espace), pour éviter les actions sur un espace tiers.

Champs `memory_config` et interfaces de mémoire personnelle : [API Mémoire à long terme](02-api-memory.md). À la mise à jour, l’administrateur envoie l’objet de configuration complet à conserver.

## Cycle de vie de l’espace

### POST /api/v1/tenants

Rôle : Créer un espace (ouverture autonome d’un nouvel espace de travail ; l’appelant devient automatiquement Owner). Permissions : tout utilisateur connecté (peut n’avoir aucun espace) ; clé API : uniquement clé plateforme avec `system_tenants_manage`. Handler : `internal/handler/tenant.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui (`binding:"required,min=1,max=128"`) | Nom de l’espace |
| `description` | string | non (`binding:"max=512"`) | Description |

Un super-admin cross-espace peut soumettre un `types.Tenant` complet (incluant `storage_quota`, `status`, etc.).

Réponse : 201 `{"success":true,"data":{Tenant}}` (peut inclure `api_key` si la configuration l’autorise). Création autonome désactivée → 403 (code 2005), dépassement de quota → 429.

```bash
curl -X POST $BASE/api/v1/tenants -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Mon espace"}'
```

### GET /api/v1/tenants

Rôle : Lister les espaces auxquels j’ai accès. Permissions : connecté ; clé API : `manage_tenant_settings` ou full-access. Handler : `internal/handler/tenant.go`

Réponse : 200 `{"success":true,"data":{"items":[TenantResponse]}}`

```bash
curl $BASE/api/v1/tenants -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/tenants/all

Rôle : Lister tous les espaces (super-admin cross-espace). Permissions : `CrossTenant()` (`CanAccessAllTenants` et cluster avec `EnableCrossTenantAccess`) ; clé plateforme : `system_tenants_read|manage`. Handler : `internal/handler/tenant.go`

Réponse : 200 `{"success":true,"data":{"items":[TenantResponse]}}`

```bash
curl $BASE/api/v1/tenants/all -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/tenants/search

Rôle : Rechercher des espaces par mot-clé (super-admin cross-espace). Permissions : idem. Handler : `internal/handler/tenant.go`

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `keyword` | string | non | Mot-clé |
| `tenant_id` | string | non | ID d’espace exact |
| `page` / `page_size` | int | non | Pagination (défaut 1/20, plafond 100) |

Réponse : 200 `{"success":true,"data":{"items":[...],"total","page","page_size"}}`

```bash
curl "$BASE/api/v1/tenants/search?keyword=demo&page=1" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/tenants/:id

Rôle : Détail d’un espace. Permissions : Viewer+ ; clé plateforme : `system_tenants_read|manage`. Handler : `internal/handler/tenant.go`

Réponse : 200 `{"success":true,"data":{TenantResponse}}`

```bash
curl $BASE/api/v1/tenants/1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/tenants/:id

Rôle : Mettre à jour la configuration de l’espace. Permissions : Owner ; clé plateforme : `system_tenants_manage`. Handler : `internal/handler/tenant.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | *string | non (`binding:"omitempty,min=1,max=128"`) | Nouveau nom |
| `description` | *string | non (`binding:"omitempty,max=512"`) | Nouvelle description |

Réponse : 200 `{"success":true,"data":{TenantResponse}}`

```bash
curl -X PUT $BASE/api/v1/tenants/1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Nouveau nom"}'
```

### DELETE /api/v1/tenants/:id

Rôle : Supprimer l’espace. Permissions : Owner ; clé plateforme : `system_tenants_manage`. L’enregistrement de l’espace et toutes les relations membres sont supprimés en soft delete ; les membres perdent l’accès immédiatement. Les données internes (bases de connaissances, modèles, etc.) ne sont pas effacées physiquement tout de suite ; les tâches Wiki en file pour un espace supprimé n’appellent plus le modèle. Handler : `internal/handler/tenant.go`

Réponse : 200 `{"success":true,"message":"Workspace deleted successfully"}`

```bash
curl -X DELETE $BASE/api/v1/tenants/1 -H "Authorization: Bearer $TOKEN"
```

## Configuration KV de l’espace

`:key` est une clé de configuration, pas un ID d’espace (l’espace vient du contexte d’authentification). Valeurs possibles : `web-search-config`, `prompt-templates`, `parser-engine-config`, `storage-engine-config`, `chat-history-config`, `retrieval-config`, `memory-config`, `assistant-config`, `default-settings`.

`assistant-config` regroupe les paramètres assistant WeKnora de l’espace : `display_name` (nom affiché dans l’interface, 24 caractères max, vide = nom par défaut) et `max_access_level` (niveau d’accès maximal choisissable par les membres : `read_only` lecture seule, `confirm` confirmation avant modification, `auto_write` modifications réversibles exécutées directement ; les suppressions restent soumises à confirmation ; défaut `confirm`). Les membres passent `assistant_access` dans les requêtes de dialogue ; le serveur tronque au plafond de l’espace.

`default-settings` est la configuration de modèles par défaut de l’espace ; champs et sémantique de remplacement : [ci-dessous](#default-settings). Le moteur de recherche Web par défaut reste déterminé par `is_default` du service de recherche (`PATCH /api/v1/web-search-providers/:id`).

### GET /api/v1/tenants/kv/:key

Rôle : Lire une configuration KV au niveau espace. Permissions : Viewer+ ; clé API : `manage_tenant_settings` ou full-access. Handler : `internal/handler/tenant.go`

Réponse : 200 `{"success":true,"data":{...objet de configuration correspondant...}}`

```bash
curl $BASE/api/v1/tenants/kv/retrieval-config -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/tenants/kv/:key

Rôle : Mettre à jour une configuration KV au niveau espace. Permissions : Admin+ ; clé API : `manage_tenant_settings` ou full-access. Corps : objet JSON de configuration correspondant à `:key`. Handler : `internal/handler/tenant.go`

Réponse : 200 `{"success":true,"message":"Configuration updated"}`

```bash
curl -X PUT $BASE/api/v1/tenants/kv/web-search-config -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"enabled":true}'
```

### Modèles par défaut de l’espace : GET / PUT /api/v1/tenants/kv/default-settings {#default-settings}

GET : Viewer+ ; PUT : Admin+ ; clé API : en plus `manage_tenant_settings` ou full-access. L’espace vient du contexte d’authentification. Entrée UI : [Paramètres → Paramètres par défaut](../03-features/06-models.md#workspace-defaults).

| Champ | Type | Exigence modèle |
| --- | --- | --- |
| `chat_model_id` | string | Modèle de dialogue `KnowledgeQA` |
| `utility_model_id` | string | `KnowledgeQA` pour tâches auxiliaires courtes ; vide = suit le défaut dialogue |
| `embedding_model_id` | string | Modèle vectoriel `Embedding` |
| `rerank_model_id` | string | Modèle de rerank `Rerank` |
| `vlm_model_id` | string | `VLLM`, ou `KnowledgeQA` avec capacité vision |
| `asr_model_id` | string | Modèle ASR `ASR` |

PUT **remplace l’objet entier** : soumettre les six champs ; un champ omis équivaut à chaîne vide. Les ID de modèle sont trimés ; tout nouvel ID non vide doit être disponible dans l’espace, activé et compatible, sinon 400. Les ID invalides déjà présents peuvent rester pour correction progressive ; vider un champ rétablit le repli par défaut.

Les modèles choisis explicitement par agent, base de connaissances ou tâche priment sur les défauts d’espace. Défaut d’espace absent ou invalide → repli sur le défaut de déploiement, puis premier modèle disponible ; `utility_model_id` vide ou invalide suit le défaut dialogue. Sur `GET /api/v1/models`, `default_for` indique l’usage désigné par l’espace (ex. `KnowledgeQA`, `VLLM`, `Utility`) ; `is_default` ne marque que le type natif du modèle et ne suffit pas pour les tâches auxiliaires ou la vision cross-type. Ceci ne remplace pas la config de déploiement ni les ID déjà enregistrés sur les ressources.

GET renvoie `{"success":true,"data":{...six champs...}}`, chaînes vides si non définis. L’exemple PUT ci-dessous efface les surcharges d’espace et rétablit le repli :

```bash
curl -X PUT "$BASE/api/v1/tenants/kv/default-settings" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"chat_model_id":"","utility_model_id":"","embedding_model_id":"","rerank_model_id":"","vlm_model_id":"","asr_model_id":""}'
```

PUT réussi : `{"success":true,"data":{...six champs enregistrés...},"message":"Default settings updated successfully"}`. Implémentation : `internal/handler/tenant_default_settings.go`, `internal/types/default_settings.go`.

## Clés API et principal API

### GET /api/v1/tenants/:id/api-keys

Rôle : Lister les clés API de l’espace (affichage masqué). Permissions : Owner, JWT uniquement (refus par défaut pour clé API). Handler : `internal/handler/tenant.go`

Réponse : 200 `{"success":true,"data":[{id,scope_type,name,api_key(masqué),full_access,knowledge_base_ids,capabilities,last_used_at,expires_at,created_at}]}`

```bash
curl $BASE/api/v1/tenants/1/api-keys -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/tenants/:id/api-keys

Rôle : Créer une clé API d’espace (plaintext une seule fois). Permissions : Owner, JWT uniquement. Handler : `internal/handler/tenant.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui | Nom de la clé |
| `full_access` | bool | non | Clé full-access espace (défaut false) |
| `knowledge_base_ids` | []string | non | Liste blanche KB (clé scoped) |
| `capabilities` | []string | non | Liste de capabilities (voir vue d’ensemble) |
| `expires_at_unix` | *int64 | non | Horodatage d’expiration |

Réponse : 201 `{"success":true,"data":{...,"api_key":"<plaintext>","token":"<plaintext>"}}`

```bash
curl -X POST $BASE/api/v1/tenants/1/api-keys -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"ingest-bot","capabilities":["ingest","retrieve"],"knowledge_base_ids":["kb-1"]}'
```

### PUT /api/v1/tenants/:id/api-keys/:key_id

Owner, JWT uniquement. Met à jour name, full_access, knowledge_base_ids, capabilities, expires_at_unix d’une clé existante ; les champs d’autorisation se soumettent en configuration complète (pas un PATCH partiel). `expires_at_unix` omis ou null efface l’expiration existante. Après changement de permissions, le même token reste valide ; les nouvelles autorisations s’appliquent à l’authentification suivante, sans renvoi du plaintext.

Retour 200 `{success,data:APIKeyResponse}`, clé masquée ; capability / périmètre KB invalide → 400, inexistant → 404.

```bash
curl -X PUT "$BASE/api/v1/tenants/1/api-keys/5" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"search-bot","full_access":false,"knowledge_base_ids":["kb-1"],"capabilities":["retrieve"]}'
```

### DELETE /api/v1/tenants/:id/api-keys/:key_id

Rôle : Supprimer une clé API. Permissions : Owner, JWT uniquement. Paramètre de chemin : `key_id`.

Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/tenants/1/api-keys/5 -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/tenants/:id/api-principal-config

Rôle : Lire la configuration du principal utilisateur externe API. Permissions : Owner, JWT uniquement. Handler : `internal/handler/tenant.go`

Réponse : 200 `{"success":true,"data":{"mode":"tenant|direct|signed_token","direct_header_name","signed_token_header_name","require_direct_header","has_hmac_secret"}}`

```bash
curl $BASE/api/v1/tenants/1/api-principal-config -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/tenants/:id/api-principal-config

Rôle : Mettre à jour la configuration du principal utilisateur externe API. Permissions : Owner, JWT uniquement.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `mode` | string | oui | `tenant` / `direct` / `signed_token` |
| `require_direct_header` | bool | non | Mode direct : Header obligatoire |
| `hmac_secret` | *string | non | Secret mode signed_token (passer `***` pour conserver) |

Réponse : 200, identique au GET.

```bash
curl -X PUT $BASE/api/v1/tenants/1/api-principal-config -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"mode":"signed_token","hmac_secret":"topsecret"}'
```

### POST /api/v1/tenants/:id/api-principal-test-token

Rôle : Émettre un JWT utilisateur externe pour test. Permissions : Owner, JWT uniquement.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `external_user_id` | string | oui | ID utilisateur externe (≤128 caractères) |
| `expires_in_seconds` | int | non | 1–3600, défaut 900 |

Réponse : 200 `{"success":true,"data":{"token","header_name","expires_in_seconds","expires_at_unix","external_user_id"}}`

```bash
curl -X POST $BASE/api/v1/tenants/1/api-principal-test-token -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"external_user_id":"u-123"}'
```

## Gestion des membres (`/tenants/:id/members`)

Handler : `internal/handler/tenant_member.go`. Clé API : `manage_members` ou full-access.

### GET /api/v1/tenants/:id/members

Rôle : Liste des membres. Permissions : Viewer+.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `q` | string | non | Filtre e-mail / nom d’utilisateur |
| `page` / `page_size` | int | non | Pagination |

Réponse : 200 `{"success":true,"data":{"members":[{user_id,email,username,avatar,role,status,invited_by,joined_at}],"total","page","page_size"}}`

```bash
curl $BASE/api/v1/tenants/1/members -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/tenants/:id/members

Rôle : Ajouter un membre directement. Permissions : Owner.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `email` | string | oui (`binding:"required,email"`) | E-mail du membre (doit être inscrit) |
| `role` | string | oui (`binding:"required"`) | `owner/admin/contributor/viewer` |

Réponse : 201 `{"success":true,"data":{objet membre}}`

```bash
curl -X POST $BASE/api/v1/tenants/1/members -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"email":"b@ex.com","role":"contributor"}'
```

### PUT /api/v1/tenants/:id/members/:user_id

Rôle : Modifier le rôle d’un membre. Permissions : Owner. Corps : `{"role":"admin"}` (`binding:"required"`).

Réponse : 200 `{"success":true}`

```bash
curl -X PUT $BASE/api/v1/tenants/1/members/u-123 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"role":"admin"}'
```

### DELETE /api/v1/tenants/:id/members/:user_id

Rôle : Retirer un membre. Permissions : Owner.

Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/tenants/1/members/u-123 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/tenants/:id/leave

Rôle : Quitter l’espace (tout membre peut le faire ; la couche service refuse une sortie qui laisserait l’espace sans Owner). Permissions : Viewer+, JWT uniquement.

Réponse : 200 `{"success":true}`

```bash
curl -X POST $BASE/api/v1/tenants/1/leave -H "Authorization: Bearer $TOKEN"
```

## Invitations d’espace (`/tenants/:id/invitations` et invite-links)

Handler : `internal/handler/tenant_invitation.go`, `internal/handler/tenant_invite_link.go`. Clé API : `manage_members` ou full-access.

### GET /api/v1/tenants/:id/invitations

Rôle : Liste des invitations de l’espace. Permissions : Viewer+.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `include_terminal` | bool | non | Inclure les invitations terminées |
| `page` / `page_size` | int | non | Pagination |

Réponse : 200 `{"success":true,"data":{"invitations":[{id,tenant_id,invitee_email,inviter_email,role,status,message,expires_at,is_share_link,accepted_count,...}],"total","page","page_size"}}`

```bash
curl $BASE/api/v1/tenants/1/invitations -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/tenants/:id/invitations

Rôle : Inviter un membre (l’invité est ajouté après confirmation via `/me/invitations`). Permissions : Owner.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `email` | string | oui (`binding:"required,email"`) | E-mail invité |
| `role` | string | oui (`binding:"required"`) | Rôle accordé |
| `message` | string | non | Message joint |

Réponse : 201 `{"success":true,"data":{TenantInvitationResponse}}`

```bash
curl -X POST $BASE/api/v1/tenants/1/invitations -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"email":"c@ex.com","role":"viewer"}'
```

### DELETE /api/v1/tenants/:id/invitations/:inv_id

Rôle : Révoquer une invitation. Permissions : Owner.

Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/tenants/1/invitations/12 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/tenants/:id/invite-links

Rôle : Créer un lien de partage (lien d’invitation réutilisable à l’inscription). Permissions : Owner. Handler : `internal/handler/tenant_invite_link.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `role` | string | oui (`binding:"required"`) | Rôle accordé par le lien |
| `message` | string | non | Message joint |

Réponse : 201 `{"success":true,"data":{id,token,invite_url,role,status,expires_at,is_share_link:true,accepted_count}}`

```bash
curl -X POST $BASE/api/v1/tenants/1/invite-links -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"role":"viewer"}'
```

## Journaux d’audit

Handler : `internal/handler/audit_log.go`. Pagination par curseur.

### GET /api/v1/tenants/:id/audit-log

Rôle : Journal d’audit de l’espace (y compris opérations refusées). Permissions : Admin+, JWT uniquement.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `after_id` | int | non | Curseur (`next_cursor` de la réponse précédente) |
| `limit` | int | non | 1–100, défaut 50 |
| `action` | string | non | Filtre par action (ex. `rbac.member_added`) |
| `outcome` | string | non | `success` / `denied` |
| `actor` | string | non | Filtre par user_id de l’acteur |

Réponse : 200 `{"success":true,"data":[AuditLog],"next_cursor":N}`

```bash
curl "$BASE/api/v1/tenants/1/audit-log?limit=50" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge-bases/:id/activity

Rôle : Flux d’activité d’une KB (audit lecture seule). Permissions : créateur de la KB OU Admin+, avec droit read sur la KB ; JWT uniquement. Mêmes paramètres de requête (`after_id/limit/action/outcome/actor`). Enregistré via `RegisterKnowledgeBaseActivityRoutes`.

Réponse : 200 `{"success":true,"data":[AuditLog],"next_cursor":N}`. `details` contient la charge de l’action ; si l’entrée provient d’une clé API, inclut `api_key_id` et `api_key_name` (snapshot du nom, sans plaintext).

```bash
curl $BASE/api/v1/knowledge-bases/kb-1/activity -H "Authorization: Bearer $TOKEN"
```

## Référence d’implémentation

Enregistrement des routes : `RegisterTenantRoutes` dans `internal/router/routes_auth_tenant.go`. Handlers : `internal/handler/tenant.go`, `internal/handler/tenant_member.go`, `internal/handler/tenant_invitation.go`, `internal/handler/tenant_invite_link.go`, `internal/handler/audit_log.go`.
