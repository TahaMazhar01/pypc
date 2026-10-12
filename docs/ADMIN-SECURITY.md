> Status update, 12 October 2026: the production admin migration was confirmed present by fresh read-only queries. The private backup report records successful provider-compatible restoration and migration on 7 October. Local SQLite was separately backed up, restore-tested and migrated on 12 October, preserving 164 records. Current local checks passed: build, types, lint, 138 security/API checks and 65 synthetic browser checks; an additional 48 viewport/page checks passed using the existing local admin. Earlier deployment blockers below are historical.

# Administration and content management

This change extends the existing Next.js/Prisma application and preserves existing records and the public site. No production migration or domain promotion has been performed. An authorized Vercel candidate build ran a read-only schema check and stopped because the admin schema is missing. A separately approved local account activation and Super Admin assignment was completed in the preserved preview database; production access was not changed.

## Install the schema before using the dashboard

1. Back up the intended database and review `prisma/migrations/20261006120000_admin_permissions/migration.sql`. It adds `Role`, `AuthSession`, `ContentDraft`, `HomepageItem`, `MediaAsset` and nullable `User.customRoleId`. Existing users, roles, events, applications and registrations are retained.
2. With explicit approval for the target environment, use the existing migration process: `npm run db:migrate` for PostgreSQL, or `npm run db:push` for a backed-up local SQLite development database. These commands were **not** run against the existing database during implementation. Do not use `db:reset`.
3. Run `npm run db:generate` with the intended `DATABASE_URL`, then build. The generated Prisma provider must match the deployment database.
4. Use a unique, randomly generated `AUTH_SECRET` of at least 32 characters and HTTPS. Set `NEXT_PUBLIC_APP_URL` to the exact canonical origin, including the development port where applicable. Mutating browser requests require a matching Origin (or Referer); payment webhook signature flows remain separate.
5. Existing active, verified administrators can sign in at `/login`, then open `/admin`. This release intentionally invalidates pre-release sessions. No default or bootstrap administrator is created. If no trusted administrator exists, a separately approved operator must establish that identity; do not enable public role assignment.

Vercel builds run `scripts/check-production-schema.cjs` before generating the client or building the app. It uses read-only Prisma schema comparison and refuses to publish when the database differs from the checked-in schema. It never executes migrations, logs connection values, or accepts synthetic SQLite preview builds. The October 7 production check found the five new admin tables and related `User` changes missing, with no destructive SQL statements in the proposed diff. Applying the reviewed migration remains a separate approval step.

## Permission model

`lib/permissions.ts` is the permission catalogue. Every protected page and API reads the current database user, account state, session version and custom role. JWT role claims, request headers and hidden UI controls are not authority. Unknown roles and malformed permission records grant no privileges.

| Role | Default access |
| --- | --- |
| Admin / existing Super Admin | All dashboard resources; account and role governance |
| Director | Draft and publish homepage, events, programmes and opportunities; upload media |
| Ambassador | Dashboard and event reading |
| Graphic designer | Homepage drafts and media uploads; no publishing |
| Developer | Dashboard only; title confers no data or configuration privileges |
| Employee | Dashboard only |
| Member | Own existing member area only |
| Existing Moderator | Editorial drafts and existing operational reviews; no publishing |
| Existing Executive | Dashboard only |

Administrators create custom roles at `/admin/roles` and assign them at `/admin/users`. Permissions are explicit resource/action strings. `users.manage`, `roles.manage` and `sessions.revoke` cannot be delegated to custom roles. Built-in defaults are immutable through the UI. Admin cannot grant or modify Super Admin. Assigned roles cannot be deleted. Role edits and user access changes invalidate affected sessions. Self-demotion is refused; serializable transactions prevent concurrent removal of the last active verified administrator. No account-delete endpoint was added.

## Editorial workflow

