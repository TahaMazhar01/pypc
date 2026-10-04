# Deliverable 1 — Homepage wireframe & content structure

**Status: implemented.** Every block below is live in `app/page.tsx` with the component named
against it. Nothing in this document is a proposal for future work — if it is written here, it is
rendering on the deployed site today.

Benchmarks the structure is measured against: **European Youth Parliament**, **Commonwealth Youth
Parliament**, **Water.org**, **UNDP youth pages**. What those four sites share, and what PYPC now
matches, is a hero that states the mission in one sentence, a *trust band before the ask*, real
institutional numbers, named programmes, proof of governance, and one obvious next step repeated at
three points down the page.

---

## 1. Order of blocks (exact, top to bottom)

| # | Block | Component | Purpose | Data source |
|---|-------|-----------|---------|-------------|
| 0 | Utility bar + header + "More" menu | `components/layout/site-header.tsx` | Global navigation, theme control lives in the More menu, language switcher | static |
| 1 | **3D hero** | `components/features/home-hero-3d.tsx` | Mission sentence, two CTAs, four live metrics | `stats` from the database |
| 2 | **Highlight carousel** | `components/features/home-new-sections.tsx → FeaturedCarouselBand` | Rotates the four flagship offers with the real images | static + links |
| 3 | **Animated counters** | `components/features/home-sections-3d.tsx → StatsStrip3D` | Institutional numbers, each with a zero-state line | `StatsStrip3D stats={{…}}` |
| 4 | **Pillars** | `Pillars3D` | What the Council actually does, in four depth-layered cards | static |
| 5 | **Partners / engagement** | `components/features/partner-wall.tsx` | Institutional relationships, honest about status | static |
| 6 | **Events band** | `EventsBand` | Upcoming convenings with covers | `Event` rows |
| 7 | **Governance standards** | `Governance3D` | Audit-grade process, correspondence discipline | static |
| 8 | **Research + international reach** | `ResearchAndReachBand` | Policy desk and cross-border participation | static |
| 9 | **National reach globe** | `Reach3D` | Live 3D globe, regions and proposed wings | static |
| 10 | **Programmes / events / opportunities preview** | `app/page.tsx` section | Three-column institutional index | `Programme`, `Event`, `Opportunity` |
| 11 | **Membership + certification** | `app/page.tsx` section | Why a record of participation matters | static |
| 12 | **Path: learning → leadership** | `app/page.tsx` section | Four-step ladder, ends at membership | static |
| 13 | **International band** | `InternationalBand` | USD pricing, visa letters, time-zone delivery | static |
| 14 | **Journey timeline** | `JourneyTimeline3D` | Registration → national leadership | static |
| 15 | **Technical highlights** | `TechnicalHighlights` | Why the platform behaves like a product | static |
| 16 | **Verify callout** | `VerifyCallout3D` | Public certificate verification, no account needed | `Certificate` |
| 17 | **Footer** | `components/layout/site-footer.tsx` | Four social channels, policies, contact, accessibility statement | static |

Block 16 sits deliberately above the footer: certificate verification is the single strongest trust
signal a youth organisation can show a stranger, so it is never buried.

---

