/**
 * IMUN 2027 — the full conference content model.
 *
 * Everything here comes from PYPC's concept note (PYPC/IMUN/2027/CN-01) plus the
 * public correspondence record. Three rules keep this file honest:
 *
 *   1. Planning-stage numbers are labelled as targets, never as facts.
 *      (`status: 'planned' | 'in-progress' | 'confirmed'`)
 *   2. Live numbers (delegations registered, applications received) are **not**
 *      stored here — they are read from the database at request time, so the page
 *      can never show a stale count.
 *   3. No partner, ministry or sponsor is named as confirmed unless the
 *      correspondence record shows a signed document.
 *
 * The conference-level facts (dates, theme, venue shortlist, budget note) stay in
 * `lib/data/conferences.ts`; this file holds the detail the dedicated page expands.
 */

export type ItemStatus = 'confirmed' | 'in-progress' | 'planned'

export const STATUS_LABEL: Record<ItemStatus, string> = {
  confirmed: 'Confirmed',
  'in-progress': 'In progress',
  planned: 'Planning stage'
}

/** Short facts for the "at a glance" grid at the top of the page. */
export const atAGlance = [
  { label: 'Format', value: 'Three-day international conference', icon: 'CalendarDays' },
  { label: 'Host city', value: 'Islamabad, Pakistan', icon: 'MapPin' },
  { label: 'Dates', value: 'January 2027 (target)', icon: 'CalendarDays' },
  { label: 'Delegations', value: '50+ countries targeted', icon: 'Globe2' },
  { label: 'Central theme', value: 'Climate Change at the Centre', icon: 'Leaf' },
  { label: 'Scholarship places', value: '30–40% of places planned', icon: 'GraduationCap' },
  { label: 'Registration', value: 'Target window: end October 2026', icon: 'FileText' },
  { label: 'Certificates', value: 'QR-verified, third-party checkable', icon: 'Award' }
] as const

/**
 * Venue shortlist. Both candidates are real, publicly bookable Islamabad venues;
 * the page states clearly that neither is booked yet.
 */
export const venues: {
  name: string
  location: string
  capacity: string
  strengths: string[]
  considerations: string[]
  status: ItemStatus
}[] = [
  {
    name: 'Pakistan-China Friendship Centre (PCFC)',
    location: 'Islamabad',
    capacity: 'Large plenary hall plus committee rooms',
    strengths: [
      'Purpose-built conference halls with plenary seating for an opening ceremony',
      'Multiple breakout committee rooms under one roof',
      'Central location with a landmark profile that suits an international event',
      'Established record of hosting national and diplomatic functions'
    ],
    considerations: [
      'Committee room configuration to be surveyed before final commitment',
      'Delegate pack storage and registration desk layout to be planned'
    ],
    status: 'planned'
  },
  {
    name: 'Jinnah Convention Centre',
    location: 'Islamabad',
    capacity: 'Very large main hall with supporting halls',
    strengths: [
      'Largest capacity of the shortlist — headroom for 50+ national delegations',
      'Strong national symbolism for an event built around Pakistan',
      'On-site parking and transport access for delegations',
      'Exhibition space suitable for a partner and university fair'
    ],
    considerations: [
      'Cost scales with hall count; committee rooms must be budgeted explicitly',
      'Dates depend on the venue calendar and are confirmed late in the cycle'
    ],
    status: 'planned'
  }
]

/** Structured cultural programme — part of the delegate experience, not an add-on. */
export const culturalProgramme = [
  {
    title: 'Sufi night',
    detail:
      'An evening of qawwali and Sufi performance for delegates and guests, with a short introduction to the tradition\'s place in South Asian culture.',
    icon: 'Music'
  },
  {
    title: 'Heritage and craft evening',
    detail:
      'Regional craft, textiles and cuisine presented with the artisans themselves, so the exchange runs in both directions.',
    icon: 'Palette'
  },
  {
    title: 'Islamabad discovery day',
    detail:
      'Guided visits to Faisal Mosque, Daman-e-Koh, Lok Virsa and the heritage museum — with hosts from PYPC\'s own membership.',
    icon: 'Mountain'
  },
  {
    title: 'International flag parade',
    detail:
      'Delegations enter the opening ceremony under their own flags, followed by the national anthems of participating countries.',
    icon: 'Flag'
  },
  {
    title: 'University and campus exchange',
    detail:
      'Short visits and joint sessions with Islamabad campuses, so visiting delegations meet Pakistani students outside the committee room.',
    icon: 'GraduationCap'
  },
  {
    title: 'Host family and buddy system',
    detail:
      'Every incoming delegation is paired with a Pakistani student buddy for the duration of the conference.',
    icon: 'Users'
  }
] as const

