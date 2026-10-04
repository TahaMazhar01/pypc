# Deliverable 2 — Membership page: detailed design

**Status: implemented and verified live.** Page: `app/membership/page.tsx`. Data: `lib/data/membership.ts`
(single source of truth, also written into the database by `prisma/seed.ts`). Checkout:
`app/membership/checkout/page.tsx` + `components/features/checkout-panel.tsx` +
`app/api/memberships/checkout/route.ts`.

Measured on the running production build: **2,222 words of visible content, four tier cards, a
29-row comparison matrix across five groups, five-step activation timeline, and an end-to-end free
tier activation verified through the real API.**

---

## 1. The four tiers (exact published values)

| Tier | Code | Who it is for | Annual fee | What it unlocks |
|---|---|---|---|---|
| **Free Community** | `FREE` | Students and first-time participants who want to explore before paying anything | **PKR 0 · USD 0** | Member card, dashboard, open webinars, newsletter, participation certificate for open programmes. Never expires into a paid tier. |
| **Associate** | `ASSOCIATE` | Undergraduates and college students attending events regularly | **PKR 2,500 · USD 15** | Everything in Free, plus priority invitations, three mentorship sessions, QR-verified certificates, verification profile, reference letters. |
| **Executive** *(most chosen)* | `EXECUTIVE` | Members holding or seeking committee, chapter and delegation leadership roles | **PKR 7,500 · USD 45** | Everything in Associate, plus committee/chapter eligibility, programme prioritisation, unlimited priority mentorship, executive letters on letterhead, AGM voting rights, ceremony recognition. |
| **Institutional Partnership** | `INSTITUTIONAL` | Universities, colleges, schools and youth organisations (billed to the institution) | **PKR 50,000 · USD 300** | Campus circle, joint programmes, up to 25 student memberships, institution dashboard, co-branded QR certificates, MoU, annual partnership report. |

Upgrade rule, stated on the page and honoured by the fee notes: **the fee already paid is credited,
and the member pays only the difference.**

---

## 2. Page anatomy (top to bottom)

| # | Section | Contents | Why it is there |
|---|---|---|---|
| 1 | **Hero** (`PageHero`) | Eyebrow *Membership*, H1 *"Join a membership tier built around real participation"*, one-paragraph promise, CTAs **Join free — no payment** and **Compare all four tiers** | The free tier is the honest first step, so it is the primary hero action |
| 2 | **Trust strip** | Four tiles: Four tiers · PKR and USD · Instant activation · Verifiable records | Answers the four questions asked before price |
| 3 | **Tier cards** | One card per published tier: name, tagline, PKR price with USD alternative, "Best for: …" audience line, description, feature checklist, "Also included" panel, CTA. Badges: *Most chosen* on Executive, *Free to join* on Free | Comparable without scrolling to a table |
| 4 | **Comparison matrix** | 5 groups × rows as listed in §3. Ticks, muted dashes and definitive strings | Removes every "it depends" |
| 5 | **Fee transparency** | Five plain statements: the annual fee is the whole cost; travel/accommodation/visa are separate and always quoted first; awards are never reduced by fees; nothing auto-charges; how PKR and USD are charged | Blueprint phase 6 |
| 6 | **Refunds in short** | 14-day full refund if no paid programme attended; pro-rata if PYPC cancels; upgrades charged as difference; links to the full policy and terms | Blueprint phase 4/6 |
| 7 | **What happens after you join** | Five numbered steps: create account → verify email → choose tier and pay → automatic activation → start taking part | States the automated behaviour, not an aspiration |
| 8 | **International members** | USD via Stripe, visa invitation letters from the dashboard on letterhead, links to `/international` and `/courses` | Round-7 international requirement |
| 9 | **Payment methods** | Live gateway list with currencies from `getGatewayStatuses()`; unconfigured gateways shown disabled rather than failing after data entry; link to `/status` | Trust + no dead ends |
| 10 | **FAQ** | Membership and Payments categories (including *Is there a free membership tier?*, *What happens if I upgrade?*, *Can a university pay for a cohort?*) | Blueprint "FAQ on every important page" |
| 11 | **Closing CTA band** | *Start with the free tier — upgrade when you are ready* + Create account / Go to checkout | Final conversion point |

---

## 3. Comparison matrix — exact rows

**Membership & access** — annual fee · digital member card with membership number · member dashboard
and application tracking · open webinars, workshops and clinics · membership seats included
(1 vs. up to 25 students) · monthly opportunities newsletter.

**Programmes & participation** — participation in open programmes · priority invitations · mentorship
sessions (group / 3 per year / unlimited priority / cohort-wide) · eligibility for committee, chapter
and delegation roles · Youth Parliament, fellowship and summer school prioritisation (standard queue
→ highest priority → reserved cohort places) · conference delegate fee discount (— / 15% / 30% /
group rate) · IMUN 2027 delegate fee · AGM voting rights (Executive; one institutional vote).

**Certification & records** — participation certificate · QR-verified verification profile · verified
experience and reference letters · co-branded certificates · institution dashboard.

