import type { Config } from 'tailwindcss'

import { palette } from './lib/design-tokens'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: 'clamp(1rem, 4vw, 2rem)' },
      screens: { '2xl': '1280px' }
    },
    extend: {
      colors: {
        // Single source of truth: lib/design-tokens.ts (also used by the
        // contrast audit in scripts/check-contrast.ts and by globals.css).
        primary: palette.primary,
        ink: palette.ink,
        gold: palette.gold,
        champagne: palette.champagne,
        mint: palette.mint,
        // IMUN 2027 sub-brand accent
        navy: palette.navy,
        azure: palette.azure
      },
      fontFamily: {
        // Self-hosted variable fonts (see app/fonts/README.md). The fallback
        // chain means the layout is correct even before the font file arrives.
        sans: ['var(--font-sans)', 'system-ui', 'Segoe UI', 'Arial', 'Helvetica', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'Times New Roman', 'serif']
      },
      boxShadow: {
        soft: '0 4px 16px rgba(20, 40, 32, 0.05)',
        card: '0 2px 8px rgba(20, 40, 32, 0.03)',
        gold: 'none',
        elevated: '0 20px 60px rgba(15, 76, 58, 0.18)',
        premium: '0 30px 80px rgba(2, 18, 14, 0.35)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.06)'
      },
      backgroundImage: {
        grid:
          'linear-gradient(to right, rgba(15,76,58,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,76,58,.08) 1px, transparent 1px)',
        // Enriched premium surfaces
        'premium-dark':
          'radial-gradient(120% 95% at 12% 0%, #0b3b2e 0%, #06261e 52%, #02120e 100%)',
        'premium-light':
          'linear-gradient(135deg, #ffffff 0%, #f7fbf9 38%, #fbf6e6 100%)',
        'gold-sheen':
          'linear-gradient(100deg, #f4e9c4 0%, #d4af37 42%, #c8a94f 68%, #f0e2a9 100%)',
        'emerald-depth':
          'linear-gradient(160deg, #176f52 0%, #0f4c3a 45%, #06261e 100%)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' }
        }
      },
      animation: {
        'fade-up': 'fade-up 600ms ease-out both',
        shimmer: 'shimmer 1.8s linear infinite'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}

export default config
