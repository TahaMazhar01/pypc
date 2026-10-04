import type { Metadata } from 'next'
import Image from 'next/image'
import { PageHero } from '@/components/layout/page-hero'
import { sitePhotos } from '@/lib/site-photos'
import { displayContent } from '@/lib/display-content'

export const metadata: Metadata = { title: 'Photo credits', description: 'Sources, photographers and open licences for our editorial photography.' }

export default function PhotoCreditsPage() {
  return <>
    <PageHero eyebrow="Our visual library" title="Photo credits" description="Open photography selected to illustrate civic participation, learning, community and the environment." />
    <section className="container py-12">
      <div className="mb-10 max-w-3xl space-y-3 text-sm leading-7 text-slate-600">
        <p>These photographs illustrate the subjects and places discussed on this website. They do not document PYPC events, participants, partnerships or institutional endorsements.</p>
        <p>Images are resized, converted to WebP and cropped responsively for display. Adapted photographs retain the original licence listed below. Photography is excluded from the general website copyright notice.</p>
      </div>
      <article id="earth" className="mb-10 rounded-lg border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
        <h2 className="font-bold text-primary-900">Earth globe imagery</h2>
        <p>NASA Blue Marble, land surface, ocean colour and sea ice. NASA Goddard Space Flight Center, Reto Stöckli and Robert Simmon, with the MODIS teams and USGS. The image is mapped onto a rotating sphere with city coordinates. It is a historical satellite composite, not live satellite imagery.</p>
        <p><a className="text-primary underline" href="https://commons.wikimedia.org/wiki/File:Land_ocean_ice_2048.jpg">Original image and full credits</a> · <a className="text-primary underline" href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY SA 3.0</a>. Globe imagery adaptations retain this licence.</p>
      </article>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {sitePhotos.map(photo => <article key={photo.key} id={photo.key} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="relative h-48"><Image src={photo.src} alt={displayContent(photo.alt)} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" /></div>
          <div className="space-y-3 p-5 text-sm leading-6">
            <h2 className="font-bold text-primary-900">{displayContent(photo.alt)}</h2>
            <p className="text-slate-600">Photographer: {displayContent(photo.author)}</p>
            <p className="break-words text-xs text-slate-500">Original title: {displayContent(photo.originalTitle)}</p>
            <div className="flex flex-wrap gap-4 font-semibold text-primary">
              <a className="underline underline-offset-4" href={photo.source} target="_blank" rel="noreferrer">Original source</a>
              <a className="underline underline-offset-4" href={photo.licenseUrl} target="_blank" rel="noreferrer">{displayContent(photo.license)}</a>
            </div>
          </div>
        </article>)}
      </div>
    </section>
  </>
}
