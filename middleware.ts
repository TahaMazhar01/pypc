import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * Fast edge guard for protected areas.
 *
 * This only checks that a signed-in cookie is present so unauthenticated users
 * never even load a dashboard shell. The full verification (JWT signature,
 * account status, session version, role) happens server-side in
 * app/dashboard/layout.tsx and app/admin/layout.tsx via getCurrentUser(),
 * because Prisma cannot run on the edge runtime.
 */

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'pypc_session'
const PROTECTED_PREFIXES = ['/dashboard', '/admin']

/**
 * Mirror of `ADMIN_PANEL_ROLES` in lib/auth.ts.
 *
 * The role is read from the signed session token, so this check cannot be forged
 * by editing a cookie. It is a *second* line of defence, not a replacement for the
 * server-side check: the layout still re-checks against the database (account
 * status, session version), which is what actually protects the data.
 *
 * Why it is needed at all: a redirect thrown inside a layout during a streamed
 * render is delivered to the browser as a client-side navigation, so the HTTP
 * status is 200. Checking here means an unauthorised request receives a real 307
 * and never renders the admin shell — which matters for no-JavaScript clients,
 * for crawlers and for anyone reading the audit trail.
 */
const ADMIN_PANEL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'EXECUTIVE']

/**
 * Pages inside the panel that only admins may open — they publish, issue
 * certificates and settle payments. Executives and moderators review queues, so
 * they are sent back to the panel overview (never to an error screen).
 */
const ADMIN_ONLY_PREFIXES = ['/admin/users', '/admin/certificates', '/admin/payments']

async function readRole(token: string | undefined): Promise<string | null> {
  if (!token) return null
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: 'pypc.org.pk'
    })
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    // Expired, tampered or foreign token: treated as no session, and the
    // server-side check will settle it either way.
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (process.env.UI_PREVIEW_ONLY === 'true') {
    if (pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method)) {
      return NextResponse.json({ error: 'This is a design preview. Submissions and account actions are disabled.' }, { status: 403 })
    }
    if (PROTECTED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  const isProtected = PROTECTED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/')

  const token = request.cookies.get(COOKIE_NAME)?.value
  const hasSession = Boolean(token)

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  // Signed in but not entitled to the admin panel: a real 307, so the panel is
  // never rendered for them in the first place.
  if (isAdminArea && hasSession) {
    const role = await readRole(token)

    if (role && !ADMIN_PANEL_ROLES.includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }

    // Staff below admin on an admin-only page: back to the overview they can use.
    const adminOnly = ADMIN_ONLY_PREFIXES.some(
      prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
    if (adminOnly && role && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  // Signed-in users should not see the login/register screens again.
  if (hasSession && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
