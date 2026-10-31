# Dossier research (template WeKnora / GIS)

> Premier `git clone` ? Exécuter **`./scripts/clone-research.sh`** à la racine du repo (voir [README-GLOBAL-IT-SS.md](../README-GLOBAL-IT-SS.md)).

Clones et notes de veille pour l’adaptation du template — **sans impact sur le build Go/frontend** (contrairement à `third_party/`, réservé aux dépendances intégrées).

## Dépôts locaux

| Dossier | Source | Rôle |
| --- | --- | --- |
| [`tencentdb-agent-memory/`](./tencentdb-agent-memory/) | [TencentCloud/tencentdb-agent-memory](https://github.com/TencentCloud/tencentdb-agent-memory) | Mémoire agent « hub d’équipe » : mémoire courte symbolique (Mermaid + offload), long terme L0→L3 (conversation → atom → scénario → persona), skills, LLM-Wiki, code-graph. Plugin OpenClaw/Hermes (`@tencentdb-agent-memory/memory-tencentdb`). |
| [`tencentcloud-sdk-go/`](./tencentcloud-sdk-go/) | [TencentCloud/tencentcloud-sdk-go](https://github.com/TencentCloud/tencentcloud-sdk-go) | SDK Go officiel **API Tencent Cloud 3.0** (tous produits : CAM, SMS, COS, TRTC, VectorDB, etc.) — référence pour appels cloud depuis le backend Go du template. |
| [`timsdk/`](./timsdk/) | [TencentCloud/TIMSDK](https://github.com/TencentCloud/TIMSDK) | Hub **Tencent Cloud Chat / IM** (UIKit + Core SDK multi-plateformes) — veille pour messagerie temps réel, push, canaux ; liens vers repos Web (React/Vue), mobile, etc. |
| [`tencentmeeting-cli/`](./tencentmeeting-cli/) | [TencentCloud/tencentmeeting-cli](https://github.com/TencentCloud/tencentmeeting-cli) | CLI **腾讯会议** (`tmeet`) : OAuth2, réunions, enregistrements, transcripts, comptes-rendus — référence pour intégrations visio / calendrier côté GIS. |
| [`tencentcloud-speech-sdk-go/`](./tencentcloud-speech-sdk-go/) | [TencentCloud/tencentcloud-speech-sdk-go](https://github.com/TencentCloud/tencentcloud-speech-sdk-go) | SDK Go **ASR + TTS** Tencent ; focus veille **synthèse vocale** dans [`tts/`](./tencentcloud-speech-sdk-go/tts/) (`speechsynthesizer.go`, WebSocket). |

## Licences (vérifiées le 31 oct. 2026, aux commits épinglés)

| Dépôt | Licence | Réutiliser du code dans ce repo (MIT) |
| --- | --- | --- |
| `tencentdb-agent-memory` @ `ecc01a5` | **MIT** (fichier `LICENSE`, © 2026 Tencent ; GitHub affiche `NOASSERTION` à cause de l’en-tête Tencent) | Oui. Garder la notice de copyright MIT dans les fichiers portés ou dans `THIRD_PARTY_NOTICES`. |
| `tencentmeeting-cli` @ `bd9ab53` | **MIT** (même format que ci-dessus) | Oui, mêmes conditions. |
| `tencentcloud-sdk-go` @ `779c9a6` | **Apache-2.0** (pas de fichier `NOTICE`) | Oui, comme dépendance Go (`go get`) de préférence. Si on copie du code : garder l’en-tête de licence et signaler les modifications. |
| `tencentcloud-speech-sdk-go` @ `257f9f5` | **Apache-2.0** (pas de fichier `NOTICE`) | Oui, mêmes conditions. |
| `timsdk` @ `00fb559` | **Aucune licence à la racine** → tous droits réservés par défaut. Seul `iOS/TUIKit/TUIRoomKit/` porte une licence MIT ; les `Pods/` iOS sont des tiers avec leurs propres licences. | **Non.** Lecture seule. Pour un canal TIM dans `internal/im/`, écrire le client à partir de la documentation de l’API REST Tencent Cloud Chat, sans copier de code du dépôt. |

## Récupérer les clones (PC portable ou nouvelle machine)

Les dossiers `research/*/` **ne sont pas sur GitHub** (`.gitignore`, ~700 Mo). Après `git pull` :

```bash
./scripts/clone-research.sh
```

Commits épinglés (oct. 2026, alignés avec la veille locale) — le script les checkout en detached HEAD.

Mise à jour manuelle ensuite :

```bash
git -C research/tencentdb-agent-memory pull --ff-only
git -C research/tencentcloud-sdk-go pull --ff-only
git -C research/timsdk pull --ff-only
git -C research/tencentmeeting-cli pull --ff-only
git -C research/tencentcloud-speech-sdk-go pull --ff-only
```

## Code déjà dans le repo (pas dans `research/`)

| Intégration | Où c’est codé | Branche |
| --- | --- | --- |
| Tencent Meeting (sync transcript → KB) | `internal/tencentmeeting/`, routes API, ADR | `feat/tencent-meeting-connector` (PR #23) |

`research/` sert à **lire / copier des idées** (CLI `tmeet`, SDK Go, Agent Memory) ; le portage va dans `internal/` ou `third_party/` quand c’est décidé — voir [12-integration-plan-tencent-extensions.md](../docs/gsms-audit/12-integration-plan-tencent-extensions.md).

## Où ça croise WeKnora aujourd’hui

| Sujet TencentDB Agent Memory | Équivalent / point d’entrée WeKnora |
| --- | --- |
| Long terme (persona, faits, scènes) | `internal/application/service/memory/` — extraction, rappel vectoriel, consolidation |
| API & réglages espace | `internal/handler/memory.go`, `04-api/02-api-memory.md`, `memory_config` tenant KV |
| UI | `frontend/src/views/settings/MemorySettings.vue`, `MemoryWorkspaceSettings.vue` |
| Agent / outils / compaction contexte | `internal/agent/compaction/`, prompts agent — piste pour **offload** + graphe symbolique |
| Skills réutilisables | `website-docs/03-features/22-skills-sandbox.md`, sandbox skills |
| Wiki structuré | Wiki KB + `wiki_researcher` — rapprochement possible avec **LLM-Wiki** côté Tencent |

| Sujet SDK / IM Tencent | Équivalent / point d’entrée WeKnora |
| --- | --- |
| Appels API cloud (Go) | Pas de dépendance directe aujourd’hui ; piste `internal/gis/` ou intégrations métier (COS déjà côté stockage WK si configuré) |
| Chat IM (TIM) | `internal/im/` — connecteurs WeCom, Feishu, Slack, Telegram, etc. ; TIM ≠ même stack, utile pour comparer modèles canal / webhook |
| Visio / réunions (Tencent Meeting) | Pas de connecteur natif WK ; piste automatisations, ingestion transcripts vers KB |
| TTS / voix | Modèles `transcriptions` / audio côté `internal/models/` ; `tts/` du speech SDK pour comparaison fournisseur Tencent |

## Pistes d’adaptation (brouillon)

1. **Inspirer, pas remplacer d’un bloc** — WeKnora a déjà tenant + identité + pgvector ; comparer le pipeline L0→L3 avec `extract.go` / `consolidate.go`.
2. **Court terme agent** — étudier `MemoryCore/` et le mode `offload` (refs + canvas Mermaid) pour réduire les tokens après gros appels d’outils (collaboration, BrowserSkill).
3. **Intégration produit** — soit service Node à part (`MemoryProxy/`, `deploy/`), soit portage des idées en Go ; le SDK npm est pensé OpenClaw/Hermes, pas WeKnora natif.
4. **Doc GIS** — une fois les choix figés, mettre à jour `website-docs/03-features/23-memory.md` et la doc agent.

## Fichiers utiles dans les clones

**Agent Memory** — `README.md`, `INSTALL.md`, `MemoryCore/`, `sdk/`, `adapters/`

**tencentcloud-sdk-go** — modules par produit sous le repo (`tencentcloud/…`), `README.md` (credentials, retry, Common Client)

**TIMSDK** — `README.md` / `README_ZH.md`, table de routage vers `chat-uikit-vue`, `chat-uikit-react`, etc.

**tencentmeeting-cli** — `README.md`, commandes `tmeet`, flux OAuth2 device code

**tencentcloud-speech-sdk-go** — `asr/`, **`tts/`**, `examples/`

Les clones sous `research/*/` ne sont pas versionnés dans ce repo (voir `.gitignore`).

Clones locaux (oct. 2026) : `tencentdb-agent-memory` @ `ecc01a5`, `tencentcloud-sdk-go` @ `779c9a6`, `timsdk` @ `00fb559`, `tencentmeeting-cli` @ `bd9ab53`, `tencentcloud-speech-sdk-go` @ `257f9f5`.

**Plan d’intégration WeKnora (4 repos)** : [docs/gsms-audit/12-integration-plan-tencent-extensions.md](../docs/gsms-audit/12-integration-plan-tencent-extensions.md) · diagrammes [Mermaid](../docs/gsms-audit/diagrams/architecture-weknora-tencent-extensions.md) · [Archify HTML](../.archify/architecture-weknora-tencent-20261030/weknora-tencent-extensions.html) (si généré).
