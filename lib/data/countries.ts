/**
 * Complete country catalogue.
 *
 * Built from libphonenumber-js (Google's libphonenumber metadata) so every
 * country in the world is present with its real dialling code, plus the English
 * country name from the platform's own Intl data. Nothing is hand-typed, which
 * means no missing countries and no wrong dial codes.
 *
 * `PRIORITY` countries are floated to the top of the picker (Pakistan first,
 * then the regions PYPC recruits from most), but every country remains
 * selectable — the list is not restricted to any region.
 */

import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js'

export type Country = {
  /** ISO 3166-1 alpha-2, e.g. "PK". */
  iso2: CountryCode
  /** English country name, e.g. "Pakistan". */
  name: string
  /** Dialling code without the plus, e.g. "92". */
  dialCode: string
  /** Dialling code with the plus, e.g. "+92". */
  dial: string
  /** Regional-indicator flag emoji, e.g. 🇵🇰 */
  flag: string
  /** Continent/region grouping for optgroup rendering. */
  region: string
}

const PRIORITY: CountryCode[] = [
  'PK',
  'AE',
  'SA',
  'GB',
  'US',
  'CA',
  'MY',
  'ID',
  'TR',
  'BD',
  'IN',
  'LK',
  'NP',
  'CN',
  'DE',
  'AU'
]

/** Region grouping, kept deliberately coarse so it stays stable across updates. */
const REGION_OVERRIDES: Partial<Record<CountryCode, string>> = {
  PK: 'Pakistan',
  BD: 'South Asia',
  IN: 'South Asia',
  LK: 'South Asia',
  NP: 'South Asia',
  BT: 'South Asia',
  MV: 'South Asia',
  AF: 'South Asia',
  IR: 'Middle East & Central Asia',
  AE: 'Middle East & Central Asia',
  SA: 'Middle East & Central Asia',
  QA: 'Middle East & Central Asia',
  KW: 'Middle East & Central Asia',
  BH: 'Middle East & Central Asia',
  OM: 'Middle East & Central Asia',
  TR: 'Middle East & Central Asia',
  KZ: 'Middle East & Central Asia',
  UZ: 'Middle East & Central Asia',
  KG: 'Middle East & Central Asia',
  TJ: 'Middle East & Central Asia',
  TM: 'Middle East & Central Asia',
  AZ: 'Middle East & Central Asia'
}

function flagFor(iso2: string) {
  return String.fromCodePoint(
    ...iso2.split('').map(letter => 127397 + letter.charCodeAt(0))
  )
}

function nameFor(iso2: string) {
  try {
    const display = new Intl.DisplayNames(['en'], { type: 'region' })
    const name = display.of(iso2)
    if (name && name !== iso2) return name
  } catch {
    /* Intl.DisplayNames unavailable — fall through to the ISO code. */
  }
  return iso2
}

function regionFor(iso2: CountryCode, name: string) {
  return REGION_OVERRIDES[iso2] ?? regionFromName(name)
}

/**
 * Very light region classifier. It only affects ordering, never availability,
 * so an approximate answer here is harmless.
 */
