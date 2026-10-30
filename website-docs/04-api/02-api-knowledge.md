# Référence API : bases de connaissances et connaissances

Créer des bases de connaissances, importer et gérer des documents, consulter l’avancement des traitements, copier ou déplacer du contenu.

Mémo permissions : les routes en lecture exigent Viewer+ et la permission read sur la KB (propre, partagée par l’organisation ou visible via un agent partagé) ; les routes en écriture exigent « créateur de la KB OU Admin+ » et la permission write. Clé API : lecture `retrieve`, écriture de contenu `ingest`, cycle de vie des KB `manage_kbs` (tous remplaçables par full-access), sous réserve de la liste blanche KB.

Les endpoints de fragments, d’étiquettes et d’aperçu de découpage (`/chunks`, `/knowledge-bases/:id/tags`, `/chunker/preview`) sont décrits dans [Fragments et étiquettes](./02-api-chunks.md).


## Pipelines de traitement d’images

`GET /api/v1/image-pipelines` renvoie les pipelines disponibles, la déclaration des paramètres et les règles de validation ; `POST /api/v1/image-pipelines/validate` valide une configuration. À l’enregistrement d’une base de connaissances, la validation est refaite côté serveur : ne pas se fier uniquement au front. Un `image_pipeline` explicite prime sur l’ancien `image_attrs_enabled`.

Le PATCH d’une base de connaissances peut ajuster les actions manuelles via `image_caption_enabled` / `image_ocr_enabled`, qui exigent `image_pipeline=default`. L’upload et le reparse de documents acceptent aussi des surcharges de pipeline et de paramètres dans `process_config` ; les champs omis reprennent la configuration de la KB.

## Bases de connaissances (`/api/v1/knowledge-bases`)

### POST /api/v1/knowledge-bases

Rôle : Créer une base de connaissances. Permissions : Contributor+ ; clé API `manage_kbs`/full. Handler : `internal/handler/knowledgebase.go`

Corps de requête (`types.KnowledgeBase`) :

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui | Nom |
| `description` | string | non | Description |
| `type` | string | non | `document` (par défaut) / `faq` / `wiki` |
| `embedding_model_id` | string | non | ID du modèle d’embedding |
| `chunking_config` | object | non | Configuration de découpage (chunk_size/overlap/separators/strategy…) |
| `image_processing_config` | object | non | Traitement d’images : `model_id` / `image_pipeline` (`default`, `smartocr`) / `image_pipeline_params` / `image_attrs_enabled` (compatibilité) / `image_actions` (`{ ocr: { on: [...], on_unobserved: bool } }`) / `image_vector_enabled` (index et rappel vectoriels sur images, false par défaut, voir [Fonctionnalités KB](../03-features/02-knowledge-base.md)) |
| `vlm_config` | object | non | Compréhension d’images : `enabled` (false par défaut) et `model_id` (modèle multimodal déjà créé) doivent être définis ensemble pour activer ; optionnel `description_language`, `custom_instructions` (≤ 4000 caractères) |
| `storage_provider_config` | object | non | Configuration de stockage |
| `vector_store_id` | string | non | Liaison au magasin vectoriel (invalide → codes 2200/2201) |
| `faq_config` / `wiki_config` / `extract_config` / `indexing_strategy` | object | non | Configuration selon le type |
| `summary_model_id` | string | non | Modèle de résumé ; modèle par défaut pour étiquetage auto et profil IA |
| `auto_tag_config` / `profile_config` | object | non | Étiquetage automatique, description IA de la KB (type `document` uniquement, voir ci-dessous) |

Réponse : 201 `{"success":true,"data":{KnowledgeBase}}`

Les interrupteurs non mentionnés dans `indexing_strategy` restent par défaut : vecteur et mots-clés activés, Wiki et graphe désactivés. Seul un `false` explicite les coupe.

```bash
curl -X POST $BASE/api/v1/knowledge-bases -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Documentation produit","type":"document"}'
```

Pour produire du texte OCR et des légendes sur images ou scans, définir `vlm_config` au niveau racine de la création. `image_processing_config` règle la stratégie de traitement d’images ; **seul `image_processing_config.model_id` n’active pas la compréhension d’images**. Exemple (remplacer les ID par les modèles configurés dans l’espace) :

```bash
curl -X POST "$BASE/api/v1/knowledge-bases" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{
    "name": "Documents numérisés",
    "type": "document",
    "embedding_model_id": "embedding-model-id",
    "vlm_config": {
      "enabled": true,
      "model_id": "vlm-model-id"
    }
  }'
```

Une KB existante peut recevoir `vlm_config` via `PATCH /api/v1/knowledge-bases/:id` (ci-dessous). La mise à jour de config ne reparse pas automatiquement les anciens documents ; pour des images ou scans déjà importés, appeler `POST /api/v1/knowledge/:id/reparse`.

### POST /api/v1/knowledge-bases/:id/graph-search {#graph-search}

Requête JSON en lecture seule sur le graphe. `query` effectue une **correspondance de sous-chaîne sensible à la casse** sur les noms d’entités ; renvoie les entités correspondantes, leurs voisins à un saut, les relations orientées et les fragments sources ; inclut aussi les entités correspondantes sans relation. Inutile de repasser la sortie d’un agent en données structurées.

Permissions : Viewer+ et permission read sur la KB (propre, part organisation ou agent partagé). Clé API `retrieve`/full, liste blanche KB. Agent partagé : `agent_id` / `agent_source_tenant_id`, mêmes règles que le détail KB.

N’appelle pas les modèles Chat, Embedding ou Rerank, ne modifie pas les données, ne change pas le comportement par défaut de `knowledge-search` / `hybrid-search`. Extraction d’entités en langage naturel, recherche inter-KB et traversée multi-sauts sont hors périmètre.

