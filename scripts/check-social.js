/**
 * Social-channel audit.
 *
 *   BASE=http://127.0.0.1:3000 node scripts/check-social.js
 *
 * The rule this guards is simple and was a hard requirement: **a channel is
 * published only when its real address is known**. LinkedIn and Instagram are
 * compiled in; Facebook and YouTube appear only when their addresses are set in
 * the environment. A generic `facebook.com/` or `youtube.com/` link, or another
 * organisation's page, must never reach a visitor.
 *
 * The script checks the rendered HTML of the pages that carry the channel list,
 * plus the JSON-LD that tells search engines which accounts are ours.
 */
const path = require('node:path')

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

async function page(pathname) {
  const response = await fetch(`${BASE}${pathname}`)
  return { status: response.status, html: await response.text() }
}

const LINKEDIN = 'https://www.linkedin.com/company/pakistan-youth-parliamentary-council'
const INSTAGRAM = 'https://www.instagram.com/pypcofficial'
/** Confirmed by the secretariat as the council's own page (reachable). */
const FACEBOOK = 'https://www.facebook.com/pypcofficial'
/**
 * The council's YouTube address, in the `@handle` form — the URL YouTube
 * resolves for a channel handle. Confirmed by the secretariat as their official
 * handle; the channel page serves content once the channel is published, and
 * no code change is ever needed for that.
 */
const YOUTUBE = 'https://www.youtube.com/@pypcofficial'
/** The two official mailboxes, as supplied by the secretariat. */
const EMAIL_PRIMARY = 'pypcofficial@gmail.com'
const EMAIL_SECONDARY = 'officialpypc@gmail.com'
/** Addresses that must never reappear: retired mailboxes. */
const RETIRED_EMAILS = ['nylpofficial@gmail.com', 'officialnylp@gmail.com']

/** Every ld+json block on the page, parsed. */
function structuredData(html) {
  const blocks = []
  const pattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  let match
  while ((match = pattern.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(match[1]))
    } catch {
      /* reported by the caller */
    }
  }
  return blocks
}

