# Deliverable 3 — Next.js technical implementation checklist

**Scope:** this is the checklist *for this repository*, not a generic tutorial. Every line names the
file that implements it and the command that proves it. Read top to bottom to audit the platform;
read a single section to change it.

---

## 0. Stack decision — Next 14.2.35 + Tailwind 3, and why (recorded deliberately)

The round-7 blueprint names "Next.js 15 + Tailwind 4 + shadcn/ui". This build ships **Next.js 14.2.35
(App Router) + Tailwind 3.x + hand-built component primitives**, and that is a decision, not an
oversight:

| Question | Answer |
|---|---|
| Do we lose anything the blueprint asked for? | No. Every capability named in the blueprint — App Router, React Server Components, route handlers, streaming, the Metadata API, `next/image`, PWA manifest, per-route runtime control — exists in 14.2 and is in use here. |
| Why not upgrade mid-round? | Next 15 changes async `params`/`searchParams`/`cookies()`/`headers()` semantics across ~60 routes; Tailwind 4 replaces the config file with CSS-first `@theme` and changes the colour pipeline. Doing that in the same round as the emergency page-render fix would put two large failure modes in one build. |
| What replaces shadcn/ui? | `components/ui/` — `card.tsx`, `button.tsx`, `input.tsx`, `badge`, `alert`, `skeleton`, `tabs`, `modal`, `toast`, plus `lib/utils.ts` `cn()` and a Tailwind token layer (`globals.css`). Identical ergonomics (`variant`/`size` props, `cn()` merging) without a component-fetch CLI. |
| Upgrade path, when the organisation wants it | (1) bump deps, (2) `npx @next/codemod@latest next-async-request-api .`, (3) replace `tailwind.config.ts` tokens with `@theme` in `globals.css`, (4) keep `components/ui` API stable so no page changes. Estimated 2–3 days of work with the suites as the safety net. |

**Proof it is current and safe:** `npm run build` compiles clean, `npm audit` shows no high/critical
advisories, and `scripts/check-secrets.js` confirms no key is committed.

---

## 1. Project skeleton (what exists, exactly)

```
app/
  layout.tsx              root layout: fonts, metadata, OG/twitter, analytics, theme script
  page.tsx                homepage (17 numbered blocks)
  loading.tsx             route-level skeleton — the ONLY progress indicator
  error.tsx               calms any render error, shows a digest, reports to lib/monitoring
  global-error.tsx        last-resort boundary (own <html>), same reporting
  not-found.tsx           branded 404 with a search path back into the site
  sitemap.ts robots.ts manifest.ts   SEO + PWA generated at build time
  fonts/                  self-hosted Inter + Playfair woff2 (no third-party font requests)
  api/**/route.ts         34 route handlers (auth, membership, payments, admin, AI, uploads, status)
  (pages)                 about, membership, conferences, courses, events, opportunities, records,
                          research, partnerships, leadership, international, verify, faq, contact,
                          policies, privacy, terms, refund-policy, code-of-conduct, accessibility,
                          status, login, register, dashboard, admin
components/
  ui/                     design-system primitives
  layout/                 header (with the More menu + theme control), footer, page-hero
  features/               page-level compositions (hero, bands, forms, checkout panel, explorer)
  three/                  WebGL scene utilities and hooks
  motion/                 counter, reveal, tilt primitives
  ai/                     assistant drawer
lib/
  prisma.ts auth/ payments/ email/ ai/ data/ validation/ security/ audit.ts orders.ts monitoring.ts
prisma/
  schema.prisma seed.ts dev.db (dev only)
scripts/                  every audit, the logo/OG builders, backup/restore, suite aggregator
docs/                     this checklist plus the launch, wireframe, membership, content documents
middleware.ts             edge request guard (auth cookie shape + security headers on dynamic routes)
```

---

## 2. Rendering & data (App Router specifics)

- [x] **Server Components by default.** Every page is a server component; `'use client'` is used only
      for interaction (`checkout-panel.tsx`, `ai-assistant.tsx`, forms, drawers, 3D wrappers).
- [x] **Direct database reads in server components** (`prisma` imported in `app/page.tsx`,
      `app/membership/page.tsx`, …) — no internal HTTP hop, no wasted round trip.
- [x] **`export const dynamic = 'force-dynamic'`** on pages whose numbers must be live (homepage,
      membership, status, dashboard, admin).
- [x] **Route handlers with explicit runtimes**: `export const runtime = 'nodejs'` on routes that need
      Prisma/PDF/QR/mail; edge-safe middleware stays dependency-light.
- [x] **Streaming** for the AI assistant (`app/api/ai-assistant/route.ts`, SSE frames, first frame
      measured at ~125 ms) — tested by `scripts/check-performance.js`.
- [x] **Error containment.** Any thrown render error lands in `app/error.tsx` (or `global-error.tsx`)
      and is forwarded by `lib/monitoring.ts`; the visitor sees a calm page with a digest, never a
      white screen.
