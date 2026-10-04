# Go-live runbook — domain, hosting, email, monitoring

This is the operator's checklist for moving PYPC from a preview URL to the real
thing: **pypc.org** (or `pypcofficial.org` / `pypc.pk`), with professional
mailboxes and monitoring. It is written to be followed once, top to bottom, by
someone who is not a developer.

Everything the application needs is already in this package. Nothing below
requires editing source code: the domain, mailboxes, social handles, payment
keys and monitoring DSN are all environment variables.

---

## 1. Choose and register the domain

| Option | Why you would pick it | Notes |
| --- | --- | --- |
| **pypc.org** | Matches the abbreviation everyone uses; `.org` reads as non-profit to funders and universities | Check availability first; the `.org` registry does not sell to trademark squatters, which protects you |
| **pypcofficial.org** | Longer, but unambiguous — matches the social handle exactly | Best if `pypc.org` is taken |
| **pypc.pk** | Local trust, fast resolution inside Pakistan, cheaper | Pair it with a `.org` if the budget allows |

**Register through a registrar you can reach by phone** (Namecheap, Cloudflare
Registrar, or a local registrar such as PakNIC for `.pk`). Turn on **registrar
lock** and **auto-renew** immediately — an expired domain takes the mailboxes
down with it.

Whichever you choose, point the other two at it later as redirects.

---

## 2. Email (do this before the domain is public)

Professional mailboxes are the single biggest credibility signal after the
domain, and they must work *before* the site goes live, because verification
emails send from them.

**Recommended: Google Workspace** (Business Starter, ~$6/user/month) or
**Microsoft 365 Business Basic** for university partners who expect Teams.

Create these:

| Mailbox | Purpose | Where it appears on the site |
| --- | --- | --- |
| `secretariat@pypc.org` | Everything official: applications, members, partners | Primary contact, email `From:` address |
| `info@pypc.org` | General enquiries, press | Secondary contact |
| `certificates@pypc.org` *(optional)* | Verification and issuance questions | Certificate pages |
| `payments@pypc.org` *(optional)* | Billing and refunds | Refund policy |

> The platform currently ships with the Gmail addresses the secretariat supplied
> (`pypcofficial@gmail.com`, `officialpypc@gmail.com`). Once the domain mailboxes
> exist, change two variables and every page, email, PDF and social card follows:
>
> ```env
> NEXT_PUBLIC_CONTACT_EMAIL_1="secretariat@pypc.org"
> NEXT_PUBLIC_CONTACT_EMAIL_2="info@pypc.org"
> EMAIL_FROM="PYPC Secretariat <secretariat@pypc.org>"
> ```
>
> **DNS records you must add** (the mail host gives you exact values):
> - `MX` → the mail provider
> - `SPF` (`v=spf1 include:_spf.google.com ~all`)
> - `DKIM` (a long `TXT` record — copy it exactly)
> - `DMARC` (`v=DMARC1; p=quarantine; rua=mailto:secretariat@pypc.org`)
>
> Without SPF, DKIM and DMARC, verification emails land in spam and members
> cannot activate their accounts. Check with `mail-tester.com` — aim for 9/10 or
> better.

---

## 3. Hosting

Two supported paths. Both work with this package unchanged.

### Option A — Vercel (simplest)

