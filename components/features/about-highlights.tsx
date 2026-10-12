import 'server-only'
import Image from 'next/image'

// Captions supplied by the site owner. Keep this copy verbatim; it is not
// independently researched reporting. Photos retain their complete composition.
const highlights = [
  {
    image: '/images/editorial/about-institutional-support.jpg',
    alt: 'Meeting with Madam Wajiha Qamar',
    title: 'Institutional engagement',
    paragraphs: [
      'A highly productive meeting with Madam Wajiha Qamar, Minister of State for Federal Education & Professional Training, Government of Pakistan.',
      'A truly gracious and inspiring personality, Madam extended her full institutional support and cooperation for our initiatives, including IMUN 2027, and assured us of her continued guidance and facilitation whenever needed.',
      'Grateful for her time, encouragement and confidence in the vision of Pakistan Youth Parliamentary Council (PYPC). 🇵🇰'
    ]
  },
  {
    image: '/images/editorial/about-senate-recognition.jpg',
    alt: 'Shield of Honour presentation at the Senate of Pakistan',
    title: 'Recognition at the Senate',
    paragraphs: [
      'Alhamdulillah — Dr. Mohsin Ejaz, Founder & Chairman, Pakistan Youth Parliamentary Council (PYPC), honoured with a Shield of Honour from the Senate of Pakistan, presented by the Acting Chairman Senate, Sardar Syedal Khan Nasir.',
      'Alongside him was Ms. Aniqa Hassan, Vice President, Pakistan Youth Parliamentary Council (PYPC).',
      'A proud moment of recognition, gratitude, and commitment to serving youth and Pakistan. 🇵🇰'
    ]
  }
]

export function AboutHighlights() {
  return (
    <section aria-labelledby="about-highlights-heading" className="container pb-16">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">PYPC in focus</p>
        <h2 id="about-highlights-heading" className="mt-3 text-3xl font-extrabold text-primary-900">Engagement &amp; recognition</h2>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        {highlights.map(item => (
          <figure key={item.image} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="relative aspect-[4/3] bg-slate-50">
              <Image src={item.image} alt={item.alt} fill sizes="(min-width: 1280px) 580px, (min-width: 1024px) 46vw, 92vw" className="object-contain" />
            </div>
            <figcaption className="p-6 sm:p-8">
              <h3 className="text-xl font-extrabold text-primary-900">{item.title}</h3>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                {item.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
