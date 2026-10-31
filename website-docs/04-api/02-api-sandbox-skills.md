# Référence API : sandbox, skills et variables personnelles

Gestion des configurations sandbox, du catalogue de skills, des tâches d’installation, du terminal interactif de session et des variables d’environnement personnelles. Les chemins sont préfixés par `/api/v1` ; dans les exemples, `$BASE` est l’adresse du service et `$TOKEN` le Bearer token de l’utilisateur courant. Les étapes côté interface sont décrites dans [Catalogue de skills et sandbox](../03-features/22-skills-sandbox.md).

## Permissions

| Ressource | Lecture | Écriture / test |
| --- | --- | --- |
| Liste / détail des configs sandbox | Viewer+ ; clé API full-access obligatoire | Admin+ ; clé API full-access obligatoire |
| Inventaire des sandboxes, skills installés et fichiers | Admin+ | Admin+ ; clé API full-access obligatoire |
| Catalogue de skills | Viewer+, JWT | Ajout/suppression catalogue, installation, fichiers du paquet : Admin+ ; clé API du groupe écriture full-access obligatoire |
| Skills disponibles `/skills` | Viewer+, JWT | Lecture seule ; paramètre `sandbox_config_id` ; agent partagé : aussi `agent_id`, `agent_source_tenant_id` |
| Terminal interactif de session | Propriétaire de la session, JWT connecté uniquement | Établir WebSocket après obtention du ticket |
| `/me/env-vars*` | Appelant connecté courant | Modifier uniquement soi-même ; identité déduite côté serveur ; pas de seuil admin supplémentaire ; Bearer JWT |

Un ID d’un autre espace n’accorde pas l’accès. Les interfaces de variables personnelles ne remplacent pas la gestion des skills au niveau espace.

## Configurations sandbox

| Méthode | Chemin | Requête / réponse |
| --- | --- | --- |
| GET | `/sandbox-configs` | 200 `{success,data:[ConfigResponse],workspace_scripts_disabled}` |
| POST | `/sandbox-configs` | `{name,description?,config}` ; 201 `{success,data:ConfigResponse}` |
| GET | `/sandbox-configs/:id` | 200 `{success,data:ConfigResponse}` |
| PUT | `/sandbox-configs/:id` | `{name,description?,config}`, `name` obligatoire ; 200 identique au détail |
| DELETE | `/sandbox-configs/:id` | optionnel `force=true` ; 200 `{success:true}` |
| GET | `/sandbox-configs/:id/sandboxes` | 200 `{success,data:SandboxInventory}`, occupation et agents associés |
| PUT | `/sandbox-configs/workspace-policy` | `{"scripts_disabled":true}` ; retourne success / workspace_scripts_disabled |
| POST | `/sandbox-configs/templates/query` | `{config,config_id?,ensure_standard?,replace_standard?,ensure_desktop?,replace_desktop?}` ; interroge les modèles distants, peut créer/remplacer modèle standard ou bureau ; `replace` exige `config_id` |

ConfigResponse : `{id,name,description,sandbox_type,config,created_at,updated_at}`, credentials masqués. À l’édition, mise à jour à partir de la config enregistrée ; les valeurs placeholder masquées conservent les anciens identifiants ; `skill_image` est maintenu par le service d’installation, le client ne peut pas le remplacer.

### Champs `config`

