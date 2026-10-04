import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { askAssistant, needsHumanSupport } from '@/lib/ai/assistant'
import { detectLanguage, LANGUAGE_LABELS, type AssistantLanguage } from '@/lib/ai/language'
import { copyFor } from '@/lib/ai/suggestions'
import { aiChatSchema } from '@/lib/validations'
import { getCurrentUser } from '@/lib/auth'
import { recordAudit } from '@/lib/audit'
import { checkRateLimit, clientIp, crossOriginResponse, isSameOrigin, tooManyRequests } from '@/lib/security/request'

/**
 * POST /api/ai-assistant
 * Body: { message: string, sessionKey?: string, stream?: boolean }
 *
 * Multilingual, real-time assistant endpoint.
 *
 * - **Language** — English, Urdu (Arabic script) or Roman Urdu is detected from
 *   the message itself; the answer is written back in the same language.
 * - **Real-time** — before answering, the scopes the question needs (current
 *   membership prices, published events, open opportunities, valid certificates,
 *   live counters) are read from the database, so answers carry today's figures.
 * - **Streaming** — with `stream: true` the answer is delivered as Server-Sent
 *   Events: the language decision and live figures arrive first, then the answer
 *   text builds up as it is composed. The widget uses this so a longer answer
 *   never looks frozen. Without it the same JSON as before is returned.
 * - **Rate limited** — 20 questions per IP per 10 minutes, so the endpoint cannot
 *   be used as a free text generator.
 */

const STREAM_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no'
}

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/** Splits an answer into readable chunks so the client can render progressively. */
function chunkAnswer(answer: string) {
  const chunks: string[] = []
  const paragraphs = answer.split(/(\n\n+)/)
  for (const part of paragraphs) {
    if (part.startsWith('\n')) {
      if (chunks.length) chunks[chunks.length - 1] += part
      continue
    }
    // Long paragraphs are split further so the first words appear immediately.
    const words = part.split(' ')
    let buffer = ''
    for (const word of words) {
      buffer += (buffer ? ' ' : '') + word
      if (buffer.length >= 90) {
        chunks.push(buffer)
        buffer = ''
      }
    }
    if (buffer) chunks.push(buffer)
    else if (chunks.length) chunks[chunks.length - 1] += '\n\n'
  }
  return chunks.filter(Boolean)
}

/**
 * Audit escape hatch.
 *
 * The verification scripts need to drive the endpoint dozens of times from one
 * address, which the visitor rate limit would (correctly) stop. When
 * `AI_AUDIT_BYPASS_TOKEN` is set on the server, a request that repeats the same
 * value in `x-pypc-audit` skips the limiter. Unset — the default everywhere,
 * including production — the header is ignored entirely, so there is no bypass
 * in a deployed site unless an operator deliberately turns one on.
 */
