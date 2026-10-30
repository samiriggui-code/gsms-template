# ParadeDB upgrade for existing databases

Production and development Compose in this repository use `paradedb/paradedb:v0.25.11-pg17`. This document covers **0.22.x → 0.25.11 with PostgreSQL major version staying at 17**; it is not a PostgreSQL major-version upgrade, and other old Helm versions are not covered as-is.

Compared to `v0.22.6-pg17`, this line brings PostgreSQL 17.9 → 17.11, pgvector 0.8.1 → 0.8.4 (fixes parallel HNSW build buffer overflow and HNSW vacuum index corruption), and WAL-based crash recovery for pg_search (from 0.24.0, see paradedb#4901).

> [!WARNING]
> After replacing the image you **must** upgrade the extension catalog to match the image. If the catalog stays on an old version, some extension SQL functions (e.g. `paradedb.version_info()`) can segfault due to signature mismatch with the new binary, crashing the PostgreSQL instance and entering recovery. Also **do not** run `ALTER EXTENSION pg_search UPDATE TO '0.22.6'` on the new image—that causes the same mismatch.

## Upgrade steps

Run all commands from the repository root. For development, database commands use `docker compose -f docker-compose.dev.yml`; stop the dev backend on the host manually—dev Compose has no `app` service. Keep the data volume: **do not run `down -v`**, delete the volume, or switch to a PG18 image.

1. Stop app and any other writers to the database; if Langfuse is enabled, stop web/worker; stop a local dev backend if running.

   ```bash
   # Standard deploy; in dev, stop backend on host
   docker compose stop app
   # Only if Langfuse is enabled
   docker compose stop langfuse-web langfuse-worker
   ```

2. Back up all databases and roles, including Langfuse, and verify restore. Store backups outside the database data volume.

   ```bash
   umask 077
   docker compose exec -T postgres sh -c 'pg_dumpall -U "$POSTGRES_USER"' > paradedb-before-upgrade.sql
   ```

   If the old image cannot start on the current CPU, snapshot the stopped data volume first, produce a logical backup on a compatible machine or validate snapshot restore, then change the only copy of the data.

3. With updated Compose, replace only the database container:

   ```bash
   docker compose pull postgres
   docker compose up -d --no-deps --wait postgres
   ```

4. Complete SQL extension upgrade. Replacing the image alone does not update `pg_extension` in existing databases. The new image includes the full upgrade script chain from 0.22.x; any 0.22.x can step up to the image default in one go:

   ```bash
   docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' <<'SQL'
   ALTER EXTENSION pg_search UPDATE;
   ALTER EXTENSION vector UPDATE;
   SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_search', 'vector');
   SELECT * FROM paradedb.version_info();
   SQL
   ```

   Run the same in **any other database** where `pg_search` or `vector` is installed, including `postgres`, template databases, or Langfuse. Do not install extensions on databases that do not need them. `pg_search` catalog and `paradedb.version_info()` should report 0.25.11; `vector` should be 0.8.4.

5. Restart writers, confirm WeKnora migration status, run representative keyword and vector search. Existing BM25 and HNSW indexes remain readable/writable on the new version without full re-import; use `REINDEX` if needed. Keep backups until validation finishes.

## Scope of automatic migrations

WeKnora startup migrations upgrade extensions only in the WeKnora database, respect `app.skip_embedding`, do not install missing extensions, do not downgrade, and do not handle other version lines:

- `000115`: installed `pg_search` 0.22.0–0.25.10 and server offers 0.25.11 → upgrade to 0.25.11; installed `vector` 0.8.0–0.8.3 and server offers 0.8.4 → upgrade to 0.8.4.
- `000099`: historical; only when the server provides extension package 0.22.6 (still on `v0.22.6-pg17` image) to move 0.22.2–0.22.5 → 0.22.6; skipped on the new image, handled by `000115`.

If these migrations ran **before** replacing the database image, they will not run again automatically after the new image—you must run the SQL above. Older app versions without matching migrations need manual upgrade too. Extensions in other databases are not managed by WeKnora migrations.

## Rollback and isolated validation

Rollback means restoring the pre-upgrade backup/snapshot to an isolated volume with the old image. Reverting only the image tag does not undo extension SQL changes; from pg_search 0.24, custom WAL resource manager records prevent replay on the old image. Migration down files do not downgrade extensions.

The repository provides an isolated validation script (default 0.22.2 → 0.25.11, or `--to 0.22.6` for historical patch upgrade):

```bash
docker pull paradedb/paradedb:v0.22.2-pg17
docker pull paradedb/paradedb:v0.25.11-pg17
python3 scripts/test_paradedb_upgrade.py
```

The script uses temporary containers and volumes without mapped ports; it validates same-volume upgrade, table content, keyword/vector search, migration idempotency, and post-restart results, with backup and logs. Fixed test data only—in production, validate your data and search load too.