async function main() {
  const home = await page('/')
  check('home page loads', home.status === 200, `status ${home.status}`)

  // ── 1. The footer block exists and is labelled ───────────────────────────
  check('footer publishes the follow block', /Follow PYPC/.test(home.html), 'heading missing')
  // The phone appears in both international and local dialling form.
  check('international phone form renders', /\+92 315 5729598/.test(home.html), 'no +92 form')
  check('local phone form renders', /0315 5729598/.test(home.html), 'no 0xxx form')

  // ── 2. Verified channels are present, with their handles ─────────────────
  check('LinkedIn company page is linked', home.html.includes(LINKEDIN), LINKEDIN)
  check('Instagram profile is linked', home.html.includes(INSTAGRAM), INSTAGRAM)
  check('the retired @nylpofficial handle is gone', !home.html.includes('nylpofficial'), 'stale handle rendered')
  check(
    'Instagram handle is shown next to the mark',
    /@pypcofficial/.test(home.html),
    'handle not rendered'
  )

  // ── 2b. Official mailboxes, present and correct ──────────────────────────
  const contact = await page('/contact')
  check('contact page loads', contact.status === 200, `status ${contact.status}`)
  check('primary mailbox is published in the footer', home.html.includes(EMAIL_PRIMARY), EMAIL_PRIMARY)
  check('secondary mailbox is published in the footer', home.html.includes(EMAIL_SECONDARY), EMAIL_SECONDARY)
  check('primary mailbox is on the contact page', contact.html.includes(EMAIL_PRIMARY), EMAIL_PRIMARY)
  check('secondary mailbox is on the contact page', contact.html.includes(EMAIL_SECONDARY), EMAIL_SECONDARY)
  for (const retired of RETIRED_EMAILS) {
    check(`retired mailbox ${retired} is gone from /`, !home.html.includes(retired), 'retired address returned')
    check(`retired mailbox ${retired} is gone from /contact`, !contact.html.includes(retired), 'retired address returned')
  }

  // ── 3. No placeholder or foreign links anywhere ──────────────────────────
  const placeholders = [
    /href="https?:\/\/(www\.)?facebook\.com\/"/i,
    /href="https?:\/\/(www\.)?facebook\.com\/NYLPOfficial/i,
    /href="https?:\/\/(www\.)?youtube\.com\/"/i,
    /href="https?:\/\/(www\.)?youtube\.com\/channel\/?$"/i,
    /href="https?:\/\/(www\.)?instagram\.com\/"/i
  ]
  for (const pattern of placeholders) {
    check(`no placeholder link matching ${pattern.source}`, !pattern.test(home.html), 'placeholder rendered')
  }

  // ── 4. Facebook and YouTube are links under the same handle ──────────────
  const facebook = process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || FACEBOOK
  const youtube = process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || YOUTUBE
  const youtubePending = (process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_PENDING || '') === 'true'

  check('Facebook page is linked', home.html.includes(facebook), facebook)
  check(
    'YouTube is linked under the @handle form',
    youtubePending || home.html.includes(youtube),
    youtubePending ? 'operator marked the channel pending' : youtube
  )
  check(
    'no channel falls back to the legacy YouTube URL shape',
    !/youtube\.com\/pypcofficial/.test(home.html),
    'legacy form published'
  )
  check(
    'all four channels render as links',
    youtubePending || /data-channel-status="live" data-channel="youtube"|data-channel="youtube"[^>]*data-channel-status="live"/.test(home.html),
    'youtube is not rendered as a live link'
  )

  // ── 5. Channels are reachable from more than one page ────────────────────
  check('contact page links LinkedIn', contact.html.includes(LINKEDIN), LINKEDIN)
  check('contact page links Instagram', contact.html.includes(INSTAGRAM), INSTAGRAM)
  check('contact page links Facebook', contact.html.includes(FACEBOOK), FACEBOOK)
  check('contact page links YouTube', contact.html.includes(YOUTUBE), YOUTUBE)
  check(
    'contact page states the shared handle once, clearly',
    /One handle, every platform/.test(contact.html) && /pypcofficial/.test(contact.html),
    'handle statement missing'
  )

  const about = await page('/about')
  check('about page still renders', about.status === 200, `status ${about.status}`)

  // ── 6. Header menus carry the accounts ──────────────────────────────────
  check(
    'header renders the accounts (desktop mega-menu + mobile drawer)',
    (home.html.match(/instagram\.com\/pypcofficial/g) || []).length >= 2,
    'fewer than two occurrences'
  )
  check(
    'all four brand marks render on the page',
    ['linkedin', 'instagram', 'facebook', 'youtube'].every(id => home.html.includes(`data-channel="${id}"`)),
    'a brand mark is missing'
  )

  // ── 7. Structured data ──────────────────────────────────────────────────
  const blocks = structuredData(home.html)
  check('JSON-LD blocks parse', blocks.length >= 2, `${blocks.length} block(s)`)
  const organisation = blocks.find(block => String(block['@type']).includes('Organization'))
  check('Organisation schema present', Boolean(organisation), 'no Organization node')
  if (organisation) {
    const sameAs = organisation.sameAs || []
    check('sameAs carries the LinkedIn page', sameAs.includes(LINKEDIN), JSON.stringify(sameAs))
    check('sameAs carries the Instagram profile', sameAs.some(url => url.startsWith(INSTAGRAM)), JSON.stringify(sameAs))
    check('sameAs carries the Facebook page', sameAs.includes(FACEBOOK), JSON.stringify(sameAs))
    check(
      'sameAs carries the YouTube channel',
      sameAs.some(url => url === YOUTUBE),
      JSON.stringify(sameAs)
    )
    check(
      'sameAs lists exactly the four official profiles',
      sameAs.length === 4,
      `${sameAs.length} entries`
    )
    check(
      'sameAs contains no mailto or placeholder',
      sameAs.every(url => /^https?:\/\//.test(url)) && !JSON.stringify(sameAs).includes('facebook.com/"'),
      JSON.stringify(sameAs)
    )
    check(
      'Organisation declares the primary official email',
      organisation.email === EMAIL_PRIMARY,
      String(organisation.email)
    )
    check('Organisation declares the official phone', JSON.stringify(organisation.contactPoint || []).includes('315'), 'no phone')
    check(
      'Organisation phone is E.164',
      organisation.contactPoint?.[0]?.telephone === '+923155729598',
      String(organisation.contactPoint?.[0]?.telephone)
    )
  }
  const website = blocks.find(block => block['@type'] === 'WebSite')
  check('WebSite schema declares the site languages', Array.isArray(website?.inLanguage) && website.inLanguage.length >= 2, JSON.stringify(website?.inLanguage))

  // ── 8. Sharing works from detail pages ──────────────────────────────────
  const imun = await page('/conferences/imun-2027')
  check('conference page loads', imun.status === 200, `status ${imun.status}`)
  check('conference page offers sharing', /linkedin\.com\/sharing/.test(imun.html) && /wa\.me\/\?text=/.test(imun.html), 'share endpoints missing')

  // ── 9. The module is the single source ──────────────────────────────────
  const source = require('node:fs').readFileSync(path.join(ROOT, 'lib/social.ts'), 'utf8')
  check('lib/social.ts compiles LinkedIn in', source.includes('linkedin.com/company/pakistan-youth-parliamentary-council'), 'address missing')
  check('lib/social.ts compiles Instagram in', source.includes('instagram.com/pypcofficial'), 'address missing')
  check('lib/social.ts compiles Facebook in', source.includes('facebook.com/pypcofficial'), 'address missing')
  check('lib/social.ts compiles YouTube in (@handle form)', source.includes('youtube.com/@pypcofficial'), 'address missing')
  check(
    'Facebook and YouTube can be moved by environment',
    source.includes('NEXT_PUBLIC_SOCIAL_FACEBOOK') && source.includes('NEXT_PUBLIC_SOCIAL_YOUTUBE'),
    'env names missing'
  )
  check(
    'a channel can still be switched to a chip without code changes',
    source.includes('NEXT_PUBLIC_SOCIAL_YOUTUBE_PENDING') && source.includes("'pending'"),
    'no pending mechanism'
  )
  check(
    'every channel is built from the one handle',
    (source.match(/@pypcofficial/g) || []).length >= 3,
    'handle missing from a channel'
  )

  console.log(`\nSocial audit: ${passed} passed, ${failed} failed`)
  if (failed) {
    console.log('Failures:')
    for (const name of failures) console.log(`  - ${name}`)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Social audit crashed:', error)
  process.exit(1)
})
