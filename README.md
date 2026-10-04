# PostgreSQL deployment

The production Prisma schema now targets PostgreSQL. See [the migration and deployment guide](docs/POSTGRESQL.md). Local SQLite remains available through the npm database commands until a hosted connection is configured.

# Pakistan Youth Parliamentary Council — Official Platform (PYPC)

A complete, runnable web platform for the **Pakistan Youth Parliamentary Council**: public website, member accounts, membership payments (JazzCash / Easypaisa / Stripe adapters), programmes, events, opportunities, applications, QR-verified certificates, an AI assistant and a full admin panel.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · three.js · Framer Motion · Prisma · SQLite (dev) → PostgreSQL/Supabase (prod) · JWT cookie sessions · pdf-lib + QR**.

---

## 0. Read this first

`START-HERE.md` is the two-minute guide for the packaged ZIP: it explains what is inside, what is
deliberately left out, and how to start everything with one command (`setup.sh` / `setup.bat`).
The database (`prisma/dev.db`) ships **already seeded**, and the bundled `.env` is a working
development configuration, so the site runs immediately after `npm install` + `npm run build`.

With the site running, twelve self-checks prove the wiring, the design system and the
responsiveness — all of them are plain Node scripts, so they run anywhere. One command runs
the lot and prints the real totals:

```bash
npm run check:suites        # all thirteen suites below, then the grand total  (517 checks)
```

```bash
npm run check:routes        # every public route + protected redirects            (46 checks)
npm run check:health        # the site's own /api/status connectivity report      (12 checks)
npm run check:auth          # sign-up → email verification → login + anti-abuse    (25 checks)
npm run check:theme         # light/dark/system theme + password policy            (25 checks)
npm run check:connectivity  # database, uploads, applications, payments, certificates (72 checks)
npm run check:responsive    # responsive audit: source patterns + rendered CSS    (63 checks)
npm run check:imun          # IMUN 2027 page: content, live counters, honesty      (29 checks)
npm run check:social        # four social channels, mailboxes, phone forms        (55 checks)
npm run check:ai            # assistant in English, Urdu and Roman Urdu            (70 checks)
npm run check:perf          # the 1.2 s / 800 ms / 2 s response budgets            (47 checks)
npm run check:2fa           # TOTP enrolment, recovery codes, login step           (26 checks)
npm run check:audit-chain   # tamper with a copy, watch the console name the row    (9 checks)
npm run check:partnerships  # partnership / MoU request pipeline, end to end       (38 checks)
npm run check:payments      # payment → membership chain (run against `npm run dev`)
npm run check:contrast      # WCAG 2.1 AA audit of every colour pair              (49 pairs)
```

---

## 0.0 Documentation set (`docs/`)

Ten short documents, so nothing has to be reverse-engineered:

| File | Read it for |
| --- | --- |
| `docs/ARCHITECTURE.md` | How the layers fit together and why — including the real-time layer and the trust boundaries |
| `docs/FOLDER-STRUCTURE.md` | The complete folder tree with one line per folder |
| `docs/DESIGN-SYSTEM.md` | The palette, the WCAG rules and every responsive technique, with the commands that verify them |
| `docs/CONTACT.md` | The official phone, both mailboxes, office hours and where each form's message is stored |
| `docs/VERIFICATION.md` | Every check that was run, its exact result, and what a reviewer should try first |
| `docs/LAUNCH-CHECKLIST.md` | The sign-off sheet: every launch claim with the command that proves it |
| `docs/GO-LIVE.md` | Domain, mailboxes, hosting, monitoring and payment credentials — the runbook for the steps only the organisation can do |
| `docs/HOMEPAGE-WIREFRAME.md` | Deliverable 1 — the homepage wireframe and content structure, block by block |
| `docs/MEMBERSHIP-DESIGN.md` | Deliverable 2 — the four-tier membership design, pricing, comparison matrix and activation flow |
| `docs/NEXTJS-CHECKLIST.md` | Deliverable 3 — the Next.js implementation checklist for this repository, with the stack decision recorded |
| `docs/CONTENT-REWRITE-SAMPLES.md` | Deliverable 4 — before/after copy for ten pages, plus the house style everything follows |

---

## 0.1 Contact channels (live on every page)

The organisation's real channels are defined **once** in `lib/constants.ts` and rendered in the
footer, the contact page, the AI assistant, the email templates and the policy documents:

| Channel | Value | Where it appears |
| --- | --- | --- |
| Phone / WhatsApp | **+92 315 5729598** · **0315 5729598** (local dialling) | Footer, contact page, `tel:` and `wa.me` links, tap-to-call on mobile, AI assistant answers |
| Primary email | **pypcofficial@gmail.com** | Footer, contact page, contact form errors, emails (`From:` / reply-to) |
| Secondary email | **officialpypc@gmail.com** | Footer, contact page, verification and policy notices |
| Office hours | Monday–Saturday, 10:00–18:00 PKT (GMT+5) | Footer, contact page |

Change a value in `lib/constants.ts` (or override it in `.env` with
`NEXT_PUBLIC_CONTACT_EMAIL_1`, `NEXT_PUBLIC_CONTACT_EMAIL_2`, `NEXT_PUBLIC_CONTACT_PHONE`) and the
whole site follows — no page edits.

---

## 0.1b Social channels (one source, no guessed links)

`lib/social.ts` is the only place that knows which accounts are real. Every
consumer — the footer's **Follow PYPC** block, the contact page card, the header
menus (desktop mega-menu and mobile drawer), the desktop side rail, the AI
assistant's contact answers and the `sameAs` list in the Organisation JSON-LD —
reads that module, so a page can never publish a different (or stale) address.

