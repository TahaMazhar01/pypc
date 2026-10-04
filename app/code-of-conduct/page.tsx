import type { Metadata } from 'next'
import { PolicyDocumentView } from '@/components/layout/policy-document'
import { policies } from '@/lib/data/policies'

export const metadata: Metadata = {
  title: 'Code of Conduct',
  description: 'Standards of behaviour expected of PYPC members, participants, volunteers, mentors and staff.'
}

export default function CodeOfConductPage() {
  return <PolicyDocumentView document={policies['code-of-conduct']} />
}
