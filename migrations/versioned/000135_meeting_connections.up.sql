-- Teams / Zoom / Google Meet transcript connector: one connection per
-- (tenant, platform) holding the OAuth app entered in the UI (client secret and
-- tokens encrypted at rest when SYSTEM_AES_KEY is set), and the transcripts
-- already imported so periodic imports never create duplicates.
DO $$ BEGIN RAISE NOTICE '[Migration 000135] Creating meeting_connections / meeting_imports...'; END $$;

CREATE TABLE IF NOT EXISTS meeting_connections (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    provider VARCHAR(32) NOT NULL,
    client_id VARCHAR(512),
    client_secret TEXT,
    app_tenant VARCHAR(128),
    account_id VARCHAR(256),
    account_label VARCHAR(256),
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMP,
    oauth_state VARCHAR(128),
    oauth_state_expires_at TIMESTAMP,
    knowledge_base_id VARCHAR(36),
    auto_sync BOOLEAN NOT NULL DEFAULT FALSE,
    publish BOOLEAN NOT NULL DEFAULT FALSE,
    last_synced_at TIMESTAMP,
    last_sync_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_connections_tenant_provider
    ON meeting_connections(tenant_id, provider);
CREATE INDEX IF NOT EXISTS idx_meeting_connections_oauth_state
    ON meeting_connections(oauth_state);

CREATE TABLE IF NOT EXISTS meeting_imports (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    provider VARCHAR(32) NOT NULL,
    external_id VARCHAR(512) NOT NULL,
    meeting_id VARCHAR(512),
    knowledge_base_id VARCHAR(36) NOT NULL,
    knowledge_id VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_imports_tenant_external
    ON meeting_imports(tenant_id, provider, external_id);
