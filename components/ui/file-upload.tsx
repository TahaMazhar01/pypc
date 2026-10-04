'use client'


import { displayContent } from '@/lib/display-content'
import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Loader2, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const ACCEPTED_DOCUMENTS =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * Document upload control.
 *
 * Files are streamed to `/api/uploads/resume`, which verifies the real file
 * signature and stores them privately. The returned URL is handed back to the
 * parent form so the application / profile / visa request can record it.
 */
export function FileUpload({
  label = 'Attach document',
  hint = 'PDF or Word document, up to 4 MB.',
  onUploaded,
  className,
  disabled
}: {
  label?: string
  hint?: string
  onUploaded: (url: string | null, fileName?: string) => void
  className?: string
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function upload(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      setState('error')
      setError('File is too large. Maximum size is 4 MB.')
      return
    }
    setState('uploading')
    setError(null)

    const body = new FormData()
    body.append('file', file)

    try {
      const response = await fetch('/api/uploads/resume', { method: 'POST', body })
      const data = await response.json()

      if (!response.ok) {
        setState('error')
        setError(data?.error ?? 'Upload failed. Please try again.')
        return
      }

      setFileName(data.originalName ?? file.name)
      setState('done')
      onUploaded(data.url as string, data.originalName ?? file.name)
    } catch {
      setState('error')
      setError('Network error while uploading. Please check your connection.')
    }
  }

  function clear() {
    setState('idle')
    setFileName(null)
    setError(null)
    onUploaded(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={className}>
      <div
        onDragOver={event => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => {
          event.preventDefault()
          setDragging(false)
          if (disabled) return
          const file = event.dataTransfer.files?.[0]
          if (file) upload(file)
        }}
        className={cn(
          'rounded-2xl border border-dashed p-4 transition',
          dragging ? 'border-gold-400 bg-gold-50' : 'border-slate-300 bg-slate-50/60',
          disabled && 'opacity-60'
        )}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary ring-1 ring-slate-200">
            {displayContent(state === 'uploading' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : state === 'done' ? (
              <CheckCircle2 size={18} className="text-emerald-600" />
            ) : state === 'error' ? (
              <AlertTriangle size={18} className="text-rose-600" />
            ) : (
              <Paperclip size={18} />
            ))}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800">{displayContent(label)}</p>

            {displayContent(state === 'done' && fileName ? (
              <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-semibold text-emerald-700">
                <FileText size={13} /> {displayContent(fileName)}, uploaded privately
              </p>
            ) : (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {displayContent(hint)} Drag and drop, or{displayContent(' ')}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => inputRef.current?.click()}
                  className="focus-ring font-bold text-primary underline decoration-gold-300 underline-offset-2"
                >
                  choose a file
                </button>
                .
              </p>
            ))}

            {displayContent(error ? <p className="mt-2 text-xs font-semibold text-rose-600">{displayContent(error)}</p> : null)}

            {displayContent(state === 'done' ? (
              <button
                type="button"
                onClick={clear}
                className="focus-ring mt-2 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-600"
              >
                <X size={12} /> Remove file
              </button>
            ) : null)}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_DOCUMENTS}
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0]
            if (file) upload(file)
          }}
        />
      </div>
    </div>
  )
}
