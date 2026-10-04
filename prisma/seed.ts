/**
 * PYPC database seed.
 *
 * Creates:
 *  - Membership plans (Free / Associate / Executive / Institutional)
 *  - 7 thematic programmes
 *  - Events, opportunities
 *  - Admin, executive and demo member accounts
 *  - Two verifiable demo certificates (valid + revoked) so the /verify flow
 *    can be tested immediately
 *
 * Run: npm run db:seed
 */

import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

/**
 * Make the seed work no matter how the environment was loaded.
 *
 * Prisma resolves a relative `file:./dev.db` against the schema directory when
 * it loaded the value itself, but a value that is already in the environment
 * (tsx, CI, Docker) is resolved against the process cwd — which silently
 * targets a second, empty database. So: load `.env` if nobody else did, and
 * anchor relative SQLite files to `prisma/` before the client is created.
 */

function bootstrapDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    for (const candidate of ['.env', '.env.local']) {
      if (!existsSync(candidate)) continue
      for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/)
        if (!match) continue
        const value = match[2].replace(/^["']|["']$/g, '')
        if (!(match[1] in process.env)) process.env[match[1]] = value
      }
    }
  }

  const url = process.env.DATABASE_URL
  if (url?.startsWith('file:')) {
    const file = url.slice('file:'.length)
    if (file && !isAbsolute(file)) {
      process.env.DATABASE_URL = `file:${resolve('prisma', file.replace(/^\.\//, ''))}`
    }
  }
}

bootstrapDatabaseUrl()

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { MEMBERSHIP_TIERS } from '../lib/data/membership'

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'Pypc@2026'
const CODE_VALID = 'PYPC-A2B4-C6D8-E9F1'
const CODE_REVOKED = 'PYPC-Z9Y8-X7W6-V5U4'

