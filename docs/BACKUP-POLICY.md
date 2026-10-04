# PYPC Backup & Restore Policy

> **A backup is not considered valid until a restore test passes against it.**

## 1. What is backed up, how often, and for how long

| Type | Frequency | Retention | Location | Protection | Owner |
| --- | --- | --- | --- | --- | --- |
| Database (automated) | Daily | 30 days | Primary host **and** a second region | Encrypted at rest (AES-256) | Head of Technology |
| Database (pre-release) | Before every release | Until the release is stable | Object storage + local | Encrypted at rest | Lead Developer |
| Database (manual export) | Weekly | 12 months | Secure offline copy + cloud | Encrypted archive (GPG/age) | Head of Technology |
| Portable JSON export | With every backup | 30 days | Same as the backup it accompanies | Encrypted at rest | Lead Developer |
| Certificates & uploaded documents | Daily | 90 days | Object storage, versioned | Encrypted at rest | Lead Developer |
| Audit log export | Monthly | 1 year | Encrypted archive | GPG/age | Compliance Lead |
| Application source | Every commit | Indefinite | Version control | Provider-managed | Lead Developer |

The database is the only irreplaceable asset; everything else can be rebuilt from
source, which is why the database has four independent schedules.

## 2. How to take a backup with this codebase

```bash
npm run db:backup                        # backups/<timestamp>/
npm run db:backup -- --label pre-launch   # backups/<timestamp>-pre-launch/
```

Each run writes:

| File | Purpose |
| --- | --- |
| `database.sqlite` | Byte-exact copy of the live database at that instant |
| `database.json` | Portable export of every table — survives an engine change (this project moves to Postgres for production) and can be diffed in review |
| `manifest.json` | What was taken, when, from which database, and the row counts |
| `SHA256SUMS` | Checksums, so a restore can prove the files are intact |

`backups/` travels in the package **empty**, with a `README.md` explaining the four
artefacts and how to verify them — your backups are yours, not something handed to
you second-hand. The contents are excluded by `build-zip.sh` (`--exclude=./backups/*`)
and are listed in `.gitignore`, so a backup can never be committed or distributed by
accident. `reports/` works the same way: it ships empty, and fills with the output of
your own verification runs.

**Production (PostgreSQL):** the same schedule applies, taken with
`pg_dump --format=custom --compress=9`, plus a weekly `pg_dump --format=plain` for
readability. The JSON export step stays the same — it is engine-independent.

## 3. Restore procedure (nine steps)

1. Identify the incident and freeze admin actions if integrity is in doubt.
2. Record what happened, when, and the last known-good point in time.
3. Select the newest backup whose manifest and checksums verify.
4. **Restore to a staging database first — never production first.**
5. Validate: users, memberships, orders, certificates (including verification codes),
   contact messages and audit rows.
6. Obtain approval from the Director / Head of Technology, recorded in the incident log.
7. Restore production.
8. Verify end to end: sign-in, a test payment, certificate verification, the admin
   console, and `/api/status`.
9. Record the outcome in the incident log, including how long recovery took.

## 4. Restore drill with this codebase

```bash
npm run db:restore-test                                   # newest backup in ./backups
npm run db:restore-test -- backups/<stamp>/database.sqlite
# 8 steps: checksums → integrity check → tables → seeded content → certificate
# codes → audit chain verifies (read-only) → JSON export matches → report line
```

The drill restores into a **scratch file** (the live database is never touched) and
then proves the restore is usable:

* verifies the checksums recorded at backup time
* runs `PRAGMA integrity_check`
* confirms every required table exists
* confirms the seeded content survived (plans, programmes, events, opportunities, users)
* confirms certificates still carry their verification codes, so `/verify/<code>` keeps working
* compares the JSON export against the binary copy, row for row
* appends the result to `reports/restore-tests.log`

**When to run it:** once before launch, every quarter afterwards, before any schema
migration, and after any incident that touched the database.

## 5. Verification already performed

| Drill | Result |
| --- | --- |
| Backup produced from the working database | `backups/<stamp>/` with all four artefacts |
| Restore into a scratch database | passes; live database untouched |
| Checksums | match |
| Seeded content after restore | present (users, plans, programmes, events, opportunities, certificates) |
| Certificate verification codes intact | yes |
| JSON export vs binary copy | identical row counts |
| Disaster recovery from the package | `prisma/dev.db` deleted → `db push` + `db:seed` → database rebuilt and populated |

## 6. Responsibilities

| Role | Responsibility |
| --- | --- |
| Lead Developer | Runs the automated backup, confirms it succeeded, fixes failures the same day |
| Head of Technology | Owns the schedule, the retention rules and the quarterly restore drill |
| Compliance Lead | Owns the audit-log export and the data retention / deletion policy alignment |
| Director | Approves any production restore |
