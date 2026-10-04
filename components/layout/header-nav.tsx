'use client'


import { displayContent } from '@/lib/display-content'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  Globe2,
  LayoutDashboard,
  Linkedin,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONTACT_EMAIL, navigationItems, navigationMore } from '@/lib/constants'
import { SOCIAL_PROFILES } from '@/lib/social'
import { SocialChannelLink } from '@/components/ui/social-link'
import { buttonVariants } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export type HeaderAccount = {
  name: string
  email: string
  role: string
  admin: boolean
  executive: boolean
} | null

export function HeaderNav({ account }: { account: HeaderAccount }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
    setMoreOpen(false)
  }, [pathname])

  /**
   * Real-time breakpoint reaction (published by <ViewportSync />):
   * rotating the phone or widening the window past the desktop breakpoint closes
   * the overlay and the dropdowns immediately, so no menu is ever left floating
   * over the desktop layout. Also closes on Escape for keyboard users.
   */
  useEffect(() => {
    function onBreakpoint(event: Event) {
      const size = (event as CustomEvent<{ size: string }>).detail?.size
      if (size === 'lg' || size === 'xl') {
        setMobileOpen(false)
        setMenuOpen(false)
        setMoreOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMobileOpen(false)
      setMenuOpen(false)
      setMoreOpen(false)
    }

    window.addEventListener('pypc:breakpoint', onBreakpoint)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pypc:breakpoint', onBreakpoint)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // Full-screen overlay: lock body scroll while it is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false)
      if (moreRef.current && !moreRef.current.contains(target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function logout() {
    setBusy(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    setBusy(false)
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))

  const moreActive = navigationMore.some(item => isActive(item.href))

  return (
    <>
      <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
        {navigationItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'focus-ring relative rounded-lg px-3 py-2 text-sm font-semibold transition',
                active ? 'text-primary' : 'text-slate-700 hover:text-primary'
              )}
            >
              {displayContent(item.label)}
              <span
                className={cn(
                  'absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-gold-400 to-primary-400 transition-all duration-300',
                  active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                )}
              />
            </Link>
          )
        })}

        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen(open => !open)}
            aria-expanded={moreOpen}
            aria-haspopup="true"
            className={cn(
              'focus-ring inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
              moreActive ? 'text-primary' : 'text-slate-700 hover:text-primary'
            )}
          >
            More <ChevronDown size={15} className={cn('transition-transform', moreOpen && 'rotate-180')} />
          </button>

          {displayContent(moreOpen ? (
            <div className="absolute left-0 top-full z-50 mt-2 grid w-64 gap-1 rounded-2xl border border-slate-100 bg-white p-2 shadow-elevated">
              {navigationMore.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'focus-ring rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-primary'
                  )}
                >
                  {displayContent(item.label)}
                </Link>
              ))}
              {/* Appearance lives here rather than in the top bar: the bar
                  keeps only the logo, navigation and the account control, and
                  everything secondary sits behind the three lines. */}
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-slate-100 px-1 pt-3">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Appearance
                </span>
                <ThemeToggle className="border-slate-200" />
              </div>

              {/* Every official account, so the mobile menu offers the same
                  channels as the footer. */}
              <div className="mt-1 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {SOCIAL_PROFILES.map(profile => (
                  <SocialChannelLink
                    key={profile.id}
                    channel={profile}
                    showHandle={false}
                    className="focus-ring flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-primary-200 hover:text-primary"
                  />
                ))}
              </div>
            </div>
          ) : null)}
        </div>
      </nav>

      <div className="hidden items-center gap-3 lg:flex">
        {displayContent(account ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(open => !open)}
              className="focus-ring flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-primary-200 hover:text-primary"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {displayContent(account.name
                  .split(' ')
                  .map(part => part.charAt(0))
                  .join('')
                  .slice(0, 2)
                  .toUpperCase())}
              </span>
              <span className="max-w-[130px] truncate">{displayContent(account.name)}</span>
              <ChevronDown size={16} />
            </button>

            {displayContent(menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-elevated"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-bold text-slate-900">{displayContent(account.name)}</p>
                  <p className="truncate text-xs text-slate-500">{displayContent(account.email)}</p>
                  <p className="mt-1 inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {displayContent(account.role.replace('_', ' '))}
                  </p>
                </div>

                <Link
                  href="/dashboard"
                  role="menuitem"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary"
                >
                  <LayoutDashboard size={16} /> Member Dashboard
                </Link>

                <Link
                  href="/dashboard/profile"
                  role="menuitem"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary"
                >
                  <UserRound size={16} /> My Profile
                </Link>

                {displayContent(account.admin || account.executive ? (
                  <Link
                    href="/admin"
                    role="menuitem"
                    className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-primary-50 hover:text-primary"
                  >
                    <ShieldCheck size={16} /> Admin Panel
                  </Link>
                ) : null)}

                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={logout}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                >
                  <LogOut size={16} /> {displayContent(busy ? 'Signing out…' : 'Sign out')}
                </button>
              </div>
            ) : null)}
          </div>
        ) : (
          <>
            <Link
              href="/login"
              className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-50"
            >
              Login
            </Link>
            <Link href="/register" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              Join PYPC
            </Link>
          </>
        ))}
      </div>

      <button
        type="button"
        data-cursor={mobileOpen ? 'Close' : 'Menu'}
        className="focus-ring relative z-[190] inline-flex rounded-md p-2 text-primary lg:hidden"
        onClick={() => setMobileOpen(open => !open)}
        aria-label={displayContent(mobileOpen ? 'Close navigation' : 'Open navigation')}
        aria-expanded={mobileOpen}
      >
        {displayContent(mobileOpen ? <X size={26} /> : <Menu size={26} />)}
      </button>

      {/* Mobile hamburger overlay: full screen, staggered links, contact rail */}
      <div
        aria-hidden={!mobileOpen}
        className={cn(
          'fixed inset-0 z-[180] flex flex-col bg-primary-900 lg:hidden',
          'transition-all duration-500',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="orb orb-gold absolute -left-10 top-16 h-56 w-56" />
          <div className="orb orb-emerald absolute -right-12 bottom-24 h-64 w-64" />
          <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />
        </div>

        <div className="relative mt-[88px] flex-1 overflow-y-auto px-6 pb-10">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-primary-200">
            <Globe2 size={13} /> Navigate
          </p>

          <nav className="mt-5 grid gap-1" aria-label="Mobile navigation">
            {[...navigationItems, ...navigationMore].map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ transitionDelay: mobileOpen ? `${index * 34}ms` : '0ms' }}
                className={cn(
                  'focus-ring flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3.5 text-lg font-bold text-white transition-all duration-500',
                  mobileOpen ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0',
                  isActive(item.href) ? 'bg-gold-500/15 text-gold-200' : 'hover:bg-white/5'
                )}
              >
                {displayContent(item.label)}
                <span className="font-mono text-[11px] font-semibold text-primary-200">
                  {displayContent(String(index + 1).padStart(2, '0'))}
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-8">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-primary-200">
              Appearance
            </p>
            <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-white">Theme</span>
              <ThemeToggle
                className="border-white/15 bg-white/5 [&_button]:text-primary-100 [&_button[aria-checked=true]]:bg-white/15 [&_button[aria-checked=true]]:text-white"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {displayContent(account ? (
              <>
                <Link href="/dashboard" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
                  Member Dashboard
                </Link>
                {displayContent(account.admin || account.executive ? (
                  <Link href="/admin" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                    Admin Panel
                  </Link>
                ) : null)}
                <button
                  type="button"
                  onClick={logout}
                  disabled={busy}
                  className={buttonVariants({ variant: 'subtle', size: 'lg' })}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link href="/login" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                  Login
                </Link>
                <Link href="/register" className={buttonVariants({ variant: 'gold', size: 'lg' })}>
                  Join PYPC
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-primary-100">Follow PYPC:</span>
            {SOCIAL_PROFILES.map(profile => (
              <SocialChannelLink
                key={profile.id}
                channel={profile}
                showHandle={false}
                className="focus-ring inline-flex items-center gap-1.5 text-sm font-semibold text-primary-100 hover:text-gold-200"
              />
            ))}
          </div>

          <p className="mt-6 text-xs leading-6 text-primary-200">
            Pakistan Youth Parliamentary Council · Islamabad
            <br />
            {displayContent(CONTACT_EMAIL)}
          </p>
        </div>
      </div>
    </>
  )
}
