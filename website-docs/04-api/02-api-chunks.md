# Référence API : fragments et étiquettes

Un fragment (chunk) est la plus petite unité de recherche ; les étiquettes servent à classer les documents. Les deux groupes d’interfaces relèvent des ressources de base de connaissances et partagent les mêmes règles de permission que [Bases de connaissances et connaissances](./02-api-knowledge.md) : lecture Viewer+ avec permission read sur la KB parente (clé API `retrieve`), écriture « créateur de la KB OU Admin+ » avec permission write (clé API `ingest`), le tout sous contrainte de la liste blanche KB de la clé API.

Les conventions communes (Base URL, authentification, codes d’erreur, pagination) sont dans [Vue d’ensemble API](./01-api-overview.md).

## Fragments (`/api/v1/chunks`)

Handler : `internal/handler/chunk.go`. Lecture : Viewer+ et read sur la KB parente (clé API `retrieve`/full) ; écriture : créateur de la KB OU Admin+ et write sur la KB parente (clé API `ingest`/full).

### GET /api/v1/chunks/:knowledge_id

Rôle : Lister les fragments d’une connaissance.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `page` | int | non | Par défaut 1 |
| `page_size` | int | non | Par défaut 10, plafond 100 |
| `chunk_type` | string | non | Répétable, filtre par type de fragment |

Réponse : 200 `{"success":true,"data":[Chunk],"total","page","page_size"}`

```bash
curl "$BASE/api/v1/chunks/k-1?page=1" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/chunks/by-id/:id

Rôle : Obtenir un fragment par son ID (sans `knowledge_id`).

Réponse : 200 `{"success":true,"data":{Chunk}}`. `Chunk.source_locators` indique la position du fragment dans le fichier source ; structure décrite dans [Vue d’ensemble API](./01-api-overview.md) (`source_locators`).

```bash
curl $BASE/api/v1/chunks/by-id/c-1 -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/chunks/:knowledge_id/:id

Rôle : Modifier le contenu ou l’état activé/désactivé d’un fragment (mise à jour optimiste versionnée depuis la migration `000078`).

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `content` | string | non | Nouveau contenu ; après trim, ne doit pas être vide ; plafond 200 000 octets |
| `is_enabled` | bool | non | Activer ou désactiver le fragment |
| `expected_revision` | int | non | `content_revision` attendu pour le contrôle de concurrence optimiste |

Contraintes et effets de bord :

- Seuls les fragments de type `text` sont modifiables ; les autres types renvoient 400 ;
- si `expected_revision` diffère du `content_revision` courant → **409** (`Chunk was modified by another user; refresh and retry`) ;
- interdiction d’introduire des URL d’images absentes du contenu source ; supprimer une image Markdown désactive aussi les sous-fragments OCR/légende associés ;
- après édition réussie, `content_revision` +1, l’ancienne version est enregistrée dans `chunk_revisions`, `index_status` passe par `processing` → `ready` ; si la reconstruction de l’index échoue, la ligne est conservée avec `index_status = failed` — renvoyer le même contenu relance une tentative ;
- l’édition d’un sous-fragment réécrit le contenu du fragment parent selon les décalages (`source_content` du parent reste immuable) ;
- tout changement de contenu ou d’état activé enfile un rafraîchissement du résumé document.

Réponse : 200 `{"success":true,"data":{Chunk},"summary_status":"pending","description":"..."}`

```bash
curl -X PUT $BASE/api/v1/chunks/k-1/c-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"content":"Contenu corrigé","expected_revision":2}'
```

### GET /api/v1/chunks/:knowledge_id/:id/revisions

Rôle : Historique des versions du fragment (table `chunk_revisions`, tri par `revision` décroissant).

Réponse : 200 `{"success":true,"data":[{ChunkRevision}]}`, chaque entrée inclut `revision`, `content`, `is_enabled`, `editor_id`, `edit_source`, `edited_at`.

