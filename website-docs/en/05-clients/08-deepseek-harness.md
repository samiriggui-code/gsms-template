# DeepSeek Harness plugin

The DeepSeek Harness (dsh) plugin connects to an existing WeKnora deployment via REST: search passages, read full documents, and answer with citations. Source: `packages/dsh-weknora`.

## Install and connect

```sh
dsh plugin --profile web add @wxg-prc-cpg/dsh-weknora

export WEKNORA_BASE_URL=https://weknora.example.com
export WEKNORA_API_KEY='<api-key>'
export WEKNORA_KNOWLEDGE_BASE_IDS=kb-123,kb-456
export WEKNORA_RESOURCE_URLS=public
dsh web
```

You can also run `dsh plugin --profile web add ./packages/dsh-weknora` from the repo root. The plugin requires Node ≥20.11; the validated dsh environment needs Node with zstd (≥22.15 or ≥24) and pnpm ≥10. Tested: dsh 0.1.0-rc.8 / WeKnora 0.8.0; for other versions, verify plugin interface compatibility.

The service URL may include `/api/v1`; otherwise it is appended automatically. The API key is sent via `X-API-Key`, capability `retrieve` required; `ask` also requires `chat`. With a platform key, set `tenantId` (sent as `X-Tenant-ID`).

## Four tools

| Tool | Usage |
| --- | --- |
| `weknora_list_knowledge_bases` | Visible knowledge bases and their IDs |
| `weknora_search` | Hybrid chunk search, document titles included; returns knowledge ID, chunk index, and score |
| `weknora_read_document` | Body ordered by document; first page with title/summary, pagination for long text |
| `weknora_ask` | Creates or resumes a WeKnora session; response, citations, and server-side tool trace |

`search` supplies evidence for dsh to draft answers; `ask` invokes the model on WeKnora and creates session/messages, suited to multi-document synthesis. Neither modifies knowledge base content.

Without an explicit knowledge base scope, the plugin resolves all bases visible to the credential, caches in memory, and shares between search/ask. With `agentId`, `ask` follows the Agent flow; scope is resolved server-side.

## Profile configuration

In `$DSH_HOME/profiles/<name>/cordis.patch.yml`:

```yaml
- id: weknora
  config:
    baseUrl: https://weknora.example.com
    apiKey: !!js process.env.WEKNORA_API_KEY
    knowledgeBaseIds: [kb-product-docs]
    agentId: ''
    maxResults: 8
    maxChunkChars: 1200
    requestTimeoutMs: 30000
    chatTimeoutMs: 300000
    resourceUrls: public
    toolPrefix: weknora
    tools:
      listKnowledgeBases: true
      search: true
      readDocument: true
      ask: true
```

Update replaces the entire `config` on that entry; include fields you want to keep. `tools.*` is enabled by default. For multiple deployments, use distinct `toolPrefix` values; the name must start with a lowercase letter and contain only lowercase letters, digits, and `_`.

## Cited images and troubleshooting

`resourceUrls` defaults to `public`: the server converts handles to loadable links. On 403 with a key limited to certain bases, the plugin falls back to `handle` and keeps it. `resource://` handles do not load directly in the browser; see [File access](../03-features/21-file-access.md) for public links.

| Symptom | Check |
| --- | --- |
| Config error on load | Fix baseUrl, ranges, toolPrefix per messages |
| Search 401/403 | Valid key, retrieve capability, allowed workspace/bases |
| ask denied | Key with `chat`, `tenantId` for platform key |
| No direct image link | Key limited to bases or deploy without public URL |
| Timeout on long questions | Adjust `chatTimeoutMs`, check WeKnora model calls |

## Implementation reference

`packages/dsh-weknora/src/`, `test/fixtures/api-contract.json`, `contract/contract_test.go`.
