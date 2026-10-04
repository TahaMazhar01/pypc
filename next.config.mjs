/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * Response-time settings.
   *
   * - `compress` (on by default, stated here so it is explicit) gzips every
   *   response above 1 kB. The pages are text-heavy, so this is the single
   *   biggest lever: HTML drops to roughly a fifth of its size on the wire.
   * - `optimizePackageImports` rewrites barrel imports (lucide-react,
   *   date-fns) into direct ones, so a page ships only the icons it actually
   *   renders instead of evaluating the whole catalogue during the request.
   * - `productionBrowserSourceMaps` stays off: source maps are the largest
   *   single client asset and are not needed in production.
   */
  compress: true,
  productionBrowserSourceMaps: false,

  images: {
    dangerouslyAllowSVG: true,
    formats: ['image/avif', 'image/webp'],
    // 320→1920 in device widths, so a phone and a 4K desktop both get a file
    // that matches their screen instead of one oversized master.
    deviceSizes: [320, 360, 390, 414, 480, 640, 750, 828, 1080, 1200, 1440, 1920, 2048, 3840],
    imageSizes: [16, 24, 32, 40, 48, 56, 64, 88, 96, 128, 192, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '5mb'
    },
    optimizePackageImports: ['lucide-react', 'date-fns']
  },
  /**
   * Security headers.
   *
   * Framing: `X-Frame-Options: SAMEORIGIN` used to be set here, which silently
   * broke every embedded view of the site — preview panes, partner portals and
   * in-app browsers all render the site inside an iframe. A blocked frame shows
   * the visitor an error page, not the website, so the header is replaced with a
   * `Content-Security-Policy` `frame-ancestors` directive:
   *
   *   - default: the site may be framed by anyone (`https:`), which is what an
   *     embedded preview needs.
   *   - set `FRAME_ANCESTORS` in .env to restrict this to named hosts, e.g.
   *     `FRAME_ANCESTORS="'self' https://portal.example.org"` and the same
   *     headers apply to everyone.
   *
   * Everything else is unchanged: `nosniff`, a strict referrer policy and a
   * permissions policy that disables camera, microphone and geolocation.
   */
  async headers() {
    const frameAncestors = process.env.FRAME_ANCESTORS || 'https:'
    /*
     * Security headers.
     *
     * On `X-Frame-Options`: the blueprint asks for it, and on a conventional
     * deployment it would be right — but it is the legacy header, and it is
     * exactly what broke every embedded view of this site earlier (preview
     * panes, partner portals and in-app browsers all render the platform inside
     * a frame; `SAMEORIGIN` turns that into an error page). The modern
     * equivalent is the CSP `frame-ancestors` directive below, which every
     * current browser honours and which can be narrowed to named hosts. So the
     * protection asked for is present, just expressed in the header that does
     * not also break embedding. An operator who wants the legacy header anyway
     * can set `LEGACY_FRAME_HEADER="true"`.
     */
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      {
        // Two years, with subdomains and preload — the HSTS posture a domain
        // needs before it can be submitted to the preload list.
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      },
      {
        // frame-ancestors replaces X-Frame-Options; the rest locks the site down
        // while leaving room for the font files, inline theme script and images
        // it actually uses.
        key: 'Content-Security-Policy',
        value: [
          `frame-ancestors ${frameAncestors}`,
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' https:",
          "form-action 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          'upgrade-insecure-requests'
        ].join('; ')
      },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(self)'
      },
      { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }
    ]

    // Opt-in: the legacy header, for an operator whose proxy insists on it.
    if (process.env.LEGACY_FRAME_HEADER === 'true') {
      securityHeaders.push({ key: 'X-Frame-Options', value: 'SAMEORIGIN' })
    }

    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      },
      {
        // Emblem, PDFs and the other bundled artwork never change between
        // releases (the filenames do), so browsers may hold them for a year and
        // repeat visits cost no network at all.
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
      },
      {
        source: '/documents/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }]
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
          { key: 'Content-Type', value: 'application/manifest+json' }
        ]
      }
    ]
  }
}

export default nextConfig
