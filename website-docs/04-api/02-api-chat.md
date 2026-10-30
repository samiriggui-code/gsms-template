# Référence API : sessions, messages et chat

Créer et gérer des sessions, lire les messages et les pièces jointes temporaires, et obtenir des réponses de Q&R sur la base de connaissances ou d’agents via SSE.

Les sessions sont des ressources « privées à l’utilisateur » : le handler impose la vérification de propriété en interne ; la couche route exige Viewer+. Clé API : sessions/chat nécessitent la capability `chat` (ou full-access) ; la recherche dans l’historique des messages nécessite `message_history` ; la recherche documentaire nécessite `retrieve`.


## Sessions assistant, permissions et tâches d’arrière-plan {#assistant-runtime}

Le `kind=assistant` d’une session sert à l’assistant intégré ; l’historique des sessions assistant est géré séparément du chat ordinaire. Ne pas passer un ID de session ordinaire à l’entrée de reprise de l’assistant. Les sessions d’automatisation sont créées par le système et liées à une tâche.

Les requêtes de chat assistant utilisent `assistant_access` (`read_only` / `confirm` / `auto_write`), plafonné par les limites assistant de l’espace ; les agents ordinaires n’utilisent pas ce champ de requête, leur configuration passe par `config.access_level`. Les réponses d’approbation passent par `POST /api/v1/agent/prompts/:prompt_id` ; la consultation et la révocation des autorisations disponibles passent par `/api/v1/agent/grants`. Voir [Permissions d’exécution](../03-features/28-agent-permissions.md).

| Méthode et chemin | Rôle |
| --- | --- |
| `GET /api/v1/sessions/:id/background-work` | Lister les tâches d’arrière-plan d’une session |
| `GET /api/v1/sessions/:id/background-work/:work_id` | État et sortie d’une tâche |
| `POST /api/v1/sessions/:session_id/background-work/:work_id/cancel` | Annuler une tâche |

Les endpoints continuent de vérifier l’accès à la session. `work_id` identifie une tâche d’arrière-plan, pas un PID de terminal ni un ID d’exécution d’automatisation.

## Sessions (`/api/v1/sessions`)

### POST /api/v1/sessions

Rôle : Créer une session. Handler : `internal/handler/session/handler.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `title` | string | non | Titre |
| `kind` | string | non | Vide (défaut) = session ordinaire ; `assistant` = session assistant WeKnora ; toute autre valeur → 400 |
| `description` | string | non | Description |
| `project_dir` | string | non | Desktop uniquement : lier la session à un répertoire de projet local approuvé par l’utilisateur (chemin absolu, doit correspondre exactement à la liste approuvée), sinon 400 |

Réponse : 201 `{"success":true,"data":{Session}}` (`id,kind,title,description,tenant_id,user_id,is_pinned,last_request_state,created_at,...`)

```bash
curl -X POST $BASE/api/v1/sessions -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' -d '{"title":"Nouvelle conversation"}'
```

### GET /api/v1/sessions

Rôle : Lister les sessions. Handler : `internal/handler/session/handler.go`

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `page` / `page_size` | int | non | Pagination |
| `keyword` | string | non | Recherche floue sur le titre |
| `kind` | string | non | Absent ou vide : uniquement les sessions ordinaires, toutes sources ; `assistant` : uniquement les sessions assistant de l’appelant (même un admin ne peut pas voir celles d’un autre utilisateur), tri `updated_at DESC` ; autre valeur → 400 |
| `source` | string | non | Filtre de source (web/embed/api/feishu/wechat/slack/...) |
| `agent_id` | string | non | Filtrer par agent (sessions IM) |

Réponse : 200 `{"success":true,"data":[SessionListItem],"total","page","page_size"}`

```bash
curl "$BASE/api/v1/sessions?page=1" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/sessions/:id

Rôle : Détail d’une session.

Réponse : 200 `{"success":true,"data":{Session}}`

```bash
curl $BASE/api/v1/sessions/s-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/sessions/:id

Rôle : Mettre à jour une session (titre / description / épinglage). Corps : `title`, `description`, `is_pinned` (tous optionnels).

Réponse : 200 `{"success":true,"data":{Session}}`

```bash
curl -X PUT $BASE/api/v1/sessions/s-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"Renommer"}'
```

### DELETE /api/v1/sessions/:id

Rôle : Supprimer une session.

Réponse : 200 `{"success":true,"message":"Session deleted successfully"}`

```bash
curl -X DELETE $BASE/api/v1/sessions/s-1 -H "Authorization: Bearer $TOKEN"
```

### DELETE /api/v1/sessions/batch

Rôle : Supprimer des sessions en lot. `delete_all:true` conserve les sessions assistant ; la suppression par ID suit les règles de propriété habituelles. Corps : `{"ids":["s-1"],"delete_all":false}` (l’un ou l’autre : `ids` ou `delete_all:true`).

Réponse : 200 `{"success":true,"message":"Sessions deleted successfully"}`

```bash
curl -X DELETE $BASE/api/v1/sessions/batch -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"ids":["s-1","s-2"]}'
```

### DELETE /api/v1/sessions/:id/messages

Rôle : Vider les messages d’une session.

Réponse : 200 `{"success":true,"message":"Session messages cleared successfully"}`

```bash
curl -X DELETE $BASE/api/v1/sessions/s-1/messages -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/sessions/:session_id/generate_title

