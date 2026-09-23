import { t } from '@lingui/core/macro'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { statisticsTheme } from '../../lib/statistics-theme'

/**
 * The header while the read is in flight, in the header's own shape — title,
 * identity line, three lines of definition — so the page rebuilds into the
 * layout it was already occupying instead of a different one
 * (DESIGN.md §Clarity techniques).
 */
export function DetailHeaderSkeleton() {
  return (
    <div
      className="mt-2 space-y-3 border-b border-border/70 pb-5"
      // `role="status"` so the label is exposed at all: `aria-label` on a
      // generic container is dropped. The band's skeleton below is hidden
      // instead — one announcement per load, not two.
      role="status"
      aria-busy="true"
      aria-label={t`Se încarcă setul de date`}
    >
      <Skeleton className="h-7 w-[min(34rem,90%)]" />
      <Skeleton className="h-3.5 w-64" />
      <div className="space-y-2 pt-1">
        <Skeleton className="h-3 w-full max-w-prose" />
        <Skeleton className="h-3 w-5/6 max-w-prose" />
      </div>
    </div>
  )
}

/**
 * What is about to arrive: a rail on the left, the figure and its chart on the
 * right. A skeleton that does not match the layout it precedes is worse than
 * none — the page visibly rearranges itself the moment the data lands.
 */
export function DetailBandSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"
      aria-hidden="true"
    >
      <div className={cn(statisticsTheme.band, 'divide-y divide-border/70')}>
        <div className="px-4 py-2.5">
          <Skeleton className="h-3 w-20" />
        </div>
        {/* Literal classes, not an interpolated width: Tailwind scans source
            text, so a computed `w-[7rem]` would never be generated. */}
        {['w-24', 'w-32', 'w-20', 'w-28'].map((width) => (
          <div key={width} className="space-y-1.5 px-4 py-2.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className={cn('h-3.5', width)} />
          </div>
        ))}
      </div>

      <div className={statisticsTheme.band}>
        <div className={cn(statisticsTheme.bandBody, 'space-y-5')}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="flex gap-6">
              {['w-16', 'w-14', 'w-12', 'w-10'].map((width) => (
                <div key={width} className="space-y-1.5">
                  <Skeleton className="h-2.5 w-12" />
                  <Skeleton className={cn('h-3.5', width)} />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    </div>
  )
}

/** The figure and its chart, for when only the series is (re-)reading. */
export function DetailSeriesSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true" data-testid="series-skeleton">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-56" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  )
}