function regionFromName(name: string) {
  const africa = [
    'Algeria','Angola','Benin','Botswana','Burkina','Burundi','Cabo','Cameroon','Central African',
    'Chad','Comoros','Congo','Djibouti','Egypt','Equatorial','Eritrea','Eswatini','Ethiopia','Gabon',
    'Gambia','Ghana','Guinea','Ivory','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi','Mali',
    'Mauritania','Mauritius','Mayotte','Morocco','Mozambique','Namibia','Niger','Nigeria','Réunion',
    'Rwanda','Saint Helena','Sao Tome','Senegal','Seychelles','Sierra Leone','Somalia','South Africa',
    'South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','Western Sahara','Zambia','Zimbabwe','Ceuta'
  ]
  const europe = [
    'Albania','Andorra','Austria','Belarus','Belgium','Bosnia','Bulgaria','Croatia','Cyprus','Czechia',
    'Denmark','Estonia','Faroe','Finland','France','Germany','Gibraltar','Greece','Guernsey','Hungary',
    'Iceland','Ireland','Isle of Man','Italy','Jersey','Kosovo','Latvia','Liechtenstein','Lithuania',
    'Luxembourg','Malta','Moldova','Monaco','Montenegro','Netherlands','North Macedonia','Norway','Poland',
    'Portugal','Romania','Russia','San Marino','Serbia','Slovakia','Slovenia','Spain','Svalbard','Sweden',
    'Switzerland','Ukraine','United Kingdom','Vatican','Åland'
  ]
  const americas = [
    'Anguilla','Antigua','Argentina','Aruba','Bahamas','Barbados','Belize','Bermuda','Bolivia','Brazil',
    'British Virgin','Canada','Caribbean','Cayman','Chile','Colombia','Costa Rica','Cuba','Curaçao',
    'Dominica','Dominican','Ecuador','El Salvador','Falkland','French Guiana','Greenland','Grenada',
    'Guadeloupe','Guatemala','Guyana','Haiti','Honduras','Jamaica','Martinique','Mexico','Montserrat',
    'Nicaragua','Panama','Paraguay','Peru','Puerto Rico','Saint Barth','Saint Kitts','Saint Lucia',
    'Saint Martin','Saint Pierre','Saint Vincent','Sint Maarten','Suriname','Trinidad','Turks','United States',
    'Uruguay','Venezuela','Virgin Islands','Latin America'
  ]
  const oceania = [
    'American Samoa','Australia','Christmas Island','Cocos','Cook Islands','Fiji','French Polynesia','Guam',
    'Kiribati','Marshall','Micronesia','Nauru','New Caledonia','New Zealand','Niue','Norfolk','Northern Mariana',
    'Palau','Papua New Guinea','Pitcairn','Samoa','Solomon','Tokelau','Tonga','Tuvalu','Vanuatu','Wallis'
  ]

  if (africa.some(entry => name.includes(entry))) return 'Africa'
  if (europe.some(entry => name.includes(entry))) return 'Europe'
  if (americas.some(entry => name.includes(entry))) return 'Americas'
  if (oceania.some(entry => name.includes(entry))) return 'Oceania'
  return 'Asia & Pacific'
}

const ALL: Country[] = (getCountries() as CountryCode[])
  .map(iso2 => {
    const dialCode = getCountryCallingCode(iso2)
    const name = nameFor(iso2)
    return {
      iso2,
      name,
      dialCode,
      dial: `+${dialCode}`,
      flag: flagFor(iso2),
      region: regionFor(iso2, name)
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))

/** Pakistan first, then the rest of the priority list, then everything else. */
export const countries: Country[] = [
  ...PRIORITY.map(code => ALL.find(country => country.iso2 === code)).filter(
    (country): country is Country => Boolean(country)
  ),
  ...ALL.filter(country => !PRIORITY.includes(country.iso2))
]

export const countryByIso = new Map(countries.map(country => [country.iso2, country]))

export const countryNames = countries.map(country => country.name)

export const DEFAULT_COUNTRY_ISO = 'PK'

export function findCountry(iso2?: string | null): Country | undefined {
  if (!iso2) return undefined
  return countryByIso.get(iso2.toUpperCase() as CountryCode)
}

export function findCountryByName(name?: string | null): Country | undefined {
  if (!name) return undefined
  const needle = name.trim().toLowerCase()
  return countries.find(country => country.name.toLowerCase() === needle)
}

/** Countries grouped by region, for optgroup rendering. */
export function countriesByRegion(): { region: string; options: Country[] }[] {
  const groups = new Map<string, Country[]>()

  for (const country of countries) {
    const bucket = groups.get(country.region) ?? []
    bucket.push(country)
    groups.set(country.region, bucket)
  }

  return Array.from(groups.entries())
    .map(([region, options]) => ({ region, options }))
    .sort((a, b) => {
      if (a.region === 'Pakistan') return -1
      if (b.region === 'Pakistan') return 1
      return a.region.localeCompare(b.region)
    })
}

export function isValidCountryIso(iso2?: string | null) {
  return Boolean(findCountry(iso2))
}
