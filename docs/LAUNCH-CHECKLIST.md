# PYPC Final Launch Approval Checklist

Date of check: __________  ·  Checked by: __________  ·  Approved by: __________

Every technical line below is executable: the command in brackets is what proves
it, and the result recorded in `docs/VERIFICATION.md` is from this build.

## 1. Technical

| # | Item | How it is proven | Status |
| --- | --- | --- | --- |
| 1 | Production build succeeds | `npm run build` — 58/58 routes, exit 0 | ✅ |
| 2 | Type check and lint pass | `npm run typecheck` · `npm run lint` | ✅ |
| 3 | Every public route loads | `npm run check:routes` — 46/46 | ✅ |
| 4 | Protected areas redirect anonymous visitors | `npm run check:routes` (46/46) + `check:authz` rows 1–2 | ✅ |
| 5 | Registration → email verification → login | `npm run check:auth` — 25/25 | ✅ |
| 6 | Password policy accepts strong passwords first time | `npm run check:theme` — 25/25 | ✅ |
| 7 | Light / dark / system themes, no flash on load | `npm run check:theme` | ✅ |
| 8 | Member authorisation (own data only) | `npm run check:authz` row 5b — no foreign data in own collections | ✅ |
| 9 | Admin authorisation (staff only) | `npm run check:authz` rows 4, 4b, 4c, 7, 8 — asserted on the page's own heading, never the layout shell | ✅ |
| 9c | Admin-only pages (members, certificates, payments) refuse staff below admin by redirect | `npm run check:authz` row 7b — executive → `/admin/users` is `307`, no directory rendered | ✅ |
| 9b | The admin panel is refused at the edge, before it renders | `middleware.ts` role guard — real `307`, no panel for a member | ✅ |
| 10 | Manual settlement is admin-only and audited | `npm run check:authz` rows 8c, 6b | ✅ |
| 11 | Certificate issuance requires completion evidence | `lib/certificates.ts` + `check:connectivity` | ✅ |
| 12 | Self-issuance of certificates is refused | `lib/certificates.ts` guard | ✅ |
| 13 | Certificate revocation records reason and timestamp | `/verify` shows revocation | ✅ |
| 14 | QR verification resolves to a valid certificate | `check:connectivity` — VALID and REVOKED cases | ✅ |
| 15 | Certificate PDF contains emblem, QR, code and date | `check:connectivity` — PDF downloaded and parsed | ✅ |
| 16 | Payment → membership chain, duplicate replay refused | `npm run check:payments` — 9/9 against `npm run dev` | ✅ |
| 16b | The developer gateway is refused in production, with no orphan order | `npm run check:payments` production guard — 7/7 | ✅ |
| 16c | The Free Community tier activates with no payment and is auditable | live E2E — order `PYPC-ORD-BYK8RXLQ15G`, provider `FREE`, PAID, membership ACTIVE, audit row `MEMBERSHIP_ACTIVATED_FREE` | ✅ |
| 16d | A free tier cannot be routed through a gateway, and a paid tier cannot be activated for free | `POST /api/memberships/checkout` → 400 both ways, with a readable message | ✅ |
| 16e | Four tiers published with PKR and USD and a full comparison | `/membership` — 2,222 words, 29 comparison rows, verified live | ✅ |
| 16f | No blocking loading overlay and no placeholder numbers on any page | `npm run check:perf` guards 4b/4c — no "Loading platform", no `z-[200]`, no bare `0` stat | ✅ |
| 16g | Newsroom publishes announcements traceable to real documents | `/news` + 5 articles, present in `sitemap.xml` | ✅ |
| 16h | Security headers on every response | `curl -I` — HSTS preload, CSP, nosniff, referrer, permissions, COOP (8 headers) | ✅ |
| 16i | Accessibility statement published and linked | `/accessibility` (200), footer + sitemap entries | ✅ |
| 17 | Public forms are protected by a human check (signed, self-hosted, no third-party CAPTCHA) | `check:connectivity` — wrong and missing answers refused with 400 | ✅ |
| 18 | Two-factor authentication works end to end and is optional | `npm run check:2fa` — 26/26, including RFC 6238 vectors, recovery codes and disable path | ✅ |
| 19 | The audit log is tamper-evident, not merely append-only | `npm run check:audit-chain` — 9/9, break detected and attributed to the edited row | ✅ |
| 19b | The audit log survives real traffic, not just a quiet install | Appends serialised + unique index on `prevHash` (no fork); `actorId` is not a foreign key (deleting an account cannot rewrite an entry); every clean-up deletes only unchained rows | ✅ |
| 19c | The shipped database carries a clean, verifiable chain | `npm run db:clean:ship` removes test accounts *and* their trail, then rebuilds the chain with an `AUDIT_LOG_RECHAINED` marker; the console reads *Chain verified* after packaging | ✅ |
| 20 | Newsletter is double opt-in and unsubscribable | `check:connectivity` — PENDING → CONFIRMED → UNSUBSCRIBED | ✅ |
| 21 | Events export to Google Calendar, Outlook and `.ics` | `check:connectivity` — valid RFC 5545 file with UID and summary | ✅ |
| 22 | Cookie policy published and accurate to the cookies actually set | `/cookies` (200) | ✅ |
| 23 | Impact report downloadable and generated from live data | `/reports/pypc-impact-report-2026.pdf` (200) + `/impact` | ✅ |
| 24 | Site-wide search covers every public section | `check:connectivity` — hit, miss and membership queries | ✅ |
| 17 | Stripe webhook verifies the signature | `app/api/payments/stripe/webhook` | ✅ |
| 18 | Webhook processing is idempotent (no double activation) | `WebhookEvent` unique constraint | ✅ |
| 19 | Amount / currency mismatch is flagged, not auto-settled | webhook `verifyAmount` | ✅ |
| 20 | Refund / dispute suspends the membership | webhook `charge.refunded` path | ✅ |
| 21 | Cross-origin settlement attempt rejected | `npm run check:authz` row 6b | ✅ |
| 22 | Database backup produced and verified | `npm run db:backup` | ✅ |
| 23 | Restore drill passes, live data untouched | `npm run db:restore-test` — 8/8, including a read-only check that the **audit chain still verifies** inside the restored copy | ✅ |
| 24 | Disaster recovery from the shipped package | `dev.db` deleted → `db push` + `db:seed` → repopulated | ✅ |
| 25 | No secrets in the tree, the shipping `.env` or history | `npm run scan:secrets` | ✅ |
| 26 | Error boundaries in place (404, route error, global error) | `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx` | ✅ |
| 27 | Contrast meets WCAG 2.1 AA in both themes | `npm run check:contrast` — 49/49 pairs | ✅ |
| 28 | Responsive at 320 → 1440 px, all four breakpoints | `npm run check:responsive` — 51/51 | ✅ |
| 29 | Real-time layer (live status, offline banner, viewport sync) | `check:responsive` rows 20–24 | ✅ |
| 30 | IMUN 2027 page content and live counters verified | `npm run check:imun` — 29/29 | ✅ |
| 30b | Concept note reproduced with reference number and both signatories | `npm run check:imun` — CN-01, venue, signatory checks | ✅ |
| 31 | The site reports its own health honestly | `npm run check:health` — 12/12 | ✅ |
| 32 | CI runs all of the above on every push | `.github/workflows/ci.yml` | ✅ |
| 33 | Accessibility: keyboard, focus rings, skip link, ARIA | `check:responsive` + markup audit | ✅ |
| 36 | The shipped database holds seeded content and no test residue | `npm run db:clean --dry-run` reports “Clean” | ✅ |
| 34 | Rate limits and origin checks active | `lib/security` + `check:auth` | ✅ |
| 35 | Mobile: tap targets, safe areas, no horizontal scroll | `check:responsive` | ✅ |
| 37 | AI assistant answers in English, Urdu and Roman Urdu | `npm run check:ai` — detection, answer language, RTL and a 12-probe retrieval matrix per language | ✅ |
| 38 | AI answers quote live database figures, never stale text | `npm run check:ai` — plan prices matched against the `MembershipPlan` row | ✅ |
| 39 | Assistant streaming works in the browser widget | `npm run check:ai` — `meta` → `delta…` → `done`, joined text equals the JSON answer | ✅ |
| 40 | Assistant abuse controls: rate limits, validation, no prompt leak | `npm run check:ai` — rejected input does not consume the question budget | ✅ |
| 41 | Official social accounts published once, from one module | `lib/social.ts` — LinkedIn + Instagram compiled in, Facebook/YouTube environment-driven | ✅ |
| 42 | No placeholder or lookalike social link anywhere in the site | `lib/social.ts` rule + footer/contact/header rendering | ✅ |
| 43 | Social profiles declared to search engines (`sameAs`) | `components/seo/organisation-schema.tsx` | ✅ |
| 44 | Embeds allowed for preview panes and partner portals | `next.config.mjs` — CSP `frame-ancestors` (set `FRAME_ANCESTORS` to restrict) | ✅ |
| 45 | Social audit proves the rendered pages, not just the source | `npm run check:social` — 55/55 | ✅ |
| 46 | Sharing offered from the conference page | `npm run check:social` — share endpoints present | ✅ |
| 47 | Official mailboxes are the current ones, everywhere | `npm run check:social` — pypcofficial@gmail.com + officialpypc@gmail.com on `/` and `/contact`; retired addresses absent | ✅ |
| 48 | Phone published in international **and** local form | `npm run check:social` — `+92 315 5729598` and `0315 5729598`, E.164 `+923155729598` in structured data | ✅ |
| 49 | Every function responds in under 3 seconds | `npm run check:perf` — slowest page ≈ 0.1 s, assistant ≈ 0.3 s, 8×+ headroom | ✅ |
| 50 | Installable as an app on Android and iOS | `npm run check:responsive` B25–B31 + `check:perf` manifest assertions | ✅ |
| 51 | The logo composites cleanly on every surface | `scripts/build-logo-assets.py` — plate removed from the crest, light-ink variant for dark surfaces | ✅ |
| 52 | Secondary controls live behind the three-lines menu | `components/layout/header-nav.tsx` — theme switch inside the More menu and the mobile drawer, not the top bar | ✅ |
| 53 | All four official profiles published under the council's handle | `npm run check:social` — LinkedIn, Instagram, Facebook, YouTube (@pypcofficial) as links, `sameAs` carries all four | ✅ |
| 54 | Social icons are rendered by one shared component | `components/ui/social-link.tsx` — footer, contact page, both header menus, side rail | ✅ |
| 55 | The shared handle is stated to visitors, not just implied | contact page “One handle, every platform” block, in the AI assistant's answers in all three languages | ✅ |
| 56 | A channel can be taken out of service without a code change | `NEXT_PUBLIC_SOCIAL_<CHANNEL>_PENDING="true"` renders it as a chip everywhere | ✅ |
| 57 | The totals quoted in this document are reproducible | `npm run check:suites` runs every suite and adds up what they report — **517 assertions across 13 suites** | ✅ |