Rôle : Générer un titre de session à partir de messages de contexte. Handler : `internal/handler/session/title.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `messages` | []Message | oui (`binding:"required"`) | Messages servant de contexte |

Réponse : 200 `{"success":true,"data":"Titre genere"}`

```bash
curl -X POST $BASE/api/v1/sessions/s-1/generate_title -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Presentez le produit"}]}'
```

### POST /api/v1/sessions/:session_id/stop

Rôle : Arrêter une réponse en cours de génération. Handler : `internal/handler/session/stream.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `message_id` | string | oui (`binding:"required"`) | ID du message assistant |

Réponse : 200 `{"success":true,"message":"Generation stopped"}`

```bash
curl -X POST $BASE/api/v1/sessions/s-1/stop -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"message_id":"m-1"}'
```

À l’arrêt, les messages d’appoint non encore remis à l’agent (voir [Ajouter un message à une réponse en cours](#steer) ci-dessous) sont également abandonnés ; aucun nouveau tour ne démarre automatiquement.

### POST /api/v1/sessions/:session_id/fork

Rôle : Forker une nouvelle session à partir d’un message historique ; la session source reste inchangée. Seul le propriétaire de la session peut forker. Handler : `internal/handler/session/fork.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `message_id` | string | oui | Point de fork. Message utilisateur : copie l’historique avant ce message (le client préremplit souvent la question dans le champ de saisie) ; message assistant : copie l’historique jusqu’à cette réponse |
| `title` | string | non | Titre de la nouvelle session, défaut « Titre source (branche) » |

Les messages copiés conservent la chronologie et les fichiers générés ; la nouvelle session enregistre `parent_session_id` et `forked_from_message_id`. Si la session source est liée à un sandbox, le système prend un instantané ; à la première utilisation du sandbox dans la nouvelle session, l’espace de travail repart de l’état du tour correspondant au point de fork. Si l’espace de travail ne peut pas être emporté, le fork réussit quand même mais renvoie `degraded: true` et une raison :

| `reason` | Signification |
| --- | --- |
| `NO_CHECKPOINT` | Aucun point de contrôle d’espace de travail avant le point de fork |
| `SANDBOX_REPLACED` | Le point de contrôle appartient à un ancien sandbox remplacé |
| `SANDBOX_GONE` | La session source n’a pas de sandbox snapshotable |
| `SNAPSHOT_UNSUPPORTED` | Le backend sandbox ne supporte pas l’instantané ou l’instantané a échoué |

Réponse : 200 `{"success":true,"data":{"session_id":"nouvelle-session-id","degraded":false}}`. 409 (`code: FORK_SOURCE_BUSY`) si la session source génère encore ou si le point de fork est une réponse incomplète ; 404 si session ou message introuvable ; 400 si le point de fork n’est ni un message utilisateur ni assistant.

```bash
curl -X POST $BASE/api/v1/sessions/s-1/fork -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"message_id":"m-3"}'
```

### POST /api/v1/sessions/:session_id/rewind

Rôle : Revenir in place dans la session courante jusqu’à un message. Seul le propriétaire peut rewinder. Handler : `internal/handler/session/rewind.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `message_id` | string | oui | Point de retour. Message utilisateur : supprime ce message et les suivants ; message assistant : conserve cette réponse, supprime les suivants |

Les fichiers générés, suggestions de relance et index d’historique de chat des messages supprimés sont nettoyés. Si la session est liée à un sandbox, `/workspace` est réinitialisé au point de contrôle du dernier tour conservé ; si la réinitialisation de l’espace de travail échoue, toute l’opération échoue et les messages ne sont pas supprimés.

Réponse : 200 `{"success":true,"data":{"deleted_messages":N,"workspace_reset":true,"reason":""}}`. Si `workspace_reset` est false, `reason` indique pourquoi seul le dialogue a été remonté : `NO_SANDBOX` (pas de sandbox lié) ou `NO_CHECKPOINT` (aucun point de contrôle dans l’historique conservé).

| Code HTTP | `code` | Signification |
| --- | --- | --- |
| 409 | `REWIND_SOURCE_BUSY` | Session en génération, ou point de retour = réponse incomplète |
| 409 | `REWIND_NO_CHECKPOINT` | Sandbox présent mais aucun point de contrôle utilisable dans l’historique conservé ; refus pour éviter que les fichiers avancent par rapport au dialogue |
| 409 | `REWIND_SANDBOX_REPLACED` | Point de contrôle d’un ancien sandbox remplacé |
| 404 | — | Session ou message introuvable |
| 500 | — | Échec de réinitialisation de l’espace de travail, réessayer |

```bash
curl -X POST $BASE/api/v1/sessions/s-1/rewind -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"message_id":"m-3"}'
```

### Ajouter un message à une réponse en cours (steer) {#steer}

Pendant la génération d’une réponse en mode raisonnement intelligent, un second appel `agent-chat` sur la même session renvoie 409. Les endpoints ci-dessous permettent d’enfiler un nouveau message dans le tour courant. Réservé au propriétaire de la session ; la Q&R rapide n’a pas de boucle d’exécution injectable, donc pas de steer. Handler : `internal/handler/session/steer.go`

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| POST | `/api/v1/sessions/:session_id/steer` | Ajouter un message |
| GET | `/api/v1/sessions/:id/steer` | Lister les messages en file non encore remis pour le tour courant (restaurer la file après rechargement) ; renvoie `assistant_message_id` et `items[]` (`steer_id`, `content`, `delivery`, `mentioned_items`) ; `items` vide s’il n’y a pas de tour actif |
| DELETE | `/api/v1/sessions/:id/steer/:steer_id` | Retirer un message en file |
| POST | `/api/v1/sessions/:session_id/steer/:steer_id/inject` | Passer un message `after` en `inject` |

Corps POST :

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `query` | string | oui | Contenu du message, max. 10 000 caractères |
| `delivery` | string | non | `after` (défaut) : envoyé comme question du tour suivant après la fin du tour courant ; `inject` : remis à l’agent à la prochaine frontière d’itération (y compris juste avant la réponse finale), l’agent ajuste puis continue |
| `mentioned_items` | []object | non | Mentions @, même format que la requête de chat |
| `steer_id` | string | non | UUID côté client pour dédupliquer les retries ; 409 si le même ID avec un contenu différent |
| `expected_assistant_message_id` | string | non | ID du message assistant en cours côté client ; 409 si le tour a changé, le client doit réessayer |
| `channel` | string | non | Canal source |

`status` dans la réponse :

| `status` | Signification |
| --- | --- |
| `queued` | En file ; renvoie `steer_id`, `delivery` et `assistant_message_id` |
| `new_run` | Aucun tour actif ; le client doit envoyer via un appel `agent-chat` normal |
| `already_injected` | Message déjà remis à l’agent (retry, retrait ou passage en inject) ; impossible à retirer |
| `deleted` / `gone` | DELETE uniquement : retiré (`removed` indique si une entrée a bien été supprimée) / pas de tour actif |

Max. 10 messages non remis en file par tour ; au-delà → 400. À la fin normale du tour, le premier message non remis démarre le tour suivant côté serveur ; les autres suivent leur mode de livraison dans ce tour. Ce tour n’a pas de connexion `agent-chat` associée : utiliser `assistant_message_id` de `GET /steer` avec continue-stream. Si l’utilisateur arrête la génération, tous les messages non remis sont abandonnés. Les messages remis sont écrits dans l’historique et notifiés via `user_message_injected`. 503 si la lecture de l’état du tour échoue (réessayer).

```bash
curl -X POST $BASE/api/v1/sessions/s-1/steer -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"query":"Donnees 2024 uniquement","delivery":"inject"}'
```

### POST /api/v1/sessions/:session_id/pin et DELETE /api/v1/sessions/:id/pin

Rôle : Épingler / désépingler une session. Sans corps. Handler : `internal/handler/session/handler.go`

Réponse : 200 `{"success":true,"is_pinned":true|false}`

```bash
curl -X POST $BASE/api/v1/sessions/s-1/pin -H "Authorization: Bearer $TOKEN"
curl -X DELETE $BASE/api/v1/sessions/s-1/pin -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/sessions/continue-stream/:session_id

Rôle : Reprendre un flux actif après coupure (rejouer les événements stockés + polling des deltas toutes les 100 ms). Handler : `internal/handler/session/stream.go`

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `message_id` | string | oui | ID du message assistant à reprendre |

Réponse : 200 SSE (`text/event-stream`, format des événements : voir [vue d’ensemble API](./01-api-overview.md) section protocole stream). Lors du rejeu des événements stockés, les deltas consécutifs non terminés `answer`/`thinking`/`reflection` sous le même ID d’événement sont fusionnés en une frame ; le texte cumulé par ID d’événement côté client reste identique ; la partie push temps réel n’est pas fusionnée.

```bash
curl -N "$BASE/api/v1/sessions/continue-stream/s-1?message_id=m-1" -H "Authorization: Bearer $TOKEN"
```

## Bureau graphique sandbox {#sandbox-desktop}

Ces routes sont enregistrées dans `internal/router/routes_chat.go` et ne sont pas encore dans Swagger. Supportées uniquement avec les modèles de bureau Cube/E2B ; déploiement et proxy : voir [Déploiement sandbox](../06-development/04-sandbox-deployment.md).

### POST /api/v1/sessions/:session_id/sandbox/desktop-ticket

Émet un ticket WebSocket à usage unique, valide deux minutes. Requiert un Bearer access token de connexion valide du propriétaire de la session ; une clé API seule ne suffit pas. Le JWT ne va que dans l’en-tête d’authentification de ce POST.

```bash
curl -X POST "$BASE/api/v1/sessions/$SESSION_ID/sandbox/desktop-ticket" \
  -H "Authorization: Bearer $TOKEN"
```

Réponse : 200 `{"success":true,"data":{"ticket":"<opaque-ticket>","expires_in":120}}`.

### GET /api/v1/sessions/:id/sandbox/desktop

Poignée de main WebSocket avec `?ticket=<opaque-ticket>`, sans le middleware JWT habituel. Le ticket est lié à l’utilisateur, l’espace, la session et l’access token d’origine ; usage unique puis invalidation ; ticket utilisé, expiré ou inconnu → refus. Les logs proxy ne doivent pas enregistrer le query `ticket`.

Une seule relais par session à la fois. Sandbox non lié, en pause, bureau non supporté ou échec de démarrage, etc. : l’upgrade WebSocket peut se terminer puis la connexion se ferme avec une raison du type `SANDBOX_NOT_BOUND`, `SANDBOX_PAUSED`, `DESKTOP_UNSUPPORTED`, `DESKTOP_START_FAILED` ; le client doit lire la raison de fermeture.

### POST /api/v1/sessions/:session_id/sandbox/desktop/activity

Le propriétaire signale activité clavier/souris ; réponse 200 `{"success":true}`. Sert au renouvellement uniquement si le parseur RFB côté serveur est en mode dégradé ; ignoré si le parseur est normal — ne pas prolonger la durée de vie du sandbox par polling.

## Pièces jointes de session (documents temporaires)

Handler : `internal/handler/session/temporary_document.go`

### POST /api/v1/sessions/:session_id/attachments

Rôle : Téléverser et enregistrer une pièce jointe de session. Après enregistrement, mise en file d’analyse en arrière-plan ; fin d’upload ≠ document prêt. Q&R rapide : attend les analyses incomplètes après ouverture du flux de réponse ; raisonnement intelligent : lecture du corps via `read_file` à la demande, attente uniquement à la lecture. Images seules : attente de readiness si l’upload d’images est activé. Multipart : `file` (obligatoire), `agent_id` (optionnel, moteur d’analyse / modèle ASR), `parser_engine` (optionnel ; ignoré avec un agent partagé, règles de l’agent).

Réponse : 202 `{"success":true,"data":{TemporaryDocument}}` (`id,session_id,file_name,file_type,file_size,status(uploaded/processing/ready/failed),resource_ref,...`)

```bash
curl -X POST $BASE/api/v1/sessions/s-1/attachments -H "Authorization: Bearer $TOKEN" -F 'file=@notes.pdf'
```

`uploaded` est un état stocké utilisable pour envoyer une question ; le client ne doit pas exiger `ready` avant de permettre la question. Tant qu’une pièce est référencée par un message de session valide (y compris fork), elle n’est pas purgée par le TTL par défaut de 24 h ; seuls les fichiers non référencés expirés sont nettoyés en arrière-plan.

### GET /api/v1/sessions/:id/attachments

Rôle : Lister les pièces jointes.

Réponse : 200 `{"success":true,"data":[TemporaryDocument]}`

```bash
curl $BASE/api/v1/sessions/s-1/attachments -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/sessions/:id/attachments/:attachment_id

Rôle : Détail d’une pièce jointe (état d’analyse inclus).

Réponse : 200 `{"success":true,"data":{TemporaryDocument}}`

```bash
curl $BASE/api/v1/sessions/s-1/attachments/a-1 -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/sessions/:id/attachments/:attachment_id/preview

Rôle : Aperçu du fichier original.

Réponse : 200 flux fichier (`Content-Disposition: inline|attachment`, `Cache-Control: private`).

```bash
curl $BASE/api/v1/sessions/s-1/attachments/a-1/preview -H "Authorization: Bearer $TOKEN" -o preview.pdf
```

### DELETE /api/v1/sessions/:id/attachments/:attachment_id

Rôle : Supprimer une pièce jointe.

Réponse : 204 No Content

```bash
curl -X DELETE $BASE/api/v1/sessions/s-1/attachments/a-1 -H "Authorization: Bearer $TOKEN"
```

## Suggestions de réponses (Suggestions)

Handler : `internal/handler/message_suggestion.go`

### GET /api/v1/sessions/:id/messages/:message_id/suggestions

Rôle : Lire les suggestions de relance pour un message assistant.

Réponse : 200 `{"success":true,"data":{MessageSuggestionSet}}` (`status(generating/ready/suppressed/failed),questions:[{id,text,category,source,knowledge_base_ids}],allow_regenerate,...`)

```bash
curl $BASE/api/v1/sessions/s-1/messages/m-1/suggestions -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/sessions/:session_id/messages/:message_id/suggestions

Rôle : Déclencher la génération de suggestions (idempotent). Corps : `{"regenerate":true}` (optionnel, force la regénération).

Réponse : 200 (prêt) ou 202 (en cours) `{"success":true,"data":{MessageSuggestionSet|null}}`

```bash
curl -X POST $BASE/api/v1/sessions/s-1/messages/m-1/suggestions -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{}'
```

### POST /api/v1/sessions/:session_id/suggestion-events

Rôle : Remonter des événements d’interaction sur les suggestions (analytics).

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `suggestion_set_id` | string | oui (`binding:"required"`) | ID du jeu de suggestions |
| `question_id` | string | non | Obligatoire pour click/regenerate |
| `event_type` | string | oui (`binding:"required"`) | `impression/click/dismiss/regenerate` |

Réponse : 204 No Content

```bash
curl -X POST $BASE/api/v1/sessions/s-1/suggestion-events -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"suggestion_set_id":"ss-1","event_type":"impression"}'
```

## Chat et recherche

Handler : `internal/handler/session/qa.go`. Clé API : chat nécessite `chat`/full ; `knowledge-search` nécessite `retrieve`/full.

### POST /api/v1/knowledge-chat/:session_id

Rôle : Q&R sur base de connaissances (flux SSE).

Corps (partagé KnowledgeQA/AgentQA) :

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `query` | string | en général oui | Question utilisateur ; peut être omise avec `images[].data` ou `attachment_uploads[].data` non vides (question par défaut générée). Seuls `attachment_ids` ou URL d’image ne suffisent pas pour omettre le texte ; caractères invalides ou requête vide → 400 |
| `knowledge_base_ids` | []string | non | Bases à interroger |
| `knowledge_ids` | []string | non | Limiter à certains fichiers |
| `agent_enabled` | bool | non | Activer le mode Agent |
| `agent_id` | string | non | ID d’agent personnalisé |
| `agent_source_tenant_id` | uint64 | non | Espace source d’un agent partagé, pour distinguer des homonymes partagés depuis plusieurs espaces |
| `reasoning_effort` | string | non | Intensité de réflexion pour ce tour : `off`, `auto`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max` (`none`/`false` → `off`, `true`/`on` → `auto`) ; si omis, config de l’agent. Ne s’applique qu’à ce tour ; ajustement automatique si le modèle ne supporte pas le niveau ; valeur invalide → 400 |
| `web_search_enabled` | bool | non | Recherche Web ; effet seulement si l’agent a la recherche Web activée |
| `local_browser_enabled` | bool | non | Autoriser le navigateur local connecté pour ce tour ; uniquement pour `agent-chat` en raisonnement intelligent, sinon 400. Voir [Navigateur local](../05-clients/09-local-browser.md) |
| `summary_model_id` | string | non | Modèle de synthèse ; ignoré avec agent partagé (modèle configuré de l’agent) |
| `mcp_service_ids` | []string | non | Services MCP mentionnés @ |
| `skill_names` | []string | non | Skills mentionnées @ |
| `tag_ids` | []string | non | Filtre par tags |
| `mentioned_items` | []object | non | Mentions @ (type/kb_id/kb_name/service_id/skill_name) |
| `disable_title` | bool | non | Désactiver le titre automatique |
| `images` | []object | non | Images (`data` base64 / `url` / `caption`) |
| `attachment_uploads` | []object | non | Pièces jointes inline (`data` base64, `file_name`, `file_size`) |
| `attachment_ids` | []string | non | IDs de pièces jointes déjà téléversées |
| `channel` | string | non | Canal source |
| `suggestion_attribution` | object | non | Attribution du clic sur une suggestion |
| `question_origin` | object | non | Origine d’une question suggérée cliquée : `knowledge_base_id`, `knowledge_id` optionnel. Mode raisonnement intelligent uniquement ; l’agent interroge d’abord cette source ; ignoré si hors périmètre du tour (sans élargir) |
| `page_context` | object | non | Page courante : `knowledge_base_id`, `knowledge_id` optionnel, `wiki_slug`, `wiki_issue_ids` (max. 20), ou `agent_id`. La base doit être dans le périmètre de recherche du tour ; l’agent est validé séparément (visible dans le tenant, agents intégrés inclus). Parties invalides ignorées, pas d’élargissement des droits |
| `assistant_access` | string | non | Niveau assistant WeKnora : `read_only`, `confirm`, `auto_write`, défaut `confirm`, plafonné par l’espace |

Le `reasoning_effort` choisi est écrit dans `last_request_state.reasoning_effort` de la session pour restauration côté client à la réouverture.

Réponse : 200 flux SSE, `event: message` + `data: StreamResponse` (voir vue d’ensemble), se termine par l’événement `complete`. Si la réponse est tronquée par la limite de sortie du modèle, l’événement `answer` porte `data.truncated: true` ; le contenu déjà généré est conservé.

```bash
curl -N -X POST $BASE/api/v1/knowledge-chat/s-1 -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"query":"Quelle est la politique de remboursement?","knowledge_base_ids":["kb-1"]}'
```

### POST /api/v1/agent-chat/:session_id

Rôle : Q&R Agent (flux SSE, événements `thinking/tool_call/tool_result/tool_approval_required/mcp_oauth_required`, etc.). Même corps que ci-dessus.

- Échec d’outil : événement `tool_result` (`data.success: false`, `data.error` = raison) ; l’agent continue ; l’événement `error` = échec de tout le tour.
- Message d’appoint reçu en cours de route : `user_message_injected` ; pendant l’exécution de commandes, `command_output` met à jour la carte outil.
- 409 si une réponse en raisonnement intelligent est déjà en génération sur la session ; utiliser l’[interface steer](#steer).

```bash
curl -N -X POST $BASE/api/v1/agent-chat/s-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"query":"Analyser les donnees du trimestre dernier","agent_id":"agent-1"}'
```

### POST /api/v1/knowledge-search

Rôle : Recherche documentaire sans session (non streamée), interface privilégiée pour les systèmes externes. Même pipeline que la Q&R produit (rappel → rerank → fusion → troncature), ordre identique à l’UI. Choix vs `hybrid-search` : voir [Choix des interfaces de recherche](./01-api-overview.md#retrieval-api). Handler : `SearchKnowledge` dans `internal/handler/session/qa.go`.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `query` | string | oui (`binding:"required"`) | Requête |
| `knowledge_base_id` | string | non | Une base (compatibilité) |
| `knowledge_base_ids` | []string | non | Plusieurs bases |
| `knowledge_ids` | []string | non | Fichiers ciblés, union avec `knowledge_base_id(s)` (voir ci-dessous) |
| `tag_ids` | []string | non | Filtre par tags |
| `mentioned_items` | []object | non | Mentions de tags avec périmètre KB |
| `vector_threshold` / `keyword_threshold` | float | non | Seuils de rappel ; si omis, config de recherche de l’espace (défaut 0,15 / 0,3) |
| `match_count` | int | non | Nombre de résultats, plafond 200 ; si omis, `rerank_top_k` de l’espace (défaut 10). Profondeur de rappel augmentée au minimum à cette valeur |
| `disable_keywords_match` / `disable_vector_match` | bool | non | Désactiver une voie de rappel ; les deux à `true` → 400 |
| `rerank` | object | non | Surcharge rerank ; `{"enabled":false}` désactive le rerank. Champs : [objet rerank](./01-api-overview.md#retrieval-api). Si `rerank.top_k` est aussi fourni, il prime sur `match_count` |

Champs omis : config de recherche de l’espace (`GET /tenants/kv/retrieval-config`) ; sans nouveau champ, comportement inchangé.

Périmètre = union de `knowledge_base_id(s)` et `knowledge_ids`, comme les @ dans le produit : recherche sur toute la base pour chaque KB listée ; fichiers de `knowledge_ids` déjà couverts par ces bases ne sont pas restreints séparément ; fichiers d’autres bases sont ajoutés. **Pour chercher uniquement dans des fichiers précis, ne passer que `knowledge_ids`, pas leurs bases**, sinon toute la base est interrogée.

Réponse : 200 `{"success":true,"data":[SearchResult],"meta":{"rerank":{...}}}`. `SearchResult` : `id,content,knowledge_id,knowledge_title,score,chunk_type,knowledge_base_id,...` ; après rerank, `metadata` inclut `model_score` et `base_score`. Si `data` est vide, voir `meta.rerank.outcome` : [diagnostic meta.rerank](./01-api-overview.md#retrieval-api).

```bash
curl -X POST $BASE/api/v1/knowledge-search -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' -d '{"query":"exigences de deploiement","knowledge_base_ids":["kb-1"]}'