/**
 * Scholarship tiers. `coverage` describes exactly what is funded — this is the
 * wording that also appears in the award letter, so the site and the letter agree.
 */
export const scholarshipTiers: {
  name: string
  audience: string
  coverage: string[]
  share: string
  requires: string[]
  status: ItemStatus
}[] = [
  {
    name: 'Full scholarship',
    audience: 'International delegates with demonstrated need',
    coverage: ['Delegate fee waived', 'Accommodation provided', 'Local transport provided', 'Cultural programme included'],
    share: 'Limited number within the 30–40% scholarship pool',
    requires: ['Written statement of need', 'Motivation statement', 'Any available academic or society reference'],
    status: 'planned'
  },
  {
    name: 'Partial scholarship',
    audience: 'Merit and need, domestic and international',
    coverage: ['A stated percentage of the delegate fee waived', 'Covered components listed in the award letter'],
    share: 'The larger part of the 30–40% pool',
    requires: ['Motivation statement', 'Academic or society reference', 'Statement of what the applicant can contribute'],
    status: 'planned'
  },
  {
    name: 'Delegate pass (self-funded)',
    audience: 'All accepted delegates',
    coverage: ['Committee sessions', 'Training sessions', 'Conference materials and delegate pack', 'Cultural programme', 'QR-verified certificate'],
    share: 'Standard route — assessed on merit alone',
    requires: ['Completed application', 'Fee settlement within the published window'],
    status: 'planned'
  },
  {
    name: 'Institutional delegation support',
    audience: 'Universities and MUN societies',
    coverage: ['Reduced per-delegate fee for delegations of a stated size', 'Faculty advisor accreditation', 'Co-branded certificates where agreed in an MoU'],
    share: 'Negotiated per institution',
    requires: ['Letter from the institution', 'Named faculty advisor', 'MoU or sponsorship agreement'],
    status: 'planned'
  }
]

/**
 * Planning-level budget shape. Percentages, not amounts: the concept note gives a
 * PKR 5–10 crore range and the split is what the page can honestly show before
 * approval. `npm run check:contrast` and the page both keep the disclaimer visible.
 */
export const budgetLines: { category: string; share: number; detail: string }[] = [
  { category: 'Venue and production', share: 30, detail: 'Hall hire, staging, audio-visual, opening and closing ceremonies' },
  { category: 'Scholarships and access', share: 22, detail: 'Fee waivers, accommodation and local transport for awarded delegates' },
  { category: 'Outreach and marketing', share: 13, detail: 'International outreach, university campaigns, media and content' },
  { category: 'Security and logistics', share: 12, detail: 'Event security, medical cover, transport, delegate management' },
  { category: 'Technology and registration', share: 8, detail: 'Registration platform, badges, certificates, verification tooling' },
  { category: 'Culture and hospitality', share: 9, detail: 'Cultural programme, Sufi night, hospitality and delegate kits' },
  { category: 'Contingency and audit', share: 6, detail: 'Approved contingency plus independent financial review' }
]

/** Milestones, in the order the concept note sets them. */
export const timeline: { period: string; milestone: string; status: ItemStatus }[] = [
  { period: '2026 Q2–Q3', milestone: 'Core team formed; concept note finalised; workstreams assigned', status: 'in-progress' },
  { period: '2026 Q3', milestone: 'International outreach opens — universities, MUN societies and alumni networks', status: 'in-progress' },
  { period: '2026 Q3–Q4', milestone: 'Institutional engagement: ministries, PM Youth Programme, host venue shortlist', status: 'in-progress' },
  { period: '2026 Q4', milestone: 'Registration portal live; sponsorship and partnership packages released', status: 'planned' },
  { period: 'End October 2026', milestone: 'Registration opens — members notified first, then public', status: 'planned' },
  { period: '2026 Q4 – 2027 Q1', milestone: 'Scholarship review, delegation confirmations, visa invitation letters issued', status: 'planned' },
  { period: 'January 2027', milestone: 'IMUN 2027 conference — three days, Islamabad', status: 'planned' },
  { period: 'Post-conference', milestone: 'Outcome document published; certificates issued and verifiable; partner reporting', status: 'planned' }
]