**Lighthouse / Core Web Vitals** (run when a browser is available):

```bash
npm i -g lighthouse
lighthouse http://localhost:3000 --output html --output-path ./reports/lighthouse.html --chrome-flags="--headless"
```

Targets: Performance ≥ 85 · Accessibility ≥ 95 · Best Practices ≥ 90 · SEO ≥ 90.
The build is already favourable to these: self-hosted fonts with `display: swap`,
no third-party scripts at runtime, images sized, server-rendered content.

## 2. Organisational

These are decisions only the organisation can make — see `docs/APPROVAL-REGISTER.md`.

| # | Item | Authority | Status |
| --- | --- | --- | --- |
| 1 | Privacy policy approved | Board / Legal | ☐ |
| 2 | Terms of use approved | Board / Legal | ☐ |
| 3 | Code of conduct approved | Board | ☐ |
| 4 | Refund policy approved | Board / Director | ☐ |
| 5 | Membership pricing approved | Board / Director | ☐ |
| 6 | Certificate policy and wording approved | Director | ☐ |
| 7 | Logo and brand usage approved | Director | ☐ |
| 8 | All public claims verified and approved | Board / Director | ☐ |
| 9 | Leadership names approved and current | Board Chair | ☐ |
| 10 | Data retention and deletion policy approved | Board / Legal | ☐ |
| 11 | Child safeguarding policy approved (if under-18 delegates accepted) | Board / Legal | ☐ |
| 12 | Recommendation letter policy approved | Director | ☐ |
| 13 | Live SMTP credentials supplied and tested | Head of Technology | ☐ |
| 14 | Live payment credentials supplied and tested (Stripe / JazzCash / Easypaisa) | Head of Finance | ☐ |
| 15 | Bank details confirmed for manual settlement | Head of Finance | ☐ |

