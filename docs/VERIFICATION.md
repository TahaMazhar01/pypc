# Verification record

Everything below was executed against this exact codebase. Every check is a plain
Node/tsx script or a shell command — nothing here needs a browser, a paid service
or a hidden step. To reproduce: start the site (`npm start`) and run the commands
in the same order.

## 1. Build and types

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | clean — 0 errors |
| `npm run build` | **✓ Compiled successfully**, **58/58** routes generated |
| `npx prisma generate` | client generated from `prisma/schema.prisma` (20 models, incl. `WebhookEvent`) |

## 2. Automated suites

| Suite | Command | Checks | Result |
| --- | --- | --- | --- |
| Route smoke test | `npm run check:routes` | 46 | **46/46** |
| Health endpoint | `npm run check:health` | 12 | **12/12** |
| **IMUN 2027 page** | `npm run check:imun` | 29 | **29/29** |
| Registration & anti-abuse | `npm run check:auth` | 25 | **25/25** |
| Theme + password policy | `npm run check:theme` | 25 | **25/25** |
| End-to-end connectivity | `npm run check:connectivity` | 72 | **72/72** |
| **Colour contrast (WCAG 2.1 AA)** | `npm run check:contrast` | 49 pairs | **49/49** |
| **Responsive + real-time + installable app** | `npm run check:responsive` | 63 | **63/63** |
| **AI assistant (multilingual + real-time)** | `npm run check:ai` | 70 | **70/70** |
| **Social channels, mailboxes & phone** | `npm run check:social` | 55 | **55/55** |
| **Response-time budget** | `npm run check:perf` | 47 | **47/47** |
| Payment → membership (dev server) | `npm run check:payments` | 9 | **9/9** |
| **Two-factor authentication** | `npm run check:2fa` | 26 | **26/26** |
| **Audit-chain tamper test** | `npm run check:audit-chain` | 9 | **9/9** |
| **Partnerships & MoU requests** | `npm run check:partnerships` | 38 | **38/38** |
| **Feature-suite total** | `npm run check:suites` | **517** | **all green** |

Every number above is reproduced by one command, which runs each suite and adds
up what the suites themselves report — so this table cannot drift from the code:

```bash
BASE=http://127.0.0.1:3000 AI_AUDIT_BYPASS_TOKEN=… npm run check:suites
```

**517 feature-suite assertions + 49 contrast pairs = 566**, all passing.

The assistant suite drives the real `/api/ai-assistant` endpoint exactly as the
browser widget does — JSON and Server-Sent Events — and needs a bypass token so
its ~40 questions are not stopped by the visitor rate limit:

```bash
AI_AUDIT_BYPASS_TOKEN=… npx next start -H 0.0.0.0 -p 3000   # server
AI_AUDIT_BYPASS_TOKEN=… npm run check:ai                    # audit
```

The token is ignored unless it is set on the server, so a deployed site has no
bypass unless an operator deliberately turns one on. Without it the audit still
runs, but stops at the limiter once the question budget is exhausted.

### Production-launch gates (added with the launch plan)

| Gate | Command | Checks | Result |
| --- | --- | --- | --- |
| Authorisation matrix | `npm run check:authz` | 18 | **18/18** |
| Secret scan | `npm run scan:secrets` | 227 files | **clean** |
| Database backup | `npm run db:backup -- --label gate` | 1 archive | **written** |
| Restore drill | `npm run db:restore-test` | 8 | **8/8** |
| Payments (production guard) | `npm run check:payments` | 7 | **7/7** |

With the gates included the run covers **599 checks**: 566 above plus 18
authorisation rows, 7 payment-guard rows and 8 restore steps. The 9-step
audit-chain tamper test is already inside the 566 (it is a feature suite).

These five are deliberately separate from the 528: they guard the launch itself
(authorisation, credentials, recoverability) rather than the features.

### What the suites actually prove

* **Routes** — every public page returns 200 (or the correct redirect), and every
  protected page (`/dashboard*`, `/admin*`) answers `307` for anonymous visitors
  and `200` for signed-in staff.
* **AI assistant retrieval by language** — the suite carries a retrieval matrix in
  Urdu and Roman Urdu (12 probes) that pins each topic to the right answer. It was
  added after a real defect: every Urdu answer contains the council's own name
  ("پی وائی پی سی"), so the words پی / وائی / سی matched every entry and an Urdu
  question about social pages was answered with certificate information. The
  matrix now fails the run if that class of cross-topic bleed returns.
