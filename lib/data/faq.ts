import { CONTACT_EMAIL } from '@/lib/constants'
export type FaqItem = {
  question: string
  answer: string
  category: 'Membership' | 'Programmes' | 'Certificates' | 'Payments' | 'Platform'
}

export const faqs: FaqItem[] = [
  {
    category: 'Membership',
    question: 'Who can become a PYPC member?',
    answer:
      'Membership is open to young people in Pakistan and the Pakistani diaspora. Associate membership is aimed at students and first-time participants, Executive membership at those already active in committees, chapters and programme delivery, and Institutional partnership at universities, colleges and organisations. Competitive fellowships and delegations have additional age and eligibility criteria stated on each listing.'
  },
  {
    category: 'Membership',
    question: 'Does membership guarantee selection to a programme or fellowship?',
    answer:
      'No. Membership provides access, eligibility and a verifiable participation record, but selection remains merit-based and competitive. Every programme and fellowship states its own criteria and review process.'
  },
  {
    category: 'Membership',
    question: 'How long does membership last?',
    answer:
      'Membership plans run for twelve months from the date payment is confirmed. You can renew from the dashboard before expiry, and your certificates remain verifiable permanently.'
  },
  {
    category: 'Programmes',
    question: 'Are programmes online or in person?',
    answer:
      'Programmes are delivered in hybrid mode by default, combining live online sessions with in-person convenings where feasible. Each programme page states its mode, duration and expected commitment.'
  },
  {
    category: 'Programmes',
    question: 'How much time do I need each week?',
    answer:
      'Most programmes require three to five hours per week including live sessions, assignments and reading. Fellowships require more. The commitment is stated on each programme page so you can plan realistically.'
  },
  {
    category: 'Programmes',
    question: 'Can I participate in more than one programme?',
    answer:
      'Yes, provided the schedules do not clash and you can meet the requirements of each. Members commonly start with a pillar programme and later apply to a fellowship.'
  },
  {
    category: 'Certificates',
    question: 'How do I know a PYPC certificate is genuine?',
    answer:
      'Every certificate carries a unique code in the format PYPC-XXXX-XXXX-XXXX and a QR code. Enter the code on the Verify page or scan the QR — the live record shows the recipient name, certificate title, issuing programme or event, issue date and current status.'
  },
  {
    category: 'Certificates',
    question: 'What do the statuses Valid, Expired and Revoked mean?',
    answer:
      'Valid means the certificate was issued by PYPC and remains in force. Expired means the validity period stated on the certificate has passed. Revoked means PYPC has withdrawn the certificate — typically because it was issued in error, information was falsified, or the Code of Conduct was breached.'
  },
  {
    category: 'Certificates',
    question: 'Can I download my certificate as a PDF?',
    answer:
      'Yes. Certificates issued to your account are listed in Dashboard → Certificates with a PDF download that includes the QR code and verification link. You can also print directly from the certificate view.'
  },
  {
    category: 'Payments',
    question: 'Which payment methods are accepted?',
    answer:
      'JazzCash and Easypaisa for members in Pakistan, and international cards through Stripe. Each gateway must be activated for the platform; while a gateway is pending activation it appears disabled at checkout instead of failing after you enter details.'
  },
  {
    category: 'Payments',
    question: 'When is my membership activated?',
    answer:
      'Membership activates automatically as soon as the payment provider confirms the transaction. You receive an in-app notification, and the membership appears as active in your dashboard with its expiry date.'
  },
  {
    category: 'Payments',
    question: 'Can I get a refund?',
    answer:
      'Yes, within the limits set out in the Refund Policy — for example, a full refund within 7 days of activation if no certificate has been issued. Full details, including processing times, are on the Refund Policy page.'
  },
  {
    category: 'Platform',
    question: 'How is my data protected?',
    answer:
      'Passwords are stored as one-way bcrypt hashes, sessions use signed HTTP-only cookies, and administrative actions are recorded in an audit log with actor and IP address. Personal contact details are never shown on the public verification page.'
  },
  {
    category: 'Platform',
    question: 'I forgot my password. What should I do?',
    answer:
      `Use the password reset link on the sign-in page, or contact ${CONTACT_EMAIL} from your registered email address. Changing your password signs you out of all other devices automatically.`
  },
  {
    category: 'Platform',
    question: 'What is the AI Assistant and can I trust its answers?',
    answer:
      'The AI Assistant answers only from PYPC-approved information stored in the platform knowledge base. It will not invent fees, dates or policies. For anything it cannot answer, it directs your question to the secretariat and flags it for a human response.'
  }
]

export const faqCategories = Array.from(new Set(faqs.map(item => item.category)))
