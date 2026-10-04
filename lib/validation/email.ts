/**
 * Email validation, in three layers.
 *
 * 1. Syntax — strict, RFC-shaped regex plus the rules that actually break
 *    delivery (no leading/trailing dot, no double dots, sane TLD, length caps).
 * 2. Policy — disposable/temporary providers and role mailboxes that cannot
 *    receive a personal verification link.
 * 3. Deliverability — a real DNS **MX** lookup, which lives in
 *    `lib/validation/email-server.ts` because it needs Node's DNS module.
 *    This file stays free of Node built-ins so forms can import it in the browser.
 */

const EMAIL_PATTERN =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/

/** Role mailboxes: a verification link sent here is not proof of a real person. */
export const ROLE_MAILBOXES = new Set([
  'admin','administrator','abuse','billing','contact','enquiries','enquiry','feedback','help','hostmaster',
  'info','inquiries','inquiry','jobs','mail','marketing','noc','noreply','no-reply','office','postmaster',
  'privacy','root','sales','security','spam','support','sysadmin','test','testing','webmaster','www'
])

/** Common disposable / throwaway providers. Not exhaustive, but it stops the usual ones. */
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com','10minutemail.net','20minutemail.com','33mail.com','anonbox.net','antichef.com',
  'byom.de','discard.email','discardmail.com','disposableaddress.com','disposableemailaddresses.com',
  'dispostable.com','dropmail.me','emailondeck.com','email-temp.com','fakeinbox.com','fake-mail.net',
  'filzmail.com','getairmail.com','getnada.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamailblock.com','harakirimail.com','hidemail.de','inboxbear.com','incognitomail.com',
  'jetable.org','koszmail.pl','mailcatch.com','maildrop.cc','maileater.com','mailexpire.com','mailfa.org',
  'mailforspam.com','mailinator.com','mailinator.net','mailinator2.com','mailmetrash.com','mailnesia.com',
  'mailnull.com','mailshell.com','mailsiphon.com','mailslite.com','mailtemp.info','mail-temporaire.fr',
  'mintemail.com','mt2015.com','mytrashmail.com','no-spam.ws','nodemail.org','nospamfor.us','nowmymail.com',
  'objectmail.com','proxymail.eu','punkass.com','rcpt.at','recursor.net','reliable-mail.com','rtrtr.com',
  'safetymail.info','sharklasers.com','shiftmail.com','skeefmail.com','slopsbox.com','smellfear.com',
  'snakemail.com','sofort-mail.de','spamavert.com','spambob.com','spambob.net','spambob.org','spambog.com',
  'spambox.us','spamcannon.com','spamex.com','spamfree24.org','spamgourmet.com','spamherelots.com',
  'spamify.com','spaminator.de','spamkill.info','spaml.com','spamobox.com','spamslicer.com','spamspot.com',
  'spamthis.co.uk','spamtrail.com','superrito.com','tempail.com','tempemail.net','tempinbox.com',
  'tempmail.com','tempmail.net','tempmail.org','tempmail2.com','tempmailer.com','tempomail.fr',
  'temporarily.de','temporaryemail.net','temporaryinbox.com','thankyou2010.com','thisisnotmyrealemail.com',
  'throwawayemailaddress.com','tmailinator.com','trash-mail.com','trash-mail.de','trashdevil.com',
  'trashemail.de','trashmail.com','trashmail.me','trashmail.net','trashymail.com','trbvm.com','trialmail.de',
  'turual.com','tyldd.com','uggsrock.com','veryrealemail.com','wegwerfmail.de','wh4f.org','whyspam.me',
  'willselfdestruct.com','xagloo.com','yopmail.com','yopmail.fr','yopmail.net','yuurok.com','zehnminuten.de',
  'zippymail.info','zoemail.org'
])

/** Domains that are syntactically valid but can never receive mail. */
export const NON_ROUTABLE_DOMAINS = new Set(['example.com','example.net','example.org','localhost','invalid','test'])

export type EmailAssessment = {
  ok: boolean
  email: string
  reason?: string
  /** 'valid' | 'unknown' — MX found, or DNS could not be reached. */
  deliverability: 'valid' | 'unknown'
  /** Soft warnings that do not block signup. */
  warnings: string[]
}

/** Trims, lowercases and strips unicode look-alikes that break delivery. */
export function normaliseEmail(raw: string) {
  return (raw ?? '')
    .trim()
    .replace(/^mailto:/i, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
}

export function emailSyntaxIssues(email: string) {
  const issues: string[] = []

  if (!email) return ['Enter your email address.']
  if (email.length > 254) issues.push('That email address is too long.')
  if (!email.includes('@')) issues.push('An email address needs an @ symbol.')
  if (!EMAIL_PATTERN.test(email)) issues.push('Enter a valid email address, e.g. name@university.edu.')

  const [local, domain] = email.split('@')

  if (local && local.length > 64) issues.push('The part before @ is too long.')
  if (local?.startsWith('.') || local?.endsWith('.')) issues.push('The email address cannot start or end with a dot.')
  if (email.includes('..')) issues.push('The email address cannot contain two dots in a row.')
  if (domain && domain.includes('_')) issues.push('Domain names cannot contain underscores.')

  return issues
}

export function isDisposableEmail(email: string) {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  if (!domain) return false
  if (DISPOSABLE_DOMAINS.has(domain)) return true
  // Also catch subdomains of a known throwaway provider.
  return DISPOSABLE_DOMAINS.has(domain.split('.').slice(-2).join('.'))
}

export function isRoleMailbox(email: string) {
  return ROLE_MAILBOXES.has(email.split('@')[0]?.toLowerCase() ?? '')
}
