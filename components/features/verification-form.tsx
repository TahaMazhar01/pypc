'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { CheckCircle2, Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

const EXAMPLES = ['PYPC-XXXX-XXXX-XXXX']

export function VerificationForm({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = code.trim().toUpperCase()
    if (clean.length < 8) {
      setError('Enter the full certificate code, for example PYPC-A2B4-C6D8-E9F1.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/certificates/verify?code=${encodeURIComponent(clean)}`)
      const data = await response.json()

      if (!data?.found) {
        setError('No certificate found with that code. Check the printed code and try again.')
        return
      }

      window.location.href = `/verify/${encodeURIComponent(clean)}`
    } catch {
      setError('Verification service is temporarily unavailable. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={code}
          onChange={event => setCode(event.target.value.toUpperCase())}
          placeholder="PYPC A2B4 C6D8 E9F1"
          aria-label="Certificate code"
          className="h-12 font-mono tracking-widest sm:flex-1"
        />
        <Button type="submit" size="lg" disabled={busy} className="sm:w-48">
          {displayContent(busy ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />)}
          {displayContent(busy ? 'Verifying…' : 'Verify certificate')}
        </Button>
      </div>

      {displayContent(error ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {displayContent(error)}
        </p>
      ) : (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 size={14} className="text-primary" />
          Codes look like {displayContent(EXAMPLES[0])}. Scanning the QR code on a certificate opens the same record.
        </p>
      ))}
    </form>
  )
}
