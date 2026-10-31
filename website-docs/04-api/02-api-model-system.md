# Référence API : modèles et initialisation

Gestion des modèles, tests de connectivité, initialisation des bases de connaissances et lancement de tâches d’évaluation. Les points WeKnoraCloud servent à l’intégration du service cloud associé.

Les interfaces d’information système et d’administration plateforme (`/system`, `/system/admin`) sont décrites dans [Système et administration plateforme](./02-api-system.md).

## Modèles (`/api/v1/models`)

Clé API : `manage_models` ou full-access.

### GET /api/v1/models/providers

Rôle : Catalogue des fournisseurs (le front-end s’en sert pour afficher dynamiquement la liste des fournisseurs, les icônes, les champs supplémentaires et le choix de modèle). Permissions : Viewer+. Paramètre de requête : `model_type` (optionnel : `chat` / `embedding` / `rerank` / `vllm` / `asr`, accepte aussi les valeurs back-end comme `KnowledgeQA` ; valeur inconnue → 400) ; s’il est renseigné, seuls les fournisseurs supportant ce type et leurs modèles de ce type sont retournés. Handler : `internal/handler/model_catalog.go`

Réponse : 200 `{"success":true,"data":[ModelProviderDTO]}`, chaque entrée :

| Champ | Description |
| --- | --- |
| `value` / `label` / `labels` / `description` / `descriptions` / `website` | Identifiant fournisseur, nom de marque, libellés et descriptions par langue |
| `icon` | `data:image/svg+xml;base64,...`, utilisable directement dans `<img src>` |
| `api` / `auth` / `requiresAuth` | Protocole par défaut (`openai-completions`, etc.), mode d’authentification, clé requise ou non |
| `defaultUrls` / `modelTypes` | URL par défaut et types supportés par type de modèle. `defaultUrls` n’est renvoyé qu’à Admin+ (ou clé API full-access / `manage_tenant_settings`) ; vide pour les autres appelants |
| `extraFields` | Définition des champs de configuration supplémentaires (`key,label,labels,type,required,default,placeholder,options,model_types,secret`), valeurs stockées dans `parameters.extra_config` |
| `credentialLabels` | Libellés et aides des champs d’identifiants pour certains types (ex. Volcengine, LKEAP rerank : la colonne API Key correspond en réalité à Access Key ID / SecretId) |
| `models` | Catalogue intégré (`id,name,type,api,reasoning,input,context_window,max_output_tokens,dimension,thinking_levels,cost,source`) ; `source` = lien vers la doc fournisseur des paramètres du modèle |
| `thinking` | Résumé du codage « thinking » au niveau fournisseur (`format`, `levels`) |
| `order` | Valeur de tri dans la liste |

```bash
curl "$BASE/api/v1/models/providers?model_type=chat" -H "Authorization: Bearer $TOKEN"
```

### GET|POST /api/v1/models/catalog/resolve

Rôle : Résoudre la configuration d’accès effective (protocole, niveaux de thinking, contexte) à partir du fournisseur, du nom de modèle, de `base_url` et de `extra_config`, pour affichage en temps réel dans l’éditeur de modèle. Permissions : Viewer+.

Paramètres (query en GET, corps JSON en POST, mêmes champs) : `provider` (ID fournisseur), `model`, `base_url`, `model_type` (défaut `chat`), `api`, `thinking_control`, `remote_model_name`, plus les champs supplémentaires non secrets déclarés par le fournisseur (ex. `api_version` pour Azure). Le corps POST peut aussi inclure un objet `spec` (identique à `parameters.spec` du modèle) pour prévisualiser une surcharge d’une ligne du catalogue. Les champs de type secret ne sont jamais acceptés.

Réponse : 200 `{"success":true,"data":{provider,api,remote_model,cataloged,model,capabilities,base_url,url}}`, où `capabilities` vaut `{provider,api,cataloged,reasoning,thinking_levels,thinking_format,input,context_window,max_output_tokens,max_tokens_field}`. `base_url` et `url` (URL de requête effective, renvoyée seulement pour les fournisseurs qui la calculent, ex. Azure) ne sont retournés qu’à Admin+ (ou clé full-access / `manage_tenant_settings`). Échec de résolution → 400. La même structure `capabilities` apparaît aussi dans `ModelResponse.capabilities` pour les modèles distants dialogue / vision.

