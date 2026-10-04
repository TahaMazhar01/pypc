/**
 * PYPC newsroom — announcements from the Council.
 *
 * Editorial rule for this file (round 7, phase "Blog/News/Press"): every entry
 * must be traceable to something the Council has actually published — a concept
 * note, a policy decision, a platform capability that exists on this site, or a
 * dated statement from an officer. No third-party press coverage is invented, no
 * quote is attributed to a person who did not make it, and no partnership is
 * announced before the MoU is countersigned.
 *
 * To add an announcement: append one object, rebuild, and the newsroom index,
 * the sitemap and the homepage links pick it up automatically.
 */

export type NewsCategory = 'Announcement' | 'Programme' | 'Policy' | 'Platform' | 'Partnership'

export type NewsItem = {
  slug: string
  category: NewsCategory
  /** ISO date of publication. */
  date: string
  title: string
  /** One-sentence summary used on the index and in metadata. */
  summary: string
  /** Paragraphs of the article body. Plain text, rendered in order. */
  body: string[]
  /** Optional "read next" pointers to real pages on this site. */
  links?: { label: string; href: string }[]
}

export const news: NewsItem[] = [
  {
    slug: 'membership-tiers-2026',
    category: 'Announcement',
    date: '2026-10-03',
    title: 'Membership opens with four tiers, including a genuinely free one',
    summary:
      'Free Community, Associate, Executive and Institutional Partnership are now published with PKR and USD pricing and a full comparison of every benefit.',
    body: [
      'The Council has published its full membership ladder. Free Community Membership costs nothing and requires no card or wallet details: it includes a digital member card, the member dashboard, open webinars and workshops, the monthly opportunities newsletter and a participation certificate for any open programme completed.',
      'Associate Membership (PKR 2,500 / USD 15), Executive Membership (PKR 7,500 / USD 45) and Institutional Partnership (PKR 50,000 / USD 300 for up to 25 students) sit above it. Each tier is published with a row-by-row comparison that states what the tier does not include as clearly as what it does.',
      'Two commitments are attached to the pricing. Nothing is ever charged automatically — no tier renews without the member starting a payment. And when a member upgrades, the fee already paid is credited, with only the difference charged.',
      'Membership purchased through the platform activates automatically when the payment is confirmed by the gateway. The free tier activates immediately, through the same fulfilment path.'
    ],
    links: [
      { label: 'Compare the four tiers', href: '/membership' },
      { label: 'Refund policy', href: '/refund-policy' }
    ]
  },
  {
    slug: 'imun-2027-concept-note',
    category: 'Programme',
    date: '2026-09-20',
    title: 'International Model United Nations 2027: concept note published',
    summary:
      'Islamabad, January 2027 — 50+ countries targeted, with 30–40% of places planned as scholarships. The full concept note is available to read.',
    body: [
      'The concept note for IMUN 2027 sets out the committee structure, the delegate experience, the scholarship policy and the sponsorship framework for the Council’s flagship international convening in Islamabad.',
      'The note is explicit about what is confirmed and what is not. The venue and the final delegate fee are published only once the corresponding contracts are signed; the date remains provisional and is labelled as such. What is already decided is published in full: the target of participation from more than fifty countries, and the intention that between thirty and forty per cent of places are funded through the scholarship pathway.',
      'Scholarship coverage is described as a percentage of the delegate fee with the funded components named, rather than as an open-ended promise. Travel, accommodation and insurance remain the delegate’s responsibility unless an award letter states otherwise.',
      'Institutions and sponsors can review the partnership routes — MoU, campus circle and sponsorship tiers with named deliverables — before the registration window opens.'
    ],
    links: [
      { label: 'Read the IMUN 2027 concept note', href: '/conferences/imun-2027' },
      { label: 'Partnership and sponsorship routes', href: '/partnerships' }
    ]
  },
  {
    slug: 'accessibility-statement',
    category: 'Policy',
    date: '2026-09-12',
    title: 'Accessibility statement published: WCAG 2.2 AA, with limitations listed',
    summary:
      'The statement records what has been verified on the platform, the known limitations, and how to report a barrier.',
    body: [
      'The Council has published an accessibility statement covering keyboard operation, screen-reader support, contrast, motion and language. It distinguishes between what has been tested and what is still in progress, so that a disabled visitor knows what to expect before relying on the platform.',
      'Verified items include: full keyboard operation with visible focus indicators, landmarks and a skip link on every page, a colour-contrast audit covering forty-nine combinations, respect for the operating-system "reduce motion" setting — including disabling the 3D scenes — and text alternatives for every meaningful image.',
      'Known limitations are published rather than left for a visitor to discover: some third-party payment pages are outside the Council’s control and are governed by the provider’s own accessibility standards, and a small number of older PDF documents are not tagged for screen readers.',
      'A barrier can be reported through the contact page. Reports are treated as defects with a first response inside one working day.'
    ],
    links: [
      { label: 'Accessibility statement', href: '/accessibility' },
      { label: 'Report a barrier', href: '/contact' }
    ]
  },
  {
    slug: 'certificate-verification-open',
    category: 'Platform',
    date: '2026-09-05',
    title: 'Certificate verification is public — no account, no request to the secretariat',
    summary:
      'Every PYPC certificate carries a QR code and a reference code that resolves on the public verification page, including revoked certificates.',
    body: [
      'Certificates issued by the Council can now be verified by anyone holding the document: scanning the QR code printed on it, or typing the reference code, returns the holder’s name as issued, the certificate title, the issue date and the current status.',
      'Where a certificate has been withdrawn, the page returns a clear revoked status with the date of withdrawal rather than an ambiguous "not found" message. Employers, universities and scholarship committees therefore get a definitive answer without contacting the secretariat.',
      'Verification is deliberately public. A verification system that requires an account is not a verification system; it is a correspondence process.'
    ],
    links: [
      { label: 'Verify a certificate', href: '/verify' },
      { label: 'Certification policy', href: '/policies' }
    ]
  },
  {
    slug: 'correspondence-discipline',
    category: 'Policy',
    date: '2026-08-24',
    title: 'Every commitment is documented: how the Council corresponds',
    summary:
      'Partnership, sponsorship and delegation arrangements run through numbered correspondence, records of which members can request.',
    body: [
      'The Council operates on documented correspondence: invitations, MoUs, sponsorship arrangements and delegation appointments are issued with a reference number, countersigned where the arrangement is bilateral, and stored in the correspondence register.',
      'Members and partners can request their own correspondence records through the records service. The public correspondence format — what a document contains, who signs it, and what the reference number means — is published so that a recipient can confirm the authenticity of anything they receive.',
      'This discipline matters for young people applying for scholarships and jobs: a letter from the Council should be verifiable, not merely plausible.'
    ],
    links: [
      { label: 'Correspondence and records', href: '/records' },
      { label: 'Contact the secretariat', href: '/contact' }
    ]
  }
]

export function newsBySlug(slug: string): NewsItem | undefined {
  return news.find(item => item.slug === slug)
}

/** Newest first, always. */
export function sortedNews(): NewsItem[] {
  return [...news].sort((a, b) => (a.date < b.date ? 1 : -1))
}