| Channel | Address | Handle |
| --- | --- | --- |
| LinkedIn | `linkedin.com/company/pakistan-youth-parliamentary-council` | company page |
| Instagram | `instagram.com/pypcofficial` | `@pypcofficial` |
| Facebook | `facebook.com/pypcofficial` | `@pypcofficial` |
| YouTube | `youtube.com/@pypcofficial` | `@pypcofficial` |
| Email | `pypcofficial@gmail.com` · `officialpypc@gmail.com` | — |
| Phone / WhatsApp | `+92 315 5729598` · `0315 5729598` | — |

**One handle, every platform.** The council uses `pypcofficial` on Instagram,
Facebook and YouTube and for its primary mailbox, plus the LinkedIn company page
slug. That is stated on the Contact page in the visitor's own words — "an account
is only ours if it carries that name" — which is what makes a lookalike page hard
to pass off as official.

All four addresses are compiled into `lib/social.ts` as supplied and confirmed by
the secretariat, and any of them can be moved per deployment with the matching
`NEXT_PUBLIC_SOCIAL_*` variable. YouTube is stored in the `@handle` form, which
is the URL YouTube resolves for a channel handle.

**If a page is ever unreachable**, set `NEXT_PUBLIC_SOCIAL_<CHANNEL>_PENDING="true"`
and that channel renders as a labelled chip rather than a link — in the footer,
the contact page, both header menus and the side rail at once. No code change.

**One renderer, everywhere.** `components/ui/social-link.tsx` is the only place
that decides link-vs-chip, so the footer, the contact page, both header menus and
the desktop rail can never disagree. `sameAs` in the Organisation JSON-LD lists
the three profiles that resolve — a dead URL in structured data is worse than a
missing one.

Because the profiles are declared as `sameAs` in the Organisation JSON-LD, search
engines learn which accounts belong to PYPC, which is also what makes a lookalike
page harder to pass off as official.

**Sharing** — every conference, programme, event and opportunity page carries a
share row (`components/ui/share-buttons.tsx`): LinkedIn, Facebook, X and WhatsApp
share endpoints plus the native share sheet / copy-link on phones. No SDK, no
tracker script.

---

## 0.1c Installable web app, response times and the emblem

**Installable everywhere.** `app/manifest.ts` serves a web app manifest (standalone
display, theme colour, maskable icon, four shortcuts) and the layout carries the
iOS equivalents, so the site can be added to an Android home screen, an iPhone
home screen or a desktop dock and opens without browser chrome. `npm run
check:responsive` asserts each of those pieces (B25–B31).

**Every function answers in well under three seconds.** `npm run check:perf`
times every public page, the status API and the AI assistant (JSON and
streaming, all three languages) against internal budgets of 1200 / 800 / 2000 ms.
On the reference build the slowest page is around 0.1 s, so there is more than 8×
headroom against the requirement. gzip is applied to every page response, the
emblem is served with a one-year immutable cache header, and a repeat visit is
never slower than the first.

**The emblem.** The supplied artwork is a print-style crest: its interior was a
solid white plate, which is invisible on a white page but shows up as a white
disc on the green header, the navy conference hero and the dark theme — the
"merged badly" effect. `scripts/build-logo-assets.py` rebuilds the assets from
the approved master: the plate is removed (connected-component analysis, so the
cream lettering inside the dark ribbon survives), and a second variant repaints
the line work in cream with lifted gold for dark surfaces. Both variants are
transparent PNGs; the favicon and iOS icon keep a plate deliberately, because a
browser tab and a home screen are their own canvases.

## 0.2 Design system, contrast and responsiveness

* **One palette.** `lib/design-tokens.ts` is the single source of truth for colour; `tailwind.config.ts`
  imports it and `app/globals.css` uses the same values for dark mode. `npm run check:contrast`
  computes the WCAG contrast ratio of all 35 foreground/background pairs the interface renders
  (body text ≥ 4.5:1, large text and graphics ≥ 3:1) and fails the build if any pair regresses or if
  the CSS drifts away from the tokens.
* **Fluid layout.** Type uses `clamp()` (`.type-hero`, `.type-display`, `.type-section`, `.type-body`),
  section spacing uses `.section-y`, the container gutter is fluid, and heights use `dvh` so mobile
  browser toolbars never clip the layout.
* **Every width works.** Tables scroll inside `.table-scroll`, wide admin tables scroll instead of
  breaking the page, `img/video/canvas` are capped at 100 %, long emails and URLs wrap, hover effects
  only fire on hover-capable pointers, and safe-area insets keep the fixed bar and the assistant
  button clear of notches and home indicators.
* **Verified, not claimed.** `npm run check:responsive` audits both the source and the compiled CSS:
  viewport-fit, `dvh`, `clamp()`, `overflow-x: clip`, safe-area insets, pointer guards, all four
  breakpoints (640/768/1024/1280), one `<h1>` per page, and a horizontal-scroll wrapper on every table.

---

## 0.3 IMUN 2027 (`/conferences/imun-2027`)

The flagship conference has its own seventeen-section page, built from PYPC's
concept note (PYPC/IMUN/2027/CN-01) and the public correspondence record:

| Section | What it contains |
| --- | --- |
| At a glance | Eight facts: format, host city, dates, delegations, theme, scholarships, registration window, certificates |
| Overview & programme | The concept-note summary and the six programme components |
| Who can take part | Six plainly answered questions — no prior MUN experience required |
| Delegate categories | International, Pakistani, scholarship and faculty-advisor routes |
| Countries | Flag parade built from the site's real country catalogue (region by region) |
| Venue | Pakistan-China Friendship Centre vs Jinnah Convention Centre, both openly marked *not yet booked* |
| Culture | Sufi night, heritage evening, Islamabad discovery day, flag parade, campus exchange, buddy system |
| Scholarships | Four tiers with exactly what each covers and what it requires |
| Budget | Planned allocation by category (percentages), with the PKR 5–10 crore range stated as a range |
| Timeline | Concept note → outreach → registration → conference → outcome document |
| Live status | Twelve workstreams with their real progress, including the ones barely started |
| Why different | Eight dimensions compared against a standard Model UN weekend |
| Sponsorship & documents | Existing packages plus the institutional PDFs |
| FAQ & how to join | Delegate questions, then the three registration routes |

