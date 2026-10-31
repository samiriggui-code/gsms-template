# SDK Go

Le SDK Go encapsule les opérations CRUD sur les principales ressources (bases de connaissances, documents, sessions, etc.) ainsi que la Q&R en flux SSE. Les sources sont dans `client/`, module Go indépendant ; le CLI officiel et le serveur s’appuient sur ce SDK.

## Installation

Chemin du module dans `client/go.mod` :

```
module github.com/Tencent/WeKnora/client

go 1.24.2
```

Installation :

```bash
go get github.com/Tencent/WeKnora/client
```

Import :

```go
import "github.com/Tencent/WeKnora/client"
```

## Initialisation et authentification

Types et constructeur dans `client/client.go`.

### Structure Client

```go
type Client struct {
    baseURL       string
    httpClient    *http.Client
    streamTimeout time.Duration
    apiKey        string
    bearerToken   string
    tenantID      *uint64
}
```

Création via `NewClient(baseURL string, options ...ClientOption) *Client`. Timeout par défaut des requêtes HTTP : 30 s ; les flux SSE n’ont **pas** de timeout par défaut — la durée de vie est pilotée par le `context` (sauf `WithTimeout` explicite).

### Options ClientOption

| Option | Description |
|---|---|
| `WithAPIKey(key string)` | Clé API longue durée, en-tête `X-API-Key` |
| `WithBearerToken(token string)` | JWT court terme, `Authorization: Bearer <token>` (souvent après `Login`) |
| `WithToken(token string)` | **Deprecated** : alias v0.x de `WithAPIKey`, sera retiré |
| `WithTimeout(timeout time.Duration)` | Timeout commun requêtes et flux |
| `WithTransport(rt http.RoundTripper)` | Remplace le transport (retry, métriques, etc.) ; `nil` → `http.DefaultTransport` |
| `WithTenantID(tenantID uint64)` | En-tête `X-Tenant-ID` sur chaque requête — accès cross-tenant explicite avec `CanAccessAllTenants` |

### Modes d’authentification

Deux types de credentials, combinables ; côté HTTP `X-API-Key` est prioritaire :

- **Clé API** : `WithAPIKey`, en-tête `X-API-Key` ;
- **JWT Bearer** : `WithBearerToken`, avec `Login` / `RefreshToken` / `GetCurrentUser` dans `client/auth.go`.

Flux JWT typique (`POST /api/v1/auth/login`) :

```go
c := client.NewClient("http://localhost:8080")
loginResp, err := c.Login(ctx, client.LoginRequest{ /* email + password */ })
authed := client.NewClient("http://localhost:8080",
    client.WithBearerToken(loginResp.AccessToken))
```

### Tenant et en-têtes

`applyAuthHeaders` (`client/client.go`) injecte :

- `X-API-Key` / `Authorization` ;
- `X-Request-ID` depuis `ctx.Value("RequestID")` (string) ;
- `X-Tenant-ID` : contexte `"TenantID"` (`uint64`, `*uint64`, chaîne numérique) > défaut client `WithTenantID`.

Override tenant pour une requête :

```go
tenantID := uint64(10000)
ctx := context.WithValue(context.Background(), "TenantID", &tenantID)
kb, err := apiClient.GetKnowledgeBase(ctx, kbID)
```

Un JWT ou une clé API d’espace porte déjà l’identité tenant — les utilisateurs normaux **ne doivent pas** envoyer `X-Tenant-ID` (le middleware auth renvoie 403 sur bearer + cet en-tête).

### Échappatoire Raw

`Client.Raw(ctx, method, path, body)` (Experimental) : HTTP arbitraire avec les en-têtes d’auth du client ; préférer les méthodes typées quand elles existent.

## Vue d’ensemble des ressources et méthodes

Méthodes publiques de `Client` (méthodes internes `buildRequest`, `doRequest`, etc. non listées).

### Auth — `client/auth.go`

