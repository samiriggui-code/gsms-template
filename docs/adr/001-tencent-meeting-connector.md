# ADR 001 — Connecteur Tencent Meeting (WeKnora)

**Statut** : accepté (phase 0)  
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