/** Workstreams and their current state — this is the "what is actually happening" panel. */
export const workstreams: { name: string; detail: string; progress: number; status: ItemStatus }[] = [
  { name: 'International outreach', detail: 'University and MUN society contact programme across the target regions', progress: 55, status: 'in-progress' },
  { name: 'Core conference team', detail: 'Secretariat roles filled and workstream leads assigned', progress: 70, status: 'in-progress' },
  { name: 'Registration platform', detail: 'Delegate registration, committee assignment and fee handling on this website', progress: 45, status: 'in-progress' },
  { name: 'Brand and conference identity', detail: 'IMUN 2027 identity, delegate kit design and certificate artwork', progress: 40, status: 'in-progress' },
  { name: 'Partnerships and MoUs', detail: 'University, institutional and corporate partnership documents', progress: 35, status: 'in-progress' },
  { name: 'Scholarship framework', detail: 'Criteria, review panel and award letter templates', progress: 50, status: 'in-progress' },
  { name: 'Ambassador network', detail: 'Campus ambassadors in Pakistan and among international alumni', progress: 30, status: 'planned' },
  { name: 'Institutional engagement', detail: 'Ministries, PM Youth Programme and venue authorities', progress: 40, status: 'in-progress' },
  { name: 'Committee structuring', detail: 'Committee list, agendas, background guides and chairs', progress: 25, status: 'planned' },
  { name: 'Marketing and media', detail: 'Announcement calendar, press kit and social rollout', progress: 30, status: 'planned' },
  { name: 'Venue operations', detail: 'Hall configuration, transport, security and delegate flow', progress: 20, status: 'planned' },
  { name: 'Finance and audit', detail: 'Budget approval route, sponsorship settlement and independent review', progress: 25, status: 'planned' }
]

/**
 * Why this conference is not a standard MUN weekend. Each row is a dimension the
 * delegate actually experiences: left column is the usual conference, right column
 * is what IMUN 2027 is built to add.
 */
export const whyDifferent: { dimension: string; standard: string; imun: string }[] = [
  { dimension: 'Scope', standard: 'Committee simulation only', imun: 'Committees plus climate diplomacy track, training and a published outcome document' },
  { dimension: 'Themes', standard: 'General set of topics', imun: 'One central theme — climate change — carried across every committee' },
  { dimension: 'Access', standard: 'Fee-only participation', imun: '30–40% of places planned as scholarship-supported, with a written award letter' },
  { dimension: 'International mix', standard: 'Mostly local delegations', imun: '50+ countries targeted through an active outreach programme' },
  { dimension: 'Culture', standard: 'Optional social event', imun: 'Structured cultural exchange: Sufi night, heritage evening, Islamabad discovery day' },
  { dimension: 'Recognition', standard: 'Printed certificate', imun: 'QR-verified certificate any employer or university can check online' },
  { dimension: 'Institutions', standard: 'Little government contact', imun: 'Documented engagement with ministries, the PM Youth Programme and universities' },
  { dimension: 'After the event', standard: 'Conference ends, contact ends', imun: 'Alumni network, campus ambassadors and a published outcome document' }
]

/** Who can take part — the accordion content, stated plainly. */
export const participation: { question: string; answer: string }[] = [
  {
    question: 'Do I need Model UN experience?',
    answer:
      'No. IMUN 2027 does not require prior MUN experience. Delegates who are new to the format are placed in training sessions before committee work begins, and background guides are issued in advance.'
  },
  {
    question: 'Who is eligible?',
    answer:
      'University students, recently graduated young professionals and senior school students where an institution sends a supervised delegation. Age and eligibility bands are published with the registration opening.'
  },
  {
    question: 'Can universities send a delegation?',
    answer:
      'Yes. Institutions can register a delegation with a named faculty advisor, and can negotiate a reduced per-delegate fee, faculty accreditation and co-branded certificates through an MoU.'
  },
  {
    question: 'I am outside Pakistan — what do I need?',
    answer:
      'A valid passport, a confirmed registration, and the invitation letter PYPC issues on request through the visa letter page. Travel, accommodation (unless awarded) and insurance are the delegate\'s responsibility.'
  },
  {
    question: 'What language is the conference in?',
    answer:
      'English, with interpretation support for delegations that need it discussed case by case. Committee rules of procedure follow standard international MUN practice.'
  },
  {
    question: 'How are delegates and committees assigned?',
    answer:
      'Preference is collected at registration; assignment is balanced across committees, regions and experience levels so every committee has a genuine spread of countries.'
  }
]

