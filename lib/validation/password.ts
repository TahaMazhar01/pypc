/**
 * Password policy — one definition shared by the browser and the server.
 *
 * The client uses it to explain, live, exactly what is still missing; the zod
 * schema in `lib/validations` uses the same rules to enforce them. Because both
 * read from this file, the hint a visitor sees and the rule the server applies
 * can never drift apart — which is what removes "invalid input" surprises.
 */

export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 128
/** bcrypt only hashes the first 72 bytes; anything past that is ignored, so we cap it openly. */
export const PASSWORD_MAX_BYTES = 72

export const WEAK_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', '12345678', '123456789',
  '1234567890', '12345678901', 'qwerty123', 'qwertyuiop', 'qwerty12345', 'letmein1', 'letmein123',
  'welcome1', 'welcome123', 'iloveyou', 'iloveyou1', 'admin123', 'admin1234', 'administrator',
  'pypc1234', 'pypc12345', 'pakistan1', 'pakistan123', 'islamabad1', 'abc12345', 'abcd1234',
  '11111111', 'aaaaaaaa', 'football1', 'baseball1', 'sunshine1', 'princess1', 'monkey123',
  'dragon123', 'master123', 'trustno1', 'changeme1', 'changeme123', 'superman1', 'batman123'
])

/**
 * Predictable cores. "Password1!" satisfies every character-class rule and is
 * still one of the first guesses an attacker makes, so the policy looks through
 * the padding: the letters-only core is compared too.
 */
export const COMMON_CORES = new Set([
  ...Array.from(WEAK_PASSWORDS).map(word => word.replace(/[^a-z]/g, '')).filter(Boolean),
  'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbn', 'zxcvbnm', 'qazwsx', 'qwertz',
  'pakistan', 'islamabad', 'lahore', 'karachi', 'rawalpindi', 'peshawar', 'quetta', 'multan',
  'parliament', 'youth', 'pypc', 'council', 'secretariat', 'cricket', 'student', 'university',
  'college', 'school', 'python', 'google', 'facebook', 'instagram', 'whatsapp', 'linkedin',
  'secret', 'mypassword', 'welcome', 'letmein', 'admin', 'administrator', 'root', 'changeme',
  'iloveyou', 'sunshine', 'princess', 'monkey', 'dragon', 'master', 'superman', 'batman'
])

/** Undoes a pair of common letter swaps so "l3tm31n" reads as "letmein". */
export function leetNormalise(value: string) {
  return value
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/8/g, 'b')
    .replace(/3/g, 'e')
    .replace(/[69]/g, 'g')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7+]/g, 't')
    .replace(/2/g, 'z')
}

/** Symbol swaps that keep a letter's identity but are not digits ("p@ssword"). */
function symbolSwap(value: string) {
  return value
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[!|]/g, 'i')
    .replace(/\+/g, 't')
}

/**
 * The candidate "cores" of a password: what is left once the padding and the
 * usual disguises are removed. Checking all three catches "password123",
 * "p@ssword123" and "l3tm31n" without ever rejecting a genuinely random string.
 */
export function passwordCores(value: string): string[] {
  const lower = value.toLowerCase()
  return [
    lower.replace(/[^a-z]/g, ''), // letters only
    symbolSwap(lower).replace(/[^a-z]/g, ''), // symbols read as letters, digits dropped
    leetNormalise(lower).replace(/[^a-z]/g, '') // full leetspeak
  ].filter(core => core.length >= 4)
}

/**
 * True when the password is a well-known word wearing a simple disguise —
 * "Password1!", "P@ssword123", "l3tm31n", "pakistan2026!" all land here.
 */
