/**
 * Calendar export for PYPC events.
 *
 * One event, three routes out: a downloadable `.ics` file that works in Apple
 * Calendar, Outlook, Thunderbird and Google Calendar, plus the two "add to"
 * links that web calendars accept without a file. Both are built from the same
 * normalised event, so a date correction propagates everywhere.
 *
 * The generated ICS follows RFC 5545 closely enough for every major client:
 * CRLF line endings, 75-octet line folding, escaped text, UTC timestamps with a
 * `Z` suffix so no client has to guess a time zone.
 */

export type CalendarEvent = {
  /** Stable identifier used as the UID; must not change between exports. */
  uid: string
  title: string
  description?: string | null
  location?: string | null
  start: Date
  end: Date
  url?: string | null
  /** Organiser mailbox shown by the client. */
  organiserEmail?: string
  organiserName?: string
}

/** Fold a content line to 75 octets, as the specification requires. */
function fold(line: string) {
  if (line.length <= 75) return line

  const chunks: string[] = []
  let rest = line
  chunks.push(rest.slice(0, 75))
  rest = rest.slice(75)

  while (rest.length > 0) {
    chunks.push(` ${rest.slice(0, 74)}`)
    rest = rest.slice(74)
  }

  return chunks.join('\r\n')
}

/** RFC 5545 text escaping. */
function escapeText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function buildIcs(event: CalendarEvent): string {
  const now = stamp(new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pakistan Youth Parliamentary Council//PYPC Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${stamp(event.start)}`,
    `DTEND:${stamp(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
    event.location ? `LOCATION:${escapeText(event.location)}` : '',
    event.url ? `URL:${escapeText(event.url)}` : '',
    event.organiserEmail
      ? `ORGANIZER;CN=${escapeText(event.organiserName ?? 'PYPC Secretariat')}:mailto:${event.organiserEmail}`
      : '',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder — PYPC event tomorrow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean)

  // Folded, CRLF-joined, with a trailing CRLF as the specification requires.
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** Google Calendar template link. */
export function googleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(event.start)}/${stamp(event.end)}`,
    details: event.description ?? '',
    location: event.location ?? '',
    ctz: 'Asia/Karachi'
  })
  if (event.url) params.set('sprop', `website:${event.url}`)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Outlook Web template link. */
export function outlookCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: event.start.toISOString(),
    enddt: event.end.toISOString(),
    body: event.description ?? '',
    location: event.location ?? ''
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

export function downloadIcsUrl(slug: string) {
  return `/api/events/${encodeURIComponent(slug)}/ics`
}
