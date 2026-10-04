'use client'


import { displayContent } from '@/lib/display-content'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Loader2, MessageSquare, Send, Bot, X } from 'lucide-react'
import { detectLanguage, LANGUAGE_LABELS, type AssistantLanguage } from '@/lib/ai/language'
import { copyFor } from '@/lib/ai/suggestions'

/**
 * PYPC AI Assistant — multilingual, real-time, resilient.
 *
 * Language
 *   Detection runs in the browser the moment the visitor types (the same
 *   detector the server uses, imported from lib/ai/language), so the input
 *   direction, the badge and the suggestion chips switch to Urdu, Roman Urdu or
 *   English *before* anything is sent. Urdu messages render right-to-left.
 *
 * Real-time
 *   The answer is streamed from /api/ai-assistant as Server-Sent Events: the
 *   language decision and any live database figures arrive first, then the answer
 *   text builds up. Live figures are shown as their own small cards, stamped with
 *   the time they were read, so the visitor can see the numbers are current.
 *
 * Resilience
 *   If SSE is unavailable (old proxy, interrupted connection) the widget falls
 *   back to the plain JSON endpoint automatically. If the request fails outright
 *   the visitor is told, in their own language, how to reach a human.
 */

type LiveFact = { key: string; label: string; value: string }

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  language?: AssistantLanguage
  source?: string
  realtime?: boolean
  live?: { scope: string; facts: LiveFact[]; readAt: string; degraded: boolean }
  relatedPages?: { label: string; href: string }[]
  streaming?: boolean
  escalate?: boolean
}

const SESSION_KEY = 'pypc-ai-session'