| Champ JSON | Par défaut | Plafond / sens |
| --- | --- | --- |
| `query` | obligatoire | 1–512 caractères après trim ; ce n’est pas du Cypher |
| `max_nodes` | 50 | 100, entités correspondantes et voisins |
| `max_relations` | 100 | 200 |
| `max_source_chunks` | 20 | 50, sources dédupliquées par ID |

Un plafond à `0` reprend la valeur par défaut ; négatif ou au-delà du plafond → 400. Corps max 8 KiB, un seul objet JSON, champs inconnus rejetés.

```bash
curl -X POST "$BASE/api/v1/knowledge-bases/$KB_ID/graph-search" \
  -H "X-API-Key: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"query":"Acme","max_nodes":50,"max_relations":100,"max_source_chunks":20}'
```

Réponse : 200 `{"success":true,"data":{...}}`. Champs de `data` :

- `knowledge_base_id`, `query` : périmètre et requête normalisée.
- `entities` : `id`, `name`, `knowledge_id`, `attributes`, `source_chunk_ids`. L’ID est une identité d’entité document opaque (pas d’element ID Neo4j) ; des entités homonymes sur des documents différents ne fusionnent pas. Tant que nom/document inchangés, reconstruire le graphe ne change pas l’ID public.
- `relationships` : `id`, `source_id`, `target_id`, `type`, `source_chunk_ids`. Direction celle du stockage, sans inversion selon le côté touché ; les deux extrémités doivent figurer dans `entities`. Les sources sont l’union des sources des deux entités, pas l’affirmation que chaque fragment énonce la relation.
- `source_chunks` : `id`, `knowledge_id`, `title`, `content`, `chunk_index`, `start_at`, `end_at`, `content_truncated`, `title_truncated`. Contenu max 2000 caractères, titre max 512 ; en cas de troncature, les champs de position restent fidèles. Sans correspondance, les trois listes sont `[]`.
- `meta` : `truncated`, `truncation_reasons` et les trois plafonds appliqués. Ce n’est pas un décompte du graphe entier, ni une pagination ; pour plus de résultats, restreindre les noms d’entités.

Pour limiter le coût des requêtes floues : au plus 100 graines par nom, 512 relations à un saut, 512 fragments sources ; exécution max 10 s. Graines triées par correspondance exacte de nom, longueur, nom, identité document. Attributs : max 20 entrées, 1000 caractères chacune.

Valeurs de `truncation_reasons` : `candidate_seeds`, `candidate_relations`, `candidate_source_chunks`, `max_nodes`, `max_relations`, `max_source_chunks`, `entity_fields`, `relation_fields`, `source_fields`. Seuls les plafonds réellement atteints sont listés, sans estimer le volume omis.

Validation des sources conservative : **tous** les fragments cités par une entité doivent appartenir au document dans la KB autorisée, document/fragment non supprimés ni désactivés, document non en suppression, fragment indexé ; toute source invalide retire l’entité et ses relations. Les deux extrémités d’une relation doivent être sur le même document. Faits non vérifiables ou non contrôlés par budget ne sont pas renvoyés comme vérifiés — peut réduire le rappel sur d’anciens graphes ; la requête ne reconstruit pas le graphe et ne garantit pas la vérité des faits extraits.

Codes : 400 paramètres ; 401 non authentifié ; 403 pas de lecture / clé hors périmètre ; 404 KB absente ; 409 graphe non activé sur la KB ; 500 échec validation sources ; 503 graphe non configuré, connexion ou timeout. Les erreurs n’incluent pas de résultat partiel. Déploiement : [Graphe de connaissances](../03-features/09-knowledge-graph.md).

### Configuration étiquetage automatique et profil IA

À la création, `auto_tag_config` et `profile_config` sont au niveau racine ; à la mise à jour, dans `config.auto_tag_config` et `config.profile_config`. Uniquement pour les KB `document`, `enabled=false` par défaut.

`auto_tag_config` (étiquetage automatique) :

| Champ | Type | Par défaut | Description |
| --- | --- | --- | --- |
| `enabled` | bool | false | Après parsing, choix asynchrone parmi les étiquettes existantes |
| `model_id` | string | vide | Si vide, `summary_model_id` de la KB |
| `max_tags` | int | 3 | Max par document, plafond 10 |
| `skip_if_tagged` | bool | true | Ignorer si déjà étiqueté ; false autorise un complément |

Une fois activé, s’applique aux nouveaux parse/reparse, pas de scan rétroactif de tout l’historique. Pas de blocage d’ingestion sans étiquettes candidates ou sans modèle.

`profile_config` (description IA de la KB) :

| Champ | Type | Par défaut | Description |
| --- | --- | --- | --- |
| `enabled` | bool | false | Ajout/suppression/déplacement de documents ou MAJ de résumé rafraîchit `generated_profile` |
| `model_id` | string | vide | Si vide, `summary_model_id` de la KB |
| `custom_instructions` | string | vide | Consignes ajoutées au prompt de génération |

`generated_profile` est en lecture seule, écrit par le système, ne remplace pas `description` saisie à la main ; génération immédiate via `profile/generate` ci-dessous. Exemple de mise à jour :

```bash
curl -X PUT "$BASE/api/v1/knowledge-bases/kb-1" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Documentation produit","config":{"auto_tag_config":{"enabled":true,"max_tags":3,"skip_if_tagged":true}}}'
```

### GET /api/v1/knowledge-bases

Rôle : Lister les bases de connaissances. Permissions : Viewer+ ; clé API `retrieve`/full.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `agent_id` | string | non | Filtrer les KB visibles pour un agent partagé |
| `agent_source_tenant_id` | uint64 | non | Si le même agent est partagé par plusieurs espaces, préciser l’espace source ; valeur validée contre le partage, invalide → 400 |
| `creator` | string | non | `mine` / `others` |

