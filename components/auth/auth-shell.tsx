import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowUpRight, GraduationCap, Users, Sparkles, MailWarning } from 'lucide-react'
import { PypcEmblem } from '@/components/layout/logo'
import './auth.css'

export function AuthShell({ mode, localPreview, children }: { mode: 'login' | 'register'; localPreview: boolean; children: React.ReactNode }) {
  const signingUp = mode === 'register'
  return (
    <section className="auth-page" aria-labelledby="auth-heading">
      <div className="auth-container">
        <div className="auth-topline">
          <Link href="/" className="auth-back"><ArrowLeft size={15} aria-hidden="true" /> Back to PYPC</Link>
          <span>THE PYPC COMMUNITY</span>
        </div>
        <div className="auth-card">
          <aside className="auth-story" aria-label="Welcome to the PYPC community">
            <div className="auth-story-copy">
              <div className="auth-brand"><span className="auth-seal"><PypcEmblem size={48} /></span><span>Pakistan Youth<br />Parliamentary Council</span></div>
              <p className="auth-eyebrow">Your voice. Our future.</p>
              <h2>A place to belong.<br /><span>A platform to lead.</span></h2>
              <p className="auth-story-intro">Connect with a community shaping the next chapter of Pakistan.</p>
              <ul className="auth-benefits">
                <li><GraduationCap size={20} aria-hidden="true" /><span><strong>Learn with purpose</strong><small>Programmes that turn ambition into action.</small></span></li>
                <li><Users size={20} aria-hidden="true" /><span><strong>Find your community</strong><small>Meet young people who share your drive.</small></span></li>
                <li><Sparkles size={20} aria-hidden="true" /><span><strong>Make your contribution</strong><small>Take part, grow and build your record.</small></span></li>
              </ul>
            </div>
            <div className="auth-story-photo">
              <Image src="/images/editorial/parliament-hero.webp" alt="Parliament House in Islamabad" fill sizes="(min-width: 1024px) 450px, 1px" className="object-cover" />
              <div className="auth-photo-shade" />
              <Link href="/about">Discover the council <ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </aside>
          <div className="auth-form-panel">
            <nav className="auth-tabs" aria-label="Account access">
              <Link href="/login" aria-current={!signingUp ? 'page' : undefined}>Sign in</Link>
              <Link href="/register" aria-current={signingUp ? 'page' : undefined}>Create account</Link>
            </nav>
            <div className="auth-form-heading">
              <p className="auth-kicker">{signingUp ? 'Start your journey' : 'Good to see you again'}</p>
              <h1 id="auth-heading">{signingUp ? 'Your future starts here.' : 'Welcome back.'}</h1>
              <p>{signingUp ? 'Create your free PYPC account. A few details, then you’re on your way.' : 'Sign in to your PYPC account and pick up where you left off.'}</p>
            </div>
            {localPreview && <div className="auth-preview-note" role="note"><MailWarning size={18} aria-hidden="true" /><div><strong>Local preview · Email delivery is off</strong><p>New accounts stay pending. No verification email is sent. Use the provided preview account to explore the dashboard.</p></div></div>}
            {children}
            <p className="auth-help">Need a hand? <Link href="/contact">Contact the PYPC team <ArrowUpRight size={13} aria-hidden="true" /></Link></p>
          </div>
        </div>
        <p className="auth-footnote">Learn. Participate. Lead.<span aria-hidden="true">·</span><Link href="/privacy">Privacy</Link><span aria-hidden="true">·</span><Link href="/terms">Terms</Link></p>
      </div>
    </section>
  )
}