- `/admin/content`: the current hero pictures, featured carousel and event cards are editable defaults. Add cards or pictures, change their text, local destination, accessible image description and sort order.
- `/admin/events`, `/admin/programmes`, `/admin/opportunities`: add and edit complete records. Dates are entered in UTC. Lists accept one entry per line. Existing record IDs and dependent records are preserved.
- **Save draft** changes only the private draft table. Publishing requires a separate permission. The public site continues to show the last published version until publication. Revision checks reject stale saves and publish requests.
- **Archive / unpublish** hides content without deleting registrations/applications. **Restore public version** restores the retained version without publishing newer draft changes. Public detail metadata and application eligibility honor publication state. Next.js can stream a not-found boundary with HTTP 200; the unpublished title/body must still be absent.
- `/admin/media`: accepts JPEG/PNG/WebP only, up to 5 MiB and 25 million decoded pixels. Sharp decodes, rotates, strips metadata and re-encodes to WebP, capped at 2560 pixels per side. SVG, mismatched MIME, malformed files and oversized streams are rejected. Caller filenames never determine storage paths. Database-backed bytes work across app instances without a new external storage service.
- Media remains private until a published homepage item references it. Unpublishing removes public access; responses use `no-store`, and new media bypasses the Next.js image optimizer so private previews are not cached publicly. Used media cannot be deleted while any saved draft or published/unpublished item references it.

## Sessions, requests and audit

Signed `jose` cookies have HttpOnly, SameSite=Lax, production Secure, a fixed seven-day expiry, pinned HS256 and issuer checks, and a random server-side session ID. Each authenticated request checks that session and its expiry plus the database account status/version. Logout deletes the session, preventing copied-token replay. Password/access changes invalidate all older sessions. Login keeps bcrypt and its 72-byte limit, account lockouts and database-backed throttling; limiter failures deny attempts. Proxy IP headers are ignored unless `TRUST_PROXY_HEADERS=true` is explicitly configured behind a trusted ingress that strips attacker-supplied headers.

New role, user, draft, publish, media, request-review, certificate and manual-payment actions write audit entries in the same transaction as the mutation. Audit failure rolls back those actions. Manual settlement checks the pending state atomically to reject duplicate settlement. Entries intentionally do not extend the old custom hash-chain mechanism; the audit UI clearly distinguishes legacy chain verification. Older unrelated operations retain their existing best-effort audit mechanism. No application endpoint modifies or deletes the new audit entries. Restrict database credentials and export logs to independent retention for stronger operational assurance.

Email reporting withholds authentication subjects/codes and does not fetch message bodies. Application authorization uses resource permissions, and private resume access requires ownership or `documents.read`. Public signup rejects privilege fields. Zod validates content and unknown fields, Prisma parameterizes queries, and React renders editorial content as escaped text.

## Verification

`npm run test:security` starts a loopback-only Next.js server and uses a fresh synthetic SQLite database under ignored `reports/admin-security-*`. It does not use the configured database or send mail. It writes `reports/admin-security-result.json` only after all checks pass. Generated accounts/passwords and signing secrets are temporary test values, never default credentials.

Run `npm run typecheck`, `npm run lint`, and `npm run test:security:production`. The production command creates its own synthetic database, builds against that database, starts `next start`, verifies production Secure-cookie flags, and runs the full authorization matrix. It reuses a generated Prisma client only when its schema tokens exactly match the current SQLite test schema. This permits an independent preview to stay running on Windows without replacing its loaded Prisma DLL.

On October 7, 2026, the Next.js 15.5.27 / React 19.2.8 production build and all 138 HTTP security/CRUD checks passed. All 65 Microsoft Edge admin browser checks passed, including every admin module at 1440px, 768px and 390px, role/member editing, review archive/reopen, certificate correction, synthetic payment reconciliation, posting restore, modal keyboard focus, and no browser runtime errors. A separate 26-check authentication/About browser suite passed while preserving the approved local owner's account. Typecheck and lint passed. PostgreSQL schema validation previously passed without connecting to a database; PostgreSQL integration and production schema compatibility remain unverified. Evidence is written to ignored `reports/admin-security-result.json`, `reports/admin-workspace-browser-result.json` and `reports/auth-ui-redesign/result.json`.

The old integration suites use the configured database and legacy demo credentials; do not run those against an existing database as a substitute for this isolated suite.