Réponse : 200 `{"success":true,"data":[KnowledgeBase],"total","page","page_size"}`

```bash
curl $BASE/api/v1/knowledge-bases -H "X-API-Key: $API_KEY"
```

### GET /api/v1/knowledge-bases/:id

Rôle : Détail d’une base de connaissances (KB partagée inclut `my_permission`). Permissions : Viewer+, read KB. Paramètre : `agent_id` (optionnel).

Réponse : 200 `{"success":true,"data":{KnowledgeBase}}`

```bash
curl $BASE/api/v1/knowledge-bases/kb-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/knowledge-bases/:id

Rôle : Mettre à jour une base de connaissances. Permissions : créateur OU Admin+, write KB ; clé API `manage_kbs`/full.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui (`binding:"required"`) | Nom |
| `description` | string | non | Description |
| `config` | object | non | Mise à jour partielle : `chunking_config`, `image_processing_config`, `faq_config`, `wiki_config`, `auto_tag_config`, `profile_config`, `indexing_strategy`. Si `image_processing_config` est omis, inchangé ; s’il est envoyé, remplacement complet (champs absents comme `image_vector_enabled` repassent à false) |
| `vlm_config` | object | non | Multimodal, remplacement complet : seuls `enabled`, `model_id` (modèle VLLM), `description_language`, `custom_instructions` (≤ 4000 car.) ; champs omis = valeurs vides — ne pas envoyer pour ne rien changer. KB partagée : espace propriétaire ou admin du partage (editor → 403). Anciens champs inline `model_name`/`base_url`/`api_key`/`interface_type` ne sont plus écrits : activer un `model_id` géré ou désactiver efface l’ancienne config, sauf KB purement legacy (sans `model_id`, seulement `model_name`/`base_url`) dont un GET identique est considéré comme inchangé ; sinon `enabled=true` sans `model_id` → 400 |

Réponse : 200 `{"success":true,"data":{KnowledgeBase}}`

```bash
curl -X PUT $BASE/api/v1/knowledge-bases/kb-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Documentation produit v2"}'
```

### PATCH /api/v1/knowledge-bases/:id

Rôle : Modifier uniquement les champs présents dans la requête. Nom, description, modèles, stockage, découpage, indexation, FAQ, Wiki, étiquetage auto, profil IA, images, ASR et extraction de graphe : dans les objets imbriqués, les champs non envoyés restent inchangés. Mêmes permissions que PUT ; pour embedding, résumé, multimodal ou ASR sur une KB partagée, droits admin du partage. Le backend de stockage n’est modifiable que par l’espace propriétaire ; s’il y a déjà des fichiers, migration préalable ; un admin partagé peut renvoyer l’ID actuel sans le changer. `embedding_model_id` immuable si la KB contient déjà des documents. `vector_store_id` uniquement à la création. `name` non vide s’il est envoyé ; `description` = chaîne vide efface la description.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | non | Nouveau nom |
| `description` | string | non | Nouvelle description ; chaîne vide pour effacer |
| `embedding_model_id` / `summary_model_id` / `storage_backend_id` | string | non | Modèle ou instance de stockage |
| `chunking_config` | object | non | Fusion sur les champs de découpage envoyés |
| `indexing_strategy` | object | non | Fusion sur les interrupteurs ; au moins un type d’index actif |
| `vlm_config` / `asr_config` / `image_processing_config` | object | non | Multimodal, voix, images |
| `faq_config` / `wiki_config` / `auto_tag_config` / `profile_config` | object | non | Réglages selon le type |
| `extract_config` / `question_generation_config` | object | non | Extraction graphe, génération de questions par fragment |

Réponse : 200 `{"success":true,"data":{KnowledgeBase}}`

```bash
curl -X PATCH $BASE/api/v1/knowledge-bases/kb-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Documentation produit v2"}'
```

### DELETE /api/v1/knowledge-bases/:id

Rôle : Supprimer une base de connaissances (réservé à l’espace propriétaire + Admin ; un editor partagé ne peut pas). Permissions : créateur OU Admin+, write KB ; clé API `manage_kbs`/full.

Réponse : 200 `{"success":true,"message":"Knowledge base deleted successfully"}`

```bash
curl -X DELETE $BASE/api/v1/knowledge-bases/kb-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/knowledge-bases/:id/pin

Rôle : Épingler / désépingler (par utilisateur). Permissions : Viewer+, read KB. Sans corps.

Réponse : 200 `{"success":true,"data":{KnowledgeBase(is_pinned basculé)}}`

```bash
curl -X PUT $BASE/api/v1/knowledge-bases/kb-1/pin -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/knowledge-bases/:id/hybrid-search (compatible GET)

Rôle : Rappel brut dans la KB (vecteur + mots-clés), sans rerank par défaut, scores de rappel ; rerank optionnel. Pour évaluer le rappel, vecteurs précalculés, etc. ; recherche courante : [`knowledge-search`](./02-api-chat.md), voir [Choisir une API de recherche](./01-api-overview.md#retrieval-api). Permissions : Viewer+, read KB ; clé API `retrieve`/full. GET avec corps JSON = rétrocompatibilité (#1727), préférer POST.

Paramètre de requête : `resource_urls=handle|public` (`public` remplace les `resource://` dans `content` / `image_info` par des URL directes, voir [Vue d’ensemble API](./01-api-overview.md)).