/** Storage can be blocked in embedded views; never let that throw. */
function safeStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function AiAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionKey, setSessionKey] = useState<string>()
  const [messages, setMessages] = useState<Message[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)

  /**
   * The language currently guiding the interface: the language of the last
   * message the visitor typed, falling back to whatever they are typing now, and
   * finally to English. Recomputed on every keystroke so the placeholder, chips
   * and direction follow along live.
   */
  const typedLanguage = useMemo<AssistantLanguage>(() => {
    if (input.trim().length >= 3) return detectLanguage(input).language
    const lastUser = [...messages].reverse().find(message => message.role === 'user')
    return lastUser?.language ?? 'en'
  }, [input, messages])

  const copy = useMemo(() => copyFor(typedLanguage), [typedLanguage])
  const rtl = LANGUAGE_LABELS[typedLanguage].rtl

  // ── session key ───────────────────────────────────────────────────────────
  useEffect(() => {
    const storage = safeStorage()
    const stored = storage?.getItem(SESSION_KEY)
    if (stored) {
      setSessionKey(stored)
      return
    }
    const created = `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    storage?.setItem(SESSION_KEY, created)
    setSessionKey(created)
  }, [])

  // ── greeting, re-rendered when the language changes ───────────────────────
  useEffect(() => {
    setMessages(current => {
      const withoutGreeting = current.filter(message => message.id !== 'welcome')
      return [
        {
          id: 'welcome',
          role: 'assistant',
          content: copy.greeting,
          language: typedLanguage
        },
        ...withoutGreeting
      ]
    })
  }, [copy.greeting, typedLanguage])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, busy])


  /** Appends to the last assistant message — used while streaming. */
  const appendToLast = useCallback((id: string, text: string) => {
    setMessages(current =>
      current.map(message =>
        message.id === id ? { ...message, content: message.content + text } : message
      )
    )
  }, [])

  const patchMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages(current => current.map(message => (message.id === id ? { ...message, ...patch } : message)))
  }, [])

  /**
   * Sends the question and streams the answer.
   */
  async function send(text: string) {
    const question = text.trim()
    if (!question || busy) return

    const questionLanguage = detectLanguage(question).language
    const answerId = `a_${Date.now()}`

    setMessages(current => [
      ...current,
      { id: `u_${Date.now()}`, role: 'user', content: question, language: questionLanguage },
      {
        id: answerId,
        role: 'assistant',
        content: '',
        language: questionLanguage,
        streaming: true
      }
    ])
    setInput('')
    setBusy(true)

    const payload = { message: question, sessionKey, stream: true }

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(payload)
      })

      const contentType = response.headers.get('content-type') ?? ''

      // ---------------------------------------------------------- SSE path
      if (response.ok && contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let answered = false

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // SSE frames are separated by a blank line.
          let separator = buffer.indexOf('\n\n')
          while (separator !== -1) {
            const frame = buffer.slice(0, separator)
            buffer = buffer.slice(separator + 2)
            separator = buffer.indexOf('\n\n')

            const eventLine = frame.split('\n').find(line => line.startsWith('event:'))
            const dataLine = frame.split('\n').find(line => line.startsWith('data:'))
            if (!eventLine || !dataLine) continue

            const event = eventLine.slice(6).trim()
            let data: Record<string, unknown> = {}
            try {
              data = JSON.parse(dataLine.slice(5).trim())
            } catch {
              continue
            }

            if (event === 'meta') {
              answered = true
              patchMessage(answerId, {
                language: (data.language as AssistantLanguage) ?? questionLanguage,
                source: data.source as string,
                realtime: Boolean(data.realtime),
                live: data.live as Message['live'],
                escalate: Boolean(data.escalate),
                relatedPages: (data.relatedPages as Message['relatedPages']) ?? []
              })
            }

            if (event === 'delta' && typeof data.text === 'string') {
              appendToLast(answerId, data.text)
            }

            if (event === 'error' && typeof data.message === 'string') {
              appendToLast(answerId, `\n\n${data.message}`)
            }
          }
        }

        patchMessage(answerId, { streaming: false })
        if (!answered) throw new Error('stream produced no answer')
        return
      }

      // ------------------------------------------- JSON fallback (or an error)
      const data = await response.json().catch(() => null)

      if (!data?.answer) {
        patchMessage(answerId, {
          content: data?.error ?? copyFor(questionLanguage).errorMessage,
          streaming: false
        })
        return
      }

      patchMessage(answerId, {
        content: data.answer,
        language: data.language ?? questionLanguage,
        source: data.source,
        realtime: Boolean(data.realtime),
        live: data.live,
        escalate: Boolean(data.escalate),
        relatedPages: data.relatedPages ?? [],
        streaming: false
      })
    } catch {
      setMessages(current =>
        current.map(message =>
          message.id === answerId
            ? {
                ...message,
                content: message.content || copyFor(questionLanguage).errorMessage,
                streaming: false
              }
            : message
        )
      )
    } finally {
      setBusy(false)
    }
  }

  const detectionPreview = input.trim().length >= 3 ? detectLanguage(input) : null

  return (
    <div className="no-print fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-[70] flex flex-col items-end gap-3 sm:right-5">
      {displayContent(open ? (
        <div className="flex h-[560px] w-[min(94vw,392px)] flex-col overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-elevated">
          {/* header */}
          <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-gold-300" />
              <div>
                <p className="text-sm font-bold">PYPC Intelligence</p>
                <p className="flex items-center gap-1.5 text-[11px] text-primary-100">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Online · EN · اردو · Roman Urdu
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={displayContent(copy.closeLabel)}
              className="focus-ring rounded-md p-1 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          {/* quick actions — each opens a real PYPC destination and asks about it */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 bg-white px-3 py-2.5">
            {copy.quickActions.map(action => (
              <a
                key={action.href}
                href={action.href}
                onClick={() => setInput('')}
                className="focus-ring rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-[11px] font-bold text-primary transition hover:border-gold-300 hover:bg-white"
              >
                {displayContent(action.label)}
              </a>
            ))}
          </div>

          {/* conversation */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map(message => {
              const messageRtl = message.role === 'assistant' && message.language === 'ur'
              const liveFacts = message.live?.facts ?? []

              return (
                <div key={message.id} className="space-y-2">
                  <div
                    dir={message.role === 'assistant' && message.language === 'ur' ? 'rtl' : 'ltr'}
                    className={
                      message.role === 'user'
                        ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm leading-6 text-white'
                        : 'max-w-[92%] whitespace-pre-line rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2.5 text-sm leading-6 text-slate-700'
                    }
                  >
                    {displayContent(message.content)}
                    {displayContent(message.streaming ? (
                      <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-primary-300 align-middle" />
                    ) : null)}
                  </div>

                  {/* live cards: the figures the answer was built from, stamped */}
                  {displayContent(message.role === 'assistant' && liveFacts.length ? (
                    <div className="max-w-[92%] space-y-1.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                        <Activity size={11} />
                        {displayContent(copy.liveBadge)}
                        {displayContent(message.live?.readAt ? (
                          <span className="font-medium normal-case tracking-normal text-slate-500">
                            · {displayContent(new Date(message.live.readAt).toLocaleTimeString())}
                          </span>
                        ) : null)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {liveFacts.slice(0, 6).map(fact => (
                          <span
                            key={fact.key}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900"
                          >
                            {displayContent(fact.label)}: <span className="font-bold">{displayContent(fact.value)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null)}

                  {/* source + language badges */}
                  {displayContent(message.role === 'assistant' && !message.streaming && message.content ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      {displayContent(message.language ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          {displayContent(LANGUAGE_LABELS[message.language].code)}
                        </span>
                      ) : null)}
                      {displayContent(message.source ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          {displayContent(message.source === 'openai' ? copy.modelBadge : copy.knowledgeBadge)}
                        </span>
                      ) : null)}
                      {displayContent(message.realtime ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
                          {displayContent(copy.liveBadge)}
                        </span>
                      ) : null)}
                      {displayContent(message.escalate ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                          {displayContent(typedLanguage === 'en'
                            ? 'A team member will follow up'
                            : typedLanguage === 'ur'
                              ? 'ٹیم ممبر رابطہ کرے گا'
                              : 'Team member rabta karega')}
                        </span>
                      ) : null)}
                    </div>
                  ) : null)}

                  {displayContent(message.relatedPages?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {message.relatedPages.slice(0, 4).map(page => (
                        <a
                          key={page.href}
                          href={page.href}
                          className="rounded-lg border border-primary-100 bg-white px-2.5 py-1 text-[11px] font-bold text-primary hover:border-gold-300"
                        >
                          {displayContent(page.label)} →
                        </a>
                      ))}
                    </div>
                  ) : null)}
                </div>
              )
            })}

            {displayContent(busy ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Loader2 size={14} className="animate-spin" />
                {displayContent(copy.thinking)}
              </div>
            ) : null)}

            {displayContent(messages.length <= 2 ? (
              <div className="space-y-2 pt-2" dir={rtl ? 'rtl' : 'ltr'}>
                {copy.suggestions.map(question => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => send(question)}
                    className="focus-ring block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:border-primary-200 hover:text-primary"
                  >
                    {displayContent(question)}
                  </button>
                ))}
              </div>
            ) : null)}
          </div>

          {/* composer */}
          <form
            onSubmit={event => {
              event.preventDefault()
              send(input)
            }}
            className="border-t border-slate-100 bg-white p-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder={displayContent(copy.placeholder)}
                aria-label={displayContent(copy.placeholder)}
                dir={rtl ? 'rtl' : 'ltr'}
                lang={typedLanguage === 'ur' ? 'ur' : undefined}
                className="focus-ring h-11 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label={displayContent(copy.sendLabel)}
                className="focus-ring flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50"
              >
                <Send size={17} className={rtl ? '-scale-x-100' : undefined} />
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>{displayContent(copy.note)}</span>
              {displayContent(detectionPreview ? (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
                  {displayContent(LANGUAGE_LABELS[detectionPreview.language].label)}
                </span>
              ) : null)}
            </div>
          </form>
        </div>
      ) : null)}


      <button
        type="button"
        data-cursor="Ask AI"
        onClick={() => {
          setOpen(open => !open)
        }}
        className="focus-ring flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-elevated ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-primary-800"
        aria-label={displayContent(copy.openLabel)}
      >
        <MessageSquare size={19} />
        <span className="hidden sm:inline">Ask PYPC AI</span>
      </button>
    </div>
  )
}
