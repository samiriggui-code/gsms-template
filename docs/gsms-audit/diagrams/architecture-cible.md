# Architecture cible — Global-IT-SS AI Engine (stratégie A)

Un seul produit, une API, une identité, une base de référence ; un processus Go principal issu de WeKnora et des modules internes spécialisés.

> **Périmètre WeKnora aujourd’hui (extensions Tencent, sans métier GIS)** : voir [architecture-weknora-tencent-extensions.md](./architecture-weknora-tencent-extensions.md) et le plan [12-integration-plan-tencent-extensions.md](../12-integration-plan-tencent-extensions.md). Le schéma ci-dessous reste la **cible long terme** (mémoire L2/L3 portée depuis Agent Memory + apps métier GIS).

```mermaid
flowchart TB
  subgraph Apps["Applications métier Global-IT-SS"]
    APP1["App métier 1"]
    APP2["App métier 2"]
    UI["Console Vue 3 + TDesign<br/>(WK frontend étendu)"]
    EXT["Agents de code externes<br/>(Claude Code, Codex…)"]
  end

  subgraph TencentExt["Extensions Tencent dans WeKnora (phase actuelle)"]
    TM["Meeting → KB / mémoire"]
    TC["SDK Go ciblé"]
    SP["Speech ASR/TTS"]
    TIM["IM Tencent Chat"]
  end

  subgraph Engine["gis-app — processus Go (socle WeKnora)"]
    API["9. API unifiée /api/v1 + SDK + MCP serveur"]
    SEC["8. Security Core<br/>JWT / API key / OIDC, tenants, orgs,<br/>équipes, tâches, RBAC, audit"]
    KE["1. Knowledge Engine<br/>ingestion, hybride, rerank, citations, éval"]
    ME["2. Memory Engine<br/>L0 messages · L1 items · L2 scénarios · L3 persona<br/>portées user / team / agent / task"]
    SE["3. Skills Engine<br/>catalogue, versions append-only,<br/>propositions extraites + validation"]
    WE["4. Wiki Engine<br/>pages, révisions, issues, graphe"]
    AR["6. Agent Runtime<br/>ReAct, outils, HITL, MCP client"]
    MG["7. Model Gateway<br/>LLM local/distant, embeddings, rerank"]
    PL["10. Plugin System<br/>connecteurs, IM, plugins pipeline"]
    WK["Workers asynq<br/>cascade mémoire, extraction Skills, ingestion"]
  end

  DOC["docreader (Python, gRPC)<br/>sans ebooklib"]
  SBX["Sandbox<br/>Docker / E2B / Cube"]
  CI["5. Code Intelligence<br/>sidecar Node (ex-AM engines/code)<br/>réseau interne + jeton de service"]
  PX["Proxy agents de code<br/>sidecar Node (ex-AM MemoryProxy), optionnel"]
  LLM["Fournisseurs LLM<br/>(Ollama local, API distantes)"]

  PG[("PostgreSQL + pgvector<br/>référentiel unique")]
  RD[("Redis")]
  OBJ[("Stockage objet S3-compatible")]
  OS[("Option : OpenSearch / ES<br/>recherche lexicale")]

  APP1 & APP2 & UI --> API
  EXT --> PX --> API
  PX --> LLM
  TM & TC & SP & TIM --> API
  TM --> KE
  SP --> MG
  TIM --> PL
  API --> SEC
  SEC --> KE & ME & SE & WE & AR & PL
  AR --> KE & ME & SE & WE & MG & SBX
  AR -->|"code_search / code_impact"| CI
  KE --> DOC
  KE & ME & SE & WE --> PG
  WK --> RD
  ME & SE --> WK
  KE --> OBJ
  KE -.-> OS
  MG --> LLM
```

## Lecture du diagramme
- Les blocs 1, 2, 3, 4, 6, 7, 8, 9, 10 vivent dans le même processus Go, partagent l'identité et les transactions PostgreSQL.
- Le bloc 5 (Code Intelligence) et le proxy sont des **modules internes isolés** : ils n'ont pas de base partagée, reçoivent une identité signée et ne sont pas exposés publiquement.
- docreader et sandbox restent séparés comme aujourd'hui dans WeKnora.
