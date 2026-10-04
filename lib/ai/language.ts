/**
 * Language detection and script handling for the PYPC assistant.
 *
 * The assistant must read the way people actually write to it:
 *
 *   "How do I become a member?"          → English
 *   "رکنیت کیسے حاصل کروں؟"                → Urdu
 *   "membership kaise lein? fees kya hai" → Roman Urdu/English
 *
 * Detection is deliberately transparent — three signals, weighted, no ML
 * dependency, no network call, and it can never throw:
 *
 *   1. **Script.** Arabic-block characters mean Urdu, full stop.
 *   2. **Roman-Urdu vocabulary.** Function words (kaise, kitna, kya, chahiye,
 *      karna, mujhe…) and domain words (rکنیت → rukniyat, fees, taleem…). These
 *      are weighted higher than single-word matches because they almost never
 *      appear in English prose.
 *   3. **Contractions and English stop-words** for the opposite direction
 *      ("how", "do", "the", "is") which keep an English question English even
 *      when it mentions a Roman-Urdu word.
 *
 * The result is a `LanguageProfile` the assistant uses to pick its answer
 * language, its greeting, its suggestion chips and — when OpenAI is configured —
 * the language the model must reply in.
 */

export const ASSISTANT_LANGUAGES = ['en', 'ur', 'roman-ur'] as const

export type AssistantLanguage = (typeof ASSISTANT_LANGUAGES)[number]

export type LanguageProfile = {
  /** Detected language. */
  language: AssistantLanguage
  /** 0–1, how sure the detector is. */
  confidence: number
  /** True when the message mixes Urdu script and Latin script. */
  mixed: boolean
  /** Human-readable label for the UI badge. */
  label: string
  /** Two-letter code shown on the badge. */
  code: string
  /** Should the reply be written right-to-left? */
  rtl: boolean
  /** Words that triggered the decision — useful in tests and in the audit log. */
  signals: string[]
}

export const LANGUAGE_LABELS: Record<AssistantLanguage, { label: string; code: string; rtl: boolean }> = {
  en: { label: 'English', code: 'EN', rtl: false },
  ur: { label: 'اردو', code: 'UR', rtl: true },
  'roman-ur': { label: 'Roman Urdu', code: 'UR-Latn', rtl: false }
}

/** Arabic-script range covers Urdu (and its extended forms). */
const URDU_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g

/**
 * Roman-Urdu function words. These are the words that make a sentence Urdu even
 * when it is typed in Latin letters; they are weighted heavily because they are
 * rare in English sentences of the same topic.
 */
/**
 * Strong Roman-Urdu markers.
 *
 * These words are close to unambiguous: an English sentence almost never
 * contains "kitni" or "chahiye". One of them is enough to swing a message to
 * Roman Urdu, so they carry the full weight.
 */
const ROMAN_URDU_STRONG_WORDS = [
  'kaise', 'kaisay', 'kesay', 'keise', 'kaisay',
  'kya', 'kaya', 'kia',
  'kitna', 'kitne', 'kitni', 'kitnaa', 'kitnay',
  'kahan', 'kab', 'kaun', 'kaunsa', 'kaisi',
  'mujhe', 'mujhay', 'humein', 'humain',
  'aap', 'aapka', 'aapki', 'aapke', 'tum', 'tumhara', 'tumhari',
  'chahiye', 'chahiyay', 'chahta', 'chahti', 'zaroorat', 'zarurat', 'zaroori',
  'karna', 'karnay', 'karni', 'karta', 'karti', 'karein', 'karain', 'karunga', 'karna hai',
  'hoga', 'hogi', 'hain', 'hai', 'hoon', 'hun', 'tha', 'thi',
  'nahi', 'nahin', 'magar', 'lekin', 'phir', 'bhi',
  'batao', 'bataye', 'batayein', 'bataen', 'samjhao', 'samjhaen',
  'milega', 'milegi', 'milta', 'sakte', 'sakta', 'sakti', 'sakunga',
  'wala', 'wali', 'walay',
  'paisa', 'paise', 'rupay', 'rupaye',
  'taareekh', 'tareekh', 'waqt', 'jagah', 'sab', 'koi', 'kuch', 'kaunsi',
  'kaise hasil', 'kitni hai', 'kya hai'
]