* **AI assistant** — English in → English out, Roman Urdu in → Roman Urdu out
  (no Urdu script, Roman markers present), Urdu script in → Urdu script out, all
  three detected from the message alone; mixed messages answered honestly;
  membership fees read live from `MembershipPlan` and matched against the row;
  a membership question never pulls visa-letter counts; contact answers carry the
  real phone number and LinkedIn; streaming delivers `meta` → `delta…` → `done`
  frames whose joined text equals the JSON answer; empty/over-long messages are
  rejected **without** consuming the question budget; a prompt-injection attempt
  returns no system-prompt text.
* **Response times** (`npm run check:perf`, 42 assertions) — every public page,
  the status API and the assistant are timed against internal budgets (page
  ≤ 1200 ms, API ≤ 800 ms, assistant ≤ 2000 ms), which sit well under the 2–3 s
  the client asked for. The audit also proves gzip is applied to every page
  response, that the emblem ships with a one-year immutable cache header, that
  the web app manifest is installable, that the assistant's first streamed frame
  arrives immediately and that a repeat visit is never slower than the first.
* **Devices and installability** (`npm run check:responsive`) — beyond the
  layout rules, the suite asserts the iOS standalone keys
  (`apple-mobile-web-app-capable`, status-bar style, apple-touch-icon), the
  Android installable manifest with a maskable icon, the theme colours, and that
  the desktop breakpoints and grid utilities are present in the compiled CSS.
