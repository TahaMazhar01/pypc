import 'server-only'

import type { KnowledgeEntry } from './knowledge-base'
import { CONTACT_EMAIL, CONTACT_EMAILS, CONTACT_PHONE } from '@/lib/constants'
import {
  assistantSystemPrompt,
  knowledgeBasePromptContext,
  languageLabel,
  searchKnowledgeBaseDetailed,
  type KnowledgeMatch
} from './knowledge-base'
import { detectLanguage, type AssistantLanguage, type LanguageProfile } from './language'
import type { LiveScope } from './knowledge-base'
import { contactFactLines, readLiveData, type LiveDataResult, type LiveFact } from './live-data'

/**
 * Assistant engine.
 *
 * 1. Always retrieve the most relevant PYPC knowledge-base entries.
 * 2. If OPENAI_API_KEY is configured, ask the model to answer grounded only in
 *    that content (temperature 0.2, short max tokens).
 * 3. Otherwise fall back to a deterministic knowledge-base answer so the
 *    assistant is fully functional with zero external dependencies.
 */

export type AssistantReply = {
  answer: string
  source: 'openai' | 'knowledge_base'
  matched: KnowledgeEntry[]
  escalate: boolean
  /** Language the reply is written in. */
  language: AssistantLanguage
  /** Full detection profile, including confidence and the words that decided it. */
  detection: LanguageProfile
  /** Live figures read while answering, when the question needed them. */
  live?: {
    scope: string
    facts: LiveFact[]
    readAt: string
    degraded: boolean
  }
  /** True when the answer used current database values. */
  realtime: boolean
}

/**
 * Escalation triggers, in all three languages. A Roman-Urdu complaint must reach
 * a human exactly like an English one.
 */
const ESCALATION_HINTS = [
  // English
  'complaint', 'refund', 'not working', 'error', 'problem', 'fraud', 'harass',
  'legal', 'lawyer', 'police', 'human', 'agent', 'talk to someone', 'speak to',
  // Roman Urdu
  'shikayat', 'shikayat hai', 'paisa wapas', 'wapas chahiye', 'kaam nahi kar',
  'masla', 'masla hai', 'dikkat', 'dikkat hai', 'farzi', 'dhoka', 'fraud',
  'tang', 'pareshani', 'insan se', 'banda', 'kisi se baat', 'rehnumai'
]

const ESCALATION_URDU = ['شکایت', 'رقم واپس', 'کام نہیں', 'مسئلہ', 'دقت', 'دھوکہ', 'فراڈ', 'پریشانی', 'انسان سے بات']


export function openAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}

/**
 * Which of the three stored answers to show, based on the visitor's language and
 * what the entry actually has. Roman-Urdu readers get the Roman-Urdu wording when
 * it exists, Urdu readers the Urdu wording — falling back to English rather than
 * showing an empty bubble.
 */
function answerFor(entry: KnowledgeEntry, language: AssistantLanguage) {
  if (language === 'ur' && entry.answerUrdu) return entry.answerUrdu
  if (language === 'roman-ur' && entry.answerRoman) return entry.answerRoman
  return entry.answer
}

function questionFor(entry: KnowledgeEntry, language: AssistantLanguage) {
  // The stored question is English; the polite follow-up line is localised, which
  // is enough for a "you may also want to know" list.
  if (language === 'ur') return entry.answerUrdu ? entry.question : entry.question
  return entry.question
}

const NO_ANSWER = {
  en: (email: string) =>
    `I don't have that in the PYPC knowledge base, so I won't guess. Send the question through the Contact page or email ${email} and the secretariat will reply. A team member can also pick it up from your dashboard support tab.`,
  'roman-ur': (email: string) =>
    `Yeh maloomat PYPC knowledge base mein mojood nahi, is liye main andaza nahi lagaunga. Contact page se sawal bhejein ya ${email} par email karein — secretariat jawab dega. Member dashboard ke support tab se bhi ticket ban sakta hai.`,
  ur: () =>
    'یہ معلومات پی وائی پی سی کے علم کے ذخیرے میں موجود نہیں، اس لیے میں اندازہ نہیں لگاؤں گا۔ رابطہ صفحے سے سوال بھیجیں یا ای میل کریں — سیکرٹریٹ جواب دے گا۔ ممبر ڈیش بورڈ کے سپورٹ ٹیب سے ٹکٹ بھی بن سکتا ہے۔'
}

