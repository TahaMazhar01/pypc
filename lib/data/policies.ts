import { CONTACT_EMAIL } from '@/lib/constants'
/**
 * Policy content used by /privacy, /terms, /refund-policy, /cookies and /code-of-conduct.
 * Edit the text here — the pages render automatically, so the secretariat can
 * update wording without touching components.
 *
 * NOTE FOR THE ORGANISATION: these are standard, plain-language drafts. Have
 * them reviewed by PYPC's legal advisor and confirm the governing-law and
 * jurisdiction wording before public launch.
 */

export type PolicySection = {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export type PolicyDocument = {
  slug: string
  title: string
  summary: string
  lastUpdated: string
  sections: PolicySection[]
}

const LAST_UPDATED = 'September 2026'

export const policies: Record<string, PolicyDocument> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary:
      'How the Pakistan Youth Parliamentary Council collects, uses, protects and retains personal information submitted through this platform.',
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: '1. Information we collect',
        paragraphs: [
          'We collect only the information needed to operate membership, programmes, events, payments and certification.'
        ],
        bullets: [
          'Identity and contact data: name, email address, mobile number, city, province.',
          'Profile data you choose to provide: institution, field of study, profession, biography.',
          'Participation data: applications, event registrations, attendance and programme outcomes.',
          'Payment metadata: order reference, amount, currency, gateway transaction identifier and status. We never receive or store your card number, wallet PIN or full wallet credentials.',
          'Technical data: sign-in timestamps, IP address recorded against administrative actions in the audit log.'
        ]
      },
      {
        heading: '2. How we use information',
        bullets: [
          'To create and administer your member account and membership.',
          'To assess applications and deliver programmes, events and fellowships.',
          'To issue, verify and, where necessary, revoke certificates and participation records.',
          'To process payments and reconcile them with the relevant payment provider.',
          'To send service messages about your account, applications and certificates.',
          'To maintain security and investigate misuse of the platform.'
        ]
      },
      {
        heading: '3. Certificates and public verification',
        paragraphs: [
          'Certificate verification is intentionally public. When someone verifies a certificate code, the verification page displays the recipient name, certificate title, issuing programme or event, issue date and current status (Valid, Expired or Revoked). It never displays your email address, mobile number, CNIC or payment information.',
          'Verification requests are counted and the most recent verification time is stored so we can detect abnormal verification patterns. Individual verifier identities are not published.'
        ]
      },
      {
        heading: '4. Payments',
        paragraphs: [
          'Payments are processed by third-party providers (Stripe for international cards, JazzCash and Easypaisa for Pakistan). When you pay, you are redirected to the provider&apos;s own secure environment. We receive only a confirmation and a transaction reference.',
          'We keep order records for accounting, dispute handling and audit purposes.'
        ]
      },
      {
        heading: '5. Sharing',
        paragraphs: [
          'We do not sell personal data. Information is shared only with payment providers to process your transaction, with service providers who host or operate the platform on our instructions, and with authorities where we are legally required to do so.'
        ]
      },
      {
        heading: '6. Security',
        bullets: [
          'Passwords are stored as one-way bcrypt hashes — they are never readable by staff.',
          'Sessions use signed, HTTP-only cookies and are invalidated when your password changes.',
          'Administrative actions are recorded in an audit log with actor, action, timestamp and IP address.',
          'Access to member data inside the admin panel is limited by role.'
        ]
      },
      {
        heading: '7. Retention',
        paragraphs: [
          'Account and participation records are retained while your membership is active and afterwards only as long as needed for certification integrity, accounting and legal obligations. Certificate verification records are retained permanently so that issued certificates remain verifiable; you may request that your name be minimised on a certificate only where the issuing programme allows it.'
        ]
      },
      {
        heading: '8. Your rights',
        bullets: [
          'Request a copy of the personal data we hold about you.',
          'Request correction of inaccurate profile information (you can also edit most fields yourself in the dashboard).',
          'Request deletion of your account, subject to records we must keep for certification and accounting integrity.',
          'Withdraw consent for optional communications at any time.'
        ]
      },
      {
        heading: '9. Contact',
        paragraphs: [
          `Privacy questions and requests can be sent to ${CONTACT_EMAIL} or submitted through the Contact page. We respond within a reasonable period and will confirm identity before disclosing or deleting data.`
        ]
      }
    ]
  },

  terms: {
    slug: 'terms',
    title: 'Terms of Use',
    summary:
      'The rules that govern your use of the PYPC platform, membership, programmes, events and certificate verification service.',
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: '1. Acceptance',
        paragraphs: [
          'By creating an account, purchasing membership, applying to a programme or using the certificate verification service, you accept these Terms of Use together with the Privacy Policy, Code of Conduct and Refund Policy.'
        ]
      },
      {
        heading: '2. Eligibility and accurate information',
        paragraphs: [
          'You must provide accurate, current information when registering and when submitting applications. Certificates are issued on the basis of the information you supply. Misrepresentation, impersonation or submission of another person&apos;s details may result in cancellation of membership and revocation of certificates.'
        ]
      },
      {
        heading: '3. Membership',
        bullets: [
          'Membership is personal, non-transferable and valid for the period stated on the plan.',
          'Membership fees support programme delivery, mentorship, platform operation and certification. Membership does not guarantee selection to any competitive programme, fellowship, delegation or paid opportunity.',
          'PYPC may suspend an account for conduct that breaches the Code of Conduct or these Terms.'
        ]
      },
      {
        heading: '4. Programmes, events and opportunities',
        paragraphs: [
          'Programme dates, formats, venues and facilitators may change for reasons outside our control. Where a programme is materially changed or cancelled by PYPC, affected participants are informed and offered a transfer to the next cohort or a refund in line with the Refund Policy.',
          'Opportunities published on this platform may be offered by PYPC or by third parties. Where an opportunity is offered by a third party, that organisation&apos;s own terms and selection process apply.'
        ]
      },
      {
        heading: '5. Certificates and verification',
        bullets: [
          'Certificates are issued only after the stated participation, assessment or attendance requirement is met.',
          'Certificates carry a unique code and QR reference; verification results are publicly visible.',
          'PYPC may revoke a certificate where it was issued in error, or where information was falsified or the Code of Conduct was breached. Revoked certificates display a revoked status on the verification page with the reason recorded internally.',
          'Altering, duplicating or misrepresenting a PYPC certificate is prohibited.'
        ]
      },
      {
        heading: '6. Payments',
        paragraphs: [
          'Payments are made in PKR or USD through the gateways shown at checkout. Membership is activated after the provider confirms the payment. Where a payment is confirmed but membership is not activated, contact us with your order reference and it will be resolved.'
        ]
      },
      {
        heading: '7. Acceptable use',
        bullets: [
          'Do not attempt to access accounts, data or administrative functions you are not authorised to use.',
          'Do not scrape, bulk-download or misrepresent verification data.',
          'Do not use the platform to harass, defame, threaten or discriminate.',
          'Do not upload malware or attempt to disrupt the service.'
        ]
      },
      {
        heading: '8. Intellectual property',
        paragraphs: [
          'Platform content, programme materials, branding and the PYPC name and emblem are the property of the organisation or its licensors and may not be used commercially without written permission. Research or work you independently produce remains yours, subject to any programme-specific agreement you accept.'
        ]
      },
      {
        heading: '9. Limitation of liability',
        paragraphs: [
          'The platform is provided on a reasonable-effort basis. To the extent permitted by law, PYPC is not liable for indirect or consequential loss arising from use of the platform, third-party gateway downtime, or reliance on information published for general guidance. Nothing in these Terms excludes liability that cannot be excluded by law.'
        ]
      },
      {
        heading: '10. Changes and governing law',
        paragraphs: [
          'These Terms may be updated; material changes will be notified in the member dashboard. Continued use after an update constitutes acceptance. These Terms are governed by the laws of the Islamic Republic of Pakistan, and disputes are subject to the jurisdiction of the competent courts.',
          'These Terms should be reviewed by PYPC&apos;s legal advisor before public launch, particularly the governing-law and jurisdiction clauses.'
        ]
      }
    ]
  },

  'refund-policy': {
    slug: 'refund-policy',
    title: 'Refund Policy',
    summary:
      'When and how membership fees and programme fees are refunded, and how to raise a refund request.',
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: '1. Before your membership activates',
        paragraphs: [
          'If you are charged and your membership does not activate, you are entitled to a full refund or activation, at your choice. Report it within 7 days with your order reference so it can be traced with the payment provider.'
        ]
      },
      {
        heading: '2. Membership (12-month plans)',
        bullets: [
          'Within 7 days of activation: full refund, provided no certificate has been issued and no paid programme seat has been reserved for you.',
          'Between 8 and 30 days of activation: 50% refund, provided no certificate has been issued.',
          'After 30 days: refunds are not normally available, because membership costs are committed to programme delivery and platform services.',
          'Where a certificate or verified experience letter has already been issued, fees are non-refundable, since the record has entered the public verification system.'
        ]
      },
      {
        heading: '3. Paid programmes and events',
        bullets: [
          'More than 14 days before the start date: full refund minus any non-recoverable gateway charges.',
          '14 days or fewer before the start date: 50% refund.',
          'After the programme or event has started: no refund, except where PYPC cancels or materially changes the activity.',
          'If PYPC cancels an activity, you may choose a full refund or a transfer to the next cohort.'
        ]
      },
      {
        heading: '4. Duplicate or incorrect charges',
        paragraphs: [
          'Duplicate or incorrect charges are refunded in full once verified with the payment provider. Please include the order reference, date, amount and the last four digits of the transaction identifier in your request.'
        ]
      },
      {
        heading: '5. How to request a refund',
        bullets: [
          `Submit a request from Dashboard → Support, or email ${CONTACT_EMAIL} with your order reference.`,
          'Include the reason for the request and the payment method used.',
          'Requests are acknowledged within 2 working days and decided within 7 working days.'
        ]
      },
      {
        heading: '6. Processing time',
        paragraphs: [
          'Approved refunds are processed to the original payment method. Card refunds typically appear within 5–10 working days, and mobile wallet refunds within 3–7 working days, depending on the provider. Gateway charges that the provider does not return are deducted where applicable and will be stated in your refund confirmation.'
        ]
      }
    ]
  },

  cookies: {
    slug: 'cookies',
    title: 'Cookie Policy',
    summary:
      'Every cookie and browser-storage entry this platform sets, why it exists, how long it lasts, and how to refuse the optional ones.',
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: '1. What this policy covers',
        paragraphs: [
          'This policy explains the cookies and browser storage entries used on the Pakistan Youth Parliamentary Council platform, what each one does, how long it stays on your device, and how you can control them. It sits alongside the Privacy Policy, which explains how personal information is processed more broadly.'
        ]
      },
      {
        heading: '2. Strictly necessary storage (always active)',
        paragraphs: [
          'These entries are required for the platform to function. They cannot be switched off through a consent banner because the site cannot operate safely without them.'
        ],
        bullets: [
          'Session cookie (pypc_session) — keeps you signed in after you authenticate. It is httpOnly, sent only over HTTPS in production, and expires when the session ends or after its stated lifetime. Removing it simply signs you out.',
          'Theme preference (pypc-theme) — remembers whether you chose Light, Dark or System, so the page does not flash the wrong colours on each visit. It stores only the words light, dark or system.',
          'CSRF and redirect guards — request-scoped values that stop another website from submitting forms on your behalf, including the payment callback routes.',
          'Rate-limit counters — stored server-side, not in your browser, to protect sign-in, registration, contact and assistant endpoints from abuse.'
        ]
      },
      {
        heading: '3. Optional analytics (off until enabled)',
        paragraphs: [
          'The platform ships with Google Analytics 4 and Microsoft Clarity integration, but neither script is loaded unless the organisation configures the corresponding environment value. On this deployment they are disabled, so no analytics cookie is set and no visitor data leaves the site.',
          'When the organisation enables analytics, this section will name the exact cookie names, the retention period and the provider. Visitors will be able to decline analytics without losing any part of the platform: sign-in, membership, certificates and forms all continue to work.'
        ]
      },
      {
        heading: '4. What we deliberately do not use',
        bullets: [
          'No advertising or re-targeting cookies, and no third-party advertising pixels.',
          'No cross-site tracking of any kind.',
          'No third-party CAPTCHA cookie — the form human check is issued and verified by our own server.',
          'No fingerprinting scripts or session-recording tools beyond the optional Clarity configuration described above.'
        ]
      },
      {
        heading: '5. Third-party content',
        paragraphs: [
          'Payment pages are hosted by the payment provider (for example Stripe, JazzCash or Easypaisa) and are governed by that provider’s own cookie policy. We never receive or store card or wallet credentials. Where a page embeds third-party content, this section will name the provider before the embed is added.'
        ]
      },
      {
        heading: '6. How to control or delete cookies',
        paragraphs: [
          'Every major browser lets you view, block and delete cookies from its settings; the help pages for Chrome, Safari, Firefox and Edge explain the exact steps for that browser. Blocking strictly necessary storage will prevent sign-in and checkout from working, but the public pages — programmes, events, newsroom, policies and certificate verification — remain fully usable without any cookie at all.'
        ]
      },
      {
        heading: '7. Questions',
        paragraphs: [
          'Questions about this policy, or a request to know what is stored on your device, can be sent to the secretariat mailbox published on the contact page. We answer within one working day in office hours, Monday to Saturday, 10:00 to 18:00 PKT.'
        ]
      }
    ]
  },

  'code-of-conduct': {
    slug: 'code-of-conduct',
    title: 'Code of Conduct',
    summary:
      'The standards of behaviour expected of PYPC members, participants, volunteers, mentors and staff in all PYPC spaces.',
    lastUpdated: LAST_UPDATED,
    sections: [
      {
        heading: '1. Principles',
        paragraphs: [
          'PYPC is a non-partisan platform for constructive youth participation. All members are expected to act with integrity, respect, honesty and responsibility — in physical venues, in online sessions and on the platform itself.'
        ]
      },
      {
        heading: '2. Expected behaviour',
        bullets: [
          'Treat every participant with dignity regardless of gender, province, language, ethnicity, religion, disability or socio-economic background.',
          'Debate ideas, not persons. Disagreement is welcome; disrespect is not.',
          'Respect the rules of procedure during simulations, committees and debates.',
          'Represent your credentials honestly and do not misstate your role, title or affiliation with PYPC.',
          'Protect the confidentiality of internal discussions, personal data and any sensitive information shared during programmes.',
          'Follow the lawful instructions of facilitators and secretariat staff during activities.'
        ]
      },
      {
        heading: '3. Prohibited behaviour',
        bullets: [
          'Harassment, bullying, intimidation, stalking or unwanted physical contact.',
          'Discriminatory or hateful language or conduct.',
          'Sexual harassment or exploitation in any form.',
          'Fraud, forgery, plagiarism, impersonation or misrepresentation of participation.',
          'Substance abuse, or attending PYPC activities under the influence.',
          'Using PYPC platforms or events for partisan campaigning, commercial solicitation or personal political promotion.',
          'Retaliation against anyone who reports a concern in good faith.'
        ]
      },
      {
        heading: '4. Political neutrality',
        paragraphs: [
          'PYPC does not endorse political parties or candidates. Members participating in PYPC activities do so in a personal, non-partisan capacity and must not present PYPC affiliation as support for any party, candidate or campaign.'
        ]
      },
      {
        heading: '5. Reporting a concern',
        paragraphs: [
          `Concerns may be reported to the secretariat through Dashboard → Support, by email to ${CONTACT_EMAIL}, or to any facilitator or staff member. Reports are handled confidentially and only shared with those who need to know in order to respond.`,
          'Where a concern relates to a criminal offence or immediate risk of harm, please also contact the relevant authorities.'
        ]
      },
      {
        heading: '6. Consequences',
        bullets: [
          'Informal resolution: a documented conversation and clear expectations, for minor or first-time issues.',
          'Formal warning: recorded on the member file.',
          'Suspension: temporary removal from programmes, events and platform access.',
          'Termination of membership and revocation of certificates, for serious or repeated breaches or for falsified records.'
        ]
      },
      {
        heading: '7. Safeguarding',
        paragraphs: [
          'Some PYPC activities include participants under 18. For those activities, consent from a parent or guardian is required, and no one-to-one unsupervised contact between an adult and a minor participant is permitted. Any safeguarding concern must be reported immediately to the secretariat.'
        ]
      }
    ]
  }
}

export const policySlugs = Object.keys(policies)