# Rappel vectoriel seul, 5 resultats, rerank desactive
curl -X POST $BASE/api/v1/knowledge-search -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"query":"exigences de deploiement","knowledge_base_ids":["kb-1"],"disable_keywords_match":true,"match_count":5,"rerank":{"enabled":false}}'

# Recherche dans des fichiers precis uniquement (sans knowledge_base_ids)
curl -X POST $BASE/api/v1/knowledge-search -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' -d '{"query":"exigences de deploiement","knowledge_ids":["k-1","k-2"]}'
```

## Messages (`/api/v1/messages`)

Handler : `internal/handler/message.go`

### POST /api/v1/messages/search

Rôle : Recherche dans l’historique de chat. Permissions : Viewer+ ; clé API `message_history`/full.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `query` | string | oui (`binding:"required"`) | Requête |
| `mode` | string | non | `keyword/vector/hybrid` (défaut hybrid) |
| `limit` | int | non | Défaut 20 |
| `session_ids` | []string | non | Limiter à certaines sessions |

Réponse : 200 `{"success":true,"data":{"total":N,"results":[{session_id,message_id,role,content,created_at,score}]}}`

```bash
curl -X POST $BASE/api/v1/messages/search -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"query":"devis"}'
```

### GET /api/v1/messages/chat-history-stats

Rôle : Statistiques d’index de l’historique de chat. Permissions : Viewer+ ; clé API `message_history`/full.

Réponse : 200 `{"success":true,"data":{indexed_message_count,knowledge_base_size,last_indexed_at,...}}`

```bash
curl $BASE/api/v1/messages/chat-history-stats -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/messages/:session_id/load

