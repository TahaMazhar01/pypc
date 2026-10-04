
import { displayContent } from '@/lib/display-content'
import { PageHero } from '@/components/layout/page-hero'
import type { PolicyDocument as PolicyDocumentType } from '@/lib/data/policies'

export function PolicyDocumentView({ document }: { document: PolicyDocumentType }) {
  return (
    <>
      <PageHero
        eyebrow="Governance & policies"
        title={displayContent(document.title)}
        description={document.summary}
        breadcrumb={[{ label: document.title }]}
      />

      <article className="container max-w-3xl py-14">
        <p className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary">
          Last updated: {displayContent(document.lastUpdated)}
        </p>

        <div className="prose-pypc mt-8">
          {document.sections.map(section => (
            <section key={section.heading}>
              <h2>{displayContent(section.heading)}</h2>

              {section.paragraphs?.map(paragraph => (
                <p key={paragraph}>{displayContent(paragraph.replace(/&apos;/g, "'"))}</p>
              ))}

              {displayContent(section.bullets?.length ? (
                <ul>
                  {section.bullets.map(bullet => (
                    <li key={bullet}>{displayContent(bullet)}</li>
                  ))}
                </ul>
              ) : null)}
            </section>
          ))}
        </div>
      </article>
    </>
  )
}
