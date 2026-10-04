/**
 * TOTP — time-based one-time passwords, RFC 6238.
 *
 * Implemented here rather than pulled in as a dependency because the whole
 * algorithm is forty lines of HMAC and base32, and an authentication primitive
 * is the last place to add supply-chain surface. It is verified against the
 * RFC 6238 test vectors in `scripts/check-2fa.mjs`, which runs in the delivery
 * gates.
 *
 * Compatibility: any authenticator app that implements the standard works —
 * Google Authenticator, Microsoft Authenticator, Authy, 1Password, Bitwarden,
 * FreeOTP, Aegis. The provisioning URI is the `otpauth://` form every one of
 * them understands.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const DIGITS = 6
const PERIOD_SECONDS = 30
/** Accept the previous and next window too, so a slightly slow phone still works. */
const DRIFT_WINDOWS = 1

export function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []

  for (const character of clean) {
    const index = BASE32_ALPHABET.indexOf(character)
    if (index === -1) throw new Error('invalid base32 character')

    value = (value << 5) | index
    bits += 5

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return Buffer.from(bytes)
}

/** A fresh 160-bit secret, base32-encoded — the size RFC 4226 recommends. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20))
}

/**
 * HOTP for a given counter (RFC 4226), which TOTP then wraps with a time counter.
 */
export function hotp(secret: string, counter: number, digits = DIGITS): string {
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

export function totp(secret: string, atMs = Date.now(), step = PERIOD_SECONDS): string {
  return hotp(secret, Math.floor(atMs / 1000 / step))
}

/**
 * Checks a submitted code, allowing one step of clock drift in each direction.
 * Comparison is constant-time so a wrong answer cannot be narrowed down by
 * timing how long the check took.
 */
export function verifyTotp(secret: string, code: string, atMs = Date.now()): boolean {
  const submitted = code.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(submitted)) return false

  const step = Math.floor(atMs / 1000 / PERIOD_SECONDS)
  const given = Buffer.from(submitted)

  for (let drift = -DRIFT_WINDOWS; drift <= DRIFT_WINDOWS; drift += 1) {
    const expected = Buffer.from(hotp(secret, step + drift))
    if (expected.length === given.length && timingSafeEqual(expected, given)) return true
  }

  return false
}

/** The `otpauth://` URI an authenticator app scans. */
export function provisioningUri(input: {
  secret: string
  accountName: string
  issuer?: string
}): string {
  const issuer = input.issuer ?? 'Pakistan Youth Parliamentary Council'
  const label = encodeURIComponent(`${issuer}:${input.accountName}`)
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS)
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

/** Human-readable secret, grouped in fours so it can be typed by hand. */
export function readableSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim()
}

/** Eight one-time recovery codes, for a lost phone. */
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(5).toString('hex').toUpperCase().replace(/(.{5})/, '$1-')
  )
}
