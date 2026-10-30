# Référence API : agent, MCP et compétences

Gestion des agents, services MCP et leurs identifiants, compétences et favoris de ressources. Le périmètre d’outils des agents et la configuration d’approbation des appels sont maintenus via ce groupe d’interfaces.

## Agent (`/api/v1/agents`)

Lecture : Viewer+ (clé API `read_agents`/`manage_agents`/`chat`/full-access) ; écriture : créateur OU Admin+ (clé API `manage_agents`/full-access) ; agents intégrés (`is_builtin=true`) toujours Admin+.

### GET /api/v1/agents/placeholders

Rôle : Définitions des placeholders de prompt (enregistré avant `/:id`). Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{"all":{...},"system_prompt":{...},"agent_system_prompt":{...},"context_template":{...},"rewrite_system_prompt":{...},"rewrite_prompt":{...},"fallback_prompt":{...}}}`

```bash
curl $BASE/api/v1/agents/placeholders -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/agents/type-presets

Rôle : Préréglages de type d’agent en raisonnement intelligent (`rag-qa` / `wiki-qa` / `hybrid` / `custom`, etc.). Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":[{type,system_prompt,allowed_tools,kb_compatibility}]}`

```bash
curl $BASE/api/v1/agents/type-presets -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/agents/tools

Rôle : Catalogue des outils intégrés optionnels pour les agents. Permissions : Viewer+. Réponse `{"success":true,"data":{"tools":[...],"default_tools":[...],"switch_managed_tools":[...]}}` ; chaque outil inclut les exigences de capacité KB `requirement.any_of` / `all_of`, utilisées par l’éditeur pour déterminer la disponibilité.

L’ajout d’un nom d’outil inconnu à la création ou à la mise à jour renvoie 400 ; les entrées inconnues déjà stockées sont conservées et listées dans `allowed_tools_warnings.kept_unknown` en tête de réponse. Les outils gérés par des commutateurs indépendants et les anciens outils de compétence sans successeur sont retirés de la liste ; `allowed_tools_warnings.dropped` renvoie les éléments supprimés. Les anciens noms d’outils de recherche sont mappés vers leurs successeurs, avec dédoublonnage.

### POST /api/v1/agents

Rôle : Créer un agent personnalisé. Permissions : Contributor+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui (`binding:"required"`) | Nom |
| `description` | string | non | Description |
| `avatar` | string | non | Avatar / emoji |
| `config` | object | non | Configuration agent (`types.CustomAgentConfig`, voir ci-dessous) |

Principaux champs de `config` : `agent_mode` (`quick-answer`/`smart-reasoning`, défaut `smart-reasoning` si omis), `agent_type` (`rag-qa/wiki-qa/hybrid-rag-wiki/data-analysis/custom`), `system_prompt`, `model_id`, `temperature` (0–2, valeur invalide → code 2103), `max_iterations` (1–20, invalide → code 2102), `allowed_tools` (non défini/null → outils par défaut, `[]` explicite → aucun outil intégré ; recherche Web, mémoire, MCP et sandbox via configuration séparée), `mcp_selection_mode`/`mcp_services`, `skills_selection_mode`, `kb_selection_mode`/`knowledge_bases`, `web_search_enabled`, `question_suggestions`, etc. (définition complète dans `internal/types/custom_agent.go`).

Réponse : 201 `{"success":true,"data":{id,name,description,avatar,is_builtin,created_by,config,creator_name,...}}`

```bash
curl -X POST $BASE/api/v1/agents -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Assistant SAV","config":{"agent_mode":"quick-answer","kb_selection_mode":"selected","knowledge_bases":["kb-1"]}}'
```

### GET /api/v1/agents

Rôle : Liste des agents (y compris intégrés). Permissions : Viewer+. Paramètre de requête : `creator` (`mine`/`others`, optionnel).

Réponse : 200 `{"success":true,"data":[Agent],"disabled_own_agent_ids":[...]}`

```bash
curl $BASE/api/v1/agents -H "X-API-Key: $API_KEY"
```

### GET /api/v1/agents/:id

Rôle : Détail d’un agent. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{Agent}}`

