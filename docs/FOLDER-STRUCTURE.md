# Folder structure

Everything the platform needs is inside this one folder. Nothing here is
generated at build time except `.next/` (which you can delete and rebuild).

```
pypc-website/
│
├── app/                                  # Next.js App Router — every URL lives here
│   ├── layout.tsx                        # root shell: viewport, theme, PWA metadata, real-time layer
│   ├── manifest.ts                       # installable web-app manifest (Android/desktop install)
│   ├── icon.png  apple-icon.png          # favicon + iOS home-screen icon (plated by the asset script)
│   ├── globals.css                       # Tailwind layers + design system + responsive rules
│   ├── page.tsx                          # home page
│   │
│   ├── about/ international/ conferences/ courses/ events/ programmes/
│   ├── opportunities/ research/ records/ leadership/ partnerships/
│   ├── policies/ privacy/ terms/ refund-policy/ code-of-conduct/ faq/
│   ├── membership/                       # plans → checkout → simulate → success
│   ├── contact/ verify/ verify-email/ status/ register/ login/
│   │
│   ├── dashboard/                        # signed-in member area (each folder = one screen)
│   │   ├── page.tsx applications/ certificates/ events/ membership/
│   │   └── profile/ security/ support/ visa-letters/
│   │
│   ├── admin/                            # staff console (each folder = one screen)
│   │   ├── page.tsx applications/ audit/ certificates/ emails/ events/
│   │   └── messages/ opportunities/ payments/ programmes/ users/ visa-letters/
│   │
│   ├── api/                              # backend — route handlers, no business logic of their own
│   │   ├── auth/        register, verify-email, resend-verification, login, logout, password
│   │   ├── applications/ uploads/ certificates/ memberships/
│   │   ├── international/ ai-assistant/ admin/ profile/ contact/
│   │   └── status/                       # the machine-readable health report
│   │
│   ├── sitemap.ts robots.ts              # generated per request from the real content
│   └── not-found.tsx error.tsx loading.tsx
│
├── app/fonts/                            # self-hosted variable fonts (Inter, Playfair Display)
│
├── components/                           # presentation only — no database access
│   ├── layout/     header-nav, site-header, site-footer, page-hero, policy-document, logo
│   ├── features/   forms, checkout, event explorer, AI assistant, partner wall, hero carousel
│   │   └── imun/   the seven IMUN 2027 sections (at-a-glance, flag parade, venue, culture,
│   │               budget, timeline, workstreams, why-different)
│   ├── experience/ 3D backdrop, viewport sync, live status, connection banner, cursor/ambient
│   ├── dashboard/  shell shared by /dashboard and /admin, stat panels, tables
│   ├── theme/      provider + toggle (light / dark / system)
│   ├── motion/     reveal-on-scroll, parallax emblem, counters
│   ├── seo/        Organisation + WebSite JSON-LD (feeds the official social profiles to search engines)
│   └── ui/         button, card, badge, field, password field, country field, phone field,
│                   icon (Lucide registry), brand-icons (LinkedIn/Instagram/Facebook/YouTube/
│                   WhatsApp/X glyphs + brandIconRegistry), social-link (the one place that
│                   decides link-vs-chip for a channel), share-buttons
│
├── lib/                                  # the rules of the organisation, in one place
│   ├── constants.ts                      # name, nav, PHONE, BOTH MAILBOXES, hours, address
│   ├── social.ts                         # THE source of truth for social accounts (env-driven where
│   │                                     # an address has not been supplied), plus Organisation sameAs
│   ├── design-tokens.ts                  # the palette + WCAG requirements used by the audit
│   ├── prisma.ts  auth.ts  auth/         # database client, sessions, roles, verification tokens
│   ├── validation/                       # password, email deliverability, phone (shared client + server)
│   ├── security/                         # rate limits, origin/CSRF checks, safe responses
│   ├── email/                            # transport + templates + development outbox
│   ├── payments/                         # JazzCash, Easypaisa, Stripe, SIMULATED (dev only)
│   ├── ai/                               # assistant engine (works without an API key)
│   │   ├── language.ts                   # language detection: en | ur | roman-ur (+ RTL, confidence)
│   │   ├── knowledge-base.ts             # 15 answers in three languages, keyword-scored
│   │   ├── live-data.ts                  # real-time reads: prices, events, opportunities, certificates
│   │   ├── assistant.ts                  # composes answers, decides when to escalate
│   │   └── suggestions.ts                # greeting, placeholder and follow-up chips per language
│   ├── certificates/  pdf/               # QR-verifiable certificates and PDF generation
│   ├── health.ts                         # the self-report behind /status
│   └── data/                             # content used by the public pages (faq, policies, countries)
│
├── prisma/
│   ├── schema.prisma                     # 20 models — the single source of truth for data
│   ├── seed.ts                           # idempotent seed: plans, programmes, events, demo accounts
│   └── dev.db                            # SQLite database, SHIPPED ALREADY SEEDED
│
├── public/
│   ├── images/                           # the supplied emblem (light + dark) and photography
│   ├── documents/                        # the 8 institutional PDFs, downloadable and real
│   └── favicon*, manifest, og image
│
├── private/
│   └── uploads/resumes/                  # member CVs — never served statically, download requires ownership
│
├── scripts/
│   ├── build-logo-assets.py              # rebuilds every emblem file from the approved master
│   │                                     # (removes the interior plate, makes the dark-surface variant)                              # proof, not decoration — run with plain Node
│   ├── check-contrast.ts                 # WCAG 2.1 AA audit of every colour pair
│   ├── check-responsive.js               # responsive + real-time audit (source and shipped assets)
│   ├── smoke-routes.mjs                  # every route, public and protected
│   ├── check-registration.js             # sign-up → verification → login + anti-abuse
│   ├── check-theme-and-password.js       # light/dark/system + the password policy
│   ├── check-connectivity.js             # 52 end-to-end checks through the real API
│   ├── check-health.js                   # the /api/status report itself
│   ├── check-imun-2027.js                # IMUN 2027 page: 21 sections, live counters, signatories
│   ├── check-authz.mjs                   # authorisation matrix (member / executive / super admin)
│   ├── check-secrets.js                  # secret + .env + .gitignore scan (launch gate)
│   ├── check-payments-dev.js             # payment → membership (dev server; fail-closed check in production)
│   ├── db-backup.js                      # backup with manifest + SHA256SUMS
│   ├── db-restore-test.js                # restore drill (8 checks) against a real backup
│   ├── check-partnerships.mjs            # partnership / MoU request pipeline (38 checks)
│   ├── db-clean.js                       # removes test residue before shipping a database
│   └── migrations are handled by `prisma db push` — this project ships a seeded SQLite file
│
├── docs/                                 # this folder — read before changing anything
│   ├── ARCHITECTURE.md                   # layers and why they are arranged this way
│   ├── FOLDER-STRUCTURE.md               # this file
│   ├── DESIGN-SYSTEM.md                  # palette, contrast rules, responsive rules
│   ├── CONTACT.md                        # official phone, both mailboxes, hours
│   └── VERIFICATION.md                   # every check that was run and its result
│
├── .env                                  # working development configuration (no live keys)
├── .env.example                          # every variable, documented
├── package.json                          # scripts: dev, build, start, db:*, check:*
├── tailwind.config.ts                    # imports the palette from lib/design-tokens.ts
├── tsconfig.json  next.config.mjs  postcss.config.mjs  .eslintrc.json
├── setup.sh  setup.bat                   # one-command install → database → build → start
├── START-HERE.md                         # two-minute guide for this package
└── README.md                             # full documentation
```

## Conventions that keep it navigable

* **A folder per URL.** If you can name the page, you can find its file without
  searching — `app/membership/success/page.tsx` is `/membership/success`.
* **API routes mirror the pages they serve.** The checkout page posts to
  `app/api/memberships/checkout/route.ts`.
* **One responsibility per folder.** `lib/` decides, `components/` displays,
  `scripts/` proves, `docs/` explains.
* **Nothing lives in two places.** Colours come from `lib/design-tokens.ts`,
  identity and contact details from `lib/constants.ts`, validation from
  `lib/validation/`, and the data model from `prisma/schema.prisma`.
* **Build output is disposable.** `node_modules/`, `.next/` and
  `tsconfig.tsbuildinfo` are not part of this package; `npm ci && npm run build`
  recreates them from what is here.