| Méthode | Description |
|---|---|
| `Login` | Connexion email/mot de passe → JWT access/refresh |
| `GetCurrentUser` | Principal et tenant (`GET /api/v1/auth/me`) |
| `RefreshToken` | Nouvel access token |
| `SwitchTenant` | Change d’espace, réémet la paire de tokens, mémorise l’espace par défaut (`POST /api/v1/auth/switch-tenant`) |
| `ChangePassword` | Change le mot de passe ; révoque toutes les sessions — jeter les tokens locaux |
| `GetAuthConfig` | Config auth publique (`GET /api/v1/auth/config`, sans auth) |

### KnowledgeBase — `client/knowledgebase.go`

| Méthode | Description |
|---|---|
| `CreateKnowledgeBase` | Créer une base |
| `GetKnowledgeBase` | Détail |
| `ListKnowledgeBases` | Lister |
| `UpdateKnowledgeBase` | Mettre à jour |
| `DeleteKnowledgeBase` | Supprimer |
| `ClearKnowledgeBaseContents` | Vider le contenu |
| `HybridSearch` | Recherche hybride ; option `ResourceURLOptions` pour liens directs |
| `TogglePinKnowledgeBase` | Épingler / désépingler |
| `ListMoveTargets` | Cibles de migration |
| `CopyKnowledgeBase` / `DuplicateKnowledgeBase` | Copier / dupliquer |
| `GetKBCloneProgress` | Progression clone |

### Knowledge — `client/knowledge.go`

| Méthode | Description |
|---|---|
| `CreateKnowledgeFromFile` | Upload multipart (metadata, multimodal, channel, overrides parse) |
| `CreateKnowledgeFromURL` | Depuis URL |
| `GetKnowledge` / `GetKnowledgeBatch` | Détail / lot |
| `ListKnowledge` / `ListKnowledgeWithFilter` | Liste paginée / filtrée |
| `DeleteKnowledge` | Supprimer |
| `DownloadKnowledgeFile` / `OpenKnowledgeFile` | Fichier original |
| `DownloadKnowledgeFiles` / `OpenKnowledgeFilesArchive` | ZIP batch (max 200 ID, 512 MiB ; Contributor + écriture sur la base) |
| `ListKnowledgeFolders` / `MoveKnowledgeToFolder` / `RenameKnowledgeFolder` | Arborescence dossiers |
| `UpdateKnowledge` / `ReparseKnowledge` / `CancelKnowledgeParse` | MAJ / reparse / annulation |
| `GetKnowledgeProcessingSpans` | Spans pipeline |
| `UpdateImageInfo` | Images |
| `CreateManualKnowledge` / `UpdateManualKnowledge` | Entrées manuelles |
| `FilterKnowledge` / `MoveKnowledge` / `GetKnowledgeMoveProgress` | Filtre / migration cross-base |
| `PreviewKnowledgeFile` | Aperçu (`*http.Response`) |
| `BatchUpdateKnowledgeTags` | Tags en lot |

Depuis v0.8.2, l’API liste supporte `sort_by` / `sort_order` ; `KnowledgeListFilter` n’expose pas encore ces champs — utiliser `Raw` si besoin ([API connaissance](../04-api/02-api-knowledge.md)).

### Chunk — `client/chunk.go`

| Méthode | Description |
|---|---|
| `ListKnowledgeChunks` | Lister les chunks d’une connaissance |
| `UpdateChunk` / `DeleteChunk` | MAJ / suppression |
| `GetChunkByIDOnly` | Par ID seul |
| `DeleteGeneratedQuestion` | Question générée |
| `DeleteChunksByKnowledgeID` | Tous les chunks d’une connaissance |

### Session — `client/session.go`

| Méthode | Description |
|---|---|
| `CreateSession` / `GetSession` / `GetSessionsByTenant` | CRUD / liste tenant |
| `UpdateSession` / `DeleteSession` / `BatchDeleteSessions` | MAJ / suppression |
| `GenerateTitle` | Titre auto |
| `KnowledgeQAStream` | Q&R SSE (voir ci-dessous) |
| `ContinueStream` | Reprise flux |
| `StopSession` | Arrêter génération message assistant |
| `SearchKnowledge` | Recherche |

