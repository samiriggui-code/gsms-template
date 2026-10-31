# Réunions : Teams, Zoom, Google Meet

Le connecteur Réunions importe les transcriptions de vos réunions Microsoft Teams, Zoom et Google Meet dans une base de connaissances. Chaque transcription devient un document Markdown, paragraphe par paragraphe avec le nom de l'intervenant, que l'assistant peut ensuite citer.

Chaque plateforme se configure une fois sur le serveur (une « application » déclarée chez l'éditeur), puis chaque espace connecte son propre compte depuis **Paramètres → Intégrations → Réunions**.

## Configuration du serveur

Dans le `.env` du serveur, renseignez uniquement les plateformes voulues, puis redémarrez le service `app` :

```bash
# Adresse publique de WeKnora : sert à construire l'adresse de retour OAuth
MEETINGS_PUBLIC_URL=https://app.example.com
# Chiffre les jetons de connexion en base (32 caractères exactement)
SYSTEM_AES_KEY=<clé de 32 caractères>

MICROSOFT_TEAMS_CLIENT_ID=
MICROSOFT_TEAMS_CLIENT_SECRET=
# MICROSOFT_TEAMS_TENANT=organizations

ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=

GOOGLE_MEET_CLIENT_ID=
GOOGLE_MEET_CLIENT_SECRET=
```

L'adresse de retour à déclarer chez chaque éditeur est affichée en bas de l'écran Réunions. Elle vaut `<MEETINGS_PUBLIC_URL>/api/v1/integrations/meetings-oauth/callback`.

### Microsoft Teams

Prérequis : un compte Microsoft 365 professionnel ou scolaire. Les comptes Microsoft personnels ne sont pas pris en charge par Microsoft.

1. Portail Azure → **Microsoft Entra ID → Inscriptions d'applications → Nouvelle inscription**. Type de compte : « Comptes dans un annuaire d'organisation » (multilocataire) ou votre seul annuaire. URI de redirection (Web) : l'adresse de retour ci-dessus.
2. **Certificats et secrets → Nouveau secret client** : copiez la valeur dans `MICROSOFT_TEAMS_CLIENT_SECRET`, et l'ID d'application dans `MICROSOFT_TEAMS_CLIENT_ID`.
3. **Autorisations d'API → Microsoft Graph → Autorisations déléguées** : `User.Read`, `Calendars.Read`, `OnlineMeetings.Read`, `OnlineMeetingTranscript.Read.All`, `offline_access`. Puis **Accorder un consentement administrateur** : `OnlineMeetingTranscript.Read.All` l'exige.
4. Centre d'administration Teams → **Réunions → Paramètres de réunion → Accès aux transcriptions par API** : activez-le (désactivé par défaut chez Microsoft). Activez aussi l'attribution des intervenants pour avoir leurs noms.
5. La transcription doit être autorisée par la stratégie de réunion Teams des organisateurs.

Le connecteur lit l'agenda de l'utilisateur connecté, retrouve les réunions Teams, puis leurs transcriptions. Microsoft supprime l'accès aux réunions ponctuelles 60 jours après leur date.

### Zoom

Prérequis : un forfait Zoom Pro ou supérieur, l'enregistrement dans le cloud et l'option « Créer une transcription audio » activés.

1. [Zoom App Marketplace](https://marketplace.zoom.us/) → **Develop → Build App → General App**, gérée par l'utilisateur (User-managed).
2. URL de redirection OAuth et liste d'autorisation : l'adresse de retour ci-dessus.
3. Scopes : `cloud_recording:read:list_user_recordings` (ou `recording:read` pour une application à scopes classiques) et `user:read:user`.
4. Copiez le Client ID et le Client Secret dans `ZOOM_CLIENT_ID` et `ZOOM_CLIENT_SECRET`.

Seules les transcriptions des enregistrements cloud terminés sont importées.

### Google Meet

Prérequis : Google Workspace Business Standard ou supérieur (les transcriptions n'existent ni sur Business Starter ni sur les comptes Gmail personnels).

1. [Google Cloud Console](https://console.cloud.google.com/) → nouveau projet → **API et services → Bibliothèque** : activez **Google Meet REST API**.
2. **Écran de consentement OAuth** : scopes `openid`, `email` et `https://www.googleapis.com/auth/meetings.space.readonly`. Ce dernier est « sensible » : pour des comptes hors de votre organisation, Google demande une vérification de l'application. En type « Interne », aucune vérification n'est nécessaire.
3. **Identifiants → Créer un ID client OAuth → Application Web**, URI de redirection autorisé : l'adresse de retour ci-dessus. Copiez l'ID et le secret dans `GOOGLE_MEET_CLIENT_ID` et `GOOGLE_MEET_CLIENT_SECRET`.

Google supprime les transcriptions de l'API 30 jours après la réunion : gardez l'import automatique activé. Une application en statut « Test » reçoit des jetons valables 7 jours seulement ; publiez-la pour un usage durable.

## Connecter un compte

1. **Paramètres → Intégrations → Réunions**, carte de la plateforme → **Connecter**.
2. Connectez-vous chez l'éditeur et acceptez l'accès. Vous revenez automatiquement sur WeKnora.
3. Choisissez la base de connaissances, puis activez l'import automatique si vous le souhaitez.

| Réglage | Effet |
| --- | --- |
| Base de connaissances | Base qui reçoit les documents. Obligatoire pour importer. |
| Import automatique | Vérifie les nouvelles transcriptions toutes les heures. |
| Publier directement | Sinon, les documents sont créés en brouillon et ne sont pas indexés tant qu'ils ne sont pas publiés. |
| Importer maintenant | Lance un import tout de suite. |

Le premier import couvre les 30 derniers jours. Les suivants repartent du précédent, avec une marge de 48 heures pour les transcriptions générées en retard. Une transcription déjà importée ne l'est jamais deux fois.

**Déconnecter** supprime les jetons et les réglages de la plateforme pour cet espace ; les documents déjà importés restent. Si l'éditeur révoque l'accès, l'écran affiche l'erreur et l'import s'arrête jusqu'à une nouvelle connexion.

## API

Routes sous `/api/v1/integrations/meetings`, `{provider}` valant `teams`, `zoom` ou `google_meet`.

| Méthode | Route | Rôle | Usage |
| --- | --- | --- | --- |
| GET | `/status` | Lecteur | Plateformes, connexions et adresse de retour |
| POST | `/providers/{provider}/auth/start` | Admin | Renvoie `auth_url`, la page de connexion de l'éditeur |
| PUT | `/providers/{provider}/settings` | Admin | `{ "knowledge_base_id", "auto_sync", "publish" }` |
| POST | `/providers/{provider}/pull` | Admin | Import immédiat |
| DELETE | `/providers/{provider}/connection` | Admin | Déconnexion |

`GET /api/v1/integrations/meetings-oauth/callback` reçoit le retour de l'éditeur ; elle est publique et protégée par un code à usage unique valable 15 minutes.
