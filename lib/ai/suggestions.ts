/**
 * Client-safe question lists for the assistant widget, per language.
 *
 * Kept separate from lib/ai/assistant.ts (server-only) so the component never
 * pulls server modules — or the Prisma client — into the browser bundle.
 */

import type { AssistantLanguage } from './language'

export type LanguageCopy = {
  label: string
  code: string
  /** Direction for the message bubbles. */
  rtl: boolean
  greeting: string
  placeholder: string
  suggestions: string[]
  /** Shown while the assistant is fetching an answer. */
  thinking: string
  /** Small print under the input. */
  note: string
  /** Chip row labels. */
  quickActions: { label: string; href: string; prompt: string }[]
  errorMessage: string
  /** Buttons and labels. */
  openLabel: string
  closeLabel: string
  sendLabel: string
  /** Badge shown when the answer used live database values. */
  liveBadge: string
  /** Badge shown for a knowledge-base answer. */
  knowledgeBadge: string
  /** Badge shown for a model-generated answer. */
  modelBadge: string
}

export const ASSISTANT_COPY: Record<AssistantLanguage, LanguageCopy> = {
  en: {
    label: 'English',
    code: 'EN',
    rtl: false,
    greeting:
      'Assalam-o-Alaikum! I am the PYPC AI Assistant. Ask me in English, Urdu or Roman Urdu — about membership, fees, programmes, events, payments or certificate verification.',
    placeholder: 'Type your question…',
    thinking: 'Checking live PYPC records…',
    note: 'Answers come from official PYPC information and live platform data.',
    suggestions: [
      'How do I become a PYPC member?',
      'What are the membership fees?',
      'Which programmes can I join?',
      'How is a certificate verified?',
      'Where can I follow PYPC on social media?'
    ],
    quickActions: [
      { label: 'Courses', href: '/courses', prompt: 'Which certified courses can I join and what do they cost?' },
      { label: 'IMUN 2027', href: '/conferences/imun-2027', prompt: 'Tell me about IMUN 2027 and how international delegates apply.' },
      { label: 'Fees', href: '/membership', prompt: 'What are the current membership fees?' },
      { label: 'International', href: '/international', prompt: 'How can an international student participate in PYPC programmes?' }
    ],
    errorMessage: 'Something went wrong on our side. Please try again or use the Contact page.',
    openLabel: 'Open PYPC AI Assistant',
    closeLabel: 'Close assistant',
    sendLabel: 'Send message',
    liveBadge: 'Live data',
    knowledgeBadge: 'Official information',
    modelBadge: 'Assistant'
  },
  'roman-ur': {
    label: 'Roman Urdu',
    code: 'UR-Latn',
    rtl: false,
    greeting:
      'Assalam-o-Alaikum! Main PYPC ka AI Assistant hoon. Aap English, Urdu ya Roman Urdu mein poochh sakte hain — membership, fees, programmes, events, payment ya certificate verification ke baare mein.',
    placeholder: 'Apna sawal likhein…',
    thinking: 'PYPC ke taza records dekhe ja rahe hain…',
    note: 'Jawabat sarkari PYPC maloomat aur live platform data se aate hain.',
    suggestions: [
      'Membership kaise lein?',
      'Fees kitni hai?',
      'Kaunse programmes chal rahe hain?',
      'Certificate verify kaise hota hai?',
      'PYPC ki social media pages kahan hain?'
    ],
    quickActions: [
      { label: 'Courses', href: '/courses', prompt: 'Kaunse certified courses join kar sakta hoon aur unki fees kya hai?' },
      { label: 'IMUN 2027', href: '/conferences/imun-2027', prompt: 'IMUN 2027 ke baare mein batayein aur international delegates kaise apply karein?' },
      { label: 'Fees', href: '/membership', prompt: 'Membership ki mojooda fees kitni hai?' },
      { label: 'Bairoon mulk', href: '/international', prompt: 'Bairoon mulk ke student PYPC programmes mein kaise shamil ho sakte hain?' }
    ],
    errorMessage: 'Hamari taraf se masla aa gaya. Dobara koshish karein ya Contact page istemal karein.',
    openLabel: 'PYPC AI Assistant kholein',
    closeLabel: 'Assistant band karein',
    sendLabel: 'Sawal bhejein',
    liveBadge: 'Live data',
    knowledgeBadge: 'Sarkari maloomat',
    modelBadge: 'Assistant'
  },
  ur: {
    label: 'اردو',
    code: 'UR',
    rtl: true,
    greeting:
      'السلام علیکم! میں پی وائی پی سی کا اے آئی اسسٹنٹ ہوں۔ آپ انگریزی، اردو یا رومن اردو میں پوچھ سکتے ہیں — رکنیت، فیس، پروگرام، تقریبات، ادائیگی یا سند کی تصدیق کے بارے میں۔',
    placeholder: 'اپنا سوال لکھیں…',
    thinking: 'پی وائی پی سی کے تازہ ریکارڈ دیکھے جا رہے ہیں…',
    note: 'جوابات سرکاری معلومات اور لائیو پلیٹ فارم ڈیٹا سے لیے جاتے ہیں۔',
    suggestions: [
      'رکنیت کیسے حاصل کروں؟',
      'فیس کتنی ہے؟',
      'کون سے پروگرام چل رہے ہیں؟',
      'سند کی تصدیق کیسے ہوتی ہے؟',
      'پی وائی پی سی کے سوشل میڈیا صفحات کہاں ہیں؟'
    ],
    quickActions: [
      { label: 'کورسز', href: '/courses', prompt: 'کون سے کورسز میں شامل ہو سکتا ہوں اور ان کی فیس کتنی ہے؟' },
      { label: 'IMUN 2027', href: '/conferences/imun-2027', prompt: 'IMUN 2027 کے بارے میں بتائیں اور بین الاقوامی مندوبین کیسے درخواست دیں؟' },
      { label: 'فیس', href: '/membership', prompt: 'رکنیت کی موجودہ فیس کتنی ہے؟' },
      { label: 'بین الاقوامی', href: '/international', prompt: 'بیرون ملک طلبہ پی و ی پی سی پروگراموں میں کیسے شامل ہو سکتے ہیں؟' }
    ],
    errorMessage: 'ہماری طرف سے مسئلہ آ گیا۔ دوبارہ کوشش کریں یا رابطہ صفحہ استعمال کریں۔',
    openLabel: 'پی وائی پی سی اے آئی اسسٹنٹ کھولیں',
    closeLabel: 'اسسٹنٹ بند کریں',
    sendLabel: 'سوال بھیجیں',
    liveBadge: 'لائیو ڈیٹا',
    knowledgeBadge: 'سرکاری معلومات',
    modelBadge: 'اسسٹنٹ'
  }
}

export function copyFor(language: AssistantLanguage): LanguageCopy {
  return ASSISTANT_COPY[language] ?? ASSISTANT_COPY.en
}

/** Flat list, kept for anything that still imports the old constant. */
export const suggestedQuestions = ASSISTANT_COPY.en.suggestions
