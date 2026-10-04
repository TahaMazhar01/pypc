/**
 * International participation content.
 *
 * Everything here is written from PYPC's real operating model: hybrid delivery,
 * USD pricing for international members, and scholarship places. Nothing claims
 * accreditation, partnerships or visa guarantees that the organisation has not
 * confirmed.
 */

export const internationalAudiences = [
  {
    title: 'International students',
    detail:
      'Undergraduate and postgraduate students outside Pakistan who want to join PYPC programmes, compete for conference seats and build a verifiable leadership record.'
  },
  {
    title: 'Diaspora youth',
    detail:
      'Young Pakistanis living abroad who want to stay connected to national policy conversations and contribute to Pakistan-focused research.'
  },
  {
    title: 'Partner universities',
    detail:
      'Institutions seeking a co-branded chapter, joint conferences, faculty exchange or jointly issued participation records.'
  },
  {
    title: 'Delegations & MUN societies',
    detail:
      'Model UN societies and debate unions that want to send delegations to IMUN 2027 and other PYPC convenings.'
  }
]

export const participationModes = [
  {
    mode: 'Online participation',
    icon: 'Globe2',
    detail:
      'Committee sessions, masterclasses and mentorship run online so learners join from any time zone. Recordings are shared with registered participants.',
    requirements: ['Stable internet connection', 'Laptop or desktop recommended', 'English working proficiency']
  },
  {
    mode: 'Hybrid participation',
    icon: 'UsersRound',
    detail:
      'Combines online preparation with an optional in-person component in Pakistan for those who can travel. Attendance is recorded for certification.',
    requirements: ['Online component compulsory', 'Travel fully self-funded unless a scholarship is awarded']
  },
  {
    mode: 'On-site in Pakistan',
    icon: 'Landmark',
    detail:
      'Conferences and institutional visits held in Islamabad and provincial capitals. International delegates receive an official invitation letter for visa purposes.',
    requirements: ['Valid passport', 'Visa and travel insurance are delegate responsibilities', 'Invitation letter issued on confirmed registration']
  }
]

export const internationalSteps = [
  {
    step: 'Create your account',
    detail: 'Register with your email address — no Pakistani documentation required for online participation.'
  },
  {
    step: 'Choose your participation',
    detail: 'Enrol free, or select a paid membership/course in USD through international card checkout.'
  },
  {
    step: 'Apply or register',
    detail: 'Apply to programmes and conferences from your dashboard. Scholarship places are marked on each listing.'
  },
  {
    step: 'Join and participate',
    detail: 'Attend committee sessions, masterclasses and mentorship. Attendance is recorded centrally.'
  },
  {
    step: 'Receive verified documentation',
    detail: 'Get a QR-verified certificate, participation letter or experience record that anyone can authenticate.'
  }
]

export const internationalSupport = [
  {
    title: 'Visa invitation letters',
    detail:
      'Registered international delegates for on-site events receive a formal invitation letter on PYPC letterhead, which can be submitted with visa applications. Issuing a letter does not guarantee a visa — that decision rests with the relevant authority.'
  },
  {
    title: 'English-language delivery',
    detail:
      'All PYPC programmes, conferences and certificates are delivered and issued in English so records are portable across systems.'
  },
  {
    title: 'Time-zone scheduling',
    detail:
      'Live sessions for international cohorts are scheduled with a published UTC schedule, and every session is recorded for asynchronous participation.'
  },
  {
    title: 'Academic recognition support',
    detail:
      'On request, PYPC issues participation letters stating session hours and learning outcomes to support credit transfer or internship requirements at your home institution. Recognition decisions remain with your university.'
  },
  {
    title: 'Research collaboration',
    detail:
      'International students can join the PYPC research desk, co-author policy briefs on climate, AI governance and justice reform, and use the published work in academic applications.'
  },
  {
    title: 'Scholarship places',
    detail:
      'For IMUN 2027, approximately 30–40% of delegate places are planned to be supported through scholarships, with a defined application route for international and low-income applicants.'
  }
]

export const internationalFaqs = [
  {
    question: 'Do I need to be a Pakistani citizen to join PYPC?',
    answer:
      'No. Online programmes, courses and conferences are open to participants of any nationality. Only on-site activities in Pakistan involve visa and travel requirements, which remain the participant\u2019s responsibility.'
  },
  {
    question: 'How do I pay from outside Pakistan?',
    answer:
      'International card payments are processed through Stripe in USD. JazzCash and Easypaisa are available only to members with Pakistani mobile wallets. A gateway appears at checkout only when it has been activated by the organisation.'
  },
  {
    question: 'Is the certificate recognised by my university?',
    answer:
      'PYPC issues QR-verified certificates and, on request, participation letters stating hours and outcomes. Whether your institution grants credit is your university\u2019s decision — PYPC provides the documentation, not the accreditation.'
  },
  {
    question: 'Are there scholarships for international students?',
    answer:
      'Scholarship places are announced per programme. IMUN 2027 plans to support approximately 30–40% of delegate places. Applications are assessed on merit and need, using the same form as standard applications.'
  },
  {
    question: 'Can my university partner with PYPC?',
    answer:
      'Yes. PYPC uses a formal Memorandum of Understanding for institutional collaboration covering co-branded programmes, faculty participation, joint certificates and student chapters. Start through the Partnerships page.'
  },
  {
    question: 'Is travel or accommodation included?',
    answer:
      'Unless a specific listing states otherwise, international delegates fund their own travel, accommodation and insurance. Where a scholarship is awarded, the covered components are stated in writing in the award letter.'
  }
]

export const globalRegions = [
  { region: 'South Asia', note: 'Bangladesh, India, Nepal, Sri Lanka, Maldives' },
  { region: 'Middle East & Gulf', note: 'UAE, Saudi Arabia, Qatar, Oman, Bahrain, Kuwait' },
  { region: 'Southeast Asia', note: 'Malaysia, Indonesia, Thailand, Vietnam, Philippines' },
  { region: 'Central Asia', note: 'Kazakhstan, Uzbekistan, Kyrgyzstan, Tajikistan' },
  { region: 'Africa', note: 'Nigeria, Kenya, Egypt, South Africa, Ghana' },
  { region: 'Europe', note: 'United Kingdom, Germany, Türkiye, and the wider region' },
  { region: 'North America', note: 'United States and Canada' },
  { region: 'Oceania', note: 'Australia and New Zealand' }
]
