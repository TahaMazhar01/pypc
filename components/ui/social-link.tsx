
import { displayContent } from '@/lib/display-content'
import type { SocialChannel } from '@/lib/social'
import { brandIconRegistry } from '@/components/ui/brand-icons'

/**
 * One official channel, rendered consistently wherever the site lists them —
 * footer, contact page, header menus, side rail.
 *
 * Two states, and the difference matters:
 *
 *  - **live**    → an ordinary link. The address is known to resolve.
 *  - **pending** → a labelled chip: the brand mark, the name and the handle are
 *    shown, but it is not clickable, because the page behind it is not published
 *    yet. Shipping a 404 as an "official channel" is worse than showing the
 *    channel with an honest "Soon" note.
 *
 * The caller controls the visual treatment through `className`; the behaviour
 * (link vs chip) is decided here so no page can get it wrong.
 */
export function SocialChannelLink({
  channel,
  className = '',
  showHandle = true,
  iconSize = 15
}: {
  channel: SocialChannel
  className?: string
  showHandle?: boolean
  iconSize?: number
}) {
  const Icon = brandIconRegistry[channel.id as keyof typeof brandIconRegistry]
  const pending = channel.status === 'pending'

  const label = pending
    ? `${channel.label} — handle ${channel.handle ?? ''}, channel launching soon`
    : `${channel.label}${channel.handle ? ` — ${channel.handle}` : ''}`

  const inner = (
    <>
      {displayContent(Icon ? <Icon size={iconSize} /> : null)}
      <span>{displayContent(channel.short)}</span>
      {displayContent(showHandle && channel.handle ? (
        <span className="hidden text-[11px] font-normal opacity-70 sm:inline">{displayContent(channel.handle)}</span>
      ) : null)}
      {displayContent(pending ? (
        <span className="rounded-full bg-current/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          Soon
        </span>
      ) : null)}
    </>
  )

  if (pending) {
    return (
      <span
        className={className}
        title={displayContent(`${channel.short} channel is being set up — follow the other official channels meanwhile`)}
        aria-label={displayContent(label)}
        data-channel={channel.id}
        data-channel-status="pending"
      >
        {displayContent(inner)}
      </span>
    )
  }

  return (
    <a
      href={channel.href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={displayContent(label)}
      data-channel={channel.id}
      data-channel-status="live"
      className={className}
    >
      {displayContent(inner)}
    </a>
  )
}
