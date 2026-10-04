import type { Metadata } from 'next'
import { PolicyDocumentView } from '@/components/layout/policy-document'
import { policies } from '@/lib/data/policies'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'Every cookie and browser-storage entry the PYPC platform sets — session, theme, CSRF guards — what each does, how long it lasts, and how to refuse optional analytics.',
  alternates: { canonical: '/cookies' }
}

export default function CookiePolicyPage() {
  return <PolicyDocumentView document={policies.cookies} />
}