Rôle : Charger les messages d’une session (pagination vers le passé par curseur temporel). Permissions : Viewer+ ; clé API `chat`/full.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `limit` | int | non | Défaut 20 |
| `before_time` | string | non | Horodatage RFC3339/RFC3339Nano |

Réponse : 200 `{"success":true,"data":[Message]}` (`id,session_id,role,content,is_completed,images,attachments,agent_steps,...`)

```bash
curl "$BASE/api/v1/messages/s-1/load?limit=20" -H "X-API-Key: $API_KEY"
```

### DELETE /api/v1/messages/:session_id/:id

Rôle : Supprimer un message. Permissions : Viewer+ (le handler vérifie la propriété de la session) ; clé API `chat`/full.

Réponse : 200 `{"success":true,"message":"Message deleted successfully"}`

```bash
curl -X DELETE $BASE/api/v1/messages/s-1/m-1 -H "Authorization: Bearer $TOKEN"
```

## Fichiers générés par session

Les endpoints ci-dessous exigent Viewer+, une clé API `chat` ou full-access, et la vérification de propriété de session. Session inexistante ou inaccessible → 404.

| Méthode | Chemin | Réponse |
| --- | --- | --- |
| GET | `/api/v1/sessions/:id/artifacts` | 200 `{success:true,data:[Artifact]}`, agrégation session |
| GET | `/api/v1/sessions/:id/messages/:message_id/artifacts` | Idem, fichiers de ce message uniquement |
| GET | `/api/v1/sessions/:id/messages/:message_id/artifacts/:index/download` | 200 flux fichier, Content-Disposition: attachment |
| DELETE | `/api/v1/sessions/:id/messages/:message_id/artifacts/:index` | 200 `{success:true,data:{file_name,deleted}}`, supprime le fichier |

