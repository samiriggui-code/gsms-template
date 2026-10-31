# Meetings: Teams, Zoom, Google Meet

The Meetings connector imports the transcripts of your Microsoft Teams, Zoom and Google Meet meetings into a knowledge base. Each transcript becomes a Markdown document, paragraph by paragraph with the speaker's name, that the assistant can then cite.

Each platform is set up once on the server (an "app" registered with the vendor), then each workspace connects its own account from **Settings → Integrations → Meetings**.

## Add a connection

Everything happens in **Settings → Integrations → Meetings → Add a connection**, for workspace admins. A four-step drawer opens:

1. **Platform**: Teams, Zoom or Google Meet.
2. **Application**: the vendor requires an "app" to be registered once (procedures below, also shown in the drawer). Copy the displayed redirect URL into that app, then paste its client ID and secret here.
3. **Account**: **Sign in with…** opens the vendor sign-in window; sign in and accept access. The window closes by itself and WeKnora shows the connected account.
4. **Import**: knowledge base, automatic import, direct publishing.

The secret and tokens are encrypted in the database when `SYSTEM_AES_KEY` (32 characters) is set on the server. Clicking a connection reopens the drawer to edit it; the bin deletes it, documents already imported stay.

Optional on the server: `MEETINGS_PUBLIC_URL` sets the public address used for the redirect URL (otherwise the browser's). A server-wide app shared by all workspaces can also come from environment variables (`MICROSOFT_TEAMS_CLIENT_ID` / `_SECRET` / `_TENANT`, `ZOOM_CLIENT_ID` / `_SECRET`, `GOOGLE_MEET_CLIENT_ID` / `_SECRET`); the one entered in the UI wins.

The redirect URL is `<WeKnora address>/api/v1/integrations/meetings-oauth/callback`.

## Register the app with the vendor

### Microsoft Teams

Requires a Microsoft 365 work or school account. Microsoft does not support personal accounts for these APIs.

1. Azure portal → **Microsoft Entra ID → App registrations → New registration**. Account type: "Accounts in any organizational directory" (multi-tenant) or your directory only. Redirect URI (Web): the redirect URL above.
2. **Certificates & secrets → New client secret**: copy its value and the "Application (client) ID", to paste in step 2 of the drawer.
3. **API permissions → Microsoft Graph → Delegated permissions**: `User.Read`, `Calendars.Read`, `OnlineMeetings.Read`, `OnlineMeetingTranscript.Read.All`, `offline_access`. Then **Grant admin consent**: `OnlineMeetingTranscript.Read.All` requires it.
4. Teams admin center → **Meetings → Meeting settings → Transcript API access**: turn it on (off by default at Microsoft). Also turn on speaker attribution to get speaker names.
5. Transcription must be allowed by the organizers' Teams meeting policy.

The connector reads the connected user's calendar, finds Teams meetings, then their transcripts. Microsoft removes access to one-off meetings 60 days after their date.

### Zoom

Requires a Zoom Pro plan or higher, with cloud recording and "Create audio transcript" turned on.

1. [Zoom App Marketplace](https://marketplace.zoom.us/) → **Develop → Build App → General App**, user-managed.
2. OAuth redirect URL and allow list: the redirect URL above.
3. Scopes: `cloud_recording:read:list_user_recordings` (or `recording:read` for a classic-scope app) and `user:read:user`.
4. Copy the Client ID and Client Secret, to paste in step 2 of the drawer.

Only transcripts of completed cloud recordings are imported.

### Google Meet

Requires Google Workspace Business Standard or higher (transcripts do not exist on Business Starter or personal Gmail accounts).

1. [Google Cloud Console](https://console.cloud.google.com/) → new project → **APIs & Services → Library**: enable **Google Meet REST API**.
2. **OAuth consent screen**: scopes `openid`, `email` and `https://www.googleapis.com/auth/meetings.space.readonly`. The latter is "sensitive": for accounts outside your organization, Google requires app verification. With the "Internal" user type, no verification is needed.
3. **Credentials → Create OAuth client ID → Web application**, authorized redirect URI: the redirect URL above. Copy the ID and secret, to paste in step 2 of the drawer.

Google deletes transcripts from the API 30 days after the meeting: keep automatic import on. An app in "Testing" status gets tokens valid for 7 days only; publish it for lasting use.

## Import settings

| Setting | Effect |
| --- | --- |
| Knowledge base | Base that receives the documents. Required to import. |
| Automatic import | Checks for new transcripts every hour. |
| Publish directly | Otherwise documents are created as drafts and are not indexed until published. |
| Import now | Starts an import right away. |

The first import covers the last 30 days. Later ones start from the previous import, with a 48-hour margin for transcripts generated late. A transcript already imported is never imported twice.

Deleting a connection erases the platform's app, tokens and settings for this workspace; documents already imported stay. If the vendor revokes access, the screen shows the error and imports stop until you reconnect.

## API

Routes under `/api/v1/integrations/meetings`, with `{provider}` being `teams`, `zoom` or `google_meet`.

| Method | Route | Role | Use |
| --- | --- | --- | --- |
| GET | `/status` | Viewer | Platforms, connections and redirect URL |
| PUT | `/providers/{provider}/app` | Admin | `{ "client_id", "client_secret", "app_tenant" }` (empty secret: kept) |
| POST | `/providers/{provider}/auth/start` | Admin | Returns `auth_url`, the vendor sign-in page |
| PUT | `/providers/{provider}/settings` | Admin | `{ "knowledge_base_id", "auto_sync", "publish" }` |
| POST | `/providers/{provider}/pull` | Admin | Immediate import |
| DELETE | `/providers/{provider}/connection` | Admin | Delete the connection |

`GET /api/v1/integrations/meetings-oauth/callback` receives the vendor redirect; it is public and protected by a single-use code valid for 15 minutes.
