# Claw Skill
Claw Skill exposes WeKnora to agents in the OpenClaw ecosystem via the REST API: send documents, import web pages, and search across knowledge bases.

The skill is hosted on ClawHub as [`@lyingbug/weknora`](https://clawhub.ai/lyingbug/weknora), MIT-0 license. Effective capabilities depend on the connected WeKnora API.

## Main features {#main-features}
| Capability | Matching interface |
| --- | --- |
| File upload | PDF, Word, Excel, etc. to a knowledge base with parsing and vectorization |
| Web import | Capture by URL, write to a knowledge base, track parse status |
| Markdown write | Create or edit Markdown entries (reports, structured notes) |
| Hybrid search | Single-base `hybrid-search` and multi-base `knowledge-search` (vector + keywords) |
| Browse knowledge bases | List bases and entries, view detail |

## Install and connect {#install-and-connect}
Under **Settings → Publish integrations → Claw Skill**, copy the API URL, sample environment variables, and install command.

1. **API credentials**: **Settings → Publish integrations → API integration** (**Open API info** button);
2. **Environment variables**: terminal or `~/.zshrc` / `~/.bashrc`

   ```bash
   export WEKNORA_BASE_URL=https://your-weknora.example.com/api/v1
   export WEKNORA_API_KEY=sk-xxxxx
   ```

   `WEKNORA_BASE_URL` must include `/api/v1`; the guide example uses the current instance address.

3. **Install the skill**: with OpenClaw CLI, or via ClawHub;

   ```bash
   openclaw skills install @lyingbug/weknora
   ```

4. **Verify**: ask the agent to list knowledge bases or run a search.

## Relation to MCP
Claw Skill and the MCP server both let external agents call WeKnora; choose based on client and desired features:

| | Claw Skill | MCP server (built-in) |
| --- | --- | --- |
| Target | OpenClaw / ClawHub agents | MCP clients (Claude Desktop, Cursor, Claude Code, VS Code Copilot, etc.) |
| Install | ClawHub skill | No extra deploy: create an endpoint under **Settings → Publish integrations → MCP server**, connect at `/mcp/<endpoint_id>` |
| Auth | Workspace API key (`WEKNORA_API_KEY`) | Per-endpoint token, rotation and revocation |
| Transport | Direct REST | Streamable HTTP; STDIO fallback `mcp-remote@0.15.1` when no native HTTP/Bearer |
| Scope | Import, search, browse (5 types) | Tools selected per endpoint: search/read, Q&A (default agent), Wiki, write; knowledge bases can be limited |
| Docs | This document | [MCP integration](../03-features/08-mcp.md) |

For Q&A, Wiki tools, or fine-grained tool/base limits, prefer the MCP server; for import/search/browse in OpenClaw, Claw Skill is enough. The Python MCP service under `mcp-server/` is deprecated; new integrations use the built-in MCP server.

## Related documentation {#related-documentation}
- Credentials and capability restriction: [Tenants, users, and authentication](../03-features/01-tenant-auth.md)
- Underlying interfaces: [API overview](../04-api/01-api-overview.md)
- Other integrations: [Chrome extension](06-chrome-extension.md), [MCP integration](../03-features/08-mcp.md)