| Champ | Type | Description |
| --- | --- | --- |
| `sandbox_type` | string | docker/cube/e2b ; local retiré ; l’hôte du bureau Lite ne peut pas être enregistré comme config |
| `default_timeout_sec` | int | Timeout d’exécution ; 0 = défaut intégré |
| `terminal_idle_disconnect_sec` | int | Délai sans activité avant déconnexion terminal/bureau ; 0 = 900 s par défaut ; plage effective 60 s–24 h |
| `desktop_enabled` | bool | Indique que le modèle choisi est un modèle bureau Cube/E2B ; ne peut pas basculer après installation de skills |
| `allow_private_endpoints` | bool | Autorise les adresses de cluster privées ; n’autorise pas link-local / métadonnées cloud |
| `env_vars` | map[string]string | Environnement de cette config sandbox ; valeurs chiffrées à l’enregistrement |
| `skill_rollout` | string | next_turn (défaut) / new_session ; sans effet si `allocation_mode=user` ; les machines partagées existantes gardent toujours l’image courante |
| `allocation_mode` | string | session (défaut, une machine par session) / user (partagée par utilisateur) ; n’affecte que la première allocation, ne migre pas les sessions existantes |
| `network` | object | Politique réseau Cube/E2B, voir ci-dessous |
| `cube` / `e2b` / `docker` | object | Config de connexion selon `sandbox_type` |
| `volume_mount` | object | Config de volume optionnelle ; l’effet dépend des capacités backend, la seule présence du champ ne prouve pas le support |
| `skill_image` | object | Infos snapshot maintenues par le service d’installation, lecture seule |

Les champs `volume_mount` incluent enabled, mount_path, provider, volume_id, volume_name ; `volume_owner_fingerprint` est géré côté serveur. Le montage dépend de la config volume et du support backend ; à l’édition, conserver les infos de propriété renvoyées par le serveur.

Configuration backend :

| Backend | Champs |
| --- | --- |
| cube | api_url, proxy_url, sandbox_domain, template_id ; api_key selon le cluster ; http_timeout_sec, cube_sandbox_ttl_seconds, dns_servers |
| e2b | api_key, template_id obligatoires ; api_url, sandbox_domain, proxy_url pour auto-hébergement ; http_timeout_sec, e2b_sandbox_ttl_seconds |
| docker | image obligatoire ; host (vide = socket local), tls_cert_path (obligatoire en TCP), cpu_limit, memory_limit_mb, pids_limit, network_mode (bridge/none), runtime, idle_ttl_seconds, http_timeout_sec |

```bash
curl -X POST "$BASE/api/v1/sandbox-configs" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"E2B dev","config":{"sandbox_type":"e2b","e2b":{"api_key":"<e2b-key>","template_id":"<template-id>"}}}'

curl "$BASE/api/v1/sandbox-configs/cfg-1/sandboxes" \
  -H "Authorization: Bearer $TOKEN"
```

La modification de l’identité backend et la suppression de config vérifient les instances distantes. En 409, `error.code` peut être `sandboxes_still_live`, `sandbox_inventory_unverifiable`, `skill_snapshot_release_failed`, etc. ; 423 = config en cours de modification par une autre requête. `force=true` n’est autorisé à la suppression que si l’inventaire est invérifiable ; n’ignore pas les instances actives/en pause confirmées. Les données d’occupation dans la réponse aident à localiser sessions et agents concernés.

### Politique réseau

`network` :

| Champ | Description |
| --- | --- |
| `deny_egress_by_default` | false = sortie autorisée par défaut ; true = refus par défaut |
| `allow_out` | IPv4/CIDR/domaine ou domaine wildcard à un label ; domaines pour le mode refus par défaut |
| `deny_out` | Liste de refus IPv4/CIDR |
| `cube_rules` | Règles Cube name/scheme/sni/host/methods/path/deny/audit/inject ; l’ordre compte |
| `e2b_host_rules` | Règles E2B host/headers ; host doit aussi figurer dans allow_out |
| `allow_public_inbound` | Entrée legacy ; effacé à l’enregistrement ; l’entrée exige toujours des credentials |

`cube_rules[].inject` : `[{header,secret,format}]` ; `e2b_host_rules[].headers` : header→secret ; champs secret chiffrés et masqués. Docker utilise `docker.network_mode`, sans ces règles L7.

```json
{
  "deny_egress_by_default": true,
  "allow_out": ["pypi.org", "files.pythonhosted.org"],
  "deny_out": []
}
```

### POST /system/sandbox-check

Corps `{config,config_id?,deep?}` ; `config_id` peut restaurer des credentials masqués enregistrés. `deep=false` : test de connexion ; `true` exécute aussi un script temporaire ; le backend distant crée et détruit une sandbox (usage backend possible).

