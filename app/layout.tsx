
import { displayContent } from '@/lib/display-content'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { AiAssistant } from '@/components/features/ai-assistant'
import { SiteExperience } from '@/components/experience/site-experience'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ViewportSync } from '@/components/experience/viewport-sync'
import { ConnectionStatus } from '@/components/experience/connection-status'
import { themeInitScript } from '@/lib/theme'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { OrganisationSchema, WebsiteSchema } from '@/components/seo/organisation-schema'
import { Analytics } from '@/components/seo/analytics'

/**
 * Viewport — `viewportFit: 'cover'` is what makes `env(safe-area-inset-*)`
 * return real values on notched phones, so the fixed mobile bar and the
 * floating assistant button stay clear of the home indicator.
 */
/**
 * Typography — self-hosted, so there is no third-party font request at runtime.
 *
 * `next/font/local` fingerprints the files, serves them with long-lived cache
 * headers, preloads them for the first paint and generates a metrically adjusted
 * fallback: text does not visibly shift while the font loads.
 *
 * Inter carries the interface (screen-optimised, tall x-height, unambiguous
 * numerals); Playfair Display is reserved for ceremonial display headings.
 * Both are OFL-licensed — see app/fonts/README.md.
 */
const inter = localFont({
  src: [{ path: './fonts/inter-variable-latin.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Arial', 'Helvetica', 'sans-serif']
})

const playfair = localFont({
  src: [{ path: './fonts/playfair-display-variable-latin.woff2', weight: '400 900', style: 'normal' }],
  variable: '--font-display',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'Times New Roman', 'serif']
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#04110e' }
  ]
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Pakistan Youth Parliamentary Council | PYPC',
    template: '%s | PYPC'
  },
  description:
    'Pakistan Youth Parliamentary Council is a national, non-partisan youth platform for leadership, parliamentary engagement, public policy, technology, climate action and national impact.',
  keywords: [
    'PYPC',
    'Pakistan Youth Parliamentary Council',
    'Youth Parliament Pakistan',
    'Youth Leadership',
    'Public Policy Pakistan',
    'Youth Fellowship Pakistan',
    'Certificate Verification Pakistan'
  ],
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: 'website',
    title: 'Pakistan Youth Parliamentary Council',
    description:
      'A national, non-partisan platform for youth leadership, parliamentary engagement and public policy.',
    siteName: 'PYPC',
    locale: 'en_PK',
    // Without this, every shared link renders as a grey card — which reads as
    // unprofessional next to institutions that do have one.
    images: [
      {
        url: '/images/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Pakistan Youth Parliamentary Council — leadership, policy and international participation'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pakistan Youth Parliamentary Council',
    description:
      'Youth leadership, parliamentary engagement, public policy and international participation.',
    images: ['/images/og-default.png']
  },
  robots: { index: true, follow: true },
  // Installable web app: Android reads app/manifest.ts, iOS reads the
  // apple-prefixed keys below (iOS ignores the manifest for icons).
  applicationName: 'PYPC',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'PYPC',
    statusBarStyle: 'black-translucent'
  },
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: [{ url: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/icon.svg']
  },
  other: {
    // iOS standalone: the app supplies its own status-bar colour, and the
    // splash colour matches the theme so there is no white flash on launch.
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#0b3d2e',
    'msapplication-tap-highlight': 'no'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script below sets the theme class and
    // data attributes on <html> before React hydrates.
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs before the first paint so dark-mode visitors never see a white flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body className="pypc-editorial min-h-dvh bg-white text-slate-900 antialiased">
        <a
          href="#main"
          className="focus-ring sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          Skip to content
        </a>
        <ThemeProvider>
          {/* Real-time layer: tracks the live viewport and the network state. */}
          <ViewportSync />
          <ConnectionStatus />
          <SiteExperience />
          <SiteHeader />
          <main id="main">{displayContent(children)}</main>
          <SiteFooter />
          <AiAssistant />
          {/* Structured data: makes the official social accounts discoverable. */}
          <OrganisationSchema />
          <WebsiteSchema />
          {/* Opt-in: renders nothing at all until a key is configured. */}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
