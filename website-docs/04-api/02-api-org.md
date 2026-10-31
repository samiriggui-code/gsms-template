# Référence API : organisation et partage

Gestion des membres d’organisation et des relations de partage pour les bases de connaissances et les agents. Une organisation regroupe des espaces de travail comme unités membres.

Une organisation (Organization) regroupe des espaces (tenant) comme membres. Les routes du groupe organisation exigent pour les clés API `manage_spaces` ou full-access ; deux points de terminaison en lecture seule « listes de bases partagées » acceptent en plus `retrieve`, afin qu’une clé en lecture seule découvre les bases partagées qu’elle est déjà autorisée à interroger ; la gestion du partage KB/Agent n’est disponible qu’avec une clé full-access.

## Gestion des organisations (`/api/v1/organizations`)

### POST /api/v1/organizations

Rôle : Créer une organisation. Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui | Nom de l’organisation |
| `description` | string | non | Description |
| `avatar` | string | non | URL de l’avatar |
| `searchable` | bool | non | Peut être découverte via la recherche |
| `require_approval` | bool | non | L’adhésion nécessite une approbation |
| `member_limit` | int | non | Nombre maximal d’espaces membres |
| `invite_code_validity_days` | int | non | Validité du code d’invitation (jours) |

Réponse : 201 `{"success":true,"data":{OrganizationResponse}}`

```bash
curl -X POST $BASE/api/v1/organizations -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Organisation R&D"}'
```

### GET /api/v1/organizations

Rôle : Lister les organisations dont je fais partie. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{"organizations":[...],"total":N,"resource_counts":{"knowledge_bases":{"by_organization":{}},"agents":{"by_organization":{}}}}}`

```bash
curl $BASE/api/v1/organizations -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/organizations/preview/:code

Rôle : Aperçu d’une organisation via code d’invitation (sans adhérer). Permissions : Viewer+. Paramètre de chemin : `code` — code d’invitation.

Réponse : 200 `{"success":true,"data":{id,name,description,avatar,member_count,share_count,agent_share_count,is_already_member,require_approval,created_at}}`

```bash
curl $BASE/api/v1/organizations/preview/ABC123 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/organizations/join

Rôle : Rejoindre une organisation avec un code d’invitation. Permissions : Admin+. Corps : `{"invite_code":"..."}` (obligatoire).

Réponse : 200 `{"success":true,"data":{OrganizationResponse}}`

```bash
curl -X POST $BASE/api/v1/organizations/join -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"invite_code":"ABC123"}'
```

### POST /api/v1/organizations/join-request

Rôle : Soumettre une demande d’adhésion (organisation avec approbation). Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `invite_code` | string | oui | Code d’invitation |
| `message` | string | non | Message joint à la demande |
| `role` | string | non | Rôle souhaité |

Réponse : 200 `{"success":true,"data":{JoinRequest}}`

```bash
curl -X POST $BASE/api/v1/organizations/join-request -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"invite_code":"ABC123","message":"Demande d'adhésion"}'
```

### GET /api/v1/organizations/search

Rôle : Rechercher des organisations découvrables (`searchable`). Permissions : Viewer+.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `q` | string | non | Mot-clé |
| `limit` | int | non | Par défaut 20, plafond 100 |

Réponse : 200 `{"success":true,"data":[SearchableOrganization],"total":N}`

```bash
curl "$BASE/api/v1/organizations/search?q=R%26D" -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/organizations/join-by-id

Rôle : Rejoindre une organisation découvrable par ID (sans code d’invitation). Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `organization_id` | string | oui | ID de l’organisation cible |
| `message` | string | non | Message joint |
| `role` | string | non | Rôle souhaité |

Réponse : 200 `{"success":true,"data":{OrganizationResponse}}`

```bash
curl -X POST $BASE/api/v1/organizations/join-by-id -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"organization_id":"org-1"}'
```

### GET /api/v1/organizations/:id

Rôle : Détail d’une organisation. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{OrganizationResponse}}`

```bash
curl $BASE/api/v1/organizations/org-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/organizations/:id

Rôle : Mettre à jour l’organisation (la couche service vérifie que l’espace appelant est admin de l’organisation, pas seulement owner). Permissions : Admin+. Corps : mêmes champs que la création (tous optionnels).

Réponse : 200 `{"success":true,"data":{OrganizationResponse}}`