## 2. Block 1 — the hero, element by element

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  PYPC  ·  Pakistan Youth Parliamentary Council                                │
│                                                                               │
│  ┌──────────────────────────────┐        ┌─────────────────────────────────┐  │
│  │ EYEBROW                      │        │  3D scene: rotating emblem on   │  │
│  │ "A national youth institution"│       │  a wireframe icosahedron,       │  │
│  │                              │        │  particles, depth layers        │  │
│  │ H1 (two lines, ≤ 9 words)    │        │  (WebGL, falls back to static   │  │
│  │ Empowering young leaders.    │        │  emblem art on low-power        │  │
│  │ Shaping Pakistan's future.   │        │  devices / reduced motion)      │  │
│  │                              │        └─────────────────────────────────┘  │
│  │ SUB (1 sentence, ≤ 22 words) │                                             │
│  │ A national council running parliamentary simulation, policy research        │
│  │ and leadership programmes for young people across Pakistan.                 │
│  │                                                                             │
│  │ [ Join PYPC ]  [ Explore programmes ]      ← 2 CTAs, one primary            │
│  │                                                                             │
│  │ ┌──────────┬──────────┬──────────┬──────────┐  ← 4 live metrics            │
│  │ │ Members  │Programmes│Valid certs│  Events  │     value OR zero-state line │
│  │ └──────────┴──────────┴──────────┴──────────┘                              │
│  │                                                                             │
│  │ ✦ tagline row: values, three inline proof points                           │
│  └───────────────────────────────────────────────────────────────────────────────┘
```

Rules enforced in code (`components/features/home-hero-3d.tsx`):

1. **One sentence of mission, above the fold.** H1 is a promise, not a slogan.
2. **Exactly two calls to action.** Primary = Join PYPC (membership). Secondary = Explore
   programmes. Verification gets its own block lower down; three hero buttons dilute all three.
3. **Metrics are never fake.** `HeroMetric` takes `value` and `zeroValue`. If the database has no
   members yet, the tile prints *"Founding cohort"*, not `0`. `components/motion/counter.tsx`
   initialises its state from the real value, so the server-rendered HTML shows the true number too
   — a slow connection never sees a lingering `0`.
4. **No blocking overlay ever.** The old full-screen "Loading platform 8%" overlay is deleted; the
   route-level skeleton in `app/loading.tsx` handles slow first paint. `scripts/check-performance.js`
   fails the build if either pattern comes back.
5. **3D that degrades gracefully.** `prefers-reduced-motion` disables the scene; the emblem is
   supplied by `scripts/build-logo-assets.py` (plate-free transparent PNGs) and only ever the
   user-supplied logo.

---

## 3. Copy deck for the whole page (what is written there now)

| Block | Headline | Sub-line | CTA |
|---|---|---|---|
| Hero | Empowering young leaders. Shaping Pakistan's future. | A national council running parliamentary simulation, policy research and leadership programmes for young people across Pakistan. | Join PYPC · Explore programmes |
| Stats | (no headline — the numbers speak) | Each tile carries a zero-state line when it has no data yet | — |
| Pillars | National priorities, delivered as programmes | Four pillars: civic education, parliamentary simulation, policy research, international participation | Read the pillar |
| Partners | Built through documented, formal correspondence | Every partnership begins with an MoU and a reference number | Partnership routes |
| Events | What is coming up across the Council | Confirmations are published as they are signed, never invented | All events |
| Governance | Institution-grade standards, not slogans | Published policies, an audit log and a code of conduct that applies to officers too | Read the policies |
| Research | A research desk that answers real policy questions | Briefs, explainers and submissions from members | Research desk |
| Reach | A national council with regional delivery | Islamabad headquarters, regional wings and campus circles | Regional structure |
| Programmes preview | Explore | Programmes · Events · Opportunities in one index | Open index |
| Membership | Participation deserves credible recognition. | Every completed programme issues a QR-verifiable certificate | See membership tiers |
| Path | A clear path from learning to leadership. | Four steps: learn, practise, serve, lead | Begin the path |
| International | Join from anywhere, and leave with documentation that travels. | USD pricing, visa invitation letters, time-zone-friendly delivery | International hub |
| Journey | From registration to national leadership | The documented route a member actually takes | Start now |
| Platform | Built to look like an institution and behave like a product | Performance budgets, accessibility, uptime status page | System status |
| Verify | Verify any PYPC certificate in seconds | QR code or reference number — no account needed | Verify a certificate |
| Footer | Pakistan Youth Parliamentary Council | Address block, four verified social channels, twelve policies, accessibility statement | Contact |

---

## 4. Conversion architecture (why the order is what it is)

1. **Trust before the ask.** Partners, governance and the research desk appear *above* the
   membership block, so a first-time visitor sees an institution before seeing a price.
2. **Three exits, repeated.** *Join PYPC* appears in the hero, the membership block and the
   international band. *Verify* appears in the header, its own block, and the footer.
3. **Proof beats adjectives.** Numbers come from the database; where there is no data yet the site
   says so in words instead of printing a fabricated figure or a bare zero.
4. **No dead ends.** Every card links somewhere real; every list has an index page; every programme
   has an application route behind authentication.

---

## 5. Mobile behaviour (measured by `scripts/check-responsive.js`, 63 checks)

| Breakpoint | Layout |
|---|---|
| ≤ 640 px | Single column; hero stacks scene *below* copy so the H1 is the first thing painted; metrics become a 2×2 grid; comparison tables scroll horizontally with the first column pinned |
| 641–1023 px | Two-column grids, drawer navigation, sticky primary CTA |
| ≥ 1024 px | Full hero split, four-column metrics, desktop dropdown menus, 3D scene at full particle count |
| ≥ 1536 px | Content capped at `container` width so lines never exceed ~85 characters |

Touch targets are ≥ 44 px, the drawer traps focus, and `overscroll-behavior` is contained so a
swipe on the 3D canvas never drags the page.

---

## 6. What each benchmark contributed

| Benchmark | Borrowed |
|---|---|
| European Youth Parliament | Programme-first information architecture; a member journey diagram |
| Commonwealth Youth Parliament | Formal institutional tone; governance stated before benefits |
| Water.org | One-sentence mission hero, measurable impact numbers, single primary CTA |
| UNDP youth pages | Policy/research prominence and regional reach visualisation |

---

## 7. How to change any of it

| Want to change | Edit |
|---|---|
| Hero headline, sub-line, CTAs, metrics | `components/features/home-hero-3d.tsx` |
| A block's headline or copy | the named component in the table in §1 |
| Order of blocks | `app/page.tsx` (numbered comments mark each block) |
| Zero-state wording | `zeroValue` / `zeroNote` on the stat definitions |
| Images used by the carousel and bands | `public/images/` (regenerate logos only via `scripts/build-logo-assets.py`, share cards only via `scripts/build-og-images.py`) |

Any edit here must keep `npm run build` green **and** `npm run check:suites` green; the suites assert
the hero renders, no loading overlay exists, and no bare zero appears in the served markup.