Two rules the page keeps: **live numbers come from the database** (registrations of
interest and countries represented are queried on every request — never hard-coded),
and **planning-stage figures are labelled as targets**, with the disclaimer visible
wherever they appear. `npm run check:imun` verifies both, including a cross-check
that the number rendered on the page matches the database.

The conference carries its own **sub-brand palette** (conference navy `#0B1D37` and
azure `#1A73E8`) so the flagship event stands apart from the parent brand without
competing with it — and those colours are contrast-audited like everything else.

---

## 1. Quick start

```bash
cd pypc-website
npm install                 # already run in this workspace
cp .env.example .env        # already created — edit it for production
npx prisma generate
npx prisma db push          # creates prisma/dev.db
npm run db:seed             # membership plans, programmes, events, demo users
npm run dev                 # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

Other useful commands:

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | TypeScript check (passes cleanly in this build) |
| `npm run lint` | Next.js ESLint |
| `npm run db:studio` | Visual database editor (used to edit rich content) |
| `npm run db:reset` | Drop, recreate and reseed the database |
| `npm run db:backup` | Timestamped copy of the SQLite database in `backups/` |
| `npm run db:restore-test` | Restore the newest (or a named) backup into a scratch file and check it opens, counts rows and verifies the audit chain |
| `npm run db:clean:ship` | Packaging clean-up: throwaway accounts and their audit trail removed, chain rebuilt |
| `npm run check:suites` | Every feature suite in one run, with the real total |
| `npm run check:2fa` | Two-factor enrolment, recovery codes and the login step |
| `npm run check:audit-chain` | Tamper test: edit a row in a database copy, watch the console name it |
| `npm run check:partnerships` | Partner-university / MoU request pipeline, all refusal paths included |
| `npm run audit:rechain` | Repair a live chain (server must run with `AUDIT_ALLOW_RECHAIN=true`) |
| `npm run audit:rechain:local` | Rebuild the chain directly against the database file |
| `npm run build:impact-report` | Regenerate the impact PDF from live database figures |
| `npm run scan:secrets` | Credential scan of the tree, the shipping `.env` and the ignore rules |

---

## 2. Demo accounts (seeded)

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@pypc.org.pk` | `Pypc@2026` |
| Executive | `executive@pypc.org.pk` | `Pypc@2026` |
| Member (Ayesha Khan) | `member@example.com` | `Pypc@2026` |

**Change all three before any public launch** (Admin → Members, or `npm run db:seed` with new values).

These seeded accounts are created **already verified** (`emailVerifiedAt` set) so the demo keeps working.
*New* signups are not: they stay `PENDING` until the six-digit code from their inbox is entered on
`/verify-email`, and login answers `403 EMAIL_NOT_VERIFIED` with a "send a new code" action until then.
To watch that journey locally, register with an address you can open, or set `EMAIL_DEV_MODE="true"` and
the code appears on screen; **Admin → Email & Verification** lists everyone still waiting.

### Demo certificate codes to test verification

| Code | Expected result |
| --- | --- |
| `PYPC-A2B4-C6D8-E9F1` | **Valid** certificate |
| `PYPC-Z9Y8-X7W6-V5U4` | **Revoked** certificate |

Try them at `/verify` or `/verify/PYPC-A2B4-C6D8-E9F1`.

---

## 3. What is included

### Public site

**Search (`/search`)** — one index over database records and editorial content (programmes, events,
opportunities, courses, newsroom, FAQ, policies, membership tiers), with explainable scoring and no
tracking of what a visitor looks for.
**Impact & Reports (`/impact`)** — metrics counted from the live database at page load, plus a
two-page PDF report generated from the same data by `scripts/build-impact-report.mjs`.
**Cookie Policy (`/cookies`)** — written against the cookies the platform actually sets.
**Newsroom (`/news`)** — announcements from the Council, each traceable to a document we have
actually published (concept notes, policy decisions, live platform capabilities). Five entries ship,
listed in `sitemap.xml`, with `NewsArticle` structured data and a media-enquiry route.
**Accessibility statement (`/accessibility`)** — what has been verified, the known limitations, and
how to report a barrier; linked from the footer and the sitemap.
- **Follow PYPC** on the footer, contact page, header menus and side rail — the real LinkedIn
  company page and Instagram profile (with handles), plus Facebook/YouTube the moment their
  addresses are set. Shared from every conference, programme, event and opportunity page
- **AI assistant** that answers in English, Urdu or Roman Urdu and quotes live database figures
  (current prices, published events, open opportunities, valid certificates) — streamed as it composes
- Homepage with live counters (members, programmes, valid certificates), pillars, events, opportunities and CTA blocks
- About, Leadership (structure + real office-bearers from the database), FAQ (15 curated Q&As)
- Programmes listing (+ category filters) and programme detail pages with application form
- Events listing and event detail with registration (capacity-aware, duplicate-safe)
- Opportunities listing (+ type filters) and detail with tracked applications
- Membership plans, secure checkout, payment confirmation page
- Public certificate verification (`/verify` and `/verify/[code]`) with QR record
- **International participation hub** (`/international`) — audience fit, three participation modes with
  their real requirements, a five-step pathway, support products (visa letters, English delivery,
  time-zone scheduling, academic recognition letters, research collaboration, scholarships), USD pricing,
  a live time-zone converter for the published session schedule, and an international FAQ
- **Visa invitation letters** (`/international/visa-letter`) — the request form, what the letter states,
  what PYPC cannot do, and the delegate's own request history
- **Conferences** (`/conferences`) plus the flagship **IMUN 2027** page (`/conferences/imun-2027`) —
  concept-note download, programme components, delegate categories, scholarships, sponsorship tiers,
  venue/timeline caveats and a section scroll-spy
