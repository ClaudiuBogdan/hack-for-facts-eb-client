import type { ReactNode } from 'react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn } from '@/lib/utils'

/**
 * One numbered band of the profile: a section the section bar links to by its
 * `id`, named by its heading, clear of the pinned bar when jumped to.
 */
export function ProfileBand({
  id,
  titleId,
  last = false,
  children,
}: {
  readonly id: string
  readonly titleId: string
  /** The last band closes the page: no rule under it. */
  readonly last?: boolean
  readonly children: ReactNode
}) {
  return (
    <section id={id} className={cn('scroll-mt-14', !last && 'border-b')} aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">{children}</RuledFrame>
    </section>
  )
}

/** A band's shared column split: a head and its text beside a wider column, stacked below `lg`. */
export const BAND_GRID_CLASS = 'grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8'

/** A row that is a link or a button in a ruled list: tinted on hover, ringed on focus. */
export const ROW_LINK_CLASS = 'transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