```bash
curl "$BASE/api/v1/models/catalog/resolve?provider=deepseek&model=deepseek-v4-pro" -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/models

Rôle : Créer un modèle. Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui (`binding:"required"`) | Nom du modèle |
| `display_name` | string | non | Nom affiché |
| `type` | string | oui (`binding:"required"`) | Type : `KnowledgeQA` / `Embedding` / `Rerank` / `VLLM` / `ASR` (enregistré tel quel ; pas d’alias front-end comme `chat`) |
| `source` | string | oui (`binding:"required"`) | Source (`local` / `remote`) |
| `description` | string | non | Description |
| `parameters` | object | oui (`binding:"required"`) | Paramètres de connexion (`base_url`, `provider`, `extra_config`, `spec`, `context_window`, etc. — voir [Gestion des modèles](../03-features/06-models.md#champs-de-configuration-du-modèle)). À la création, `api_key` / `app_secret` peuvent être fournis ; ensuite, modification via la sous-ressource credentials |

`parameters` est validé contre le catalogue (protocole inconnu, clé compat invalide, niveau de thinking illégal → 400) ; `base_url` passe la validation SSRF.

Pour les déploiements auto-hébergés `generic` / `Qwen3-VL-Embedding`, les entrées indépendantes sont envoyées par lot via `messages` en 2D par défaut (validé avec vLLM 0.29.0) ; une seule entrée conserve le format de conversation 1D. Le texte est découpé selon `BATCH_EMBED_SIZE` ; la taille de lot d’images par défaut est 5 (limite conservative côté client), ajustable via `parameters.spec.compat.max_image_batch_size`. L’analyse à l’upload planifie toujours une image par tâche, sans fusion inter-tâches. Si le service ne supporte pas `messages` 2D, `parameters.spec.compat.batch_messages=false` rétablit les requêtes unitaires ; le preset WeMM-Embedding active aussi le batch par conversation par défaut ; les autres modèles sans ce preset doivent l’activer explicitement.

Le batch préserve le contenu de conversation et le mapping d’index de vecteur par entrée, sans garantir une identité bit à bit des calculs côté serveur entre tailles de lot. Pour une reproductibilité stricte, valider le comportement numérique du déploiement ; le mode [Batch Invariance](https://docs.vllm.ai/en/v0.29.0/features/batch_invariance/) de vLLM doit être activé côté serveur et vérifié pour le modèle réel. Avec `WEKNORA_EMBEDDING_TEST_URL` et `WEKNORA_EMBEDDING_TEST_FIXTURE`, exécuter `go test ./internal/models/embedding -run '^TestLiveQwenMessagesBatchParity$' -v -count=1` : fixture `{"texts":[...],"image_paths":[...]}` avec au moins deux textes et deux images ; endpoints privés/IP : `SSRF_WHITELIST` ; auth : `WEKNORA_EMBEDDING_TEST_API_KEY`. Le test compare requêtes unitaires, batch, ordre inversé et répétitions unitaires, enregistre l’erreur absolue max et la similarité cosinus minimale ; échec si seuils stricts dépassés ; n’écrit pas dans la base de connaissances.

Réponse : 201 `{"success":true,"data":{ModelResponse}}` (`id,name,type,source,parameters,is_default,is_builtin,status,credentials,capabilities,...` ; pas de secrets dans la réponse)

```bash
curl -X POST $BASE/api/v1/models -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"gpt-5.5","type":"KnowledgeQA","source":"remote","parameters":{"provider":"openai","base_url":"https://api.openai.com/v1","api_key":"sk-..."}}'
```

### GET /api/v1/models

Rôle : Lister les modèles. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":[ModelResponse]}`

```bash
curl $BASE/api/v1/models -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/models/:id

Rôle : Détail d’un modèle. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{ModelResponse}}`