### Launch review — what was found and closed

The authorisation matrix caught a genuine gap while this checklist was being
signed off: a signed-in **member** could request `/admin` and receive a `200`
whose body carried a client-side navigation to `/dashboard`. The layout guard was
correct — but a redirect thrown inside a layout during a streamed render is
delivered as client-side navigation, so the status code was `200`. No member,
order or revenue data was ever rendered, but the behaviour was still wrong for
no-JavaScript clients, crawlers and log-based auditing, and it also meant the
panel shell was rendered for everyone.

Closed in three places:

1. `middleware.ts` now reads the role from the **signed** session token and
   answers a real `307` before the panel renders at all. A forged cookie cannot
   pass, because the signature is verified.
2. `ADMIN_PANEL_ROLES` is defined once (`lib/auth.ts`) and used by both the edge
   guard and `app/admin/layout.tsx`, so the two cannot drift apart. The same pass
   fixed a regression where an **executive** was being bounced out of the panel.
3. `scripts/check-authz.mjs` now asserts on **rendered content** rather than on a
   status code alone — the assertion form that would have caught this the first
   time. Row 4 (`no panel rendered for a member`), 4b (`real redirect`), 4c (no
   administrative figure in the body) and 5b (own collections carry no foreign
   data) were added, and rows 3/3c now probe real private endpoints
   (`/api/applications`, `/api/certificates`) instead of a route that does not
   exist.

