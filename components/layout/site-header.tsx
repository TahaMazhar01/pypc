import Link from 'next/link'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { Logo } from './logo'
import { HeaderNav } from './header-nav'

/**
 * Server component: resolves the signed-in user once, then hands the state to
 * the client navigation shell (mobile menu, dropdown, logout).
 */
export async function SiteHeader() {
  const user = await getCurrentUser()

  const account = user
    ? {
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
        admin: isAdmin(user.role),
        executive: ['EXECUTIVE', 'MODERATOR'].includes(user.role)
      }
    : null

  return (
    <header className="site-header sticky top-0 z-50 border-b border-primary-100 bg-white/95 backdrop-blur">
      <div className="container flex h-[88px] lg:h-24 items-center justify-between gap-4">
        <Logo emblemSize={64} />
        <HeaderNav account={account} />
      </div>
    </header>
  )
}

export function HeaderSkipLink() {
  return (
    <Link
      href="#main"
      className="focus-ring sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
    >
      Skip to content
    </Link>
  )
}