```bash
curl $BASE/api/v1/models/m-1 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/models/:id/copy

Rôle : Dupliquer la configuration d’un modèle non intégré dans l’espace courant. Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `display_name` | string | oui (`binding:"required"`) | Nom affiché de la copie ; non vide après trim, max. 255 caractères |

Le serveur charge la config complète via l’ID source dans le chemin : la copie garde le même `name` que la source, copie `type`, `source`, `description`, `parameters` et identifiants enregistrés ; pas de resoumission client. La copie n’hérite pas du statut intégré ou par défaut ; un modèle local déjà activé n’est pas retéléchargé ; les autres modèles locaux non activés reprennent le flux de téléchargement.

Réponse : 201 `{"success":true,"data":{ModelResponse}}` (sans secrets)

Source absente → 404 ; source intégrée, ID ou `display_name` invalide → 400.

```bash
curl -X POST $BASE/api/v1/models/m-1/copy -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"display_name":"Copie GPT-4o"}'
```

### POST /api/v1/models/:id/debug

Rôle : Déboguer un modèle enregistré (appel réel amont, facturable). Permissions : Admin+. Champs form-data : `input` (≤ 64 Ko), `options` (JSON : `system_prompt`, `temperature` (0~2), `top_p`, `max_tokens` (1~8192), `thinking`, `reasoning_effort` (`off` / `auto` / `minimal` / `low` / `medium` / `high` / `xhigh` / `max`, remplace `thinking` si défini), `documents` (tableau JSON, ≤ 100 entrées), `file` (optionnel).

Réponse : 200 `{"success":true,"data":{"ok",elapsed_ms,request,raw_response,observations,error}}`

```bash
curl -X POST $BASE/api/v1/models/m-1/debug -H "Authorization: Bearer $TOKEN" -F 'input=Bonjour'
```

### PUT /api/v1/models/:id

Rôle : Mettre à jour un modèle (modèles intégrés restreints à SystemAdmin côté service). Permissions : Admin+ ou SystemAdmin (`AdminOrSystemAdmin`). Corps : `name`, `display_name` (pointeur), `description`, `parameters` (secrets existants conservés), `source`, `type` (tous optionnels).

Réponse : 200 `{"success":true,"data":{ModelResponse}}`

```bash
curl -X PUT $BASE/api/v1/models/m-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"display_name":"GPT-4o mini"}'
```

### DELETE /api/v1/models/:id

Rôle : Supprimer un modèle. Permissions : Admin+.

Réponse : 200 `{"success":true,"message":"Model deleted"}`

Si le modèle est encore référencé par une base de connaissances, un agent ou la mémoire à long terme de l’espace courant → HTTP 400 ; message legacy conservé, avec `error.code=2300` et `error.details` listant objets et emplacements :

```json
{
  "success": false,
  "error": {
    "code": 2300,
    "message": "model is used by 2 knowledge base(s); reconfigure or remove those references before deleting",
    "details": {
      "knowledge_bases": [
        {"id": "kb-1", "name": "Product docs", "bindings": ["vlm_model"]},
        {"id": "kb-2", "name": "Engineering", "bindings": ["vlm_model"]}
      ],
      "agents": [],
      "long_term_memory": {"bindings": []},
      "knowledge_base_total": 2,
      "agent_total": 0
    }
  }
}
```

Bindings base de connaissances : `embedding_model`, `summary_model`, `image_processing_model`, `vlm_model`, `asr_model`, `wiki_synthesis_model`, `auto_tag_model` ; agent : `chat_model`, `rerank_model`, `vlm_model`, `asr_model`, `query_understand_model`, `follow_up_model` ; mémoire long terme : `embedding_model`, `extract_model`. Détails : `id`, `name`, `bindings` fusionnés, plus `knowledge_base_total` / `agent_total`. Listes plafonnées à 50 entrées chacune ; la garde de suppression se base sur les totaux.

```bash
curl -X DELETE $BASE/api/v1/models/m-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/models/:id/credentials

