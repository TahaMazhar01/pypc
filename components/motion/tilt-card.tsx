
import { displayContent } from '@/lib/display-content'
import type { ReactNode } from 'react'
export function TiltCard({children, className = ''}: {children: ReactNode; className?: string; intensity?: number; glare?: boolean}) {
  return <div className={`editorial-card ${className}`}>{displayContent(children)}</div>
}
export function FloatLayer({children, className = ''}: {children: ReactNode; depth?: number; className?: string}) {
  return <div className={className}>{displayContent(children)}</div>
}
