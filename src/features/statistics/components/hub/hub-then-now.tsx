import { Link } from '@tanstack/react-router'
import type { PointerEvent } from 'react'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { StatisticsHubIndicator } from '@/schemas/statistics'
import { formatHubNumber } from '../../lib/numbers'
import { formatHubValue, hubUnitWord } from '../../lib/units'
import { describeHubDelta } from '../../lib/change'
import { indicatorDetailSearch } from '../../lib/hub-indicators'

type ThenNowRow = { readonly indicator: StatisticsHubIndicator; readonly label: string }

/**
 * „Then and now": each national series at the base year and at its latest,
 * and the change between them. A row whose latest year is not
 * the column's says so beside the value. A series without a point in the
 * base year is left out — its change would be from another start.
 *
 * Each row opens the series over the span it compares, and tells the page
 * which one the pointer or focus is on, so the chart beside it can bring
 * that line forward.
 */
export function HubThenNow({
  rows,
  since,
  onActiveChange,
  className,
}: {
  readonly rows: readonly ThenNowRow[]
  readonly since: string
  readonly onActiveChange?: (code: string | undefined) => void
  readonly className?: string
}) {
  const compared = rows.flatMap(({ indicator, label }) => {
    const from = indicator.series.find((point) => point.period === since)
    const to = indicator.series[indicator.series.length - 1]
    return from && to && to.period > from.period ? [{ indicator, label, from, to }] : []
  })
  if (compared.length === 0) return null
  const latest = compared.map((row) => row.to.period).sort()
  const now = latest[latest.length - 1] ?? ''
  const hoverOnly = (event: PointerEvent, code: string | undefined) => {
    if (event.pointerType !== 'touch') onActiveChange?.(code)
  }

  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 sm:gap-x-6', className)}>
      <div className="col-span-4 grid grid-cols-subgrid border-b border-border/70 pb-2" aria-hidden="true">
        <span />
        <MonoLabel className="text-right text-muted-foreground">{since}</MonoLabel>
        <MonoLabel className="text-right text-muted-foreground">{now}</MonoLabel>
        <MonoLabel className="pr-1 text-right text-muted-foreground">
          <Trans>Schimbare</Trans>
        </MonoLabel>
      </div>
      <ul className="col-span-4 grid grid-cols-subgrid divide-y divide-border/70">
        {compared.map(({ indicator, label, from, to }) => {
          const unit = indicator.unit === 'years' || indicator.unit === 'other' ? hubUnitWord(indicator.unit, indicator.unitLabel) : ''
          // A figure in the millions to one decimal, so „8,0 mil." sits over „10,2 mil."
          const format = (value: number) =>
            Math.abs(value) >= 1_000_000 && (indicator.unit === 'persons' || indicator.unit === 'count')
              ? formatHubNumber(value, { compact: true, digits: 1 })
              : formatHubValue(value, indicator.unit, indicator.unitLabel).value
          const delta = describeHubDelta(from.value, to.value, indicator.unit)
          return (
            <li key={indicator.code} className="col-span-4 grid grid-cols-subgrid">
              <Link
                to="/ins/seturi/$cod"
                params={{ cod: indicator.code }}
                search={{ ...indicatorDetailSearch(indicator), din: Number(from.period), pana: Number(to.period) }}
                onPointerEnter={(event) => hoverOnly(event, indicator.code)}
                onPointerLeave={(event) => hoverOnly(event, undefined)}
                onFocus={() => onActiveChange?.(indicator.code)}
                onBlur={() => onActiveChange?.(undefined)}
                className="col-span-4 grid min-h-12 grid-cols-subgrid items-center py-2 transition-colors hover:bg-muted/40"
              >
                <span className="min-w-0 pl-1">
                  <span className="block text-pretty text-sm leading-snug text-foreground">{label}</span>
                  {unit ? <MonoLabel className="mt-1 block text-muted-foreground">{unit}</MonoLabel> : null}
                </span>
                <span className="text-right text-sm tabular-nums text-muted-foreground">
                  <span className="sr-only">{from.period}: </span>
                  {format(from.value)}
                </span>
                <span className="text-right">
                  <span className="sr-only">{to.period}: </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{format(to.value)}</span>
                  {to.period !== now ? (
                    <MonoLabel className="mt-1 block text-muted-foreground" aria-hidden="true">
                      {to.period}
                    </MonoLabel>
                  ) : null}
                </span>
                <span className="pr-1 text-right text-sm font-medium tabular-nums text-foreground">
                  <span className="sr-only">
                    <Trans>Schimbare</Trans>:{' '}
                  </span>
                  {delta ?? '—'}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