Succès de la sonde : `{success:true,data:{ok,provider,checks,capabilities}}` ; échec de sonde possible en HTTP 200 — vérifier `data.ok` ; erreur de paramètres : 400 avec code/msg. Chaque check : name/ok/message/reason/latency_ms ; `ok=null` = ignoré. Ex. : sonde Internet ignorée par la politique en refus sortie par défaut ≠ validation d’accès Internet réussi.

```bash
curl -X POST "$BASE/api/v1/system/sandbox-check" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"config_id":"cfg-1","deep":true}'
```

## Catalogue de skills

| Méthode | Chemin | Requête / réponse |
| --- | --- | --- |
| GET | `/skills/catalog` | 200 `{success,data:[CatalogItem]}` ; CatalogItem inclut `installations:[{sandbox_config_id,status,enabled,version,bundle_sha256,served?,...}]` |
| POST | `/skills/catalog` | multipart `file` ou JSON `{"source":"@owner/slug"}` ; 201 `{success,data:{id,name,version,description}}` |
| POST | `/skills/catalog/:id/install` | `{"sandbox_config_ids":["cfg-1","cfg-2"]}` ; 202 `{success,data:{installs,errors?}}` |
| GET | `/skills/catalog/:id/files` | 200 `{success,data:[FileEntry]}` |
| GET | `/skills/catalog/:id/files/content?path=SKILL.md` | 200 `{success,data:FileContent}` |
| DELETE | `/skills/catalog/:id` | Suppression sans références d’installation ; 200 `{success:true}` |

Installation sur plusieurs sandboxes : acceptation partielle possible — vérifier `data.installs` et `data.errors` ; HTTP 202 n’implique pas que toutes les installations soient terminées. Supprimer du catalogue ne désinstalle pas implicitement sur chaque sandbox.

```bash
curl -X POST "$BASE/api/v1/skills/catalog" \
  -H "Authorization: Bearer $TOKEN" -F 'file=@skill.zip'
curl -X POST "$BASE/api/v1/skills/catalog/catalog-1/install" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"sandbox_config_ids":["cfg-1"]}'
```

