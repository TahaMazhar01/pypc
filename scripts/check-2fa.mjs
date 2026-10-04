/**
 * Two-factor authentication end-to-end.
 *
 * Proves the whole member journey through the real HTTP API and the real
 * database — not a unit test of the algorithm:
 *
 *   1. RFC 6238 test vectors reproduce (the algorithm is correct, not just self-consistent)
 *   2. a member signs in with a password alone while 2FA is off
 *   3. setup begins only with the correct password
 *   4. a wrong code cannot switch 2FA on
 *   5. the correct code switches it on and returns recovery codes
 *   6. the next sign-in is refused without a code (and creates no session)
 *   7. the correct code completes the sign-in
 *   8. a recovery code also works — and is consumed
 *   9. turning 2FA off requires the password
 *  10. after that, the password alone signs in again
 *
 * Everything it creates is deleted afterwards; the seeded accounts are untouched.
 *
 *   BASE=http://127.0.0.1:3000 node scripts/check-2fa.mjs
 */
import { createHmac, randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(import.meta.url), '..', '..')
const BASE = process.env.BASE || 'http://127.0.0.1:3000'

// ── anchor the database the same way the other suites do ────────────────────
if (!process.env.DATABASE_URL) {
  for (const candidate of ['.env', '.env.local']) {
    const file = join(projectRoot, candidate)
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (!match) continue
      const value = match[2].replace(/^["']|["']$/g, '')
      if (!(match[1] in process.env)) process.env[match[1]] = value
    }
  }
}
if (process.env.DATABASE_URL?.startsWith('file:')) {
  const raw = process.env.DATABASE_URL.slice('file:'.length)
  if (!isAbsolute(raw)) {
    process.env.DATABASE_URL = `file:${resolve(projectRoot, 'prisma', raw.replace(/^\.\//, ''))}`
  }
}

const { PrismaClient } = await import('@prisma/client')
const bcrypt = (await import('bcryptjs')).default
const prisma = new PrismaClient()

let passed = 0
let failed = 0
const failures = []

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1
    console.log(`PASS  ${name}${detail ? `  — ${detail}` : ''}`)
  } else {
    failed += 1
    failures.push(name)
    console.log(`FAIL  ${name}${detail ? `  — ${detail}` : ''}`)
  }
}

const EMAIL = `twofa.${randomBytes(4).toString('hex')}@gmail.com`
const PASSWORD = 'Str0ng!Passw0rd'

// ── the algorithm, re-implemented here so the app's version is checked against
//    the RFC, not against itself ─────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buffer) {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31]
  return output
}

function base32Decode(input) {
  let bits = 0
  let value = 0
  const bytes = []
  for (const character of input.replace(/=+$/, '').toUpperCase()) {
    const index = ALPHABET.indexOf(character)
    if (index === -1) continue
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function hotp(secret, counter, digits = 6) {
  const key = base32Decode(secret)
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0)
  buffer.writeUInt32BE(counter % 2 ** 32, 4)
  const digest = createHmac('sha1', key).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(binary % 10 ** digits).padStart(digits, '0')
}

function totpFor(secret) {
  return hotp(secret, Math.floor(Date.now() / 1000 / 30))
}

// ── HTTP helpers ────────────────────────────────────────────────────────────
async function api(method, path, { body, cookie, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      origin: BASE,
      'user-agent': 'pypc-2fa-audit/1.0',
      ...(cookie ? { cookie } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual'
  })
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* html */
  }
  return { status: res.status, json, text, cookies }
}

function sessionCookie(cookies) {
  const found = cookies.find(item => item.startsWith('pypc_session'))
  return found ? found.split(';')[0] : null
}