Champs Artifact : index, handle (référence `resource://` optionnelle), file_name, file_type, file_size, source_path, mod_time, created_at. Pas d’URL de stockage objet dans la réponse. L’index de téléchargement commence à 0 et doit être celui de la liste de messages concernée ; ne pas réutiliser l’index de l’agrégat session pour construire l’URL de téléchargement d’un message. Index invalide → 400 ; hors limites ou fichier absent → 404.

```bash
curl "$BASE/api/v1/sessions/session-1/messages/message-1/artifacts" \
  -H "Authorization: Bearer $TOKEN"
curl "$BASE/api/v1/sessions/session-1/messages/message-1/artifacts/0/download" \
  -H "Authorization: Bearer $TOKEN" -o result.pdf
```

### Supprimer un fichier généré

La suppression récupère les octets dans le stockage objet, **sans retour possible**. Contrairement au téléchargement, réservée au propriétaire de la session : un accès lecture seule via agent partagé permet le téléchargement mais pas la suppression — session non possédée → 404 (pas de distinction « inexistant » / « interdit », comme les autres endpoints session). Fichier déjà supprimé → 404 ; suppression répétée → 404.

Les octets ne sont réellement récupérés que s’il n’y a plus aucun détenteur : même fichier ingéré en base, réutilisé dans une réponse ultérieure, ou session forkée → conservation. Échec de récupération n’empêche pas la suppression (200) ; le fichier disparaît de toutes les listes.