Corps (`types.SearchParams`) :

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `query_text` | string | conditionnel | Texte de requête (sauf si `query_embedding` ; obligatoire avec rerank) |
| `query_embedding` | []float32 | non | Vecteur précalculé |
| `vector_threshold` / `keyword_threshold` | float64 | non | Seuils de correspondance |
| `match_count` | int | non | Nombre max de résultats (défaut 50) |
| `disable_keywords_match` / `disable_vector_match` | bool | non | Désactiver une branche de rappel |
| `knowledge_base_ids` | []string | non | Plusieurs KB en une requête ; `:id` du chemin doit être inclus ; même modèle d’embedding, sinon 400 |
| `knowledge_ids` | []string | non | Limiter aux connaissances |
| `tag_ids` | []string | non | Filtre étiquettes (OR) |
| `only_recommended` | bool | non | FAQ : entrées recommandées uniquement |
| `skip_context_enrichment` | bool | non | Ignorer enrichissement parent/contexte |
| `rerank` | object | non | Présent = activer rerank (`{}` = modèle de l’espace), voir [objet rerank](./01-api-overview.md#retrieval-api) |

Réponse : 200 `{"success":true,"data":[SearchResult]}` ; avec `rerank`, plus `meta.rerank` (voir [diagnostic meta.rerank](./01-api-overview.md#retrieval-api)).

```bash
curl -X POST "$BASE/api/v1/knowledge-bases/kb-1/hybrid-search?resource_urls=public" -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' -d '{"query_text":"processus de remboursement","match_count":5}'

# Rappel fixe, puis rerank avec un modèle donné
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/hybrid-search -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"query_text":"processus de remboursement","vector_threshold":0.3,"match_count":5,"rerank":{"model_id":"rr-1","threshold":0.2}}'
```

### POST /api/v1/knowledge-bases/copy

Rôle : Copier du contenu entre KB (tâche asynchrone). Permissions : Contributor+ ; clé API `manage_kbs`/full (liste blanche source/cible vérifiée dans le handler).

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `source_id` | string | oui (`binding:"required"`) | KB source |
| `target_id` | string | non | KB cible (vide = création automatique) |
| `task_id` | string | non | ID de tâche personnalisé |

Réponse : 200 `{"success":true,"data":{"task_id","source_id","target_id","message"}}`

```bash
curl -X POST $BASE/api/v1/knowledge-bases/copy -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"source_id":"kb-1"}'
```

### POST /api/v1/knowledge-bases/:id/duplicate

Rôle : Dupliquer une KB (réglages seulement, pas contenu/index/partages). Permissions : Contributor+, read sur la source ; clé API `manage_kbs`/full. Sans corps.

Réponse : 201 `{"success":true,"data":{"source_id","target_id","message","knowledge_base":{...}}}`

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/duplicate -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/knowledge-bases/:id/profile/generate

Rôle : Régénérer immédiatement le profil IA (`generated_profile`) : agrégation synchrone des profils document + un appel petit modèle, sans modifier `description` saisie. Permissions : comme la mise à jour KB (créateur/Admin, write) ; clé API `manage_kbs`/full. Sans corps. Type `document` uniquement ; sans modèle → 400.

Réponse : 200 `{"success":true,"data":{"gist","topics":[...],"typical_questions":[...],"stats":{"document_count",...},"status":"ready","model_id","generated_at"}}`

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/profile/generate -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge-bases/copy/progress/:task_id

Rôle : Avancement de copie (tâches isolées par espace). Permissions : Viewer+ ; clé API `retrieve`/`manage_kbs`/full.

Réponse : 200 `{"success":true,"data":{status,progress,message,...}}`

```bash
curl $BASE/api/v1/knowledge-bases/copy/progress/task-1 -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge-bases/:id/move-targets

Rôle : Lister les KB cibles de déplacement (même type / même embedding). Permissions : Viewer+, read KB.

Réponse : 200 `{"success":true,"data":[KnowledgeBase]}`

```bash
curl $BASE/api/v1/knowledge-bases/kb-1/move-targets -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge-bases/:id/files

Rôle : Proxy de fichiers scoped à la KB (images dans contenu partagé ; tenant du contexte réécrit vers le propriétaire de la KB). Permissions : Viewer+, read KB ; clé limitée à une KB refusée, clé espace `retrieve`/full acceptée. Enregistré dans `serveKBScopedFiles` (`internal/router/files.go`).

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `file_path` | string | oui | Chemin stockage `provider://...` (`..` interdit) |

Réponse : 200 flux fichier (`Content-Type` selon extension ; `Cache-Control: private`).

```bash
curl "$BASE/api/v1/knowledge-bases/kb-1/files?file_path=local://1/exports/chart.png" \
  -H "Authorization: Bearer $TOKEN" -o chart.png
```

## Connaissances (contenu KB, `/api/v1/knowledge-bases/:id/knowledge` et `/api/v1/knowledge`)

### POST /api/v1/knowledge-bases/:id/knowledge/file

Rôle : Créer une connaissance par upload de fichier. Permissions : créateur KB OU Admin+, write KB ; clé API `ingest`/full. Handler : `internal/handler/knowledge.go`

Champs `multipart/form-data` :

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `file` | file | oui | Fichier à envoyer |
| `fileName` | string | non | Nom personnalisé ou chemin relatif avec dossiers, ex. `docs/spec/design.md` ; dossiers = classement, dernière partie = nom de fichier |
| `metadata` | chaîne JSON | non | Métadonnées personnalisées |
| `enable_multimodel` | bool | non | Activer le traitement multimodal |
| `tag_ids` | string | non | IDs d’étiquettes séparés par des virgules |
| `channel` | string | non | Canal d’ingestion |
| `process_config` | chaîne JSON | non | Surcharges de parsing (`KnowledgeProcessOverrides`), tableau ci-dessous |

Champs courants de `process_config` (optionnels, défaut = config KB) :

| Champ | Type | Par défaut | Description |
| --- | --- | --- | --- |
| `summary_enabled` | bool | true | Générer un résumé pour cet import ; si false, parsing/indexation/autres traitements continuent |
| `parser_engine_rules` | []object | config KB | Moteur de parsing par type de fichier |
| `parser_engine_overrides` | map[string]string | vide | Paramètres moteur, ex. `pdf_force_scanned` |
| `chunking_config` | object | config KB | Paramètres de découpage |
| `enable_multimodel` / `vlm_config` / `asr_config` | - | config KB | Multimodal et reconnaissance vocale |
| `question_generation_config` | object | config KB | Génération de questions |
| `graph_enabled` / `extract_config` | - | config KB | Extraction de graphe |

Réponse : 200 `{"success":true,"data":{Knowledge}}` ; doublon → 409 et `data` = Knowledge existante. Fichier homonyme en suppression ou en échec de parsing ne compte pas comme doublon.

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/knowledge/file \
  -H "X-API-Key: $API_KEY" -F 'file=@./manual.pdf' -F 'enable_multimodel=true'
```

**Upload vers un dossier :** passer dans `fileName` un chemin relatif à la racine de la KB, dossiers séparés par `/`, avec nom et extension. L’upload n’accepte pas de champ `folder_path` séparé.

```bash
curl -X POST "$BASE/api/v1/knowledge-bases/kb-1/knowledge/file" \
  -H "X-API-Key: $API_KEY" \
  -F 'file=@./design.md' \
  -F 'fileName=docs/spec/design.md'
```

Cette requête classe le document sous `docs/spec` ; la Knowledge renvoyée a `folder_path` = `docs/spec`, `file_name` = `design.md`. `file=@./design.md` = fichier local, `fileName` = chemin dans la KB. Sans `fileName` ou avec le seul nom de fichier, le document est à la racine.

L’arborescence d’une KB document est dérivée de `folder_path`, sans création préalable : un upload vers un nouveau chemin fait apparaître dossiers et niveaux intermédiaires. Pas de dossiers vides créés ou conservés sans documents. Les API de dossiers Wiki gèrent le Wiki, pas les KB document.

Après upload : `GET /api/v1/knowledge-bases/:id/knowledge/folders` sur cette page. Déplacer des documents existants : `POST /api/v1/knowledge/folder` sans re-upload ; seule cette route utilise le champ `folder_path`.

### POST /api/v1/knowledge-bases/:id/knowledge/url

Rôle : Créer une connaissance par capture d’URL. Permissions / clé API identiques.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `url` | string | oui (`binding:"required"`) | URL à récupérer |
| `file_name` / `file_type` / `title` | string | non | Surcharges |
| `enable_multimodel` | *bool | non | Multimodal |
| `tag_ids` | []string | non | Étiquettes |
| `channel` | string | non | Canal |
| `process_config` | object | non | Surcharges de parsing |

Réponse : 201 `{"success":true,"data":{Knowledge}}` ; URL en double → 409.

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/knowledge/url -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' -d '{"url":"https://example.com/doc"}'
```

### POST /api/v1/knowledge-bases/:id/knowledge/manual

Rôle : Créer une connaissance manuelle (Markdown). Permissions / clé API identiques.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `title` | string | non | Titre |
| `content` | string | non | Contenu Markdown |
| `status` | string | non | `draft` / `publish` |
| `tag_ids` | []string | non | Étiquettes |
| `channel` | string | non | Canal |
| `process_config` | object | non | Surcharges de parsing |

Réponse : 200 `{"success":true,"data":{Knowledge}}`

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/knowledge/manual -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"FAQ synthèse","content":"# Contenu","status":"publish"}'
```

### GET /api/v1/knowledge-bases/:id/knowledge

Rôle : Lister les connaissances d’une KB. Permissions : Viewer+, read KB ; clé API `retrieve`/full.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `page` / `page_size` | int | non | Pagination (défaut 1/20) |
| `tag_ids` | string | non | Étiquettes séparées par virgules (OR) |
| `keyword` | string | non | Mot-clé |
| `file_type` | string | non | Filtre par type de fichier |
| `parse_status` | string | non | `pending/processing/completed/failed` |
| `source` | string | non | Canal ou `manual`/`url` |
| `start_time` / `end_time` | string | non | RFC3339, filtre sur `updated_at` |
| `folder_path` | string | non | Filtre dossier ; chaîne vide = racine KB, omis = pas de filtre dossier |
| `folder_recursive` | bool | non | Avec `folder_path`, `true` inclut les sous-dossiers |
| `sort_by` | string | non | `updated_at`, `created_at` ou `file_name` ; défaut `created_at` |
| `sort_order` | string | non | `asc` ou `desc` ; défaut `desc` |

Sans tri explicite : `created_at desc` ; valeur hors liste → 400. Avec `updated_at`, reparse/édition/statut modifient l’ordre ; avec `file_name`, tri insensible à la casse sur le nom affiché, repli titre puis source si vide. Égalité résolue par ID de connaissance pour une pagination stable.

Réponse : 200 `{"success":true,"data":[Knowledge],"total","page","page_size"}`

```bash
curl "$BASE/api/v1/knowledge-bases/kb-1/knowledge?page=1&parse_status=completed" -H "X-API-Key: $API_KEY"
```

### POST /api/v1/knowledge-bases/:id/knowledge/batch-download

Rôle : Télécharger en ZIP les fichiers sources de plusieurs documents d’une même KB. Mêmes droits que le téléchargement unitaire : Contributor+ et write KB (Viewer en partage org. interdit) ; clé API `retrieve`/full.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `ids` | []string | oui | Liste d’IDs de connaissance, 1 à 200 |

Comportement :

- Taille totale des sources ≤ 512 MiB, sinon 400 ;
- Entrées sans fichier source (ex. import web) ignorées ; si aucune source → 400 ;
- Structure de dossiers KB conservée dans le ZIP, doublons de noms suffixés ;
- ID absent ou hors KB → 404, échec de lecture → 500, pas de ZIP incomplet ;
- Max 4 téléchargements groupés simultanés par instance, sinon 429.

Réponse : 200 flux `application/zip`, nom du type `knowledge-files-20260923-150405.zip`.

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/knowledge/batch-download \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"ids":["k-1","k-2"]}' -o knowledge-files.zip
```

### GET /api/v1/knowledge-bases/:id/knowledge/folders

Rôle : Arborescence des dossiers de la KB. Upload de dossiers entiers : structure conservée (colonne `knowledges.folder_path` depuis migration `000079`, chemins historiques dans `file_name` migrés). Permissions : Viewer+ et KBAccessRead.

Arbre agrégé depuis `folder_path` des connaissances ; dossiers intermédiaires sans document direct mais avec descendants inclus. Dossier retiré de l’arbre quand plus aucun document direct ni descendant.

Réponse : 200. Exemple (seul `docs/spec/design.md` uploadé ci-dessus) :

```json
{
  "success": true,
  "data": {
    "root_document_count": 0,
    "total_document_count": 1,
    "folders": [{
      "path": "docs",
      "name": "docs",
      "document_count": 0,
      "total_count": 1,
      "children": [{
        "path": "docs/spec",
        "name": "spec",
        "document_count": 1,
        "total_count": 1
      }]
    }]
  }
}
```

`root_document_count` : documents à la racine ; `total_document_count` : total KB ; `document_count` sur un nœud = documents directs ; `total_count` inclut tous les descendants.

```bash
curl $BASE/api/v1/knowledge-bases/kb-1/knowledge/folders -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/knowledge-bases/:id/knowledge/folders

Rôle : Renommer ou déplacer un dossier et tous ses sous-dossiers. Si la cible existe, fusion ; interdit de déplacer sous son propre sous-dossier. Permissions : propriétaire KB ou Admin+ et KBAccessWrite.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `from` | string | oui | Chemin d’origine |
| `to` | string | oui | Nouveau chemin |

Réponse : 200 `{"success":true}`

```bash
curl -X PUT $BASE/api/v1/knowledge-bases/kb-1/knowledge/folders -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"from":"docs-conception/v1","to":"archives/docs-conception"}'
```

### DELETE /api/v1/knowledge-bases/:id/knowledge

Rôle : Vider tout le contenu de la KB (destructif). Permissions : Admin+, write KB ; clé API full-access uniquement.

Réponse : 200 `{"success":true,"message":"Knowledge base contents clear task submitted","data":{"deleted_count":N}}`

```bash
curl -X DELETE $BASE/api/v1/knowledge-bases/kb-1/knowledge -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge/batch

Rôle : Récupérer des connaissances par ID (inter-KB, accès vérifié dans le handler). Permissions : Viewer+ ; clé API `retrieve`/full.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `ids` | []string | oui | IDs (paramètres répétés ou liste séparée par virgules) |
| `kb_id` | string | non | Limiter à une KB |
| `agent_id` | string | non | Périmètre agent partagé |
| `agent_source_tenant_id` | uint64 | non | Espace source de l’agent partagé, validé contre le partage |

Réponse : 200 `{"success":true,"data":[Knowledge]}`. En `pending`/`processing`/`finalizing`, plus `last_activity_at` (RFC3339) = max entre `updated_at` de la ligne et dernière écriture de span. Sans progrès depuis 20 min, `stall_state` : `queued` = tâche encore en file asynq ou file Wiki (backlog), `stalled` = plus de tâche pour avancer (blocage suspect). Même logique que le housekeeping ; scan de file partagé, cache 60 s. Si la sonde échoue, pas de `stall_state` — afficher comme parsing en cours.

```bash
curl "$BASE/api/v1/knowledge/batch?ids=k-1&ids=k-2" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge/:id

Rôle : Détail d’une connaissance. Permissions : Viewer+, read sur la KB parente.

Réponse : 200 `{"success":true,"data":{Knowledge}}`

```bash
curl $BASE/api/v1/knowledge/k-1 -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge/:id/stages et GET /api/v1/knowledge/:id/spans

Rôle : Phases de parsing / trace (même handler `GetKnowledgeSpans`). Permissions : Viewer+, read KB parente. Paramètre : `attempt` (int, 0 = dernière tentative).

Réponse : 200 `{"success":true,"data":{"knowledge_id","attempt","latest_attempt","parse_status","current_stage","last_activity_at","stall_state","trace":{...},"last_error":{...}}}`

`last_activity_at` pendant le parsing uniquement ; max `updated_at` ligne et dernière écriture de span de cette tentative ; `stall_state` comme ci-dessus. `current_stage` = phase encore active ; sans phase active (ex. `finalizing`, post-traitement fermé mais sous-tâches résumé actives), phase du sous-span actif. Si housekeeping déclare un blocage, le span concerné passe en échec `TASK_STALLED`, `last_error` le privilégie.

```bash
curl $BASE/api/v1/knowledge/k-1/spans -H "Authorization: Bearer $TOKEN"
```

### DELETE /api/v1/knowledge/:id

Rôle : Supprimer une connaissance (asynchrone). Permissions : créateur KB OU Admin+, write KB ; clé API `ingest`/full.

Réponse : 200 `{"success":true,"message":"Delete task submitted","data":{"task_id"}}`

```bash
curl -X DELETE $BASE/api/v1/knowledge/k-1 -H "X-API-Key: $API_KEY"
```

### PUT /api/v1/knowledge/:id

Rôle : Mettre à jour les métadonnées. Permissions identiques. Corps (sous-ensemble `types.Knowledge`) : `title`, `description`, `tags`, `custom_metadata` (optionnels). `description` omise = résumé inchangé ; chaîne vide = effacer ; valeur non vide = résumé manuel (éditable dans l’UI).

`custom_metadata` = métadonnées descriptives utilisateur (distinct de `metadata` système, migration `000078`), règles dans `internal/application/service/knowledge.go` :

| Contrainte | Valeur |
| --- | --- |
| Nombre de champs | ≤ 20 |
| Longueur des clés | 1–64 caractères, non blanc |
| Type des valeurs | string / number / boolean / null |
| Longueur des valeurs | ≤ 1000 caractères |

Remplacement complet de l’objet envoyé. Si métadonnées modifiées et résumé existant, file de rafraîchissement (`summary_status` → `pending`). Le texte métadonnées entre dans le résumé et le contexte modèle document (`Knowledge.CustomMetadataText()`).

Réponse : 200 `{"success":true,"message":"Knowledge updated successfully","data":{Knowledge}}`

```bash
curl -X PUT $BASE/api/v1/knowledge/k-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Nouveau titre","custom_metadata":{"departement":"R&D","classification":"interne","version":3}}'
```

### POST /api/v1/knowledge/:id/regenerate-summary

Rôle : Régénérer le résumé après édition de fragments ou de `custom_metadata`. Permissions : propriétaire KB ou Admin+, write sur la KB parente.

Deux cas : sans résumé préalable (`summary_status` vide ou `none`) → génération synchrone ; avec résumé existant → tâche async, `summary_status` → `pending`, via `knowledge_summary_refresh.go`.

Réponse : 200 `{"success":true,"data":{Knowledge}}`

```bash
curl -X POST $BASE/api/v1/knowledge/k-1/regenerate-summary -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/knowledge/manual/:id

Rôle : Remplacer entièrement le Markdown saisi à la main. Connaissances manuelles uniquement ; pas pour corriger un fichier uploadé. `content` = corps complet, vide refusé. `status` : `draft` (hors recherche) ou `publish` (indexé) ; omis = brouillon. Permissions identiques.

Réponse : 200 `{"success":true,"data":{Knowledge}}`

```bash
curl -X PUT $BASE/api/v1/knowledge/manual/k-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"content":"# Contenu mis à jour","status":"publish"}'
```

### POST /api/v1/knowledge/:id/reparse

Rôle : Relancer le parsing. Permissions identiques. Corps optionnel : `{"process_config":{...}}`.

Réponse : 200 `{"success":true,"message":"Reparse task submitted","data":{Knowledge}}`

```bash
curl -X POST $BASE/api/v1/knowledge/k-1/reparse -H "X-API-Key: $API_KEY"
```

### POST /api/v1/knowledge/:id/cancel-parse

Rôle : Annuler le parsing. Permissions identiques. Sans corps.

Réponse : 200 `{"success":true,"message":"Knowledge parse cancelled","data":{Knowledge}}`

```bash
curl -X POST $BASE/api/v1/knowledge/k-1/cancel-parse -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge/:id/download