```bash
curl -X PUT $BASE/api/v1/organizations/org-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"description":"Description mise à jour"}'
```

### DELETE /api/v1/organizations/:id

Rôle : Supprimer l’organisation. Permissions : Admin+ (la couche service exige le owner de l’organisation).

Réponse : 200 `{"success":true,"message":"Organization deleted successfully"}`

```bash
curl -X DELETE $BASE/api/v1/organizations/org-1 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/organizations/:id/leave

Rôle : Quitter l’organisation depuis l’espace courant. Permissions : Admin+. Sans corps. Les bases de connaissances et agents que cet espace a partagés dans l’organisation sont révoqués.

Réponse : 200 `{"success":true,"message":"Left organization successfully"}`

```bash
curl -X POST $BASE/api/v1/organizations/org-1/leave -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/organizations/:id/request-upgrade

Rôle : Demander une élévation du rôle de l’espace courant dans l’organisation. Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `requested_role` | string | oui | Rôle organisation souhaité (`viewer/editor/admin`) |
| `message` | string | non | Message joint |

Réponse : 200 `{"success":true,"data":{JoinRequest}}`

```bash
curl -X POST $BASE/api/v1/organizations/org-1/request-upgrade -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"requested_role":"editor"}'
```

### POST /api/v1/organizations/:id/invite-code

Rôle : Générer un code d’invitation pour l’organisation. Permissions : Admin+ (la couche service exige admin organisation). Sans corps.

Réponse : 200 `{"success":true,"data":{"invite_code":"..."}}`

```bash
curl -X POST $BASE/api/v1/organizations/org-1/invite-code -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/organizations/:id/search-tenants

Rôle : Résoudre un espace invitable par ID d’espace. Permissions : Admin+, et l’espace appelant doit être admin de l’organisation. Depuis v0.8.2, seul l’ID d’espace complet est accepté (plus de recherche inter-espaces par nom) ; le paramètre `limit` a été retiré.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `q` | string | oui | ID d’espace complet |

Réponse : 200 `{"success":true,"data":[{"tenant_id","tenant_name"}]}`. Tableau vide si `q` n’est pas un ID valide, l’espace n’existe pas ou est déjà membre ; sinon un candidat unique.

```bash
curl "$BASE/api/v1/organizations/org-1/search-tenants?q=10002" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/organizations/:id/search-users

Rôle : Alias obsolète, même comportement que `search-tenants`. Permissions : Admin+. Paramètres identiques.

```bash
curl "$BASE/api/v1/organizations/org-1/search-users?q=10002" -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/organizations/:id/invite

Rôle : Inviter directement un espace à rejoindre l’organisation. Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `tenant_id` | uint64 | l’un des deux | ID de l’espace cible (recommandé) |
| `user_id` | string | l’un des deux | Chemin de compatibilité : ID utilisateur (résolu vers son espace) |
| `representative_user_id` | string | non | Ignoré, conservé pour compatibilité : un espace ajouté directement n’a pas d’utilisateur représentant, pour éviter que l’inviteur impose quel utilisateur de l’espace invité apparaît dans la liste des membres |
| `role` | string | oui | Rôle dans l’organisation |

Réponse : 200 `{"success":true,"message":"Member added successfully"}`

```bash
curl -X POST $BASE/api/v1/organizations/org-1/invite -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"tenant_id":2,"role":"viewer"}'
```

### GET /api/v1/organizations/:id/members

Rôle : Liste des membres (espaces) de l’organisation. Permissions : Viewer+. `email` n’est renvoyé que pour la ligne correspondant à l’espace appelant ; les autres espaces n’ont que nom d’utilisateur et avatar.

Réponse : 200 `{"success":true,"data":{"members":[{id,user_id,representative_user_id,role,tenant_id,tenant_name,username,email,avatar,joined_at}],"total":N}}`

```bash
curl $BASE/api/v1/organizations/org-1/members -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/organizations/:id/members/:tenant_id

Rôle : Modifier le rôle organisation d’un espace membre. Permissions : Admin+. Paramètre de chemin `tenant_id` : ID de l’espace membre. Corps : `{"role":"editor"}` (obligatoire, `viewer/editor/admin`).

Réponse : 200 `{"success":true,"message":"Member role updated successfully"}`

```bash
curl -X PUT $BASE/api/v1/organizations/org-1/members/2 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"role":"editor"}'
```