Après suppression, le fichier n’apparaît plus dans les listes ni la bibliothèque de produits, mais **sa place dans le message est conservée** : `index` sert d’adresse de téléchargement ; si les fichiers suivants avancent, les liens existants pointent vers le mauvais fichier. Pour la même raison, un fichier homonyme dans le sandbox n’est pas recollecté au tour suivant — son mtime n’a pas changé à cause de la suppression utilisateur.

| Paramètre | Description |
| --- | --- |
| `all_versions` | Supprimer aussi toutes les versions historiques du même `source_path` dans cette session. Booléen, défaut `false` |

```bash
curl -X DELETE "$BASE/api/v1/sessions/session-1/messages/message-1/artifacts/0" \
  -H "Authorization: Bearer $TOKEN"
```

### Liste de produits inter-sessions

`GET /api/v1/artifacts` liste tous les fichiers générés dans les conversations Web de l’utilisateur courant (panneau « Produits » de l’accueil). Périmètre identique à `source=web` sur la liste des sessions : sessions propres et sessions Web tenant sans propriétaire historique ; pas de sessions IM, embed ni clé API, même si une session IM n’a pas de propriétaire en base. Fichiers de même `source_path` dans une session = versions d’un même fichier ; seule la dernière est renvoyée, `version_count` indique le nombre de versions. Fichiers de sessions ou messages supprimés exclus. Mêmes permissions que le tableau ci-dessus.

