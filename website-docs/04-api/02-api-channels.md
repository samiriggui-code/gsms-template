# Référence API : IM, Embed et fichiers

Gestion des canaux IM et d’intégration Web (Embed), callbacks, sessions visiteur et accès aux fichiers. L’administration, les callbacks des plateformes IM et les visiteurs Embed utilisent chacun leur mode d’authentification.

## Callback IM (sans authentification globale)

### GET|POST /api/v1/im/callback/:channel_id

Rôle : Callback d’événements et validation d’URL pour les plateformes IM (WeChat, Feishu, Slack, Telegram, DingTalk, QQBot, Yunzhijia, etc.). Enregistré avant le middleware d’authentification ; chaque plateforme vérifie sa propre signature. Échec de signature → 403 ; canal inexistant → 404. Accusé de réception immédiat, traitement asynchrone. Handler : `internal/handler/im.go`

Réponse : 200 `{"success":true}` ou format ACK exigé par la plateforme.

```bash
curl -X POST $BASE/api/v1/im/callback/ch-1 -H 'Content-Type: application/json' -d '{"event":"..."}'
```

## Gestion des canaux IM (authentification requise)

Clé API : `manage_channels` ou full-access. Les canaux IM portent les identifiants du bot externe : listes en Viewer+, modifications, activation/désactivation et connexion par QR en Admin+.

Pour Feishu/Lark, `credentials.api_base_url` affecte à la fois l’API HTTP et l’amorçage WebSocket ; Yunzhijia prend en charge `session_mode=thread`. Exemples de configuration et exigences réseau : voir [Intégration messagerie (IM)](../03-features/12-im-integration.md). Les préférences mémoire IM/Embed proviennent de `config.memory_enabled` de l’agent lié ; les API canal n’exposent pas de paramètre `memory_enabled` distinct.

### POST /api/v1/agents/:id/im-channels

Rôle : Créer un canal IM pour un agent. Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `platform` | string | oui | `wecom/feishu/lark/slack/telegram/dingtalk/mattermost/wechat/qqbot/yunzhijia` |
| `name` | string | non | Nom affiché |
| `mode` | string | non | `websocket` (défaut ; mattermost/yunzhijia : `webhook` par défaut) / `webhook` / `longpoll` (wechat impose longpoll) |
| `output_mode` | string | non | `stream` (défaut) / `full` (wechat impose full) |
| `locale` | string | non | Langue des réponses : `zh-CN` / `en-US` / `ja-JP` / `ko-KR` / `ru-RU` ; vide (défaut) = langue du déploiement (`WEKNORA_LANGUAGE`, sinon `zh-CN`) ; autre valeur → 400 |
| `session_mode` | string | non | `user` (défaut) / `thread` |
| `knowledge_base_id` | string | non | Base de connaissances pour indexation supplémentaire des pièces jointes ; doit appartenir à l’espace, sinon 400 |
| `credentials` | object | non | Identifiants plateforme |
| `enabled` | bool | non | Défaut true |

Réponse : 200 `{"data":{IMChannel}}` ; 409 si un bot existe déjà pour ce canal.

```bash
curl -X POST $BASE/api/v1/agents/agent-1/im-channels -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"platform":"feishu","name":"Support Feishu","locale":"en-US"}'
```

### GET /api/v1/agents/:id/im-channels

Rôle : Liste des canaux IM d’un agent (résumé). Permissions : Viewer+.

Réponse : 200 `{"data":[IMChannel]}`

```bash
curl $BASE/api/v1/agents/agent-1/im-channels -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/im-channels

Rôle : Vue d’ensemble des canaux IM de l’espace (sans identifiants). Permissions : Viewer+.

Réponse : 200 `{"data":[IMChannel]}`

```bash
curl $BASE/api/v1/im-channels -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/im-channels/:id

Rôle : Mettre à jour un canal (mise à jour partielle : `name`, `mode`, `output_mode`, `locale`, `session_mode`, `knowledge_base_id`, `credentials`, `enabled`, `agent_id` — tous optionnels ; chaîne vide pour `knowledge_base_id` dissocie la base ; chaîne vide pour `locale` rétablit la langue par défaut). Permissions : Admin+.

Réponse : 200 `{"data":{IMChannel}}`

```bash
curl -X PUT $BASE/api/v1/im-channels/ch-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"enabled":false}'
```

### DELETE /api/v1/im-channels/:id