const ALSO_KNOW = {
  en: 'You may also want to know:',
  'roman-ur': 'Yeh bhi maloom ho sakta hai:',
  ur: 'یہ بھی جاننے کے قابل ہے:'
}

function fallbackAnswer(matched: KnowledgeMatch[], language: AssistantLanguage) {
  if (!matched.length) {
    return { answer: NO_ANSWER[language](CONTACT_EMAIL), escalate: true }
  }

  const primary = answerFor(matched[0].entry, language)

  const extra = matched
    .slice(1, 3)
    .map(match => `• ${questionFor(match.entry, language)}`)
    .join('\n')

  return {
    answer: extra ? `${primary}\n\n${ALSO_KNOW[language]}\n${extra}` : primary,
    escalate: false
  }
}

/**
 * Joins the knowledge-base answer with any live figures.
 *
 * The live block is clearly separated and timestamped so a reader can see that
 * the numbers were read at that moment — and if the database could not be read,
 * the assistant says so instead of quoting a stale count.
 */
function withLiveData(
  answer: string,
  live: LiveDataResult | undefined,
  language: AssistantLanguage,
  includeContacts: boolean
) {
  const parts = [answer]

  if (live) {
    const heading =
      language === 'ur'
        ? live.scope === 'membership_plans' || live.scope === 'plans'
          ? 'موجودہ فیس (لائیو)'
          : 'لائیو معلومات'
        : language === 'roman-ur'
          ? live.scope === 'membership_plans' || live.scope === 'plans'
            ? 'Mojooda fees (live)'
            : 'Live maloomat'
          : live.scope === 'membership_plans' || live.scope === 'plans'
            ? 'Current fees (live)'
            : 'Live figures'

    parts.push(`${heading}:\n${live.lines.join('\n')}`)

    if (live.degraded) {
      parts.push(
        language === 'ur'
          ? 'نوٹ: ڈیٹا بیس اس لمحے دستیاب نہیں تھا، اس لیے یہ تعداد نہیں پڑھی جا سکی۔'
          : language === 'roman-ur'
            ? 'Note: database is waqt dastyab nahi tha, is liye yeh tadaad parhi nahi ja saki.'
            : 'Note: the database could not be read just now, so those figures are missing.'
      )
    }
  }

  if (includeContacts) {
    parts.push(
      language === 'ur'
        ? `سرکاری رابطہ:\n${contactFactLines('ur').join('\n')}`
        : language === 'roman-ur'
          ? `Official rabta:\n${contactFactLines('roman-ur').join('\n')}`
          : `Official contact:\n${contactFactLines('en').join('\n')}`
    )
  }

  return parts.join('\n\n')
}

/**
 * How many times the assistant may ask itself a follow-up question before it
 * stops and answers with what it has. Bounded on purpose: a loop that keeps
 * refining forever would burn tokens and keep the visitor waiting.
 */
const MAX_TOOL_ROUNDS = 2

/**
 * Decides which live scopes a question needs, based on the matched entries.
 * Real-time lookups only happen when they are actually relevant, so "what is
 * PYPC?" does not touch the database at all.
 */
function liveScopesFor(matches: KnowledgeMatch[], message: string, language: AssistantLanguage) {
  const scopes = new Set<LiveScope>()
  for (const match of matches) {
    // Only entries matched by a real keyword (not a single overlapping word) are
    // allowed to trigger a live read — otherwise a stray token could pull an
    // unrelated figure into a membership answer.
    const meaningful = match.score >= 3 || match.via.length > 0
    if (match.entry.live && meaningful) scopes.add(match.entry.live)
  }

  const lower = message.toLowerCase()
  // Fee questions always pull current prices, even if the matcher chose another
  // entry — "kitni fees hai" must never answer from a stale sentence.
  if (/fee|fees|price|cost|kitni (fees|fee|raqam)|فیس|قیمت|چارج/.test(lower)) {
    scopes.add('membership_plans')
  }
  if (/how many|kitne|kitni tadaad|کتنے|تعداد/.test(lower)) scopes.add('members')
  if (/event|conference|تقریب|کانفرنس|jalsa/.test(lower)) scopes.add('events')
  if (language === 'ur' && /پروگرام/.test(message)) scopes.add('programmes')

  // One live read is enough to keep the answer short and the query cheap.
  return [...scopes].slice(0, 2)
}