```bash
curl $BASE/api/v1/agents/agent-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/agents/:id

Rôle : Mettre à jour un agent. Permissions : créateur OU Admin+. Corps : `name`/`description`/`avatar`/`config`. `name` obligatoire ; omettre `avatar` conserve l’avatar actuel ; `config` remplace l’ensemble — les champs omis ne conservent pas leurs valeurs précédentes, utiliser `PATCH` pour des changements partiels. Si l’agent est partagé vers une organisation, toute base de connaissances nouvellement incluse dans le périmètre doit être partageable par l’appelant (créateur de la KB ou Admin+ ; passer à `all` exige Admin+), sinon 403.

Réponse : 200 `{"success":true,"data":{Agent}}`

```bash
curl -X PUT $BASE/api/v1/agents/agent-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Assistant support","description":"Description mise à jour","config":{...}}'
```

### PATCH /api/v1/agents/:id

Rôle : Mise à jour partielle — seuls les champs présents dans la requête changent ; le reste (y compris l’avatar) est inchangé. Mêmes permissions que `PUT` : créateur OU Admin+ ; clé API `manage_agents`/full-access. Réutilise les validations de `PUT` (y compris les règles de périmètre KB lors d’un partage organisation) et valide en plus les noms de compétences.

Champs du corps (tous optionnels) :

| Champ | Type | Description |
| --- | --- | --- |
| `name` | string | Nom, ne peut pas être vide |
| `description` | string | Description |
| `agent_mode` | string | `quick-answer` / `smart-reasoning`. MCP et compétences ne s’exécutent qu’en `smart-reasoning` ; passer à ce mode active le dialogue multi-tours |
| `system_prompt` | string | Prompt système complet (remplacement intégral) |
| `model_id` | string | ID du modèle de dialogue |
| `kb_selection_mode` | string | `all` / `selected` / `none` |
| `knowledge_bases` | string[] | IDs de KB sélectionnées, remplacement intégral ; si `kb_selection_mode` n’est pas envoyé en même temps, le mode passe à `selected` |
| `mcp_selection_mode` | string | `all` / `selected` / `none` |
| `mcp_services` | string[] | IDs de services MCP sélectionnés, remplacement intégral ; si `mcp_selection_mode` n’est pas envoyé, le mode passe à `selected` |
| `skills_selection_mode` | string | `all` / `selected` / `none` ; `all` et `none` effacent les noms de compétences sélectionnées |
| `selected_skills` | string[] | Jusqu’à 50 noms de compétences (pas d’IDs), remplacement intégral ; si `skills_selection_mode` n’est pas envoyé, le mode passe à `selected` |
| `web_search_enabled` | bool | Activer la recherche Web |
| `multi_turn_enabled` | bool | Activer le dialogue multi-tours |

Les noms de compétences proviennent de `GET /api/v1/skills?sandbox_config_id=<agent.config.sandbox_config_id>` et ne s’appliquent qu’en mode `smart-reasoning`. Après PATCH, si le mode est `selected`, tous les noms doivent être des compétences disponibles pour l’espace et le sandbox concernés ; nom indisponible ou inconnu → 400 avec la liste des noms. Sans sandbox lié, définir les compétences sur `all` ou `selected` via PATCH (y compris en ne passant que `selected_skills`) renvoie 400 : choisir d’abord un sandbox dans l’éditeur d’agent.

Réponse : 200 `{"success":true,"data":{Agent}}` ; 400 si `agent_mode` ou un mode de sélection est invalide, nom vide, plus de 50 compétences ou échec de validation des compétences ; 404 si l’agent n’existe pas.

```bash
curl -X PATCH $BASE/api/v1/agents/agent-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"model_id":"model-2","knowledge_bases":["kb-1","kb-2"]}'
```

### DELETE /api/v1/agents/:id

Rôle : Supprimer un agent. Permissions : créateur OU Admin+.

Réponse : 200 `{"success":true,"message":"Agent deleted successfully"}`

```bash
curl -X DELETE $BASE/api/v1/agents/agent-1 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/agents/:id/copy

Rôle : Copier un agent (la copie appartient à l’appelant). Permissions : Contributor+. Sans corps.

Réponse : 201 `{"success":true,"data":{nouvel Agent}}`

