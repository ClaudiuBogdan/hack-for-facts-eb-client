import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { compactCountText, countText, millionsText, monthText } from '../lib/judicial-format'
import type { YearBar } from '../lib/judicial-model'

/**
 * Cases by the year of their source date, as columns. The years before the
 * capture went dense are drawn dashed — they hold only cases still active
 * later — and the capture's last year is a part-year; the legend says both.
 * Exact counts sit above the columns.
 */
export function JusticeYearsChart({
  bars,
  lastMonth,
  compact = false,
  className,
}: {
  readonly bars: readonly YearBar[]
  /** The capture's last month (`2026-06`): where the last year stops. */
  readonly lastMonth: string | null
  /** A single court's figures: in thousands („11,3 mii"), not in millions. */
  readonly compact?: boolean
  readonly className?: string
}) {
  const top = Math.max(...bars.map((bar) => bar.count), 1)
  const figure = (count: number) => (compact ? compactCountText(count) : millionsText(count))
  // A long history (a court page describing an older year draws back to it): each year keeps a readable width and the
  // chart scrolls sideways, opening at its start, the year described.
  const long = bars.length > 8
  const column = long ? 'min-w-10 shrink-0' : 'min-w-0'
  return (
    <figure className={className}>
      <div className={cn(long && 'overflow-x-auto overscroll-x-contain')}>
        <div className={cn(long && 'min-w-max')}>
      <ol className="flex h-56 items-end gap-1.5 border-b border-border/70 sm:gap-3">
        {bars.map((bar) => (
          <li key={bar.year} className={cn('flex h-full flex-1 flex-col justify-end', column)}>
            <span className="mb-1 block truncate text-center text-[0.6875rem] tabular-nums text-muted-foreground">{figure(bar.count)}</span>
            <span
              className={cn('block w-full', bar.partial ? 'border border-dashed border-primary/50 bg-primary/10' : bar.running ? 'bg-primary/45' : 'bg-primary/75')}
              style={{ height: `${Math.max((bar.count / top) * 100, 1).toFixed(1)}%` }}
            />
            <span className="sr-only">
              {bar.year}: {countText(bar.count)}
            </span>
          </li>
        ))}
      </ol>
      <ol className="mt-1.5 flex gap-1.5 sm:gap-3" aria-hidden="true">
        {bars.map((bar) => (
          <li key={bar.year} className={cn('flex-1 text-center', column)}>
            <MonoLabel className="tabular-nums text-muted-foreground">{bar.year}</MonoLabel>
          </li>
        ))}
      </ol>
        </div>
      </div>
      <figcaption>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {bars.some((bar) => bar.partial) ? (
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 border border-dashed border-primary/50 bg-primary/10" aria-hidden="true" />
              <Trans>preluare parțială</Trans>
            </li>
          ) : null}
          {bars.some((bar) => bar.running) && lastMonth ? (
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 bg-primary/45" aria-hidden="true" />
              <Trans>an în curs, până în {monthText(lastMonth, 'long')}</Trans>
            </li>
          ) : null}
        </ul>
      </figcaption>
    </figure>
  )
}
