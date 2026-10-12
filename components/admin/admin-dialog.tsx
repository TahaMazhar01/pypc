'use client'
import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

/** Native modal supplies focus containment, Escape, and top-layer stacking. */
export function AdminDialog({ title, children, onClose, busy = false }: { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    function trapTab(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !dialog?.open) return
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex]')].filter(node => !node.matches(':disabled') && node.tabIndex >= 0 && node.getClientRects().length > 0)
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (!first) { event.preventDefault(); dialog.focus(); return }
      if (!dialog.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', trapTab, true)
    return () => { document.removeEventListener('keydown', trapTab, true); dialog?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus() }
  }, [])
  return <dialog ref={ref} tabIndex={-1} className="admin-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <header className="admin-dialog-header"><h2 id={titleId}>{title}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20} /></button></header>
    <div className="admin-dialog-body">{children}</div>
  </dialog>
}
