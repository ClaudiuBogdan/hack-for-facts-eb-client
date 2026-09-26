import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { CountUpValue } from '@/features/landing/components/count-up'
import type { NumberLocale } from '@/features/landing/lib/national-facts'
import { cn } from '@/lib/utils'
import type { StatisticsHubIndicator } from '@/schemas/statistics'
import { describeValueStatus } from '../../lib/value-status'
import { HubSparkline } from './hub-charts'
import { useIndicatorLabel } from './hub-labels'
import { formatIndicatorValue } from '../../lib/units'
import { formatHubPeriod } from '../../lib/period'
import { indicatorDetailSearch } from '../../lib/hub-indicators'

// ───────────────────────────────────────────────────── figures band ──

export type HubFact = {
  readonly key: string
  readonly value: number
  /** Decimal places, as the source published them. */
  readonly digits: number
  /** `%` sits against the figure; a word („lei") sits after it, a step quieter. */
  readonly unit?: string
  readonly label: ReactNode
  readonly note: ReactNode
  /** Wraps the term in its link; the caller owns the route. */
  readonly link: (label: ReactNode, className: string) => ReactNode
}

/** A band of fewer than four figures spreads them over the width rather than leaving cells empty. */
const FIGURE_COLUMNS: Readonly<Record<number, string>> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
}

/**
 * Up to four figures, a description list with the value on top. Counts up on
 * arrival. Each cell is `div > dt + dd` — the only content the `dl` model
 * allows — with the term as the link, so the pairing survives assistive
 * technology and the whole cell still answers hover.
 */
export function HubFiguresBand({
  facts,
  locale,
  className,
}: {
  readonly facts: readonly HubFact[]
  readonly locale: NumberLocale
  readonly className?: string
}) {
  return (
    <dl className={cn('grid', FIGURE_COLUMNS[facts.length] ?? 'grid-cols-2 lg:grid-cols-4', className)}>
      {facts.map((fact, index) => (
        <div
          key={fact.key}
          data-reveal
          className={cn(
            'group relative flex flex-col px-5 py-6 transition-colors hover:bg-muted/40 sm:py-7',
            index % 2 === 1 && 'border-l',
            index >= 2 && 'border-t lg:border-t-0',
            index >= 1 && 'lg:border-l',
          )}
        >
          <dt className="order-2 mt-2.5 flex flex-1 flex-col">
            {fact.link(
              <MonoLabel className="block leading-relaxed text-foreground">{fact.label}</MonoLabel>,
              'after:absolute after:inset-0 after:content-[""] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring',
            )}
            {fact.note ? <MonoLabel className="mt-auto block pt-3 leading-relaxed text-muted-foreground">{fact.note}</MonoLabel> : null}
          </dt>
          <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
            <CountUpValue value={fact.value} digits={fact.digits} locale={locale} />
            {fact.unit === '%' ? (
              '%'
            ) : fact.unit ? (
              <span className="ml-1.5 text-base font-medium tracking-normal text-muted-foreground sm:text-xl">{fact.unit}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// ─────────────────────────────────────────────────── figure rows ──

/** One national indicator per row: label and period, the sparkline, the value. */
export function HubFigureRows({
  indicators,
  className,
}: {
  readonly indicators: readonly StatisticsHubIndicator[]
  readonly className?: string
}) {
  const labelOf = useIndicatorLabel()
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {indicators.map((indicator) => {
        const formatted = formatIndicatorValue(indicator)
        return (
          <li key={indicator.code}>
            <Link
              to="/ins/seturi/$cod"
              params={{ cod: indicator.code }}
              search={indicatorDetailSearch(indicator)}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 py-3 transition-colors hover:bg-muted/40 sm:grid-cols-[1fr_6rem_8.5rem]"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-foreground">{labelOf(indicator)}</span>
                <MonoLabel className="mt-1 block text-muted-foreground">
                  {indicator.period ? formatHubPeriod(indicator.period) : '—'} · {indicator.code}
                  {indicator.valueStatus ? ` · ${describeValueStatus(indicator.valueStatus)}` : null}
                </MonoLabel>
              </span>
              {/* The INS series colour: the chart the row opens draws the same line. */}
              <span className="hidden justify-self-end text-chart-sky sm:block">
                {indicator.series.length > 1 ? <HubSparkline points={indicator.series} width={96} height={24} /> : null}
              </span>
              <span className="text-right">
                {formatted ? (
                  <>
                    <span className="block text-base font-semibold tabular-nums tracking-tight text-foreground">{formatted.value}</span>
                    {formatted.unit ? <MonoLabel className="block text-muted-foreground">{formatted.unit}</MonoLabel> : null}
                  </>
                ) : (
                  <MonoLabel className="block text-muted-foreground">—</MonoLabel>
                )}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