### Message — `client/message.go`, `client/message_suggestion.go`

| Méthode | Description | Fichier |
|---|---|---|
| `LoadMessages` / `GetRecentMessages` / `GetMessagesBefore` | Historique | `message.go` |
| `SearchMessages` / `GetChatHistoryKBStats` / `DeleteMessage` | Recherche / stats / suppression | `message.go` |
| `EnsureMessageSuggestions` / `GetMessageSuggestions` / `RecordMessageSuggestionEvent` | Suggestions | `message_suggestion.go` |

### Agent (flux) — `client/agent.go`

| Méthode | Description |
|---|---|
| `AgentQAStream` | Deprecated |
| `AgentQAStreamWithRequest` | Flux agent complet |
| `NewAgentSession` | Wrapper `Ask` / `AskWithRequest` / `GetSessionID` |

### Gestion Agent — `client/agent_manage.go`

| Méthode | Description |
|---|---|
| `CreateAgent` / `ListAgents` / `GetAgent` / `UpdateAgent` / `DeleteAgent` | CRUD |
| `CopyAgent` / `GetAgentPlaceholders` / `GetSuggestedQuestions` | Copie / placeholders / suggestions |

v0.8.2 : `UpdateAgentRequest.Avatar` est `*string` (`nil` = ne pas envoyer ; `""` = effacer). `SuggestedQuestion` ajoute `KnowledgeID` pour `QuestionOrigin` dans les requêtes QA.

### Model — `client/model.go`

CRUD + `ListModelProviders`.

### Tenant — `client/tenant.go`

CRUD tenant, API keys, KV tenant, config principal API, token de test.

### Organization — `client/organization.go`

CRUD organisation, invitations, membres, partages KB/Agent, listes de ressources partagées.

v0.8.2 : invitation par **ID d’espace complet** (`search-tenants?q=`). `SearchUsersForInvite` (alias `search-users` + param `keyword` vs `q`) ne renvoie pas de candidats — utiliser `Raw` sur `search-tenants`.

### FAQ — `client/faq.go`

Liste, upsert, CRUD, similar questions, batch tags, recherche, export CSV, import async, statut affichage import.

### Tag — `client/tag.go`

Liste, création, MAJ/suppression par ID ou seq ID.

### MCP Service — `client/mcp_service.go`

CRUD, test, outils/ressources, métadonnées (`GetMCPMetadata` / `RefreshMCPMetadata`), `ResolveToolApproval`.

### MCP Endpoint (WeKnora serveur MCP) — `client/mcp_endpoint.go`

CRUD endpoints publiés, rotation token, catalogue outils.

### Initialisation — `client/initialization.go`

Config KB, Ollama, modèles distants, tests embedding/rerank/multimodal, etc.

### System — `client/system.go`

`GetSystemInfo`, `GetDeploymentCapabilities`, moteurs parse, stockage, DocReader.

### Autres

| Méthode | Description | Fichier |
|---|---|---|
| `StartEvaluation` / `GetEvaluationResult` | Évaluation | `evaluation.go` |
| `ListSkills` | Skills sandbox | `skill.go` |
| `GetWebSearchProviders` | Providers recherche web | `web_search.go` |
| `Raw` | HTTP raw (Experimental) | `client.go` |

Plus de 220 méthodes publiques, 20+ types de ressources.

### Mémoire, skills sandbox, variables personnelles

| Fichier | Contenu |
| --- | --- |
| `client/memory.go` | Paramètres, items, topics, documents, export, consolidation |
| `client/skill.go` | Install/upload/reinstall skills sandbox, fichiers, env |
| `client/env_var.go` | Variables personnelles skill/sandbox |
| `client/tenant.go` | `UpdateTenantAPIKey` sans rotation token |

Les listes ne renvoient pas les secrets en clair ; les droits restent appliqués côté serveur.