Rôle : Supprimer un canal. Permissions : Admin+.

Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/im-channels/ch-1 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/im-channels/:id/toggle

Rôle : Activer ou désactiver le canal. Permissions : Admin+. Sans corps de requête.

Réponse : 200 `{"data":{IMChannel}}`

```bash
curl -X POST $BASE/api/v1/im-channels/ch-1/toggle -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/wechat/qrcode

Rôle : Générer un QR code de connexion WeChat (lier un compte WeChat personnel à l’espace). Permissions : Admin+. Sans corps de requête. Handler : `internal/handler/wechat_qrcode.go`

Réponse : 200 `{"data":{"qrcode_url","qrcode"}}`

```bash
curl -X POST $BASE/api/v1/wechat/qrcode -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/wechat/qrcode/status

Rôle : Interroger l’état du scan ; renvoie les identifiants après confirmation. Permissions : Admin+. Corps : `{"qrcode":"<identifiant>"}` (obligatoire).

Réponse : 200 `{"data":{"status":"pending|scanned|confirmed|expired","credentials":{bot_token,ilink_bot_id,ilink_user_id,baseurl}}}`

```bash
curl -X POST $BASE/api/v1/wechat/qrcode/status -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"qrcode":"qr-1"}'
```

## Gestion des canaux Embed (authentification requise)

Clé API : `manage_channels` ou full-access. Handler : `internal/handler/embed_channel.go`

### POST /api/v1/agents/:id/embed-channels

Rôle : Créer un canal d’intégration Web pour un agent. Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | non | Nom |
| `enabled` | bool | non | Défaut true |
| `allowed_origins` | []string | oui | Au moins une origine (URL exacte / `*.domain` ; `*` interdit en production) |
| `welcome_message` | string | non | Message d’accueil |
| `rate_limit_per_minute` | int | non | Par IP et minute, défaut 30 |
| `rate_limit_per_day` | int | non | Par canal et jour, défaut 10000 |
| `primary_color` / `page_title` / `widget_position` | string | non | Apparence (`widget_position` : `bottom-right` par défaut, etc.) |
| `header_title_mode` | string | non | `channel` (défaut) / `session` |
| `show_suggested_questions` | bool | non | Défaut true |
| `allow_web_search` / `allow_file_upload` | bool | non | Défaut false |
| `default_locale` | string | non | `zh-CN` / `en-US` / `ko-KR` / `ja-JP` / `ru-RU` / vide (langue du navigateur) |
| `webhook_url` / `webhook_secret` | string | non | Webhook d’événements visiteur |
| `agent_id` | string | non | Agent lié |

Réponse : 201 `{"success":true,"data":{embedChannelResponse incluant publish_token}}`

```bash
curl -X POST $BASE/api/v1/agents/agent-1/embed-channels -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Support site","allowed_origins":["https://example.com"]}'
```

### GET /api/v1/agents/:id/embed-channels

Rôle : Liste des canaux Embed d’un agent. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":[embedChannelResponse]}`

```bash
curl $BASE/api/v1/agents/agent-1/embed-channels -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/embed-channels

Rôle : Liste des canaux Embed de l’espace (sans publish token). Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":[embedChannelResponse]}`

```bash
curl $BASE/api/v1/embed-channels -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/embed-channels/:channel_id

Rôle : Détail du canal (incluant publish token, pour copier le code de déploiement). Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{embedChannelResponse}}`

```bash
curl $BASE/api/v1/embed-channels/ec-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/embed-channels/:channel_id

Rôle : Mettre à jour le canal (mêmes champs que la création, tous optionnels). Permissions : Admin+.

Réponse : 200 `{"success":true,"data":{embedChannelResponse}}`

```bash
curl -X PUT $BASE/api/v1/embed-channels/ec-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"enabled":false}'
```

### DELETE /api/v1/embed-channels/:channel_id

Rôle : Supprimer le canal. Permissions : Admin+.

Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/embed-channels/ec-1 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/embed-channels/:channel_id/rotate-token

Rôle : Faire tourner le publish token (l’ancien token devient invalide). Permissions : Admin+. Sans corps de requête.

Réponse : 200 `{"success":true,"data":{embedChannelResponse incluant le nouveau publish_token}}`

```bash
curl -X POST $BASE/api/v1/embed-channels/ec-1/rotate-token -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/embed-channels/:channel_id/preview-session