function isAuditRequest(request: Request) {
  const expected = process.env.AI_AUDIT_BYPASS_TOKEN
  if (!expected || expected.length < 16) return false
  const provided = request.headers.get('x-pypc-audit')
  if (!provided || provided.length !== expected.length) return false
  let diff = 0
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected.charCodeAt(index) ^ provided.charCodeAt(index)
  }
  return diff === 0
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginResponse()

  // Parse and validate first: a typo or an empty box is answered instantly and
  // never consumes the visitor's question budget.
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = aiChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please type a question.' },
      { status: 422 }
    )
  }

  // Two limits: one visitor cannot flood the endpoint, and a shared campus or
  // office address does not lock out everyone behind it.
  const ip = clientIp(request)
  const windowSeconds = Number(process.env.AI_RATE_LIMIT_WINDOW_SECONDS || 600)
  const sessionKey = parsed.data.sessionKey ?? ''
  const audit = isAuditRequest(request)

  if (!audit) {
    const [ipLimit, sessionLimit] = await Promise.all([
      checkRateLimit({
        scope: 'ai-assistant:ip',
        identity: ip,
        limit: Number(process.env.AI_RATE_LIMIT_IP || 60),
        windowSeconds
      }),
      sessionKey
        ? checkRateLimit({
            scope: 'ai-assistant:session',
            identity: sessionKey,
            limit: Number(process.env.AI_RATE_LIMIT_SESSION || 25),
            windowSeconds
          })
        : Promise.resolve({ allowed: true, remaining: 1, retryAfterSeconds: 0 })
    ])

    if (!ipLimit.allowed || !sessionLimit.allowed) {
      const retryAfterSeconds = Math.max(ipLimit.retryAfterSeconds, sessionLimit.retryAfterSeconds)
      return tooManyRequests(
        retryAfterSeconds,
        'You have asked several questions already. Please wait a few minutes before asking more.'
      )
    }
  }

  const { message } = parsed.data
  const wantsStream = Boolean((body as { stream?: boolean })?.stream)

  const user = await getCurrentUser()

  // Stored against the conversation so support can follow the thread later.
  const storedSessionKey =
    sessionKey || `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

  // Detected up front so the client can set direction and placeholder text before
  // the answer is ready — important on a slow connection.
  const detection = detectLanguage(message)

  const reply = await askAssistant(message)
  const escalate = reply.escalate || needsHumanSupport(message)

  // Persist the exchange. Logging must never break the answer, so failures are
  // swallowed after being reported.
  let conversationId: string | null = null
  try {
    const conversation = await prisma.aiConversation.upsert({
      where: { sessionKey: storedSessionKey },
      update: {
        updatedAt: new Date(),
        userId: user?.id ?? undefined,
        language: detection.language
      },
      create: {
        sessionKey: storedSessionKey,
        userId: user?.id ?? null,
        title: message.slice(0, 60),
        language: detection.language
      }
    })
    conversationId = conversation.id

    await prisma.aiMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: 'user',
          content: message,
          source: 'user',
          language: detection.language
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: reply.answer,
          source: reply.source,
          language: reply.language
        }
      ]
    })
  } catch (error) {
    console.error('[ai-assistant] could not persist conversation', error)
  }

  if (escalate) {
    await recordAudit({
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      action: 'AI_ESCALATION_REQUESTED',
      entityType: 'AiConversation',
      metadata: {
        message: message.slice(0, 300),
        language: detection.language,
        confidence: detection.confidence
      },
      request
    })
  }

  const relatedPages = reply.matched
    .filter(entry => entry.href)
    .map(entry => ({ label: entry.hrefLabel ?? entry.question, href: entry.href }))

  // Follow-up chips in the visitor's own language, so the conversation can carry
  // on without them having to think in English.
  const languageCopy = copyFor(reply.language)

  if (!wantsStream) {
    return NextResponse.json({
      answer: reply.answer,
      source: reply.source,
      sessionKey: storedSessionKey,
      escalate,
      language: reply.language,
      languageLabel: LANGUAGE_LABELS[reply.language].label,
      rtl: LANGUAGE_LABELS[reply.language].rtl,
      confidence: detection.confidence,
      detection: {
        signals: detection.signals.slice(0, 6),
        mixed: detection.mixed
      },
      realtime: reply.realtime,
      live: reply.live,
      relatedPages,
      suggestedQuestions: languageCopy.suggestions,
      quickActions: languageCopy.quickActions
    })
  }

  // ------------------------------------------------------------------ streaming
  const encoder = new TextEncoder()
  const chunks = chunkAnswer(reply.answer)

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sse(event, data)))

      try {
        send('meta', {
          sessionKey: storedSessionKey,
          suggestedQuestions: languageCopy.suggestions,
          quickActions: languageCopy.quickActions,
          language: reply.language,
          languageLabel: LANGUAGE_LABELS[reply.language].label,
          rtl: LANGUAGE_LABELS[reply.language].rtl,
          confidence: detection.confidence,
          source: reply.source,
          realtime: reply.realtime,
          live: reply.live,
          escalate,
          relatedPages
        })

        for (const chunk of chunks) {
          send('delta', { text: chunk })
          // A tiny pause keeps the stream visibly progressive instead of one blob.
          await new Promise(resolve => setTimeout(resolve, 12))
        }

        send('done', { answer: reply.answer, conversationId })
      } catch (error) {
        console.error('[ai-assistant] stream failed', error)
        send('error', { message: 'The answer could not be completed. Please try again.' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, { headers: STREAM_HEADERS })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
