# FAQ, troubleshooting, and upgrades

Start under **Settings → System information**: application version, database migration status, and dependency connectivity, then check logs for the relevant service. Run Compose commands from the repository root; for local development dependencies use `docker compose -f docker-compose.dev.yml`—app logs are on the host terminal or log file; dev Compose has no `app` service.

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose logs --tail=200 docreader
docker compose logs --tail=200 postgres redis
```

After changing `.env`, recreate containers with `docker compose up -d <service>`; `docker compose restart` does not reload container environment variables.

## By symptom

| Symptom | Check order |
| --- | --- |
| Upload fails, parsing stuck in progress | Failure reason and parse trace on document detail → parser connectivity → background queue; see [Document parsing](../03-features/03-document-parsing.md) and [Async tasks](../02-architecture/05-async-tasks.md) |
| Images work locally, not on other devices | Whether URLs contain `localhost`, container service names, or unreachable object storage; third-party clients getting `resource://` must follow [File access](../03-features/21-file-access.md), not use it as a direct image URL |
| Saved config reverts | Proxy/browser cache, wrong environment or workspace switch; built-in models also check YAML sync at startup; see [Model management](../03-features/06-models.md) |
| Insufficient permissions after upgrade | Workspace role, resource ownership, API key capabilities; see [Auth and authorization](../03-features/01-tenant-auth.md). Platform admin ≠ workspace Owner |
| Agent says model not ready | Referenced model exists and is complete; run connectivity test; see [Model management](../03-features/06-models.md) |
| Private data source, model, or vector DB connection refused | SSRF checks and port policy; allow only needed targets per [Configuration](04-configuration.md) |
| Error “only whitelist outbound allowed” | `SSRF_DNS_WHITELIST_ONLY` enabled: hosts not on the list are rejected before DNS. Add targets to `SSRF_WHITELIST` or `SSRF_WHITELIST_EXTRA`, rebuild app / docreader; see [Configuration](04-configuration.md) |
| Login returns HTML 404 | `SEARXNG_PORT` same as `APP_PORT` (default 8080). On Linux, SearXNG on `127.0.0.1:8080` intercepts `localhost:8080`. Keep SearXNG on 8888 or another free port |
| MinIO pull `pull access denied` or `401 UNAUTHORIZED` | MinIO closed anonymous pulls on Docker Hub and quay.io. Current Compose and Helm use community `pgsty/minio`; update custom compose files |
| After upgrade: embed or signed links invalid (`embed session signing key is not configured`, log `[startup-env] no usable signing key`) | Signing key is `SYSTEM_SIGNING_KEY`, else falls back to `SYSTEM_AES_KEY`; example keys and length &lt; 16 cannot sign. Generate with `openssl rand -hex 32` and set `SYSTEM_SIGNING_KEY` **without changing `SYSTEM_AES_KEY`** or stored secrets cannot decrypt. v0.8.2 changed embed session signing—old embed sessions invalid, visitors must re-enter; multi-replica needs the same key |
| After upgrade: DingTalk bot silent | Since v0.8.2 DingTalk is Stream-only; migration changes `webhook` → `websocket`. Enable Stream in DingTalk developer console; see [IM integration](../03-features/12-im-integration.md) |
| Background queue backlog | Oldest task age, active workers, downstream quotas; more workers ≠ more vendor quota; see [Capacity planning](../02-architecture/05-async-tasks.md#capacity-planning) |
| Skill in catalog but not runnable | Catalog ≠ sandbox install; check install record, agent sandbox choice, skill scope; see [Skills and sandbox](../03-features/22-skills-sandbox.md) |
| Local sandbox missing after upgrade | `local` backend removed; reconfigure Docker, CubeSandbox, or E2B; see [Sandbox deployment](../06-development/04-sandbox-deployment.md) |
| Local browser paired but no web tasks | Enable local browser on smart-reasoning input; resume paused tasks explicitly; see [Local browser](../05-clients/09-local-browser.md) |
| Embed page fails or 403 | Whitelist actual host Origin; CSP, reverse proxy, secure-mode exchange Origin; see [Embed channel](../03-features/13-embed-channel.md) |
| Feishu app test OK but folders empty | Test validates app identity only—folders need authorization; see [Feishu Drive](../03-features/24-feishu-drive.md) |

## Database migration failures {#database-migration-failures}

The app runs migrations on startup by default. Failure may still allow startup, so a working UI does not guarantee an up-to-date schema. Migration version, dirty flag, and errors in system information plus app startup logs are the entry point.

**Do not assume a failed migration fully rolled back.** State depends on SQL transaction boundaries and where it failed. Before recovery: keep logs, backup the database, compare the failed migration file to the actual schema; do not skip errors by deleting volumes or editing version numbers.

PostgreSQL uses `migrations/versioned/`, SQLite uses `migrations/sqlite/`. Make commands below target PostgreSQL; for Lite SQLite use the matching driver and migration directory, not a PostgreSQL DSN.

```bash
make migrate-version
```

Read-only checks on the target database:

```sql
SELECT version, dirty FROM schema_migrations;
-- PostgreSQL only:
SELECT version();
SELECT extname, extversion FROM pg_extension;
```

### Missing extensions or insufficient permissions

Missing `gin_trgm_ops` often means `pg_trgm`; missing `vector` type means pgvector; BM25 needs ParadeDB `pg_search`. Confirm which database the app uses; a DBA checks packages, extensions in the database, and object ownership.

```sql
SELECT name, default_version, installed_version
FROM pg_available_extensions
WHERE name IN ('pg_trgm', 'vector', 'pg_search');
```

Missing OS packages vs SQL permissions are different; `CREATE EXTENSION IF NOT EXISTS` does not install OS packages or upgrade existing extensions. Install only what the deployment needs; do not force PostgreSQL retrieval if you use an external engine.

ParadeDB image and extension upgrades on existing databases: [ParadeDB upgrade](06-paradedb-upgrade.md).

### Dirty state

`AUTO_RECOVER_DIRTY` (default on) tries to reset migration version and re-run at startup. That is retry, not a fix for missing extensions, disk full, or hand-edited schema.

For manual recovery: stop writes, check whether the failed migration left partial changes. Use `force` only when the database matches the last good version and re-running the migration is safe. **`force` only changes the version marker, not rollback SQL.** Example if last confirmed version is 98:

```bash
make migrate-force version=98
make migrate-up
```

Replace 98 with your confirmed version, not “error number minus one”. Initial migration failure: also check init state. Restart app, confirm no error in system information, and test affected features.

### Interrupted concurrent index

Migration `000106` builds an index on `messages` with `CREATE INDEX CONCURRENTLY` (non-blocking writes). Interruption (restart, timeout, disk full) can leave `idx_messages_session_created_id` INVALID; `IF NOT EXISTS` will not rebuild it. Confirm and drop the invalid index, restore migration state, re-run:

```sql
SELECT indexrelid::regclass, indisvalid FROM pg_index
WHERE indexrelid = 'idx_messages_session_created_id'::regclass;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_session_created_id;
```

### Disk space and schema mismatch

Index builds need temporary space. On `No space left on device`, check database volume and temp directories, free space, then recover per actual migration state.

If columns, indexes, or constraints do not match migration expectations, compare to the failed file and last good version; do not repeatedly run failing SQL in production. To reproduce writes, test on an isolated database restored from backup first.

## What to include when reporting issues

Application version/commit, failure time, full error, database type and version, migration version/dirty state, and relevant non-default configuration. Redact tokens, passwords, connection strings, and document content from logs. Migration implementation and development: [Database and migrations](../06-development/02-database-schema.md).
