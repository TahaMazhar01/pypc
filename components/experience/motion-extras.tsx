'use client'


import { displayContent } from '@/lib/display-content'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Magnetic hover: the element follows the cursor slightly and springs back.
 * Used on primary calls-to-action so buttons feel physically connected.
 */
export function Magnetic({
  children,
  className,
  strength = 18
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches) return

    function onMove(event: PointerEvent) {
      const rect = element!.getBoundingClientRect()
      const relX = event.clientX - (rect.left + rect.width / 2)
      const relY = event.clientY - (rect.top + rect.height / 2)
      const distance = Math.hypot(relX, relY)
      const radius = Math.max(rect.width, rect.height) * 1.1

      if (distance < radius) {
        const pull = 1 - distance / radius
        element!.style.transform = `translate3d(${(relX / rect.width) * strength * pull * 2}px, ${
          (relY / rect.height) * strength * pull * 2
        }px, 0)`
      } else {
        element!.style.transform = 'translate3d(0,0,0)'
      }
    }

    function reset() {
      element!.style.transform = 'translate3d(0,0,0)'
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', reset)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', reset)
    }
  }, [strength])

  return (
    <span
      ref={ref}
      className={cn('inline-block transition-transform duration-300 ease-out will-change-transform', className)}
    >
      {displayContent(children)}
    </span>
  )
}

/**
 * Typewriter that cycles through phrases with a blinking caret.
 */
export function Typewriter({
  phrases,
  className,
  typingSpeed = 62,
  deletingSpeed = 32,
  holdTime = 1900
}: {
  phrases: string[]
  className?: string
  typingSpeed?: number
  deletingSpeed?: number
  holdTime?: number
}) {
  const [text, setText] = useState('')
  const [index, setIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const phrase = phrases[index % phrases.length]
    let timer: number

    if (!deleting && text.length < phrase.length) {
      timer = window.setTimeout(() => setText(phrase.slice(0, text.length + 1)), typingSpeed)
    } else if (!deleting && text.length === phrase.length) {
      timer = window.setTimeout(() => setDeleting(true), holdTime)
    } else if (deleting && text.length > 0) {
      timer = window.setTimeout(() => setText(phrase.slice(0, text.length - 1)), deletingSpeed)
    } else {
      timer = window.setTimeout(() => {
        setDeleting(false)
        setIndex(current => current + 1)
      }, 260)
    }

    return () => window.clearTimeout(timer)
  }, [text, deleting, index, phrases, typingSpeed, deletingSpeed, holdTime])

  return (
    <span className={className}>
      <span className="text-gradient-gold">{displayContent(text)}</span>
      <span className="typewriter-caret ml-1 inline-block h-[1em] w-[3px] translate-y-[2px] bg-gold-400 align-middle" />
    </span>
  )
}
