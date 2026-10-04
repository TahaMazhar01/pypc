# PostgreSQL migration and Vercel setup

## Current state

`prisma/schema.prisma` is the PostgreSQL source of truth. The initial migration
creates all 22 application tables. `npm run db:generate`, `db:push` and `build`
select an ignored SQLite compatibility schema only when the local DATABASE_URL
starts with `file:`. Vercel builds explicitly reject a SQLite URL.

No cloud database is created by these changes. No credentials belong in GitHub.

## Connect Prisma Postgres

In the Vercel project, open Storage / Marketplace and create or connect Prisma
Postgres. Set the custom prefix to DATABASE so the integration supplies
DATABASE_URL. Verify the variable exists in the intended deployment environment.
For Prisma 5.22, use the standard PostgreSQL TCP connection URL supplied by the
provider (postgresql://...), not a URL requiring a newer Prisma driver.
Use a direct, non-transaction-pooled connection for migration/import commands.
Do not share production data with untrusted preview deployments.

## Create tables, then transfer data

1. Stop writes to the SQLite site during the final export and cutover.
2. Run `npm run db:backup -- --label before-postgresql` while the locally generated
   client still uses SQLite. Keep this private backup outside Git.
3. Put the destination direct URL in local `.env` as POSTGRES_DATABASE_URL.
4. In a private terminal session set DATABASE_URL to that destination and run
   `npm run db:migrate`. This creates tables, not demo users or data. Do not use
   `db:reset` or `db:seed` on the production destination.
5. Run `npm run db:import:sqlite -- backups/<folder>/database.json` locally.
   The importer verifies the checksum, locks and checks that all destination
   tables are empty, imports in dependency order in a single transaction and
   checks row counts. It preserves IDs, password hashes, timestamps and audit
   hashes. A failure rolls the data import back. The source is not modified.
6. Change local DATABASE_URL to the hosted URL, run `npm run db:generate`, rebuild
   and restart the app. Verify login, certificate lookup, registration and audit
   chain integrity. Preserve the existing AUDIT_CHAIN_SECRET (or its original
   AUTH_SECRET fallback) to keep historical audit entries verifiable.
7. Take a PostgreSQL backup and retain the SQLite backup through verification.

The provided seed creates demonstration accounts and is for local/CI use only.

## Deployment

Apply `npm run db:migrate` once against the deployment database before releasing
the app. Use `npm run build` as the Vercel build command. Do not seed or import
private SQLite data during cloud builds. Runtime Prisma uses DATABASE_URL.

Database migration alone does not finish Vercel readiness: resume uploads and
other private writable files still use local filesystem paths. They must move
to authenticated private object storage before those features are enabled on
Vercel. Also configure production mail, auth secrets and disable test modes.

## Backups

The existing db:backup / db:restore-test commands are SQLite-only and refuse
PostgreSQL URLs. Use your provider's backups and PostgreSQL pg_dump/pg_restore
for the hosted database. Run pg_dump with a private service/password file or
private environment configuration, store encrypted backups outside Git, and
restore into a separate scratch database to verify. Never restore over live data
as a test.

## Validation

CI retains the local SQLite runtime suite and adds a separate PostgreSQL 16 job
that deploys the migration twice (idempotency), seeds a disposable database and
builds the application against PostgreSQL. No hosted verification is claimed
until that database is actually connected.