Formats de source, exigences de téléchargement anonyme et limites ZIP : [Sources de skills](../03-features/22-skills-sandbox.md#sources-supportees).

## Skills dans la sandbox {#skills-dans-la-sandbox}

Préfixe `/sandbox-configs/:id/skills` ; toutes les opérations, y compris lecture, exigent Admin+.

| Méthode | Suffixe | Comportement |
| --- | --- | --- |
| GET | (vide) | `{success,data:[SkillResponse]}` |
| POST | (vide) | Installation ZIP ou JSON source ; 202 `{success,data:{skill_id}}` |
| GET | `/:skillId` | `{success,data:SkillResponse}` |
| POST | `/:skillId/reinstall` | Réinstallation avec le même paquet ; optionnel `{"instructions":"..."}` (≤10000 caractères) comme consignes d’installation ; 202 `{success,data:{skill_id}}` |
| POST | `/:skillId/stop` | Arrêter l’installation ; 200 retourne l’état du skill ; rappelable si déjà failed ; autres états non installing refusés |
| GET | `/:skillId/guidance` | Consignes de l’installation en cours : `{success,data:{accepting,messages:[{id,content,status}]}}` |
| POST | `/:skillId/guidance` | Ajouter une consigne pendant l’installation `{expected_message_id,steer_id,content}` : `expected_message_id` depuis `install_message_id` du SkillResponse ; `steer_id` UUID client (retry sans doublon) ; `content` 1–10000 caractères ; 202 `{success:true}` ; 409 si l’installation a changé de tour |
| PATCH | `/:skillId` | `enabled?`, `envs?` ; omission = pas de modification |
| DELETE | `/:skillId` | Désinstallation de cette sandbox ; le paquet catalogue est conservé |
| GET | `/:skillId/files` | Liste des fichiers |
| GET | `/:skillId/files/content?path=SKILL.md` | Fichier chemin relatif ; traversal refusé |
| GET | `/:skillId/install-events` | SSE progression d’installation |
| GET | `/:skillId/transcript` | SSE événements du processus d’installation |

SkillResponse : id/name/version/description/enabled/status/error/bundle_sha256/installed_snapshot_id/install_session_id/install_message_id/created_at/updated_at, plus `envs:[{name,description,required,is_set}]`. Pendant upgrade/réinstallation ou après échec, `served:{version}` indique la dernière version prête encore servie par la sandbox ; les skills utilisables par l’agent suivent cette version. Réponse fichier : texte UTF-8, petite image en base64 ou métadonnées binaires — ne pas supposer du texte pour tous les fichiers.

PATCH `envs` : met à jour uniquement les variables déclarées ; noms non déclarés ignorés ; chaîne vide efface la valeur en conservant la déclaration.

```bash
curl -X PATCH "$BASE/api/v1/sandbox-configs/cfg-1/skills/skill-1" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"enabled":true,"envs":{"API_TOKEN":"<workspace-token>"}}'

curl -N "$BASE/api/v1/sandbox-configs/cfg-1/skills/skill-1/install-events" \
  -H "Authorization: Bearer $TOKEN"
```

Charge de progression : `{percent,stage,log?,status?,done}`. Déconnexion n’annule pas l’installation ; `done` peut signifier seulement impossibilité de suivre la progression — l’état final est `status` du skill. Sans Redis, le flux invite à interroger l’état. Transcript 204 = installation vient de démarrer, événements pas encore prêts ; 404 = pas de journal ou journal expiré — ne pas en déduire un échec d’installation.

`GET /skills?sandbox_config_id=cfg-1` retourne les métadonnées skills utilisables par l’agent `{success,data:[{name,description}],skills_available}`, distinct de la liste complète des installations visible par l’admin.

L’assistant appelle cette interface via `skill.list` avec le `sandbox_config_id` renvoyé par `agent.get` (peut être vide) ; projection uniquement de `name`, `description` et `skills_available` — pas les paramètres d’agent partagé ni les interfaces de gestion des skills. ID de config vide : liste vide et `skills_available:false` ; inviter l’utilisateur à choisir une sandbox dans l’éditeur d’agent ; pour configurer un skill, utiliser le `name` retourné, pas l’ID d’enregistrement d’installation.

Avec `agent_id` et `agent_source_tenant_id` (ID espace source de l’agent partagé) : liste les skills @mentionnables pour cet agent partagé ; la config sandbox vient de l’agent lui-même, `sandbox_config_id` en query ignoré ; périmètre skills `selected` : seulement les skills indiqués ; désactivé : liste vide et `skills_available:false`. 403 si l’appelant ne peut pas utiliser cet agent.

## Terminal interactif de session {#terminal-interactif-de-session}

Le terminal du panneau latéral de dialogue se connecte en WebSocket à la sandbox distante de la session ; Cube/E2B uniquement. Route enregistrée par `internal/router/routes_chat.go`, pas encore dans Swagger ; bureau : [API session](02-api-chat.md#sandbox-desktop) ; exigences proxy : [Déploiement sandbox](../06-development/04-sandbox-deployment.md#terminal-interactif-et-bureau-graphique).

### POST /api/v1/sessions/:session_id/sandbox/terminal-ticket

Émet un ticket de poignée de main valide deux minutes. Requiert le Bearer access token connecté du propriétaire de session ; clé API interdite.

```bash
curl -X POST "$BASE/api/v1/sessions/$SESSION_ID/sandbox/terminal-ticket" \
  -H "Authorization: Bearer $TOKEN"
```

Réponse : 200 `{"success":true,"data":{"ticket":"<ticket>","expires_in":120}}`.

### GET /api/v1/sessions/:id/sandbox/terminal

Poignée de main WebSocket, sans middleware d’auth classique :

| Paramètre query | Obligatoire | Description |
| --- | --- | --- |
| `ticket` | oui | Ticket de l’étape précédente, lié à utilisateur, espace, session et access token à l’émission |
| `provision` | non | `1` autorise création ou réveil sandbox (facturation possible) ; omis = connexion uniquement à une sandbox en cours d’exécution |
| `agent_id` / `agent_source_tenant_id` | non | Avec `provision=1`, précise selon quel agent (y compris partagé) créer la sandbox |
| `cols` / `rows` | non | Taille initiale du terminal |
| `pty_id` | non | Reprendre le processus shell renvoyé par la trame `ready` |

Après connexion, trames binaires bidirectionnelles pour E/S terminal ; trames texte JSON de contrôle : serveur envoie `ready` (avec `pty_id`, `backend`, `reattachable`), `exited` (avec `exit_code`) et `error` ; client peut envoyer `{"type":"resize","cols":..,"rows":..}`. Si `reattachable` est `false` (Docker), pas de `pty_id`, déconnexion termine le shell — le client ne doit pas se reconnecter automatiquement. Codes d’erreur : `SANDBOX_NOT_BOUND`, `SANDBOX_PAUSED`, `SANDBOX_STOPPED` (backend Docker sans pause : conteneur arrêté ou récupéré par idle), `TERMINAL_UNSUPPORTED`, `IDLE_DISCONNECTED`, `AUTH_REVOKED`, `INTERNAL`. Maximum 5 terminaux simultanés par session ; au-delà 429.

## Répertoire projet hôte Lite

Uniquement en édition bureau Lite ; autres déploiements 404. Ouvre sur la machine qui exécute Lite une boîte de dialogue système de choix de dossier ; le dossier choisi rejoint la liste approuvée ; à la création de session, passer le `dir` retourné comme `project_dir` pour utiliser ce dossier dans la [sandbox hôte](../03-features/22-skills-sandbox.md#lite-host). Champ `project_dir` : [API session](02-api-chat.md).

| Méthode | Chemin | Requête / réponse |
| --- | --- | --- |
| POST | `/system/host-project-dir` | Sans corps ; 200 `{"code":0,"msg":"success","data":{"dir":"/Users/me/project"}}`, `dir` vide si annulation. JWT connecté uniquement, Viewer+ ; clé API refusée |

## Variables d’environnement personnelles {#variables-denvironnement-personnelles}

L’identité de l’appelant est déterminée par le contexte d’auth courant ; pas de `user_id` en entrée. Les interfaces personnelles renvoient noms, source et horodatage de mise à jour, pas les valeurs en clair.

| Méthode | Chemin | Requête |
| --- | --- | --- |
| GET | `/me/env-vars` | Variables de config et de skill groupées par `sandbox_config_id` |
| PUT | `/me/env-vars/skill` | `{skill_id,name,value}`, nom doit être déclaré par le skill |
| DELETE | `/me/env-vars/skill` | `{skill_id,name}` |
| PUT | `/me/env-vars/sandbox` | `{sandbox_config_id,name,value}` |
| DELETE | `/me/env-vars/sandbox` | `{sandbox_config_id,name}` |

Lecture : `{success,data:[{sandbox_config_id,sandbox_config_name,description,vars,skills}]`, source indique user/workspace/unset, etc. Succès pour set/delete ; 404 si suppression d’une entrée non définie. Variables sandbox personnelles : refus du préfixe WEKNORA_ et noms réservés comme PATH ; variables déclarées par skill peuvent utiliser les noms WEKNORA_* requis.

```bash
curl -X PUT "$BASE/api/v1/me/env-vars/skill" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"skill_id":"skill-1","name":"API_TOKEN","value":"<my-token>"}'

curl -X DELETE "$BASE/api/v1/me/env-vars/skill" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"skill_id":"skill-1","name":"API_TOKEN"}'
```

Ordre de priorité : valeur skill personnelle > valeur sandbox personnelle > valeur skill espace. Écrire une valeur personnelle ne modifie pas la config admin. Référence d’implémentation : `internal/router/routes_infra.go`, `routes_agent.go`, `routes_auth_tenant.go`, et `internal/handler/sandbox_config.go`, `sandbox_skill.go`, `skill_catalog.go`, `me_env_var.go`, `host_project_picker.go`.
