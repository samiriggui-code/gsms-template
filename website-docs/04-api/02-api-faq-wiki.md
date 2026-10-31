# Référence API : FAQ et Wiki

Gestion des entrées FAQ et des pages Wiki dans une base de connaissances : import, recherche, édition et restauration de versions.

Les deux groupes sont des sous-ressources de contenu KB : lecture — Viewer+ et droit de lecture KB (clé API `retrieve`/full) ; écriture — « créateur de la KB OU Admin+ » et droit d’écriture KB (clé API `ingest`/full), sous réserve de la liste blanche KB. La recherche Wiki inter-KB `POST /wiki-search` n’a pas de KB dans le chemin : Viewer+ et clé API `retrieve`/full ; le handler vérifie pour chaque KB cible la allow-list et le droit Viewer sur les bases partagées.

## FAQ (`/api/v1/knowledge-bases/:id/faq`)

### GET /api/v1/knowledge-bases/:id/faq/entries

Rôle : Lister les entrées FAQ.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `page` / `page_size` | int | non | Pagination |
| `tag_id` | int | non | Ancien seq_id d’étiquette unique |
| `tag_ids` | string | non | UUID d’étiquettes séparés par des virgules |
| `keyword` | string | non | Mot-clé |
| `search_field` | string | non | `standard_question`/`similar_questions`/`answers` (tous les champs par défaut) |
| `sort_order` | string | non | `asc` (par défaut tri par date de mise à jour décroissante) |
| `is_enabled` | bool | non | Filtrer par état activé : `true` uniquement actives, `false` uniquement désactivées, omis = toutes ; autre valeur → 400 |

Réponse : 200 `{"success":true,"data":{liste paginée FAQEntry}}`

```bash
curl "$BASE/api/v1/knowledge-bases/kb-1/faq/entries?page=1&is_enabled=false" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge-bases/:id/faq/entries/export

Rôle : Exporter les FAQ. Paramètre de requête : `format` (`csv` par défaut / `json`).

Réponse : 200 téléchargement de fichier (`text/csv` ou `application/json`).

```bash
curl -OJ "$BASE/api/v1/knowledge-bases/kb-1/faq/entries/export?format=csv" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledge-bases/:id/faq/entries/:entry_id

Rôle : Détail d’une entrée FAQ (`entry_id` = seq_id entier).

Réponse : 200 `{"success":true,"data":{FAQEntry}}`

```bash
curl $BASE/api/v1/knowledge-bases/kb-1/faq/entries/12 -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/knowledge-bases/:id/faq/entries

Rôle : Upsert / import en lot (tâche asynchrone). Méthode handler `UpsertEntries`.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `entries` | []FAQEntryPayload | oui (`binding:"required"`) | Entrées en lot |
| `mode` | string | oui (`binding:"oneof=append replace"`) | Ajout ou remplacement |
| `knowledge_id` | string | non | ID de l’entité de connaissance FAQ |
| `task_id` | string | non | ID de tâche personnalisé : lettres, chiffres, `_`, `-` uniquement, max 128 caractères, sinon 400 |
| `dry_run` | bool | non | Validation seule, sans persistance |

Réponse : 200 `{"success":true,"data":{"task_id"}}`

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/faq/entries -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"mode":"append","entries":[{"standard_question":"Comment obtenir un remboursement?","answers":["Contacter le support"]}]}'
```

### POST /api/v1/knowledge-bases/:id/faq/entry

Rôle : Créer une entrée FAQ. Corps (`types.FAQEntryPayload`) :

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `standard_question` | string | oui (`binding:"required"`) | Question standard |
| `similar_questions` | []string | non | Questions similaires |
| `negative_questions` | []string | non | Questions négatives (contre-exemples) |
| `answers` | []string | non | Liste de réponses |
| `answer_strategy` | string | non | `all` / `random` |
| `tag_id` | int64 | non | seq_id d’étiquette |
| `tag_name` | string | non | Nom d’étiquette |
| `is_enabled` / `is_recommended` | *bool | non | Activée / recommandée |