Rôle : Émettre un session token de courte durée pour l’aperçu admin (sans publish token). Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{"session_token","expires_in"}}` ; 403 si le canal est désactivé.

```bash
curl -X POST $BASE/api/v1/embed-channels/ec-1/preview-session -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/embed-channels/:channel_id/stats

Rôle : Statistiques d’usage du canal. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{"session_count":N}}`

```bash
curl $BASE/api/v1/embed-channels/ec-1/stats -H "Authorization: Bearer $TOKEN"
```

## Politique de cadre pour les pages Embed

### GET /api/v1/embed-frame-policy

Rôle : Pour une sous-requête Nginx `auth_request` avant de servir la page `/embed/:channel_id`, renvoie l’en-tête `Content-Security-Policy: frame-ancestors` du canal. Sans token ; uniquement l’en-tête de politique, pas la configuration du canal ; réponse `Cache-Control: no-store`.

| En-tête | Obligatoire | Description |
| --- | --- | --- |
| `X-Embed-Page-URI` | oui | URI relative de la page embed, ex. `/embed/<channel_id>` |

Réponse : 204 avec en-têtes CSP ; 403 si le canal n’existe pas, est désactivé, le chemin est invalide ou la liste blanche est vide.

```bash
curl -i $BASE/api/v1/embed-frame-policy -H "X-Embed-Page-URI: /embed/ec-1"
```

## Routes publiques Embed (`/api/v1/embed/:channel_id`, EmbedAuth)

Authentification : `Authorization: Embed <publish_token|session_token>` ; opérations au niveau session : en-tête `X-Embed-Session: <sig>`. Limitation de débit et contrôle Origin : voir la vue d’ensemble API. Handler : `internal/handler/embed_channel.go` ; middleware : `internal/middleware/embed_auth.go`

Ci-dessous, `$ET` désigne l’en-tête de token Embed : `-H "Authorization: Embed $EMBED_TOKEN"`.

### POST /api/v1/embed/:channel_id/exchange

Rôle : Échanger un publish token contre un session token de courte durée (un session token ne peut pas être rééchangé). Sans corps de requête.

Réponse : 200 `{"success":true,"data":{"session_token","expires_in"}}`

```bash
curl -X POST $BASE/api/v1/embed/ec-1/exchange -H "Authorization: Embed $PUBLISH_TOKEN"
```

### GET /api/v1/embed/:channel_id/config

Rôle : Configuration publique du canal (sans secrets).

Réponse : 200 `{"success":true,"data":{channel_id,name,display_title,knowledge_base_ids,agent_id,agent_name,welcome_message,primary_color,widget_position,allow_web_search,allow_file_upload,default_locale,...}}`

```bash
curl $BASE/api/v1/embed/ec-1/config -H "Authorization: Embed $EMBED_TOKEN"
```

### GET /api/v1/embed/:channel_id/suggested-questions

Rôle : Questions suggérées initiales. Paramètre de requête : `limit` (≤ 12).

Réponse : 200 `{"success":true,"data":{"questions":[...]}}`

```bash
curl "$BASE/api/v1/embed/ec-1/suggested-questions?limit=6" -H "Authorization: Embed $EMBED_TOKEN"
```

### GET /api/v1/embed/:channel_id/chunks/:chunk_id

Rôle : Consulter un fragment cité (contenu masqué ; 403 en cas d’accès non autorisé).

Réponse : 200 `{"success":true,"data":{chunk}}`

```bash
curl $BASE/api/v1/embed/ec-1/chunks/c-1 -H "Authorization: Embed $EMBED_TOKEN"
```

### POST /api/v1/embed/:channel_id/sessions

Rôle : Créer une session visiteur ; renvoie l’ID de session et la signature. Sans corps de requête.

Réponse : 201 `{"success":true,"data":{"id":"<session_id>","sig":"<signature>"}}`

```bash
curl -X POST $BASE/api/v1/embed/ec-1/sessions -H "Authorization: Embed $EMBED_TOKEN"
```

### POST /api/v1/embed/:channel_id/knowledge-chat/:session_id

Rôle : Q&R connaissances visiteur (SSE ; le corps est adapté aux contraintes du canal puis délégué à KnowledgeQA). Requiert `X-Embed-Session`. Corps identique à `/knowledge-chat` (`query` obligatoire).

```bash
curl -N -X POST $BASE/api/v1/embed/ec-1/knowledge-chat/s-1 \
  -H "Authorization: Embed $EMBED_TOKEN" -H "X-Embed-Session: $SIG" \
  -H 'Content-Type: application/json' -d '{"query":"Horaires d''ouverture ?"}'
