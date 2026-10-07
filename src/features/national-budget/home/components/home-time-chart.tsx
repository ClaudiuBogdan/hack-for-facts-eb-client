import { useId, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { ChartGridLines, ChartRule, ChartTooltip, ChartValueTicks } from '@/features/statistics/components/charts/period-chart-parts'
import { useChartReading } from '@/features/statistics/hooks/use-chart-reading'
import { CHART_HEIGHT, CHART_PLOT_CLASS, CHART_WIDTH, gapRegions, niceScale } from '@/features/statistics/lib/period-chart'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'

/**
 * The time bands' line chart, on the INS charts' kit (an SVG stretched to its
 * frame, every text HTML over it): a few series over one period axis, the
 * space between two of them shaded by which runs above (the deficit, or a
 * surplus), the page's year marked with a rule and its dots, a period with
 * no value left as a gap that says why. Pointing (or the arrows, once the
 * chart has focus) reads a period; a click makes it the page's year.
 */

export type LineTone = 'navy' | 'sky' | 'grey'

export type LineSeries = {
  readonly key: string
  readonly label: string
  /** The plotting coordinate per period; null for a gap. */
  readonly values: readonly (number | null)[]
  /** What a reader is told per period: the exact amount, rounded on its digits. */
  readonly texts: readonly (string | null)[]
  readonly tone: LineTone
  readonly dashed?: boolean
}

const STROKE: Readonly<Record<LineTone, string>> = { navy: 'stroke-primary', sky: 'stroke-chart-sky', grey: 'stroke-muted-foreground' }
const DOT: Readonly<Record<LineTone, string>> = { navy: 'bg-primary', sky: 'bg-chart-sky', grey: 'bg-muted-foreground' }

/** A legend's mark: a short line, dashed where the series is. */
export function LineKey({ tone, dashed, children }: { readonly tone: LineTone; readonly dashed?: boolean; readonly children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className={cn('h-0 w-5 border-t-2', dashed && 'border-dashed', tone === 'navy' ? 'border-primary' : tone === 'sky' ? 'border-chart-sky' : 'border-muted-foreground')} />
      {children}
    </span>
  )
}

export function TimeLines({
  periods,
  axisLabel,
  ticks,
  series,
  shade,
  selected,
  gaps,
  onPick,
  label,
  format = (value) => formatHubNumber(value),
  extra,
  height = 'h-56 sm:h-64 lg:h-80',
  fromZero = true,
}: {
  readonly periods: readonly string[]
  /** The words under a period on the axis. */
  readonly axisLabel: (period: string, index: number) => string
  /** The periods that get a label on the axis. */
  readonly ticks: readonly number[]
  readonly series: readonly LineSeries[]
  /** Shade the space between two series: `upper` above `lower` is `above`, the other way `below`. */
  readonly shade?: { readonly upper: string; readonly lower: string; readonly above: string; readonly below: string }
  /** The page's period: a rule, and the dots at rest. */
  readonly selected: number | null
  /** Why a period has no value, per period. */
  readonly gaps?: readonly (string | null)[]
  readonly onPick?: (index: number) => void
  readonly label: string
  readonly format?: (value: number) => string
  /** More lines in a reading's box (the deficit). */
  readonly extra?: (index: number) => ReactNode
  readonly height?: string
  readonly fromZero?: boolean
}) {
  const count = periods.length
  const values = series.flatMap((entry) => entry.values.filter((value): value is number => value !== null))
  const scale = niceScale(fromZero ? Math.min(0, ...values) : Math.min(...values), Math.max(...values))
  const { active, plotRef, tooltipRef, tooltipLeft, handlers } = useChartReading(count)
  const hintId = useId()
  if (count < 2 || values.length === 0) return null

  const xAt = (index: number) => (index / (count - 1)) * 100
  const yAt = (value: number) => (1 - (value - scale.from) / (scale.to - scale.from)) * 100
  const toXY = (index: number, value: number) => `${((xAt(index) * CHART_WIDTH) / 100).toFixed(1)},${((yAt(value) * CHART_HEIGHT) / 100).toFixed(1)}`
  const toPath = (line: readonly (number | null)[]) =>
    line.map((value, index) => (value === null ? '' : `${index === 0 || line[index - 1] === null || line[index - 1] === undefined ? 'M' : 'L'}${toXY(index, value)}`)).join(' ')
  const upper = shade ? series.find((entry) => entry.key === shade.upper) : undefined
  const lower = shade ? series.find((entry) => entry.key === shade.lower) : undefined
  const regions = upper && lower ? gapRegions(upper.values, lower.values) : []
  const signs = new Set(regions.map((region) => region.sign))
  const reading = active ?? null
  const shown = reading ?? selected
  const spoken = (index: number) =>
    [periods[index], ...series.map((entry) => `${entry.label} ${entry.texts[index] ?? gaps?.[index] ?? '—'}`)].join(', ')

  return (
    <figure>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {series.map((entry) => (
          <LineKey key={entry.key} tone={entry.tone} dashed={entry.dashed}>
            {entry.label}
          </LineKey>
        ))}
        {shade && signs.has(-1) ? (
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[2px] bg-foreground/10 ring-1 ring-inset ring-foreground/20" aria-hidden="true" />
            {shade.below}
          </span>
        ) : null}
        {shade && signs.has(1) ? (
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[2px] bg-chart-sky/15 ring-1 ring-inset ring-chart-sky/30" aria-hidden="true" />
            {shade.above}
          </span>
        ) : null}
      </figcaption>

      {/* Room above the plot for the page's year, named over its rule. */}
      <div className="mt-8 pl-14">
        <div
          ref={plotRef}
          tabIndex={0}
          role="slider"
          aria-label={label}
          aria-describedby={hintId}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={count - 1}
          aria-valuenow={shown ?? count - 1}
          aria-valuetext={spoken(shown ?? count - 1)}
          className={cn(CHART_PLOT_CLASS, height, onPick && 'cursor-pointer')}
          onClick={() => {
            if (onPick && active !== null) onPick(active)
          }}
          {...handlers}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && onPick && active !== null) {
              event.preventDefault()
              onPick(active)
              return
            }
            handlers.onKeyDown(event)
          }}
        >
          <span id={hintId} className="sr-only">
            {onPick ? t`Săgețile trec de la o perioadă la alta; Enter o alege.` : t`Săgețile trec de la o perioadă la alta.`}
          </span>
          <ChartValueTicks ticks={scale.ticks} top={yAt} format={format} />
          {/* A period without a value: a hatched slot the width of a step. */}
          {gaps?.map((gap, index) =>
            gap ? (
              <span
                key={index}
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -translate-x-1/2 border-x border-dashed border-muted-foreground/40 bg-muted/60"
                style={{ left: `${xAt(index)}%`, width: `${Math.max(100 / (count - 1) / 2, 1)}%` }}
              />
            ) : null,
          )}
          <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" className="block size-full overflow-visible" aria-hidden="true">
            <ChartGridLines ticks={scale.ticks} top={yAt} emphasis={scale.from < 0 ? 0 : undefined} />
            {regions.map((region, index) => (
              <path
                key={index}
                d={`${region.polygon.map(([x, value], point) => `${point === 0 ? 'M' : 'L'}${toXY(x, value)}`).join(' ')}Z`}
                className={region.sign < 0 ? 'fill-foreground/10' : 'fill-chart-sky/15'}
              />
            ))}
            {[...series].reverse().map((entry) => (
              <path
                key={entry.key}
                d={toPath(entry.values)}
                fill="none"
                className={STROKE[entry.tone]}
                strokeWidth={2}
                strokeDasharray={entry.dashed ? '5 4' : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {/* A value with no neighbour draws no line: it is a dot of its own (2012, between two years without a bulletin). */}
          {series.flatMap((entry) =>
            entry.values.map((value, index) =>
              value !== null && (entry.values[index - 1] ?? null) === null && (entry.values[index + 1] ?? null) === null ? (
                <span
                  key={`${entry.key}-${index}`}
                  aria-hidden="true"
                  className={cn('pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full', DOT[entry.tone])}
                  style={{ left: `${xAt(index)}%`, top: `${yAt(value)}%` }}
                />
              ) : null,
            ),
          )}
          {selected !== null && reading === null ? (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-primary/60" style={{ left: `${xAt(selected)}%` }}>
              <MonoLabel className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-primary">{axisLabel(periods[selected] ?? '', selected)}</MonoLabel>
            </span>
          ) : null}
          {reading !== null ? <ChartRule left={xAt(reading)} /> : null}
          {shown !== null
            ? series.map((entry) => {
                const value = entry.values[shown]
                if (value === null || value === undefined) return null
                return (
                  <span
                    key={entry.key}
                    aria-hidden="true"
                    className={cn('pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background', DOT[entry.tone])}
                    style={{ left: `${xAt(shown)}%`, top: `${yAt(value)}%` }}
                  />
                )
              })
            : null}
          {reading !== null ? (
            <ChartTooltip tooltipRef={tooltipRef} left={tooltipLeft}>
              <MonoLabel className="block text-muted-foreground">{axisLabel(periods[reading] ?? '', reading)}</MonoLabel>
              {gaps?.[reading] && series.every((entry) => entry.values[reading] === null) ? (
                <p className="mt-2 text-muted-foreground">{gaps[reading]}</p>
              ) : (
                <dl className="mt-2 grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1">
                  {series.map((entry) => (
                    <div key={entry.key} className="contents">
                      <dt className="flex items-center gap-1.5">
                        <span className={cn('size-2 rounded-full', DOT[entry.tone])} />
                        {entry.label}
                      </dt>
                      <dd className="text-right font-medium tabular-nums">{entry.texts[reading] ?? gaps?.[reading] ?? '—'}</dd>
                    </div>
                  ))}
                  {extra ? extra(reading) : null}
                </dl>
              )}
              {onPick ? <p className="mt-2 border-t pt-1.5 text-[11px] text-muted-foreground">{t`Clic: arată anul acesta pe pagină`}</p> : null}
            </ChartTooltip>
          ) : null}
        </div>
        <div className="relative mt-2 h-4" aria-hidden="true">
          {ticks.map((index, position) => (
            <span
              key={index}
              className={cn(
                'absolute top-0 whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground',
                position === 0 ? 'translate-x-0' : position === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
                (reading ?? selected) === index && 'text-foreground',
              )}
              style={{ left: `${xAt(index)}%` }}
            >
              {axisLabel(periods[index] ?? '', index)}
            </span>
          ))}
        </div>
      </div>
    </figure>
  )
}


/** The rows of a reading's box past the series: a dt/dd pair, ruled off. */
export function ReadingRow({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <>
      <dt className="mt-1 border-t pt-1 text-muted-foreground">{label}</dt>
      <dd className="mt-1 border-t pt-1 text-right font-medium tabular-nums">{value ?? '—'}</dd>
    </>
  )
}