async function main() {
  console.log('► Seeding PYPC database…')

  // ---------------------------------------------------------------- plans
  // Plans come from lib/data/membership.ts so the published membership page,
  // the comparison matrix and the database can never disagree.
  const plans = MEMBERSHIP_TIERS.map(tier => ({
    code: tier.code,
    name: tier.name,
    tier: tier.tier,
    tagline: tier.tagline,
    description: tier.description,
    pricePkr: tier.pricePkr,
    priceUsd: tier.priceUsd,
    durationMonths: tier.durationMonths,
    features: JSON.stringify(tier.features),
    benefits: JSON.stringify(tier.benefits),
    isPopular: tier.isPopular,
    isActive: true,
    sortOrder: tier.sortOrder
  }))

  for (const plan of plans) {
    await prisma.membershipPlan.upsert({ where: { code: plan.code }, update: plan, create: plan })
  }
  console.log(`  ✓ ${plans.length} membership plans`)

  // ----------------------------------------------------------- programmes
  const programmes = [
    {
      slug: 'youth-parliament',
      title: 'Youth Parliament Programme',
      category: 'Governance',
      mode: 'Hybrid',
      durationWeeks: 12,
      seats: 120,
      summary:
        'A structured parliamentary simulation where young Pakistanis draft bills, sit on committees and debate national policy.',
      description:
        'The Youth Parliament Programme is PYPC\'s flagship governance initiative. Participants learn the full legislative cycle — research, drafting, committee scrutiny, amendment, debate and voting — under the guidance of experienced parliamentary mentors. Each cohort produces a policy report with recommendations presented to stakeholders.',
      objectives: JSON.stringify([
        'Understand the legislative process and parliamentary procedure',
        'Develop research, drafting and public speaking capability',
        'Practise cross-party negotiation and consensus building'
      ]),
      outcomes: JSON.stringify([
        'A drafted bill defended in a mock parliamentary session',
        'Committee report with policy recommendations',
        'Certificate of participation and leadership record'
      ]),
      structure: JSON.stringify([
        'Weeks 1–2: Orientation, rules of procedure, research methods',
        'Weeks 3–5: Committee formation, bill drafting, expert sessions',
        'Weeks 6–9: Committee scrutiny, amendments, debate practice',
        'Weeks 10–12: National sitting, voting, policy report launch'
      ]),
      isFeatured: true,
      sortOrder: 1
    },
    {
      slug: 'climate-action',
      title: 'Climate Action & Policy Lab',
      category: 'Climate',
      mode: 'Hybrid',
      durationWeeks: 10,
      seats: 100,
      summary:
        'Climate literacy, adaptation policy and community resilience projects for young leaders from flood-affected and climate-vulnerable districts.',
      description:
        'Pakistan is among the most climate-vulnerable countries in the world. This programme equips young people with the science, policy tools and project skills needed to lead local adaptation work — from heat resilience in cities to watershed restoration in rural districts.',
      objectives: JSON.stringify([
        'Build practical climate literacy grounded in Pakistan\'s context',
        'Analyse national climate policy and provincial adaptation plans',
        'Design and pitch a community climate resilience project'
      ]),
      outcomes: JSON.stringify([
        'Climate policy brief for a selected district',
        'Community action project proposal with budget',
        'Climate leadership certificate'
      ]),
      structure: JSON.stringify([
        'Weeks 1–3: Climate science, vulnerability mapping, policy landscape',
        'Weeks 4–6: Sector deep dives — water, energy, agriculture, cities',
        'Weeks 7–9: Project design sprints with mentorship',
        'Week 10: Climate Policy Lab showcase and jury review'
      ]),
      isFeatured: true,
      sortOrder: 2
    },
    {
      slug: 'ai-technology',
      title: 'AI & Digital Futures Programme',
      category: 'Technology',
      mode: 'Online',
      durationWeeks: 8,
      seats: 150,
      summary:
        'AI literacy, responsible technology, digital economy policy and applied innovation for young builders.',
      description:
        'This programme prepares young Pakistanis for an AI-shaped economy — covering how modern AI systems work, what responsible deployment looks like, and how the digital economy can create youth employment. Participants build a small supervised project applying these ideas.',
      objectives: JSON.stringify([
        'Understand AI capabilities, limits and risks',
        'Evaluate AI governance and data protection frameworks',
        'Build a responsible AI mini-project or policy memo'
      ]),
      outcomes: JSON.stringify([
        'Working prototype or policy memo on responsible AI',
        'Digital literacy portfolio entry',
        'AI programme certificate'
      ]),
      structure: JSON.stringify([
        'Weeks 1–2: Foundations — how AI systems learn and fail',
        'Weeks 3–4: Data, privacy, bias and accountability',
        'Weeks 5–6: Digital economy, freelancing and future work',
        'Weeks 7–8: Applied projects, demo day and peer review'
      ]),
      isFeatured: true,
      sortOrder: 3
    },
    {
      slug: 'human-rights',
      title: 'Human Rights & Legal Literacy',
      category: 'Rights',
      mode: 'Hybrid',
      durationWeeks: 8,
      seats: 80,
      summary:
        'Constitutional rights, legal literacy and responsible advocacy training for community-level youth leaders.',
      description:
        'Participants learn the constitutional and legal foundations of human rights in Pakistan, how to identify and document violations responsibly, and how to advocate through lawful, evidence-based channels.',
      objectives: JSON.stringify([
        'Understand fundamental rights under the Constitution',
        'Learn lawful documentation and referral pathways',
        'Build responsible advocacy and communications skills'
      ]),
      outcomes: JSON.stringify([
        'Rights awareness toolkit for a campus or community',
        'Case-referral pathway map',
        'Human rights literacy certificate'
      ]),
      structure: JSON.stringify([
        'Weeks 1–2: Constitutional framework and institutions',
        'Weeks 3–4: Gender, minority, labour and disability rights',
        'Weeks 5–6: Documentation, ethics, referral and duty bearers',
        'Weeks 7–8: Advocacy campaign clinic and presentations'
      ]),
      isFeatured: false,
      sortOrder: 4
    },
    {
      slug: 'entrepreneurship',
      title: 'Youth Entrepreneurship Bootcamp',
      category: 'Enterprise',
      mode: 'Onsite',
      durationWeeks: 6,
      seats: 60,
      summary:
        'From idea to pitch: business modelling, customer discovery, unit economics and investor presentation.',
      description:
        'An intensive bootcamp for young founders and aspiring founders. Teams move from problem discovery to a validated business model, learning directly from practising entrepreneurs and mentors, and finish with an investor-ready pitch.',
      objectives: JSON.stringify([
        'Validate a real problem with customer discovery',
        'Build and test a business model and unit economics',
        'Deliver an investor-ready pitch'
      ]),
      outcomes: JSON.stringify([
        'Validated business model canvas',
        'Financial model and pitch deck',
        'Bootcamp completion certificate'
      ]),
      structure: JSON.stringify([
        'Week 1: Problem discovery and customer interviews',
        'Week 2: Value proposition and business model design',
        'Week 3: Unit economics and pricing',
        'Week 4: Marketing, channels and operations',
        'Week 5: Legal, tax and registration essentials',
        'Week 6: Demo day and investor feedback'
      ]),
      isFeatured: false,
      sortOrder: 5
    },
    {
      slug: 'leadership-fellowship',
      title: 'National Youth Leadership Fellowship',
      category: 'Fellowship',
      mode: 'Hybrid',
      durationWeeks: 16,
      seats: 40,
      summary:
        'A selective 16-week fellowship for young leaders working on policy, research, diplomacy, climate or technology projects.',
      description:
        'The National Youth Leadership Fellowship is PYPC\'s most competitive pathway. Fellows are matched with senior mentors, complete a supervised research or delivery project, and join the PYPC fellowship alumni network.',
      objectives: JSON.stringify([
        'Complete a supervised policy, research or delivery project',
        'Develop diplomatic, negotiation and institutional skills',
        'Build a durable professional and mentor network'
      ]),
      outcomes: JSON.stringify([
        'Published research or project deliverable',
        'Fellowship certificate and alumni status',
        'Reference letters for further study or employment'
      ]),
      structure: JSON.stringify([
        'Weeks 1–2: Induction, mentor matching, project scoping',
        'Weeks 3–8: Core masterclasses and supervised research',
        'Weeks 9–14: Delivery, mid-term review, stakeholder engagement',
        'Weeks 15–16: Final presentation and fellowship convocation'
      ]),
      isFeatured: true,
      sortOrder: 6
    },
    {
      slug: 'justice-reform',
      title: 'Justice Reform & Prisoner Rights Circle',
      category: 'Justice',
      mode: 'Hybrid',
      durationWeeks: 8,
      seats: 50,
      summary:
        'Evidence-based study of justice delivery, rehabilitation, prisoner dignity and criminal justice reform.',
      description:
        'A discussion and research circle examining Pakistan\'s justice system — timely justice, legal aid, prison conditions, rehabilitation and reintegration — producing evidence-based reform recommendations.',
      objectives: JSON.stringify([
        'Understand justice system structure and bottlenecks',
        'Examine rehabilitation and reintegration practices',
        'Produce evidence-based reform recommendations'
      ]),
      outcomes: JSON.stringify([
        'Justice reform research memo',
        'Roundtable participation record',
        'Circle completion certificate'
      ]),
      structure: JSON.stringify([
        'Weeks 1–2: System overview, backlog and access to justice',
        'Weeks 3–4: Legal aid, under-trial detention and fair trial',
        'Weeks 5–6: Prisons, dignity, health and rehabilitation',
        'Weeks 7–8: Reform proposals and stakeholder roundtable'
      ]),
      isFeatured: false,
      sortOrder: 7
    }
  ]

  for (const programme of programmes) {
    await prisma.programme.upsert({
      where: { slug: programme.slug },
      update: programme,
      create: { ...programme, feePkr: 0, feeUsd: 0 }
    })
  }
  console.log(`  ✓ ${programmes.length} programmes`)

  // --------------------------------------------------------------- events
  const now = Date.now()
  const day = 86_400_000

  const events = [
    {
      slug: 'national-youth-parliament-sitting',
      title: 'National Youth Parliament Sitting',
      description:
        'The annual sitting of the PYPC Youth Parliament. Delegates from all seven regions debate bills produced by committees during the year, followed by a policy report handover.',
      eventType: 'Conference',
      mode: 'Onsite',
      venue: 'Convention Centre',
      city: 'Islamabad',
      startsAt: new Date(now + 24 * day),
      endsAt: new Date(now + 26 * day),
      capacity: 300,
      isFeatured: true
    },
    {
      slug: 'climate-resilience-workshop',
      title: 'Climate Resilience & Adaptation Workshop',
      description:
        'A hands-on workshop on district-level climate vulnerability assessment and adaptation planning for young researchers and activists.',
      eventType: 'Workshop',
      mode: 'Hybrid',
      venue: 'PYPC Regional Office',
      city: 'Lahore',
      startsAt: new Date(now + 45 * day),
      endsAt: new Date(now + 46 * day),
      capacity: 120,
      isFeatured: true
    },
    {
      slug: 'ai-policy-roundtable',
      title: 'AI Policy Roundtable for Young Innovators',
      description:
        'Policy discussion on responsible AI, data protection and youth opportunity in the digital economy, with practitioners and academics.',
      eventType: 'Webinar',
      mode: 'Online',
      venue: null,
      city: null,
      startsAt: new Date(now + 14 * day),
      endsAt: new Date(now + 14 * day),
      capacity: 500,
      isFeatured: false
    },
    {
      slug: 'leadership-convocation-2026',
      title: 'PYPC Leadership Convocation',
      description:
        'Convocation for fellowship graduates and certificate distribution with verified QR records for every recipient.',
      eventType: 'Ceremony',
      mode: 'Onsite',
      venue: 'University Auditorium',
      city: 'Karachi',
      startsAt: new Date(now + 90 * day),
      endsAt: new Date(now + 90 * day),
      capacity: 400,
      isFeatured: false
    }
  ]

  for (const event of events) {
    await prisma.event.upsert({ where: { slug: event.slug }, update: event, create: event })
  }
  console.log(`  ✓ ${events.length} events`)

  // -------------------------------------------------------- opportunities
  const opportunities = [
    {
      slug: 'climate-policy-fellowship-2026',
      title: 'Climate Policy Fellowship 2026',
      organisation: 'PYPC in partnership with provincial climate units',
      type: 'Fellowship',
      location: 'Pakistan (hybrid)',
      mode: 'Hybrid',
      deadline: new Date(now + 40 * day),
      stipend: 'Monthly stipend for selected fellows',
      summary:
        'Twelve-month fellowship placing young researchers with climate policy teams in provinces and federal ministries.',
      description:
        'Fellows work on climate adaptation policy, data analysis and stakeholder engagement. The fellowship includes mentorship, a research budget and publication support.',
      requirements: JSON.stringify([
        'Age 18–30 with an undergraduate degree or final-year standing',
        'Demonstrated interest in climate, environment or development policy',
        'Strong written English and Urdu; research experience preferred'
      ]),
      isFeatured: true
    },
    {
      slug: 'ai-governance-research-assistant',
      title: 'AI Governance Research Assistant',
      organisation: 'PYPC Digital Futures Desk',
      type: 'Research',
      location: 'Remote',
      mode: 'Remote',
      deadline: new Date(now + 25 * day),
      stipend: 'Project-based honorarium',
      summary:
        'Support research on AI governance, data protection and digital rights frameworks relevant to Pakistan.',
      description:
        'Assist in literature reviews, stakeholder mapping, interview notes and policy memo drafting for the PYPC Digital Futures Desk.',
      requirements: JSON.stringify([
        'Familiarity with AI concepts and technology policy debates',
        'Excellent research and writing discipline',
        'Ability to commit 8–10 hours per week'
      ]),
      isFeatured: true
    },
    {
      slug: 'youth-parliament-delegate-2026',
      title: 'Youth Parliament Delegate 2026',
      organisation: 'PYPC National Secretariat',
      type: 'Delegation',
      location: 'Islamabad',
      mode: 'Onsite',
      deadline: new Date(now + 30 * day),
      stipend: null,
      summary:
        'Selected delegates debate policy in the annual Youth Parliament sitting and join standing committee work.',
      description:
        'Delegates are assigned to committees based on their application and interest, draft bills, and defend them in the national sitting.',
      requirements: JSON.stringify([
        'Age 16–29',
        'Interest in law, public policy, governance or debate',
        'Commitment to preparatory committee sessions'
      ]),
      isFeatured: false
    },
    {
      slug: 'campus-ambassador-programme',
      title: 'Campus Ambassador Programme',
      organisation: 'PYPC Chapters Network',
      type: 'Volunteer',
      location: 'Nationwide',
      mode: 'Hybrid',
      deadline: new Date(now + 60 * day),
      stipend: 'Recognition and certificate',
      summary:
        'Represent PYPC on your campus, organise circles and events, and build a chapter with national support.',
      description:
        'Ambassadors receive training, event toolkits and mentoring, and earn a verified leadership record on successful delivery.',
      requirements: JSON.stringify([
        'Currently enrolled in a recognised institution',
        'Strong organisation and communication skills',
        'Minimum one semester commitment'
      ]),
      isFeatured: false
    },
    {
      slug: 'women-in-public-policy-scholarship',
      title: 'Women in Public Policy Scholarship',
      organisation: 'PYPC Human Rights Desk',
      type: 'Scholarship',
      location: 'Pakistan',
      mode: 'Hybrid',
      deadline: new Date(now + 55 * day),
      stipend: 'Partial tuition support',
      summary:
        'Supporting young women pursuing public policy, law or development studies with mentorship and partial tuition assistance.',
      description:
        'Scholars join a support network, receive mentorship from practitioners and contribute to a policy research project during the academic year.',
      requirements: JSON.stringify([
        'Women aged 18–30 enrolled in a policy, law or development programme',
        'Demonstrated financial need and academic merit',
        'Commitment to a policy research contribution'
      ]),
      isFeatured: true
    }
  ]

  for (const opportunity of opportunities) {
    await prisma.opportunity.upsert({
      where: { slug: opportunity.slug },
      update: opportunity,
      create: opportunity
    })
  }
  console.log(`  ✓ ${opportunities.length} opportunities`)

  // ---------------------------------------------------------------- users
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pypc.org.pk' },
    update: {
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      passwordHash,
      emailVerifiedAt: new Date(),
      phone: '+923001234567',
      phoneCountry: 'PK',
      country: 'PK',
      countryName: 'Pakistan'
    },
    create: {
      email: 'admin@pypc.org.pk',
      passwordHash,
      firstName: 'PYPC',
      lastName: 'Administrator',
      phone: '+923001234567',
      phoneCountry: 'PK',
      country: 'PK',
      countryName: 'Pakistan',
      city: 'Islamabad',
      province: 'Islamabad Capital Territory',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date()
    }
  })

  const executive = await prisma.user.upsert({
    where: { email: 'executive@pypc.org.pk' },
    update: {
      role: 'EXECUTIVE',
      status: 'ACTIVE',
      passwordHash,
      emailVerifiedAt: new Date(),
      phone: '+923007654321',
      phoneCountry: 'PK',
      country: 'PK',
      countryName: 'Pakistan'
    },
    create: {
      email: 'executive@pypc.org.pk',
      passwordHash,
      firstName: 'National',
      lastName: 'Executive',
      phone: '+923007654321',
      phoneCountry: 'PK',
      country: 'PK',
      countryName: 'Pakistan',
      city: 'Lahore',
      province: 'Punjab',
      role: 'EXECUTIVE',
      status: 'ACTIVE',
      emailVerifiedAt: new Date()
    }
  })

  const member = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {
      passwordHash,
      emailVerifiedAt: new Date(),
      phone: '+923211234567',
      phoneCountry: 'PK',
      country: 'PK',
      countryName: 'Pakistan'
    },
    create: {
      email: 'member@example.com',
      passwordHash,
      firstName: 'Ayesha',
      lastName: 'Khan',
      phone: '+923211234567',
      phoneCountry: 'PK',
      country: 'PK',
      countryName: 'Pakistan',
      city: 'Rawalpindi',
      province: 'Punjab',
      institution: 'Quaid-i-Azam University',
      fieldOfStudy: 'Public Policy',
      profession: 'Student',
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date()
    }
  })
  console.log('  ✓ demo users (admin / executive / member)')

  // ----------------------------------------------------------- membership
  const executivePlan = await prisma.membershipPlan.findUniqueOrThrow({ where: { code: 'EXECUTIVE' } })

  const existingMembership = await prisma.membership.findFirst({
    where: { userId: member.id, status: 'ACTIVE' }
  })

  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        userId: member.id,
        planId: executivePlan.id,
        status: 'ACTIVE',
        startsAt: new Date(),
        expiresAt: new Date(now + 365 * day)
      }
    })
  }
  console.log('  ✓ demo active membership')

  // --------------------------------------------------------- certificates
  const youthParliament = await prisma.programme.findUniqueOrThrow({
    where: { slug: 'youth-parliament' }
  })

  await prisma.certificate.upsert({
    where: { code: CODE_VALID },
    update: {},
    create: {
      code: CODE_VALID,
      title: 'Youth Parliament Programme — Certificate of Participation',
      recipientName: 'Ayesha Khan',
      description:
        'For successful completion of the PYPC Youth Parliament Programme, including committee work, bill drafting and participation in the national sitting.',
      grade: 'Distinction',
      userId: member.id,
      programmeId: youthParliament.id,
      issuedById: admin.id,
      status: 'VALID'
    }
  })

  await prisma.certificate.upsert({
    where: { code: CODE_REVOKED },
    update: {},
    create: {
      code: CODE_REVOKED,
      title: 'Leadership Fellowship — Certificate of Completion',
      recipientName: 'Demo Revoked Record',
      description:
        'Demonstration record showing how a revoked certificate appears on the public verification page.',
      grade: null,
      issuedById: admin.id,
      status: 'REVOKED',
      revokedReason: 'Issued in error during platform testing.',
      revokedAt: new Date()
    }
  })
  console.log('  ✓ demo certificates (1 valid, 1 revoked)')

  // -------------------------------------------------------- notifications
  const notes = [
    {
      userId: member.id,
      title: 'Welcome to PYPC',
      body: 'Your member account is active. Complete your profile and explore programmes to get started.',
      type: 'INFO',
      href: '/dashboard/profile'
    },
    {
      userId: member.id,
      title: 'Executive membership active',
      body: 'Your Executive membership is valid for 12 months. Committee and fellowship applications are now open to you.',
      type: 'SUCCESS',
      href: '/dashboard/membership'
    },
    {
      userId: admin.id,
      title: 'Platform ready',
      body: 'Database seeded successfully. Review members, applications and certificates from the admin panel.',
      type: 'INFO',
      href: '/admin'
    }
  ]

  for (const note of notes) {
    const existing = await prisma.notification.findFirst({
      where: { userId: note.userId, title: note.title }
    })
    if (!existing) await prisma.notification.create({ data: note })
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'SEED_DATABASE',
      entityType: 'SYSTEM',
      metadata: JSON.stringify({ programmes: programmes.length, events: events.length })
    }
  })

  console.log('\n✔ Seed complete.\n')
  console.log('   Admin     : admin@pypc.org.pk      / ' + DEMO_PASSWORD)
  console.log('   Executive : executive@pypc.org.pk  / ' + DEMO_PASSWORD)
  console.log('   Member    : member@example.com     / ' + DEMO_PASSWORD)
  console.log('   Valid certificate code to verify  : ' + CODE_VALID)
  console.log('   Revoked certificate code to verify: ' + CODE_REVOKED + '\n')
}

main()
  .catch(error => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
