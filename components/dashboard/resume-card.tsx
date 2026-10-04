'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, FileText, Loader2, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { FileUpload } from '@/components/ui/file-upload'

/**
 * Member CV card: upload, replace and remove the resume attached to the
 * profile. The secretariat sees this file when reviewing applications.
 */
export function ResumeCard({ initialUrl }: { initialUrl: string | null }) {
  const router = useRouter()
  const [resumeUrl, setResumeUrl] = useState<string | null>(initialUrl)
  const [pending, setPending] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function persist(url: string | null, label: string) {
    setPending(label)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/dashboard/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeUrl: url })
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data?.error ?? 'The change could not be saved.')
        return
      }

      setResumeUrl(data.resumeUrl)
      setMessage(url ? 'CV attached to your profile.' : 'CV removed from your profile.')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setPending(null)
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-extrabold text-slate-900">CV / resume</h2>
      <p className="mt-1 text-sm text-slate-600">
        Attach an up to date CV so programme reviewers and partner institutions can assess your profile
        without asking for it again. Files are stored privately and served only to you and PYPC staff.
      </p>

      {displayContent(resumeUrl ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <CheckCircle2 size={16} /> CV on file
          </span>
          <div className="flex items-center gap-3">
            <Link
              href={resumeUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800"
            >
              <FileText size={13} /> Open
            </Link>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => persist(null, 'remove')}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50"
            >
              {displayContent(pending === 'remove' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />)}
              Remove
            </button>
          </div>
        </div>
      ) : null)}

      <div className="mt-5">
        <FileUpload
          label={resumeUrl ? 'Replace CV' : 'Upload CV'}
          hint="PDF or Word document, up to 4 MB."
          onUploaded={(url, name) => {
            if (url) persist(url, name ?? 'upload')
          }}
        />
      </div>

      {displayContent(message ? <p className="mt-3 text-sm font-semibold text-emerald-700">{displayContent(message)}</p> : null)}
      {displayContent(error ? <p className="mt-3 text-sm font-semibold text-rose-600">{displayContent(error)}</p> : null)}
    </Card>
  )
}
