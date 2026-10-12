> Status update, 12 October 2026: the production admin migration was confirmed present by fresh read-only queries. The private backup report records successful provider-compatible restoration and migration on 7 October. Local SQLite was separately backed up, restore-tested and migrated on 12 October, preserving 164 records. Current local checks passed: build, types, lint, 138 security/API checks and 65 synthetic browser checks; an additional 48 viewport/page checks passed using the existing local admin. Earlier deployment blockers below are historical.

# Admin completion scope

The October 7 review found missing restore controls for unpublished content, no media-description editing, no member-profile editor, read-only contact-message status, incomplete review archive controls, and cramped multi-column admin layouts. Custom roles already had create/update/delete endpoints. Job and internship positions use the existing Opportunity model; organisational structure remains existing public site copy.

Implemented controls:

- Homepage cards/pictures, events, programmes, opportunity postings: create, list/search, draft/edit, publish, reversible archive/unpublish, restore the retained public version, and discard unneeded drafts.
- Custom roles: create, inspect, edit granular permissions, delete unassigned roles with confirmation; built-in roles and assigned-role dependencies remain protected.
- Members: inspect/search, edit non-credential profile fields, change access, suspend/reactivate, revoke sessions. Registration remains the supported account-creation flow; passwords, verified email identities, and linked records are not overwritten by admin profile edits. Retain the last active administrator and super-administrator.
- Media: upload, preview, edit descriptions, delete unused assets with confirmation. Referenced media remains protected.
- Applications, partnerships and visa requests: review status/notes, archive and reopen while retaining submitted data. Creation stays with the authenticated/public submission flows.
- Certificates: issue, read, correct display fields, revoke/reinstate; retain verification history.
- Contact messages: read, progress/resolve, archive/reopen.
- Payments: use the existing reconciliation workflow; preserve financial history. Audit and sent-email histories remain read-only evidence.
- Shared admin shell, record layouts and native accessible dialogs: desktop, tablet, 390px mobile, long data, error/empty states, scrolling and focus checks.

No destructive operations on existing real records are part of verification. Browser/API mutation checks use synthetic fixtures. The running preview database and the owner's activated account are preserved.

The user subsequently requested a public Vercel deployment. Deployment inspection follows verification; synthetic databases, fixtures and credentials must not be deployed. Persistent production migrations, privileged access expansion and paid services remain separately gated.

The linked Vercel project is `pypc.demo`; CLI authentication and production environment variable names were verified. The existing production database's required schema remains unverified. Automatic approval rejected pulling all production environment values into a local file because that would retrieve hidden secrets. No production secret values were retrieved and no production migration or deployment ran. The next deployment prerequisite is a narrowly scoped, private, read-only schema check using only the existing database connection, or an operator's confirmation of the migration state. Any required production migration needs separate approval.

Final verification: production build, typecheck and lint passed; 138 security/API checks, 65 admin browser checks and 26 authentication/About browser checks passed. Browser verification used Microsoft Edge 154.0.4258.62 in a fresh headless context with synthetic data. No outstanding local test failure remains.

Production follow-up: after explicit approval of the read-only database check, the single-variable API confirmed that `DATABASE_URL` is a write-only Vercel secret. No connection value was obtained locally. A guarded production candidate (`dpl_5cziUux2DdrUYVQAdgxHBL7vsdU3`) therefore ran the read-only schema diff inside Vercel with automatic domain promotion disabled. That check succeeded and found `Role`, `AuthSession`, `ContentDraft`, `HomepageItem`, `MediaAsset` and related `User` changes missing; the proposed diff had zero destructive statements. The build stopped as designed before publication. The existing domain `https://pypcdemo-one.vercel.app` returned 404 at `/` and 500 at `/login` and `/admin` when checked signed out; the prior Ready deployment URL redirects to Vercel SSO. No working public link for the new version is available yet. The next required decision is approval for the reviewed additive migration after backup verification.

The owner subsequently approved that backup-first migration. Fresh custom-format PostgreSQL archives were stored in the existing private Blob store, anonymous access was rejected, and authenticated downloads matched their SHA-256 checksums. Full scratch restoration is blocked because the archive requires the Prisma-specific `prisma_postgres` extension, which is unavailable in standard PostgreSQL 17.8 even with its contrib package. The guard stopped every attempt before production migration. No archive was deleted, no production database changes occurred, and no domain was promoted. `reports/production-backup-verification.json` records the latest private backup's path/checksum and the required Prisma-compatible isolated recovery target. Do not weaken the restore requirement or restore into the live database.