/**
 * Weak particles — "ka", "ki", "ko", "se", "par", "mein", "na", "ya", "aur".
 *
 * They are far too short to judge on their own: "par" is an English golf term,
 * "na" is an English interjection, and every one of them can appear inside an
 * English sentence. Two or more together, though, are a reliable Roman-Urdu
 * signal. They are counted at a fraction of the weight and are never enough
 * alone — a question needs at least one strong marker or domain word.
 */
const ROMAN_URDU_WEAK_PARTICLES = ['ka', 'ki', 'ke', 'ko', 'se', 'mein', 'par', 'tak', 'na', 'ya', 'aur', 'kar']

const ROMAN_URDU_DOMAIN_WORDS = [
  'rukniyat', 'rukn', 'member', 'membership',
  'shirkat', 'shamil', 'shaamil', 'dakhla', 'darkhwast', 'darkhast',
  'taleem', 'taleemi', 'kourse', 'cours', 'sabaq',
  'sertificate', 'certificate', 'tasdeeq', 'tasdeeqi',
  'adaiyat', 'adaigi', 'fees', 'fee', 'tax', 'riayat', 'chhoot',
  'khazana', 'bank', 'jazzcash', 'easypaisa',
  'mashwara', 'raabta', 'rabta', 'email', 'phone', 'number', 'pata',
  'waqia', 'taqreeb', 'jalsa', 'muqabla', 'inam',
  'viza', 'visa', 'safar', 'bulawa', 'dawatnama',
  'mulki', 'ghair mulki', 'bairoon', 'bahar', 'bahir',
  'Pakistan', 'Islamabad', 'Punjab', 'Sindh', 'Balochistan', 'Khyber'
]

const ENGLISH_STOP_WORDS = [
  'the', 'a', 'an', 'is', 'are', 'am', 'was', 'were', 'be', 'been',
  'do', 'does', 'did', 'how', 'what', 'when', 'where', 'which', 'who', 'why',
  'can', 'could', 'should', 'would', 'will', 'may', 'might', 'must',
  'i', 'you', 'we', 'they', 'he', 'she', 'it', 'my', 'your', 'our', 'their',
  'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this', 'these', 'those',
  'for', 'from', 'with', 'about', 'into', 'onto', 'upon', 'please', 'need',
  'want', 'get', 'apply', 'join', 'pay', 'payments', 'membership'
]

function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countMatches(words: Set<string>, dictionary: string[]) {
  const hits: string[] = []
  for (const word of dictionary) {
    // Multi-word phrases are matched as substrings; single words as tokens.
    if (word.includes(' ')) {
      if ([...words].some(token => token.includes(word))) hits.push(word)
    } else if (words.has(word)) {
      hits.push(word)
    }
  }
  return hits
}

/** Length-independent confidence: saturates once enough evidence is present. */
function confidenceFrom(urduScore: number, englishScore: number, urduScriptChars: number, totalChars: number) {
  if (urduScriptChars > 0) {
    // Half the characters in Urdu script is already decisive; more saturates.
    return Math.min(1, 0.7 + Math.min(1, (urduScriptChars / Math.max(1, totalChars)) * 0.6))
  }
  const total = urduScore + englishScore
  if (total === 0) return 0.34
  const share = urduScore / total
  const evidence = Math.min(1, total / 6)
  return Number((0.45 + Math.abs(share - 0.5) * 1.1 * (0.6 + 0.4 * evidence)).toFixed(2))
}

/**
 * Detects the language of a message. Never throws, never returns undefined, and
 * always gives the UI something to show.
 */
