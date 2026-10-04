/**
 * Real institutional correspondence and milestones on the PYPC record.
 *
 * These replace generic "testimonials": instead of invented quotes from
 * invented people, the platform presents the organisation's actual documented
 * correspondence with reference numbers, dates and recipients, each with the
 * source document downloadable from /documents.
 *
 * Everything below is drawn from the official PDFs supplied by PYPC.
 */

export type CorrespondenceRecord = {
  id: string
  reference: string
  date: string
  title: string
  recipient: string
  subject: string
  summary: string
  document: string
  category: 'Institutional outreach' | 'Governance & legal' | 'Programmes'
  status: 'Formal request submitted' | 'Under review' | 'Template in use'
}

export const correspondenceRecords: CorrespondenceRecord[] = [
  {
    id: 'ndu-visit',
    reference: 'PYPC/NDU/EDU-VISIT/2026/001',
    date: '27 September 2026',
    title: 'Educational visit — National Defence University',
    recipient: 'Lt Gen Babar Iftikhar, HI(M), President & Patron-in-Chief, NDU (through the Registrar)',
    subject: 'Request for permission for an educational visit of youth leaders',
    summary:
      'Formal request seeking patronage and permission for a youth leadership visit to the National Defence University, Islamabad — an initiative aimed at institutional literacy for young Pakistanis.',
    document: '/documents/PYPC_NDU_Visit_Permission_Letter.pdf',
    category: 'Institutional outreach',
    status: 'Formal request submitted'
  },
  {
    id: 'ndu-webinar',
    reference: 'PYPC/NDU/WEBINAR/2026/001',
    date: '27 September 2026',
    title: 'Collaborative webinar — National Defence University',
    recipient: 'Lt Gen Babar Iftikhar, HI(M), President & Patron-in-Chief, NDU (through the Registrar)',
    subject: 'Request for permission to arrange a collaborative academic webinar',
    summary:
      'Proposal for a joint academic webinar between NDU and PYPC covering democratic institutions, rule of law and national security literacy for youth participants.',
    document: '/documents/PYPC_NDU_Webinar_Request_Letter.pdf',
    category: 'Institutional outreach',
    status: 'Under review'
  },
  {
    id: 'senate-visit',
    reference: 'PYPC/SEN/EDU-VISIT/2026/001',
    date: '27 September 2026',
    title: 'Educational visit — Gali-e-Dastoor & Senate Museum',
    recipient: 'Hon. Syedaal Khan Nasir, Deputy Chairman of the Senate of Pakistan, Parliament House',
    subject: 'Opening the doors of democracy to Pakistan\u2019s youth',
    summary:
      'Request for youth visits to Constitution Lane (Gali-e-Dastoor) and the Senate Museum, so participants experience parliamentary institutions first-hand rather than only in simulation.',
    document: '/documents/PYPC_Visit_Permission_Letter_Deputy_Chairman_Senate.pdf',
    category: 'Institutional outreach',
    status: 'Formal request submitted'
  },
  {
    id: 'mou',
    reference: 'PYPC/LEG/MOU/2026',
    date: 'Version 1.0 · 2026',
    title: 'Partnership / collaboration MoU framework',
    recipient: 'Universities, institutions and partner organisations',
    subject: 'Professional governance & institutional collaboration',
    summary:
      'The standing agreement framework PYPC uses for institutional partnerships: scope, obligations, certificate co-branding, data protection, governing law and dispute resolution under the laws of Pakistan.',
    document: '/documents/PYPC_Memorandum_of_Understanding_Perfect.pdf',
    category: 'Governance & legal',
    status: 'Template in use'
  },
  {
    id: 'imun-2027',
    reference: 'PYPC/IMUN/2027/CN-01',
    date: 'Concept note · 2026',
    title: 'IMUN 2027 — international conference concept note',
    recipient: 'Sponsors, partners and participating institutions',
    subject: 'A global youth diplomacy, leadership, climate action & cultural exchange platform',
    summary:
      'Planning document for a three-day international Model United Nations in Islamabad with participation targeted from 50+ countries, climate diplomacy as the central theme, and 30–40% of places planned for scholarship support.',
    document: '/documents/IMUN_2027_Concept_Note_Redesigned.pdf',
    category: 'Programmes',
    status: 'Under review'
  },
  {
    id: 'undertaking',
    reference: 'PYPC/HR/UND/2026',
    date: 'Fillable template · 2026',
    title: 'Employee & volunteer undertaking declaration',
    recipient: 'Team members, volunteers and programme facilitators',
    subject: 'Code of conduct, confidentiality and conflict-of-interest declaration',
    summary:
      'The declaration every person acting for PYPC signs before representing the organisation — covering conduct, confidentiality, non-partisanship, data protection and conflict of interest.',
    document: '/documents/PYPC_Employee_Undertaking_Declaration_No_Witness_Fillable.pdf',
    category: 'Governance & legal',
    status: 'Template in use'
  }
]

export const milestones = [
  { label: 'National secretariat', detail: 'Islamabad, Pakistan' },
  { label: 'Formal correspondence on record', detail: '6 documented instruments' },
  { label: 'Institutions engaged', detail: 'National Defence University · Senate of Pakistan' },
  { label: 'International conference', detail: 'IMUN 2027 · 50+ countries targeted' }
]
