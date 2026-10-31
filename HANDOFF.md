# Handoff — Global-IT-SS AI Engine (31 oct. 2026)

Dépôt de travail : **samiriggui-code/gsms-template** (fork WeKnora). Forks sources (lecture seule) : `samiriggui-code/WeKnora`, `samiriggui-code/TencentDB-Agent-Memory` (branche `feat/server_team@ecc01a5`).

## 1. En bref

- **Fait (dans main, commit `082a128`)** : base WeKnora importée, audit, interface et serveur en **français par défaut / anglais en second** (#25), homepage unifiée dans `website-docs/` avec suppression de `landing/`, workflow `deploy-vps.yml` et script `clone-research.sh` (#27, remplace #24), retrait de `textract` et d'ebooklib (#28), images `app`, `docreader`, `frontend` et `site` toujours construites depuis ce repo (#29), infos de build sur la page système (#30).
- **Déployé** : le VPS (`/opt/global-it-ss`, projet Compose `globalitss`) tourne sur `082a128` ; www, /docs/ et app.global-it-ss.com répondent 200.
- **Pas commencé** : le cœur de la stratégie A, c'est-à-dire porter en Go la mémoire d'équipe/projet (L2/L3) et l'apprentissage de skills de TencentDB Agent Memory (aucun paquet `internal/gis/` pour l'instant).
- **Points de vigilance** : le workflow GitHub « Build and Push Docker Image » échoue faute de secrets Docker Hub (sans effet sur le VPS, qui construit ses images lui-même) ; le workflow `deploy-vps.yml` n'a jamais tourné et n'a pas de secrets, le déploiement restant fait depuis le PC de samir.

## 2. Travail de Cursor (30 oct.)

Cursor a fusionné lui-même les PR #6 à #22 dans main sans relecture humaine.

| PR | Contenu | Remarque |
| --- | --- | --- |
| #6 | Retrait d'ebooklib du parseur EPUB | Complété par #28 (retrait de `textract`) |
| #7, #9 | Landing dans Compose + middleware Traefik `gsms-secure` | OK |
| #11 | Build local du frontend FR/EN sur le VPS (`gsms-weknora-ui`) | Étendu à `app` et `docreader` par #29 |
| #9 / bootstrap | Script qui génère le `.env` du VPS | Il écrase le `.env`, invente `admin@gsms-security.com` et ignore la clé OpenRouter, les LLM, le SMTP et le compte admin déjà en place pour Qualiopi. **Ne pas l'utiliser tel quel** |
| #12 | Branding auth Global-IT-SS | OK |
| #14, #15, #17 | Landing visible sans JS, alignée sur Qualiopi | OK |
| #18 à #22 | Responsive mobile (menu, paramètres) | Avait cassé la CI frontend (garde de style). Corrigé dans #25 |

Revue détaillée : fichier `revue-cursor-2026-10-31.md` dans les fichiers du projet Claude (pas dans ce repo).

## 3. PR ouvertes

| PR | Sujet | État |
| --- | --- | --- |
| #16 | Avertissement conteneur dupliqué + Reveal mobile | Porte sur `landing/`, supprimé par #27, et en conflit : à fermer |
| #13 | Backoffice FR (`WEKNORA_LANGUAGE`) | Base obsolète (branche Cursor déjà fusionnée), conflits, CI rouge. Couvert par #25 : à fermer |
| #10 | Pas de port hôte pour `app` derrière Traefik | 3 lignes, mergeable. Le VPS retire déjà ce port via `traefik.gsms.yml` |
| #8 | Note de vérification post-merge | Cite `landing/`, supprimé par #27 : à fermer |
| #3 | Dependabot go-runewidth | CI verte, sans risque |

## 4. Dossier `research/` (nouveaux dépôts)

Arrivé dans main avec #27. Les clones ne sont pas versionnés (~700 Mo). On les récupère avec `./scripts/clone-research.sh`, qui les épingle :

| Dépôt | Commit | Usage prévu |
| --- | --- | --- |
| TencentDB Agent Memory | `ecc01a5` | Mémoire L0→L3, skills, offload Mermaid → **cœur stratégie A** |
| tencentcloud-sdk-go | `779c9a6` | Appels API Tencent Cloud en Go (wrapper `internal/tencentcloud/`) |
| tencentmeeting-cli | `bd9ab53` | Plus utilisé : le connecteur Tencent Meeting a été retiré (ADR 002) |
| tencentcloud-speech-sdk-go | `257f9f5` | ASR/TTS comme fournisseur dans `internal/models/` |
| TIMSDK | `00fb559` | Canal chat Tencent dans `internal/im/` (le plus gros chantier) |

Ordre prévu par le plan doc 12 : Meeting → SDK → Speech → TIM. Ce plan **exclut volontairement** le portage mémoire L2/L3, qui reste un chantier séparé. **Licences des 4 nouveaux dépôts (SDK Go, Meeting CLI, Speech SDK, TIMSDK) non vérifiées** ; Agent Memory a déjà été audité (composant `tea-component` sans licence dans son panel) : à faire avant d'en copier du code.

## 5. Règles à respecter

- Tout passe par branche + PR. Changements additifs par défaut ; une suppression n'est permise qu'avec l'accord explicite de samir. CodeRabbit relit, son Autofix reste désactivé, et Claude fait les corrections.
- Déploiement sur le VPS global-it-ss.com : il se fait depuis le PC de samir (Omarchy, Claude local). **Aucune nouvelle instance LLM.** On réutilise les 2 LLM de Qualiopi, la même clé OpenRouter, le même utilisateur SMTP et le même compte admin, renseignés uniquement dans le `.env` du VPS. Base de données séparée, projet Compose isolé `globalitss`.
- Ne jamais écrire de secret dans le repo ou la mémoire.
- Langues : français principal, anglais secondaire. Les autres locales frontend (ja, ko, ru, zh-TW) existent encore pour l'audit de clés.

## 6. Priorités (révisées le 31 oct. 2026)

Détail : [docs/gsms-audit/12-integration-plan-tencent-extensions.md §0](docs/gsms-audit/12-integration-plan-tencent-extensions.md).

1. **Connecteurs Réunions** Teams / Zoom / Google Meet, à la place de Tencent Meeting (branche `feat/meetings-connectors`, [ADR 002](docs/adr/002-meetings-connectors.md)). Reste : créer les applications chez Microsoft, Zoom et Google, et tester avec de vrais comptes.
2. **Cœur Agent Memory** (stratégie A) : phases 1 à 4 de la [feuille de route](docs/gsms-audit/09-migration-roadmap.md), soit portées mémoire, L2/L3, Skills, UI.
3. **Speech** : ASR Tencent comme fournisseur de modèles.
4. **TIM** : seulement si un besoin métier est validé.

En continu : réparer ou désactiver le workflow Docker Hub, scan de licences + SBOM en CI, remplacer le script bootstrap `.env` par un modèle qui réutilise les accès existants.
