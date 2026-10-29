# Architecture actuelle des deux projets

Diagrammes Mermaid (rendus par GitHub, GitLab, VS Code, Obsidian). Chaque boîte renvoie à un chemin vérifié.

## WeKnora (`main@40192ac`)

```mermaid
flowchart LR
  subgraph Clients
    UI["Frontend Vue 3 + TDesign<br/>frontend/ (Nginx :80)"]
    CLI["CLI / SDK Go<br/>cli/, client/"]
    IM["IM : Slack, Telegram, Feishu,<br/>WeCom, DingTalk…<br/>internal/im/"]
    MCPX["Clients MCP externes"]
  end

  subgraph App["app (Go 1.26, Gin) :8080 — cmd/server"]
    MW["Middleware auth JWT / API key / OIDC,<br/>RBAC, audit<br/>internal/middleware/"]
    ROUTER["API REST /api/v1 (~434 routes)<br/>internal/router/"]
    AGENT["Agent ReAct, HITL, collaboration<br/>internal/agent/"]
    RAG["Pipeline RAG à plugins<br/>chat_pipeline/"]
    KNOW["Ingestion, chunking, wiki, graphe<br/>application/service/"]
    MEM["Mémoire utilisateur<br/>service/memory/"]
    SKILL["Skills tenant<br/>agent/skills/, tenant_skill_*"]
    MODELS["Model layer (33 fournisseurs)<br/>internal/models/"]
    MCPS["Serveur MCP<br/>internal/mcpserver/"]
    WORK["Workers asynq<br/>router/task.go"]
  end

  DOC["docreader Python 3.10<br/>gRPC :50051<br/>docreader/"]
  SBX["Sandbox Docker / E2B / Cube<br/>internal/sandbox/"]
  PG[("PostgreSQL 17 ParadeDB<br/>pgvector + pg_search")]
  RD[("Redis 7")]
  OBJ[("Stockage objet<br/>local/MinIO/S3/COS…")]
  VEC[("Option : Milvus, Qdrant, Weaviate,<br/>ES, OpenSearch, Doris, TCVDB")]
  NEO[("Option : Neo4j")]
  LF["Option : Langfuse"]

  UI --> MW
  CLI --> MW
  IM --> ROUTER
  MCPX --> MCPS
  MW --> ROUTER --> AGENT & RAG & KNOW & MEM & SKILL
  AGENT --> RAG & MEM & SKILL & MODELS & SBX
  RAG --> MODELS
  KNOW --> DOC
  KNOW & RAG & MEM --> PG
  WORK --> RD
  KNOW --> OBJ
  RAG -.-> VEC
  KNOW -.-> NEO
  AGENT -.-> LF
```

## TencentDB Agent Memory (`feat/server_team@ecc01a5`)

```mermaid
flowchart LR
  subgraph Agents["Agents externes"]
    CC["Claude Code, Codex, CodeBuddy,<br/>OpenCode, DSH…"]
    OC["OpenClaw / Hermes / Pi<br/>(plugins in-process)<br/>MemoryCore/*-plugin"]
    SDK["SDK TS / Python<br/>sdk/memory-core/"]
  end

  PROXY["MemoryProxy (Hono) :8096<br/>injection, write-back, rate-limit<br/>MemoryProxy/"]
  LLM["LLM amont<br/>(OpenAI / Anthropic compatibles)"]

  subgraph Core["MemoryCore (Node 22, node:http) :8420"]
    GW["Gateway v2/v3<br/>Bearer partagé optionnel<br/>src/gateway/server.ts"]
    L["Pipeline L0→L1→L2→L3<br/>core/record, scene, persona"]
    SK["Skills + versions + extraction<br/>core/skill/"]
    META["Users / Teams / Agents / Tasks / ACL<br/>src/metadata/"]
    OFF["Offload contexte<br/>src/offload*"]
  end

  subgraph Know["MemoryKnowledge (Hono) :8421"]
    WIKI["Wiki LLM + graphe wikilink<br/>engines/wiki/"]
    CODE["Code-Graph (callers, impact)<br/>engines/code/ → @colbymchenry/codegraph"]
    KMCP["Serveur MCP<br/>src/mcp/"]
  end

  PANEL["MemoryPanel :8125<br/>BFF Hono + React 18 + tea-component"]

  SQL[("SQLite : node:sqlite,<br/>sqlite-vec, FTS5")]
  FS[("Fichiers : scene_blocks/*.md,<br/>persona.md")]
  MG[("Option expérimentale : MongoDB + mongot")]
  TC[("Option : Tencent Cloud VectorDB")]
  PRIV["src/integrations/ (PRIVÉ, absent) :<br/>Redis Streams, COS, observabilité, quotas"]

  CC --> PROXY --> LLM
  PROXY --> GW
  OC --> GW
  SDK --> GW
  PANEL --> GW & Know
  GW --> L & SK & META & OFF
  L & SK & META --> SQL
  L --> FS
  L -.-> MG & TC
  GW -. "requis en mode service" .-> PRIV
  WIKI & CODE --> SQL
```
