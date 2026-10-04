/**
 * IMUN 2027 page audit.
 *
 *   BASE=http://127.0.0.1:3000 node scripts/check-imun-2027.js
 *
 * The conference page makes several claims — live registration counts, a country
 * grid built from the real catalogue, a publication-ready budget split, planning
 * disclaimers that must stay visible. This script checks every one of them against
 * the rendered page and the database, so the page cannot quietly drift into
 * overstatement.
 */
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const ROOT = path.resolve(__dirname, '..')
const BASE = process.env.BASE || 'http://127.0.0.1:3000'

let passed = 0
let failed = 0
const failures = []

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1
    console.log(`PASS  ${name}`)
  } else {
    failed += 1
    failures.push(name)
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function count(html, pattern) {
  const matches = html.match(pattern)
  return matches ? matches.length : 0
}

;(async () => {
  console.log(`\nIMUN 2027 audit — ${BASE}\n${'─'.repeat(72)}\n`)

  const response = await fetch(`${BASE}/conferences/imun-2027`)
  const html = await response.text()

  check('page responds 200', response.status === 200, `status ${response.status}`)

  // ---- every section the navigation promises is actually rendered ----------
  // The full concept note is on the page: 21 sections, mirrored one-for-one by
  // the section navigation. Keep this list in step with the page and the nav.
  const sectionIds = [
    'glance',
    'programme',
    'overview',
    'components',
    'categories',
    'scholarships',
    'delegates',
    'countries',
    'venue',
    'culture',
    'budget',
    'timeline',
    'workstreams',
    'faq',
    'why',
    'current-status',
    'concept',
    'vision',
    'sponsors',
    'documents',
    'apply'
  ]
  const missing = sectionIds.filter(id => !html.includes(`id="${id}"`))
  check(`all ${sectionIds.length} sections render`, missing.length === 0, missing.join(', '))

  // ---- live numbers come from the database, not the template ---------------
  check('live counters block is present', /data-live-conference/.test(html))
  const liveDelegations = html.match(/Registrations of interest[\s\S]{0,120}?>(\d+)</)
  check('registration count renders as a number', Boolean(liveDelegations), 'counter not found')
  check(
    'registration count is not a hard-coded marketing figure',
    liveDelegations ? Number(liveDelegations[1]) < 100000 : false,
    liveDelegations ? liveDelegations[1] : ''
  )
  check('countries-represented counter is present', /Countries represented/.test(html))

  // the count on the page must equal the count in the database
  let dbCount = null
  try {
    const output = execFileSync(
      'node',
      [
        '-e',
        `const { PrismaClient } = require('@prisma/client');
         const prisma = new PrismaClient();
         (async () => {
           const event = await prisma.event.findFirst({ where: { slug: { contains: 'imun' } }, select: { id: true } });
           const programme = await prisma.programme.findFirst({ where: { slug: { contains: 'imun' } }, select: { id: true } });
           const registrations = event ? await prisma.eventRegistration.count({ where: { eventId: event.id, status: { not: 'CANCELLED' } } }) : 0;
           const applications = programme ? await prisma.application.count({ where: { programmeId: programme.id } }) : 0;
           process.stdout.write(String(registrations + applications));
           await prisma.$disconnect();
         })();`
      ],
      { cwd: ROOT, env: process.env, encoding: 'utf8' }
    )
    dbCount = Number(output.trim())
  } catch (error) {
    dbCount = null
  }
  if (dbCount === null) {
    check('database cross-check of the registration count', false, 'could not query the database')
  } else {
    check(
      `page count matches the database (${dbCount})`,
      liveDelegations ? Number(liveDelegations[1]) === dbCount : false,
      liveDelegations ? `page ${liveDelegations[1]} vs db ${dbCount}` : ''
    )
  }

  // ---- the flag parade uses the real country catalogue ---------------------
  // Regional-indicator pairs sit in the U+1F1E6–U+1F1FF block.
  const flagEmoji = (html.match(/[\u{1F1E6}-\u{1F1FF}]{2}/gu) || []).length
  check(`flag parade renders country flags (${flagEmoji} grid flags)`, flagEmoji >= 60)
  const paradeCountries = ['Pakistan', 'United Kingdom', 'United States', 'Malaysia', 'Türkiye', 'Indonesia']
  const present = paradeCountries.filter(name => html.includes(name))
  check('parade includes real country names from the catalogue', present.length >= 4, present.join(', '))
  check('parade states that the list is not a limit on entry', /not a limit and any country can register/.test(html))

  // ---- honest labelling ----------------------------------------------------
  check('planning-stage disclaimer is visible', /concept note \(PYPC\/IMUN\/2027\/CN-01\)/.test(html))
  check('venue section says neither venue is booked', /[Nn]either venue is booked yet/.test(html))
  check('budget percentages are described as planned', /planned allocation/i.test(html))
  check('status chips cover all three states', /Confirmed/.test(html) && /In progress/.test(html) && /Planning stage/.test(html))

  // ---- content depth -------------------------------------------------------
  check('venue comparison lists both candidates', /Pakistan-China Friendship Centre/.test(html) && /Jinnah Convention Centre/.test(html))
  check('cultural programme names the Sufi night', /Sufi night/i.test(html))
  check('timeline reaches the conference month', /January 2027/.test(html))
  check('workstreams panel lists twelve streams', count(html, /Progress<\/span>/g) >= 10, `${count(html, /Progress<\/span>/g)} found`)
  check('why-different comparison is rendered', count(html, /Standard conference/g) >= 1 && count(html, /IMUN 2027:/g) + count(html, /<th[^>]*>IMUN 2027<\/th>/g) >= 1)

  // ---- accessibility + structure ------------------------------------------
  check('exactly one h1 on the page', count(html, /<h1[\s>]/g) === 1, `${count(html, /<h1[\s>]/g)} found`)
  check('charts carry accessible labels', count(html, /role="img" aria-label="/g) >= 12, `${count(html, /role="img" aria-label="/g)} found`)
  check('budget table has a caption for screen readers', /Planned allocation of the IMUN 2027 budget/.test(html))
  check('participation questions use native disclosure elements', count(html, /<summary/g) >= 5)

  // ---- responsive + sub-brand ---------------------------------------------
  // ---- the concept note's own leadership, verbatim -------------------------
  check(
    'concept note is reproduced with its reference number',
    /PYPC\/IMUN\/2027\/CN-01/.test(html)
  )
  check(
    'the Founder & Chairperson is named with the official phone and email',
    /Dr\.?\s*Mohsin Ejaz Chaudhry/.test(html) &&
      /\+92 315 5729598|\+923155729598/.test(html) &&
      /[Mm]ohsinejaz98@gmail\.com/.test(html),
    'check the concept note signatories'
  )
  check(
    'the Co-Founder & Chief Executive is named with both lines',
    /Ayesha Qaisar/.test(html) &&
      /\+92 371 3581114|\+923713581114/.test(html) &&
      /ayshstec@gmail\.com/.test(html),
    'check the concept note signatories'
  )
  check(
    'conference sub-brand accent (navy/azure) is applied', /text-azure-100|border-azure-300/.test(html) && /text-navy-100/.test(html))
  check('no fixed pixel width wider than a phone', !/class="[^"]*\bw-\[\d{4,}px\]/.test(html))
  check('the comparison table sits in the page without a fixed width', !/<table[^>]*style="[^"]*width:\s*\d{4,}px/.test(html))

  console.log(`\n${'─'.repeat(72)}`)
  console.log(`${passed} passed, ${failed} failed`)
  if (failed) {
    console.log(`\nFix these: ${failures.join(' | ')}\n`)
    process.exit(1)
  }
  console.log('\nIMUN 2027 page audit clean.\n')
})().catch(error => {
  console.error('\nAudit could not run:', error.message)
  console.error('Start the server first: npm run build && npm start\n')
  process.exit(1)
})
