# 12 — Plan d’intégration WeKnora × 4 extensions Tencent

**Périmètre (oct. 2026)** : enrichir **WeKnora** uniquement — pas de cœur métier GIS (9 axes). Les clones vivent dans `research/` ; le code productif reste dans les patterns WeKnora existants (`internal/handler/`, `internal/im/`, `internal/models/`, etc.), pas de package `internal/gis/` tant que le métier GIS n’est pas lancé.

**Référence veille** : `research/README.md`  
**Diagrammes** :
- Mermaid : [architecture-weknora-tencent-extensions.md](./diagrams/architecture-weknora-tencent-extensions.md)
- Archify (HTML interactif) : [weknora-tencent-extensions.html](../../.archify/architecture-weknora-tencent-20261030/weknora-tencent-extensions.html) · source JSON : [candidate.json](../../.archify/architecture-weknora-tencent-20261030/candidate.json)

---

## 0. Priorités révisées (31 oct. 2026)

Ordre décidé par samir : **connecteurs de réunions, puis le cœur Agent Memory**. Le SDK cloud, la voix et TIM passent après.

**Révision du 31 oct. 2026 (soir)** : Tencent Meeting est retiré. C'est un service chinois que ni samir ni ses clients n'utilisent. Il est remplacé par Microsoft Teams, Zoom et Google Meet, les outils de visio des entreprises clientes ([ADR 002](../adr/002-meetings-connectors.md), `internal/meetings/`). Le reste de ce document décrit le plan Tencent d'origine.

| Rang | Chantier | Pourquoi ce rang | Référence |
|------|----------|------------------|-----------|
| 1 | **Réunions : Teams, Zoom, Google Meet** (OAuth, import horaire, écran de réglages, doc FR/EN) | Outils réellement utilisés par les clients ; remplace Tencent Meeting | ADR 002 |
| 2 | **Cœur Agent Memory** (phases 1 à 4 de la [feuille de route](./09-migration-roadmap.md) : portées, L2/L3, Skills, UI) | C'est la valeur principale du projet selon la [synthèse](./01-executive-summary.md) | 09 |
| 3 | **Speech** (ASR Tencent comme fournisseur, TTS ensuite) | Petit, indépendant, utile à Meeting si un enregistrement n'a pas de transcript | §3.3 |
| — | **tencentcloud-sdk-go** | Pas un chantier : on ajoute un module seulement quand un rang ci-dessus en a besoin | §3.2 |
| 4 | **TIM** (canal Tencent Chat) | Le plus gros, seulement si un besoin métier est validé. Dépôt sans licence : client écrit depuis la doc de l'API REST, sans copier de code | §3.4 |

Transverse, à faire au fil de l'eau : scan de licences + SBOM en CI, entrées `THIRD_PARTY_NOTICES.md` pour chaque code Tencent porté, workflow Docker Hub (secrets manquants).

---

## 1. Objectifs

| Objectif | Mesure de succès |
|----------|------------------|
| **Meeting → connaissance** | Transcripts / CR Tencent Meeting ingérés en KB + extract mémoire WK |
| **Cloud Tencent en Go** | Appels API ciblés (CAM, Meeting API, …) via modules SDK, secrets tenant |
| **Voix optionnelle** | ASR/TTS Tencent comme fournisseurs dans le Model Gateway |
| **Chat Tencent (option)** | Canal IM type TIM branché sur le modèle `internal/im/` |
| **Template RAG complet** | Un déploiement WeKnora + flags ; pas de second moteur Node/Python métier |

---

## 2. Principes d’adaptation

1. **Additif** — routes `/api/v1` et UI existantes intactes ; feature flags `TENCENT_*` / réglages tenant.
2. **Pas de copie de repo** — `go get` modules SDK ; Meeting = client Go inspiré de `research/tencentmeeting-cli`, pas npm `tmeet` en prod.
3. **Tenant-first** — OAuth Meeting et clés cloud = credentials chiffrés (comme IM / datasources).
4. **Ordre** — voir §0 (priorités révisées le 31 oct. 2026).
5. **Hors scope immédiat** — MemoryProxy Node, TIM UIKit dans Vue.

---

## 3. Les 4 repos — rôle & intégration

### 3.1 `tencentmeeting-cli` (priorité 1)

| | |
|---|---|
| **Apport** | OAuth2 device, CRUD réunions, enregistrements, **transcripts**, résumés intelligents |
| **Alignement mémoire/RAG** | Texte = **L0 / documents KB** → pipeline `memory` + chunking existant |
| **Où coder** | `internal/tencentmeeting/` (client + service) · handler dédié ou extension datasource · tâche `asynq` sync · UI `frontend/src/views/settings/` (section intégrations) |
| **Phases** | **P0** spec + credentials · **P1** job sync → `knowledge.create_manual` / API interne · **P2** API Go native (sans binaire CLI) · **P3** automatisations « après chaque réunion » |
| **Research** | `research/tencentmeeting-cli/` — lire auth + appels API |

### 3.2 `tencentcloud-sdk-go` (priorité 2, au fil de l’eau)

| | |
|---|---|
| **Apport** | Client officiel API 3.0 (Meeting, SMS, CAM, …) |
| **Alignement** | Infrastructure ; **ne pas** remplacer le retriever **Tencent VectorDB** déjà dans `internal/application/repository/retriever/` |
| **Où coder** | Dépendances `go.mod` par produit · wrapper mince `internal/tencentcloud/` (credentials, région, retry) · config `config/config.yaml` + `.env.example` |
| **Phases** | Introduire **uniquement** les packages importés (ex. `tencentcloud/wemeet`, `common`) lors de P2 Meeting |

