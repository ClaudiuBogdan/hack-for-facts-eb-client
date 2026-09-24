import { useId } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { KnownLatestFigure } from '../../lib/detail-loading'
import { formatHubPeriod } from '../../lib/period'
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
      className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]"
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
        <div className={statisticsTheme.bandBody}>
          {/* The header's skeleton already announces the load: one per page. */}
          <DetailSeriesSkeleton known={null} announce={false} />
        </div>
      </div>
    </div>
  )
}

/** The facts beside the figure, in the summary's order: labels are known, values are not. */
const FACTS = [
  { label: () => t`minim`, width: 'w-24' },
  { label: () => t`maxim`, width: 'w-24' },
  { label: () => t`medie`, width: 'w-20' },
  { label: () => t`observații`, width: 'w-8' },
] as const

/** The chart's hairlines, top to bottom, as its grid draws them. */
const GRID_LINES = 5

/**
 * The figure and its chart while the series reads, in the loaded band's own
 * layout — the summary's row, then a frame the chart's height — so the band
 * fills in where it stands rather than rebuilding.
 *
 * It shows what the page already knows. The figure the first read resolved
 * is printed as it will be (`knownLatestFigure`); the facts' labels are
 * words the page has. The axes are placeholders: the loaded chart's span is
 * whatever the rows cover, which neither the catalog nor the address knows.
 * Only what is still on its way pulses — the facts' values, the y-axis — and
 * a light sweep crosses the plot, which it stops doing for a reader who asked
 * for less motion. Nothing is drawn as data that is not data: no invented
 * line, no invented extremes.
 */
export function DetailSeriesSkeleton({
  known,
  announce = true,
}: {
  readonly known: KnownLatestFigure | null
  /** False where another skeleton on the page already says it is loading. */
  readonly announce?: boolean
}) {
  const sweepId = useId()
  // Named `period` so the phrase is the summary's own message, „în {period}".
  const period = known?.period ? formatHubPeriod(known.period) : null

  return (
    <div className="space-y-5" data-testid="series-skeleton">
      {announce ? (
        <p role="status" className="sr-only">
          <Trans>Se încarcă seria de date</Trans>
        </p>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4" aria-hidden="true">
        <div className="min-w-0">
          <p className={statisticsTheme.sectionLabel}>
            <Trans>Ultima valoare</Trans>
          </p>
          {known ? (
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1" data-testid="skeleton-known-figure">
              <span className={statisticsTheme.heroValue}>
                {known.value}
                {known.unit ? (
                  <>
                    {' '}
                    <span className={cn(statisticsTheme.heroUnit, 'ml-0.5')}>{known.unit}</span>
                  </>
                ) : null}
              </span>
              {period ? (
                <span className="text-base tabular-nums text-muted-foreground">
                  <Trans>în {period}</Trans>
                </span>
              ) : null}
            </p>
          ) : (
            <Skeleton className="mt-2 h-9 w-56" />
          )}
        </div>
        <dl className="flex flex-wrap items-end gap-x-7 gap-y-3">
          {FACTS.map((fact) => (
            <div key={fact.width + fact.label()} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{fact.label()}</dt>
              <dd className="mt-1.5">
                <Skeleton className={cn('h-4', fact.width)} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* The chart's frame at the chart's height (`h-80`, as the band draws
          it): the y-axis gutter, the hairlines, the x-axis under them. */}
      <div className="flex h-80 w-full min-w-0 flex-col" aria-hidden="true" data-testid="chart-skeleton">
        <div className="flex min-h-0 flex-1 gap-2 pt-6">
          <div className="flex w-12 shrink-0 flex-col items-end justify-between">
            {Array.from({ length: GRID_LINES }, (_, index) => (
              <Skeleton key={index} className="-my-1 h-2.5 w-9" />
            ))}
          </div>
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <div className="absolute inset-0 flex flex-col justify-between">
              {Array.from({ length: GRID_LINES }, (_, index) => (
                <div key={index} className="border-t border-border" />
              ))}
            </div>
            {/* SVG's own animation, not a stylesheet keyframe: the sweep is
                markup, and `motion-reduce:hidden` takes it away whole. */}
            <svg className="absolute inset-0 h-full w-full motion-reduce:hidden" preserveAspectRatio="none">
              <defs>
                <linearGradient id={sweepId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="hsl(var(--chart-1))" stopOpacity="0" />
                  <stop offset="0.5" stopColor="hsl(var(--chart-1))" stopOpacity="0.1" />
                  <stop offset="1" stopColor="hsl(var(--chart-1))" stopOpacity="0" />
                  <animateTransform
                    attributeName="gradientTransform"
                    type="translate"
                    from="-1 0"
                    to="1 0"
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${sweepId})`} />
            </svg>
          </div>
        </div>
        <div className="flex justify-between pl-14 pt-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-2.5 w-8" />
          ))}
        </div>
      </div>
    </div>
  )
}