## Isolated local preview

Run `npm run preview:admin`. It creates a fresh synthetic SQLite database and random temporary credentials, binds only to `127.0.0.1`, and prints its allocated URL plus a local `preview-access.json` path. Open that file locally for the synthetic login details; do not publish it or reuse the password. Paste the exact printed `http://127.0.0.1:<port>/login` into Edge or Chrome on the same PC. The canonical-origin guard requires the same hostname and port. A preview URL is not a public HTTPS deployment and will not work from another device.

The preview uses a separate `.next-admin-preview` build directory. When installed Edge or Chrome is available, its browser checks run in an isolated headless context and save desktop/mobile screenshots. `PYPC_TEST_BROWSER` can select another installed Chromium executable. To repeat the checks against an existing synthetic preview, use `node scripts/check-admin-browser.cjs reports/admin-preview-result.json`. No browser is downloaded and the user's browser profile is not read. Stop the preview runner with Ctrl+C to terminate its owned server and remove its access file. Synthetic databases and screenshots remain under ignored `reports/` for inspection; they are not production data.

## Production follow-up

The isolated preview explains its disabled outgoing email on registration and verification screens, and in resend feedback. A successfully registered local account remains `PENDING` until ownership is verified; it is not granted dashboard permissions. The email diagnostics label legacy `dev` transport records marked `SENT` as **Captured locally / Not emailed**. Production SMTP behavior is unchanged. No verification code or link was exposed, and no real SMTP configuration or external send was performed.

- The framework was upgraded to Next.js 15.5.27, the patched maintenance release identified in the [September 30, 2026 official security release](https://nextjs.org/blog/september-2026-security-release), with React 19.2.8 and compatible type, icon and animation packages. Request cookies, route parameters and search parameters now use the asynchronous APIs. Continue tracking supported framework security releases.
- Run the migration and concurrency/security tests on a disposable PostgreSQL instance before production; local integration testing uses SQLite.
- Review real role assignments, rotate any historically shared demo credentials, verify email delivery and canonical-origin/proxy settings, and require MFA for staff according to organizational policy. Existing TOTP implementation was retained, not replaced by this change.
- Add ingress request limits, malware scanning for the existing PDF/Word resume pipeline, log retention/monitoring, media storage quotas and a scheduled expiry cleanup for session/rate-limit rows. Raster processing reduces image risks but is not malware scanning.
- Review broader existing CSP/image-optimizer configuration and third-party dependency advisories. Protected dashboard responses deny framing; this change does not claim a complete security audit of payment gateways, AI or unrelated modules.

The October 7 dependency audit still reports **12 affected packages (9 high, 3 moderate)**; these are dependency-graph counts, not twelve independent reachable exploits. The compatible `source-map-js` 1.2.2 patch was applied. Remaining families require targeted follow-up:

| Family | Remaining work |
| --- | --- |
| Nodemailer 6 | Audit recommends 10.0.15, a major upgrade requiring SMTP/authentication-email regression testing. No real mail was sent in this task. |
| Next.js's pinned PostCSS | A newer PostCSS 8 release is available; replacing the framework's pinned dependency requires an explicit override and compatibility tests, or a further framework release. The remaining Next audit entry is transitive PostCSS, separate from the fixed framework advisories. |
| Tailwind 3 / ESLint glob dependencies | The published braces 3.0.3 remains affected; there is no patched 3.x release in the registry at verification time. Audit suggests major toolchain changes, including Tailwind 4, which need separate visual/build regression work. PostCSS selector parsing also remains in this build-tool chain. |

These advisories remain a launch-review item. An automatic forced audit fix was not applied because it proposes framework/toolchain major changes and even a Next ESLint downgrade.

Demo seeding now requires explicit `ALLOW_DEMO_SEED=true`, a local SQLite database, a non-production process and a caller-supplied `DEMO_SEED_PASSWORD` of at least 16 characters. Never run it against real data. The old quick-start's automatic seed step must be treated as demo-only; prefer the setup sequence above for existing installations.