- **Certified courses** (`/courses`) — six courses with hours, outcomes, PKR/USD fees and delivery modes
- **Research & services** (`/research`) — research desk services, process, capability bars and a
  publications pipeline that states each item's real stage
- **Records & correspondence registry** (`/records`) — every filed institutional request with reference
  number, recipient, status and the downloadable source PDF
- **Partnerships & MoU** (`/partnerships`) — the four-step MoU route, partner benefits and IMUN 2027
  sponsorship tiers
- **Policies index** (`/policies`) — the four policies plus published templates (MoU, undertaking form,
  concept note)
- Policies: Privacy, Terms, Refund, Code of Conduct — content lives in `lib/data/policies.ts`
- Contact page (messages stored in the database and visible in Admin → Messages)
- AI Assistant widget (bottom-right) — answers from the official PYPC knowledge base, optionally enriched by OpenAI
- **System status** (`/status`) — a public connectivity page: database (with live record counts), email
  transport, private document storage (write-probed on each request), payment-gateway readiness and asset
  checks, plus the runtime versions. `GET /api/status` returns the same report as JSON for uptime monitors
  and answers `503` only when a component has actually failed; no secret values are exposed.
- `robots.txt`, dynamic `sitemap.xml`, security headers, 404 page

### Member dashboard (`/dashboard`)
Overview, profile (**CV/resume upload** with private storage), membership + payment history, applications
with live status and the attached CV, certificates with QR + PDF download, event registrations, visa
invitation-letter tracking, security (password change + account activity), support.

### Admin panel (`/admin`)
Overview with queues and audit feed, members (role/status control with safety rails), application review
with notes and the applicant's attached CV, payment reconciliation, certificate issuing / revocation /
reinstatement, content control for programmes, events and opportunities, messages, **visa
invitation-letter queue** (status + note to the delegate, with automatic notification and audit entry),
full audit log.

### Colour theme: Light · Dark · System (latest pass)
- Every page renders in **light**, **dark**, or **follow the device** — chosen from the switcher in the header
  (desktop) and in the mobile menu under *Appearance*. The choice is stored in `localStorage` **and** a
  cookie, so it survives reloads, new tabs and a cleared cache (the cookie is the fallback).
- **No white flash.** A tiny inline script in `<head>` (generated by `themeInitScript()` in `lib/theme.ts`)
  resolves the theme and sets the class on `<html>` *before the first paint*. The rest of the bundle can be
  slow, blocked or still hydrating — the colours are already correct.
- **System stays live.** With *System* selected, `prefers-color-scheme` is watched while the page is open,
  so changing the OS setting switches the site instantly, no reload.
- The dark palette is a full pass, not an inversion filter: deep-green surfaces (`#04110e` → `#0d1f1a`),
  warm-gold accents, adjusted text ramps (`slate-900 … slate-400`), softened hairlines, dark form controls,
  autofill colours, native `<select>` options, scrollbars, text selection, table dividers and policy prose.
  Brand marks and buttons use the shared tokens (`primary`, `gold`, `ink`, `champagne`, `mint`), so the two
  themes stay visually related.
- The emblem switches to the light-plate artwork in dark mode (`dark:hidden` / `hidden dark:block`), so the
  seal never sits dark-on-dark. Both variants are rendered server-side — no flicker, no layout shift.
- Because every colour lives in `app/globals.css` (a `html.dark` override layer) plus the Tailwind ramps,
  a designer can re-tune the dark theme in one file without touching 50 components.
- `color-scheme` is set per theme, so native controls, date pickers and scrollbars match instead of
  flashing white inside a dark page.

### Passwords: strong ones are accepted first time (latest pass)
- One policy, two consumers. `lib/validation/password.ts` holds the rules; the zod schema in
  `lib/validations` enforces them on the server and `components/ui/password-field.tsx` renders exactly the
  same list in the browser. A password can therefore never be rejected for a reason the form did not show.
- **Never a dead end.** The submit button is *not* disabled while something is missing — instead the form
  lists what is left ("Still needed: a strong password · matching passwords"), the field ticks rules off as
  they are met, scores the strength live, warns about Caps Lock and offers show/hide. Nothing is sent to
  the server until the rules pass, and the field explains itself at every step.
- Rules: 10–128 characters with upper case, lower case, a digit and a symbol; no repeated-character
  passwords; no known-weak passwords; and the padding is looked through, so `Password1!`, `P@ssword123`,
  `l3tm31n`, `pakistan2026!` and `qwertyuiop1!` are all refused even though they look complex.
- The password may not restate who the member is: their first name, last name, full name, email address or
  email local part is checked (server-side in `registerSchema`, and live in the field as
  *"Does not contain your name or email"*).
- bcrypt reads only the first 72 bytes, so the policy caps at 72 bytes and **both** sign-in and password
  change say so explicitly instead of silently truncating — a pasted 200-character string gets a clear
  message rather than "wrong password".
- Changing a password still increments `sessionVersion`, signing every other device out.

### Form protection, two-factor authentication and the audit chain (round 7, second pass)

**Human check instead of an external CAPTCHA.** Registration, contact and newsletter forms carry a
signed arithmetic challenge issued by `/api/human-check` and verified in `lib/security/human-check.ts`.
Nothing is sent to Google, Cloudflare or hCaptcha; there is no key to expire and no visitor data leaving
the site. Wrong answers and missing answers are refused before anything is stored.

**Optional two-factor authentication.** `lib/auth/totp.ts` is a dependency-free RFC 6238 implementation
(reproducing all six RFC test vectors), verified by `scripts/check-2fa.mjs`. Members switch it on from
**Dashboard → Security**: they confirm their password, scan a QR code drawn locally from the `otpauth://`
URI (the secret never touches an image service), prove the app works with one code, and receive eight
single-use recovery codes stored only as bcrypt hashes. Sign-in then requires the code — or one recovery
code, which is consumed on use. Turning it off requires the password again.