```bash
curl -X POST $BASE/api/v1/agents/agent-1/copy -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/agents/:id/suggested-questions

Rôle : Questions suggérées de départ pour l’agent (enregistré hors du groupe pour éviter le conflit avec `/agents/:id/shares`). Permissions : Viewer+ ; clé API `read_agents`/`manage_agents`/`chat`/full-access.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `knowledge_base_ids` | string | non | KB séparées par des virgules |
| `knowledge_ids` | string | non | IDs de connaissance séparés par des virgules |
| `tag_scopes` | string | non | Périmètres de tags (tableau JSON) |
| `limit` | int | non | Plafond 30 |

Réponse : 200 `{"success":true,"data":{"questions":[{question,source,knowledge_base_id}]}}`

```bash
curl "$BASE/api/v1/agents/agent-1/suggested-questions?limit=6" -H "X-API-Key: $API_KEY"
```

## Services MCP (`/api/v1/mcp-services`)

Intégration d’outils externes au niveau de l’espace. Lecture : Viewer+ ; écriture / test / politiques d’approbation : Admin+. Clé API : `manage_mcp_services`/full-access. Handler : `internal/handler/mcp_service.go`

### POST /api/v1/mcp-services

Rôle : Créer un service MCP. Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui | Nom |
| `description` | string | non | Description legacy, conservée pour compatibilité ; l’interface d’administration édite `usage_instructions` |
| `usage_instructions` | string | non | Usage, cas d’emploi et contraintes clés pour que le modèle sache quand utiliser le service ; requis à l’étape 2 dans l’UI |
| `enabled` | bool | non | Activé |
| `transport_type` | string | oui | `sse` / `http-streamable` ; `stdio` refusé pour des raisons de sécurité |
| `url` | *string | non | URL du service (SSE/HTTP) |
| `headers` | map[string]string | non | En-têtes HTTP |
| `auth_config` | object | non | `auth_type` (`api_key`/`bearer`/`oauth`), `api_key_header`, `custom_headers`, `scopes`, `auth_server_metadata_url`, `client_id` (client OAuth pré-enregistré ; vide → enregistrement dynamique ; chaîne vide efface) (secrets et `client_secret` via la sous-ressource credentials, peuvent être envoyés à la création) |
| `advanced_config` | object | non | `{timeout,retry_count,retry_delay}`, défaut 30 s / 3 / 1 s ; si `timeout` > 60 s, prolonge aussi la fenêtre d’attente d’un appel d’outil agent vers ce service |
| `stdio_config` / `env_vars` | object | non | Conservés pour compatibilité ; stdio désactivé, sans effet |

Réponse : 200 `{"success":true,"data":{MCPServiceResponse}}` (inclut `credentials:{api_key:{configured},token:{configured},client_secret:{configured}}` ; si le catalogue d’outils est synchronisé, aussi `catalog:{tool_count,stale,synced_at}`)

```bash
curl -X POST $BASE/api/v1/mcp-services -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"github","transport_type":"sse","url":"https://mcp.example.com/sse"}'
```

### GET /api/v1/mcp-services

Rôle : Liste des services MCP. Permissions : Viewer+. Réponse : 200 `{"success":true,"data":[MCPServiceResponse]}`

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `agent_id` | string | non | Avec `agent_source_tenant_id`, liste les services MCP @mentionnables pour cet agent partagé |
| `agent_source_tenant_id` | int | non | ID de l’espace source de l’agent partagé, identique au paramètre homonyme des requêtes de chat |

Si les deux paramètres sont fournis : chemin agent partagé — ne renvoie que les services spécifiés en mode `selected` dans l’espace source, activés (`all`/`none` → liste vide) ; chaque entrée ne contient que ID, nom, description, instructions d’usage, type de transport, état activé et résumé du catalogue d’outils, sans URL, en-têtes ni détails d’auth ; 403 si l’appelant ne peut pas utiliser cet agent. Si un seul ou aucun paramètre : services de l’espace de l’appelant.

```bash
curl $BASE/api/v1/mcp-services -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/mcp-services/:id

Rôle : Détail. Permissions : Viewer+. Réponse : 200 `{"success":true,"data":{MCPServiceResponse}}`