```

### POST /api/v1/embed/:channel_id/agent-chat/:session_id

Rôle : Chat agent visiteur (SSE). Requiert `X-Embed-Session`. Même corps que ci-dessus.

```bash
curl -N -X POST $BASE/api/v1/embed/ec-1/agent-chat/s-1 \
  -H "Authorization: Embed $EMBED_TOKEN" -H "X-Embed-Session: $SIG" \
  -H 'Content-Type: application/json' -d '{"query":"Passer une commande"}'
```

### GET /api/v1/embed/:channel_id/messages/:session_id/load

Rôle : Charger les messages de la session visiteur (délègue `LoadMessages` ; paramètres `limit` / `before_time`). Requiert `X-Embed-Session`.

Réponse : 200 `{"success":true,"data":[Message]}`

```bash
curl "$BASE/api/v1/embed/ec-1/messages/s-1/load?limit=20" \
  -H "Authorization: Embed $EMBED_TOKEN" -H "X-Embed-Session: $SIG"
```

### POST /api/v1/embed/:channel_id/sessions/:session_id/stop

Rôle : Arrêter la génération (délègue StopSession ; corps `{"message_id":"..."}`). Requiert `X-Embed-Session`.

```bash
curl -X POST $BASE/api/v1/embed/ec-1/sessions/s-1/stop \
  -H "Authorization: Embed $EMBED_TOKEN" -H "X-Embed-Session: $SIG" \
  -H 'Content-Type: application/json' -d '{"message_id":"m-1"}'
```

### GET|POST /api/v1/embed/:channel_id/sessions/:session_id/messages/:message_id/suggestions

Rôle : Lire ou déclencher la génération de suggestions de message (`suppressed` si le canal les désactive). Requiert `X-Embed-Session`.

Réponse : 200 `{"success":true,"data":{"status","questions":[...]}}`

```bash
curl $BASE/api/v1/embed/ec-1/sessions/s-1/messages/m-1/suggestions \
  -H "Authorization: Embed $EMBED_TOKEN" -H "X-Embed-Session: $SIG"
```

### POST /api/v1/embed/:channel_id/sessions/:session_id/suggestion-events

Rôle : Enregistrer un événement d’interaction sur une suggestion (délègue RecordEvent, mêmes champs que la version authentifiée). Requiert `X-Embed-Session`. Réponse : 204.

```bash
curl -X POST $BASE/api/v1/embed/ec-1/sessions/s-1/suggestion-events \
  -H "Authorization: Embed $EMBED_TOKEN" -H "X-Embed-Session: $SIG" \
  -H 'Content-Type: application/json' -d '{"suggestion_set_id":"ss-1","event_type":"impression"}'
```

### POST /api/v1/embed/:channel_id/sessions/:session_id/events

Rôle : Transmettre un événement visiteur au webhook du canal. Requiert `X-Embed-Session`.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `type` | string | oui | `message_sent` / `message_received` |
| `query` / `content` | string | non | Question utilisateur / réponse du bot |

Réponse : 200 `{"success":true}` ; 400 si le type n’est pas pris en charge.

```bash
curl -X POST $BASE/api/v1/embed/ec-1/sessions/s-1/events \
  -H "Authorization: Embed $EMBED_TOKEN" -H "X-Embed-Session: $SIG" \
  -H 'Content-Type: application/json' -d '{"type":"message_sent","query":"Bonjour"}'
```

### OAuth MCP et approbation d’outils (côté visiteur)

Les routes suivantes requièrent toutes `X-Embed-Session` et délèguent aux handlers authentifiés (`internal/handler/mcp_oauth.go`, `internal/handler/mcp_service.go`) :

| Méthode + chemin | Rôle |
| --- | --- |
| `POST /api/v1/embed/:channel_id/sessions/:session_id/mcp-oauth-resolutions/:pending_id` | Reprendre une exécution suspendue OAuth (corps : `service_id` obligatoire, `decision` optionnel) |
| `POST /api/v1/embed/:channel_id/sessions/:session_id/mcp-oauth-resolutions/:pending_id/cancel` | Annuler le flux OAuth |
| `POST /api/v1/embed/:channel_id/sessions/:session_id/mcp-services/:id/oauth/authorize-url` | Générer l’URL d’autorisation (corps : `redirect_uri` obligatoire) |
| `GET /api/v1/embed/:channel_id/sessions/:session_id/mcp-services/:id/oauth/status` | État de l’autorisation |
| `POST /api/v1/embed/:channel_id/sessions/:session_id/tool-approvals/:pending_id` | Approbation d’outil (corps : `decision` obligatoire) |

```bash
curl -X POST $BASE/api/v1/embed/ec-1/sessions/s-1/tool-approvals/p-1 \
  -H "Authorization: Embed $EMBED_TOKEN" -H "X-Embed-Session: $SIG" \
  -H 'Content-Type: application/json' -d '{"decision":"approve"}'
