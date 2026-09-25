import { useId } from 'react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { useChartReading } from '../../hooks/use-chart-reading'
import { CHART_PLOT_CLASS } from '../../lib/period-chart'
import {
  derivedTrendSpan,
  formatDerived,
  isBalance,
  type DerivedRow,
  type DerivedScope,
} from '../../lib/territory-derived'
import { ChartRule, ChartTooltip } from '../charts/period-chart-parts'

type Point = readonly [number, number | null]

export type DerivedPlaces = {
  /** „Sibiu" — the place as the page spells it. */
  readonly placeName: string
  readonly countyName: string | null
  /** False where the county is no reference: the capital's county is the city itself. */
  readonly county: boolean
}

/** The drawing's frame: the years it spans, each scope's points, and where a year and a value sit. */
function trendGeometry(row: DerivedRow, options: { readonly references: boolean; readonly width: number; readonly height: number }) {
  const span = derivedTrendSpan(row)
  if (!span) return null
  const { width, height } = options
  const within = (points: readonly Point[]) => points.filter(([year]) => year >= span[0] && year <= span[1])
  const scopes: readonly DerivedScope[] = options.references ? ['place', 'county', 'country'] : ['place']
  const series = scopes.map((scope) => ({ scope, points: within(row.history[scope]) }))
  const values = series.flatMap((s) => s.points.map(([, v]) => v)).filter((v): v is number => v !== null)
  const balance = isBalance(row.def)
  const extra = [...(row.def.norm ? [row.def.norm.value] : []), ...(balance ? [0] : [])]
  const min = Math.min(...values, ...extra)
  const max = Math.max(...values, ...extra)
  const range = max - min || 1
  const pad = 3
  const x = (year: number) => pad + ((year - span[0]) / (span[1] - span[0] || 1)) * (width - pad * 2)
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2)
  return { span, series, balance, min, max, x, y, width, height }
}

/**
 * A normalized indicator's own history: the rate per year, computed from the
 * same series and the same window as the figure. The place in the INS series
 * colour (shaded when `area`), its county grey, Romania dashed; a dot on the
 * latest point; the legal target dashed green where there is one. A series
 * INS recalculated from a year (`breakYear`) is drawn only from it. A window
 * rate's points are overlapping three-year windows.
 *
 * The SVG stretches to its box (`preserveAspectRatio="none"`) with strokes
 * that do not (`vector-effect`), so one drawing serves a tile and a row.
 * `decorative` leaves the naming — and the latest dot, which a stretched
 * SVG would draw oval — to the chart that reads it (`TerritoryDerivedChart`).
 */