Rôle : Définir les secrets du modèle (non transmis via le PUT principal). Permissions : Admin+ ou SystemAdmin. Handler : `internal/handler/model_credentials.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `api_key` | *string | non | Nouvelle clé API |
| `app_secret` | *string | non | Nouveau secret d’application (si les deux sont omis, retourne seulement l’état) |

Réponse : 200 `{"success":true,"data":{"fields":{"api_key":{"configured":bool},"app_secret":{"configured":bool}}}}`

```bash
curl -X PUT $BASE/api/v1/models/m-1/credentials -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"api_key":"sk-..."}'
```

### DELETE /api/v1/models/:id/credentials/:field

Rôle : Supprimer un champ secret (`api_key` ou `app_secret`). Permissions : Admin+ ou SystemAdmin.

Réponse : 204 No Content

```bash
curl -X DELETE $BASE/api/v1/models/m-1/credentials/api_key -H "Authorization: Bearer $TOKEN"
```

## WeKnoraCloud

Handler : `internal/handler/weknoracloud.go`. Clé API : `manage_models` / full.

### POST /api/v1/weknoracloud/credentials

Rôle : Enregistrer les identifiants SaaS WeKnoraCloud. Permissions : Admin+. Corps : `{"app_id":"...","app_secret":"..."}` (tous `binding:"required"`).

Réponse : 200 `{"success":true,"message":"Identifiants enregistrés"}`

```bash
curl -X POST $BASE/api/v1/weknoracloud/credentials -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"app_id":"app","app_secret":"secret"}'
```

### GET /api/v1/models/weknoracloud/status

Rôle : Sonde d’état de préparation WeKnoraCloud. Permissions : Viewer+.

Réponse : 200, objet d’état du service.

```bash
curl $BASE/api/v1/models/weknoracloud/status -H "Authorization: Bearer $TOKEN"
```

## Initialisation (`/api/v1/initialization`)

Handler : `internal/handler/initialization.go`. Config KB : clé API `manage_kbs` (écriture) / `retrieve` (lecture) ; tests de modèles : `manage_models` (ou full-access).

### GET /api/v1/initialization/config/:kbId

Rôle : Lire la config modèles / parsing actuelle de la KB. Permissions : Viewer+, lecture KB.

Le `baseUrl` des modèles n’est retourné qu’à Admin+ de l’espace propriétaire de la KB (ou clé full-access / `manage_tenant_settings`). Un espace accédant via partage organisation ne voit que si les identifiants sont configurés (`credentials.*`), pas les URL de modèles ni buckets de l’espace source.

Réponse : 200 `{"success":true,"data":{"hasFiles",llm,embedding,rerank,multimodal,documentSplitting,nodeExtract,questionGeneration}}`

```bash
curl $BASE/api/v1/initialization/config/kb-1 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/initialization/initialize/:kbId

Rôle : Initialiser modèles et parsing de la KB (assistant de première config). Permissions : créateur de la KB OU Admin+, écriture KB.

Seul l’espace propriétaire de la KB peut appeler ; un espace avec droit d’édition via partage org → 403. Si la KB a déjà des modèles liés, l’interface met à jour leur config sur place, ce qui exige les mêmes droits que `PUT /models/:id` (Admin+ ou clé API `manage_models`), sinon 403.

Champs principaux (`InitializationRequest`) :

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `llm.source` / `llm.modelName` | string | oui | Source et nom du LLM |
| `llm.baseUrl` / `llm.apiKey` | string | non | Paramètres de connexion |
| `embedding.source` / `embedding.modelName` | string | oui | Modèle d’embedding |
| `embedding.baseUrl` / `embedding.apiKey` / `embedding.dimension` | — | non | Connexion et dimension |
| `rerank.enabled` + `rerank.modelName/baseUrl/apiKey` | — | non | Config rerank |
| `multimodal.enabled` + `multimodal.vlm.*` + `multimodal.storageType` + `multimodal.cos.*\|minio.*` | — | non | Multimodal et stockage d’images |
| `documentSplitting.chunkSize` / `separators` | int / []string | oui | Découpage |
| `documentSplitting.chunkOverlap` | int | non | Chevauchement |
| `nodeExtract.*` | — | non | Extraction graphe (`enabled`, `text`, `tags`, `nodes`, `relations`) |
| `questionGeneration.*` | — | non | Génération de questions (`enabled`, `questionCount`) |

Réponse : 200 `{"success":true,"message":"Configuration de la base mise à jour","data":{"models":[Model],"knowledge_base":{KnowledgeBase}}}`