Réponse : 200 `{"success":true,"data":{FAQEntry}}`

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/faq/entry -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"standard_question":"Comment obtenir un remboursement?","answers":["Remboursement sous 7 jours"]}'
```

### PUT /api/v1/knowledge-bases/:id/faq/entries/:entry_id

Rôle : Mettre à jour une entrée FAQ (même corps que la création).

Réponse : 200 `{"success":true,"data":{FAQEntry}}`

```bash
curl -X PUT $BASE/api/v1/knowledge-bases/kb-1/faq/entries/12 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"standard_question":"Comment obtenir un remboursement?","answers":["Remboursement sous 30 jours"]}'
```

### POST /api/v1/knowledge-bases/:id/faq/entries/:entry_id/similar-questions

Rôle : Ajouter des questions similaires. Corps : `{"similar_questions":["..."]}` (`binding:"required,min=1"`).

Réponse : 200 `{"success":true,"data":{FAQEntry}}`

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/faq/entries/12/similar-questions \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"similar_questions":["Comment faire un remboursement"]}'
```

### PUT /api/v1/knowledge-bases/:id/faq/entries/fields

Rôle : Mise à jour en lot de champs d’entrées (`is_enabled`/`is_recommended`/`tag_id`).

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `by_id` | map[int64]object | non | Mise à jour par seq_id d’entrée |
| `by_tag` | map[int64]object | non | Mise à jour en lot par étiquette |
| `exclude_ids` | []int64 | non | Entrées exclues avec `by_tag` |

Réponse : 200 `{"success":true}`

```bash
curl -X PUT $BASE/api/v1/knowledge-bases/kb-1/faq/entries/fields -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"by_id":{"12":{"is_enabled":false}}}'
```

### PUT /api/v1/knowledge-bases/:id/faq/entries/tags

Rôle : Modifier en lot les étiquettes des entrées. Corps : `{"updates":{"<entry_id>":<tag_id|null>}}` (`binding:"required,min=1"` ; `null` retire l’étiquette).

Réponse : 200 `{"success":true}`

```bash
curl -X PUT $BASE/api/v1/knowledge-bases/kb-1/faq/entries/tags -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"updates":{"12":3}}'
```

### DELETE /api/v1/knowledge-bases/:id/faq/entries

Rôle : Supprimer des entrées en lot. Corps : `{"ids":[int64]}` (`binding:"required,min=1"`).

Réponse : 200 `{"success":true}`

```bash
curl -X DELETE $BASE/api/v1/knowledge-bases/kb-1/faq/entries -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"ids":[12,13]}'
```

### POST /api/v1/knowledge-bases/:id/faq/search

Rôle : Recherche FAQ (sémantique lecture seule ; une clé limitée `retrieve` peut aussi appeler).

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `query_text` | string | oui (`binding:"required"`) | Requête |
| `vector_threshold` | float64 | non | Seuil vectoriel, défaut 0,7 |
| `match_count` | int | non | Défaut 10, plafond 50 |
| `first_priority_tag_ids` / `second_priority_tag_ids` | []int64 | non | Filtre par priorité d’étiquettes |
| `only_recommended` | bool | non | Uniquement les entrées recommandées |

Réponse : 200 `{"success":true,"data":[FAQEntry(avec match_type/score)]}`

```bash
curl -X POST $BASE/api/v1/knowledge-bases/kb-1/faq/search -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' -d '{"query_text":"remboursement"}'
```

### PUT /api/v1/knowledge-bases/:id/faq/import/last-result/display

Rôle : Définir l’affichage du panneau du dernier résultat d’import. Corps : `{"display_status":"open|close"}` (`binding:"required,oneof=open close"`).

Réponse : 200 `{"success":true}`

```bash
curl -X PUT $BASE/api/v1/knowledge-bases/kb-1/faq/import/last-result/display \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"display_status":"close"}'
```

### GET /api/v1/faq/import/progress/:task_id

Rôle : Progression d’import FAQ / dry-run (tâches isolées par espace). Permissions : Viewer+ ; clé API `retrieve`/`ingest`/full.

Réponse : 200 `{"success":true,"data":{status,progress,failed_entries,...}}`

```bash
curl $BASE/api/v1/faq/import/progress/task-1 -H "X-API-Key: $API_KEY"
```

## Wiki (`/api/v1/knowledgebase/:kb_id/wiki`)

Note : le préfixe de ce groupe est `/knowledgebase/:kb_id/wiki` (singulier, sans trait d’union). Handler : `internal/handler/wiki_page.go`. Les réponses de ce groupe sont souvent des **objets bruts** (sans enveloppe `success`).

### GET /api/v1/knowledgebase/:kb_id/wiki/pages

