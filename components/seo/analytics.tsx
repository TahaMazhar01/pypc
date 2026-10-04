
import { displayContent } from '@/lib/display-content'
import Script from 'next/script'

/**
 * Analytics — opt-in, and honest about it.
 *
 * Two providers are supported (Google Analytics 4 and Microsoft Clarity) and
 * neither loads unless its key is set in the environment. With no key:
 *
 *   - no script tag is rendered,
 *   - no request leaves the browser,
 *   - no analytics cookie is written.
 *
 * That is the correct default for an organisation that collects data from
 * students, several of whom are minors: a deployment should not be tracking
 * visitors because a template said so. Setting `NEXT_PUBLIC_GA4_ID` (or
 * `NEXT_PUBLIC_CLARITY_ID`) is a deliberate act, and the privacy policy already
 * describes what is then collected.
 *
 * Both tags load with `afterInteractive`, so they never compete with the page's
 * first paint — the visitor sees content first, tracking second.
 */
export function Analytics() {
  const ga4 = process.env.NEXT_PUBLIC_GA4_ID
  const clarity = process.env.NEXT_PUBLIC_CLARITY_ID

  return (
    <>
      {displayContent(ga4 ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`}
            strategy="afterInteractive"
          />
          <Script id="pypc-ga4" strategy="afterInteractive">
            {displayContent(`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4}', { anonymize_ip: true });
            `)}
          </Script>
        </>
      ) : null)}

      {displayContent(clarity ? (
        <Script id="pypc-clarity" strategy="afterInteractive">
          {displayContent(`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarity}");
          `)}
        </Script>
      ) : null)}
    </>
  )
}