```

### GET /api/v1/embed/:channel_id/files

Rôle : Proxy d’images côté visiteur (images inline dans les réponses du bot ; EmbedAuth injecte l’espace du canal, le handler impose un chemin du même espace). Paramètre de requête : `file_path` (obligatoire).

Réponse : 200 flux fichier.

```bash
curl "$BASE/api/v1/embed/ec-1/files?file_path=local://1/exports/chart.png" \
  -H "Authorization: Embed $EMBED_TOKEN" -o chart.png
```

## Service de fichiers

Implémenté dans `internal/router/files.go` (hors package handler).

### GET /files

Rôle : Proxy de fichiers unifié après authentification (local / MinIO / COS / TOS, etc.). Permissions : tout membre authentifié de l’espace ; clé API non limitée aux KB (full-access ou retrieve sur tout l’espace, `middleware.AllowFileServeAPIKey()`) ; chemin limité au même espace (`ValidateStoragePathTenant`).

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `file_path` | string | oui | Chemin `provider://...` (`..` interdit ; autre espace → 403) |

Réponse : 200 flux fichier (`X-Content-Type-Options: nosniff` ; types hors liste blanche forcés en `Content-Disposition: attachment`).

```bash
curl "$BASE/files?file_path=local://1/docs/a.png" -H "Authorization: Bearer $TOKEN" -o a.png
```

### GET|HEAD /api/v1/files/presigned

Rôle : Accès fichier par URL signée HMAC (images inline sur plateformes IM ; sans authentification, vérification signature + expiration, `SYSTEM_AES_KEY` dans la signature).

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `file_path` | string | oui | Chemin de stockage |
| `tenant_id` | uint64 | oui | ID d’espace |
| `expires` | string | oui | Horodatage Unix d’expiration |
| `sig` | string | oui | Signature HMAC |

Réponse : 200 flux fichier (HEAD : en-têtes seulement) ; 403 si signature invalide ou expirée.

```bash
curl "$BASE/api/v1/files/presigned?file_path=local://1/x.png&tenant_id=1&expires=1790000000&sig=abc" -o x.png
```

### GET /api/v1/files/presigned-preview

Rôle : Point de diagnostic : renvoie l’URL HTTP présignée qui serait générée pour un chemin donné. Permissions : Admin+ ; clés API refusées explicitement (`DenyAPIKeyPrincipal`). Paramètre de requête : `file_path` (obligatoire).

`file_path` doit appartenir à l’espace courant, comme pour `/files` : les handles `resource://` exigent une ressource de l’espace ; les chemins de stockage exigent un segment locataire égal à l’ID de l’espace ; sinon 403, aucune URL n’est émise.

Réponse : 200 `{"file_path","provider","url","rewritten":bool,"hint"}`

```bash
curl "$BASE/api/v1/files/presigned-preview?file_path=local://1/x.png" -H "Authorization: Bearer $TOKEN"
```

### GET|HEAD /r/:token

Rôle : URL d’autorisation de ressource à courte durée (clients IM sans en-tête d’authentification). Sans authentification ; le token est le droit d’accès ; 404 si invalide ou expiré.

Réponse : 200 flux fichier (`Cache-Control: private, max-age=300`).

```bash
curl $BASE/r/abc123 -o file.png
```

## Référence d’implémentation

Enregistrement des routes : `RegisterIMRoutes`, `RegisterIMChannelRoutes`, `RegisterEmbedChannelRoutes`, `RegisterEmbedPublicRoutes` dans `internal/router/routes_agent.go` ; `serveFilesWithResources`, `servePresignedFiles`, `servePresignedPreview`, `serveResourceGrants` dans `internal/router/files.go`. Handlers : `internal/handler/im.go`, `internal/handler/wechat_qrcode.go`, `internal/handler/embed_channel.go`.
