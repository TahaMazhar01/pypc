'use client'


import { displayContent } from '@/lib/display-content'
import { useEffect, useState } from 'react'
import { Clock, Globe2, Video } from 'lucide-react'

type Session = {
  label: string
  /** Pakistan Standard Time (UTC+5) session start, 24-hour. */
  pktHour: number
  pktMinute?: number
  weekday: string
  track: string
}

/**
 * Published session schedule with the visitor's own local time.
 *
 * Public timetables quote Pakistan Standard Time (UTC+5), which is confusing for
 * international participants — this panel converts the fixed schedule into the
 * viewer's timezone in the browser, so nobody has to do the arithmetic.
 */
const SESSIONS: Session[] = [
  { label: 'Diplomacy masterclass', weekday: 'Tuesday', pktHour: 18, track: 'IMUN preparation' },
  { label: 'Committee simulation clinic', weekday: 'Thursday', pktHour: 19, track: 'IMUN preparation' },
  { label: 'Policy research lab', weekday: 'Saturday', pktHour: 16, track: 'Research desk' },
  { label: 'Open office hours (mentors)', weekday: 'Saturday', pktHour: 20, track: 'Member support' }
]

export function TimezonePanel() {
  const [zone, setZone] = useState<string>('')
  const [now, setNow] = useState<string>('')

  useEffect(() => {
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time')

    function tick() {
      setNow(
        new Intl.DateTimeFormat(undefined, {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        }).format(new Date())
      )
    }

    tick()
    const interval = window.setInterval(tick, 30000)
    return () => window.clearInterval(interval)
  }, [])

  function localTime(session: Session) {
    // Build the session in PKT (UTC+5) for the current week, then render it in
    // the visitor's own timezone.
    const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
      .format(new Date())
      .split('-')

    const base = new Date(`${year}-${month}-${day}T00:00:00+05:00`)
    const target = session.weekday
    const weekdayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(
      target
    )

    const current = base.getDay()
    let delta = weekdayIndex - current
    if (delta < 0) delta += 7

    const sessionDate = new Date(base)
    sessionDate.setDate(base.getDate() + delta)
    sessionDate.setHours(session.pktHour, session.pktMinute ?? 0, 0, 0)

    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(sessionDate)
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold-700">
            <Clock size={14} /> Published session schedule
          </p>
          <h3 className="mt-2 text-lg font-extrabold text-primary-900">Live sessions in your own time zone</h3>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-right">
          <p className="flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            <Globe2 size={12} /> {displayContent(zone || 'Detecting…')}
          </p>
          <p className="font-mono text-sm font-bold text-primary">{displayContent(now || '—')}</p>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-slate-100">
        {SESSIONS.map(session => (
          <li key={session.label} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800">{displayContent(session.label)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {displayContent(session.track)} · {displayContent(session.weekday)} at {displayContent(String(session.pktHour).padStart(2, '0'))}:
                {displayContent(String(session.pktMinute ?? 0).padStart(2, '0'))} PKT
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 font-mono text-xs font-bold text-primary">
              <Video size={13} /> {displayContent(localTime(session))}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-6 text-slate-500">
        Base schedule is fixed in Pakistan Standard Time (UTC+5). Sessions are recorded, so asynchronous
        participants can follow the same material. Times shown above are computed by your browser.
      </p>
    </div>
  )
}
