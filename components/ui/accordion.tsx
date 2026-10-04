
import { displayContent } from '@/lib/display-content'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Accessible accordion built on native <details>/<summary> so it works without
 * JavaScript and stays keyboard-operable by default.
 */
export function Accordion({
  items,
  className,
  defaultOpen = 0
}: {
  items: { question: string; answer: string }[]
  className?: string
  defaultOpen?: number | null
}) {
  return (
    <div className={cn('divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white', className)}>
      {items.map((item, index) => (
        <details key={item.question} open={defaultOpen === index} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            {displayContent(item.question)}
            <ChevronDown
              size={18}
              className="shrink-0 text-gold-600 transition-transform duration-300 group-open:rotate-180"
            />
          </summary>
          <div className="px-5 pb-5 text-sm leading-7 text-slate-600">{displayContent(item.answer)}</div>
        </details>
      ))}
    </div>
  )
}
