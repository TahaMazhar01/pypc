/** Normalise displayed copy while preserving stored values and link targets. */
export function displayContent<T>(value: T): T {
  if (typeof value === 'string') return cleanDisplayText(value) as T
  if (Array.isArray(value)) return value.map(item => displayContent(item)) as T
  return value
}

export function cleanDisplayText(value: string): string {
  if (/^\s*[\p{Dash_Punctuation}\u2212]+\s*$/u.test(value)) return 'Not available'
  return value
    .replace(/(\d)\s*[\u2012\u2013\u2014]\s*(?=\d)/g, '$1 to ')
    .replace(/\s+[\u2013\u2014]\s+/g, ', ')
    .replace(/[\p{Dash_Punctuation}\u2212\u00ad]/gu, ' ')
}
