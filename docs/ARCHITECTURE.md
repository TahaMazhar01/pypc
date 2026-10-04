# Architecture — how this project is put together

> One page that explains every folder and the decision behind it. Read this before
> changing anything; `FOLDER-STRUCTURE.md` has the full tree.

## The layers

```
browser ──► Next.js App Router (server components)
                │
                ├─ app/api/**          route handlers  → validation → Prisma → SQLite/Postgres
                ├─ lib/**              the only place business rules live
                ├─ components/**       presentation (server by default, "use client" when interactive)
                ├─ prisma/schema.prisma  single source of truth for data
                └─ scripts/**          Node-only audits that prove the above works
```

Nothing in `components/` talks to the database directly, and no page contains a
business rule that is not also enforced server-side. That is why the same rules
(password policy, membership state, rate limits) can be tested from
`scripts/` without a browser.

## Why Next.js App Router

* **Server rendering by default.** Content pages are rendered on the server and
  are readable without JavaScript; interactive pieces opt in with `"use client"`.
* **One deployment unit.** Frontend, backend and the scheduled jobs are the same
  codebase, so a single `npm start` is the whole backend — no separate API host,
  no CORS, no duplicated validation.
* **Route handlers as the API.** `app/api/**/route.ts` are plain functions, which
  keeps the security rules (rate limits, CSRF/origin checks, session versioning)
  in one place: `lib/security/request.ts`.

## Data layer

* **Prisma + SQLite in development.** `prisma/dev.db` ships inside this folder
  **already seeded**, so the site is fully populated the first time it starts.
* **PostgreSQL in production.** The schema is written to be portable — change
  `provider` and `DATABASE_URL`, then `npx prisma db push`. Nothing in `lib/` or
  `app/` contains SQL.
* **Migrations:** `npm run db:push` for a fast sync, `npm run db:reset` to rebuild
  and reseed. `npm run db:seed` is idempotent (plans, programmes, events,
  opportunities, certificates, three demo accounts).

## Domain libraries (`lib/`)

| Folder | Responsibility |
| --- | --- |
| `lib/auth*` | Session cookies (HS256 JWT via `jose`), role checks, password hashing (`bcryptjs`), session versioning that invalidates old cookies on password change |
| `lib/validation/` | Shared rules used by **both** the browser and the server: password policy, email deliverability (syntax + disposable/role + MX), E.164 phone numbers per country |
| `lib/security/` | Rate limiting, origin/CSRF checks, request fingerprinting, safe error messages |
| `lib/email/` | Nodemailer transport with a development outbox so verification codes are never lost; all templates read their contact details from `lib/constants.ts` |
| `lib/payments/` | Gateway adapters: JazzCash, Easypaisa, Stripe, plus a `SIMULATED` provider that exists only in development |
| `lib/ai/` | OpenAI-backed assistant with a knowledge-base fallback, so it answers correctly even with no API key |
| `lib/health.ts` | The self-report behind `/status` and `/api/status` |
| `lib/design-tokens.ts` | Every colour in the interface, in one place, with the WCAG contrast requirements that `npm run check:contrast` enforces |
| `lib/constants.ts` | Organisation identity: name, tagline, navigation, social links, **phone, both mailboxes, office hours, address** |

## Presentation (`components/`)

| Folder | Responsibility |
| --- | --- |
| `components/layout/` | Header, footer, page hero, policy document shell |
| `components/features/` | Feature-sized pieces: forms, checkout, event explorer, AI assistant, partner wall |
| `components/experience/` | Motion and real-time layer: 3D backdrop, viewport sync, live status pill, connection banner |
| `components/features/imun/` | The seven IMUN 2027 sections (at-a-glance, flag parade, venues, culture, budget, timeline, workstreams, why-different) |
| `app/fonts/` | Self-hosted variable fonts (Inter, Playfair Display) served by `next/font/local` |
| `components/dashboard/` | The signed-in shell shared by `/dashboard` and `/admin` |
| `components/ui/` | Small primitives: button, card, field, password field, phone field, icon |

## The real-time layer

* `components/experience/viewport-sync.tsx` publishes `--vh`, a `data-viewport`
  attribute and `pypc:breakpoint` / `pypc:resize` events (one per animation frame).
  The mobile navigation and the 3D canvas listen to those events.
* `components/experience/live-status.tsx` polls `/api/status` once a minute **only
  while the tab is visible**, and shows how old the reading is, to the second.
