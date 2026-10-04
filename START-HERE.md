# Pakistan Youth Parliamentary Council — run this package in two minutes

This folder is the **complete** PYPC platform: public site, member dashboard, admin panel,
API backend, SQLite database **with the seeded content already inside**, the digital assets and
the eight institutional PDFs. Nothing needs to be typed twice and no file is missing.

```
pypc-website/
├── app/                 pages + 28 API route handlers (frontend + backend)
├── components/          UI, 3D/WebGL scenes, motion, forms
├── lib/                 business logic (auth, payments, certificates, email, validation)
├── prisma/
│   ├── schema.prisma    the database definition (SQLite here, Postgres one line away)
│   ├── seed.ts          the seed script
│   └── dev.db           ← the seeded database: members, plans, programmes, events,
│                          opportunities, certificates and demo data are already in it
├── public/              emblem, images, and the 8 genuine PYPC PDFs (`public/documents`)
├── private/             private file storage for uploaded CVs / certificates (not web-visible)
├── scripts/             the four self-checks used to verify this build
├── .env                 working development configuration (see the warning inside)
└── package.json         every dependency with its exact locked version
```

---

## 1. Prerequisites

* **Node.js 20 or newer** (`node -v`) — that is the only requirement.
  Get it from <https://nodejs.org> if it is not installed.
* One command needs internet: `npm install` (it downloads the dependencies listed in
  `package-lock.json`). Everything else runs offline, because the database is already inside this
  folder.

## 2. Start it

### Windows
Double-click **`setup.bat`**, or in a terminal:

```bat
setup.bat
```

### macOS / Linux
```bash
chmod +x setup.sh && ./setup.sh
```

The script does the four steps in order and tells you what it is doing:

1. `npm install` — install the exact dependency versions
2. `npx prisma generate` + `npx prisma db push` — prepare the database client (the data is already in `prisma/dev.db`)
3. `npm run db:seed` — refresh the demo accounts and demo content (idempotent, safe to repeat)
4. `npm run build` then `npm start`

When it finishes, open **<http://localhost:3000>**.

### Doing it by hand (four commands)

```bash
npm install
npx prisma generate && npx prisma db push
npm run db:seed        # optional — the database already contains this data
npm run build && npm start
```

For development with hot reload use `npm run dev` instead of `npm run build && npm start`.

