import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The content frame, ruled on both edges so bands read as one column.
 *
 * The landing, the cookie settings page and the footer all stand on this same
 * geometry — the 1152px max width, the hairline rules at the border-box edges
 * and the 5/8 side padding — which is what makes them read as pages of one
 * site rather than three surfaces that happened to share a palette.
 *
 * `marker` labels a frame for code outside the render tree. The landing hero's
 * is the region the margin field's ripple refuses to start in, so the field
 * answers clicks on the margin it lives in and stays still for clicks on the
 * content.
 */
export function RuledFrame({
  children,
  className,
  marker,
}: {
  readonly children: ReactNode
  readonly className?: string
  readonly marker?: string
}) {
  return (
    <div
      data-frame={marker}
      className={cn('relative mx-auto w-full max-w-6xl px-5 sm:px-8', className)}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border" />
      <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-border" />
      {children}
    </div>
  )
}