/** Notes that must stay visible wherever the planning numbers appear. */
export const disclaimer =
  'Planning-stage information from PYPC\'s concept note (PYPC/IMUN/2027/CN-01). Dates, venue, budget and scholarship numbers are targets subject to approval, and this page is updated the moment any of them is confirmed.'


/* ==========================================================================
   The concept note, in full
   ==========================================================================
   Section-by-section content from PYPC/IMUN/2027/CN-01. The page renders these
   in order, so a change to a paragraph here appears on the live page — there is
   no second copy in a component.
   ========================================================================== */

/** The organiser's own description of PYPC, used verbatim in the concept note. */
export const organiserVision = 'Your Voice. Your Network. Your Future.'
export const organiserPhilosophy = 'Lead. Innovate. Serve. Reform. Inspire.'

/** The ten headline facts, exactly as the concept note states them. */
export const atAGlanceFull: { label: string; value: string }[] = [
  { label: 'Event', value: 'Three-day international Model UN conference' },
  { label: 'Host City', value: 'Islamabad, Pakistan' },
  { label: 'Target Participation', value: 'From 50+ countries' },
  { label: 'Dates', value: 'January 2027 (TBC)' },
  { label: 'Theme', value: 'Climate Change at the Centre' },
  { label: 'Venue', value: 'PCFC or Jinnah Convention Centre' },
  { label: 'Access', value: '30–40% scholarship allocation' },
  { label: 'Budget', value: 'PKR 5–10 crore (planning-level)' },
  { label: 'Register', value: 'Target window: end of October 2026' },
  { label: 'Organiser', value: 'Pakistan Youth Parliamentary Council' }
]

/** Agenda topics the committees and climate-diplomacy sessions are expected to cover. */
export const agendaTopics = [
  'Climate change',
  'Climate justice',
  'Climate finance',
  'Sustainable development',
  'Environmental diplomacy',
  'Youth participation in climate policy',
  'Resilient communities',
  'Green development',
  'International climate commitments',
  'Technology and innovation for sustainability',
  'Sustainable cities',
  'Disaster resilience',
  'Global cooperation on environmental challenges'
]

/** The frameworks the theme connects to, so the conference is not debating in a vacuum. */
export const climateFrameworks = [
  { code: 'SDGs', name: 'Sustainable Development Goals' },
  { code: 'Paris Agreement', name: 'UNFCCC Paris Agreement 2015' },
  { code: 'NDCs', name: 'Nationally Determined Contributions' }
]

/** Who the platform is open to — the concept note's own list. */
export const participantGroups = [
  'University and college students',
  'Young professionals and international youth delegates',
  'Existing MUN participants and university MUN societies',
  'Youth leaders and emerging diplomats',
  'Researchers and policy-oriented young people'
]

/** The three-day programme architecture (concept note §6). */
export const programmeDays: {
  day: string
  title: string
  items: string[]
}[] = [
  {
    day: 'Day 1',
    title: 'Opening & Orientation',
    items: [
      'Opening ceremony',
      'International Flag Parade',
      'Formal orientation',
      'Committee sessions begin',
      'Keynote addresses',
      'Diplomatic networking'
    ]
  },
  {
    day: 'Day 2',
    title: 'Intensive Proceedings',
    items: [
      'Intensive committee proceedings',
      'Policy discussions',
      'Climate diplomacy sessions',
      'Expert briefings',
      'Cultural exchange',
      'Continued networking'
    ]
  },
  {
    day: 'Day 3',
    title: 'Conclusions & Celebration',
    items: [
      'Final proceedings',
      'Adoption of resolutions',
      'Closing ceremony',
      'Awards & recognition',
      'Cultural programme',
      'Sufi Night / Pakistan experience'
    ]
  }
]

