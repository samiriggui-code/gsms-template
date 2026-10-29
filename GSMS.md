# gsms-template — moteur Global-IT-SS

Ce dépôt est le socle du template Global-IT-SS. Il part de WeKnora (Tencent, licence MIT) et accueillera les capacités portées depuis TencentDB Agent Memory (Tencent, licence MIT).

## Origine du code

| Source | Fork | Commit de départ |
|---|---|---|
| WeKnora | `samiriggui-code/WeKnora` | `40192ace214ca046a86b590d69c1fe7286f3423e` (v0.9.0) |
| TencentDB Agent Memory | `samiriggui-code/TencentDB-Agent-Memory` (branche `feat/server_team`) | `ecc01a545da0b2ac6cae2f0f0af0d39d41469793` (v2.0.3) |

La branche `weknora-upstream` contient WeKnora tel quel, sans modification. Agent Memory sert de référence : son code est porté module par module, jamais copié en bloc.

## Règles

- Les ajouts Global-IT-SS vont dans des paquets dédiés (`internal/gis/...`) et des migrations **additives** : aucune suppression de fichier ni de migration WeKnora.
- Les licences et notices tierces (`LICENSE`, `THIRD_PARTY_NOTICES.md`, `licenses/`) sont conservées.
- Aucun déploiement sur un serveur de production sans validation.

## Synchroniser avec WeKnora

```bash
git remote add weknora https://github.com/Tencent/WeKnora.git
git fetch weknora main
git checkout -b sync/weknora-AAAA-MM-JJ
git merge weknora/main
```

## Landing

Le site vitrine Global-IT-SS (FR/EN) se trouve dans [landing/](landing/README.md). Il vient de la landing du projet `samiriggui-code/global-it-ss` (commit `b567226`).

## Documentation

L'audit d'architecture et la stratégie de fusion se trouvent dans [docs/gsms-audit/](docs/gsms-audit/README.md).