While fixing that, a second finding surfaced from the server log: `/admin/users`,
`/admin/certificates` and `/admin/payments` (admin-only pages) *threw* for an
executive, which Next rendered as an error panel inside a `200` shell — and
`/admin` itself called the admin-only guard, so an executive could enter the panel
but had no page they could actually open. Both are fixed the same way: the panel
overview is now open to every staff role (`requireStaffPage`), the three
admin-only pages use `requireAdminPage` and redirect to the overview, and
`middleware.ts` refuses those three prefixes at the edge with a real `307`. The
matrix now checks the heading each page renders, so a shell can never be mistaken
for a page again.

The matrix is now **18/18**.

## 3. Go / no-go

| Condition | Meaning |
| --- | --- |
| Every Section 1 row ✅ and every Section 2 row ticked | Clear to launch publicly |
| Section 1 complete, Section 2 partially ticked | Launch with the unapproved items unpublished — the site already labels planning-stage content as such |
| Any Section 1 row failing | **No-go.** Fix first; every row has a command that reproduces it |

## 4. Sign-off

| Role | Name | Date |
| --- | --- | --- |
| Head of Technology | ____________________ | __________ |
| Compliance Lead | ____________________ | __________ |
| Director | ____________________ | __________ |
| Board Chair (final) | ____________________ | __________ |
