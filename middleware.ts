import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

/** Early signature/expiry filtering only. Database guards enforce permissions and revocation. */
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'pypc_session'
const PROTECTED_PREFIXES = ['/dashboard', '/admin']

async function readSignedSession(token: string | undefined): Promise<string | null> {
  if (!token) return null
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: 'pypc.org.pk', algorithms: ['HS256']
    })
    return typeof payload.sessionId === 'string' && payload.jti === payload.sessionId ? 'SIGNED_SESSION' : null
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

  const token = request.cookies.get(COOKIE_NAME)?.value
  const hasSession = Boolean(isProtected && token && await readSignedSession(token))

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  // Login resolves the database session; cookie-only redirects cause loops
  // after logout/revocation. Each page separately checks current permissions.
  const response = NextResponse.next()
  if (isProtected || pathname.startsWith('/api/admin')) {
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Content-Security-Policy', "frame-ancestors 'none'")
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