**Tamper-evident audit log.** Every entry is SHA-256 chained to the one before it
(`lib/audit.ts`), keyed with `AUDIT_CHAIN_SECRET`. The admin console re-verifies the whole chain on
every load and, if an entry was edited, deleted or re-ordered directly in the database, names the row
that broke it. `npm run check:audit-chain` proves this by tampering with a copy of the database and
watching the platform report the break.

The chain is built to survive ordinary use, not just a quiet install. Appends are serialised and the
database carries a unique index on `prevHash`, so two simultaneous requests can never claim the same
link and fork the log. `actorId` is deliberately **not** a foreign key: an entry must stay byte-for-byte
as written, so deleting an account cannot rewrite history (the person remains readable through
`actorEmail`). Clean-up code, including the test suites, deletes only legacy rows with no hash.

```bash
npm run check:audit-chain     # tamper with a copy, watch the console name the broken row
npm run audit:rechain         # repair a live chain (server needs AUDIT_ALLOW_RECHAIN=true)
npm run audit:rechain:local   # repair the database directly — no server, no credentials
```

`npm run db:clean:ship` uses the local rebuild as part of packaging: the throwaway accounts and their
audit trail are removed, the chain is rebuilt, and the log keeps an `AUDIT_LOG_RECHAINED` marker that
states the reason and the number of entries rewritten.

### Partnerships, MoUs and campus chapters (round 7, third pass)

**`/partnerships` is a working front door, not a contact-us paragraph.** A university submits one form
(institution, type, country, the person accountable, the areas of collaboration, the proposal); the
server validates it, checks the address really can receive mail, passes it through the same signed
human check as the other public forms, stores it with a `PYPC-MOU-…` reference, and emails a
confirmation to the institution with a copy to the secretariat. The request appears in
`/admin/partnerships` immediately, where staff move it through submitted → under review → approved /
declined; every change is audited with the reviewer's name.

The page itself publishes the five-step process with turnaround times, the seven areas of
collaboration, the MoU template as a PDF, and the honesty rule that matters most in this area: **an
institution is named as a PYPC partner only once an agreement has been countersigned** — no placeholder
logos, ever.

```bash
BASE=http://127.0.0.1:3000 npm run check:partnerships   # 38 checks, end to end
```

### Account security, countries and verification (previous pass)
- **Registration is two-phase.** Step 1 collects name, email, country (all countries, PK first), phone with
  country dial-code, password and terms. Step 2 proves the email address with a **six-digit code** and/or a
  one-click link before the account exists in any usable sense: the row is created as `PENDING`, **no
  session cookie is issued**, and `getCurrentUser()` refuses unverified accounts everywhere.
- **Email that must actually receive mail.** Three independent layers — syntax (RFC-shaped, dot/underscore
  and length rules), policy (disposable providers such as mailinator/yopmail/temp-mail, plus role mailboxes
  like `info@`/`admin@`/`noreply@` that no single person owns) and **deliverability**: a live DNS **MX**
  lookup per domain, cached 15 minutes with a timeout. A domain with no MX record is rejected; a DNS
  outage is tolerated and reported as `unknown` so a genuine signup is never blocked by the network.
- **Phone numbers validated per country.** `libphonenumber-js` checks every number against its country's
  real numbering plan (Pakistan included) and the value is stored in **E.164** (`+923001234567`). The
  dial-code selector and the national-number field are one control, so a mismatched pair cannot be
  submitted; short/implausible numbers are refused before the request leaves the browser.
- **Country selection covers every country** (ISO 3166-1 + dial code, grouped by region, Pakistan pinned
  first) in registration, profile, contact, applications and visa-letter requests. `Intl.DisplayNames`
  supplies the names, so nothing is hand-typed and nothing is missing.
- **Rate limits (database-backed, survive restarts).** Register: 5 per IP per hour + 3 per email address
  per hour, with a honeypot field and a minimum form-fill time (2.5 s) that is *silently* discarded —
  the endpoint answers exactly as it would for a real signup, so scripts get no signal. Login: 20 per IP
  per 15 minutes + 5 per account, then a 15-minute lock with a clear message. Resend: 8 per IP/hour,
  4 per address/hour. Verify: 15 per IP per 15 minutes. Contact and visa letters: 6 per IP/hour.
- **Codes are never stored in the clear.** Token and code are kept as SHA-256 hashes only, expire in 30
  minutes, allow 6 attempts, are single-use, and every issue/resend/verification is written to the outbox
  and the audit log. Staff can see *who is waiting* in Admin → Email & Verification but can never read or
  complete someone else's code — verification stays with the member, which is what makes the record
  trustworthy.
- **Same-origin guard on every mutating route** (CSRF defence), and `TRUST_PROXY_HEADERS=false` switches
  the limiter from per-claimed-IP to a global cap for deployments that sit directly on the internet.
- **Passwords**: 10+ characters with case, digit and symbol, blocked weak list, no repeated-character
  runs, bcrypt cost 12, and a 72-byte guard so bcrypt never silently truncates. Changing a password
  increments `sessionVersion`, which signs every other device out.
- **Admin console** at `/admin/emails`: verified-vs-pending counts, the queue of unverified accounts with
  their country/phone/code state, failed-login and lock status, and the last 30 transactions the platform
  sent (subject, recipient, transport, failure reason).

### Backend
28 API routes covering auth, applications, document uploads, visa letters, checkout, gateway callbacks,
webhooks, certificates (list, issue, verify, PDF), AI assistant, dashboard and admin operations. Uploaded
documents are written **outside the public web root** and served back through an authenticated route, so a
leaked URL cannot expose someone's CV.

---

## 3b. Official branding & the 3D layer

### The logo
The organisation's approved emblem is used verbatim — no redraw, no substitute.