export function detectLanguage(message: string): LanguageProfile {
  const text = typeof message === 'string' ? message : String(message ?? '')
  const trimmed = text.trim()

  const urduScriptChars = (trimmed.match(URDU_SCRIPT) ?? []).length
  const latinChars = (trimmed.match(/[A-Za-z]/g) ?? []).length

  const normalisedText = normalise(trimmed)
  const words = new Set(normalisedText.split(' ').filter(Boolean))

  const romanStrongHits = countMatches(words, ROMAN_URDU_STRONG_WORDS)
  const romanWeakHits = countMatches(words, ROMAN_URDU_WEAK_PARTICLES)
  const romanDomainHits = countMatches(words, ROMAN_URDU_DOMAIN_WORDS)
  const englishHits = countMatches(words, ENGLISH_STOP_WORDS)

  // Weights: Urdu script ≫ strong Roman-Urdu markers > domain words > weak
  // particles. English stop-words pull the other way.
  const urduScore = romanStrongHits.length * 3 + romanDomainHits.length * 1 + Math.min(romanWeakHits.length, 3) * 0.5
  const englishScore = englishHits.length * 2

  // "Tell me about the programmes you run" must stay English: an occasional
  // particle ("ka", "par") is not Roman Urdu on its own. That is why the weak
  // particles are capped above and cannot by themselves reach this threshold.
  const romanEvidence = romanStrongHits.length * 3 + romanDomainHits.length

  const signals = [
    ...romanStrongHits.slice(0, 5).map(word => `roman-ur:${word}`),
    ...romanDomainHits.slice(0, 4).map(word => `domain:${word}`),
    ...romanWeakHits.slice(0, 3).map(word => `particle:${word}`),
    ...englishHits.slice(0, 4).map(word => `en:${word}`)
  ]

  // 1. Urdu script present in a meaningful amount.
  if (urduScriptChars >= 2) {
    const mixed = latinChars > urduScriptChars
    return {
      language: 'ur',
      confidence: confidenceFrom(urduScore, englishScore, urduScriptChars, trimmed.length),
      mixed,
      ...LANGUAGE_LABELS.ur,
      signals: ['script:arabic', ...signals]
    }
  }

  // 2. Nothing but Latin: weigh the two dictionaries against each other. A
  //    message with no Roman-Urdu substance at all (no marker, no domain word)
  //    is English however many short particles it happens to contain.
  const hasRomanSubstance = romanEvidence >= 2
  if (!hasRomanSubstance || englishScore >= urduScore * 1.4) {
    return {
      language: 'en',
      confidence: confidenceFrom(0, englishScore, 0, trimmed.length),
      mixed: false,
      ...LANGUAGE_LABELS.en,
      signals
    }
  }

  // 3. Roman Urdu wins on its markers, or on domain words plus particles when
  //    the message is very short ("fees kitni hai", "visa letter chahiye").
  return {
    language: 'roman-ur',
    confidence: confidenceFrom(urduScore, englishScore, 0, trimmed.length),
    mixed: englishHits.length > 0,
    ...LANGUAGE_LABELS['roman-ur'],
    signals
  }
}

/**
 * Transliterates Roman Urdu into the Urdu-script keywords the knowledge base is
 * indexed with, so one entry serves all three languages without being written
 * three times. Longest keys first, so "membership fees" beats "fees".
 */
const TRANSLITERATION: Record<string, string> = {
  'membership fees': 'فیس رکنیت',
  'membership fee': 'فیس رکنیت',
  'membership': 'رکنیت',
  'member': 'رکن',
  'fees': 'فیس',
  'fee': 'فیس',
  'price': 'قیمت',
  'cost': 'لاگت',
  'payment': 'ادائیگی',
  'payments': 'ادائیگی',
  'pay': 'ادائیگی',
  'jazzcash': 'جاز کیش',
  'easypaisa': 'ایزی پیسہ',
  'bank': 'بینک',
  'transfer': 'منتقلی',
  'certificate': 'سند',
  'certificates': 'سند',
  'verify': 'تصدیق',
  'verification': 'تصدیق',
  'qr': 'کیو آر کوڈ',
  'programme': 'پروگرام',
  'program': 'پروگرام',
  'course': 'کورس',
  'courses': 'کورس',
  'apply': 'درخواست',
  'application': 'درخواست',
  'form': 'فارم',
  'event': 'تقریب',
  'events': 'تقریب',
  'conference': 'کانفرنس',
  'imun': 'کانفرنس',
  'opportunity': 'مواقع',
  'opportunities': 'مواقع',
  'scholarship': 'وظیفہ',
  'visa': 'ویزا',
  'letter': 'خط',
  'international': 'بین الاقوامی',
  'student': 'طالب علم',
  'students': 'طلبہ',
  'contact': 'رابطہ',
  'email': 'ای میل',
  'phone': 'فون',
  'number': 'نمبر',
  'whatsapp': 'واٹس ایپ',
  'help': 'مدد',
  'support': 'مدد',
  'login': 'لاگ ان',
  'register': 'رجسٹر',
  'signup': 'رجسٹر',
  'account': 'اکاؤنٹ',
  'password': 'پاس ورڈ',
  'privacy': 'رازداری',
  'data': 'ڈیٹا',
  'time': 'وقت',
  'date': 'تاریخ',
  'link': 'لنک',
  'page': 'صفحہ',
  'website': 'ویب سائٹ',
  'policy': 'پالیسی',
  'refund': 'رقم کی واپسی',
  'deadline': 'آخری تاریخ',
  'result': 'نتیجہ',
  'status': 'حالت',
  'track': 'ٹریک',
  'id': 'شناختی',
  'cnic': 'شناختی کارڈ',
  'passport': 'پاسپورٹ'
}

