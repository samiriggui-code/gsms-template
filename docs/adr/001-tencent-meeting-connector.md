# ADR 001 — Connecteur Tencent Meeting (WeKnora)

**Statut** : remplacé le 2026-10-31 par [ADR 002](002-meetings-connectors.md) (connecteur retiré : Tencent Meeting est un service chinois sans usage chez nos clients)
**Date** : 2026-10-30  
**Périmètre** : WeKnora uniquement — pas de cœur métier GIS.

## Contexte

Les transcripts et comptes-rendus Tencent Meeting doivent alimenter les bases de connaissances et la mémoire utilisateur sans déployer le CLI npm `tmeet` dans l’image serveur.

## Décision

1. Feature flag **`WEKNORA_TENCENT_MEETING_ENABLED`** (défaut `false`).
2. Package **`internal/tencentmeeting/`** : enqueue + worker asynq `tencentmeeting:sync`.
3. **P1** : ingestion via API interne — le client OAuth/API Meeting (P2) n’est pas requis pour importer du texte déjà extrait.
4. Credentials OAuth : stockage chiffré tenant (phase ultérieure) ; P1 accepte un corps JSON signé par un admin.

## Conséquences

- Routes `/api/v1/integrations/tencent-meeting/*` enregistrées seulement si le flag est actif.
- Capability `integrations.tencent_meeting` exposée au frontend.
- CodeRabbit review obligatoire avant merge (voir `docs/CODE_REVIEW.md`).

## P2 (2026-10-31)

1. **Client Go natif** (`internal/tencentmeeting/client.go`) : mêmes hôtes, en-têtes et flux d'autorisation par code d'appareil que le CLI `tmeet` (`research/tencentmeeting-cli` @ `bd9ab53`, MIT). Pas de binaire CLI ni de SDK npm en production.
2. **Une connexion par tenant** (table `tencent_meeting_connections`, migration 000135 / SQLite 000052). Jetons chiffrés AES-256-GCM avec `SYSTEM_AES_KEY`, jamais renvoyés par l'API.
3. **Import** : tâche asynq `tencentmeeting:pull`, lancée à la demande ou toutes les heures (cron interne, identifiant de tâche déterministe pour éviter les doublons entre instances). Les fichiers déjà importés sont tracés dans `tencent_meeting_imports`.
4. **Écran** : Paramètres → Intégrations → Tencent Meeting (admin).

**Risque accepté** : le flux d'autorisation est celui du CLI officiel. Si Tencent le réserve au CLI, il faudra une application d'entreprise Tencent Meeting (signature AK/SK) ; le reste du connecteur ne change pas.