### 3.3 `tencentcloud-speech-sdk-go` (priorité 3)

| | |
|---|---|
| **Apport** | **ASR** + **TTS** (`tts/speechsynthesizer.go`, WebSocket) |
| **Alignement** | Même couche que transcription OpenAI-compatible (`internal/models/asr/`) |
| **Où coder** | `internal/models/providers/tencent_speech.go` (ou `asr/tencent/`) · entrée catalogue modèles tenant · doc `website-docs/03-features/06-models.md` |
| **Phases** | **P1** ASR derrière flag · **P2** TTS si UX vocale agent · fallback Meeting si audio sans transcript |

### 3.4 `TIMSDK` (priorité 4)

| | |
|---|---|
| **Apport** | Hub doc vers SDK Chat multi-plateforme ; **pas** le UIKit dans WeKnora |
| **Alignement** | Canal conversationnel → sessions IM WK (`internal/im/`) |
| **Où coder** | `internal/im/tencent_chat/` (factory, webhook/long poll, mapper messages) · settings `integration-im` · repo satellite `chat-uikit-vue` **non** embarqué |
| **Phases** | Spike API serveur Tencent Chat · MVP webhook entrant · sortant + mapping agent · option push (hors scope MVP) |

---

## 4. Phases consolidées (calendrier indicatif)

| Phase | Durée | Livrables |
|-------|-------|-----------|
| **0 — Spec & flags** | 1 sem. | ADR périmètre, variables env, maquettes settings FR/EN, pas de prod |
| **1 — Meeting → KB** | 2–3 sem. | Connecteur sync transcripts, tests tenant isolation, doc utilisateur |
| **2 — SDK + API Meeting Go** | 1–2 sem. | Retrait dépendance CLI prod, `internal/tencentcloud/` + tests |
| **3 — Speech providers** | 1–2 sem. | ASR Tencent optionnel, config modèle |
| **4 — TIM canal** | 3–4 sem. | Adapter IM minimal (si besoin métier validé) |
| **5 — Durcissement** | 1 sem. | `check:links`, notices licences, runbook ops |

**Parallèle possible** : doc FR, homepage (déjà GIS vitrine) indépendamment du code.

---

## 5. Cartographie fichiers WeKnora (touchés)

| Zone | Meeting | SDK | Speech | TIM |
|------|---------|-----|--------|-----|
| `internal/handler/` | ✓ routes sync / OAuth callback | — | — | ✓ webhook IM |
| `internal/router/` | ✓ | — | — | ✓ |
| `internal/background/` / `router/task.go` | ✓ tâche sync | — | — | — |
| `internal/application/service/` | ✓ ingestion KB | — | — | — |
| `internal/im/` | — | — | — | ✓ nouveau adapter |
| `internal/models/` | — | — | ✓ ASR/TTS | — |
| `frontend/views/settings/` | ✓ | ✓ (clés cloud) | ✓ | ✓ |
| `migrations/versioned/` | ✓ table credentials connector | — | — | ✓ si config canal |
| `website-docs/03-features/` | ✓ page intégration | — | ✓ | ✓ |

---

## 6. Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| Explosion scope TIM + Meeting + mémoire AM | Flags ; Meeting seul en MVP |
| Secrets OAuth Meeting | Chiffrement at-rest, rotation, audit |
| Coût API cloud / speech | Quotas tenant, modèles locaux par défaut |
| Rebase upstream WeKnora | Packages `internal/tencent*` / `internal/im/tencent_*` isolés |
| Licences | Entrées `THIRD_PARTY_NOTICES.md`, pas de vendor SDK monolithique |

---

## 7. Critères de « done » template WeKnora

- [ ] Meeting : au moins transcript → KB testé sur un tenant
- [ ] Aucun service Node Tencent requis pour ce lot
- [ ] Doc FR publiée sous `/docs/`
- [ ] Build `go test` / CI verts sur packages touchés
- [ ] Agent Memory reste en `research/` jusqu’à décision portage L2/L3

---

## 8. Avancement (oct. 2026)

| Phase | Statut | Notes |
|-------|--------|--------|
| **0 — Spec & flags** | **Fait (MVP)** | [ADR Meeting](../adr/001-tencent-meeting-connector.md), `WEKNORA_TENCENT_MEETING_ENABLED`, [CODE_REVIEW.md](../CODE_REVIEW.md), `.coderabbit.yaml` |
| **1 — Meeting → KB** | **Backend P1 câblé** | `internal/tencentmeeting/`, routes `GET/POST /api/v1/integrations/tencent-meeting/…`, tâche `tencentmeeting:sync`, capability `integrations.tencent_meeting` |
| **1 — reste / P2** | En cours (`feat/tencent-meeting-p2`) | Client API Go (sans CLI), identifiants chiffrés par tenant, synchro automatique, écran de réglages FR/EN, doc utilisateur FR |

**API P1 (flag activé)** :

- `GET /api/v1/integrations/tencent-meeting/status` (Viewer+)
- `POST /api/v1/integrations/tencent-meeting/knowledge-bases/:kbId/sync` (Admin+) — body `{ "items": [{ "meeting_id", "title?", "summary?", "transcript", "recorded_at?" }], "publish": false }`

## 9. Suite recommandée

1. Branche `feat/tencent-meeting-connector` + PR.  
2. `coderabbit review --agent --uncommitted` (ou revue auto PR) avant merge.  
3. **P2** client API Go (sans CLI) + credentials tenant chiffrés.  
4. Mettre à jour [architecture-cible](./diagrams/architecture-cible.md) quand le connecteur est validé en prod.
