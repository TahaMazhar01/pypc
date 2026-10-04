import { NextResponse } from 'next/server'
import { collectSystemHealth } from '@/lib/health'

/**
 * GET /api/status — machine-readable health for uptime monitors.
 *
 * Contains counts, statuses and booleans only: no secrets, no personal data.
 * Returns 200 when everything is healthy, 503 when something needs attention,
 * so a standard HTTP monitor can alert on it without parsing the body.
 */
export async function GET() {
  const report = await collectSystemHealth()

  return NextResponse.json(report, {
    status: report.overall === 'fail' ? 503 : 200,
    headers: { 'cache-control': 'no-store' }
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