Rôle : Télécharger le fichier source (plus strict que l’aperçu : Contributor+ et write KB ; Viewer en partage org. interdit). Clé API `retrieve`/full.

Réponse : 200 flux binaire (`application/octet-stream`).

```bash
curl -OJ $BASE/api/v1/knowledge/k-1/download -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge/:id/preview

Rôle : Aperçu du contenu parsé. Permissions : Viewer+, read KB.

Réponse : 200 flux d’aperçu (texte/HTML).

```bash
curl $BASE/api/v1/knowledge/k-1/preview -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/knowledge/image/:id/:chunk_id

Rôle : Mettre à jour les infos image d’un fragment (légende/OCR, etc.). Permissions : créateur KB OU Admin+, write KB. Chemin : `id` connaissance, `chunk_id` fragment. Corps JSON infos image.

Réponse : 200 `{"success":true,...}`

```bash
curl -X PUT $BASE/api/v1/knowledge/image/k-1/c-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"caption":"Schéma d’architecture"}'
```

### GET /api/v1/knowledge/search

Rôle : Recherche de fichiers inter-KB (sélecteur @fichier en session). Permissions : Viewer+ ; clé API `retrieve`/full.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `keyword` / `query` | string | conditionnel | Mot-clé (équivalents) ; si vide, `recent=true` obligatoire, sinon 400 |
| `file_types` | string | non | Extensions séparées par virgules, ex. `csv,xlsx` |
| `offset` / `limit` | int | non | Pagination ; `limit` défaut 20, plage 1–100 |
| `recent` | bool | non | Fichiers récents si mot-clé vide |
| `agent_id` | string | non | Périmètre agent partagé |
| `agent_source_tenant_id` | uint64 | non | Espace source agent partagé, validé |