## 3. Sign in

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@pypc.org.pk` | `Pypc@2026` |
| Executive | `executive@pypc.org.pk` | `Pypc@2026` |
| Member | `member@example.com` | `Pypc@2026` |

Certificate verification codes to try at `/verify`:

* `PYPC-A2B4-C6D8-E9F1` → **Valid**
* `PYPC-Z9Y8-X7W6-V5U4` → **Revoked**

**New sign-ups are verified by email before they get access.** With no SMTP server configured the
verification message is stored in the `EmailOutbox` table and printed in the terminal, and because
`.env` ships with `EMAIL_DEV_MODE="true"` the six-digit code is also shown on the verify screen —
clearly labelled as a development aid. Add your SMTP details and set `EMAIL_DEV_MODE="false"` for
real delivery (README §4).

## 4. Prove it is all connected

With the server running, in a second terminal:

```bash
npm run check:routes        # every public route + protected redirects
npm run check:health        # the site's own /api/status report
npm run check:auth          # sign-up → email verification → login, plus the anti-abuse rules
npm run check:theme         # light/dark/system theme wiring + the password policy
npm run check:connectivity  # database, uploads, payments, certificates, AI, admin console
npm run check:contrast      # WCAG 2.1 AA contrast audit of the whole palette (49 pairs)
npm run check:responsive    # responsive + iOS/Android installability, at source and CSS level (63 checks)
npm run check:imun          # IMUN 2027 page content, live counters and honesty (29 checks)
npm run check:social        # four official profiles + mailboxes + phone under one handle (55 checks)
npm run check:ai            # AI assistant in English/Urdu/Roman Urdu + retrieval matrix (70 checks)
npm run check:perf          # response-time budget for every page, API and the assistant (47 checks)
npm run check:2fa           # two-factor enrolment, recovery codes and the sign-in step (26 checks)
npm run check:audit-chain   # tamper test on a database copy; the console must name the broken row (9 checks)
npm run check:partnerships  # partner-university / MoU requests, end to end (38 checks)
npm run check:suites        # runs every suite above and adds up the real totals (517 checks, 13 suites)
```

**Design and responsiveness are verified too.** `check:contrast` measures the real WCAG contrast
ratio of every text/background pair in both themes and fails if any pair drops below AA.
`check:responsive` inspects the source *and* the CSS the browser actually receives: no `100vh`
layouts (`dvh` instead), no table without a scroll wrapper, no unguarded fixed width, `clamp()`
fluid type, safe-area insets, hover effects limited to real pointers, and rules for all four
breakpoints (640/768/1024/1280).

**The site can also report on itself.** Open **<http://localhost:3000/status>** in the browser (or
`GET /api/status` for JSON): it queries the database, probes the storage folder, reads the email
transport and the payment adapters on every request, and shows what is operational, what still needs
credentials, and the live record counts. Nothing on that page is hard-coded, and it exposes no secrets —
point any uptime monitor at `/api/status` and it will answer `503` only when something is genuinely broken.

`check:connectivity` is the end-to-end proof: it registers a member, verifies the code, reads the
row back, uploads a real PDF, downloads it as the owner (and is refused anonymously), files an
application, is stopped by the duplicate guard, verifies a certificate and downloads its PDF,
checks out and settles a payment, requests an international visa letter, has staff issue it,
talks to the AI assistant, submits the contact form and then confirms every one of those rows in
the database through the admin console. It cleans up after itself.

## 4.04 The IMUN 2027 conference page

`/conferences/imun-2027` is the flagship: twenty-one sections covering the concept
note end to end — at-a-glance facts, the flag parade built from the real country
catalogue, the two shortlisted Islamabad venues (both openly marked *not yet
booked*), the cultural programme, the four scholarship tiers, the planned budget
split, the milestone timeline, twelve workstreams with their live progress, and an
honest comparison against a standard Model UN weekend.

Two things to notice: the registration counters at the top are read from the
database on every request (register interest on the events page and the number
moves), and every planning-stage figure is labelled as a target, with the concept
note reference (PYPC/IMUN/2027/CN-01) shown wherever those figures appear.

## 4.05 Documentation

`docs/` holds five short documents: `ARCHITECTURE.md` (how it is built),
`FOLDER-STRUCTURE.md` (every folder, one line each), `DESIGN-SYSTEM.md` (palette,
contrast and responsive rules), `CONTACT.md` (official channels) and
`VERIFICATION.md` (every check and its result).

The site also keeps itself honest in real time: the footer pill polls
`/api/status` once a minute and shows how fresh the reading is; the header, the
mobile menu and the 3D canvas react instantly to rotation and resizing; and if the
network drops, a high-contrast bar appears rather than letting a form fail
silently.

## 4.1 Contact channels

The footer of every page, the contact page and the outgoing emails use the organisation's real
details, defined once in `lib/constants.ts` (override with `NEXT_PUBLIC_CONTACT_*` in `.env`):

* **Phone / WhatsApp:** +92 315 5729598 (tap-to-call and `wa.me` links on mobile)
* **Email:** pypcofficial@gmail.com (primary) · officialpypc@gmail.com (secondary)
* **Office hours:** Monday–Saturday, 10:00–18:00 PKT (GMT+5); every country is served.

## 5. What is deliberately *not* in this folder

| Not included | Why | What to do |
| --- | --- | --- |
| `node_modules/` | ~450 MB of platform-specific files; the exact versions are pinned in `package-lock.json` | `npm install` (step 1) |
| `.next/` | the compiled build; it is generated for *your* machine so it starts cleanly | `npm run build` |
| Live API keys | Stripe / JazzCash / Easypaisa / OpenAI keys belong to PYPC — nothing pretends they exist | paste them into `.env`; without them checkout says exactly which variable is missing and the AI assistant answers from the knowledge base |

Everything else — source, database with data, assets, PDFs, configuration — is inside.

## 6. Going to production

`README.md` §6 is the checklist: Postgres, a fresh `AUTH_SECRET`, real SMTP with SPF/DKIM/DMARC,
`PAYMENTS_SIMULATION_MODE="false"`, your domain in `NEXT_PUBLIC_APP_URL`, and staff accounts with
new passwords. Two lines of pre-flight:

```bash
grep -n "AUTH_SECRET\|EMAIL_DEV_MODE\|PAYMENTS_SIMULATION_MODE" .env
```

If you are hosting on Vercel/Netlify/Render, set the same variables in the dashboard's environment
settings instead of shipping `.env`, and run `npx prisma migrate deploy` against the Postgres URL.