| File | Purpose |
| --- | --- |
| `public/images/pypc-emblem-original.jpg` | Master artwork exactly as supplied |
| `public/images/pypc-emblem.png` | Transparent 900px PNG derived from the master (used in the 3D hero, footer, certificate PDF) |
| `public/images/pypc-emblem-on-dark.png` | Light-plate variant (white disc + gold rim) used automatically on dark surfaces — footer, closing band, dark hero plates — so the dark-green artwork stays legible |
| `public/images/pypc-emblem-512.png` / `-256.png` | Optimised sizes for headers, login/register and dashboards |
| `app/icon.png`, `app/apple-icon.png` | Favicon + iOS icon generated from the emblem |

To publish a new master artwork, replace `pypc-emblem-original.jpg`, regenerate the PNG sizes (the
background was removed by flood-filling the exterior white only, so interior detail is untouched), and
nothing else in the codebase needs to change.

### What is 3D
| Surface | Technology | Behaviour |
| --- | --- | --- |
| Home hero | three.js (WebGL) | 14,000 GPU points morph through disc → cube → sphere → plane, then settle and the official emblem resolves as a **12-layer extruded 3D slab** with a gold back-glow and a soft light plate so the dark-green artwork stays legible on the dark hero. Cursor, touch and scroll drive camera and scene rotation. |
| National reach | three.js | Wireframe globe with glowing city markers (Islamabad, Lahore, Karachi, Peshawar, Quetta, Gilgit, Muzaffarabad, Multan, Rawalpindi), orbit rings, pointer parallax, lazy-mounted on scroll. |
| Pillars, stats, journey, governance, cards | CSS 3D + Framer Motion | Real perspective tilt with cursor-tracked sheen, `translateZ` content layers, scroll reveals, floating ambient orbs, perspective grid floors, rotating ticker. |
| Figures | Framer Motion + rAF | Statistics count up on scroll with easeOutExpo. |
| Header emblem, page headers | CSS 3D + scroll parallax | Logo tilts on hover; oversized emblem watermark moves on the z-axis while scrolling. |
| Home hero backdrop + highlight band | Image carousel (Next/Image) | Auto-rotating hero imagery behind the WebGL emblem, plus a full highlight carousel with Prev/Next, pause and dot controls (paused on hover, no auto-advance under reduced motion). |
| Section backdrops (home, conferences, IMUN, partnerships, courses, research) | three.js | Floating wireframe torus, icosahedron, octahedron, dodecahedron and torus knot with a colour-varied particle haze, pointer-parallaxed and lazily mounted. |
| Research & records bands | 2D canvas | Connecting-dots network: drifting nodes link to each other and to the cursor. Cheap enough to sit under content. |
| Whole site | CSS + rAF | Preloader with a real readiness-tracking progress bar, custom cursor (dot + trailing ring with hover labels; disabled on touch/reduced-motion), magnetic CTAs, cursor repulsion on tile grids, typewriter headlines, scroll-progress bar, back-to-top, fixed social rail, full-screen mobile menu overlay, noise grain and a masked architectural grid. |

Performance and accessibility are handled deliberately:
- Canvases are only mounted when scrolled into view and are paused when off-screen.
- Device pixel ratio is capped (1.6 mobile / 2 desktop); particle count drops to 6,000 on small screens.
- If WebGL is unavailable, the hero falls back to the static emblem image — the page never breaks.
- `prefers-reduced-motion` disables morphing, parallax, orbs, marquee and tilt throughout.

### International participants, documents and the record registry

| Concern | Implementation |
| --- | --- |
| Currency | Every plan and course carries **both** a PKR and a USD price; checkout accepts `currency` and the international hub shows USD first. |
| Time zones | `components/features/timezone-panel.tsx` converts the published Pakistan Standard Time schedule into the visitor's own timezone in the browser. |
| Visa letters | `VisaLetterRequest` model + `POST /api/international/visa-letter` (auth required, one open request per member, ownership-checked attachments) and `PATCH /api/admin/visa-letters` for the secretariat decision. Issuing notifies the member and writes an audit entry. |
| CV / resume upload | `POST /api/uploads/resume` accepts PDF/DOC/DOCX up to 5 MB, verifies the **file signature** (not just the extension), stores it under `private/uploads/resumes/` and returns an authenticated URL. `GET /api/uploads/resume/[file]` serves it to the owner or staff only. Wired into the application form, the member profile and the visa-letter form. |
| Honesty guardrails | The platform states what it cannot do: no visa guarantees, no accreditation claims, no "partnership" without a signed MoU, and every planning-stage figure (IMUN dates, venue, PKR 5–10 crore budget) is explicitly labelled as unapproved. |
| Real documents | The eight institutional PDFs supplied by the organisation are published under `public/documents/` and linked from the records registry, conference page, policy index and partnership page with their real reference numbers. |

### Live data
`/api/platform/activity` powers the hero's live strip (latest programme, event, opportunity and
certificate activity). It returns **aggregate, non-personal data only** — no member names, emails,
phones or payment details are ever exposed publicly — and is cached for 30 seconds.


---

## 4. Environment variables (`.env`)

```env
DATABASE_URL="file:./dev.db"              # Postgres URL in production
AUTH_SECRET="<openssl rand -base64 32>"   # rotate for production
SESSION_COOKIE_NAME="pypc_session"
NEXT_PUBLIC_APP_URL="http://localhost:3000"   # set to your real domain — used in QR codes & gateway redirects

STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET
JAZZCASH_MERCHANT_ID / JAZZCASH_PASSWORD / JAZZCASH_INTEGRITY_SALT / JAZZCASH_MODE
EASYPAISA_STORE_ID / EASYPAISA_HASH_KEY / EASYPAISA_MODE
OPENAI_API_KEY / OPENAI_MODEL            # blank = assistant uses the curated knowledge base only
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / SMTP_SECURE / MAIL_FROM
EMAIL_DEV_MODE="false"                   # true only on a local machine; shows the code on screen
TRUST_PROXY_HEADERS="true"               # false when the app is exposed directly to the internet
PAYMENTS_SIMULATION_MODE="true"          # dev only; ignored in production builds
```