/** Concept-note sections rendered in order on the page. */
export const conceptSections: {
  id: string
  number: string
  title: string
  paragraphs: string[]
  bullets?: string[]
  status: ItemStatus
}[] = [
  {
    id: 'core-concept',
    number: '1',
    title: 'Core Concept',
    status: 'planned',
    paragraphs: [
      'IMUN 2027 is planned as a three-day international Model United Nations conference hosted in Pakistan. It is designed to bring together young people from Pakistan and across the world for structured diplomacy, debate, policy dialogue, leadership development, cultural exchange and international networking.',
      'The conference seeks to create a serious, high-visibility platform where youth can engage with global challenges in a format that combines the traditional strengths of Model United Nations with contemporary themes of climate diplomacy, institutional engagement and cross-cultural understanding.'
    ],
    bullets: [
      'Participation is deliberately not restricted to any academic discipline, and prior MUN experience is not mandatory.',
      'The platform is open to university and college students, young professionals and international youth delegates, existing MUN participants and university MUN societies, youth leaders and emerging diplomats, and researchers and policy-oriented young people.'
    ]
  },
  {
    id: 'organiser',
    number: '2',
    title: 'Organizer — Pakistan Youth Parliamentary Council (PYPC)',
    status: 'confirmed',
    paragraphs: [
      'Pakistan Youth Parliamentary Council (PYPC) is developing and leading the IMUN 2027 initiative. PYPC is a non-partisan, youth-led national platform established to cultivate informed, ethical and future-ready leadership among Pakistan’s emerging generation.',
      'Through structured parliamentary education, civic engagement programmes, institutional exposure visits and values-based leadership development, the Council equips young Pakistanis with a deeper understanding of constitutional governance, democratic institutions, national security and public service.',
      `PYPC’s broader vision is articulated as “${organiserVision}” and its leadership philosophy as “${organiserPhilosophy}”. IMUN 2027 therefore fits naturally into PYPC’s wider objective of creating meaningful opportunities for young people to engage with parliamentary institutions, diplomacy, policy processes, international organizations and leadership networks. The conference is positioned as a flagship international initiative of the Council.`
    ]
  },
  {
    id: 'theme',
    number: '3',
    title: 'Proposed Theme — Climate Change at the Centre',
    status: 'planned',
    paragraphs: [
      'The current concept places Climate Change at the centre of IMUN 2027. The intention is to move beyond a conventional MUN format and use climate diplomacy as the primary thematic platform.',
      'Agenda items and committee simulations are expected to engage with climate change, climate justice, climate finance, sustainable development, environmental diplomacy, youth participation in climate policy, resilient communities, green development, international climate commitments, technology and innovation for sustainability, sustainable cities, disaster resilience and global cooperation on environmental challenges.',
      'This thematic focus creates a direct and substantive connection with the Sustainable Development Goals (SDGs), the Paris Agreement, Nationally Determined Contributions (NDCs) and the wider international climate agenda. It also allows IMUN to position itself as a youth contribution to the global conversation on climate action rather than solely as a competitive debating exercise.'
    ]
  },
  {
    id: 'scale',
    number: '4',
    title: 'Scale & International Participation',
    status: 'in-progress',
    paragraphs: [
      'The ambition is to establish IMUN as a genuinely international platform rather than a purely local or national MUN competition. The current target is representation from 50+ countries.',
      'To support this objective, a proposed international youth and diplomatic network is under development. Country representatives and ambassadors would assist with delegate recruitment, university outreach, international MUN outreach, cultural exchange coordination, country representation, partnership development, international communications and liaison with participating institutions.',
      'Over time, this network is intended to evolve into a standing 50+ country youth diplomacy network connected with IMUN, providing continuity beyond the three-day conference itself and creating longer-term channels for international youth collaboration.'
    ]
  },
  {
    id: 'flag-parade',
    number: '7',
    title: 'International Flag Parade',
    status: 'planned',
    paragraphs: [
      'One of the major proposed highlights of IMUN 2027 is an International Flag Parade. Delegates representing the participating countries would enter the opening ceremony with their national flags, creating a highly visual and symbolic opening segment that represents international cooperation and youth diplomacy.',
      'This element is intended to become one of IMUN’s signature moments and to provide strong international visibility and media value for the event.'
    ]
  },
  {
    id: 'engagement',
    number: '9',
    title: 'Government & Institutional Engagement',
    status: 'in-progress',
    paragraphs: [
      'A core design principle of IMUN 2027 is that the conference should not operate in isolation from Pakistan’s institutional ecosystem.',
      'Work on institutional engagement has already commenced. A meeting with the Prime Minister’s Youth Programme team is planned for the second week of October 2026. Following that engagement, the registration and institutional planning process is expected to move into a more formal phase of approvals, coordination and partnership finalization.'
    ],
    bullets: [
      'Government organizations and federal ministries',
      'Public-sector and parliamentary institutions',
      'Youth-focused government programmes',
      'Universities, existing MUN networks and student bodies',
      'Private-sector organizations, think tanks and development organizations',
      'International organizations and civil-society organizations'
    ]
  },
  {
    id: 'partnerships',
    number: '13',
    title: 'Partnerships & MOUs',
    status: 'in-progress',
    paragraphs: [
      'Partnership development has already begun. The wider partnership strategy includes systematic approaches to international organizations, universities, established MUN organizations, international youth networks, development organizations, Pakistani public and private institutions, corporate organizations, media partners and educational institutions.',
      'The strategic objective is to construct a genuine institutional ecosystem around IMUN rather than relying solely on registration revenue for sustainability and credibility.'
    ]
  },
  {
    id: 'outreach',
    number: '14',
    title: 'UK University & International MUN Outreach',
    status: 'in-progress',
    paragraphs: [
      'The international outreach team has already commenced work on UK university outreach and broader international MUN outreach. A structured database is being developed to systematically identify potential partner universities, MUN societies, international MUN organizers, student networks, youth organizations, international partners and potential individual delegates.',
      'The work includes building outreach lists and establishing communication channels with relevant organizations. This channel is intended to become one of the primary recruitment pathways for international delegates.'
    ]
  },
  {
    id: 'marketing',
    number: '15',
    title: 'Marketing & Positioning Strategy',
    status: 'planned',
    paragraphs: [
      'The marketing approach under consideration is deliberately designed to differ from conventional MUN marketing. Rather than focusing narrowly on registration announcements, the campaign is expected to revolve around the themes below, alongside endorsements from institutional partners and youth leaders to build credibility in advance of the full opening of registration.'
    ],
    bullets: [
      'International youth diplomacy',
      'Climate leadership',
      'Pakistan as a global youth diplomacy hub',
      '50+ countries',
      'The International Flag Parade',
      'Cultural exchange and the Islamabad experience',
      'Government and institutional engagement'
    ]
  },
  {
    id: 'digital',
    number: '16',
    title: 'Digital Infrastructure & Branding',
    status: 'in-progress',
    paragraphs: [
      'A dedicated registration portal and website is regarded as an essential component of the project — and this platform is that portal. It handles registration, delegate profiles, country and committee allocation, payment processing, scholarship applications, delegate verification, document management, communication, updates, certificates and general event information.',
      'Parallel branding work covers the IMUN identity, website and portal design, social-media templates, delegate certificates, country and committee materials, ambassador profiles, sponsorship decks, partnership documents, promotional videos, event signage, stage design and delegate materials. The overall identity is intended to communicate internationalism, diplomacy, youth leadership and climate action.'
    ]
  },
  {
    id: 'larger-vision',
    number: '19',
    title: 'The Larger Vision',
    status: 'planned',
    paragraphs: [
      'The most accurate way to articulate the project is that IMUN 2027 is being developed as an international youth diplomacy platform hosted in Pakistan. It uses the Model United Nations format as its foundation while extending the experience into climate action, international networking, cultural diplomacy and structured institutional engagement.',
      'The long-term ambition is framed around 50+ countries, three intensive days, climate diplomacy, international youth leadership, global networking, cultural exchange, an International Flag Parade, a Sufi and Pakistani cultural experience, government and institutional engagement, university and MUN partnerships, and a continuing youth diplomacy network.'
    ]
  }
]