```bash
curl $BASE/api/v1/mcp-services/mcp-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/mcp-services/:id

Rôle : Mise à jour partielle (sémantique map ; pas d’`api_key`/`token` dans `auth_config`). Permissions : Admin+. Champs identiques à la création (tous optionnels).

Si `usage_instructions` est envoyé, doit être une chaîne non vide après trim, max 16 000 caractères. Peut être omis lors d’un changement de connexion ou d’activation uniquement ; la valeur existante est conservée.

Réponse : 200 `{"success":true,"data":{MCPServiceResponse}}`

```bash
curl -X PUT $BASE/api/v1/mcp-services/mcp-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"enabled":false}'
```

### POST /api/v1/mcp-services/:id/usage-instructions/generate

Rôle : Générer des instructions d’usage concises à partir du catalogue d’outils MCP synchronisé et non expiré. Permissions : Admin+ ; clé API `manage_mcp_services` ou full-access.

Corps : `{"language":"zh-CN"}`. Langues : `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `ru-RU` ; défaut chinois.

Utilise le modèle de dialogue par défaut de l’espace s’il est disponible, sinon le premier modèle de dialogue disponible. Entrées : nom du service, description côté serveur, noms et descriptions des outils activés ; pour OAuth, le catalogue respecte le périmètre d’autorisation de l’utilisateur courant. Ne se connecte pas au MCP, n’appelle pas d’outils et n’enregistre pas automatiquement le résultat.

Réponse : 200 `{"success":true,"data":{"usage_instructions":"Interroger les journaux distants par module et plage horaire ; avec un ID de requête existant, lire le journal correspondant."}}`. Cible : 2–3 phrases courtes, max 500 caractères ; l’utilisateur peut éditer puis enregistrer via PUT. 400 si catalogue non synchronisé, expiré, sans outil activé ou sans modèle de dialogue disponible.

### DELETE /api/v1/mcp-services/:id

Rôle : Supprimer. Permissions : Admin+. Réponse : 200 `{"success":true,"message":"MCP service deleted successfully"}`

```bash
curl -X DELETE $BASE/api/v1/mcp-services/mcp-1 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/mcp-services/:id/test

Rôle : Test de connexion (sonde du service externe). Permissions : Admin+. Réponse : 200 `{"success":true,"data":{"success","message","oauth_required","tools":[...],"resources":[...]}}`

```bash
curl -X POST $BASE/api/v1/mcp-services/mcp-1/test -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/mcp-services/:id/metadata

Rôle : Lire le catalogue d’outils persisté sans connexion amont. Permissions : Viewer+ ; catalogue OAuth isolé par sujet d’autorisation effectif.

Réponse : 200 `{"success":true,"data":null}` si non synchronisé ; sinon `data` est un instantané (infos serveur, instructions, tools, horodatage de sync). Après changement de configuration de connexion, l’instantané est marqué `stale:true` et ne peut pas charger les outils runtime.

```bash
curl $BASE/api/v1/mcp-services/mcp-1/metadata -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/mcp-services/:id/metadata/refresh

Rôle : Connexion explicite amont, pull complet et mise à jour atomique du catalogue. Catalogue auth statique : Admin+ ; utilisateur OAuth peut synchroniser son catalogue (Viewer+). Clé API : capacité de gestion MCP.

Réponse : instantané de catalogue mis à jour. En cas d’échec, l’ancien instantané est conservé ; 409 si la connexion change pendant le refresh ; 400 si catalogue invalide/trop volumineux ou échec de sync amont ; 503 si stockage des métadonnées indisponible. N’écrase pas les instructions d’usage manuelles ni les politiques d’activation/approbation par outil.

```bash
curl -X POST $BASE/api/v1/mcp-services/mcp-1/metadata/refresh -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/mcp-services/:id/tools

Rôle : Liste des outils. Permissions : Viewer+. Réponse : 200 `{"success":true,"data":[{name,description,inputSchema,require_approval}]}`

```bash
curl $BASE/api/v1/mcp-services/mcp-1/tools -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/mcp-services/:id/resources

Rôle : Liste des ressources. Permissions : Viewer+. Réponse : 200 `{"success":true,"data":[{uri,name,description,mimeType}]}`

```bash
curl $BASE/api/v1/mcp-services/mcp-1/resources -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/mcp-services/:id/credentials

