import Link from 'next/link'
import Image from 'next/image'

type LogoProps = {
  emblemSize?: number
  compact?: boolean
  light?: boolean
}

/**
 * Official PYPC emblem.
 *
 * Uses the artwork supplied by the organisation (`/images/pypc-emblem.png`,
 * derived transparent PNG of the approved logo). Swap that single file when a
 * new master artwork is approved — no code changes required.
 */
export function PypcEmblem({
  size = 52,
  className = '',
  onDark = false
}: {
  size?: number
  className?: string
  /** Use the light-plate variant so the dark-green artwork stays legible on dark surfaces. */
  onDark?: boolean
}) {
  const shared = `emblem-glow h-auto w-auto ${className}`

  // On a permanently dark surface the light-plate variant is used directly.
  // On a normal surface both variants are rendered and CSS picks one, so the
  // emblem stays crisp when the visitor switches to the dark theme — no JS,
  // no flash, and the same markup for light and dark.
  if (onDark) {
    return (
      <Image
        src="/images/pypc-emblem-on-dark.png"
        alt="Pakistan Youth Parliamentary Council emblem"
        width={size}
        height={size}
        priority
        className={shared}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <>
      <Image
        src="/images/pypc-emblem.png"
        alt="Pakistan Youth Parliamentary Council emblem"
        width={size}
        height={size}
        priority
        className={`${shared} dark:hidden`}
        style={{ width: size, height: size }}
      />
      <Image
        src="/images/pypc-emblem-on-dark.png"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        priority
        className={`${shared} hidden dark:block`}
        style={{ width: size, height: size }}
      />
    </>
  )
}

export function Logo({ compact = false, light = false, emblemSize }: LogoProps) {
  return (
    <Link
      href="/"
      className="focus-ring inline-flex items-center gap-3 rounded-lg"
      aria-label="Pakistan Youth Parliamentary Council, home"
    >
      <span className="logo-3d inline-flex">
        <PypcEmblem size={emblemSize ?? (compact ? 42 : 54)} onDark={light} />
      </span>

      {!compact ? (
        <span className="hidden leading-tight sm:block">
          <span
            className={`block text-[13px] font-extrabold tracking-tight ${
              light ? 'text-white' : 'text-primary'
            }`}
          >
            PAKISTAN YOUTH
          </span>
          <span
            className={`block text-[11px] font-semibold tracking-[0.1em] ${
              light ? 'text-primary-100' : 'text-slate-600'
            }`}
          >
            PARLIAMENTARY COUNCIL
          </span>
        </span>
      ) : null}
    </Link>
  )
}
