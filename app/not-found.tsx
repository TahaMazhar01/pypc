
import { displayContent } from '@/lib/display-content'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { SITE_SHORT_NAME } from '@/lib/constants'

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.15em] text-gold-700">Error 404</p>
      <h1 className="mt-3 text-4xl font-extrabold text-primary-900">Page not found</h1>
      <p className="mt-4 max-w-md text-slate-600">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
          Go to homepage
        </Link>
        <Link href="/contact" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Contact the {displayContent(SITE_SHORT_NAME)} secretariat
        </Link>
      </div>
    </div>
  )
}