```go
items, total, err := c.ListMemoryItems(ctx, "active", 50, 0)
skills, available, err := c.ListSkills(ctx, "sandbox-config-id")
```

Création utilisateur admin système : pas de méthode dédiée — `Raw` ou HTTP ([API système](../04-api/02-api-system.md), [mémoire](../04-api/02-api-memory.md), [sandbox/skills](../04-api/02-api-sandbox-skills.md)).

## Dialogue en flux (SSE)

Mécanisme **callback** (pas de channel) : `bufio.Scanner` sur lignes SSE (`event:` / `data:`), buffer max 4 MiB. Les flux utilisent `doRequestStream`, hors timeout 30 s par défaut, pilotés par `ctx`.

### `KnowledgeQAStream` (`client/session.go`)

```go
func (c *Client) KnowledgeQAStream(
    ctx context.Context,
    sessionID string,
    request *KnowledgeQARequest,
    callback func(*StreamResponse) error,
) error
```

`StreamResponse` : `ResponseType` (`answer`, `references`, `thinking`, `tool_call`, etc.), `Content`, `Done`, `KnowledgeReferences` sur frame `Done`.

### `AgentQAStreamWithRequest` (`client/agent.go`)

```go
type AgentEventCallback func(*AgentStreamResponse) error

func (c *Client) AgentQAStreamWithRequest(ctx context.Context,
    sessionID string, request *AgentQARequest, callback AgentEventCallback,
) error
```

`AgentQARequest` : bases, `AgentID`, web search, `MentionedItems`, `Images`, etc.

```go
as := apiClient.NewAgentSession(session.ID)
err := as.Ask(ctx, "Présentez WeKnora", func(ev *client.AgentStreamResponse) error {
    if ev.ResponseType == client.AgentResponseTypeAnswer {
        fmt.Print(ev.Content)
    }
    return nil
})
```

### `ContinueStream` (`client/session.go`)

Reprise via `GET /api/v1/sessions/continue-stream/{sessionID}?message_id=...` ; `StopSession` pour arrêter.

## Gestion des erreurs

### HTTP : `APIError` (`client/client.go`)

```go
var apiErr *client.APIError
if errors.As(err, &apiErr) {
    switch {
    case apiErr.StatusCode == 404:
    case apiErr.Code == client.ServerErrUnauthorized: // 1001
    }
}
```

Constantes `ServerErrBadRequest`(1000) … `ServerErrValidation`(1010).

### Flux : `SSEStreamError` (`client/stream_errors.go`)

Frame terminal `error` + `done=true` : callback puis `*SSEStreamError`.

```go
if errors.Is(err, client.ErrSSEStreamTerminal) { ... }
if client.IsSSEStreamError(err) { ... }
```

## Logs et traçage

`client/log.go` : `SetDebugLevel("debug"|"info"|"warn")` sur stderr, non concurrent — appeler avant toute requête SDK.

`RequestID` string dans le contexte → en-tête `X-Request-ID`.

## Exemples complets

Adaptés de `client/example.go`.

### Exemple 1 : créer une base et uploader un fichier

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/Tencent/WeKnora/client"
)