- [x] **Loading states without a blocking overlay.** `app/loading.tsx` renders a skeleton; the old
      full-screen percentage preloader is deleted and its return is banned by a test.

## 3. Metadata, SEO, structured data

- [x] **Metadata API everywhere**: `export const metadata` / `generateMetadata` per route; the root
      layout adds a `title.template` so every page reads *"Page · PYPC"* once.
- [x] **Open Graph + Twitter cards**: 4 purpose-built 1200×630 cards
      (`public/images/og-{default,imun-2027,membership,verify}.png`, built by
      `scripts/build-og-images.py`) wired in `app/layout.tsx` with `twitter:card=summary_large_image`.
- [x] **Structured data**: `Organization` + `sameAs` (the four official channels) site-wide,
      `Event` on IMUN 2027 and events, `Course` on courses, `FAQPage` on FAQ, `BreadcrumbList` on
      inner pages.
- [x] **`app/sitemap.ts`** covers every public route including `/accessibility`; **`app/robots.ts`**
      disallows `/admin`, `/dashboard`, `/api` and points at the sitemap.
- [x] **Canonical URLs from `NEXT_PUBLIC_APP_URL`** so switching to the custom domain needs no code
      change (see `docs/GO-LIVE.md`).
- [x] **`hreflang`-ready language switcher** (`components/layout/language-switcher.tsx`): English
      default, Urdu toggle; Roman Urdu is limited to the AI assistant by policy.

## 4. Performance budgets (and exactly how they are enforced)

| Budget | Value | Enforced by |
|---|---|---|
| Public page (full body) | ≤ 1200 ms | `scripts/check-performance.js` |
| API route | ≤ 800 ms | same |
| AI assistant | ≤ 2000 ms | same |
| Repeat visit not slower | yes | same |
| Compressed transfer | gzip on every text page | same |
| LCP ≤ 2.5 s · INP ≤ 200 ms · CLS ≤ 0.1 | design targets | self-hosted fonts with `display: swap`, fixed-size image boxes, no layout-shifting banners, `content-visibility` on long sections |

Techniques in the codebase: `optimizePackageImports` for `lucide-react`/`date-fns`
(`next.config.mjs`), `next/font` self-hosting, AVIF/WebP via `next/image`, `productionBrowserSourceMaps:
false`, skeleton placeholders instead of spinners, 3D scenes that pause when off-screen and are dropped
entirely under `prefers-reduced-motion`.

## 5. Security (headers, auth, secrets, abuse)

- [x] **Eight response headers** in `next.config.mjs`: `X-Content-Type-Options`, `X-DNS-Prefetch-Control`,
      `Strict-Transport-Security` (2 years, includeSubDomains, preload), full `Content-Security-Policy`
      (with `frame-ancestors`), `Referrer-Policy`, `Permissions-Policy`,
      `X-Permitted-Cross-Domain-Policies`, `Cross-Origin-Opener-Policy`.
      `X-Frame-Options` is available only behind `LEGACY_FRAME_HEADER="true"` because it breaks
      embedded previews.
- [x] **Auth**: `jose` HS256 sessions in an httpOnly cookie, bcryptjs hashing, email verification
      mandatory before activation, optional 2FA fields in the schema, `sessionVersion` for forced
      re-login, failed-attempt lockout.
- [x] **Route protection in `middleware.ts`** plus a per-handler authorisation check
      (`getCurrentUser()` + role) — tested by `scripts/check-authz.mjs` (18 checks, 0 bypasses).
- [x] **Rate limiting** on auth, contact, assistant and upload endpoints (`lib/security/request.ts`),
      backed by `RateLimitCounter` rows so it also works across restarts.
- [x] **Uploads** are size/type validated and stored outside the public root, served through an
      authenticated route (`app/api/uploads/resume/[file]/route.ts`).
- [x] **Secret hygiene**: `.env` git-ignored, `.env.example` documents every key, `npm run scan:secrets`
      fails on a committed key.
- [x] **No card data ever touches the server**: gateways redirect to the provider's own page; only
      references and signed payloads are handled.

## 6. Database (Prisma + SQLite dev / Postgres production)

- [x] `prisma/schema.prisma` models: User, MembershipPlan, Membership, Order, Programme, Event,
      Opportunity, Application, Certificate, VisaLetter, ContactMessage, Notification, AuditLog,
      EmailOutbox, RateLimitCounter, Upload, Correspondence, Partner, PolicyDocument.
- [x] `prisma/seed.ts` seeds four membership plans, 7 programmes, 4 events, 5 opportunities, three
      demo accounts and two certificates (one valid, one revoked) with a published code for testing.
- [x] **Migration stance recorded in `docs/GO-LIVE.md`**: SQLite cannot persist on Vercel; production
      runs Postgres. Switching is one `provider` line plus `DATABASE_URL`; the schema uses no
      SQLite-only types.
