# Meetings: Teams, Zoom, Google Meet

The Meetings connector imports the transcripts of your Microsoft Teams, Zoom and Google Meet meetings into a knowledge base. Each transcript becomes a Markdown document, paragraph by paragraph with the speaker's name, that the assistant can then cite.

Each platform is set up once on the server (an "app" registered with the vendor), then each workspace connects its own account from **Settings → Integrations → Meetings**.

## Server setup

In the server `.env`, fill in only the platforms you want, then restart the `app` service:

```bash
# Public WeKnora address: used to build the OAuth redirect URL
MEETINGS_PUBLIC_URL=https://app.example.com
# Encrypts connection tokens in the database (exactly 32 characters)
SYSTEM_AES_KEY=<32-character key>

MICROSOFT_TEAMS_CLIENT_ID=
MICROSOFT_TEAMS_CLIENT_SECRET=
# MICROSOFT_TEAMS_TENANT=organizations

ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=

GOOGLE_MEET_CLIENT_ID=
GOOGLE_MEET_CLIENT_SECRET=
```

The redirect URL to register with each vendor is shown at the bottom of the Meetings screen. It is `<MEETINGS_PUBLIC_URL>/api/v1/integrations/meetings-oauth/callback`.

### Microsoft Teams

Requires a Microsoft 365 work or school account. Microsoft does not support personal accounts for these APIs.

1. Azure portal → **Microsoft Entra ID → App registrations → New registration**. Account type: "Accounts in any organizational directory" (multi-tenant) or your directory only. Redirect URI (Web): the redirect URL above.
2. **Certificates & secrets → New client secret**: copy the value into `MICROSOFT_TEAMS_CLIENT_SECRET` and the application ID into `MICROSOFT_TEAMS_CLIENT_ID`.
3. **API permissions → Microsoft Graph → Delegated permissions**: `User.Read`, `Calendars.Read`, `OnlineMeetings.Read`, `OnlineMeetingTranscript.Read.All`, `offline_access`. Then **Grant admin consent**: `OnlineMeetingTranscript.Read.All` requires it.
4. Teams admin center → **Meetings → Meeting settings → Transcript API access**: turn it on (off by default at Microsoft). Also turn on speaker attribution to get speaker names.
5. Transcription must be allowed by the organizers' Teams meeting policy.

The connector reads the connected user's calendar, finds Teams meetings, then their transcripts. Microsoft removes access to one-off meetings 60 days after their date.

### Zoom

Requires a Zoom Pro plan or higher, with cloud recording and "Create audio transcript" turned on.

1. [Zoom App Marketplace](https://marketplace.zoom.us/) → **Develop → Build App → General App**, user-managed.
2. OAuth redirect URL and allow list: the redirect URL above.
3. Scopes: `cloud_recording:read:list_user_recordings` (or `recording:read` for a classic-scope app) and `user:read:user`.
4. Copy the Client ID and Client Secret into `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET`.

Only transcripts of completed cloud recordings are imported.

### Google Meet

Requires Google Workspace Business Standard or higher (transcripts do not exist on Business Starter or personal Gmail accounts).

1. [Google Cloud Console](https://console.cloud.google.com/) → new project → **APIs & Services → Library**: enable **Google Meet REST API**.
2. **OAuth consent screen**: scopes `openid`, `email` and `https://www.googleapis.com/auth/meetings.space.readonly`. The latter is "sensitive": for accounts outside your organization, Google requires app verification. With the "Internal" user type, no verification is needed.
3. **Credentials → Create OAuth client ID → Web application**, authorized redirect URI: the redirect URL above. Copy the ID and secret into `GOOGLE_MEET_CLIENT_ID` and `GOOGLE_MEET_CLIENT_SECRET`.

Google deletes transcripts from the API 30 days after the meeting: keep automatic import on. An app in "Testing" status gets tokens valid for 7 days only; publish it for lasting use.

## Connect an account

1. **Settings → Integrations → Meetings**, platform card → **Connect**.
2. Sign in with the vendor and accept access. You are sent back to WeKnora automatically.
3. Choose the knowledge base, then turn on automatic import if you want it.

| Setting | Effect |
| --- | --- |
| Knowledge base | Base that receives the documents. Required to import. |
| Automatic import | Checks for new transcripts every hour. |
| Publish directly | Otherwise documents are created as drafts and are not indexed until published. |
| Import now | Starts an import right away. |

The first import covers the last 30 days. Later ones start from the previous import, with a 48-hour margin for transcripts generated late. A transcript already imported is never imported twice.

**Disconnect** deletes the platform's tokens and settings for this workspace; documents already imported stay. If the vendor revokes access, the screen shows the error and imports stop until you reconnect.

## API

Routes under `/api/v1/integrations/meetings`, with `{provider}` being `teams`, `zoom` or `google_meet`.

| Method | Route | Role | Use |
| --- | --- | --- | --- |
| GET | `/status` | Viewer | Platforms, connections and redirect URL |
| POST | `/providers/{provider}/auth/start` | Admin | Returns `auth_url`, the vendor sign-in page |
| PUT | `/providers/{provider}/settings` | Admin | `{ "knowledge_base_id", "auto_sync", "publish" }` |
| POST | `/providers/{provider}/pull` | Admin | Immediate import |
| DELETE | `/providers/{provider}/connection` | Admin | Disconnect |

`GET /api/v1/integrations/meetings-oauth/callback` receives the vendor redirect; it is public and protected by a single-use code valid for 15 minutes.