```bash
curl $BASE/api/v1/chunks/k-1/c-1/revisions -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/chunks/:knowledge_id/:id/revert

Rôle : Revenir à une version historique. Le retour en arrière compte comme une nouvelle édition : `content_revision` continue d’augmenter et le contenu actuel est archivé comme nouvelle version.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `revision` | int | oui | Numéro de version cible (≥ 0) |
| `expected_revision` | int | non | Verrou optimiste, même sémantique ; conflit → 409 |

Réponse : 200 `{"success":true,"data":{Chunk},"summary_status":"...","description":"..."}`

```bash
curl -X POST $BASE/api/v1/chunks/k-1/c-1/revert -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"revision":1}'
```

### DELETE /api/v1/chunks/:knowledge_id/:id

Rôle : Supprimer un fragment.

Réponse : 200 `{"success":true,"message":"Chunk deleted"}`

```bash
curl -X DELETE $BASE/api/v1/chunks/k-1/c-1 -H "Authorization: Bearer $TOKEN"
```

### DELETE /api/v1/chunks/:knowledge_id

Rôle : Supprimer tous les fragments d’une connaissance.

Réponse : 200 `{"success":true,"message":"All chunks under knowledge deleted"}`

```bash
curl -X DELETE $BASE/api/v1/chunks/k-1 -H "Authorization: Bearer $TOKEN"
```

### DELETE /api/v1/chunks/by-id/:id/questions

Rôle : Supprimer une question générée pour ce fragment. Corps : `{"question_id":"..."}` (`binding:"required"`).

Réponse : 200 `{"success":true,"message":"Generated question deleted"}`

```bash
curl -X DELETE $BASE/api/v1/chunks/by-id/c-1/questions -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"question_id":"q-1"}'
```

### PUT /api/v1/chunks/by-id/:id/questions

Rôle : Ajouter ou modifier une question générée pour ce fragment. Corps : `{"question":"...","question_id":"..."}`, `question` obligatoire ; `question_id` vide = création.

Réponse : 200 `{"success":true,"data":{GeneratedQuestion}}`

```bash
curl -X PUT $BASE/api/v1/chunks/by-id/c-1/questions -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"question_id":"q-1","question":"Comment configurer le magasin vectoriel dans WeKnora ?"}'
```

### POST /api/v1/chunks/by-id/:id/questions/regenerate

Rôle : Régénérer les questions de recherche à partir du contenu actuel du fragment. Après édition du contenu, les anciennes questions ne sont pas supprimées mais marquées « expirées » (révision incompatible avec le texte courant) ; cet endpoint permet de les actualiser.

Réponse : 200 `{"success":true,"data":[{GeneratedQuestion}]}`

```bash
curl -X POST $BASE/api/v1/chunks/by-id/c-1/questions/regenerate -H "Authorization: Bearer $TOKEN"
```

## Étiquettes (`/api/v1/knowledge-bases/:id/tags`)

Handler : `internal/handler/tag.go`. Lecture : Viewer+ + read KB (clé API `retrieve`/full) ; écriture : créateur de la KB OU Admin+ + write KB (clé API `ingest`/full).

### GET /api/v1/knowledge-bases/:id/tags

Rôle : Lister les étiquettes. Paramètres de requête : `page`, `page_size`, `keyword` (tous optionnels).

Réponse : 200 `{"success":true,"data":[KnowledgeTag]}`

```bash
curl $BASE/api/v1/knowledge-bases/kb-1/tags -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/knowledge-bases/:id/tags

Rôle : Créer une étiquette.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui (`binding:"required"`) | Nom de l’étiquette |
| `color` | string | non | Couleur |
| `sort_order` | int | non | Ordre d’affichage |

Réponse : 200 `{"success":true,"data":{KnowledgeTag}}`

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/tags -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Après-vente"}'
```

### PUT /api/v1/knowledge-bases/:id/tags/:tag_id

Rôle : Mettre à jour une étiquette (`tag_id` accepte UUID ou entier `seq_id`). Corps : `name` / `color` / `sort_order` (champs pointeurs, tous optionnels).

Réponse : 200 `{"success":true,"data":{KnowledgeTag}}`

```bash
curl -X PUT $BASE/api/v1/knowledge-bases/kb-1/tags/t-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Support après-vente"}'
```

### DELETE /api/v1/knowledge-bases/:id/tags/:tag_id

Rôle : Supprimer une étiquette. Paramètres de requête : `force` (bool, supprime aussi les documents ou entrées FAQ qui référencent l’étiquette), `content_only` (bool, supprime uniquement le contenu sous l’étiquette, conserve l’étiquette). Corps (optionnel) : `{"exclude_ids":[int64]}`, liste des `seq_id` d’entrées FAQ à conserver lors de la suppression. Sans `force`, si des connaissances ou FAQ référencent encore l’étiquette → 400, les documents ne sont pas supprimés.

Corps mal formé ou ID non entier positif → 400 ; ID inexistant → 404 ; ID d’entrée FAQ n’appartenant pas à la KB courante → 403.

Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/knowledge-bases/kb-1/tags/t-1 -H "Authorization: Bearer $TOKEN"
```

## Aperçu de découpage (debug)

### POST /api/v1/chunker/preview

Rôle : Aperçu de découpage sans persistance (panneau debug de l’éditeur KB). Permissions : Viewer+ ; clé API `retrieve` / `ingest` / full. Handler : `internal/handler/chunker_debug.go`

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `text` | string | oui (validation code : non vide, ≤ 64k caractères) | Texte d’exemple |
| `chunking_config.chunk_size` | int | non | Taille de fragment en caractères |
| `chunking_config.chunk_overlap` | int | non | Chevauchement |
| `chunking_config.separators` | []string | non | Séparateurs |
| `chunking_config.strategy` | string | non | `auto` / `heading` / `heuristic` / `recursive` / `legacy` |
| `chunking_config.token_limit` | int | non | Plafond de tokens |
| `chunking_config.languages` | []string | non | Indice de langue |
| `chunking_config.enable_parent_child` | bool | non | Essai parent/enfant ; la réponse contient les sous-fragments (granularité de recherche) |
| `chunking_config.parent_chunk_size` / `child_chunk_size` | int | non | Tailles parent/enfant, défaut 4096 / 384 |

Les balises HTML inline `<table>` du texte d’exemple sont converties en tableaux Markdown, comme à l’ingestion.

Réponse : 200 `{"success":true,"data":{"selected_tier","tier_chain","rejected","profile","chunks":[...],"stats":{count,avg_chars,min_chars,max_chars,stddev_chars,truncated_to}}}` ; texte trop long → 413 ; découpage expiré (5 s) → 504.

```bash
curl -X POST $BASE/api/v1/chunker/preview -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"text":"# Titre\nCorps...","chunking_config":{"chunk_size":512}}'
```

## Référence d’implémentation

Enregistrement des routes : `RegisterChunkRoutes`, `RegisterKnowledgeTagRoutes`, `RegisterChunkerDebugRoutes` dans `internal/router/routes_knowledge.go`.