export function passwordLooksCommon(value: string) {
  if (!value) return false
  const lower = value.toLowerCase()
  if (WEAK_PASSWORDS.has(lower)) return true
  if (/^(.)\1+$/.test(value)) return true

  for (const core of passwordCores(value)) {
    if (WEAK_PASSWORDS.has(core) || COMMON_CORES.has(core)) return true
  }

  const core = lower.replace(/[^a-z]/g, '')
  if (core.length >= 4 && COMMON_CORES.has(core)) return true
  // "pakistan2026" → core "pakistan" already caught; catch the reverse paddings too
  const leading = lower.replace(/[^a-z].*$/, '')
  if (leading.length >= 4 && COMMON_CORES.has(leading)) return true
  // A single letter repeated across the whole password ("aaaa1111!!!")
  const letters = lower.replace(/[^a-z]/g, '')
  if (letters.length >= 4 && new Set(letters).size === 1) return true

  return false
}

/**
 * The password must not simply restate who the person is: their name, their
 * email local part, or their organisation. Returns the offending fragment.
 */
export function passwordContainsPersonalInfo(
  value: string,
  terms: (string | null | undefined)[]
): string | null {
  const lower = value.toLowerCase()
  for (const term of terms) {
    if (!term) continue
    const clean = term.toLowerCase().trim()
    if (clean.length < 3) continue

    const fragments = new Set<string>([clean])
    for (const part of clean.split(/[\s.@_\-+,/]+/)) if (part.length >= 3) fragments.add(part)

    for (const fragment of fragments) {
      if (fragment.length >= 3 && lower.includes(fragment)) return fragment
    }
  }
  return null
}

export type PasswordRequirement = {
  id: string
  label: string
  met: boolean
}

/** UTF-8 byte length — what bcrypt actually sees. */
export function passwordByteLength(value: string) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length
  return value.length
}

/**
 * The rules, in the order they are shown to the visitor. Deliberately practical:
 * no rule here rejects a genuinely strong password, including one with spaces,
 * accents or an emoji.
 */
export function passwordRequirements(value: string): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: value.length >= PASSWORD_MIN_LENGTH
    },
    { id: 'lower', label: 'One lowercase letter (a–z)', met: /[a-z]/.test(value) },
    { id: 'upper', label: 'One uppercase letter (A–Z)', met: /[A-Z]/.test(value) },
    { id: 'digit', label: 'One number (0–9)', met: /\d/.test(value) },
    { id: 'symbol', label: 'One symbol (! ? # @ …)', met: /[^A-Za-z0-9]/.test(value) },
    {
      id: 'unique',
      label: 'Not a common password (password123, Pakistan1!, aaaaaaaa …)',
      met: value.length > 0 && !passwordLooksCommon(value)
    },
    {
      id: 'length-cap',
      label: `Not longer than ${PASSWORD_MAX_LENGTH} characters`,
      met: value.length > 0 && value.length <= PASSWORD_MAX_LENGTH && passwordByteLength(value) <= PASSWORD_MAX_BYTES
    }
  ]
}

export function passwordMeetsAll(value: string) {
  return passwordRequirements(value).every(rule => rule.met)
}

export type PasswordStrength = {
  /** 0 (empty) to 4 (excellent). */
  score: 0 | 1 | 2 | 3 | 4
  label: 'Empty' | 'Very weak' | 'Weak' | 'Good' | 'Strong'
  percent: number
  /** Rule ids that are still outstanding. */
  missing: string[]
}

/**
 * A small, honest score: how many of the visible rules are satisfied, nudged up
 * by length. It never claims a password is strong while a rule is failing.
 */
export function passwordStrength(value: string): PasswordStrength {
  if (!value) return { score: 0, label: 'Empty', percent: 0, missing: [] }

  const rules = passwordRequirements(value)
  const missing = rules.filter(rule => !rule.met).map(rule => rule.id)
  const metCount = rules.length - missing.length

  let score = 0
  if (metCount >= 2) score = 1
  if (metCount >= 4) score = 2
  if (metCount >= 6) score = 3
  if (metCount === rules.length && value.length >= 12) score = 4
  if (metCount === rules.length && score < 3) score = 3

  const labels: PasswordStrength['label'][] = ['Empty', 'Very weak', 'Weak', 'Good', 'Strong']
  return {
    score: score as PasswordStrength['score'],
    label: labels[score],
    percent: Math.round((metCount / rules.length) * 100),
    missing
  }
}
