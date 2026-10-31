# Handoff — Global-IT-SS AI Engine (31 oct. 2026)

Dépôt de travail : **samiriggui-code/gsms-template** (fork WeKnora). Forks sources (lecture seule) : `samiriggui-code/WeKnora`, `samiriggui-code/TencentDB-Agent-Memory` (branche `feat/server_team@ecc01a5`).

## 1. En bref

- **Fait (dans main, commit `9da9644`)** : base WeKnora importée, audit, landing bilingue, interface et serveur en **français par défaut / anglais en second**. Le chinois est retiré de l'interface et des messages serveur. Cursor a ajouté le déploiement Traefik, le branding Global-IT-SS et le responsive mobile.
- **Pas commencé** : le cœur de la stratégie A, c'est-à-dire porter en Go la mémoire d'équipe/projet (L2/L3) et l'apprentissage de skills de TencentDB Agent Memory.
- **En cours sur des branches** : connecteur Tencent Meeting (PR #23) et refonte site + dossier `research/` (PR #24).
- **Points de vigilance** : les images serveur déployées viennent encore de Docker Hub upstream, ebooklib (AGPL) est toujours présent via `textract`, et PR #24 est en conflit avec main.

## 2. Travail de Cursor (30 oct.)

Cursor a fusionné lui-même les PR #6 à #22 dans main sans relecture humaine.

| PR | Contenu | Remarque |
| --- | --- | --- |
| #6 | Retrait d'ebooklib du parseur EPUB | ebooklib reste dans `docreader/uv.lock` comme dépendance de `textract` : retrait incomplet |
| #7, #9 | Landing dans Compose + middleware Traefik `gsms-secure` | OK |
| #11 | Build local du frontend FR/EN sur le VPS (`gsms-weknora-ui`) | Seul le frontend est construit localement. `app`, `docreader` et `sandbox` restent `wechatopenai/weknora-*:latest`, donc **le serveur en prod n'aura ni le français ni le retrait d'ebooklib** tant qu'on ne les construit pas depuis ce repo |
| #9 / bootstrap | Script qui génère le `.env` du VPS | Il écrase le `.env`, invente `admin@gsms-security.com` et ignore la clé OpenRouter, les LLM, le SMTP et le compte admin déjà en place pour Qualiopi. **Ne pas l'utiliser tel quel** |
| #12 | Branding auth Global-IT-SS | OK |
| #14, #15, #17 | Landing visible sans JS, alignée sur Qualiopi | OK |
| #18 à #22 | Responsive mobile (menu, paramètres) | Avait cassé la CI frontend (garde de style). Corrigé dans #25 |

Revue détaillée : fichier `revue-cursor-2026-10-31.md` dans les fichiers du projet Claude (pas dans ce repo).

## 3. PR ouvertes

| PR | Sujet | État |
| --- | --- | --- |
| #24 `feat/site-homepage-i18n` | Supprime `landing/`, homepage unifiée dans `website-docs/`, workflow `deploy-vps.yml`, script `clone-research.sh` | 289 fichiers. **En conflit avec main** depuis #25. Le workflow déploie une branche de feature en root sur le VPS : à relire avant toute fusion |
| #23 `feat/tencent-meeting-connector` | Connecteur Meeting phase 0 (`internal/tencentmeeting/`, tâche asynq, flag `WEKNORA_TENCENT_MEETING_ENABLED`, ADR, plan doc 12) | CI rouge (lint Go, tests Go, frontend) |
| #16 | Avertissement conteneur dupliqué + Reveal mobile | Mergeable, CI verte |
| #13 | Backoffice FR (`WEKNORA_LANGUAGE`) | Base obsolète (branche Cursor déjà fusionnée), conflits, CI rouge. Largement couvert par #25 : à fermer probablement |
| #10 | Pas de port hôte pour `app` derrière Traefik | 3 lignes, mergeable |
| #8 | Note de vérification post-merge | Doc seulement, mergeable |
| #3 | Dependabot go-runewidth | Sans risque |

## 4. Dossier `research/` (nouveaux dépôts)

Ajouté sur la branche de PR #24. Les clones ne sont pas versionnés (~700 Mo). On les récupère avec `./scripts/clone-research.sh`, qui les épingle :

| Dépôt | Commit | Usage prévu |
| --- | --- | --- |
| TencentDB Agent Memory | `ecc01a5` | Mémoire L0→L3, skills, offload Mermaid → **cœur stratégie A** |
| tencentcloud-sdk-go | `779c9a6` | Appels API Tencent Cloud en Go (wrapper `internal/tencentcloud/`) |
| tencentmeeting-cli | `bd9ab53` | Modèle pour le client Go Meeting (OAuth, transcripts → KB) |
| tencentcloud-speech-sdk-go | `257f9f5` | ASR/TTS comme fournisseur dans `internal/models/` |
| TIMSDK | `00fb559` | Canal chat Tencent dans `internal/im/` (le plus gros chantier) |

Ordre prévu par le plan doc 12 : Meeting → SDK → Speech → TIM. Ce plan **exclut volontairement** le portage mémoire L2/L3, qui reste un chantier séparé. **Licences des 4 nouveaux dépôts non vérifiées** : à faire avant d'en copier du code.

## 5. Règles à respecter

- Tout passe par branche + PR. Changements additifs par défaut ; une suppression n'est permise qu'avec l'accord explicite de samir (ex. retrait de `textract`/ebooklib). CodeRabbit relit, son Autofix reste désactivé, et Claude fait les corrections.
- Déploiement sur le VPS global-it-ss.com : il se fait depuis le PC de samir (Omarchy, Claude local). **Aucune nouvelle instance LLM.** On réutilise les 2 LLM de Qualiopi, la même clé OpenRouter, le même utilisateur SMTP et le même compte admin, renseignés uniquement dans le `.env` du VPS. Base de données séparée, projet Compose isolé `globalitss`.
- Ne jamais écrire de secret dans le repo ou la mémoire.
- Retrait de `textract`/ebooklib : attendre le « ok installe » de samir.
- Langues : français principal, anglais secondaire. Les autres locales frontend (ja, ko, ru, zh-TW) existent encore pour l'audit de clés.

## 6. Prochaines étapes proposées

1. Rebaser PR #24 sur main, relire `deploy-vps.yml`, puis fusionner (cela apporte `research/` dans main).
2. Corriger la CI de PR #23 et la fusionner (Meeting phase 0, derrière flag).
3. Faire construire `app` et `docreader` depuis ce repo au déploiement, et remplacer le script bootstrap `.env` par un modèle qui réutilise les accès existants.
4. Retirer `textract` (ebooklib) après accord.
5. Lancer le portage mémoire Agent Memory → Go (L2/L3, scopes équipe/projet, skills), comme décidé en stratégie A.
6. Vérifier les licences des dépôts `research/`.
