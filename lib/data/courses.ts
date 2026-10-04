/**
 * Certified short courses and research services.
 * Delivery model and pricing mirror PYPC's membership structure: included for
 * active members, purchasable individually by anyone, USD pricing for
 * international learners.
 */

export const courses = [
  {
    slug: 'parliamentary-procedure',
    title: 'Parliamentary Procedure & Legislative Drafting',
    level: 'Foundation',
    hours: 24,
    weeks: 6,
    mode: 'Online · recorded + live clinics',
    language: 'English',
    pricePkr: 12000,
    priceUsd: 79,
    summary:
      'How legislation actually moves: rules of procedure, committee scrutiny, drafting technique and amendment strategy, taught through simulation.',
    outcomes: [
      'Read and interpret rules of procedure confidently',
      'Draft a bill with an explanatory memorandum',
      'Lead committee scrutiny and amendment debate'
    ],
    icon: 'Landmark'
  },
  {
    slug: 'climate-policy',
    title: 'Climate Policy & Adaptation Finance',
    level: 'Intermediate',
    hours: 30,
    weeks: 8,
    mode: 'Online + optional Islamabad workshop',
    language: 'English',
    pricePkr: 18000,
    priceUsd: 115,
    summary:
      'Climate science to climate finance: vulnerability assessment, national adaptation planning, and how climate-vulnerable states negotiate.',
    outcomes: [
      'Build a district-level vulnerability profile',
      'Map adaptation finance instruments and access routes',
      'Draft a climate policy brief for decision-makers'
    ],
    icon: 'Leaf'
  },
  {
    slug: 'ai-governance',
    title: 'AI Governance & Digital Rights',
    level: 'Intermediate',
    hours: 24,
    weeks: 6,
    mode: 'Online · recorded + lab sessions',
    language: 'English',
    pricePkr: 15000,
    priceUsd: 95,
    summary:
      'How AI systems work, where they fail, and what responsible governance looks like — data protection, accountability, bias and the digital economy.',
    outcomes: [
      'Evaluate an AI system for risk and accountability',
      'Compare data protection frameworks',
      'Produce a governance memo or impact assessment'
    ],
    icon: 'BrainCircuit'
  },
  {
    slug: 'policy-research-methods',
    title: 'Policy Research & Evidence Methods',
    level: 'Foundation',
    hours: 20,
    weeks: 5,
    mode: 'Online · self-paced with mentoring',
    language: 'English',
    pricePkr: 10000,
    priceUsd: 65,
    summary:
      'Designing credible research: problem framing, evidence review, stakeholder mapping, survey design, ethics and clear policy writing.',
    outcomes: [
      'Frame a policy problem with a clear research question',
      'Review and synthesise evidence responsibly',
      'Write a publishable policy brief'
    ],
    icon: 'ScrollText'
  },
  {
    slug: 'negotiation-diplomacy',
    title: 'Negotiation, Diplomacy & Model UN Mastery',
    level: 'All levels',
    hours: 18,
    weeks: 4,
    mode: 'Online · intensive simulation',
    language: 'English',
    pricePkr: 9000,
    priceUsd: 59,
    summary:
      'Preparation for competitive Model UN and diplomatic simulations: position papers, bloc strategy, amendment tactics and speech craft.',
    outcomes: [
      'Write a defensible position paper',
      'Negotiate blocs and build consensus',
      'Deliver structured, persuasive speeches'
    ],
    icon: 'Scale'
  },
  {
    slug: 'civic-leadership',
    title: 'Civic Leadership & Community Organising',
    level: 'Foundation',
    hours: 16,
    weeks: 4,
    mode: 'Online + campus circle toolkit',
    language: 'English',
    pricePkr: 8000,
    priceUsd: 49,
    summary:
      'Turn intent into organised action: campaign planning, volunteer mobilisation, event delivery and ethical advocacy.',
    outcomes: [
      'Design a community campaign with measurable goals',
      'Recruit and manage volunteers',
      'Deliver an event safely and accountably'
    ],
    icon: 'UsersRound'
  }
]

export const researchServices = [
  {
    title: 'Policy research consultation',
    detail:
      'A scoped consultation with the PYPC research desk on a policy question — framing, evidence sources, stakeholder map and a written summary of findings.',
    turnaround: '2–3 weeks',
    icon: 'Search'
  },
  {
    title: 'Evidence review & brief drafting',
    detail:
      'A structured review of existing literature and data on a defined question, delivered as a citable policy brief on PYPC letterhead.',
    turnaround: '3–4 weeks',
    icon: 'BookOpen'
  },
  {
    title: 'Survey & stakeholder mapping',
    detail:
      'Design and fielding support for youth-focused surveys, plus mapping of duty bearers and influencers for advocacy planning.',
    turnaround: 'Scoped per project',
    icon: 'Target'
  },
  {
    title: 'Co-authored publication',
    detail:
      'Collaborative research with PYPC on climate, AI governance, justice reform or youth participation, with authorship credited.',
    turnaround: 'By agreement',
    icon: 'FileText'
  }
]
