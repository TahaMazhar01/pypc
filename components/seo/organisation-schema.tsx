import { SITE_NAME, SITE_SHORT_NAME, SITE_TAGLINE, SITE_URL, CONTACT_ADDRESS, CONTACT_EMAILS, CONTACT_PHONE_E164 } from '@/lib/constants'
import { ORGANISATION_SAME_AS, SOCIAL_PROFILES } from '@/lib/social'

/**
 * schema.org Organisation markup.
 *
 * This is what makes the *correct* LinkedIn, Instagram, Facebook and YouTube
 * accounts visible to search engines, so a search for the organisation shows its
 * real profiles — and a lookalike page cannot as easily claim them. `sameAs` is
 * built from `lib/social.ts`, which only ever contains real addresses.
 *
 * Rendered once, in the root layout, as JSON-LD.
 */
export function OrganisationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'NGO', 'EducationalOrganization'],
    name: SITE_NAME,
    alternateName: SITE_SHORT_NAME,
    slogan: SITE_TAGLINE,
    url: SITE_URL,
    logo: `${SITE_URL}/images/pypc-emblem-512.png`,
    image: `${SITE_URL}/images/pypc-emblem-512.png`,
    description:
      'The Pakistan Youth Parliamentary Council (PYPC) is a national, non-partisan platform for youth leadership, parliamentary engagement, public policy, innovation and civic responsibility.',
    foundingLocation: {
      '@type': 'Place',
      name: CONTACT_ADDRESS
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Islamabad',
      addressCountry: 'PK'
    },
    // Both official mailboxes, so search engines show the right ones.
    email: CONTACT_EMAILS[0],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone: CONTACT_PHONE_E164,
        email: CONTACT_EMAILS[0],
        availableLanguage: ['en', 'ur'],
        areaServed: 'Worldwide'
      }
    ],
    // Only real, verified accounts — never a guessed URL.
    sameAs: ORGANISATION_SAME_AS,
    knowsAbout: [
      'Youth leadership',
      'Parliamentary engagement',
      'Public policy',
      'Model United Nations',
      'Climate action',
      'Civic education'
    ]
  }

  return (
    <script
      type="application/ld+json"
      // React escapes the JSON; the content is our own constant data.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * `WebSite` markup with the site's own search action — lets search engines offer
 * a search box for the domain.
 */
export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ['en', 'ur'],
    publisher: { '@type': 'Organization', name: SITE_NAME }
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

/** The profiles search engines should associate with the site. */
export const organisationProfiles = SOCIAL_PROFILES.map(profile => profile.href)
