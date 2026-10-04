/**
 * Partnerships and MoU requests — the vocabulary shared by the public page, the
 * request API, the admin console and the test suite.
 *
 * One module so the process a university reads on /partnerships, the labels the
 * secretariat sees in /admin/partnerships and the checks `check-partnerships`
 * makes cannot drift apart.
 */

import { PARTNERSHIP_INTERESTS, PARTNERSHIP_STATUSES, PARTNERSHIP_TYPES } from '@/lib/validations'

export type PartnershipType = (typeof PARTNERSHIP_TYPES)[number]
export type PartnershipInterest = (typeof PARTNERSHIP_INTERESTS)[number]
export type PartnershipStatus = (typeof PARTNERSHIP_STATUSES)[number]

/**
 * Reference quoted in every piece of correspondence about a request.
 *
 * Shape matches the order references (`PYPC-ORD-…`) and the numbered letters in
 * the records register, so a reference is recognisable as PYPC's at a glance.
 */
export function makePartnershipReference() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  const stamp = Date.now().toString(36).toUpperCase().slice(-4)
  return `PYPC-MOU-${stamp}${random}`
}

export function isPartnershipStatus(value: unknown): value is PartnershipStatus {
  return typeof value === 'string' && (PARTNERSHIP_STATUSES as readonly string[]).includes(value)
}

/** Human wording for the status a request is in. */
export const PARTNERSHIP_STATUS_LABELS: Record<PartnershipStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  DECLINED: 'Not taken forward',
  WITHDRAWN: 'Withdrawn'
}

/**
 * What each status means, written for a university partner rather than for staff.
 * Used on the public page and quoted in the confirmation email.
 */
export const PARTNERSHIP_STATUS_MEANINGS: Record<PartnershipStatus, string> = {
  SUBMITTED: 'Received and queued for the secretariat. You will hear from us within ten working days.',
  UNDER_REVIEW:
    'The secretariat is checking scope, dates and the documents needed. We may come back with questions.',
  APPROVED: 'Agreed. The secretariat will send the MoU or chapter pack and countersign it with you.',
  DECLINED:
    'Not taken forward at this time — the reason is recorded, and you are welcome to submit again in a later cycle.',
  WITHDRAWN: 'Withdrawn at your request. No further action is taken on our side.'
}

/** What a partnership area means in practice — shown as the form's checkboxes. */
export const PARTNERSHIP_INTEREST_LABELS: Record<PartnershipInterest, string> = {
  STUDENT_CHAPTER: 'Campus chapter or student circle',
  MOU: 'Memorandum of Understanding',
  JOINT_EVENTS: 'Joint conferences, debates or Model UN sessions',
  RESEARCH: 'Research, policy briefs or publications',
  FACULTY_EXCHANGE: 'Faculty and speaker exchange',
  INTERNSHIPS: 'Internships and placements for your students',
  SCHOLARSHIPS: 'Scholarships or sponsored participation'
}

/** One line per area, for the cards on the public page. */
export const PARTNERSHIP_INTEREST_SUMMARIES: Record<PartnershipInterest, string> = {
  STUDENT_CHAPTER: 'A recognised PYPC circle on your campus, with a named faculty liaison and student office-bearers.',
  MOU: 'A countersigned agreement setting out what each side commits to, reviewable every year.',
  JOINT_EVENTS: 'Your students debate, chair and draft alongside delegations from across Pakistan and abroad.',
  RESEARCH: 'Co-authored policy briefs and evidence notes, credited to the institution and its authors.',
  FACULTY_EXCHANGE: 'Your faculty speak on PYPC platforms; our trainers run sessions for your students.',
  INTERNSHIPS: 'Structured placements in the secretariat, with a defined brief and written reference.',
  SCHOLARSHIPS: 'Sponsored seats so cost is not the reason a capable student stays away.'
}

/**
 * The MoU process, exactly as run. Five steps with a stated turnaround, because
 * "contact us to partner" without a process is the thing institutions complain
 * about most.
 */
export const MOU_PROCESS_STEPS: { title: string; detail: string; turnaround: string }[] = [
  {
    title: 'You submit the request',
    detail:
      'This form. It records the institution, the person accountable for the partnership, and what you want to do together. You receive a reference by email immediately.',
    turnaround: 'Same day'
  },
  {
    title: 'The secretariat reviews it',
    detail:
      'We check the fit against the current programme calendar, confirm the contact is authorised to speak for the institution, and ask for anything missing.',
    turnaround: 'Within 10 working days'
  },
  {
    title: 'Scope call',
    detail:
      'A 45-minute call with the Chief Executive or the programmes lead to agree activities, who coordinates on each side, dates and any costs. Minutes are shared afterwards.',
    turnaround: 'Within 2 weeks of review'
  },
  {
    title: 'Draft and countersign',
    detail:
      'For an MoU we send our standard agreement — our own template is at /records — for review by your office. Both sides countersign; the signed copy is filed and the reference is registered.',
    turnaround: 'Within 3 weeks of the call'
  },
  {
    title: 'Launch and review',
    detail:
      'The partnership is announced on the newsroom, a launch activity is scheduled, and the agreement is reviewed at twelve months against what was agreed.',
    turnaround: 'Per the agreed calendar'
  }
]

/**
 * Honesty rule for the public page: a partner appears only when an agreement is
 * countersigned. This constant exists so the page, the admin console and the
 * suite all state the same thing rather than inventing friendly-sounding logos.
 */
export const PARTNER_PUBLICATION_RULE =
  'An institution is named as a PYPC partner — on this page, on the newsroom or in the annual report — only once an agreement has been countersigned by both sides. Requests in progress are never published.'
