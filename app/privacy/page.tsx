import type { Metadata } from 'next'
import { PolicyDocumentView } from '@/components/layout/policy-document'
import { policies } from '@/lib/data/policies'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How the Pakistan Youth Parliamentary Council collects, uses, protects and retains personal information.'
}

export default function PrivacyPolicyPage() {
  return <PolicyDocumentView document={policies.privacy} />
}