```bash
curl -X POST $BASE/api/v1/initialization/initialize/kb-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"llm":{"source":"remote","modelName":"gpt-4o-mini"},"embedding":{"source":"remote","modelName":"text-embedding-3-small"},"documentSplitting":{"chunkSize":512,"separators":["\n\n"]}}'
```

### PUT /api/v1/initialization/config/:kbId

Rôle : Mettre à jour modèles / découpage KB (`KBModelConfigRequest` : `llmModelId` obligatoire ; `embeddingModelId`, `vlm_config`, `asr_config`, `documentSplitting.*`, `multimodal.enabled`, `storageProvider`, `storageBackendId`, `nodeExtract.*`, `questionGeneration.*` optionnels). Permissions : créateur KB OU Admin+, écriture KB.

Via partage org : rôle effectif admin requis ; un éditeur ne peut modifier que le contenu, pas les paramètres (403). Liaison stockage (`storageBackendId` / `storageProvider`) : modifiable uniquement par l’espace propriétaire ; autre espace avec valeur différente de l’actuelle → 403.

Réponse : 200 `{"success":true,"message":"Configuration mise à jour"}`

```bash
curl -X PUT $BASE/api/v1/initialization/config/kb-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"llmModelId":"m-1","embeddingModelId":"m-2"}'
```

### GET /api/v1/initialization/ollama/status

Rôle : Sonde de disponibilité Ollama. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{"available","version","baseUrl","error"}}`

```bash
curl $BASE/api/v1/initialization/ollama/status -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/initialization/ollama/models

Rôle : Lister les modèles Ollama locaux. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{"models":[...]}}`

```bash
curl $BASE/api/v1/initialization/ollama/models -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/initialization/ollama/models/check

Rôle : Vérifier en lot si des modèles existent. Permissions : Admin+. Corps : `{"models":["llama3"]}` (`binding:"required"`).

Réponse : 200 `{"success":true,"data":{"models":{"llama3":true}}}`

```bash
curl -X POST $BASE/api/v1/initialization/ollama/models/check -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"models":["llama3"]}'
```

### POST /api/v1/initialization/ollama/models/download

Rôle : Télécharger un modèle Ollama (tâche asynchrone). Permissions : Admin+. Corps : `{"modelName":"llama3"}` (`binding:"required"`).

Réponse : 200 `{"success":true,"data":{"taskId","modelName","status","progress"}}`

```bash
curl -X POST $BASE/api/v1/initialization/ollama/models/download -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"modelName":"llama3"}'
```

### GET /api/v1/initialization/ollama/download/progress/:taskId

Rôle : Progression d’un téléchargement. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":{id,modelName,status,progress,message,startTime,endTime}}`

```bash
curl $BASE/api/v1/initialization/ollama/download/progress/task-1 -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/initialization/ollama/download/tasks

Rôle : Liste de toutes les tâches de téléchargement. Permissions : Viewer+.

Réponse : 200 `{"success":true,"data":[DownloadTask]}`

```bash
curl $BASE/api/v1/initialization/ollama/download/tasks -H "Authorization: Bearer $TOKEN"
```

### Tests de connectivité modèle (tous POST, permissions Admin+)

Corps unifié `ModelTestRequest` :

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `source` | string | non | Défaut `remote` |
| `modelName` | string | oui | Nom du modèle |
| `baseUrl` / `apiKey` / `appSecret` | string | non | Connexion |
| `provider` / `interfaceType` | string | non | Fournisseur / type d’interface |
| `dimension` / `supportsDimensionOverride` | int / bool | non | Dimension embedding ; forcer la dimension dans la requête |
| `customHeaders` / `extraConfig` | map | non | Extensions |
| `spec` | object | non | Surcharge d’une ligne catalogue, comme `parameters.spec` |
| `modelId` | string | non | ID modèle enregistré : complète secrets, `extraConfig` et `spec` manquants |

| Point de terminaison | Usage | data de réponse |
| --- | --- | --- |
| `POST /api/v1/initialization/remote/check` | Connectivité LLM distant | `{available,message}` |
| `POST /api/v1/initialization/embedding/test` | Test embedding | `{available,message,dimension}` |
| `POST /api/v1/initialization/rerank/check` | Test rerank | `{available,message}` |
| `POST /api/v1/initialization/asr/check` | Test ASR | `{available,message}` |

```bash
curl -X POST $BASE/api/v1/initialization/remote/check -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"modelName":"gpt-4o-mini","baseUrl":"https://api.openai.com/v1","apiKey":"sk-..."}'
```

### POST /api/v1/initialization/multimodal/test

Rôle : Test de bout en bout multimodal (VLM + stockage d’images). Permissions : Admin+. Champs multipart : `image` (obligatoire), `vlm_model`, `vlm_base_url` (obligatoire), `vlm_api_key`, `vlm_interface_type`, `storage_type` (`cos` \| `minio`, obligatoire) et champs `cos_*` / `minio_*`, `chunk_size`, `chunk_overlap`, `separators`.

Réponse : 200 `{"success":true,"data":{"success","caption","ocr","processing_time"}}`

```bash
curl -X POST $BASE/api/v1/initialization/multimodal/test -H "Authorization: Bearer $TOKEN" \
  -F 'image=@demo.png' -F 'vlm_model=qwen-vl' -F 'vlm_base_url=http://x' -F 'storage_type=minio'