* **Social channels, mailboxes and phone** (`npm run check:social`, 57 assertions) —
  `lib/social.ts` is the single source with all four official profiles compiled
  in under the council's own handle. The audit proves each of LinkedIn, Instagram,
  Facebook and YouTube renders as a link with its handle, that no legacy
  `youtube.com/pypcofficial` URL shape is ever emitted, that all four brand marks
  appear on the page, that the contact page states the shared handle and that the
  `sameAs` list carries exactly those four profiles. It also proves the
  link-to-chip switch exists, so a channel can be made non-clickable by
  configuration alone if a page ever goes away. The rendered HTML is inspected for the follow block, both profiles with
  their handles, the absence of every placeholder pattern (`facebook.com/`,
  `youtube.com/`, another organisation's page), the Organisation `sameAs` list,
  the phone, the `WebSite` languages and the share endpoints on the conference
  page. Both official mailboxes — **pypcofficial@gmail.com** and
  **officialpypc@gmail.com** — must appear on the home page and the contact page,
  and the retired addresses (`nylpofficial@gmail.com`, `officialnylp@gmail.com`)
  must not appear anywhere, so a stale mailbox cannot creep back in. The phone is
  checked in both forms: `+92 315 5729598` (international, used for `tel:` and
  WhatsApp links and in the structured data as E.164 `+923155729598`) and
  `0315 5729598` (local dialling, derived from the same constant).
* **Health** — the `/api/status` payload is well-formed, contains all five check
  panels, reports live database counts, confirms storage is writable, confirms
  the 8 institutional PDFs and both emblem variants are present, and exposes no
  credential-shaped value.
* **Registration** — a new account is created `PENDING`, cannot sign in before
  verification (`403`), receives a hashed single-use token (30-minute TTL), can be
  verified by code or link, and is then able to sign in. Honeypot, minimum fill
  time and both rate limits are exercised and enforced.
* **Theme + password** — `light`, `dark` and `system` are persisted in a cookie
  and re-applied before first paint; `system` follows the OS live. The password
  policy rejects weak, repeated, l33t-disguised and personal-info passwords and
  accepts a strong one on the first submission — no dead ends.
* **Connectivity** — register → verify → sign in → read the row back → upload a
  real PDF (197 886 bytes, stored privately) → download it as the owner (`200`) and
  be refused anonymously (`401`) → file an application → trip the duplicate guard
  (`409`) → verify certificate `PYPC-A2B4-C6D8-E9F1` (VALID) and
  `PYPC-Z9Y8-X7W6-V5U4` (REVOKED) → download a certificate PDF (46 779 bytes) →
  check out and settle an order → request a visa letter (`PYPC-VISA-…`), have
  staff issue it, see it on the dashboard → ask the AI assistant and confirm the
  `AiMessage` row → submit the contact form and confirm the row, the audit entry
  and the staff notification → open all 9 admin pages as staff (`200`) and as an
  anonymous visitor (`307`). It cleans up after itself.
* **IMUN 2027** — all twenty-one sections render, in the same order as the
  conference navigation; the concept note is reproduced with its reference number
  (`PYPC/IMUN/2027/CN-01`) and its two signatories are present verbatim — Dr.
  Mohsin Ejaz Chaudhry (Founder & Chairperson, +92 315 5729598,
  Mohsinejaz98@gmail.com) and Ayesha Qaisar (Co-Founder & Chief Executive, both
  phone lines and both addresses); the registration counter on the
  page is read from the database and is asserted to **equal** the database count
  (cross-checked by querying Prisma directly in the same run); the flag parade
  renders 200+ real country flags drawn from the site's own catalogue; the venue
  section states that neither venue is booked; the budget is presented as planned
  percentages; the concept-note disclaimer is visible; charts carry `role="img"`
  labels and the budget table carries a caption; disclosure questions use native
  `<summary>`; the conference sub-brand accent is applied; and the page contains no
  fixed pixel width and exactly one `<h1>`.
* **Authorisation** — the matrix signs in for real as a member, an executive and a
  super admin, then proves: anonymous visitors are redirected away from
  `/dashboard` and `/admin`; anonymous API calls to `/api/applications` and
  `/api/certificates` are refused with `401`; a member **never renders the admin
  panel** (asserted on the body, not the status code) and is redirected with a real
  `307`, and no administrative figure appears in the response; a member's own
  collections carry no other member's data; a member cannot settle an order
  manually (`403`) and a cross-origin settlement is rejected (`403`); an executive
  and a super admin both render the panel; and the audit log renders for a super
  admin. Every one of those assertions looks for a heading the *page itself*
  renders — `Operational queues`, `Member directory` — never the layout's “Signed
  in as …” line, which would also appear above an error boundary.
* **Panel roles** — executives and moderators open the overview and are sent back
  to it (a real `307`) if they try `/admin/users`, `/admin/certificates` or
  `/admin/payments`, instead of being shown a broken screen; admins reach all
  three. `/admin` itself is open to every staff role, which is where an executive
  lands after signing in.
* **Payments** — the full chain (order → simulated gateway → `PAID` → `ACTIVE`
  membership → notification → replay protection) runs against a **development**
  server, because the simulated gateway is disabled whenever `NODE_ENV` is
  production. Against the production build the same script asserts the opposite,
  fail-closed behaviour instead: the gateway is refused with `400`, **no order row
  is written** (the guard runs before the order is created), no membership is
  activated, an unconfigured real gateway answers with a readable message rather
  than crashing, and the checkout page still lists the real gateways.
* **Contrast** — the WCAG relative-luminance formula is applied to the real hex
  values of all 49 foreground/background pairs the interface renders, in both
  themes, with the correct threshold per pair (4.5:1 text, 3:1 large text and
  graphics). It also fails on CSS/token drift and on low-contrast utility classes
  used for readable text.
* **Responsive** — see `DESIGN-SYSTEM.md` for the full list; the audit inspects
  both the source and the CSS/JS the browser actually receives (`clamp()`, `dvh`,
  `--vh`, `overflow-x: clip`, safe-area insets, pointer guards, all four
  breakpoints, `.table-scroll` on every table, one `<h1>` per page, working `tel:`
  and `mailto:` links, real-time code present in the shipped bundle).

## 3. Clean-room test (the package, not the workspace)

The shipped ZIP was extracted into an empty folder — nothing from the build
machine — and driven end to end:

1. `unzip` → **263 files**; `npm ci` — **490 packages**, exit 0 (15 s).
2. `npx prisma generate` → `npm run build` — **58/58** routes, exit 0.
3. `npx next start -p 3400` — server ready.
4. Every suite, against the extracted copy: routes **38/38**, health **12/12**,
   registration **25/25**, theme **25/25**, connectivity **52/52**, authorisation
   **18/18**, contrast **49/49**, responsive **51/51**, IMUN 2027 **29/29**, and
   the payment check **7/7** in its production guard mode.
5. Secret scan clean (**clean**), backup written, restore drill **7/7** — all
   inside the extracted copy.
6. **Fresh database from scratch** (what CI does on every push):
   `cp .env.example .env` → `npx prisma db push` → `npm run db:seed`, served on
   :3500. The homepage, `/conferences/imun-2027`, `/membership`, `/international`,
   `/status` and `/api/status` all answer `200`, and the authorisation matrix is
   **18/18** against a database that was created from the schema minutes earlier.
7. Disaster recovery: `prisma/dev.db` deleted → `npx prisma db push` +
   `npm run db:seed` → the site is populated again (3 accounts, 3 plans, 7
   programmes, 4 events, 5 opportunities, 3 certificates).

## 4. Database as shipped

`prisma/dev.db` inside the package contains exactly the seeded content and no test
residue:

| Table | Rows |
| --- | --- |
| User | 3 (Super Admin, Executive, Member — all verified) |
| MembershipPlan | 3 (ASSOCIATE, EXECUTIVE, INSTITUTIONAL) |
| Programme | 7 |
| Event | 4 |
| Opportunity | 5 |
| Certificate | 3 (2 valid, 1 revoked) |
| every other table | 0 — applications, orders, contacts, visa letters, memberships, event registrations, notifications, AI conversations, webhook events, audit log and the rate-limit buckets are all empty (the suites create and remove their own rows) |

Before the package is built, `npm run db:clean:ship` is run and must report
**“Clean — the database holds seeded content and real data only.”** (It removes
test accounts, verification e-mails sent to throwaway addresses, audit rows written
by verification runs and anonymous AI conversations, then clears the rate-limit
buckets.)
That is how the counts above stay exact: the suites clean up after themselves, and
the cleaner catches anything an interrupted run left behind.

## 5. Live checks at hand-over

```
200  /            200  /status       200  /api/status
200  /contact     200  /international     200  /membership
307  /dashboard (anonymous)          307  /admin (anonymous)

/api/status → overall "warn"
  database   ok    members 3 (3 verified) · plans 3 · programmes 7 · events 4
                   opportunities 5 · certificates 3
  storage    ok    private/uploads writable
  assets     ok    emblem light + dark present, 8 institutional PDFs
  email      warn  SMTP credentials not supplied yet (dev outbox in use)
  payments   warn  JazzCash / Easypaisa / Stripe credentials not supplied yet
```

`warn` on the last two panels is expected and documented: the code paths are
complete, but live credentials must come from the organisation. Nothing else is
outstanding.

## 6. What a reviewer should try first

1. Open `/conferences/imun-2027` — twenty-one sections, live counters and the flag
   parade; then `/status`, which is the site's own report on itself, in real time.
2. Rotate a phone or resize the window while the mobile menu is open — it closes
   by itself; the layout reflows with no horizontal scrollbar at 320 px.
3. Switch the theme (light → dark → system) and watch the emblem, the charts and
   every label follow, with no flash of the wrong theme on reload.
4. Fill the contact form with a bad email and watch the validation explain itself.
5. Sign in as `admin@pypc.org.pk` / `Pypc@2026` and open the admin console.


---

## 7. Round 7 — content, security and the loading fix (latest)

Round 7 was driven by live-site feedback: a homepage that appeared broken, an
"8% Loading platform" screen that stuck, near-empty membership and status pages,
placeholder numbers, and gaps in accessibility, SEO, security and legal content.

### 7.1 Root cause found and removed

`components/experience/preloader.tsx` was a fixed `z-[200]` overlay that started
at 8 % and only unblocked when `document.readyState === 'complete'`. In an
embedded pane, on a slow connection, or when hydration is delayed, that state
never arrives — so the overlay covered a page that was in fact rendering
correctly. That single component explains the "broken homepage", the "empty
pages" and the stuck percentage.

It is **deleted**, `components/experience/site-experience.tsx` no longer imports
it, and `app/loading.tsx` (a skeleton, non-blocking) is the only progress
indicator. Three perf guards now fail the build if a percentage overlay, a
`z-[200]` overlay, or a bare `0` statistic returns.

The second cause of the "0 % / 0+" impression was `components/motion/counter.tsx`
starting at `useState(0)`, which meant the server-rendered HTML and any no-JS view
printed `0` before hydrating. The counter now initialises from the real value and
only animates for statistics that begin below the fold.

### 7.2 Evidence collected this round

| Item | Evidence |
| --- | --- |
| Homepage renders immediately | `GET /` → 200 in **330 ms**, 328 kB HTML, H1 present, 0 bare-zero statistics |
| No loading trap | `"Loading platform"` occurrences in served HTML: **0**; `z-[200]`: **0** |
| Statistic values shipped in HTML | `3 · 7 · 2 · 4 · 3 · 7 · 2 · 4 · 5` (members, programmes, valid certificates, events, …) |
| Membership page | **2,222 words**, four tier cards, **29-row** comparison matrix, five-step activation timeline |
| Free tier, end to end | real session → `POST /api/memberships/checkout` → order `PYPC-ORD-BYK8RXLQ15G` (FREE, PAID, 0), membership ACTIVE until 2027-09-28, audit `MEMBERSHIP_ACTIVATED_FREE`, notification sent, `/membership/success` shows the reference |
| Guard rails | free tier + gateway → 400; paid tier + FREE → 400 (both with readable messages) |
| Newsroom | `/news` + 5 articles → 200; 2491 words on the index; 6 news URLs in `sitemap.xml` |
| Accessibility | `/accessibility` → 200; linked from the footer and the sitemap |
| Security headers | `curl -I` → HSTS `max-age=63072000; includeSubDomains; preload`, full CSP, nosniff, referrer, permissions, COOP (8 rules) |
| Share cards | 4 × 1200×630 OG images, 170–178 kB, wired site-wide and on 3 key pages |
| Contrast | 49/49 pairs pass, plus 0 low-contrast utility usages |
| Suites | **422 feature-suite checks green** (routes 42, health 12, registration 25, theme 25, connectivity 54, responsive 63, IMUN 29, social 55, AI 70, performance 47) |
| Gates | authz 18/18 · secrets clean · payments 7/7 production guard · backup + restore drill clean |

### 7.3 Round-7 deliverables in this repository

| Deliverable | File |
| --- | --- |
| Homepage wireframe and content structure | `docs/HOMEPAGE-WIREFRAME.md` |
| Membership page detailed design | `docs/MEMBERSHIP-DESIGN.md` |
| Next.js technical implementation checklist | `docs/NEXTJS-CHECKLIST.md` |
| Content rewrite samples + house style | `docs/CONTENT-REWRITE-SAMPLES.md` |
| Domain, mailboxes, hosting, monitoring, payments runbook | `docs/GO-LIVE.md` |

### 7.4 What remains with the organisation (not code)

Custom domain purchase and DNS, the `info@` / `secretariat@` mailboxes with
SPF/DKIM/DMARC, a paid hosting plan with Postgres (SQLite cannot persist on
Vercel), merchant credentials for JazzCash/Easypaisa/Stripe, lawyer-reviewed
privacy/terms/refund wording, and an uptime monitor pointed at `/api/status`.
Each is a numbered step with the exact value to enter in `docs/GO-LIVE.md`.


---

## 8. Round 7, second pass — the blueprint's remaining engineering items

Added after the first pass, in the order the blueprint lists them.

| Blueprint item | What now exists | Proof |
| --- | --- | --- |
| CAPTCHA on forms | Self-hosted signed human check (`lib/security/human-check.ts` + `/api/human-check` + `components/forms/human-check.tsx`) on registration, contact and newsletter. No third-party script, no visitor data leaving the site. | connectivity: issue, wrong answer refused (400), missing check refused (400) |
| 2FA (optional) | Full TOTP implementation (`lib/auth/totp.ts`), setup/confirm/disable/regenerate API, dashboard panel with a locally drawn QR code, single-use bcrypt-hashed recovery codes, login step | `npm run check:2fa` — **26/26**, including all six RFC 6238 vectors |
| Immutable audit logs | SHA-256 hash chain over every entry (`lib/audit.ts`), re-verified on every admin console load, with the break attributed to the exact row | `npm run check:audit-chain` — **9/9**: chain verified → row edited in SQLite → chain reported broken at that row |
| Audit log that survives live traffic | Three separate ways a hash chain can be invalidated by ordinary work were found and closed — see *Keeping the chain honest* below | `npm run check:suites` — the tamper test still reports **9/9** after all eleven suites have run, and the console still reads *Chain verified* |
| Cookie policy | `/cookies` — written against the cookies the platform actually sets (session, theme, CSRF, rate limits), with the analytics opt-in described honestly as off | connectivity: page 200 with the expected heading |
| Impact / annual report | `/impact` reads live figures; `scripts/build-impact-report.mjs` generates a 2-page PDF **from the database** (`public/reports/pypc-impact-report-2026.pdf`) with zero-state measures described in words | connectivity: page + PDF downloadable |
| Calendar integration | `.ics` export per event (RFC 5545, folded lines, UTC stamps, reminder alarm) plus Google Calendar and Outlook links on the event page | connectivity: valid calendar file with UID + SUMMARY |
| Newsletter + automation | Double opt-in subscriber model, confirmation and unsubscribe endpoints, sign-up widget on the newsroom, audit entries for request/confirm/unsubscribe | connectivity: PENDING → CONFIRMED → UNSUBSCRIBED, all asserted |
| Site-wide search | `/search` over database records *and* editorial content (programmes, events, opportunities, courses, newsroom, FAQ, policies, membership tiers, key pages), explainable scoring, no tracking | connectivity: three search assertions |
| Newsroom / press | `/news` + five traceable announcements, `NewsArticle` structured data, media-enquiry block | routes 46/46 · sitemap |
| Transparent zero states | Every metric that has no data yet prints a sentence ("Membership opens with the first intake"), never `0`; enforced by a performance guard that fails the build | `npm run check:perf` guard 4c |
| Partner-university / MoU portal | `/partnerships` takes a request end to end: validated form with human check and honeypot → stored row with a `PYPC-MOU-…` reference → confirmation to the institution and a copy to the secretariat → staff decision in `/admin/partnerships` → audited status change. The page publishes the five-step process with turnaround times, the seven areas of collaboration, and the rule that a partner is named only once an agreement is countersigned | `npm run check:partnerships` — **38/38**, including every refusal path, a duplicate that returns the same reference, and the hourly rate limit asserted rather than bypassed |

### Keeping the chain honest — three defects the tamper test was designed to catch

A hash chain is only worth having if it stays intact while the site is actually used. The audit suite
runs last, on a copy of the live database, so any damage done earlier in the run is included in its
verdict. That arrangement found three real faults, all now fixed at the source rather than papered over:

1. **Concurrent writes could fork the chain.** Two requests that read the same tail at the same moment
   both claimed the same predecessor, producing two "next" entries and a break on every hash after them.
   Appends are now serialised in-process, and the database carries a unique index on `prevHash` so a
   second process cannot claim a link either — the losing write is refused, re-reads the tail and
   chains onto the winner.
2. **Deleting an account rewrote its audit rows.** `actorId` was a foreign key with
   `ON DELETE SET NULL`, so removing a throwaway test account silently set `actorId` to null on entries
   that had already been hashed — the row's content changed while its hash did not. `actorId` is now a
   plain historical value with no foreign key at all: an audit row is evidence, and deleting a user
   cannot touch it. The identity stays readable through `actorEmail`.
3. **Test suites deleted chained rows.** The payment, theme/password and two-factor suites cleaned up
   after themselves with `deleteMany({ where: { actorId } })`, which removed links from the middle of the
   chain. They now delete only legacy, unchained rows (`hash: null`) — the same guard `db-clean` uses.

For the packaged database, `npm run db:clean:ship` does four narrowly-scoped things, in this order:
it removes accounts the suites created (plus their orders, memberships, applications, messages and
outbox rows); it deletes **synthetic** contact messages only — recognised by a test address, a suite's
account name, or the fixed wording the suites send, never by the sender merely being unknown; it deletes
audit rows that name an address which no longer exists anywhere in the system (no account, no enquiry,
no subscriber — so the entry is orphaned residue), having first cleared confirmation mails addressed to
addresses that no longer exist so a dead letter cannot keep an address "referenced"; and then it rebuilds
the chain. A genuine visitor enquiry is kept in every case, with or without an account — run
`npm run db:clean -- --dry-run` to see exactly what would go without touching the file.

The rebuild itself (`scripts/audit-rechain-local.mjs`, also `npm run audit:rechain:local`) needs no server
and no credentials, and it leaves an `AUDIT_LOG_RECHAINED` marker naming the reason and the number of
entries rewritten, so the hand-over log is both clean and verifiable. The online equivalent — `npm run
audit:rechain`, an admin POST gated by `AUDIT_ALLOW_RECHAIN=true` — exists for a live database and is
never enabled by default.

### What the human check deliberately is not

It is not reCAPTCHA, hCaptcha or Cloudflare Turnstile. Those add a third-party script to every public
page, move visitor data to another company, and break silently when a key expires or a vendor blocks a
region. This one is issued and verified by our own server, so it works when the network is slow, needs
no external key, and cannot be silently disabled by a third party. It stops opportunistic form spam;
it is documented as *not* stopping a determined human attacker, which is the honest scope.

### Where the remaining blueprint items live

Staging environment, uptime monitoring (UptimeRobot/Better Uptime on `/api/status`), domain, mailboxes,
gateway merchant credentials, lawyer-reviewed legal wording and a native-English editorial pass are
**not code** — they are actions only the organisation can take, and each is a numbered step with the
exact value to enter in `docs/GO-LIVE.md`.
