# Référence API : mémoire à long terme

Gestion de la mémoire à long terme de l’appelant, des thèmes et préférences document, et de la configuration mémoire au niveau de l’espace. Les chemins utilisent le préfixe `/api/v1`.

Toutes les interfaces personnelles exigent Viewer+ ; la clé API doit être full-access. Le périmètre est dérivé des identifiants ; aucun `subject_id` arbitraire. Dans les exemples, `$BASE` est l’URL du service et `$TOKEN` le Bearer token de l’utilisateur courant.

## Configuration de l’espace et interrupteurs de requête

La configuration d’espace passe par `GET/PUT /tenants/kv/memory-config`, pas par la mise à jour du nom ou de la description de l’espace. Lecture : Viewer+ ; écriture : Admin+ ; clé API : `manage_tenant_settings` ou full-access. Réponse `{success,data:MemoryConfig}` ; le PUT envoie directement l’objet de configuration ; `PUT /memory/settings` ne remplace pas les interrupteurs d’espace.

```bash
curl -X PUT "$BASE/api/v1/tenants/kv/memory-config" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"enabled":true,"write_mode":"explicit_only","max_items":200}'
```

Champs `memory_config` : `enabled`, `write_mode` (`explicit_only` / `auto`), `extract_model_id`, `max_items`, `extract_delay_seconds`, `extract_min_interval_seconds`, `extract_instructions`, `interest_threshold`, `embedding_model_id`, `vector_recall`, `retrieval_conditioning`. Sémantique : [Mémoire à long terme](../03-features/23-memory.md). À la mise à jour, soumettre l’objet de configuration complet à conserver.

`CustomAgentConfig.memory_enabled` : omis = héritage de l’espace ; `false` interdit lecture/écriture mémoire pour cet agent. IM/Embed suivent l’agent lié ; la structure canal actuelle n’a pas de champ `memory_enabled` dédié.

## Paramètres personnels

| Méthode | Chemin | Requête / réponse |
| --- | --- | --- |
| GET | `/memory/settings` | `{success,data:{workspace_enabled,user_enabled,effective,write_mode,item_count,max_items}}` |
| PUT | `/memory/settings` | `{"enabled":true}`, `enabled` obligatoire ; renvoie les settings mis à jour |

`effective` fusionne les interrupteurs espace et utilisateur ; une conversation dépend aussi de l’interrupteur agent.

```bash
curl -X PUT "$BASE/api/v1/memory/settings" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"enabled":true}'
```

## Entrées

| Méthode | Chemin | Requête / réponse |
| --- | --- | --- |
| GET | `/memory/items` | `status`, `limit`, `offset` optionnels ; `{success,data:[MemoryItem],total}` |
| POST | `/memory/items` | `{kind,content,importance}` ; 200 `{success,data:MemoryItem}` |
| PUT | `/memory/items/:id` | `{content,importance}` ; 200 `{success,data:MemoryItem}` |
| DELETE | `/memory/items/:id` | 200 `{"success":true}` |
| POST | `/memory/items/:id/confirm` | 200 `{success,data:MemoryItem}` ; 409 si l’inférence a expiré ou sa base a changé |
| POST | `/memory/items/:id/reject` | 200 `{"success":true}` |
| DELETE | `/memory/items` | Vide l’identité courante ; 200 `{success,removed}` |

`status` : `active`, `pending`, `superseded`, `archived` ; omis = pas de filtre. `limit` par défaut 50, plage 1–200, hors plage → 50. `offset` par défaut 0, négatif → 0. `kind` : `profile` / `preference` / `fact` / `task` / `interest` ; contenu court (max 300 caractères), `importance` pour le tri.

MemoryItem inclut `id`, `kind`, `content`, `topic`, `importance`, `origin`, `status`, `source_session_id`, `source_message_id`, `expires_at`, `superseded_by`, horodatages. `pending` n’est pas injecté dans le prompt ; après édition manuelle, traité comme maintenance manuelle.

Une inférence `pending` qui modifie une entrée existante laisse l’ancienne active jusqu’à confirmation ; la confirmation active l’inférence et remplace l’ancienne entrée dans la même transaction. Inférence expirée, échue ou dont la base a été modifiée/supprimée → impossible à confirmer, 409 — le client doit rafraîchir la liste. Contenu composé surtout d’identifiants sensibles → 400 à la création/édition.

```bash
curl -X POST "$BASE/api/v1/memory/items" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"kind":"preference","content":"Donner d’abord la conclusion, puis le raisonnement","importance":3}'

curl "$BASE/api/v1/memory/items?status=pending&limit=50&offset=0" \
  -H "Authorization: Bearer $TOKEN"

curl -X POST "$BASE/api/v1/memory/items/item-1/confirm" \
  -H "Authorization: Bearer $TOKEN"
```

## Thèmes et préférences document

| Méthode | Chemin | Description |
| --- | --- | --- |
| GET | `/memory/topics` | Thèmes suivis non encore promus ; `limit`/`offset` comme pour les entrées ; `data` et `total` |
| POST | `/memory/topics/:id/promote` | Promotion manuelle en intérêt durable ; `{success,data:MemoryItem}` |
| DELETE | `/memory/topics/:id` | Arrêter le suivi du thème ; `success` |
| GET | `/memory/documents` | Préférences document ; `limit`/`offset` ; `data` et `total` |
| DELETE | `/memory/documents/:id` | Supprime l’enregistrement de préférence, pas le document en base de connaissances |

Thème : `id` / `topic` / `aliases` / `hits` / `threshold` / `last_seen_at` ; Document : `id` / `knowledge_id` / `knowledge_base_id` / `title` / `hits` / `last_used_at`. La suppression utilise l’id de préférence.

```bash
curl "$BASE/api/v1/memory/topics" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE/api/v1/memory/topics/topic-1/promote" \
  -H "Authorization: Bearer $TOKEN"
curl -X DELETE "$BASE/api/v1/memory/documents/affinity-1" \
  -H "Authorization: Bearer $TOKEN"
```

## Export et consolidation immédiate

`GET /memory/export` → `{success,total,truncated,data}` avec nom de fichier `weknora-memories.json`. Plafond 20 000 entrées ; vérifier `truncated` si la limite est atteinte.

`POST /memory/consolidate` → `{success,data:{merged,demoted,expired,reviewed,candidates,skipped?}}` : fusionne les entrées proches, archive les éléments échus. `skipped` indique la raison s’il n’y a aucun changement.

```bash
curl "$BASE/api/v1/memory/export" -H "Authorization: Bearer $TOKEN" \
  -o weknora-memories.json
curl -X POST "$BASE/api/v1/memory/consolidate" -H "Authorization: Bearer $TOKEN"
```

Paramètres invalides, contenu sensible ou mémoire désactivée → 400 ; entrée introuvable pour l’identité courante → 404 ; conflit de confirmation → 409 ; authentification/permissions insuffisantes → 401/403. Aucun paramètre admin pour lire la mémoire d’un autre sujet. Implémentation : `internal/handler/memory.go`, `internal/router/routes_memory.go`.
