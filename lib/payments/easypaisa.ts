import crypto from 'node:crypto'

/**
 * Easypaisa adapter (Pakistan) — Hosted Checkout (Ma Transaction API).
 *
 * The documented Easypaisa integration encrypts the request payload with
 * AES-128 and the merchant Hash Key, then posts it to the MA endpoint.
 * The callback is decrypted with the same key before the order is marked PAID.
 *
 * Verification note: field names and the encryption approach depend on the
 * exact product activated on your Easypaisa merchant account (Hosted Checkout
 * vs QR vs MA). Confirm the parameter list you receive during onboarding and
 * adjust `EASYPAISA_FIELDS` if your account uses a different set — the signing,
 * encryption and callback plumbing stay identical.
 *
 * IMPORTANT: without real keys this adapter reports "not configured" and the
 * checkout page disables the option instead of faking a payment.
 */

const ENDPOINTS = {
  sandbox: 'https://easypaystg.easypaisa.com.pk/easypay/Index.jsf',
  live: 'https://easypay.easypaisa.com.pk/easypay/Index.jsf'
}

export function isEasypaisaConfigured() {
  return Boolean(process.env.EASYPAISA_STORE_ID && process.env.EASYPAISA_HASH_KEY)
}

export function easypaisaEndpoint() {
  return (process.env.EASYPAISA_MODE || 'sandbox') === 'live' ? ENDPOINTS.live : ENDPOINTS.sandbox
}

function hashKey() {
  const key = process.env.EASYPAISA_HASH_KEY
  if (!key) throw new Error('EASYPAISA_HASH_KEY is not configured')
  return key
}

export function easypaisaTimestamp(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

/** AES-128-CBC encryption with the merchant hash key (PKCS7 padding). */
export function easypaisaEncrypt(plainText: string) {
  const key = Buffer.from(hashKey(), 'utf8').subarray(0, 16)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  return Buffer.concat([iv, ciphertext]).toString('base64')
}

export function easypaisaDecrypt(base64Payload: string) {
  const raw = Buffer.from(base64Payload, 'base64')
  const key = Buffer.from(hashKey(), 'utf8').subarray(0, 16)
  const iv = raw.subarray(0, 16)
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv)
  return Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]).toString('utf8')
}

export function easypaisaHash(payload: Record<string, string>) {
  const joined = Object.entries(payload)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return crypto
    .createHmac('sha256', hashKey())
    .update(joined)
    .digest('hex')
}

export type EasypaisaCheckoutInput = {
  orderReference: string
  amountMinor: number
  customerMobile: string
  customerEmail: string
  description: string
  returnUrl: string
}

export function createEasypaisaCheckout(input: EasypaisaCheckoutInput) {
  const orderId = `EP${Date.now()}`

  const payload: Record<string, string> = {
    orderId,
    storeId: process.env.EASYPAISA_STORE_ID ?? '',
    transactionAmount: (input.amountMinor / 100).toFixed(2),
    mobileAccountNo: input.customerMobile,
    emailAddress: input.customerEmail,
    transactionType: 'MA',
    tokenExpiry: easypaisaTimestamp(new Date(Date.now() + 60 * 60_000)),
    bankIdentificationNumber: '000000',
    merchantPaymentMethod: 'MA_PAYMENT_METHOD_1',
    orderReference: input.orderReference,
    description: input.description,
    returnUrl: input.returnUrl,
    requestId: orderId
  }

  const signed = { ...payload, hash: easypaisaHash(payload) }

  return {
    endpoint: easypaisaEndpoint(),
    orderId,
    fields: { postBackURL: input.returnUrl, orderId, encryptedPayload: easypaisaEncrypt(JSON.stringify(signed)) }
  }
}