export function TerritoryDerivedTrend({
  row,
  width = 160,
  height = 36,
  references = true,
  area = false,
  decorative = false,
  className,
}: {
  readonly row: DerivedRow
  readonly width?: number
  readonly height?: number
  readonly references?: boolean
  readonly area?: boolean
  readonly decorative?: boolean
  readonly className?: string
}) {
  const { i18n } = useLingui()
  const frame = trendGeometry(row, { references, width, height })
  if (!frame) return null
  const { series, balance, min, max, x, y } = frame
  const runs = (points: readonly Point[]) => {
    const out: [number, number][][] = []
    let current: [number, number][] = []
    for (const [year, v] of points) {
      if (v === null) {
        if (current.length) out.push(current)
        current = []
        continue
      }
      current.push([x(year), y(v)])
    }
    if (current.length) out.push(current)
    return out
  }
  const line = (run: readonly [number, number][]) =>
    run.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const place = series[0]!.points
  const placeRuns = runs(place)
  const last = place[place.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className={cn('overflow-visible', className)}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': trendLabel(row, i18n._(row.def.label)) })}
    >
      {balance && min < 0 && max > 0 ? (
        <line x1={0} x2={width} y1={y(0)} y2={y(0)} className="stroke-border" vectorEffect="non-scaling-stroke" />
      ) : null}
      {row.def.norm ? (
        <line
          x1={0}
          x2={width}
          y1={y(row.def.norm.value)}
          y2={y(row.def.norm.value)}
          className="stroke-emerald-600/60"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {area
        ? placeRuns
            .filter((run) => run.length > 1)
            .map((run, i) => (
              <path
                key={`a${i}`}
                d={`${line(run)} L${run[run.length - 1]![0].toFixed(1)},${height} L${run[0]![0].toFixed(1)},${height} Z`}
                className="fill-chart-sky/10"
              />
            ))
        : null}
      {series
        .slice(1)
        .reverse()
        .flatMap((s) =>
          runs(s.points).map((run, i) => (
            <path
              key={`${s.scope}${i}`}
              d={line(run)}
              fill="none"
              strokeWidth={1.25}
              strokeDasharray={s.scope === 'country' ? '3 2' : undefined}
              vectorEffect="non-scaling-stroke"
              className={s.scope === 'county' ? 'stroke-muted-foreground/70' : 'stroke-muted-foreground/50'}
            />
          )),
        )}
      {placeRuns.map((run, i) => (
        <path
          key={`p${i}`}
          d={line(run)}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="stroke-chart-sky"
        />
      ))}
      {!decorative && last && last[1] !== null ? (
        <circle cx={x(last[0])} cy={y(last[1])} r={2.5} className="fill-chart-sky" vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  )
}

/** „Născuți-vii: de la 9,1 în 2010 la 6,0 în 2025" — the line said in words. */
function trendLabel(row: DerivedRow, label: string): string {
  const span = derivedTrendSpan(row)
  if (!span) return label
  const balance = isBalance(row.def)
  const place = row.history.place.filter(([year]) => year >= span[0] && year <= span[1])
  const from = formatDerived(place.find(([, v]) => v !== null)?.[1] ?? null, { signed: balance })
  const to = formatDerived(place[place.length - 1]?.[1] ?? null, { signed: balance })
  return t`${label}: de la ${from} în ${span[0]} la ${to} în ${span[1]}`
}

/**
 * A tile's history, read year by year: the idiom of the INS period charts
 * (`useChartReading`) — a mouse reads while it hovers, a tap holds the
 * reading until a tap elsewhere, and from the keyboard the arrows, Home and
 * End move along it. The reading is the rule at the year, a dot on each
 * line, and a box with the place, its county and Romania for that year —
 * or for its three-year window, the figure's own — or the legal target
 * where the references are none.
 */
export function TerritoryDerivedChart({
  row,
  places,
  className,
}: {
  readonly row: DerivedRow
  readonly places: DerivedPlaces
  readonly className?: string
}) {
  const { i18n } = useLingui()
  const hintId = useId()
  const width = 240
  const height = 48
  const frame = trendGeometry(row, { references: true, width, height })
  const years = frame ? Array.from({ length: frame.span[1] - frame.span[0] + 1 }, (_, i) => frame.span[0] + i) : []
  // Under the plot, centred on the rule; a tile's own padding is the room it may overhang.
  const { active, plotRef, tooltipRef, tooltipLeft, handlers } = useChartReading(years.length, { gutter: 16, centred: true })
  if (!frame || years.length < 2) return null

  const signed = frame.balance
  const pooled = row.def.events !== undefined
  const label = i18n._(row.def.label)
  const unit = i18n._(row.def.unit)
  const valueAt = (scope: DerivedScope, year: number) =>
    frame.series.find((s) => s.scope === scope)?.points.find(([y]) => y === year)?.[1] ?? null
  const period = (year: number) => (pooled ? `${year - 2}–${year}` : String(year))
  const countyLabel = places.countyName ? t`Județul ${places.countyName}` : t`Județ`
  const norm = row.def.noReferences ? row.def.norm : undefined
  const lines = (year: number) => [
    { key: 'place', swatch: 'bg-chart-sky', label: places.placeName, value: valueAt('place', year), dashed: false },
    ...(norm
      ? [{ key: 'norm', swatch: 'border-emerald-600/70', label: t`Ținta legală`, value: norm.value, dashed: true }]
      : [
          ...(places.county
            ? [{ key: 'county', swatch: 'bg-muted-foreground/70', label: countyLabel, value: valueAt('county', year), dashed: false }]
            : []),
          { key: 'country', swatch: 'border-muted-foreground/60', label: t`România`, value: valueAt('country', year), dashed: true },
        ]),
  ]
  const spoken = (year: number) =>
    [period(year), ...lines(year).map((line) => `${line.label} ${formatDerived(line.value, { signed })}`)].join(', ')
  const reading = active === null ? null : years[active]!
  const latest = years[years.length - 1]!
  const xPct = (year: number) => (frame.x(year) / width) * 100
  const yPct = (value: number) => (frame.y(value) / height) * 100
  const dot = (scope: DerivedScope, year: number, emphasis: boolean) => {
    const value = valueAt(scope, year)
    if (value === null) return null
    return (
      <span
        key={`${scope}-${year}`}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card',
          scope === 'place' ? 'bg-chart-sky' : 'bg-muted-foreground',
          emphasis ? 'size-2.5' : 'size-1.5 ring-0',
        )}
        style={{ left: `${xPct(year)}%`, top: `${yPct(value)}%` }}
      />
    )
  }

  return (
    <div
      ref={plotRef}
      tabIndex={0}
      role="slider"
      aria-label={trendLabel(row, label)}
      aria-describedby={hintId}
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={years.length - 1}
      aria-valuenow={active ?? years.length - 1}
      aria-valuetext={spoken(reading ?? latest)}
      className={cn(CHART_PLOT_CLASS, 'rounded-sm', className)}
      {...handlers}
    >
      <span id={hintId} className="sr-only">
        {t`Săgețile stânga și dreapta trec de la un an la altul; Home și End duc la primul și la ultimul.`}
      </span>
      <TerritoryDerivedTrend row={row} width={width} height={height} area decorative className="block size-full" />
      {reading === null ? (
        // At rest, the latest point: round, whatever the tile's width.
        dot('place', latest, false)
      ) : (
        <>
          <ChartRule left={xPct(reading)} />
          {(['country', 'county', 'place'] as const).map((scope) =>
            scope === 'place' || (!norm && (scope === 'country' || places.county)) ? dot(scope, reading, scope === 'place') : null,
          )}
          <ChartTooltip tooltipRef={tooltipRef} left={tooltipLeft} className="top-full mt-2 min-w-0">
            <p className="mb-1 flex items-baseline justify-between gap-3 font-medium tabular-nums text-foreground">
              <span>{period(reading)}</span>
              <span className="font-normal text-muted-foreground">{unit}</span>
            </p>
            <ul className="space-y-0.5">
              {lines(reading).map((line) => (
                <li key={line.key} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn('w-3 shrink-0', line.dashed ? `border-t border-dashed ${line.swatch}` : `h-0.5 rounded-full ${line.swatch}`)}
                  />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{line.label}</span>
                  <span className="tabular-nums text-foreground">{formatDerived(line.value, { signed })}</span>
                </li>
              ))}
            </ul>
            {pooled ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                <Trans>medie pe 3 ani</Trans>
              </p>
            ) : null}
          </ChartTooltip>
        </>
      )}
    </div>
  )
}

/** The key for the trends' three lines, said once for the section. */
export function TerritoryDerivedTrendKey({
  placeName,
  countyName,
}: {
  readonly placeName: string
  readonly countyName: string | null
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-hidden="true">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full bg-chart-sky" />
        {placeName}
      </span>
      {countyName ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-muted-foreground/70" />
          {t`Județul ${countyName}`}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <span className="w-4 border-t border-dashed border-muted-foreground/60" />
        {t`România`}
      </span>
    </span>
  )
}
