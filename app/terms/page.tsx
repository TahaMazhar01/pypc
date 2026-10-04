import type { Metadata } from 'next'
import { PolicyDocumentView } from '@/components/layout/policy-document'
import { policies } from '@/lib/data/policies'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms governing use of the PYPC platform, membership, programmes and certificates.'
}

export default function TermsPage() {
  return <PolicyDocumentView document={policies.terms} />
}