### Email verification — how to turn it on
1. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (and `SMTP_SECURE=true` for port 465) plus
   `MAIL_FROM` to a mailbox you own. Any SMTP provider works — Google Workspace, Zoho, Amazon SES,
   SendGrid, Mailgun, Postmark.
2. Leave `EMAIL_DEV_MODE="false"` in production. With SMTP configured, codes and links go to real inboxes.
3. With **no** SMTP configured the platform still works: messages are stored in the `EmailOutbox` table and
   printed to the server log, and `EMAIL_DEV_MODE=true` additionally surfaces the six-digit code on the
   verify screen so the flow can be demonstrated. This is clearly labelled on the page and in the outbox —
   it is never silent.
4. Publish **SPF, DKIM and DMARC** for the sending domain, or verification mail will land in spam and
   members will tell you the code never arrived.

### Payment behaviour — stated honestly
- A gateway is **selectable only when its credentials exist**. Otherwise checkout returns `503` with a message telling you exactly which environment variable is missing, and the option appears disabled in the UI. Nothing pretends to charge.
- `PAYMENTS_SIMULATION_MODE=true` (development only) adds a clearly-labelled **Simulated** gateway so the complete journey — plan → order → payment → membership activation → certificate — can be tested before merchant accounts are approved. It is hard-disabled when `NODE_ENV=production`.
- JazzCash uses HMAC-SHA256 over alphabetically sorted fields with the integrity salt; the callback re-computes the hash before activating a membership.
- Easypaisa uses AES-128-CBC encryption with the merchant hash key; the callback decrypts and verifies before activating. Confirm the exact parameter set issued with your merchant account during onboarding and adjust `EASYPAISA_FIELDS` if your product differs — the plumbing stays the same.
- Stripe Checkout + webhook with signature verification (`checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`).
- Membership activation is **idempotent** (`lib/orders.ts`), so gateway retries can never double-activate or double-notify.

---

## 5. Certificates and QR verification

- Codes are unique and human-safe: `PYPC-XXXX-XXXX-XXXX` (alphabet excludes 0/O/1/I).
- Every certificate has a QR encoding `{NEXT_PUBLIC_APP_URL}/verify/{CODE}`.
- The public record shows recipient name, title, issuing programme/event, issue date, grade and live status (**Valid / Expired / Revoked**). Contact details are never exposed.
- Verification increments a counter; expiry is applied automatically; revocation records a reason and notifies the member.
- `/api/certificates/pdf?code=…` renders an A4-landscape PDF (frame, e-signature block, embedded QR) and counts the download. Access is limited to the holder, staff, or any viewer when the certificate is VALID.

---

## 6. Production checklist

1. **Database** — switch `provider = "postgresql"` in `prisma/schema.prisma` and point `DATABASE_URL` at Supabase/Neon/RDS, then `npx prisma migrate deploy` (or `db push`).
2. **Secrets** — new `AUTH_SECRET`; remove demo accounts or change their passwords; set `PAYMENTS_SIMULATION_MODE="false"`.
2b. **Email** — configure `SMTP_*` + `MAIL_FROM`, set `EMAIL_DEV_MODE="false"`, and publish SPF/DKIM/DMARC
   for the sending domain so verification mail is delivered rather than filtered. Without SMTP, signups
   cannot complete: that is intentional, because an unverified account must not be treated as a member.
2c. **Proxy** — leave `TRUST_PROXY_HEADERS="true"` behind Cloudflare/nginx/a platform router; set it to
   `"false"` if the Node process is reachable directly, so rate limits cannot be bypassed with a forged
   `X-Forwarded-For` header.
3. **Domain** — `NEXT_PUBLIC_APP_URL=https://yourdomain.org` before building, so QR codes and gateway redirects use the live host. Register the Stripe webhook and the JazzCash/Easypaisa return URLs against that domain.
4. **Legal** — have the Privacy Policy, Terms (governing law/jurisdiction), Refund Policy and Code of Conduct reviewed by PYPC's legal advisor. Tax/company registration and merchant onboarding are organisation responsibilities.
5. **Deployment** — Vercel/Netlify/Render or a VPS with Node 20. Keep `.env` out of version control; `.gitignore` already excludes it.
6. **Backups** — enable automated database backups and restrict database credentials to the app.

### Content that only the organisation can supply
These are deliberately left empty rather than filled with invented data:
- Official telephone number (currently "to be published")
- Confirmed national council members, designations and photographs (`/leadership` reads real records from the database)
- Registered address, SECP/NTN details, banking details for direct transfers

---

## 7. Project structure