async function signIn(withCode) {
  return api('POST', '/api/auth/login', {
    body: { email: EMAIL, password: PASSWORD, ...(withCode ? { totp: withCode } : {}) },
    headers: { 'x-forwarded-for': `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }
  })
}

;(async () => {
  console.log('\n== RFC 6238 test vectors ==\n')
  const rfcSecret = base32Encode(Buffer.from('12345678901234567890'))
  const vectors = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130']
  ]
  for (const [time, expected] of vectors) {
    const got = hotp(rfcSecret, Math.floor(time / 30))
    check(`RFC 6238 vector at t=${time}`, got === expected, `expected ${expected}, got ${got}`)
  }

  console.log('\n== two-factor journey ==\n')

  await prisma.user.deleteMany({ where: { email: EMAIL } })
  await prisma.rateLimitCounter.deleteMany({})

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      firstName: 'TwoFactor',
      lastName: 'Audit',
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date()
    }
  })

  const firstLogin = await signIn()
  const firstCookie = sessionCookie(firstLogin.cookies)
  check('with 2FA off, the password alone signs in', firstLogin.status === 200 && Boolean(firstCookie), `status ${firstLogin.status}`)

  const wrongPassword = await api('POST', '/api/dashboard/2fa', {
    cookie: firstCookie,
    body: { action: 'begin', password: 'NotThePassword1!' }
  })
  check(
    'setup refuses to start without the correct password',
    wrongPassword.status === 403,
    `status ${wrongPassword.status}`
  )

  const begin = await api('POST', '/api/dashboard/2fa', {
    cookie: firstCookie,
    body: { action: 'begin', password: PASSWORD }
  })
  const secret = begin.json?.secret
  check(
    'setup issues a base32 secret and an otpauth URI',
    begin.status === 200 && /^[A-Z2-7]{16,}$/.test(secret ?? '') && /^otpauth:\/\/totp\//.test(begin.json?.otpauthUri ?? ''),
    `${(secret ?? '').length} characters`
  )
  check(
    'the provisioning URI carries the issuer, algorithm and period',
    /issuer=Pakistan\+Youth\+Parliamentary\+Council/.test(begin.json?.otpauthUri ?? '') &&
      /algorithm=SHA1/.test(begin.json?.otpauthUri ?? '') &&
      /period=30/.test(begin.json?.otpauthUri ?? '')
  )

  const unconfirmed = await prisma.user.findUnique({ where: { id: user.id } })
  check(
    'a started-but-unconfirmed setup does not switch 2FA on',
    unconfirmed.twoFactorSecret === secret && unconfirmed.twoFactorConfirmedAt === null
  )

  const wrongCode = await api('POST', '/api/dashboard/2fa', {
    cookie: firstCookie,
    body: { action: 'confirm', code: '000000' }
  })
  check('a wrong code cannot switch 2FA on', wrongCode.status === 422, `status ${wrongCode.status}`)

  const confirm = await api('POST', '/api/dashboard/2fa', {
    cookie: firstCookie,
    body: { action: 'confirm', code: totpFor(secret) }
  })
  const recoveryCodes = confirm.json?.recoveryCodes ?? []
  check(
    'the correct code switches 2FA on and returns recovery codes',
    confirm.status === 200 && recoveryCodes.length === 8,
    `${recoveryCodes.length} codes`
  )

  const confirmed = await prisma.user.findUnique({ where: { id: user.id } })
  check(
    'recovery codes are stored as hashes, never in clear text',
    Boolean(confirmed.twoFactorRecoveryCodes) &&
      !confirmed.twoFactorRecoveryCodes.includes(recoveryCodes[0]) &&
      JSON.parse(confirmed.twoFactorRecoveryCodes).length === 8
  )
  check(
    'the audit log records the security change',
    Boolean(
      await prisma.auditLog.findFirst({
        where: { actorId: user.id, action: 'TWO_FACTOR_ENABLED' }
      })
    )
  )

  const noCode = await signIn()
  check(
    'with 2FA on, the password alone no longer signs in',
    noCode.status === 401 && noCode.json?.code === 'TOTP_REQUIRED',
    `status ${noCode.status} · ${noCode.json?.code}`
  )
  check('and no session cookie is issued in that reply', !sessionCookie(noCode.cookies))

  const badCode = await signIn('123456')
  check(
    'a wrong code is refused and audited',
    badCode.status === 401 &&
      badCode.json?.code === 'TOTP_INVALID' &&
      Boolean(await prisma.auditLog.findFirst({ where: { actorId: user.id, action: 'LOGIN_FAILED_TWO_FACTOR' } })),
    `status ${badCode.status}`
  )

  const withCode = await signIn(totpFor(secret))
  check('the current code completes the sign-in', withCode.status === 200 && Boolean(sessionCookie(withCode.cookies)), `status ${withCode.status}`)

  const recoveryCookie = sessionCookie(withCode.cookies)
  const recoveryCode = recoveryCodes[0]
  const recoverySignIn = await signIn(recoveryCode)
  check(
    'a recovery code also signs the member in',
    recoverySignIn.status === 200 && Boolean(sessionCookie(recoverySignIn.cookies)),
    `status ${recoverySignIn.status}`
  )

  const afterRecovery = await prisma.user.findUnique({ where: { id: user.id } })
  check(
    'the used recovery code is consumed, the rest survive',
    JSON.parse(afterRecovery.twoFactorRecoveryCodes).length === 7
  )

  const reuse = await signIn(recoveryCode)
  check('a spent recovery code cannot be used twice', reuse.status === 401, `status ${reuse.status}`)

  const disableWrong = await api('POST', '/api/dashboard/2fa', {
    cookie: recoveryCookie,
    body: { action: 'disable', password: 'WrongOne1!' }
  })
  check('turning 2FA off refuses the wrong password', disableWrong.status === 403, `status ${disableWrong.status}`)

  const disable = await api('POST', '/api/dashboard/2fa', {
    cookie: recoveryCookie,
    body: { action: 'disable', password: PASSWORD }
  })
  check('the correct password turns 2FA off', disable.status === 200, `status ${disable.status}`)

  const cleared = await prisma.user.findUnique({ where: { id: user.id } })
  check(
    'switching off clears the secret and the recovery codes',
    cleared.twoFactorSecret === null &&
      cleared.twoFactorConfirmedAt === null &&
      cleared.twoFactorRecoveryCodes === null
  )

  const finalLogin = await signIn()
  check('after switching off, the password alone signs in again', finalLogin.status === 200, `status ${finalLogin.status}`)

  console.log('\n== cleanup ==\n')
  await prisma.auditLog.deleteMany({ where: { actorId: user.id, hash: null } })  // chained rows are immutable evidence
  await prisma.notification.deleteMany({ where: { userId: user.id } })
  await prisma.user.delete({ where: { id: user.id } })
  await prisma.rateLimitCounter.deleteMany({})
  console.log('test account removed; seeded data untouched')

  console.log(`\ntwo-factor audit: ${passed} passed, ${failed} failed`)
  if (failed) {
    console.log('Failures:')
    for (const name of failures) console.log(`  - ${name}`)
    process.exitCode = 1
  }

  await prisma.$disconnect()
})().catch(async error => {
  console.error('two-factor audit crashed:', error)
  await prisma.$disconnect()
  process.exit(1)
})