* `components/experience/connection-status.tsx` listens for the browser's
  `online`/`offline` events and shows a single high-contrast bar, so nobody loses
  a half-filled form without warning.

## Trust boundaries

* **Sessions** are `httpOnly`, `sameSite=lax` cookies signed with `JWT_SECRET`;
  role checks always run on the server (`requireAdmin`, `requireUser`).

### Who may open the admin panel

| Role | Panel | What they may do there |
| --- | --- | --- |
| `SUPER_ADMIN` | yes | everything, including the member directory, certificates, payments and the audit log |
| `ADMIN` | yes | the member directory, certificates, payments and settlements |
| `MODERATOR` | overview only | review and moderate content, applications and requests |
| `EXECUTIVE` | overview only | review applications, requests and reports |
| `MEMBER` | no | their own dashboard only |

Inside the panel, `/admin`, `/admin/applications`, `/admin/messages`,
`/admin/visa-letters`, `/admin/programmes`, `/admin/events`, `/admin/opportunities`,
`/admin/emails` and `/admin/audit` are open to every staff role; `/admin/users`,
`/admin/certificates` and `/admin/payments` are admin-only, and staff below admin
are sent back to the overview rather than shown an error screen.

The allow-list lives once, in `ADMIN_PANEL_ROLES` (`lib/auth.ts`), and is used by
`canAccessAdminPanel()`. Three layers read it, on purpose:

1. **Edge, in `middleware.ts`** — the role is read from the *signed* session token,
   so a tampered cookie cannot forge it. An unauthorised request gets a real `307`
   to `/dashboard` and the panel is never rendered.
2. **Server, in `app/admin/layout.tsx`** — re-checks against the database, so
   account status, verification and `sessionVersion` (password change / forced
   logout) all take effect immediately.
3. **Per page, in `lib/auth.ts`** — `requireStaffPage()` and `requireAdminPage()`
   are the guards pages use. They *redirect* (to `/login`, `/dashboard` or the
   panel overview) instead of throwing, because a thrown error inside a page is
   rendered by the nearest error boundary and can still arrive as a `200`. (The
   throwing `requireAdmin()` remains for non-page callers.)
4. **Per route, in the API handlers** — each privileged action checks
   `isAdmin`/`isStaff` itself and answers a JSON `403`; the layout is never the
   only gate.

Layer 1 exists because of a subtlety worth knowing: a redirect or error thrown
inside a *layout or page* during a streamed render is delivered to the browser as a
client-side navigation, so the HTTP status can be `200` even though the redirect or
error happened. That
is harmless for real browsers (and nothing sensitive was rendered — the page body
carried no member, order or revenue data), but it is wrong for no-JavaScript
clients, crawlers and log-based auditing, and it is easy to miss in a status-coded
test. The matrix in `scripts/check-authz.mjs` therefore asserts on **rendered
content**, not only on status codes, and now records 18/18. The same fix pass
made `/admin` staff-wide and gave the admin-only pages a redirect instead of a
thrown error, so no page in the panel can render a broken screen behind a `200`.
* **Uploads** (CVs) are written to `private/uploads/` — a folder that is never
  served statically — and are downloaded only through an authenticated route that
  checks ownership.
* **Money** never depends on the browser: the membership only becomes `ACTIVE`
  after the server verifies the gateway callback or a staff member settles it.
* **Secrets** live in `.env` only. `.env.example` documents every variable, and
  `npm run check:health` fails if any credential-shaped value appears in the
  public status payload.

## Verifying any of this yourself

```bash
npm run typecheck && npm run build      # compiles and type-checks the whole app
npm run check:routes                    # 38 routes, public + protected redirects
npm run check:auth                      # registration → email verification → login
npm run check:theme                     # light/dark/system + password policy
npm run check:connectivity              # 52 end-to-end checks against the database
npm run check:contrast                  # WCAG 2.1 AA: 49 colour pairs
npm run check:responsive                # 51 responsive + real-time checks
npm run check:health                    # the /api/status report itself
npm run check:authz                     # 17 authorisation checks, three accounts
npm run scan:secrets                    # no live key anywhere in the tree
npm run db:backup && npm run db:restore-test   # backup + restore drill
npm run check:imun                      # IMUN 2027 content, live counters, honest labelling
```

`VERIFICATION.md` records the result of each of those runs.