Rôle : Définir les secrets (`api_key`/`token`/`client_secret`, champs pointeur, omission = conservation). Permissions : Admin+. Handler : `internal/handler/mcp_credentials.go`

Réponse : 200 `{"success":true,"data":{"fields":{"api_key":{"configured"},"token":{"configured"},"client_secret":{"configured"}}}}`

```bash
curl -X PUT $BASE/api/v1/mcp-services/mcp-1/credentials -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"token":"ghp_..."}'
```

### DELETE /api/v1/mcp-services/:id/credentials/:field

Rôle : Supprimer un champ d’identifiants (`api_key`, `token` ou `client_secret`). Permissions : Admin+. Réponse : 204.

```bash
curl -X DELETE $BASE/api/v1/mcp-services/mcp-1/credentials/token -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/mcp-services/:id/tool-approvals

Rôle : Liste des politiques d’activation et d’approbation manuelle par outil. Permissions : Viewer+. Réponse : 200 `{"success":true,"data":[{service_id,tool_name,require_approval,enabled,...}]}`

```bash
curl $BASE/api/v1/mcp-services/mcp-1/tool-approvals -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/mcp-services/:id/tool-approvals/:tool_name

Rôle : Mettre à jour `enabled` (activation) et `require_approval` (approbation manuelle) pour un outil. Permissions : Admin+. Au moins l’un des deux doit être fourni ; les champs omis conservent leur valeur ; sans enregistrement, défaut activé et sans approbation.

Réponse : 200 `{"success":true}`

```bash
curl -X PUT $BASE/api/v1/mcp-services/mcp-1/tool-approvals/create_issue \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"require_approval":true}'
```

## MCP OAuth

Handler : `internal/handler/mcp_oauth.go`

### GET /api/v1/mcp-oauth/callback

Rôle : Callback OAuth tiers (sans auth, authentification via `state` à usage unique ; enregistré hors du groupe `/mcp-services`). Paramètres de requête : `code`, `state`, `error`.

Réponse : 302 redirection vers le frontend (succès `#mcp_oauth_result=success`, échec `#mcp_oauth_error=<code>`).

```bash
curl -i "$BASE/api/v1/mcp-oauth/callback?code=xxx&state=yyy"
```

### POST /api/v1/mcp-services/:id/oauth/authorize-url

Rôle : Générer une URL d’autorisation au niveau utilisateur. Permissions : Viewer+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `redirect_uri` | string | oui | URL de callback backend (absolue) |
| `frontend_redirect` | string | non | Redirection frontend après callback (défaut `/`) |

Réponse : 200 `{"success":true,"data":{"authorization_url","authorization_attempt"}}`

```bash
curl -X POST $BASE/api/v1/mcp-services/mcp-1/oauth/authorize-url -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"redirect_uri":"'$BASE'/api/v1/mcp-oauth/callback"}'
```

### POST /api/v1/mcp-services/:id/oauth/assertion

Rôle : Obtenir un token OAuth pour l’utilisateur courant via JWT Bearer (RFC 7523), sans redirection navigateur. Cas d’usage : WeKnora derrière une autre application qui gère la connexion et appelle WeKnora pour l’utilisateur — l’application émet une assertion représentant l’utilisateur (ex. ID-JAG pour MCP Enterprise-Managed Authorization), WeKnora la transmet telle quelle au serveur d’autorisation pour validation. Utilise le client OAuth déjà enregistré pour ce service (pas d’enregistrement dynamique ; 400 s’il n’y a pas encore de client). Le token obtenu est identique à celui du callback OAuth ; refresh, statut et révocation inchangés. Permissions : Viewer+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `assertion` | string | oui | Assertion JWT envoyée au serveur d’autorisation (corps max 16 KiB) |

Réponse : 200, `data` identique à `oauth/status`. 400 avec code d’erreur OAuth si le serveur refuse l’assertion (4xx ou 2xx avec `error` OAuth) ; 500 si 5xx amont ou erreur réseau.

```bash
curl -X POST $BASE/api/v1/mcp-services/mcp-1/oauth/assertion -H "X-API-Key: $API_KEY" \
  -H "X-External-User-ID: user-1" -H 'Content-Type: application/json' -d '{"assertion":"'$ASSERTION'"}'
```