Réponse : 200 `{"success":true,"data":[Knowledge],"has_more":bool,"total":N}`

```bash
curl "$BASE/api/v1/knowledge/search?keyword=rapport&limit=20" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge/move/progress/:task_id

Rôle : Avancement d’une tâche de déplacement. Permissions : Viewer+ ; clé API `retrieve`/full.

Réponse : 200 `{"success":true,"data":{MoveProgress}}`

```bash
curl $BASE/api/v1/knowledge/move/progress/task-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/knowledge/tags

Rôle : Mettre à jour les étiquettes en lot. Permissions : Contributor+ ; clé API `ingest`/full (liste blanche KB dans le handler). Formes exclusives : `updates`, ou `knowledge_ids` + `tag_ids`.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `updates` | map[string][]string | l’un des deux | knowledge_id → tag_ids, remplace les étiquettes du document |
| `kb_id` | string | non | Limiter la KB ; sinon inféré depuis la première connaissance |
| `knowledge_ids` | []string | l’un des deux | Max 20 documents, mêmes étiquettes |
| `tag_ids` | []string | requis avec `knowledge_ids` | Max 50 ; tableau vide = retirer toutes les étiquettes |

Réponse : 200 `{"success":true}`

```bash
curl -X PUT $BASE/api/v1/knowledge/tags -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"updates":{"k-1":["t-1"]},"kb_id":"kb-1"}'
```

