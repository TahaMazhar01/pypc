'use client'


import { displayContent } from '@/lib/display-content'
import { useEffect, useRef, useState } from 'react'
import { Award, ChevronLeft, ChevronRight, FileText, Landmark, Scale, Quote } from 'lucide-react'
import { useInView } from '@/components/three/utils'
import { correspondenceRecords } from '@/lib/data/correspondence'
import type { CorrespondenceRecord } from '@/lib/data/correspondence'

/**
 * Connecting-dots network: a lightweight 2D canvas of drifting nodes linked
 * when they come near each other. Uses 2D canvas (not WebGL) so it costs
 * almost nothing and can run alongside the three.js scenes.
 */
export function ConnectingDots({ className = '', density = 62 }: { className?: string; density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { ref: viewRef, inView } = useInView<HTMLDivElement>('200px')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !inView) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1

    type Node = { x: number; y: number; vx: number; vy: number; r: number }
    let nodes: Node[] = []
    const pointer = { x: -999, y: -999 }

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas!.width = Math.floor(width * dpr)
      canvas!.height = Math.floor(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.min(density, Math.max(28, Math.round((width * height) / 16000)))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.9
      }))
    }

    function onMove(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
    }
    function onLeave() {
      pointer.x = -999
      pointer.y = -999
    }

    let frame = 0
    function draw() {
      ctx!.clearRect(0, 0, width, height)

      for (const node of nodes) {
        if (!reduced) {
          node.x += node.vx
          node.y += node.vy
        }
        if (node.x < 0 || node.x > width) node.vx *= -1
        if (node.y < 0 || node.y > height) node.vy *= -1
      }

      // links between nearby nodes
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const distance = Math.hypot(dx, dy)
          if (distance < 132) {
            ctx!.strokeStyle = `rgba(212,175,55,${(1 - distance / 132) * 0.4})`
            ctx!.lineWidth = 0.7
            ctx!.beginPath()
            ctx!.moveTo(nodes[i].x, nodes[i].y)
            ctx!.lineTo(nodes[j].x, nodes[j].y)
            ctx!.stroke()
          }
        }
      }

      // cursor links
      if (pointer.x > -900) {
        for (const node of nodes) {
          const distance = Math.hypot(node.x - pointer.x, node.y - pointer.y)
          if (distance < 170) {
            ctx!.strokeStyle = `rgba(131,201,173,${(1 - distance / 170) * 0.5})`
            ctx!.lineWidth = 0.8
            ctx!.beginPath()
            ctx!.moveTo(node.x, node.y)
            ctx!.lineTo(pointer.x, pointer.y)
            ctx!.stroke()
          }
        }
      }

      for (const node of nodes) {
        ctx!.fillStyle = 'rgba(131,201,173,0.85)'
        ctx!.beginPath()
        ctx!.arc(node.x, node.y, node.r, 0, Math.PI * 2)
        ctx!.fill()
      }

      frame = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    // <ViewportSync /> publishes one coalesced re-measure per frame; listening to
    // it keeps the canvas sharp when the on-screen keyboard or a rotate happens
    // without a classic window resize.
    window.addEventListener('pypc:resize', resize)
    canvas.addEventListener('pointermove', onMove, { passive: true })
    canvas.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pypc:resize', resize)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [inView, density])

  return (
    <div ref={viewRef} className={`relative ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}

/**
 * Auto-rotating record slider.
 *
 * Deliberately shows PYPC's *documented* correspondence (real reference
 * numbers, dates and recipients) instead of invented testimonials.
 */
export function CorrespondenceSlider() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const records: CorrespondenceRecord[] = correspondenceRecords

  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => {
      setIndex(current => (current + 1) % records.length)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [paused, records.length])

  const record = records[index]
  const icons = { 'Institutional outreach': Landmark, 'Governance & legal': Scale, Programmes: Award }
  const IconComponent = icons[record.category]

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-7 backdrop-blur sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-300">
            <IconComponent size={22} />
          </span>
          <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-100">
            {displayContent(record.status)}
          </span>
        </div>

        <p className="mt-6 font-mono text-xs font-bold text-gold-300">{displayContent(record.reference)}</p>
        <h3 className="mt-2 text-xl font-extrabold text-white sm:text-2xl">{displayContent(record.title)}</h3>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-200">
          {displayContent(record.date)} · {displayContent(record.recipient)}
        </p>

        <p className="mt-5 flex gap-3 text-sm leading-7 text-primary-100">
          <Quote size={18} className="mt-1 shrink-0 text-gold-700" />
          {displayContent(record.summary)}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={record.document}
            target="_blank"
            rel="noreferrer noopener"
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-xs font-bold text-white transition hover:border-gold-300 hover:text-gold-200"
          >
            <FileText size={14} /> Open source document
          </a>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-200">
            {displayContent(record.category)}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {records.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={displayContent(`Show record ${itemIndex + 1}: ${item.title}`)}
              onClick={() => setIndex(itemIndex)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                itemIndex === index ? 'w-8 bg-gold-400' : 'w-3 bg-white/25 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous record"
            onClick={() => setIndex(current => (current - 1 + records.length) % records.length)}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-gold-300 hover:text-gold-200"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next record"
            onClick={() => setIndex(current => (current + 1) % records.length)}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-gold-300 hover:text-gold-200"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Animated capability bars (the "skills" analogue for an institution). */
export function CapabilityBars({
  items
}: {
  items: { label: string; value: number; note?: string }[]
}) {
  const { ref, inView } = useInView<HTMLDivElement>('140px')

  return (
    <div ref={ref} className="space-y-6">
      {items.map((item, index) => (
        <div key={item.label}>
          <div className="flex items-end justify-between gap-4">
            <p className="text-sm font-bold text-slate-800">{displayContent(item.label)}</p>
            <p className="font-mono text-xs font-bold text-gold-700">{displayContent(item.value)}%</p>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-primary-500 to-gold-400 transition-[width] duration-1000 ease-out"
              style={{
                width: inView ? `${item.value}%` : '0%',
                transitionDelay: `${index * 110}ms`
              }}
            />
          </div>

          {displayContent(item.note ? <p className="mt-1.5 text-xs text-slate-500">{displayContent(item.note)}</p> : null)}
        </div>
      ))}
    </div>
  )
}