```

### POST /api/v1/initialization/extract/text-relation

Rôle : Test d’extraction graphe depuis texte. Permissions : Admin+. Corps : `text` (obligatoire, ≤ 5000 caractères), `tags` (obligatoire, au moins un), `model_id` (obligatoire).

Réponse : 200 `{"success":true,"data":{"nodes":[GraphNode],"relations":[GraphRelation]}}`

```bash
curl -X POST $BASE/api/v1/initialization/extract/text-relation -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"text":"Alice travaille chez Acme","tags":["personne","entreprise"],"model_id":"m-1"}'
```

### POST /api/v1/initialization/extract/fabri-tag

Rôle : Générer des tags d’exemple. Permissions : Admin+. Sans corps.

Réponse : 200 `{"success":true,"data":{"tags":[...]}}`

```bash
curl -X POST $BASE/api/v1/initialization/extract/fabri-tag -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/initialization/extract/fabri-text

Rôle : Générer un texte d’exemple à partir de tags. Permissions : Admin+. Corps : `{"tags":[...],"model_id":"m-1"}` (`model_id` obligatoire).

Réponse : 200 `{"success":true,"data":{"text":"..."}}`

```bash
curl -X POST $BASE/api/v1/initialization/extract/fabri-text -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"model_id":"m-1","tags":["personne"]}'
```

## Évaluation (`/api/v1/evaluation`)

Handler : `internal/handler/evaluation.go`. Clé API : `run_evaluations` / full.

### POST /api/v1/evaluation

Rôle : Lancer une tâche d’évaluation (appels LLM, facturable). Permissions : Admin+.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `dataset_id` | string | non | ID du jeu de données |
| `knowledge_base_id` | string | non | KB cible |
| `chat_id` | string | non | ID modèle de dialogue |
| `rerank_id` | string | non | ID modèle rerank |

Réponse : 200 `{"success":true,"data":{tâche d’évaluation}}`

```bash
curl -X POST $BASE/api/v1/evaluation -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"knowledge_base_id":"kb-1","chat_id":"m-1"}'
```

### GET /api/v1/evaluation

Rôle : Consulter le résultat d’évaluation. Permissions : Viewer+. Paramètre de requête : `task_id` (obligatoire).

Réponse : 200 `{"success":true,"data":{résultat d’évaluation}}`

```bash
curl "$BASE/api/v1/evaluation?task_id=task-1" -H "Authorization: Bearer $TOKEN"
```

## Référence d’implémentation

Enregistrement des routes : `internal/router/router.go` appelle `RegisterModelRoutes`, `RegisterInitializationRoutes`, `RegisterEvaluationRoutes`, `RegisterWeKnoraCloudRoutes` (définies dans `internal/router/routes_infra.go`). Handlers : `internal/handler/model.go`, `internal/handler/model_catalog.go`, `internal/handler/model_credentials.go`, `internal/handler/initialization.go`, `internal/handler/evaluation.go`, `internal/handler/weknoracloud.go`.