1. Push this folder to a Git repository (GitHub or GitLab).
2. Import it at vercel.com → framework is detected as Next.js.
3. Add every variable from `.env.example` in **Settings → Environment Variables**
   (at minimum `AUTH_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, the two
   contact mailboxes and `EMAIL_FROM`).
4. **Switch the database to Postgres.** SQLite (`file:./prisma/dev.db`) is for
   local development only — a serverless host has no persistent disk. Create a
   free Neon or Supabase database, set `DATABASE_URL` to its connection string,
   and change the provider in `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
   Then run `npx prisma db push` and `npm run db:seed` once against it.
5. Add the domain in **Settings → Domains**, then in your registrar:
   - `A` record: `@ → 76.76.21.21`
   - `CNAME`: `www → cname.vercel-dns.com`
6. **Vercel Hobby (free) is not appropriate for this.** It prohibits commercial
   use, has no team access, and no SLA. Use **Pro** ($20/month) — that is the
   "free tier limitations hatao" step.
7. HTTPS and certificate renewal are automatic. HSTS is already sent by the app
   (`next.config.mjs`), so HSTS preload can be submitted afterwards.

### Option B — Cloudflare (cheapest at scale, best edge)

1. Put the domain on Cloudflare's nameservers first (free plan is fine for DNS).
2. Host the app on any Node host that gives you a container — **Fly.io**,
   **Railway** or **Render**. The package runs with:
   ```bash
   npm ci && npx prisma generate && npx prisma db push && npm run build && npm start
   ```
   It listens on `0.0.0.0:3000` (`PORT` respected by `next start`).
3. In Cloudflare: **SSL/TLS → Full (strict)**, **Always Use HTTPS: on**,
   **Automatic HTTPS Rewrites: on**, **Min TLS 1.2**, **HSTS: on** (6 months,
   include subdomains, preload).
4. Add a cache rule for `/images/*`, `/_next/static/*` (Cache Everything, long
   edge TTL). The app already sends `immutable` on images, so this is a no-op for
   correctness and a large win for global speed.
5. Turn on **Bot Fight Mode** and a rate-limiting rule for `/api/auth/*`
   (e.g. 20 requests/minute per IP) — the app rate-limits too, but the edge
   absorbs the noise.

**Database for either option:** Neon, Supabase or Railway Postgres. Take the
connection string with `?sslmode=require`, and set up automated daily backups in
the provider's dashboard as well as the app's own `npm run db:backup`
(see `docs/BACKUP-POLICY.md`).

---

## 4. Monitoring

The application logs every error locally, with no vendor required. To forward
them as well, set one DSN — both boundaries (`app/error.tsx` and
`app/global-error.tsx`) already report through `lib/monitoring.ts`, the payload
is scrubbed of personal data, and no SDK is added to the bundle:

```env
SENTRY_DSN="https://<key>@o<org>.ingest.sentry.io/<project>"
NEXT_PUBLIC_SENTRY_DSN="https://<key>@o<org>.ingest.sentry.io/<project>"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

Alternative accepted DSNs: any Sentry-compatible endpoint (GlitchTip, Bugsink)
works, because the format is Sentry's store API.

**Uptime monitoring** — point one of these at `/api/status` (it returns a JSON
health report) and at `/`:

- Better Stack / UptimeRobot (free tiers cover one monitor and 5-minute checks)
- Both support email + SMS alerts; give it a phone number someone actually reads

The `/status` page in the site is a **self-report** — it shows the app's own view
of the database, storage and email transport. It is not an external uptime
monitor, and it should not be presented as one; the external monitor is what
tells you when the whole host is down.

**Analytics** — opt-in, same principle:

```env
NEXT_PUBLIC_GA4_ID="G-XXXXXXXXXX"      # Google Analytics 4
NEXT_PUBLIC_CLARITY_ID="xxxxxxxxxx"    # Microsoft Clarity (heatmaps, session replay)
```

With both empty, no analytics script loads and no cookie is set.

---

## 5. Payments

| Gateway | Audience | Variables |
| --- | --- | --- |
| **Stripe** | International, USD | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **JazzCash** | Pakistan | `JAZZCASH_MERCHANT_ID`, `JAZZCASH_PASSWORD`, `JAZZCASH_INTEGRITY_SALT` |
| **Easypaisa** | Pakistan | `EASYPAISA_STORE_ID`, `EASYPAISA_HASH_KEY` |
| **Bank transfer** | Institutions, large amounts | Manual — approved in `/admin/payments` with mandatory evidence |

For production: set `PAYMENTS_SIMULATION_MODE="false"` (the app refuses the
developer gateway in a production build by design) and add the Stripe webhook
endpoint `https://pypc.org/api/payments/stripe/webhook` in the Stripe dashboard,
subscribing to `checkout.session.completed` and `payment_intent.payment_failed`.
The handler is idempotent, so a retried delivery cannot double-activate a
membership.

---

## 6. The switch-over checklist

Run these **in order** on the day:

1. `NEXT_PUBLIC_APP_URL="https://pypc.org"` in the host's environment.
2. `npx prisma db push` against the production database (creates tables).
3. `npm run db:seed` — writes the three membership plans, programmes, events and
   opportunities. **Then change the seeded admin password** immediately, and
   delete the sample member account if you do not want it.
4. `npm run scan:secrets` — must be clean before the repo is pushed.
5. `npm run build` → confirm `58/58` pages.
6. Deploy, then confirm in a browser: homepage renders, membership page shows its
   tiers, `/verify` works, a test registration email arrives (check spam too).
7. Point the external uptime monitor at `https://pypc.org/api/status`.
8. Submit `https://pypc.org/sitemap.xml` to Google Search Console, and request
   indexing for the homepage.
9. Add the domain to the Organisation structured data (automatic — it reads
   `NEXT_PUBLIC_APP_URL`).
10. Update the social profiles' website field to the new domain, so the
    LinkedIn / Instagram / Facebook / YouTube profiles point back.

---

## 7. What is deliberately *not* automated

Being explicit about this is part of the handover:

| Item | Why it needs a human | Owner |
| --- | --- | --- |
| Domain purchase and DNS | Registration is a legal act tied to an entity | Secretariat |
| Mailbox creation and SPF/DKIM/DMARC | Requires access to the mail provider | Secretariat |
| Legal review of the policies | Privacy and refund wording depends on how PYPC is registered and where it operates | Legal adviser |
| Payment merchant onboarding | Stripe and JazzCash require business documents | Finance |
| Sentry / uptime account | Free tiers need an account holder's email | Technology lead |
| Photography and testimonials | Consent and releases are per-person | Communications |

Each of these can be finished in a day once the account exists; none of them
blocks the technical deployment.

---

## 9. Round-7 additions: two new secrets, and real uptime monitoring

### 9.1 Environment values to set in production

| Key | What it does | Notes |
| --- | --- | --- |
| `HUMAN_CHECK_SECRET` | Signs the self-hosted human check on registration, contact and newsletter forms. | Falls back to `AUTH_SECRET` if unset. Set it explicitly so the two secrets are independent. Rotating it invalidates only challenges already open — nobody is locked out. |
| `HUMAN_CHECK_REQUIRED` | Set to `"false"` **only** in an automated test environment to skip the human check. | Leave it unset or `"true"` in production. |
### Partnership requests once you are live

Incoming requests land in **Admin → Partnerships & MoUs** the moment they are sent, and a copy is mailed
to `NEXT_PUBLIC_CONTACT_EMAIL_1`. Two operational habits keep the published process true:

1. **Acknowledge inside ten working days.** That is the turnaround printed on `/partnerships`; the
   confirmation email quotes it, so a queue that goes quiet is a promise broken.
2. **Publish nothing before it is countersigned.** The page states the rule; the newsroom entry for a
   new partner should quote the agreement reference in the same way the records register does.

| `AUDIT_CHAIN_SECRET` | Keys the SHA-256 audit chain, so the log cannot be forged even by someone who can write to the database. | Falls back to `AUTH_SECRET`. **Export the audit log before rotating it** — an existing chain cannot be re-verified with a new key. |
| `AUDIT_ALLOW_RECHAIN` | Set to `"true"` on the server *temporarily* to allow the admin rebuild endpoint (`POST /api/admin/audit/rechain`, used by `npm run audit:rechain`). | Leave unset. It is the only way to rebuild a chain, and a live chain should never need rebuilding: every fork and mutation path is closed (see `docs/VERIFICATION.md`, *Keeping the chain honest*). Turn it on only for a documented repair, run the rebuild, then turn it off and restart. |
| `FRAME_ANCESTORS` | Optional CSP directive limiting who may embed the site. | Default `https:` (any secure embed). Tighten to `'self'` plus named partner hosts once you know them. |

Analytics stays off until `NEXT_PUBLIC_GA4_ID` and/or `NEXT_PUBLIC_CLARITY_ID` are set; the cookie
policy already describes them as disabled-until-enabled.

### 9.2 Uptime monitoring that is genuinely external

The status page reports the platform's own view of itself, which is necessary but not sufficient: a
server that is down cannot tell you it is down. Point an external monitor at the public health endpoint:

1. Create a monitor with **UptimeRobot**, **Better Uptime** or **Statuspage**.
2. URL: `https://<your-domain>/api/status`
3. Expect **HTTP 200**. Treat a non-200, or a body whose `overall` field is not `ok`, as down.
4. Interval: 5 minutes. Alert to the secretariat mailbox and, optionally, SMS.
5. Create a second monitor on `/` with a keyword check for `Pakistan Youth Parliamentary Council` —
   this catches the case where the app answers but renders nothing.

Record the monitor URL in the launch checklist so it can be re-created if the account is lost.

### 9.3 What the second round of round-7 work added to the platform

| Added | Where | Proof command |
| --- | --- | --- |
| Self-hosted human check (no third-party CAPTCHA) | `lib/security/human-check.ts`, `/api/human-check`, `components/forms/human-check.tsx` | `npm run check:connectivity` |
| Optional two-factor authentication (TOTP, RFC 6238) | `lib/auth/totp.ts`, `/api/dashboard/2fa`, Dashboard → Security | `npm run check:2fa` (26 checks) |
| Tamper-evident audit chain | `lib/audit.ts`, admin console banner | `npm run check:audit-chain` (9 checks) |
| Cookie policy | `/cookies` | `npm run check:routes` |
| Impact page + generated PDF report | `/impact`, `public/reports/pypc-impact-report-2026.pdf` | `npm run check:connectivity` |
| Calendar export (`.ics`, Google, Outlook) | `lib/calendar.ts`, `/api/events/[slug]/ics` | `npm run check:connectivity` |
| Double opt-in newsletter | `/api/newsletter`, newsroom sign-up | `npm run check:connectivity` |
| Site-wide search | `/search`, `lib/search.ts` | `npm run check:connectivity` |
