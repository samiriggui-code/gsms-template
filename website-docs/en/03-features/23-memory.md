# Cross-session long-term memory
Long-term memory keeps the caller’s profile, expression preferences, stable facts, and durable interests for later sessions. Data is isolated by workspace and caller identity: workspaces, IM users, and embed visitors each maintain personal memory.

## Enable and use long-term memory {#enable-and-use-long-term-memory}
1. Workspace Admin/Owner: **Settings → Long-term memory**, enable the switch (off by default).
2. Choose **Explicit memory only** or **Automatic extraction**; in auto mode, optional extraction model (empty = conversation model).
3. In personal memory management you can disable memory for yourself; an enabled workspace does not force it on you.
4. In conversation, state clearly what to remember, or add manually via memory management; verify in another session.
5. Review pending confirmation entries regularly: confirm, edit, or reject inferences; delete what is no longer valid.

| Mode | Behavior |
| --- | --- |
| `explicit_only` | Records only what is explicitly requested; no background LLM distillation |
| `auto` | Additional background extraction from conversations, merged per delay and minimum interval |

`memory_enabled=false` on an agent disables memory read/write for that agent; omitted = inherit workspace settings. IM/Embed follow the linked agent’s memory preferences; the API key must be full-access for personal memory management APIs. The feature depends jointly on workspace, personal profile, and request context.

## Manage memory
| Action | Usage |
| --- | --- |
| Add / edit | Maintain profile, preferences, facts, tasks, or interests; manual edit is no longer overwritten by auto extraction |
| Confirm pending | Inferred entry goes from pending to usable; unconfirmed = not injected into the prompt. If inference modifies an existing entry, the old one stays active until confirmation then replacement; expired inference → confirmation fails, refresh the list |
| Reject / delete | Cancel wrong or obsolete memory; rejection leaves an inhibition trace to limit re-extraction |
| Topic elevation | Promote a recurring subject to durable interest immediately; stop tracking a theme |
| Document preferences | See often-cited documents; remove a personalized search preference that is no longer useful |
| Immediate consolidation | Merge close entries, archive due tasks, without waiting for background job |
| Export / clear | Download your memory JSON, or wipe your memory data |

Items cover profile, preferences, facts, tasks, and interests. A new fact on the same topic may replace the old one. Disabling profile suspends use; delete or clear removes data. Categories and statuses in the [Memory API](../04-api/02-api-memory.md).

## Impact on answers and retrieval
The system injects profile, preferences, and interests as permanent context (length budget), and recalls facts and tasks relevant to the question. With a configured vector model, semantic recall ranks all identity entries by question relevance, without relative importance; with pgvector on PostgreSQL sorting is in-database, otherwise computed in the service. In intelligent reasoning, active search in memory and history. Memory only affects understanding and context choice, not knowledge base access rights.

With retrieval personalization enabled, themes help interpret the question and often-cited documents rerank. The conversation timeline shows memory-related steps. Background jobs track extraction cursor and pending state per session: short bursts, batch truncation, or restart do not lose messages. If model output stays invalid on a segment, up to three retries then skip the segment without auto re-extraction of the skipped segment.

## Troubleshooting: memory not applied {#troubleshooting-memory-not-applied}
| Symptom | Check |
| --- | --- |
| Memory not used | Workspace, personal, and agent switches; workspace or identity change |
| No auto extraction | write_mode, extraction delay/interval, model and background jobs |
| Inference has no effect on answer | Still pending; usable only after confirmation |
| Stops citing a document | Remove in document preferences; KB rights remain independent |
| Immediate consolidation merges nothing | `skipped` reason in response (few items, no candidates) |

## Workspace configuration
Workspace admin manages switch, extraction mode, and model in settings. Config in `memory_config`, read/updated via `GET/PUT /tenants/kv/memory-config`; full fields in the [Memory API](../04-api/02-api-memory.md).

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | bool | `false` | Workspace switch |
| `write_mode` | string | `explicit_only` | `explicit_only` / `auto`; other values treated as `explicit_only` |
| `extract_model_id` | string | empty | Extraction model; empty = conversation model |
| `extract_delay_seconds` | int | `90` | Delay after reply before extraction, merges nearby turns; 5–3600 |
| `extract_min_interval_seconds` | int | `300` | Minimum interval between two extractions for one person; messages in interval deferred; max 86400 |
| `extract_instructions` | string | empty | Workspace-specific extraction rules, max 1000 characters |
| `max_items` | int | `200` | Active item cap per identity, max 2000; 0 = default |
| `interest_threshold` | int | `3` | Sessions a theme must appear before durable interest, max 20 |
| `embedding_model_id` | string | empty | Vector model for memory recall; empty = lexical match only |
| `vector_recall` | bool | omitted = on | Semantic recall when vector model configured |
| `retrieval_conditioning` | bool | omitted = on | Allow memory to influence question and document ranking |

The extraction model is for background synthesis; the vector model for matching with the question. Memory increases model calls; deleting a model referenced by memory config shows dependencies.

## Implementation reference
- `internal/application/service/memory/`: scope, extraction, recall, themes, document preferences, consolidation
- `internal/handler/memory.go`, `internal/router/routes_memory.go`: personal API
- `internal/types/memory.go`: models, budgets, states, and config
- `frontend/src/views/settings/MemorySettings.vue`, `MemoryWorkspaceSettings.vue`
