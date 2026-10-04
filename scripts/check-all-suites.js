/**
 * Run every verification suite in one command and print the real totals.
 *
 *   BASE=http://127.0.0.1:3000 AI_AUDIT_BYPASS_TOKEN=… node scripts/check-all-suites.js
 *   npm run check:suites
 *
 * Why this exists: the totals quoted in `docs/VERIFICATION.md` used to be
 * maintained by hand, and hand-maintained numbers drift — a suite gains two
 * assertions and the document still claims the old total. This script runs each
 * suite, reads the count the suite itself reports, and prints the table and the
 * sum. Nothing here re-implements a check: it only aggregates what the suites
 * say, so the number in the docs can always be reproduced.
 *
 * Exit code is non-zero if any suite fails, so it doubles as a pre-deploy gate.
 */
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const BASE = process.env.BASE || 'http://127.0.0.1:3000'

/**
 * Each suite: how to run it, and how to read its number out of the output.
 *
 * Three output shapes exist in this project, so each suite declares which one
 * it uses:
 *   'count'       "all 38 routes behaved correctly"      → green is the exit code
 *   'ratio-pass'  "12/12 checks passed"                  → green is N === M
 *   'passed-failed' "63 passed, 0 failed"                → green is M === 0
 */
const SUITES = [
  { name: 'Routes', npm: 'check:routes', file: 'smoke-routes.mjs', pattern: /all (\d+) routes behaved/, kind: 'count' },
  { name: 'Health endpoint', npm: 'check:health', file: 'check-health.js', pattern: /(\d+)\/(\d+) health checks/, kind: 'ratio-pass' },
  { name: 'Registration', npm: 'check:auth', file: 'check-registration.js', pattern: /(\d+)\/(\d+) checks passed/, kind: 'ratio-pass' },
  { name: 'Theme + password', npm: 'check:theme', file: 'check-theme-and-password.js', pattern: /(\d+)\/(\d+) checks passed/, kind: 'ratio-pass' },
  { name: 'Connectivity', npm: 'check:connectivity', file: 'check-connectivity.js', pattern: /(\d+)\/(\d+) connectivity checks passed/, kind: 'ratio-pass' },
  { name: 'Responsive + installable', npm: 'check:responsive', file: 'check-responsive.js', pattern: /(\d+) passed, (\d+) failed/, kind: 'passed-failed' },
  { name: 'IMUN 2027 page', npm: 'check:imun', file: 'check-imun-2027.js', pattern: /(\d+) passed, (\d+) failed/, kind: 'passed-failed' },
  { name: 'Social channels', npm: 'check:social', file: 'check-social.js', pattern: /(\d+) passed, (\d+) failed/, kind: 'passed-failed' },
  { name: 'AI assistant', npm: 'check:ai', file: 'check-ai-multilingual.js', pattern: /(\d+) passed, (\d+) failed/, kind: 'passed-failed' },
  { name: 'Response times', npm: 'check:perf', file: 'check-performance.js', pattern: /(\d+) passed, (\d+) failed/, kind: 'passed-failed' },
  { name: 'Two-factor auth', npm: 'check:2fa', file: 'check-2fa.mjs', pattern: /(\d+) passed, (\d+) failed/, kind: 'passed-failed' },
  { name: 'Audit chain tamper test', npm: 'check:audit-chain', file: 'check-audit-chain.mjs', pattern: /(\d+) passed, (\d+) failed/, kind: 'passed-failed' },
  { name: 'Partnerships & MoU', npm: 'check:partnerships', file: 'check-partnerships.mjs', pattern: /(\d+) passed, (\d+) failed/, kind: 'passed-failed' },
]

/** Suites that need an argument, a dev server or a different runtime. */
const SEPARATE = [
  { name: 'Colour contrast (WCAG AA)', npm: 'check:contrast' },
  { name: 'Authorisation matrix', npm: 'check:authz' },
  { name: 'Secret scan', npm: 'scan:secrets' },
  { name: 'Payments (dev chain)', npm: 'check:payments' },
  { name: 'Backup restore drill', npm: 'db:restore-test' }
]

function run(file) {
  try {
    const output = execFileSync('node', [path.join(ROOT, 'scripts', file)], {
      cwd: ROOT,
      env: { ...process.env, BASE },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    return { ok: true, output }
  } catch (error) {
    return { ok: false, output: `${error.stdout || ''}${error.stderr || ''}` }
  }
}

async function main() {
  console.log(`Aggregating every suite against ${BASE}\n`)
  console.log(`${'suite'.padEnd(26)} ${'checks'.padStart(7)}  result`)
  console.log('─'.repeat(52))

  let total = 0
  let failures = 0

  for (const suite of SUITES) {
    const { ok, output } = run(suite.file)
    const match = output.match(suite.pattern)
    const count = match ? Number(match[1]) : 0

    // A suite whose expected line is missing entirely counts as failed: the
    // output changed, so the number it reports can no longer be trusted.
    const green =
      ok &&
      Boolean(match) &&
      (suite.kind === 'count'
        ? true
        : suite.kind === 'ratio-pass'
          ? match[1] === match[2]
          : Number(match[2]) === 0)

    if (green) total += count
    else failures += 1

    const reason = !ok ? ' (non-zero exit)' : !match ? ' (expected summary line missing)' : ''
    console.log(
      `${suite.name.padEnd(26)} ${String(count).padStart(7)}  ${green ? '✓ pass' : '✗ FAILED'}${reason}`
    )
  }

  console.log('─'.repeat(52))
  console.log(`${'TOTAL (feature suites)'.padEnd(26)} ${String(total).padStart(7)}`)

  console.log(`\nRun separately (they need a dev server, a script argument or shell output):`)
  for (const suite of SEPARATE) {
    console.log(`  · ${suite.name.padEnd(26)} npm run ${suite.npm}`)
  }

  if (failures) {
    console.log(`\n${failures} suite(s) failed — fix before packaging.`)
    process.exit(1)
  }
  console.log(`\nAll ${SUITES.length} feature suites green. Quote ${total} as the feature-suite total.`)
}

main().catch(error => {
  console.error('aggregator crashed:', error)
  process.exit(1)
})
