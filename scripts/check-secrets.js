#!/usr/bin/env node
/**
 * Secret scan.
 *
 *   npm run scan:secrets
 *
 * gitleaks is the right tool in CI, but it is not always installed — and a check
 * that only runs on a machine with extra binaries is a check that silently does
 * not run. This script has no dependencies: it walks the tree, applies the
 * patterns that actually matter for this project, and fails the build on a hit.
 *
 * It checks three different things:
 *
 *   1. **No live credentials in the repository.** Token shapes for Stripe,
 *      OpenAI, Google, AWS, Slack and GitHub, plus private-key blocks.
 *   2. **No secrets in the shipping configuration.** `.env` is allowed to hold a
 *      development configuration, but it must not carry a live payment key, a live
 *      SMTP password or a production database URL — the packaged ZIP ships it.
 *   3. **The .gitignore rules are in place**, so a developer's local `.env` and
 *      any generated backups cannot be committed by accident.
 *
 * Exit code 0 = clean, 1 = something must be fixed before this is pushed.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'backups',
  'reports',
  'coverage',
  'dist',
  'build',
  '.restore-scratch',
  'zip-verify'
])

/** Files that legitimately contain placeholders or documentation about secrets. */
const ALLOWED_FILES = new Set([
  '.env.example',
  'docs/VERIFICATION.md',
  'docs/BACKUP-POLICY.md',
  'docs/LAUNCH-CHECKLIST.md',
  'scripts/check-secrets.js',
  '.github/workflows/ci.yml'
])

const PATTERNS = [
  { id: 'stripe-live', label: 'Stripe live secret key', re: /sk_live_[0-9a-zA-Z]{16,}/ },
  { id: 'stripe-restricted', label: 'Stripe restricted live key', re: /rk_live_[0-9a-zA-Z]{16,}/ },
  { id: 'openai', label: 'OpenAI API key', re: /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/ },
  { id: 'google-api', label: 'Google API key', re: /AIza[0-9A-Za-z\-_]{35}/ },
  { id: 'aws', label: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/ },
  { id: 'github', label: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { id: 'slack', label: 'Slack token', re: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
  { id: 'private-key', label: 'Private key block', re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { id: 'jwt-secret-literal', label: 'Hard-coded JWT secret', re: /JWT_SECRET\s*[:=]\s*['"][A-Za-z0-9+/=]{24,}['"]/ }
]

/** Values that are obviously placeholders or development defaults. */
const PLACEHOLDER = /(your|example|change|replace|dummy|placeholder|xxxx|test_|dev_|local)/i

let findings = []
let scanned = 0

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue
      walk(full)
      continue
    }
    if (stat.size > 2_000_000) continue
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|env|example|sql|prisma|sh|bat|txt)$/.test(entry)) continue
    scanFile(full)
  }
}

function scanFile(file) {
  const relative = path.relative(ROOT, file)
  if (ALLOWED_FILES.has(relative)) return
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return
  }
  scanned += 1
  const lines = text.split('\n')
  for (const pattern of PATTERNS) {
    lines.forEach((line, index) => {
      if (!pattern.re.test(line)) return
      if (PLACEHOLDER.test(line)) return
      findings.push({ file: relative, line: index + 1, label: pattern.label, sample: line.trim().slice(0, 90) })
    })
  }
}

console.log('\nSecret scan\n' + '─'.repeat(72) + '\n')

walk(ROOT)
console.log(`Scanned ${scanned} source files across the repository (node_modules, .next and backups excluded).\n`)

// ---- 1. repository ---------------------------------------------------------
if (findings.length) {
  console.log(`${findings.length} potential secret(s) found:`)
  for (const finding of findings) {
    console.log(`  ${finding.file}:${finding.line}  ${finding.label}`)
    console.log(`      ${finding.sample}`)
  }
} else {
  console.log('PASS  no live credential pattern matched any tracked file')
}

// ---- 2. shipping configuration --------------------------------------------
const envPath = path.join(ROOT, '.env')
const envChecks = []
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8')

  const liveKey = /^STRIPE_SECRET_KEY\s*=\s*["']?sk_live_/m.test(env)
  envChecks.push(['.env holds no Stripe live key', !liveKey])

  // A real secret is a non-empty value that is not a placeholder. `SMTP_PASSWORD=""`
  // is the correct development state and must not be reported as a finding.
  const smtpMatch = env.match(/^SMTP_PASSWORD\s*=\s*["']?([^"'\n]*)["']?\s*$/m)
  const smtpValue = (smtpMatch?.[1] ?? '').trim()
  const smtpPassword = smtpValue.length > 0 && !PLACEHOLDER.test(smtpValue)
  envChecks.push(['.env holds no real SMTP password', !smtpPassword])

  const prodDb = /^DATABASE_URL\s*=\s*["']?(postgres|postgresql|mysql):/m.test(env)
  envChecks.push(['.env does not point at a production database', !prodDb])

  const simulationOn = /^PAYMENTS_SIMULATION_MODE\s*=\s*["']?true/m.test(env)
  envChecks.push(['PAYMENTS_SIMULATION_MODE is explicitly set', /PAYMENTS_SIMULATION_MODE/m.test(env)])
  if (simulationOn) console.log('NOTE  PAYMENTS_SIMULATION_MODE is on — correct for this development package, turn it off in production.')

  for (const [name, ok] of envChecks) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
    if (!ok) findings.push({ file: '.env', line: 0, label: name, sample: '' })
  }
} else {
  console.log('FAIL  .env is missing — copy .env.example and configure it')
  findings.push({ file: '.env', line: 0, label: 'missing .env', sample: '' })
}

// ---- 3. ignore rules -------------------------------------------------------
const gitignorePath = path.join(ROOT, '.gitignore')
let ignoreOk = false
if (fs.existsSync(gitignorePath)) {
  const ignore = fs.readFileSync(gitignorePath, 'utf8')
  const required = ['.env', 'node_modules', '.next', 'backups', 'reports', 'private/uploads']
  const missing = required.filter(entry => !ignore.includes(entry))
  ignoreOk = missing.length === 0
  console.log(
    `${ignoreOk ? 'PASS' : 'FAIL'}  .gitignore excludes ${required.length} sensitive paths` +
      (ignoreOk ? '' : ` — missing: ${missing.join(', ')}`)
  )
  if (!ignoreOk) findings.push({ file: '.gitignore', line: 0, label: `missing rules: ${missing.join(', ')}`, sample: '' })
} else {
  console.log('FAIL  .gitignore is missing')
  findings.push({ file: '.gitignore', line: 0, label: '.gitignore missing', sample: '' })
}

// ---- verdict ---------------------------------------------------------------
console.log('\n' + '─'.repeat(72))
if (findings.length) {
  console.log(`${findings.length} issue(s) must be fixed before this tree is pushed.\n`)
  console.log('Incident procedure if a real key was ever committed:')
  console.log('  1. revoke the key at the provider immediately')
  console.log('  2. generate a replacement and set it in the deployment environment only')
  console.log('  3. remove it from the working tree and rewrite history (git filter-repo / BFG)')
  console.log('  4. confirm no deployment still uses it, and review the provider access logs\n')
  process.exit(1)
}
console.log('Secret scan clean — no credential is present in the tree, the shipping .env or the ignore rules.\n')