### DELETE /api/v1/organizations/:id/members/:tenant_id

Rôle : Retirer un espace membre (y compris auto-retrait). Permissions : Admin+. Les partages KB et Agent de l’espace retiré vers cette organisation sont révoqués.

Réponse : 200 `{"success":true,"message":"Member removed successfully"}`

```bash
curl -X DELETE $BASE/api/v1/organizations/org-1/members/2 -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/organizations/:id/join-requests

Rôle : File des demandes d’adhésion. Permissions : Admin+.

Réponse : 200 `{"success":true,"data":{"requests":[{id,user_id,username,email,message,request_type,prev_role,requested_role,status,created_at,reviewed_at}],"total":N}}`

```bash
curl $BASE/api/v1/organizations/org-1/join-requests -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/organizations/:id/join-requests/:request_id/review

Rôle : Approuver ou refuser une demande d’adhésion ou d’upgrade. Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `approved` | bool | oui | Approuver / refuser |
| `message` | string | non | Commentaire de revue |
| `role` | string | non | Rôle accordé si approuvé |

Réponse : 200 `{"success":true,"message":"Review completed"}`

```bash
curl -X PUT $BASE/api/v1/organizations/org-1/join-requests/req-1/review \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"approved":true}'
```

### GET /api/v1/organizations/:id/shares

Rôle : Lister les KB partagées vers cette organisation. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{"shares":[KnowledgeBaseShareResponse],"total":N}}`

```bash
curl $BASE/api/v1/organizations/org-1/shares -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/organizations/:id/agent-shares

Rôle : Lister les agents partagés vers cette organisation. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{"shares":[AgentShareResponse],"total":N}}`

```bash
curl $BASE/api/v1/organizations/org-1/agent-shares -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/organizations/:id/shared-knowledge-bases

Rôle : Vue espace organisation : toutes les KB partagées dans l’organisation (y compris les miennes). Permissions : Viewer+ ; clé API : `manage_spaces`, `retrieve` ou full-access ; ne renvoie que les KB de la liste blanche de la clé.

Réponse : 200 `{"success":true,"data":[...avec marqueurs is_mine, source_from_agent...],"total":N}`

```bash
curl $BASE/api/v1/organizations/org-1/shared-knowledge-bases -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/organizations/:id/shared-agents

Rôle : Vue espace organisation : tous les agents partagés dans l’organisation. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":[SharedAgentInfo],"total":N}`

```bash
curl $BASE/api/v1/organizations/org-1/shared-agents -H "Authorization: Bearer $TOKEN"
```

## Partage KB (`/api/v1/knowledge-bases/:id/shares`)

Clé API : full-access uniquement. Handler : `internal/handler/organization.go`

### POST /api/v1/knowledge-bases/:id/shares

Rôle : Partager une KB vers une organisation. Permissions : créateur de la KB OU Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `organization_id` | string | oui | Organisation cible |
| `permission` | string | oui | Permission de partage (sémantique rôle organisation, ex. `viewer/editor`) |

Réponse : 201 `{"success":true,"data":{KBShare}}`

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/shares -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"organization_id":"org-1","permission":"viewer"}'
```

### GET /api/v1/knowledge-bases/:id/shares

Rôle : Lister les partages de cette KB. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{"shares":[KnowledgeBaseShareResponse],"total":N}}`