### GET /api/v1/mcp-services/:id/oauth/status

Rôle : Statut d’autorisation pour l’utilisateur courant. Permissions : Viewer+. Paramètre : `authorization_attempt` (optionnel).

Réponse : 200 `{"success":true,"data":{"authorized","state":"authorized|pending","refresh_available","expires_at"}}`

```bash
curl $BASE/api/v1/mcp-services/mcp-1/oauth/status -H "Authorization: Bearer $TOKEN"
```

### DELETE /api/v1/mcp-services/:id/oauth/token

Rôle : Révoquer le token OAuth de l’utilisateur courant. Permissions : Viewer+. Réponse : 204.

```bash
curl -X DELETE $BASE/api/v1/mcp-services/mcp-1/oauth/token -H "Authorization: Bearer $TOKEN"
```

## Points de terminaison MCP Server (`/api/v1/mcp-endpoints`) {#points-de-termination-mcp-server}

Gestion des points de terminaison MCP publiés par l’espace courant ; les clients MCP externes se connectent à `/mcp/:endpoint_id`. Lecture : Viewer+ ; écriture : Admin+. Clé API : `manage_channels`/full-access. Handler : `internal/handler/mcp_endpoint.go`. Usage et outils : [Intégration MCP](../03-features/08-mcp.md#clients-externes).

| Méthode | Chemin | Description |
| --- | --- | --- |
| GET | `/mcp-endpoints` | Liste des points (sans jeton) |
| GET | `/mcp-endpoints/tools` | Catalogue : `{groups,tools:[{name,group,destructive}],default_tools}` |
| POST | `/mcp-endpoints` | Créer ; 201, réponse avec `token` à usage unique |
| GET | `/mcp-endpoints/:endpoint_id` | Détail |
| PUT | `/mcp-endpoints/:endpoint_id` | Mise à jour partielle, champs omis conservés |
| DELETE | `/mcp-endpoints/:endpoint_id` | Supprimer ; les clients utilisant ce point perdent l’accès immédiatement |
| POST | `/mcp-endpoints/:endpoint_id/rotate-token` | Rotation du jeton ; réponse avec nouveau `token`, ancien jeton invalidé |

Champs de requête (création et mise à jour, tous optionnels sauf indication) :

| Champ | Type | Description |
| --- | --- | --- |
| `name` | string | Nom, obligatoire à la création |
| `description` | string | Description |
| `enabled` | bool | Défaut true ; désactivé → connexion 403 |
| `knowledge_base_ids` | string[] | KB accessibles ; tableau vide = toutes dans l’espace |
| `tools` | string[] | Outils exposés, au moins un ; à la création, omission → `default_tools` (tous les outils en lecture seule) |
| `default_agent_id` | string | Agent pour `ask` ; vide = Q&R rapide intégrée ; agent intégré interne non sélectionnable |
| `rate_limit_per_minute` | int | Plafond d’appels d’outils par minute ; 0 ou omis = 60, max 6000 |

Réponse `data` : `{id,tenant_id,name,description,enabled,token_hint,knowledge_base_ids,tools,default_agent_id,rate_limit_per_minute,path,last_used_at,created_at,updated_at}` ; à la création et à la rotation, `token` en plus. Avec une clé API restreinte, les KB et capacités d’outils du point ne peuvent pas dépasser le périmètre de la clé, sinon 403.

```bash
curl -X POST $BASE/api/v1/mcp-endpoints -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Assistant doc produit","knowledge_base_ids":["kb-1"],"tools":["search_knowledge","read_document","ask"]}'
```

## Interactions runtime agent (`/api/v1/agent`)

Approbation manuelle en conversation et reprise OAuth ; permissions Viewer+ (seul l’initiateur de la session a le contexte) ; clé API refusée par défaut.

### POST /api/v1/agent/tool-approvals/:pending_id

Rôle : Trancher un appel d’outil en attente d’approbation. Handler : `ResolveToolApproval` dans `internal/handler/mcp_service.go`.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `decision` | string | oui (`binding:"required"`) | `approve` / `reject` |
| `modified_args` | JSON | non | Arguments d’outil modifiés |
| `reason` | string | non | Motif |

Réponse : 200 `{"success":true}`

```bash
curl -X POST $BASE/api/v1/agent/tool-approvals/p-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"decision":"approve"}'
```

### POST /api/v1/agent/mcp-oauth-resolutions/:pending_id

Rôle : Reprendre l’exécution d’un agent suspendu pour OAuth MCP. Handler : `internal/handler/mcp_oauth.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `service_id` | string | oui (`binding:"required"`) | ID du service MCP |
| `decision` | string | non | `authorize` (défaut) / `cancel` |

Réponse : 200 `{"success":true}`

```bash
curl -X POST $BASE/api/v1/agent/mcp-oauth-resolutions/p-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"service_id":"mcp-1"}'
```

### POST /api/v1/agent/mcp-oauth-resolutions/:pending_id/cancel

Rôle : Annuler le flux OAuth en pause. Sans corps.

Réponse : 200 `{"success":true}`

```bash
curl -X POST $BASE/api/v1/agent/mcp-oauth-resolutions/p-1/cancel -H "Authorization: Bearer $TOKEN"
```

## Compétences, sandbox et variables personnelles

`GET /api/v1/skills?sandbox_config_id=...` renvoie noms/descriptions des compétences disponibles pour la configuration et `skills_available` ; avec `agent_id` + `agent_source_tenant_id`, résultat basé sur l’espace source de l’agent partagé et sa config sandbox — voir [API sandbox et compétences](02-api-sandbox-skills.md#skills-dans-la-sandbox). Catalogue, installation, modèles, progression, fichiers et variables personnelles : [API sandbox et compétences](02-api-sandbox-skills.md).

La config agent inclut `sandbox_config_id` ; avec `skills_selection_mode` et `selected_skills`, cela détermine les compétences disponibles. Les outils shell/fichier s’enregistrent selon les capacités backend ; les anciens `read_skill` / `execute_skill_script` ne sont plus enregistrés.

## Mémoire à long terme

Si `memory_enabled` dans la config agent est `nil`, hérite de l’espace ; `false` désactive lecture/écriture mémoire pour cet agent. Gestion personnelle, préférences thème/document, export et consolidation immédiate : [API mémoire à long terme](02-api-memory.md) ; usage : [Mémoire à long terme inter-sessions](../03-features/23-memory.md).

## Favoris utilisateur (`/api/v1/user/favorites`)

Stockage par utilisateur (pas par créateur de ressource) ; permissions Viewer+ ; JWT uniquement (clé API refusée par défaut). Handler : `internal/handler/user_resource_favorite.go`

### GET /api/v1/user/favorites

Rôle : Liste des favoris. Paramètre : `type` (obligatoire, `kb` ou `agent`).

Réponse : 200 `{"success":true,"data":[{type,id,created_at}]}`

```bash
curl "$BASE/api/v1/user/favorites?type=kb" -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/user/favorites