| Paramètre | Description |
| --- | --- |
| `keyword` | Filtre sur le nom de fichier, insensible à la casse |
| `file_types` | Extensions séparées par des virgules, ex. `.pdf,.pptx` (point optionnel) |
| `page` / `page_size` | Pagination, `page_size` max. 100, défaut 20 |

Réponse `{success, data:[LibraryArtifact], total, page, page_size}`, tri par date de génération décroissante. LibraryArtifact : session_id, session_title, message_id, index, handle (optionnel), file_name, file_type, file_size, source_path, created_at, version_count. Télécharger via session_id, message_id, index et l’endpoint de téléchargement du tableau ci-dessus.

```bash
curl "$BASE/api/v1/artifacts?file_types=.pptx,.pdf&keyword=rapport&page=1&page_size=30" \
  -H "Authorization: Bearer $TOKEN"
```

`DELETE /api/v1/artifacts` supprime une entrée de la bibliothèque de produits via query `session_id`, `message_id`, `index`, même sémantique que la suppression en session. Différence : `all_versions` vaut `true` par défaut si absent (règles identiques si valeur explicite) : une ligne bibliothèque = un fichier (`version_count` = nombre de versions), pas une génération ; supprimer seulement la dernière version laisse la ligne avec la version précédente. `all_versions=false` pour ne supprimer que la version courante.

