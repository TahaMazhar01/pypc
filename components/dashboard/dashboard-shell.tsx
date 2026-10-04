'use client'


import { displayContent } from '@/lib/display-content'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'

export type NavItem = { label: string; href: string; icon: string }

export function DashboardShell({
  nav,
  title,
  subtitle,
  children,
  accent = 'primary'
}: {
  nav: NavItem[]
  title: string
  subtitle: string
  children: React.ReactNode
  accent?: 'primary' | 'slate'
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(`${href}/`))

  return (
    <div className="bg-slate-50">
      <div className="container flex flex-col gap-8 py-8 lg:flex-row">
        {/* Sidebar */}
        <aside className="lg:w-64 lg:shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <p className="text-sm font-extrabold text-slate-900">Menu</p>
              <button
                type="button"
                onClick={() => setOpen(value => !value)}
                className="focus-ring rounded-md p-1.5 text-primary"
                aria-label={displayContent(open ? 'Close menu' : 'Open menu')}
                aria-expanded={open}
              >
                {displayContent(open ? <X size={20} /> : <Menu size={20} />)}
              </button>
            </div>

            <nav
              className={cn('mt-3 space-y-1 lg:mt-0 lg:block', open ? 'block' : 'hidden')}
              aria-label="Dashboard navigation"
            >
              {nav.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'focus-ring flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                    isActive(item.href)
                      ? accent === 'primary'
                        ? 'bg-primary text-white'
                        : 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-primary-50 hover:text-primary'
                  )}
                >
                  <Icon name={item.icon} size={18} />
                  {displayContent(item.label)}
                </Link>
              ))}
            </nav>

            <div className="mt-4 hidden rounded-xl bg-slate-50 p-4 lg:block">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Need help?</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">
                The AI Assistant answers membership, programme and certificate questions instantly.
              </p>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <header className="mb-6">
            <h1 className="text-2xl font-extrabold text-primary-900 sm:text-3xl">{displayContent(title)}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{displayContent(subtitle)}</p>
          </header>

          {displayContent(children)}
        </div>
      </div>
    </div>
  )
}