### POST /api/v1/knowledge/batch-reparse

Rôle : Reparse en lot. Permissions : Contributor+ ; clé API `ingest`/full.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `kb_id` | string | oui (`binding:"required"`) | ID KB |
| `ids` | []string | oui (`binding:"required"`) | Liste d’IDs de connaissance |
| `process_config` | object | non | Surcharges de parsing |

Réponse : 200 `{"success":true,"message":"Batch reparse task submitted","data":{"task_id"}}`

```bash
curl -X POST $BASE/api/v1/knowledge/batch-reparse -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' -d '{"kb_id":"kb-1","ids":["k-1","k-2"]}'
```

### POST /api/v1/knowledge/batch-delete

Rôle : Suppression en lot (≤ 200). Permissions : Contributor+ ; clé API `ingest`/full.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `kb_id` | string | oui (`binding:"required"`) | ID KB |
| `ids` | []string | oui (`binding:"required"`) | IDs de connaissance (≤ 200) |

Réponse : 200 `{"success":true,"message":"Batch delete task submitted","data":{"task_id","deleted_count"}}`

```bash
curl -X POST $BASE/api/v1/knowledge/batch-delete -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"kb_id":"kb-1","ids":["k-1"]}'
```

### POST /api/v1/knowledge/folder

Rôle : Classer des documents dans un dossier (classement seulement, pas de changement de KB ni reparse). Permissions : Contributor+ / clé API `ingest`.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `kb_id` | string | oui | ID de la base de connaissances |
| `knowledge_ids` | []string | oui | Documents à déplacer |
| `folder_path` | string | non | Chemin cible relatif à la racine KB, ex. `docs/spec` ; création implicite ; chaîne vide = racine |

