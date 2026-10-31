# Global-IT-SS — après `git clone`

Ce dépôt (**gsms-template**) est le fork WeKnora / moteur GIS. Une étape **obligatoire** n’est pas faite par `git clone` seul.

## Dossier `research/` (veille Tencent)

Les clones des dépôts Tencent (Meeting CLI, SDK Go, Speech, TIM, Agent Memory) **ne sont pas versionnés** (~700 Mo, voir `.gitignore`). Ils servent à préparer le portage vers `internal/` (ex. `internal/tencentmeeting/` sur la branche Meeting).

**Sur chaque nouvelle machine (PC portable, CI de dev, collègue) :**

```bash
git clone https://github.com/samiriggui-code/gsms-template.git
cd gsms-template
./scripts/clone-research.sh
```

Le script crée `research/tencentdb-agent-memory/`, `research/tencentcloud-sdk-go/`, `research/timsdk/`, `research/tencentmeeting-cli/`, `research/tencentcloud-speech-sdk-go/` aux commits épinglés.

Détails, table de correspondance `research/` → `internal/` : **[research/README.md](./research/README.md)**.

## Branches utiles

| Branche | Contenu |
| --- | --- |
| `feat/site-homepage-i18n` | Site `website-docs/`, deploy VPS, branding GIS |
| `feat/meetings-connectors` | Connecteurs Réunions Teams / Zoom / Google Meet (`internal/meetings/`, ADR 002) |

## Site vitrine en local

```bash
cd website-docs && npm run setup && npm run build && npm run preview
```

Voir aussi [docs/deploy-vps.md](./docs/deploy-vps.md) et [deploy/deploy-global-it-ss-vps.md](./deploy/deploy-global-it-ss-vps.md).