```bash
curl -X DELETE "$BASE/api/v1/artifacts?session_id=session-1&message_id=message-1&index=0" \
  -H "Authorization: Bearer $TOKEN"
```

### Images et références de fichiers dans les réponses

`GET /api/v1/sessions/:id/messages/:message_id/files?file_path=...` est un proxy authentifié au niveau message. `file_path` = handle de ressource référencé par le message ou référence de stockage supportée (encoder en URL côté client). Le backend vérifie l’accès au message, la liaison ressource/message et l’accès courant aux bases / agents partagés ; pas d’accès arbitraire par chemin avec seul l’ID de session. Révocation d’autorisation → refus des anciennes références. Cas agents partagés, bases organisation : voir [Accès aux fichiers](../03-features/21-file-access.md).

### Usage par tour

Les messages renvoient un usage persisté ; l’événement de fin Agent porte `turn_usage` (agrégat des appels modèle du tour). Tous les appels d’outils ne consomment pas forcément des tokens ; l’usage suit le retour du fournisseur ou les enregistrements backend. Champs : [Observabilité](../03-features/16-observability.md).

En mode agent, l’événement de fin inclut dans `data.model_id` l’ID du modèle de dialogue réellement exécuté pour ce tour (celui qui produit l’usage), pour récupérer les infos modèle et estimer le coût. Le `model_id` enregistré sur le message est celui lié à la requête ; il diffère si le modèle demandé était invalide et a basculé sur le modèle de l’agent. Q&R rapide : ce champ n’est pas encore présent sur l’événement de fin.

## Référence d’implémentation

Enregistrement des routes : `RegisterSessionRoutes`, `RegisterChatRoutes`, `RegisterMessageRoutes` dans `internal/router/routes_chat.go` (appelés depuis `internal/router/router.go`). Handler : `internal/handler/session/` (handler.go, qa.go, stream.go, title.go, temporary_document.go, fork.go, rewind.go, steer.go, artifact_*.go), `internal/handler/message.go`, `internal/handler/message_suggestion.go`.
