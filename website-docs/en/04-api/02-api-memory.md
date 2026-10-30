# API reference: long-term memory

Manage the caller’s long-term memory, document themes and preferences, and workspace-level memory configuration. Paths use the `/api/v1` prefix.

All personal interfaces require Viewer+; the API key must be full-access. Scope is derived from the credential; no arbitrary `subject_id`. In examples, `$BASE` is the service URL and `$TOKEN` the current user’s Bearer token.

## Workspace configuration and query switches

Workspace configuration uses `GET/PUT /tenants/kv/memory-config`, not tenant name/description update. Read: Viewer+; write: Admin+; API key: `manage_tenant_settings` or full-access. Response `{success,data:MemoryConfig}`; PUT sends the configuration object directly; `PUT /memory/settings` does not replace workspace switches.

```bash
curl -X PUT "$BASE/api/v1/tenants/kv/memory-config" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"enabled":true,"write_mode":"explicit_only","max_items":200}'
```

`memory_config` fields: `enabled`, `write_mode` (`explicit_only`/`auto`), `extract_model_id`, `max_items`, `extract_delay_seconds`, `extract_min_interval_seconds`, `extract_instructions`, `interest_threshold`, `embedding_model_id`, `vector_recall`, `retrieval_conditioning`. Semantics: [Long-term memory](../03-features/23-memory.md). Submit the full object on update.

`CustomAgentConfig.memory_enabled`: omitted = inherit workspace; `false` disables memory for that agent. IM/Embed follow the linked agent; channels have no separate `memory_enabled` field today.

## Personal settings

| Method | Path | Request / response |
| --- | --- | --- |
| GET | `/memory/settings` | `{success,data:{workspace_enabled,user_enabled,effective,write_mode,item_count,max_items}}` |
| PUT | `/memory/settings` | `{"enabled":true}`, `enabled` required; returns updated settings |

`effective` merges workspace and user; a conversation also depends on the agent switch.

```bash
curl -X PUT "$BASE/api/v1/memory/settings" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"enabled":true}'
```

## Items

| Method | Path | Request / response |
| --- | --- | --- |
| GET | `/memory/items` | Optional `status`, `limit`, `offset`; `{success,data:[MemoryItem],total}` |
| POST | `/memory/items` | `{kind,content,importance}`; 200 `{success,data:MemoryItem}` |
| PUT | `/memory/items/:id` | `{content,importance}`; 200 `{success,data:MemoryItem}` |
| DELETE | `/memory/items/:id` | 200 `{"success":true}` |
| POST | `/memory/items/:id/confirm` | 200 `{success,data:MemoryItem}`; 409 if inference expired or base changed |
| POST | `/memory/items/:id/reject` | 200 `{"success":true}` |
| DELETE | `/memory/items` | Clears current identity; 200 `{success,removed}` |

`status`: `active`, `pending`, `superseded`, `archived`; omitted = no filter. `limit` default 50, range 1–200; out of range → 50. `offset` default 0, negative → 0. `kind`: `profile`/`preference`/`fact`/`task`/`interest`; short content (max 300 characters), `importance` for sorting.

MemoryItem includes `id`, `kind`, `content`, `topic`, `importance`, `origin`, `status`, `source_session_id`, `source_message_id`, `expires_at`, `superseded_by`, timestamps. `pending` is not injected into the prompt; after manual edit, treated as manual maintenance.

Pending inferences that modify an existing item keep the old one active until confirmation; confirmation activates the inference and replaces the old one in the same transaction. Expired inference or deleted/changed base → 409, refresh the list. Content mostly composed of sensitive identifiers → 400 on create/edit.

```bash
curl -X POST "$BASE/api/v1/memory/items" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"kind":"preference","content":"Give the conclusion first, then the reasoning","importance":3}'

curl "$BASE/api/v1/memory/items?status=pending&limit=50&offset=0" \
  -H "Authorization: Bearer $TOKEN"

curl -X POST "$BASE/api/v1/memory/items/item-1/confirm" \
  -H "Authorization: Bearer $TOKEN"
```

## Topics and document preferences

| Method | Path | Description |
| --- | --- | --- |
| GET | `/memory/topics` | Tracked themes not yet promoted; limit/offset like items; `data` and `total` |
| POST | `/memory/topics/:id/promote` | Manual promotion to durable interest; `{success,data:MemoryItem}` |
| DELETE | `/memory/topics/:id` | Stop tracking; `success` |
| GET | `/memory/documents` | Document preferences; limit/offset; `data` and `total` |
| DELETE | `/memory/documents/:id` | Removes preference record, not the knowledge base document |

Topic: `id`/`topic`/`aliases`/`hits`/`threshold`/`last_seen_at`; Document: `id`/`knowledge_id`/`knowledge_base_id`/`title`/`hits`/`last_used_at`. Delete uses the preference id.

```bash
curl "$BASE/api/v1/memory/topics" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE/api/v1/memory/topics/topic-1/promote" \
  -H "Authorization: Bearer $TOKEN"
curl -X DELETE "$BASE/api/v1/memory/documents/affinity-1" \
  -H "Authorization: Bearer $TOKEN"
```

## Export and immediate consolidation

`GET /memory/export` → `{success,total,truncated,data}` with filename `weknora-memories.json`. Max 20,000 items; `truncated` if cap reached.

`POST /memory/consolidate` → `{success,data:{merged,demoted,expired,reviewed,candidates,skipped?}}`: merge synonyms, archive due tasks. `skipped` if no changes.

```bash
curl "$BASE/api/v1/memory/export" -H "Authorization: Bearer $TOKEN" \
  -o weknora-memories.json
curl -X POST "$BASE/api/v1/memory/consolidate" -H "Authorization: Bearer $TOKEN"
```

Invalid parameters, sensitive content, or memory disabled → 400; item not found for identity → 404; confirmation conflict → 409; auth/permissions → 401/403. No admin parameter to read another subject’s memory. Implementation: `internal/handler/memory.go`, `internal/router/routes_memory.go`.
