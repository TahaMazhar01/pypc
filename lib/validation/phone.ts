/**
 * Phone number validation.
 *
 * Uses Google's libphonenumber metadata through libphonenumber-js, so a number
 * is checked against its *actual* national numbering plan (length, prefix and
 * number type) rather than a loose regex. Numbers are stored in E.164 and
 * displayed in national format.
 */

import {
  AsYouType,
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber
} from 'libphonenumber-js'
import { DEFAULT_COUNTRY_ISO, findCountry } from '@/lib/data/countries'

export type PhoneCheck =
  | {
      ok: true
      /** +923001234567 */
      e164: string
      /** 0300 1234567 */
      national: string
      /** +92 300 1234567 */
      international: string
      country: string
      countryIso: CountryCode
      /** MOBILE | FIXED_LINE | FIXED_LINE_OR_MOBILE */
      type: string
    }
  | { ok: false; reason: string }

/**
 * Validates a number for a country. If `countryIso` is omitted the library
 * infers the country from a leading `+`, and falls back to Pakistan.
 */
export function checkPhone(rawValue: string, countryIso?: string | null): PhoneCheck {
  const value = (rawValue ?? '').trim()
  if (!value) return { ok: false, reason: 'Enter your mobile number.' }

  const iso = (findCountry(countryIso)?.iso2 ?? DEFAULT_COUNTRY_ISO) as CountryCode

  const digitsOnly = value.replace(/[^\d]/g, '')
  if (digitsOnly.length < 6) return { ok: false, reason: 'That number looks too short.' }
  if (digitsOnly.length > 15) return { ok: false, reason: 'That number looks too long.' }

  const parsed: PhoneNumber | undefined =
    parsePhoneNumberFromString(value, iso) ??
    parsePhoneNumberFromString(value.startsWith('+') ? value : `+${digitsOnly}`, iso) ??
    undefined

  if (!parsed) {
    return { ok: false, reason: `Enter a valid ${findCountry(iso)?.name ?? 'local'} phone number.` }
  }

  if (!parsed.isValid()) {
    return {
      ok: false,
      reason: `That is not a valid ${findCountry(parsed.country ?? iso)?.name ?? 'phone'} number. Check the digits and the country code.`
    }
  }

  const numberType = parsed.getType()
  if (numberType === 'PREMIUM_RATE' || numberType === 'SHARED_COST') {
    return { ok: false, reason: 'Premium-rate numbers are not accepted.' }
  }

  return {
    ok: true,
    e164: parsed.number,
    national: parsed.formatNational(),
    international: parsed.formatInternational(),
    country: findCountry(parsed.country ?? iso)?.name ?? parsed.country ?? '',
    countryIso: (parsed.country ?? iso) as CountryCode,
    type: numberType ?? 'UNKNOWN'
  }
}

/** Live formatting for the input as the visitor types. */
export function formatPhoneAsYouType(value: string, countryIso?: string | null) {
  const iso = (findCountry(countryIso)?.iso2 ?? DEFAULT_COUNTRY_ISO) as CountryCode
  try {
    return new AsYouType(iso).input(value)
  } catch {
    return value
  }
}

/** Masks a stored number for display: +92 3•• •••4567 */
export function maskPhone(e164?: string | null) {
  if (!e164) return '—'
  const parsed = parsePhoneNumberFromString(e164)
  if (!parsed) return e164
  const national = parsed.nationalNumber
  const tail = national.slice(-4)
  return `${parsed.countryCallingCode ? `+${parsed.countryCallingCode} ` : ''}${'•'.repeat(
    Math.max(national.length - tail.length, 0)
  )}${tail}`
}

/** True when the number is a mobile — the only type PYPC sends SMS notices to. */
export function isMobileNumber(e164: string) {
  const parsed = parsePhoneNumberFromString(e164)
  if (!parsed) return false
  const type = parsed.getType()
  return type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE'
}