/**
 * Words that carry no retrieval value in any of the three languages.
 *
 * This is the fix for the old keyword matcher, which scored `"kaise"` as a
 * partial match against English words like "said" and returned nonsense for
 * Roman-Urdu questions. Stop-words are removed **before** scoring, and matching
 * is by whole token or explicit substring — never by loose containment.
 */
export const RETRIEVAL_STOP_WORDS = new Set([
  // English
  'the', 'a', 'an', 'is', 'are', 'am', 'do', 'does', 'did', 'how', 'what',
  'when', 'where', 'which', 'who', 'why', 'can', 'could', 'should', 'would',
  'will', 'i', 'you', 'we', 'they', 'my', 'your', 'our', 'and', 'or', 'but',
  'if', 'then', 'than', 'that', 'this', 'these', 'those', 'for', 'from',
  'with', 'about', 'into', 'please', 'tell', 'me', 'want', 'need', 'know',
  // Roman Urdu
  'kaise', 'kaisay', 'kesay', 'kya', 'kia', 'kitna', 'kitne', 'kitni',
  'kahan', 'kab', 'kaun', 'kaunsa', 'mujhe', 'mujhay', 'mera', 'meri',
  'meray', 'mere', 'hum', 'humein', 'humain', 'aap', 'aapka', 'aapki',
  'tum', 'tumhara', 'chahiye', 'chahiyay', 'chahta', 'chahti', 'zaroorat',
  'zarurat', 'karna', 'karnay', 'karni', 'karta', 'karti', 'karein',
  'karain', 'kar', 'hoga', 'hogi', 'hain', 'hai', 'tha', 'thi', 'the',
  'nahi', 'nahin', 'na', 'aur', 'ya', 'lekin', 'magar', 'phir', 'bhi',
  'ka', 'ki', 'ke', 'ko', 'se', 'mein', 'me', 'par', 'tak', 'batao',
  'bataye', 'batayein', 'bataen', 'batana', 'samjhao', 'samjhaen',
  'milega', 'milegi', 'milta', 'sakta', 'sakti', 'sakte', 'wala', 'wali',
  'walay', 'koi', 'kuch', 'sab', 'hai?', 'he', 'ho', 'raha', 'rahi', 'par?',
  // Urdu script function words
  'کیسے', 'کیا', 'کتنے', 'کتنے؟', 'کہاں', 'کب', 'کون', 'مجھے', 'میرا',
  'میری', 'ہم', 'آپ', 'آپ کا', 'چاہیے', 'ضرورت', 'کرنا', 'کرنے', 'کر',
  'ہوگا', 'ہوگی', 'ہیں', 'ہے', 'تھا', 'تھی', 'نہیں', 'اور', 'یا', 'لیکن',
  'مگر', 'پھر', 'بھی', 'کا', 'کی', 'کے', 'کو', 'سے', 'میں', 'پر', 'تک',
  'بتائیں', 'بتاؤ', 'سمجھائیں', 'ملے گا', 'سکتا', 'سکتی', 'سکتے',
  /*
   * The council's own name, spelled out in Urdu. Every answer in the knowledge
   * base mentions "پی وائی پی سی", and so does almost every question, so the
   * words  پی / وائی / سی carry no topic information at all. Left in, they gave
   * *every* entry a phantom token match — which is how an Urdu question about
   * social pages was once matched to the certificate entry.
   */
  'پی', 'وائی', 'سی', 'پی وائی پی سی', 'پی وائی', 'وائی پی'
])

/**
 * Expands a message with Urdu keywords so one knowledge entry can be found from
 * any of the three languages.
 */
export function expandQueryForRetrieval(message: string): string {
  const lower = (message ?? '').toLowerCase()
  const additions: string[] = []

  const entries = Object.entries(TRANSLITERATION).sort((a, b) => b[0].length - a[0].length)
  for (const [latin, urdu] of entries) {
    const pattern = new RegExp(`(^|[^a-z])${latin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i')
    if (pattern.test(lower)) additions.push(urdu)
  }

  return additions.length ? `${message} ${additions.join(' ')}` : message
}

export function isRtlLanguage(language: AssistantLanguage) {
  return language === 'ur'
}