/** Concept note §18 — the work already under way as of September 2026. */
export const currentStatus: string[] = [
  'International outreach',
  'UK university and MUN database construction',
  'Core team development',
  'Registration-portal planning',
  'Branding',
  'International partnership development',
  'MOU discussions',
  'Institutional meetings',
  'Government engagement',
  'Marketing concept development',
  'Scholarship framework design',
  'International ambassador network planning',
  'Sponsorship and collaboration planning',
  'Research and documentation',
  'Committee and team structuring'
]

/** The sentence the concept note closes on. */
export const closingVision =
  'Bringing the world’s young voices together in Pakistan to debate global challenges, build international friendships, experience cultural diplomacy, and shape ideas for a more sustainable future.'

/**
 * Signatories. Names and contact details are published here with the
 * organisation's authorisation; they are shown with the same respect as the
 * concept note's own signature block.
 */
export const signatories = [
  {
    name: 'Dr. Mohsin Ejaz Chaudhry',
    role: 'Founder & Chairperson',
    organisation: 'Pakistan Youth Parliamentary Council',
    phones: ['+92 315 5729598'],
    emails: ['Mohsinejaz98@gmail.com']
  },
  {
    name: 'Ayesha Qaisar',
    role: 'Co-Founder & Chief Executive',
    organisation: 'Pakistan Youth Parliamentary Council',
    phones: ['+92 371 3581114', '+92 371 3380104'],
    emails: ['ayshstec@gmail.com', 'ayshstec@icloud.com']
  }
] as const