export async function askAssistant(message: string): Promise<AssistantReply> {
  const detection = detectLanguage(message)
  const language = detection.language

  const matches = searchKnowledgeBaseDetailed(message)
  const matched = matches.map(match => match.entry)

  // Real-time: read whatever the question actually needs, before composing.
  const scopes = liveScopesFor(matches, message, language)
  const liveReads = await Promise.all(scopes.map(scope => readLiveData(scope, language)))
  const primaryLive = liveReads[0]

  const askAboutContacts = /contact|email|phone|number|whatsapp|social|facebook|instagram|youtube|linkedin|رابطہ|نمبر|ای میل|rabta/.test(
    message.toLowerCase()
  )

  const liveBlock = primaryLive
    ? {
        scope: primaryLive.scope as string,
        facts: liveReads.flatMap(read => read.facts).slice(0, 8),
        readAt: primaryLive.readAt,
        degraded: liveReads.some(read => read.degraded)
      }
    : undefined

  const realtime = liveReads.length > 0 && !liveReads.every(read => read.degraded)

  // ---------------------------------------------------------------- no AI key
  if (!openAiConfigured()) {
    const fallback = fallbackAnswer(matches, language)
    return {
      ...fallback,
      answer: withLiveData(fallback.answer, primaryLive, language, askAboutContacts),
      source: 'knowledge_base',
      matched,
      language,
      detection,
      live: liveBlock,
      realtime
    }
  }

  // -------------------------------------------------------- model, grounded
  const liveContext = liveReads.length
    ? `Live figures read from the PYPC database at ${primaryLive?.readAt}:\n${liveReads
        .map(read => read.lines.join('\n'))
        .join('\n')}`
    : ''

  const contactContext = askAboutContacts
    ? `Official contact details (authoritative):\n${contactFactLines(language).join('\n')}`
    : ''

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: assistantSystemPrompt },
    { role: 'system', content: `Reply language: ${languageLabel(language)}. Write the whole answer in that language and script.` },
    {
      role: 'system',
      content: `PYPC knowledge base (authoritative content):\n\n${knowledgeBasePromptContext(matched, language)}${
        liveContext ? `\n\n${liveContext}` : ''
      }${contactContext ? `\n\n${contactContext}` : ''}`
    },
    { role: 'user', content: message }
  ]

  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    let completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 420,
      messages
    })

    let answer = completion.choices[0]?.message?.content?.trim()

    // If the model decides the live context was not enough, it may ask for one
    // more scope — for example a membership question that turns out to need the
    // current event list. Bounded to MAX_TOOL_ROUNDS so latency stays predictable.
    for (let round = 0; round < MAX_TOOL_ROUNDS && answer; round++) {
      const request = /^REQUEST:(membership_plans|programmes|events|opportunities|certificates|members|international)/im.exec(answer)
      if (!request) break

      const scope = request[1] as LiveScope
      const extra = await readLiveData(scope, language)
      messages.push({ role: 'assistant', content: answer })
      messages.push({
        role: 'system',
        content: `Additional live data (${scope}) read at ${extra.readAt}:\n${extra.lines.join('\n')}\nNow write the final answer.`
      })

      completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 420,
        messages
      })
      answer = completion.choices[0]?.message?.content?.trim()
    }

    if (!answer) throw new Error('empty completion')

    // Always append the live numbers ourselves: whatever the model wrote, the
    // figures the visitor sees are the ones read from the database this second.
    const composed = withLiveData(answer, primaryLive, language, askAboutContacts && !answer.includes(CONTACT_PHONE))

    return {
      answer: composed,
      source: 'openai',
      matched,
      escalate: false,
      language,
      detection,
      live: liveBlock,
      realtime
    }
  } catch (error) {
    console.error('[assistant] OpenAI call failed, falling back to knowledge base', error)
    const fallback = fallbackAnswer(matches, language)
    return {
      ...fallback,
      answer: withLiveData(fallback.answer, primaryLive, language, askAboutContacts),
      source: 'knowledge_base',
      matched,
      language,
      detection,
      live: liveBlock,
      realtime
    }
  }
}

export function needsHumanSupport(message: string) {
  const normalised = (message ?? '').toLowerCase()
  return (
    ESCALATION_HINTS.some(hint => normalised.includes(hint)) ||
    ESCALATION_URDU.some(hint => message.includes(hint))
  )
}

export const suggestedQuestions = [
  'How do I become a PYPC member?',
  'Which programmes can I join?',
  'How is a certificate verified?',
  'Which payment methods are accepted?',
  'رکنیت کیسے حاصل کروں؟',
  'Membership ki fees kitni hai?',
  'Kitne events publish ho chuke hain?'
]