func main() {
    apiClient := client.NewClient(
        "http://localhost:8080",
        client.WithAPIKey("your-api-key"),
        client.WithTimeout(30*time.Second),
    )

    kb := &client.KnowledgeBase{
        Name:        "Test Knowledge Base",
        Description: "This is a test knowledge base",
        ChunkingConfig: client.ChunkingConfig{
            ChunkSize:    500,
            ChunkOverlap: 50,
            Separators:   []string{"\n\n", "\n", ". ", "? ", "! "},
        },
        EmbeddingModelID: "embedding_model_id",
        SummaryModelID:   "summary_model_id",
    }
    createdKB, err := apiClient.CreateKnowledgeBase(context.Background(), kb)
    if err != nil {
        fmt.Printf("Failed to create knowledge base: %v\n", err)
        return
    }
    fmt.Printf("Knowledge base created: ID=%s, Name=%s\n", createdKB.ID, createdKB.Name)

    metadata := map[string]string{"source": "local", "type": "document"}
    knowledge, err := apiClient.CreateKnowledgeFromFile(
        context.Background(), createdKB.ID, "path/to/sample.pdf",
        metadata, nil, "", "", nil)
    if err != nil {
        fmt.Printf("Failed to upload knowledge file: %v\n", err)
        return
    }
    fmt.Printf("File uploaded: Knowledge ID=%s, Title=%s\n", knowledge.ID, knowledge.Title)
}
```

### Exemple 2 : session et Q&R stream

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "strings"

    "github.com/Tencent/WeKnora/client"
)

func main() {
    apiClient := client.NewClient("http://localhost:8080",
        client.WithAPIKey("your-api-key"))

    session, err := apiClient.CreateSession(context.Background(), &client.CreateSessionRequest{
        Title:       "Test Session",
        Description: "A test session for knowledge Q&A",
    })
    if err != nil {
        fmt.Printf("Failed to create session: %v\n", err)
        return
    }

    question := "What is artificial intelligence?"
    var answer strings.Builder
    var references []*client.SearchResult

    err = apiClient.KnowledgeQAStream(context.Background(),
        session.ID,
        &client.KnowledgeQARequest{Query: question},
        func(response *client.StreamResponse) error {
            if response.ResponseType == client.ResponseTypeAnswer {
                answer.WriteString(response.Content)
            }
            if response.Done && len(response.KnowledgeReferences) > 0 {
                references = response.KnowledgeReferences
            }
            return nil
        })
    if err != nil {
        if errors.Is(err, client.ErrSSEStreamTerminal) {
            fmt.Printf("Stream terminated by server error: %v\n", err)
        } else {
            fmt.Printf("Q&A failed: %v\n", err)
        }
        return
    }
    fmt.Printf("Answer: %s\n", answer.String())
    for i, ref := range references {
        fmt.Printf("Reference %d: %s\n", i+1, ref.Content)
    }
}
```

### Exemple 3 : messages, chunks, nettoyage

```go
package main

import (
    "context"
    "fmt"

    "github.com/Tencent/WeKnora/client"
)

func main() {
    apiClient := client.NewClient("http://localhost:8080",
        client.WithAPIKey("your-api-key"))
    ctx := context.Background()

    sessionID := "your-session-id"
    messages, err := apiClient.GetRecentMessages(ctx, sessionID, 10)
    if err != nil {
        fmt.Printf("Failed to get session messages: %v\n", err)
    } else {
        for i, msg := range messages {
            fmt.Printf("%d. Role: %s, Content: %s\n", i+1, msg.Role, msg.Content)
        }
    }

    knowledgeID := "your-knowledge-id"
    chunks, total, err := apiClient.ListKnowledgeChunks(ctx, knowledgeID, 1, 10)
    if err != nil {
        fmt.Printf("Failed to get knowledge chunks: %v\n", err)
    } else {
        fmt.Printf("Knowledge has %d chunks, retrieved %d\n", total, len(chunks))
        if len(chunks) > 0 {
            updated, err := apiClient.UpdateChunk(ctx, knowledgeID, chunks[0].ID,
                &client.UpdateChunkRequest{
                    Content:   "Updated chunk content - " + chunks[0].Content,
                    IsEnabled: true,
                })
            if err != nil {
                fmt.Printf("Failed to update chunk: %v\n", err)
            } else {
                fmt.Printf("Chunk updated: ID=%s\n", updated.ID)
            }
        }
    }

    _ = apiClient.DeleteSession(ctx, sessionID)
    _ = apiClient.DeleteKnowledge(ctx, knowledgeID)
}
```

## Sources de référence

- Cœur client : `client/client.go`
- Auth : `client/auth.go`
- Flux : `client/session.go`, `client/agent.go`
- Erreurs flux : `client/stream_errors.go`
- Logs : `client/log.go`
- Exemples : `client/example.go`
