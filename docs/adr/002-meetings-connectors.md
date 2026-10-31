# ADR 002 — Connecteurs Réunions : Teams, Zoom, Google Meet

**Statut** : accepté
**Date** : 2026-10-31
**Remplace** : [ADR 001](001-tencent-meeting-connector.md)

## Contexte

Le plan d'intégration prévoyait un connecteur Tencent Meeting. Tencent Meeting est un service de visioconférence chinois : ni samir ni ses clients ne l'utilisent. Les entreprises clientes utilisent Microsoft Teams, Zoom et Google Meet.

## Décision

1. **Tencent Meeting est retiré** : paquet `internal/tencentmeeting/`, routes `/integrations/tencent-meeting/*`, tâche `tencentmeeting:sync`, capability `integrations.tencent_meeting`.
2. **Un connecteur commun** `internal/meetings/` avec une interface `Provider` et trois implémentations :
   - **Teams** : Microsoft Graph en permissions déléguées. `getAllTranscripts` n'existe qu'en permission d'application, donc les réunions sont retrouvées par l'agenda (`/me/calendarView` → `/me/onlineMeetings?$filter=JoinWebUrl` → `/transcripts` → contenu VTT).
   - **Zoom** : application OAuth gérée par l'utilisateur, `GET /users/me/recordings` par fenêtres de 30 jours, fichiers `TRANSCRIPT` terminés.
   - **Google Meet** : Meet REST API v2 (`conferenceRecords` → `transcripts` → `entries`), scope `meetings.space.readonly` uniquement (sensible, pas restreint).
3. **OAuth standard** (code d'autorisation, `golang.org/x/oauth2`) avec une adresse de retour unique, publique, protégée par un `state` à usage unique de 15 minutes. Les jetons sont chiffrés avec `SYSTEM_AES_KEY` ; les jetons renouvelés (Zoom les fait tourner à chaque renouvellement) sont enregistrés aussitôt.
4. **Une connexion par (tenant, plateforme)** (migration 000135 / SQLite 000052). Une plateforme est disponible dès que son identifiant et son secret sont dans le `.env`, sans autre drapeau.
5. **Import** : tâche asynq `meetings:pull`, à la demande ou toutes les heures. Les transcriptions importées sont tracées dans `meeting_imports` pour ne jamais créer de doublon.

## Conséquences

- Chaque déploiement doit créer une application chez Microsoft, Zoom et Google ; la procédure est dans `website-docs/03-features/29-meetings.md`.
- Teams demande un consentement administrateur et l'activation de « Accès aux transcriptions par API » dans le centre d'administration Teams, désactivé par défaut.
- Google Meet supprime les transcriptions de l'API après 30 jours ; l'import automatique doit rester actif.
- Les trois clients d'API n'ont été testés que contre des serveurs simulés : un essai avec de vrais comptes reste à faire avant la mise en production.