Réponse : 200 `{"success":true}`

```bash
curl -X POST $BASE/api/v1/knowledge/folder -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"kb_id":"kb-1","knowledge_ids":["k-1","k-2"],"folder_path":"docs-conception"}'
```

### POST /api/v1/knowledge/move

Rôle : Déplacer des connaissances entre KB (asynchrone). Permissions : Contributor+ ; clé API `ingest`/full (source et cible sur la liste blanche).

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `knowledge_ids` | []string | oui (`binding:"required,min=1"`) | Connaissances à déplacer |
| `source_kb_id` | string | oui (`binding:"required"`) | KB source |
| `target_kb_id` | string | oui (`binding:"required"`) | KB cible |
| `mode` | string | oui (`binding:"required,oneof=reuse_vectors reparse"`) | Réutiliser les vecteurs ou reparser |

Réponse : 200 `{"success":true,"data":{"task_id","source_kb_id","target_kb_id","knowledge_count","message"}}`

```bash
curl -X POST $BASE/api/v1/knowledge/move -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"knowledge_ids":["k-1"],"source_kb_id":"kb-1","target_kb_id":"kb-2","mode":"reuse_vectors"}'
```

## Galerie et attributs d’images {#image-gallery-api}

Lecture galerie : Viewer+, KB cible lisible ; clé API `retrieve` ou full, respect du périmètre KB. Galerie indépendante du commutateur vecteur image ; la liste renvoie légendes, OCR et sources des images extraites.

### GET /api/v1/knowledge-bases/:id/gallery-config

Réponse `{"success":true,"data":{"attribute_sources":[...],"attributes":[...],"mode":"...","status":{...}}}`. Le client construit recherche, filtres et tri depuis les définitions renvoyées ; ne pas coder en dur les attributs. IDs préfixés par la source, ex. `builtin:caption`, `system:contain.text`.

### GET /api/v1/knowledge-bases/:id/images

| Paramètre | Description |
| --- | --- |
| `page` / `page_size` | Défaut 1 / 20, `page_size` max 1000 |
| `keyword` / `search_in` | Sous-chaîne insensible à la casse ; `search_in` = IDs d’attributs recherchables séparés par virgules, défaut légende et OCR |
| `sort_by` / `sort_order` | ID d’attribut triable, défaut created_at / desc ; compat. created_at, updated_at, caption |
| `knowledge_ids` | IDs documents sources séparés par virgules ; GET : 50 premiers max, POST pour plus |
| `is_enabled` | true / false, filtre sur l’état du fragment parent |
| `attr_filters` | Objet JSON, ID attribut → valeurs autorisées ; OR intra-attribut, AND inter-attributs |
| `attr_rules` | Objet JSON, ID → valeur → on/off ; on force l’affichage avant off ; images sans règle conservées |

Seuls les champs déclarés applicables dans gallery-config sont acceptés ; les autres sont ignorés. Réponse `{"success":true,"data":[ImageAsset],"total":N,"page":1,"page_size":20}`. Chaque élément : `id`, `chunk_id`, `knowledge_id`, `source_name`, `url`, `original_url`, `caption`, `ocr_text`, `attrs`, `is_enabled`, `status`, horodatages.

### POST /api/v1/knowledge-bases/:id/images

Même requête en lecture que GET, paramètres dans le corps JSON ; `knowledge_ids` et `search_in` en tableaux de chaînes, `attr_filters` / `attr_rules` en objets. Max 1000 documents sources, sinon 400 ; adapté à « tout sélectionner » sans URL longue.

```bash
curl -X POST "$BASE/api/v1/knowledge-bases/kb-1/images" -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"page":1,"page_size":20,"knowledge_ids":["k-1","k-2"],"keyword":"architecture"}'
```

### GET /api/v1/image-attrs/schema

Registre global en lecture seule des attributs d’observation image ; Viewer+, clé retrieve/full, sans KB dans le chemin. L’éditeur de KB configure observation et conditions OCR ; recherche/filtres galerie restent pilotés par gallery-config de chaque KB.

## Référence d’implémentation

Enregistrement des routes : `RegisterKnowledgeBaseRoutes`, `RegisterKnowledgeRoutes` dans `internal/router/routes_knowledge.go`. Handlers : `internal/handler/knowledgebase.go`, `internal/handler/knowledge.go`.