Rôle : Ajouter un favori. Corps : `{"type":"kb|agent","id":"<ID ressource>"}` (tous deux obligatoires).

Réponse : 200 `{"success":true}`

```bash
curl -X POST $BASE/api/v1/user/favorites -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"type":"kb","id":"kb-1"}'
```

### DELETE /api/v1/user/favorites/:type/:id

Rôle : Retirer un favori. Paramètres de chemin : `type`, `id`.

Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/user/favorites/kb/kb-1 -H "Authorization: Bearer $TOKEN"
```

## Référence d’implémentation

Enregistrement des routes : appel depuis `internal/router/router.go` ; `RegisterCustomAgentRoutes`, `RegisterSkillRoutes`, `RegisterUserFavoriteRoutes` dans `routes_agent.go` ; `RegisterMCPServiceRoutes` (OAuth MCP et interactions runtime `/agent`) dans `routes_infra.go` ; `RegisterMCPEndpointRoutes` et `/mcp/:endpoint_id` public dans `routes_mcp_endpoint.go`. Handlers : `internal/handler/custom_agent.go`, `internal/handler/mcp_service.go`, `internal/handler/mcp_credentials.go`, `internal/handler/mcp_oauth.go`, `internal/handler/mcp_endpoint.go`, `internal/handler/skill_handler.go`, `internal/handler/user_resource_favorite.go`.