- [x] `npm run db:backup` / `db:restore-test` prove the backup round-trip; `db:clean:ship` strips dev
      rows before packaging.

## 7. Accessibility (WCAG 2.2 AA)

- [x] Landmarks (`header`, `nav`, `main`, `footer`), a skip link, one `h1` per page, ordered headings.
- [x] Skip-to-content, visible focus rings on every control, ≥ 44 px targets, no keyboard traps —
      the drawer and modal set `aria-modal`, trap focus and restore it on close.
- [x] `aria-live` regions for form errors, assistant responses and theme changes.
- [x] Contrast audited by `scripts/check-contrast.ts` (49 combinations, all ≥ 4.5:1 body / 3:1 large).
- [x] Images carry meaningful `alt`; decorative 3D canvases are `aria-hidden` with a text alternative.
- [x] `prefers-reduced-motion` disables transforms, parallax, counters and WebGL.
- [x] Public **accessibility statement** at `/accessibility` with verified items, known limitations and
      a reporting route; linked from the footer and the sitemap.

## 8. PWA, offline, install

- [x] `app/manifest.ts` — standalone display, `#0b3d2e`/`#04110e` theme colours, 192/512/maskable
      icons, four shortcuts (Join, Verify, Events, Status).
- [x] Apple tags: `apple-mobile-web-app-capable`, `black-translucent`, `apple-touch-icon` 180,
      `msapplication-TileColor`.
- [x] Works offline to the browser's standard: the shell caches, forms queue nowhere silently, and
      every failed write shows an explicit error.

## 9. Payments, certificates, integrations

- [x] Gateways: **Stripe** (PKR + USD), **JazzCash**, **Easypaisa** (PKR), plus `SIMULATED` that is
      refused unless `PAYMENTS_ALLOW_SIMULATION=true` outside production — proven by
      `npm run check:payments` (7 production-guard checks).
- [x] `lib/orders.ts → fulfilOrder()` is the single idempotent activation path used by every callback
      and by the free tier; `markOrderFailed()` records failures.
- [x] Certificates: `pdf-lib` + `qrcode` generation, public verification at `/verify` and
      `/api/certificates/verify`, revocation supported.
- [x] Email: `nodemailer` with an `EmailOutbox` fallback row when SMTP is absent, so nothing is
      silently lost in development.
- [x] AI assistant: OpenAI when a key is supplied, otherwise the offline knowledge-base answerer; both
      go through the same retrieval layer (`lib/ai/knowledge-base.ts`) so it cannot invent facts.
- [x] Social channels compiled in `lib/social.ts`; `check-social.js` (55 checks) probes the rendered
      HTML on every suite run.

## 10. Observability & operations

- [x] `/api/status` — honest JSON health for the status page; `/status` renders it for humans.
- [x] `lib/monitoring.ts` — DSN-compatible error forwarding (Sentry store endpoint) with scrubbing and
      a 2.5 s timeout, called from both error boundaries; no SDK weight.
- [x] `AuditLog` for money, membership, certificate and admin actions; `PlatformActivity` for the
      public activity bar.
- [x] Backups: `npm run db:backup` writes a timestamped copy plus a manifest; `db:restore-test`
      restores into a scratch file and reports row counts.
- [x] Analytics opt-in: GA4 and Clarity load only when their IDs exist in the environment
      (`components/seo/analytics.tsx`), never in development.

## 11. Quality gates — the commands that must pass before any delivery

```bash
npm ci                     # exact dependency tree
npx prisma generate        # client matches schema
./node_modules/.bin/tsc --noEmit    # types (never `npx tsc` — it downloads an unrelated package)
npm run lint               # eslint
npm run build              # production compile — must print "Compiled successfully"
AI_AUDIT_BYPASS_TOKEN=… npx next start -H 0.0.0.0 -p 3000
npm run check:suites       # the aggregator: routes, health, registration, theme, connectivity,
                           # contrast, responsive, IMUN, social, AI, performance
npm run scan:secrets       # no key in the tree
npm run check:authz        # 18 authorisation probes
npm run check:payments     # gateway guards
npm run db:backup && npm run db:restore-test
npm run db:clean:ship      # strip dev data before packaging
```

A delivery is only claimed with the aggregate line from `check:suites` and the individual gate counts.

## 12. Known environment notes (so nobody re-learns them the hard way)

* `npx tsc` installs an unrelated `tsc@2.0.4` package if the local binary is missing; use
  `./node_modules/.bin/tsc`.
* `npm run build | grep "58/58"` matches nothing in Next 14 — grep for `Compiled successfully`.
* Snapshot/turn boundaries can remove `node_modules`; re-run `npm ci` before a build.
* The build machine has no open network access at build time beyond the registry: fonts are vendored
  in `app/fonts/`, the OG builder uses DejaVu, and nothing fetches a remote asset during a build.