```bash
curl $BASE/api/v1/knowledge-bases/kb-1/shares -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/knowledge-bases/:id/shares/:share_id

Rôle : Modifier la permission d’un partage. Permissions : créateur de la KB OU Admin+. Corps : `{"permission":"editor"}` (obligatoire).

Règles couche service (communes avec l’annulation de partage) :

- L’auteur du partage initial doit agir depuis l’espace propriétaire de la KB avec rôle Contributor+ ;
- un Admin+ de l’espace propriétaire peut gérer tous les partages de cet espace ;
- pour un espace dont le rôle dans l’organisation cible est admin, ses Admin+ ne peuvent **qu’abaisser** la permission ou annuler le partage, pas l’élever au-delà de la valeur actuelle.

`share_id` doit appartenir à la KB du chemin, sinon 404.

Réponse : 200 `{"success":true,"message":"Share permission updated successfully"}`

```bash
curl -X PUT $BASE/api/v1/knowledge-bases/kb-1/shares/s-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"permission":"editor"}'
```

### DELETE /api/v1/knowledge-bases/:id/shares/:share_id

Rôle : Retirer un partage. Permissions : créateur de la KB OU Admin+, mêmes règles service. `share_id` doit appartenir à la KB du chemin, sinon 404.

Réponse : 200 `{"success":true,"message":"Share removed successfully"}`

```bash
curl -X DELETE $BASE/api/v1/knowledge-bases/kb-1/shares/s-1 -H "Authorization: Bearer $TOKEN"
```

## Partage Agent (`/api/v1/agents/:id/shares`)

Clé API : full-access uniquement. Handler : `internal/handler/organization.go`

### POST /api/v1/agents/:id/shares

Rôle : Partager un agent vers une organisation. Permissions : créateur de l’agent OU Admin+. Corps identique au partage KB (`organization_id` + `permission`, obligatoires). Les agents intégrés ne peuvent pas être partagés (400) : chaque espace a un agent intégré de même ID, le destinataire ne pourrait pas les distinguer. Le périmètre de bases de l’agent est exposé aux membres de l’organisation ; l’appelant doit pouvoir partager directement chaque base (créateur ou Admin+) ; `kb_selection_mode: all` n’est autorisé qu’à Admin+, sinon 403.

Réponse : 201 `{"success":true,"data":{AgentShare}}`

```bash
curl -X POST $BASE/api/v1/agents/agent-1/shares -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"organization_id":"org-1","permission":"viewer"}'
```

### GET /api/v1/agents/:id/shares

Rôle : Lister les partages de cet agent. Permissions : créateur de l’agent OU Admin+.

Réponse : 200 `{"success":true,"data":{"shares":[AgentShareResponse],"total":N}}`

```bash
curl $BASE/api/v1/agents/agent-1/shares -H "Authorization: Bearer $TOKEN"
```

### DELETE /api/v1/agents/:id/shares/:share_id

Rôle : Annuler le partage d’un agent. Permissions : créateur de l’agent OU Admin+, mêmes règles service que l’annulation KB. `share_id` doit appartenir à l’agent du chemin, sinon 404.

Réponse : 200 `{"success":true,"message":"Share removed successfully"}`

```bash
curl -X DELETE $BASE/api/v1/agents/agent-1/shares/s-1 -H "Authorization: Bearer $TOKEN"
```

## Vues agrégées des ressources partagées

### GET /api/v1/shared-knowledge-bases

Rôle : Lister les KB partagées avec moi via les organisations (métadonnées du magasin vectoriel côté propriétaire retirées). Permissions : Viewer+ ; clé API : `manage_spaces`, `retrieve` ou full-access ; ne renvoie que les KB de la liste blanche de la clé.

Réponse : 200 `{"success":true,"data":[...],"total":N}`

```bash
curl $BASE/api/v1/shared-knowledge-bases -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/shared-agents

Rôle : Lister les agents partagés avec moi via les organisations. Permissions : Viewer+ ; clé API : idem.

Réponse : 200 `{"success":true,"data":[SharedAgentInfo],"total":N}`. `SharedAgentInfo` inclut `source_tenant_id` (espace source), `org_name`, `shared_by_username`, `permission`, et `web_search_ready` — un seul booléen indiquant si la recherche Web est disponible côté espace source, sans config provider source (fuite) ni comparaison avec les ID provider de l’espace receveur (faux négatifs).

Pour appeler d’autres interfaces avec un agent partagé, si le même agent est partagé par plusieurs espaces, passer `agent_source_tenant_id` pour préciser la source ; la valeur est vérifiée contre chaque relation de partage ; invalide ou non autorisé → erreur explicite, pas de repli silencieux vers une autre source.

```bash
curl $BASE/api/v1/shared-agents -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/shared-agents/disabled

Rôle : Désactiver un agent partagé pour l’espace courant (affecte la liste déroulante des sessions de tout l’espace). Permissions : Admin+ ; clé API : idem.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `agent_id` | string | oui (`binding:"required"`) | ID de l’agent partagé |
| `disabled` | bool | non | Désactivé (défaut false) |

Réponse : 200 `{"success":true}`

```bash
curl -X POST $BASE/api/v1/shared-agents/disabled -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"agent_id":"agent-1","disabled":true}'
```

## Référence d’implémentation

Enregistrement des routes : `RegisterOrganizationRoutes` dans `internal/router/routes_agent.go`. Handler : `internal/handler/organization.go`.
