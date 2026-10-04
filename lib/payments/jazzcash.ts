import crypto from 'node:crypto'

/**
 * JazzCash adapter (Pakistan) — Mobile Wallet / Card hosted checkout.
 *
 * Flow implemented here:
 *   1. Build the transaction request fields.
 *   2. Sort every non-empty field alphabetically (JazzCash requirement).
 *   3. Prefix with the Integrity Salt and HMAC-SHA256 the "&"-joined string.
 *   4. Append pp_SecureHash and auto-submit the form to the JazzCash endpoint.
 *   5. JazzCash posts back to pp_ReturnURL with the same hashing rules —
 *      the callback route re-computes the hash and only then marks the order PAID.
 *
 * Official values (Merchant ID, Password, Integrity Salt, endpoint URLs) come
 * from your approved JazzCash merchant account. Nothing here is invented.
 */

const ENDPOINTS = {
  sandbox: 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
  live: 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'
}

export function isJazzCashConfigured() {
  return Boolean(
    process.env.JAZZCASH_MERCHANT_ID &&
      process.env.JAZZCASH_PASSWORD &&
      process.env.JAZZCASH_INTEGRITY_SALT
  )
}

export function jazzCashEndpoint() {
  return (process.env.JAZZCASH_MODE || 'sandbox') === 'live' ? ENDPOINTS.live : ENDPOINTS.sandbox
}

export function jazzCashTimestamp(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

/** pp_TxnDateTime format used by JazzCash expiry (yyyyMMddHHmmss). */
export function jazzCashExpiry(minutes = 60, date = new Date()) {
  return jazzCashTimestamp(new Date(date.getTime() + minutes * 60_000))
}

function integritySalt() {
  const salt = process.env.JAZZCASH_INTEGRITY_SALT
  if (!salt) throw new Error('JAZZCASH_INTEGRITY_SALT is not configured')
  return salt
}

/**
 * JazzCash secure hash:
 * HMAC-SHA256 over  "salt&field1=value1&field2=value2..."  (sorted, non-empty)
 */
export function jazzCashSecureHash(fields: Record<string, string | number | undefined>) {
  const values = Object.entries(fields)
    .filter(([key, value]) => key !== 'pp_SecureHash' && value !== undefined && value !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)

  const stringToHash = [integritySalt(), ...values].join('&')

  return crypto.createHmac('sha256', integritySalt()).update(stringToHash).digest('hex').toUpperCase()
}

export type JazzCashCheckoutInput = {
  orderReference: string
  amountMinor: number
  customerMobile: string
  customerEmail: string
  description: string
  returnUrl: string
}

export type JazzCashCheckoutResult = {
  endpoint: string
  fields: Record<string, string>
}

export function createJazzCashCheckout(input: JazzCashCheckoutInput): JazzCashCheckoutResult {
  const txnRef = `T${Date.now()}${Math.floor(Math.random() * 900 + 100)}`

  const fields: Record<string, string> = {
    pp_Version: '1.1',
    pp_TxnType: 'MWALLET',
    pp_Language: 'EN',
    pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID ?? '',
    pp_Password: process.env.JAZZCASH_PASSWORD ?? '',
    pp_TxnRefNo: txnRef,
    pp_Amount: String(input.amountMinor), // smallest unit: PKR in paisa
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: jazzCashTimestamp(),
    pp_BillReference: input.orderReference,
    pp_Description: input.description,
    pp_TxnExpiryDateTime: jazzCashExpiry(),
    pp_ReturnURL: input.returnUrl,
    pp_MobileNumber: input.customerMobile,
    pp_EmailAddress: input.customerEmail,
    pp_SecureHash: ''
  }

  fields.pp_SecureHash = jazzCashSecureHash(fields)

  return { endpoint: jazzCashEndpoint(), fields }
}

/** Verifies a JazzCash response/return payload. */
export function verifyJazzCashHash(payload: Record<string, string>) {
  const received = payload.pp_SecureHash
  if (!received) return false
  const expected = jazzCashSecureHash(payload)
  try {
    return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  } catch {
    return false
  }
}