**Research, policy & recognition** — published briefs and explainers · research desk submissions ·
speaking opportunities · annual ceremony recognition · national visibility.

**Partnership & support** — campus circle registration · joint programmes · MoU · annual partnership
report · email first-response time (3 working days / 48 h / 24 h / dedicated same-day liaison).

---

## 4. Free tier: genuinely free, genuinely activated

The free tier is not a form that says "we will contact you". It runs through the **same fulfilment
code path as a paid order**:

1. `POST /api/memberships/checkout` with `{ planCode: "FREE", provider: "FREE" }`.
2. The route refuses the impossible combinations: a free tier with a gateway → *"The Free Community
   tier costs nothing. Choose 'Activate free membership'…"* (400); a paid tier claiming to be free →
   *"That tier requires a completed payment."* (400).
3. For the free tier it writes an order (`provider: FREE`, `amountMinor: 0`), calls
   `fulfilOrder()` — the same idempotent function the JazzCash, Easypaisa and Stripe callbacks use —
   marks it **PAID**, activates the membership, sends the in-app notification and writes the audit
   entry `MEMBERSHIP_ACTIVATED_FREE`.

**Verified live** (production build, fresh account, real session cookie):

```
order:        PYPC-ORD-BYK8RXLQ15G  FREE  PAID  amountMinor=0  plan=FREE
membership:   ACTIVE  Free Community Membership   expires 2027-09-28
audit:        MEMBERSHIP_ACTIVATED_FREE by freetier.test@example.com
notification: Free Community Membership activated
success page: HTTP 200, shows the reference — no payment step
```

---

## 5. Checkout panel behaviour

`components/features/checkout-panel.tsx` adapts to the selected tier:

* **Free tier selected** → step 2 shows *"No payment is required… no card, wallet or bank details are
  collected at any point"*, the gateway grid is disabled and greyed with `aria-hidden`, the currency
  step is hidden, and the button reads **Activate free membership**.
* **Paid tier** → gateway grid and currency selector behave as before: JazzCash and Easypaisa settle
  in PKR, Stripe handles PKR and international USD cards; unsupported currency buttons are disabled
  rather than silently ignored.
* The order summary always shows plan, 12-month duration, gateway and total.

---

## 6. Data model & invariants

`MembershipPlan` (Prisma) — `code`, `name`, `tier`, `tagline`, `description`, `pricePkr`, `priceUsd`,
`durationMonths`, `features` (JSON array), `benefits` (JSON array), `isPopular`, `isActive`,
`sortOrder`.

**Invariants the code enforces**

| Invariant | Enforced by |
|---|---|
| Page copy and database pricing can never drift | Both render from `lib/data/membership.ts` |
| A price of 0 means free, not "free trial" | `isFreePlan = pricePkr === 0 && priceUsd === 0`, checked server-side |
| Nothing activates without a completed payment | `fulfilOrder()` is the only activation path; manual/duplicate callbacks are idempotent |
| A member cannot hold two active memberships | `fulfilOrder()` updates the existing ACTIVE row instead of creating a second |
| Every activation is auditable | `recordAudit()` writes `ORDER_PAID` / `MEMBERSHIP_ACTIVATED_FREE` |

---

## 7. Accessibility of this page (WCAG 2.2 AA)

* The comparison matrix is a real `<table>` with a `<caption>`, `scope="col"` headers, `scope="row"`
  row headers and `scope="colgroup"` group headers; ticks and dashes carry `sr-only` text
  ("Included" / "Not included") so a screen reader never hears "image".
* Section headings follow a strict h1 → h2 → h3 order; the tier cards use `h3` under the *Choose your
  tier* `h2`.
* Prices are text, not images; currency symbols are announced.
* Colour is never the only signal — the popular tier also carries the word *Most chosen*.
* Every interactive element keeps a visible focus ring (`focus-ring` utility) and ≥ 44 px target.

---

## 8. Copy principles used on this page

1. **Price before persuasion.** The number appears in the card header, the table, and the checkout
   summary — three times, identically.
2. **Say what is not included.** Travel, accommodation and insurance are named explicitly.
3. **No urgency theatre.** No countdowns, no "only 3 seats left".
4. **No fabricated social proof.** Testimonials appear only with a named, consenting member.
5. **No placeholder numbers.** Stats print a sentence, never `0` or `0%`.

---

## 9. Change control

| Change | Where |
|---|---|
| Price, name, features, benefits | `lib/data/membership.ts`, then `npm run db:seed` |
| Comparison rows | `MEMBERSHIP_COMPARISON` in the same file |
| Fee/refund wording | `MEMBERSHIP_FEE_NOTES`, `MEMBERSHIP_REFUND_SUMMARY` |
| Checkout behaviour | `components/features/checkout-panel.tsx`, `app/api/memberships/checkout/route.ts` |
| Share card | `scripts/build-og-images.py` → `public/images/og-membership.png` |

Add a fifth tier by appending one object to `MEMBERSHIP_TIERS` and one value to each comparison row's
`values` map; the page, the checkout and the database all follow automatically.