```
app/
  page.tsx                  Public homepage
  about · leadership · faq · contact
  programmes/[slug] · events/[slug] · opportunities/[slug]
  membership · membership/checkout · membership/success · membership/simulate
  verify · verify/[code]
  login · register
  international · international/visa-letter
  conferences · conferences/imun-2027 · courses · research · records · partnerships · policies
  privacy · terms · refund-policy · code-of-conduct
  dashboard/                9 member pages (overview, profile, membership, applications,
                            certificates, events, visa-letters, security, support)
  admin/                    11 staff pages (overview, users, applications, payments,
                            certificates, programmes, events, opportunities, messages,
                            visa-letters, audit)
  api/                      28 route handlers (auth, applications, uploads, visa letters,
                            checkout, gateways, webhooks, certificates, AI, dashboard, admin)
components/
  theme/      ThemeProvider + the Light/Dark/System switcher
  layout/     logo, header, nav, footer, page hero, policy renderer
  ui/         button, card, field, icon registry, country picker, dial-code phone field,
              password field (strength meter + live rules + caps-lock warning)
  motion/     reveal animation, tilt cards, counters, parallax emblem
  three/      WebGL scenes (hero emblem, reach globe, wireframe field) + shared utils
  experience/ preloader, custom cursor, noise/grid ambient layer, connecting-dots,
              scroll-spy, magnetic hover, typewriter
  features/   checkout, verification, application, contact, auth forms, AI widget, content cards
  dashboard/  shell, profile form, password form, certificate card
  admin/      role/status controls, application review, certificate controls, content toggles
lib/
  auth.ts · prisma.ts · audit.ts · orders.ts · certificates.ts · constants.ts · utils.ts
  validations/ (zod) · payments/ (stripe, jazzcash, easypaisa, registry)
  uploads.ts (private document storage)
  ai/ (knowledge base, assistant, suggestions)
  data/ (policies, faq, international, correspondence, conferences, courses)
private/uploads/resumes/  Non-public CV storage (never served statically)
public/documents/         The organisation's eight institutional PDFs
prisma/  schema.prisma · seed.ts
middleware.ts            Edge guard for /dashboard and /admin
```

---

## 7b. Verifying it yourself

Run the site (`npm run dev` or, for a production check, `npm run build && npm start`) and then:

```bash
node scripts/smoke-routes.mjs             # every public route + protected redirects
node scripts/check-health.js              # the site's own /api/status report
node scripts/check-theme-and-password.js  # theme wiring + the password policy (25 checks)
node scripts/check-registration.js        # signup → verification → login + anti-abuse (25 checks)
node scripts/check-connectivity.js        # database, uploads, applications, payments, AI, admin
node scripts/check-payments-dev.js        # payment → membership chain (against `npm run dev`)
node scripts/check-imun-2027.js           # IMUN 2027: 21 sections, live counters, signatories
node scripts/check-authz.mjs              # 18 authorisation checks across three accounts
node scripts/check-secrets.js             # no live key anywhere in the tree
node scripts/db-backup.js                 # timestamped backup + checksums
node scripts/db-restore-test.js           # restore drill against that backup
node scripts/db-clean.js                  # strip test residue from the database
```

`check-registration.js` resets only its own throwaway accounts (`e2e.*`, `burst*`) and the rate-limit
buckets, so it is safe to re-run against a working database. It reads `DATABASE_URL` from the environment
and falls back to `prisma/dev.db`.

To see the verification email locally, watch the terminal: with no SMTP configured the platform writes the
message to the outbox table **and** prints it to the server log. With `EMAIL_DEV_MODE="true"` the six-digit
code is also shown on the verify screen, clearly labelled as a development aid.

## 8. Notes for the technical reviewer

- Sessions are custom JWT cookies signed with `jose` (HS256). A password change increments `sessionVersion`, invalidating every other session. Suspended/rejected accounts are rejected at every request.
- The audit log is append-only: no application code deletes records. Deleting a certificate is restricted to super admins; other admins are downgraded to revocation so the trail survives.
- Duplicate applications to the same item are blocked while an application is open, and the existing reference is returned to the member.
- The AI assistant **never invents** fees, dates, names or policies: it answers from `lib/ai/knowledge-base.ts` and escalates unknown or sensitive questions to the secretariat (recorded as `AI_ESCALATION_REQUESTED`).
- The assistant answers in the language it is asked in — **English, Urdu script or Roman Urdu** (`lib/ai/language.ts`) — and quotes **live** database figures (`lib/ai/live-data.ts`): current prices, published events, open opportunities, valid certificates, visa-letter counts. Streaming answers arrive as Server-Sent Events, so the widget shows the language badge and live figures first, then the text builds up. `npm run check:ai` proves all of it (58 assertions).
- Edge middleware only checks cookie presence (Prisma cannot run on the edge); full authorisation is enforced server-side in the layouts and every API route.
- `npm run typecheck` and `npm run build` both pass (Next 14.2.35). All 31 public routes were swept against the production build
  (HTTP 200, WebGL canvases present where expected) and all five protected routes redirect
  anonymous visitors to sign-in; the upload pipeline was verified
  end-to-end (owner 200 / anonymous 401 / staff 200, spoofed "PDF" rejected with 422, foreign attachments
  refused with 403); the visa-letter flow was verified from request (201, `PYPC-VISA-…`) through the
  duplicate guard (409) to the secretariat decision and member notification; and the full
  payment→membership→certificate journey was verified against the seeded database.
- The hardened signup journey was verified against the running production build: register → `201`
  `requiresVerification` (no cookie) → unverified login `403 EMAIL_NOT_VERIFIED` → wrong code `400 INVALID`
  → resend `200` → correct code `200` + session → dashboard `200` → code reuse `400 ALREADY_VERIFIED` →
  login `200`. In the same run: invalid syntax / disposable domain / wrong-country number / weak password
  all `422`, a filled honeypot is answered `201` exactly like a real signup, a bot-speed submit `422`, the
  6th signup from one IP `429` (5/hour cap), a cross-origin POST `403`, and the seeded accounts plus
  `/admin/emails` still work — 24 of 24 checks.
- The colour theme is verified on the built site: the inline theme script ships in `<head>`, the three-way
  switcher renders on desktop and in the mobile overlay, the compiled stylesheet carries the `html.dark`
  layer (87 rules), and the dark-specific emblem is served. The password policy is verified against the live
  server — six disguised weak passwords refused, the member's own name refused, a strong password accepted
  and signed in first time, an over-long paste refused with guidance, and a mismatched confirmation caught
  (25 of 25 checks in `scripts/check-theme-and-password.js`).
- Reduced-motion and mobile behaviour are tested: no auto-advancing carousel, no custom cursor, tilt and
  orbs disabled, hero falls back to a static emblem when WebGL is unavailable.

---

© Pakistan Youth Parliamentary Council. Built as a complete, production-oriented codebase.
