# Architecture — WeKnora + extensions Tencent (périmètre actuel)

WeKnora reste **un processus Go principal** + frontend Vue + docreader Python. Les quatre repos Tencent s’intègrent comme **connecteurs et providers**, pas comme second moteur. Pas de cœur métier GIS (9 axes) sur ce schéma.

Voir le plan détaillé : [12-integration-plan-tencent-extensions.md](../12-integration-plan-tencent-extensions.md).

```mermaid
flowchart TB
  subgraph Users["Utilisateurs & clients"]
    UI["Frontend Vue 3<br/>frontend/ · shell /platform"]
    CLI["CLI weknora<br/>cli/"]
    IM0["IM existants<br/>Feishu, Slack, WeCom…"]
    EXT["MCP / API keys"]
  end

  subgraph WK["WeKnora App Go — cmd/server"]
    API["API /api/v1<br/>internal/router · handler"]
    SEC["Auth · tenant · RBAC<br/>internal/middleware · access"]
    KNOW["Knowledge · wiki · datasource<br/>application/service"]
    MEM["Mémoire utilisateur<br/>application/service/memory"]
    AGENT["Agent · skills · sandbox<br/>internal/agent"]
    MG["Model Gateway<br/>internal/models"]
    IMW["IM adapters<br/>internal/im"]
    WKJOB["Workers asynq<br/>router/task.go"]
  end

  subgraph TENCENT_NEW["Extensions Tencent — à intégrer WeKnora"]
    TM["Connecteur Tencent Meeting<br/>internal/tencentmeeting/<br/>research: tencentmeeting-cli"]
    TC["Client API cloud ciblé<br/>internal/tencentcloud/<br/>go.mod: tencentcloud-sdk-go"]
    SP["Providers ASR / TTS<br/>internal/models/… tencent speech<br/>research: tencentcloud-speech-sdk-go"]
    TIM["Adapter Tencent Chat IM<br/>internal/im/tencent_chat/<br/>research: TIMSDK hub"]
  end

  subgraph TENCENT_CLOUD["Tencent Cloud — APIs externes"]
    MEET_API["Meeting Open API<br/>transcripts · CR"]
    SPEECH_API["Speech ASR / TTS"]
    CHAT_API["Cloud Chat REST / webhook"]
    CAM["CAM · secrets"]
  end

  subgraph Existing["Déjà dans WeKnora"]
    DOC["docreader Python gRPC"]
    SBX["Sandbox skills"]
    PG[("PostgreSQL + pgvector")]
    RD[("Redis")]
    OBJ[("Objet S3 / COS / MinIO")]
    TCVDB[("Retriever Tencent VectorDB<br/>déjà intégré WK")]
  end

  UI & CLI & IM0 & EXT --> API
  API --> SEC --> KNOW & MEM & AGENT & IMW & MG
  AGENT --> KNOW & MEM & MG & SBX
  KNOW --> DOC
  KNOW & MEM --> PG
  WKJOB --> RD
  KNOW --> OBJ
  KNOW -.-> TCVDB

  TM --> MEET_API
  TC --> CAM
  TC -.-> MEET_API
  SP --> SPEECH_API
  TIM --> CHAT_API

  API --> TM & TC & SP
  IMW --> TIM
  TM -->|"transcripts → documents"| KNOW
  TM -->|"extract mémoire"| MEM
  MG --> SP
  TIM -->|"messages → sessions"| AGENT
```

## Légende des priorités

| Priorité | Bloc | Statut |
|----------|------|--------|
| 1 | Tencent Meeting → KB / mémoire | Plan P1 |
| 2 | tencentcloud-sdk-go (modules ciblés) | Avec Meeting P2 |
| 3 | Speech ASR/TTS | Plan P3 |
| 4 | TIM IM adapter | Plan P4 si besoin |

## Hors scope (inchangé)

- **Agent Memory** Node (MemoryCore / Proxy) → `research/tencentdb-agent-memory`, portage L2/L3 ultérieur.
- **TIM UIKit** React/Vue embarqué dans le frontend WeKnora.
- **Pages métier GIS** (9 axes) dans le shell.
