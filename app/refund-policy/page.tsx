import type { Metadata } from 'next'
import { PolicyDocumentView } from '@/components/layout/policy-document'
import { policies } from '@/lib/data/policies'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'When and how PYPC membership and programme fees are refunded.'
}

export default function RefundPolicyPage() {
  return <PolicyDocumentView document={policies['refund-policy']} />
}
