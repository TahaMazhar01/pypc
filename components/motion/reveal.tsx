'use client'


import { displayContent } from '@/lib/display-content'
import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  /**
   * Stagger delay. Values above 5 are read as milliseconds (`delay={index * 70}`),
   * smaller values as seconds (`delay={0.12}`) — both forms are used across the
   * codebase, so the component normalises them instead of guessing per page.
   */
  delay?: number
  className?: string
  /** Enter animation direction: up (default), left, right, scale or none. */
  direction?: 'up' | 'left' | 'right' | 'scale' | 'none'
}

const OFFSETS: Record<NonNullable<RevealProps['direction']>, { opacity: number; x?: number; y?: number; scale?: number }> = {
  up: { opacity: 0, y: 22 },
  left: { opacity: 0, x: -40 },
  right: { opacity: 0, x: 40 },
  scale: { opacity: 0, scale: 0.94 },
  none: { opacity: 1 }
}

export function Reveal({ children, delay = 0, className, direction = 'up' }: RevealProps) {
  const reducedMotion = useReducedMotion()
  const from = OFFSETS[direction]
  const to = direction === 'scale' ? { opacity: 1, scale: 1 } : { opacity: 1, x: 0, y: 0 }
  const delaySeconds = delay > 5 ? delay / 1000 : delay

  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reducedMotion ? {} : to}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.6, delay: delaySeconds, ease: [0.22, 1, 0.36, 1] }}
    >
      {displayContent(children)}
    </motion.div>
  )
}