Rôle : Lister les pages Wiki.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `page_type` | string | non | Types séparés par des virgules |
| `status` | string | non | Statut de page |
| `query` | string | non | Recherche full-text |
| `category_path` | string | non | Filtre de chemin séparé par `/` |
| `folder_id` | string | non | Filtre exact de dossier (chaîne vide = racine) |
| `category_depth` | int | non | Profondeur de catégorie |
| `page` / `page_size` | int | non | Pagination (défaut 1/20) |
| `sort_by` / `sort_order` | string | non | Champs de tri : `title`, `created_at`, `updated_at`, `page_type`, `wiki_path`, `sort_order`, `depth` ; autre valeur → `updated_at` ; défaut `updated_at` desc |

Réponse : 200 `WikiPageListResponse`

```bash
curl "$BASE/api/v1/knowledgebase/kb-1/wiki/pages?page=1" -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/knowledgebase/:kb_id/wiki/pages

Rôle : Créer une page. Corps (`types.WikiPage`) : `slug`, `title`, `content`, `folder_id`, `page_type`, etc. (tous optionnels ; slug généré automatiquement si absent).

Réponse : 201 `WikiPage`

```bash
curl -X POST $BASE/api/v1/knowledgebase/kb-1/wiki/pages -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"Vue d’ensemble de l’architecture","content":"# Vue d’ensemble"}'
```

### PUT /api/v1/knowledgebase/:kb_id/wiki/move-page

Rôle : Déplacer une page vers un dossier. Corps : `{"slug":"<slug de page>","folder_id":"<ID dossier|vide=racine>"}` (slug obligatoire).

Réponse : 200 `WikiPage`

```bash
curl -X PUT $BASE/api/v1/knowledgebase/kb-1/wiki/move-page -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"slug":"overview","folder_id":"f-1"}'
```

### GET /api/v1/knowledgebase/:kb_id/wiki/pages/*slug

Rôle : Obtenir une page (`*slug` = chemin wildcard).

Réponse : 200 `WikiPageDetail`. Conserve tous les champs de `WikiPage` et ajoute `in_link_titles`, qui mappe les slugs présents dans `in_links` vers le titre affiché, par ex. `{"concept/example":"Titre d’exemple"}`. Objet vide s’il n’y a pas de liens entrants résolvables ; les cibles inexistantes n’apparaissent pas. Échec de résolution des titres → 500, pour éviter une réponse « succès » incomplète.

```bash
curl $BASE/api/v1/knowledgebase/kb-1/wiki/pages/overview -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/knowledgebase/:kb_id/wiki/pages/*slug

Rôle : Mettre à jour une page (même corps que la création). L’ancienne version est entièrement snapshotée dans `wiki_page_revisions`, `version` est incrémentée, `last_edit_source` vaut `user` (outil Agent → `agent`).

Réponse : 200 `WikiPage`

```bash
curl -X PUT $BASE/api/v1/knowledgebase/kb-1/wiki/pages/overview -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"content":"# Vue d’ensemble mise à jour"}'
```

### GET /api/v1/knowledgebase/:kb_id/wiki/revisions/*slug

Rôle : Historique des versions de la page (migration `000075`). Permissions : Viewer+ + KBAccessRead.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `version` | int | non | Si fourni, retourne **le contenu intégral de cette version** (pour diff) ; invalide ou < 1 → 400 ; introuvable → 404 (versions antérieures à la migration ou snapshots purgés par la rétention : normal) |
| `limit` | int | non | Défaut 50, plafond 200 ; mode liste uniquement |
| `offset` | int | non | Décalage de pagination |

Sans `version` : liste d’historique (numéros décroissants, **sans corps**) plus la version courante de la page ; chaque entrée inclut `edit_source` (`pipeline` / `agent` / `user` / `revert`), `editor_id`, `edited_at`.

Rétention à deux niveaux : plafond souple 50 versions ne rogne que les snapshots `pipeline` et source vide ; plafond dur 200 pour toutes les sources, donc les éditions manuelles ne sont pas effacées par le pipeline.

```bash
# Liste d’historique
curl $BASE/api/v1/knowledgebase/kb-1/wiki/revisions/entity/acme-corp -H "Authorization: Bearer $TOKEN"
# Contenu intégral de la version 3
curl "$BASE/api/v1/knowledgebase/kb-1/wiki/revisions/entity/acme-corp?version=3" -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/knowledgebase/:kb_id/wiki/revert

Rôle : Restaurer une page à une version historique. Permissions : propriétaire KB ou Admin+ + KBAccessWrite.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `slug` | string | oui | Page cible |
| `version` | int | oui | Numéro de version cible (≥ 1) |

Le revert **ne recule pas le numéro de version** : le contenu de la version cible est écrit comme nouvelle version, `last_edit_source` = `revert`, donc un revert peut être annulé. Revert vers la version courante → 400 (souvent liste d’historique obsolète côté client).

Réponse : 200 `WikiPage`

```bash
curl -X POST $BASE/api/v1/knowledgebase/kb-1/wiki/revert -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"slug":"entity/acme-corp","version":3}'
```

### DELETE /api/v1/knowledgebase/:kb_id/wiki/pages/*slug

Rôle : Supprimer une page.

Réponse : 204 No Content

```bash
curl -X DELETE $BASE/api/v1/knowledgebase/kb-1/wiki/pages/overview -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledgebase/:kb_id/wiki/folders

Rôle : Lister les dossiers. Paramètres : `parent_id` (vide = racine), `page_types` (séparés par des virgules).

Réponse : 200 `WikiFolderListResponse`

```bash
curl $BASE/api/v1/knowledgebase/kb-1/wiki/folders -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/knowledgebase/:kb_id/wiki/folders

Rôle : Créer un dossier.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `name` | string | oui | Nom du dossier |
| `parent_id` | string | non | Dossier parent |

Réponse : 201 `WikiFolder`

```bash
curl -X POST $BASE/api/v1/knowledgebase/kb-1/wiki/folders -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Documentation de conception"}'
```

### PUT /api/v1/knowledgebase/:kb_id/wiki/folders/:folder_id

Rôle : Renommer / déplacer un dossier. Corps : `name`, `parent_id`, `move_parent` (bool), tous optionnels.

Réponse : 200 `WikiFolder`

```bash
curl -X PUT $BASE/api/v1/knowledgebase/kb-1/wiki/folders/f-1 -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Conception d’architecture"}'
```

### DELETE /api/v1/knowledgebase/:kb_id/wiki/folders/:folder_id

Rôle : Supprimer un dossier.

Réponse : 204 No Content

```bash
curl -X DELETE $BASE/api/v1/knowledgebase/kb-1/wiki/folders/f-1 -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledgebase/:kb_id/wiki/index

Rôle : Page d’index Wiki (fenêtres groupées par type). Paramètres : `types` (séparés par des virgules), `limit` (1–200, défaut 50), `cursor`.

Réponse : 200 `WikiIndexResponse`

```bash
curl $BASE/api/v1/knowledgebase/kb-1/wiki/index -H "Authorization: Bearer $TOKEN"
```

::: warning Supprimé
`GET /api/v1/knowledgebase/:kb_id/wiki/log` (journal des changements Wiki) a été retiré avec la migration `000077_remove_wiki_log` ; la table `wiki_log_entries` a été supprimée. Les changements Wiki sont projetés dans le flux d’activité de la KB : utiliser `GET /api/v1/knowledge-bases/:id/activity`.
:::

### GET /api/v1/knowledgebase/:kb_id/wiki/graph

Rôle : Graphe de relations entre pages.

| Paramètre | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `mode` | string | non | `overview` (défaut) / `ego` |
| `center` | string | non | Slug central en mode ego (obligatoire en mode ego) |
| `depth` | int | non | 1–3, défaut 1 |
| `types` | string | non | Filtre `page_type` |
| `limit` | int | non | Défaut 500, plafond 2000 |

Réponse : 200 `WikiGraphData`

```bash
curl "$BASE/api/v1/knowledgebase/kb-1/wiki/graph?mode=overview" -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledgebase/:kb_id/wiki/stats

Rôle : Statistiques Wiki.

Réponse : 200 `WikiStats`

```bash
curl $BASE/api/v1/knowledgebase/kb-1/wiki/stats -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledgebase/:kb_id/wiki/search

Rôle : Recherche de pages. Paramètres : `q` (obligatoire), `limit` (défaut 10).

Sémantique de correspondance selon le dialecte de stockage :

- Postgres : `q` correspond via regex POSIX (`~*`, insensible à la casse).
- SQLite / Lite : correspondance sous-chaîne littérale `LIKE` ; `%` / `_` échappés, pas traités comme jokers.

Réponse : 200 `{"pages":[WikiPage]}`

```bash
curl "$BASE/api/v1/knowledgebase/kb-1/wiki/search?q=déploiement" -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/wiki-search

Rôle : Recherche de pages Wiki inter-KB (sans session, pas de recherche hybride). Handler : `SearchPagesAcross` dans `internal/handler/wiki_page.go`. Même algorithme que `GET .../wiki/search` sur une KB (titre > slug > summary > corps), une requête sur plusieurs KB puis troncature globale par `match_rank`. Clé API : `retrieve`/full.

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `query` | string | oui (`binding:"required"`) | Comme `q` mono-KB : regex POSIX sur Postgres (insensible à la casse) ; sous-chaîne `LIKE` littérale sur SQLite / Lite |
| `knowledge_base_ids` | []string | conditionnel | Multi-KB ; au moins un de `knowledge_base_ids` ou `knowledge_base_id`, max 32 |
| `knowledge_base_id` | string | non | Champ mono-KB de compatibilité, fusionné dans ids |
| `limit` | int | non | Top-N global, défaut 10, max 50 |

Wiki désactivé sur une KB cible → 400. KB inexistante ou sans lecture → 404. Clé API hors allow-list → 403. Regex invalide (Postgres) → 400.

Réponse : 200 `{"success":true,"data":[WikiSearchHit]}`. Les hits ne contiennent que des champs de navigation + `match_snippet`, pas le corps ; le texte intégral via `GET /knowledgebase/:kb_id/wiki/pages/{slug}`.

| Champ réponse | Type | Description |
| --- | --- | --- |
| `id` | string | ID de page |
| `knowledge_base_id` | string | KB source, pour construire l’URL de lecture inter-KB |
| `slug` | string | Slug de page |
| `title` | string | Titre |
| `page_type` | string | Type de page |
| `aliases` | []string | Alias |
| `summary` | string | Résumé |
| `match_snippet` | string | Environ 60 caractères avant + correspondance + 60 après la première occurrence dans le corps ; omis sans hit dans le corps. Le snippet compile `query` en regex Go ; sous SQLite, si `query` contient des métacaractères regex, hit possible en base mais snippet parfois vide |

`content`, arborescence/liens/métadonnées et horodatages ne sont pas dans les résultats de recherche. `GET .../wiki/search` mono-KB renvoie toujours un `WikiPage` complet.

```bash
curl -X POST $BASE/api/v1/wiki-search -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"query":"déploiement|release","knowledge_base_ids":["kb-1","kb-2"],"limit":10}'
```

### POST /api/v1/knowledgebase/:kb_id/wiki/rebuild-links

Rôle : Reconstruire les liens entre pages. Droits d’écriture. Sans corps.

Réponse : 200 `{"message":"Links rebuilt successfully"}`

```bash
curl -X POST $BASE/api/v1/knowledgebase/kb-1/wiki/rebuild-links -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledgebase/:kb_id/wiki/lint

Rôle : Rapport de cohérence Wiki.

Réponse : 200 `WikiLintReport`

```bash
curl $BASE/api/v1/knowledgebase/kb-1/wiki/lint -H "Authorization: Bearer $TOKEN"
```

### POST /api/v1/knowledgebase/:kb_id/wiki/auto-fix

Rôle : Correction automatique des problèmes lint. Droits d’écriture. Sans corps.

Réponse : 200 `{"fixed":N,"message":"Auto-fixed N issues"}`

```bash
curl -X POST $BASE/api/v1/knowledgebase/kb-1/wiki/auto-fix -H "Authorization: Bearer $TOKEN"
```

### GET /api/v1/knowledgebase/:kb_id/wiki/issues

Rôle : Liste des problèmes. Paramètres : `slug` (filtre par page), `status` (`pending`/`ignored`/`resolved`).

Réponse : 200 `[WikiPageIssue]`

```bash
curl $BASE/api/v1/knowledgebase/kb-1/wiki/issues -H "Authorization: Bearer $TOKEN"
```

### PUT /api/v1/knowledgebase/:kb_id/wiki/issues/:issue_id/status

Rôle : Mettre à jour le statut d’un problème. Droits d’écriture. Corps : `{"status":"pending|ignored|resolved"}` (`binding:"required"`). `issue_id` doit appartenir à la KB du chemin, sinon 404.

Réponse : 200 `{"message":"Issue status updated successfully"}`

```bash
curl -X PUT $BASE/api/v1/knowledgebase/kb-1/wiki/issues/i-1/status -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"resolved"}'
```

## Référence d’implémentation

Enregistrement des routes : `RegisterFAQRoutes` et `RegisterWikiPageRoutes` dans `internal/router/routes_knowledge.go`. Handlers : `internal/handler/faq.go`, `internal/handler/wiki_page.go`.
