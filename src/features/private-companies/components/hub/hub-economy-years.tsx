import { useId, type ReactNode } from 'react'
import { plural, t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { ChartGridLines, ChartPeriodAxis, ChartTooltip, ChartValueTicks } from '@/features/statistics/components/charts/period-chart-parts'
import { useChartReading } from '@/features/statistics/hooks/use-chart-reading'
import { CHART_HEIGHT, CHART_PLOT_CLASS, CHART_WIDTH, niceScale, yearTickIndices } from '@/features/statistics/lib/period-chart'
import { cn } from '@/lib/utils'
import { gapReasonLabel } from '../../lib/company-analytics-text'
import { ANAF_FIRST_YEAR, ECONOMY_UNIT, economyChange, economyMeasureLabel, partialYear, type EconomyMeasure } from '../../lib/hub-economy'
import { formatHubNumber, formatHubValue, formatHubValueText, type HubUnit } from '../../lib/hub-format'
import type { HubFiscalYear } from '../../lib/hub-snapshot-types'
import { HubInfoNote } from './hub-info-note'

/**
 * „Economia, an de an": one measure through every fiscal year of the
 * companies analytics release — turnover, net result or average employees —
 * one bar a year, each year counting its own companies with a statement.
 *
 * The values are the release's qualified ones, frozen in the hub's snapshot:
 * a raw sum would carry keying errors and other forms' fields. Only the bars'
 * heights are floating-point; every figure printed is the snapshot's own. A
 * year nobody reported a value for is a gap that says so, never a zero bar; a
 * loss hangs below the zero line. The statements were published by the
 * Ministry of Finance until 2018 and by ANAF since 2019: the break is marked.
 * The last year, with fewer statements than the one before it, is possibly
 * incomplete (observed coverage, not proof): hatched, and said.
 *
 * Pointing at the chart (or a finger along it, or the arrow keys once it has
 * focus) reads a year: its figure exactly, the change from the year before
 * and who reported it. To a screen reader the chart is a slider over the
 * years whose value is that reading.
 */

/** The value axis's scale: billions or millions of lei, millions or thousands of people — said once above the ticks, which are numbers only. */
function axisScale(largest: number, unit: HubUnit): { readonly divisor: number; readonly label: string } {
  if (unit === 'lei') return largest >= 1e9 ? { divisor: 1e9, label: t`mld. lei` } : { divisor: 1e6, label: t`mil. lei` }
  return largest >= 1e6 ? { divisor: 1e6, label: t`mil. salariați` } : { divisor: 1e3, label: t`mii de salariați` }
}

/** Who reported a year's figure. Romanian writes „de" before a count ending in 20–99 or 00, and not before one ending in 01–19. */
function reportedText(year: HubFiscalYear, measure: EconomyMeasure): string {
  const reported = formatHubNumber(year[measure].reported)
  return plural(year.filers, {
    one: `Raportat de ${reported} dintr-o firmă cu bilanț`,
    few: `Raportat de ${reported} din # firme cu bilanț`,
    other: `Raportat de ${reported} din # de firme cu bilanț`,
  })
}

export function HubEconomyChart({ years, measure }: { readonly years: readonly HubFiscalYear[]; readonly measure: EconomyMeasure }) {
  const unit = ECONOMY_UNIT[measure]
  const count = years.length
  const values = years.map((year) => year[measure].sum)
  const present = values.filter((value): value is number => value !== null)
  const scale = niceScale(Math.min(0, ...present), Math.max(0, ...present))
  const axis = axisScale(Math.max(Math.abs(scale.from), Math.abs(scale.to)), unit)
  const partialAt = years.findIndex((year) => year.year === partialYear(years))
  // At rest, and where the keyboard opens: the last whole year.
  const restIndex = partialAt >= 0 ? partialAt - 1 : count - 1
  const { active, plotRef, tooltipRef, tooltipLeft, handlers } = useChartReading(count, { bands: true, rest: restIndex })
  const gaps = [...new Set(years.flatMap((year) => (year[measure].sum === null && year[measure].gap ? [year[measure].gap] : [])))]
  const hintId = useId()
  const hatchId = useId()
  const partial = partialYear(years)
  // The year read at rest: the last whole one.
  const lastWhole = partial !== null ? count - 2 : count - 1
  if (count < 2) return null
  if (present.length === 0)
    // A measure the release offers for no year: said, never an empty chart.
    return (
      <p className="py-10 text-sm text-muted-foreground" data-testid="company-hub-economy-unavailable">
        {gaps.length > 0 ? gaps.map((gap) => gapReasonLabel(gap)).join(' · ') : t`Nicio valoare raportată`}
      </p>
    )

  const band = CHART_WIDTH / count
  const yAt = (value: number) => (1 - (value - scale.from) / (scale.to - scale.from)) * 100
  const yPx = (value: number) => (yAt(value) * CHART_HEIGHT) / 100
  const zero = yPx(0)
  const centre = (index: number) => ((index + 0.5) / count) * 100
  const breakAt = years.findIndex((year) => year.year === ANAF_FIRST_YEAR)

  const readingAt = (index: number) => {
    const year = years[index]
    const value = values[index] ?? null
    const previous = index > 0 ? (values[index - 1] ?? null) : null
    // A possibly incomplete year is not compared: its change would be its missing statements.
    return { year, value, change: value === null || year?.year === partial ? null : economyChange(previous, value, measure) }
  }
  const spoken = (index: number) => {
    const { year, value, change } = readingAt(index)
    if (!year) return ''
    return [
      String(year.year),
      value === null ? (year[measure].gap ? gapReasonLabel(year[measure].gap) : t`nicio valoare raportată`) : formatHubValueText(value, unit),
      // The exact figure too: the scaled one is the eye's.
      value !== null && unit === 'lei' ? t`${formatHubNumber(value)} lei` : null,
      change ? t`${change} față de anul precedent` : null,
      reportedText(year, measure),
      year.year === partial ? t`posibil incomplet` : null,
    ]
      .filter(Boolean)
      .join(', ')
  }
  const reading = active === null ? null : readingAt(active)
  const shown = active ?? lastWhole

  return (
    <figure data-testid="company-hub-economy-chart">
      <MonoLabel className="block text-muted-foreground">{axis.label}</MonoLabel>
      <div className="mt-3 pl-14">
        <div
          ref={plotRef}
          tabIndex={0}
          role="slider"
          aria-label={t`${economyMeasureLabel(measure)}, ${years[0]?.year}–${years[count - 1]?.year}`}
          aria-describedby={hintId}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={count - 1}
          aria-valuenow={shown}
          aria-valuetext={spoken(shown)}
          className={cn(CHART_PLOT_CLASS, 'h-56 sm:h-64 lg:h-[22.5rem]')}
          {...handlers}
        >
          <span id={hintId} className="sr-only">
            {t`Săgețile stânga și dreapta trec de la un an la altul; Home și End duc la primul și la ultimul.`}
          </span>

          <ChartValueTicks ticks={scale.ticks} top={yAt} format={(tick) => formatHubNumber(tick / axis.divisor, { digits: Number.isInteger(tick / axis.divisor) ? 0 : 1 })} />

          {/* The publishers: the Ministry of Finance's years, then ANAF's, at the top of their bars. */}
          {breakAt > 0 ? (
            <>
              <MonoLabel className="pointer-events-none absolute top-0 hidden -translate-x-full whitespace-nowrap pr-2 text-[10px] text-muted-foreground sm:block" style={{ left: `${(breakAt / count) * 100}%` }} aria-hidden="true">
                {t`Ministerul Finanțelor`}
              </MonoLabel>
              <MonoLabel className="pointer-events-none absolute top-0 whitespace-nowrap pl-2 text-[10px] text-muted-foreground" style={{ left: `${(breakAt / count) * 100}%` }} aria-hidden="true">
                {t`ANAF`}
              </MonoLabel>
            </>
          ) : null}

          <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" className="block size-full overflow-visible" aria-hidden="true">
            <defs>
              <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" className="fill-primary/15" />
                <line x1="0" y1="0" x2="0" y2="6" className="stroke-primary/60" strokeWidth="2.5" />
              </pattern>
            </defs>
            <ChartGridLines ticks={scale.ticks} top={yAt} emphasis={scale.from < 0 ? 0 : undefined} />
            {breakAt > 0 ? (
              <line x1={breakAt * band} x2={breakAt * band} y1={0} y2={CHART_HEIGHT} className="stroke-foreground/30" strokeDasharray="3 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ) : null}
            {values.map((value, index) => {
              const year = years[index]
              if (!year) return null
              const x = index * band + band * 0.18
              const width = band * 0.64
              if (value === null) {
                // Nothing reported: a gap on the zero line, never a zero bar.
                return <line key={year.year} x1={x} x2={x + width} y1={zero} y2={zero} className="stroke-muted-foreground" strokeDasharray="2 3" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              }
              if (value === 0) {
                // An explicit zero: a mark on the zero line, never a bar on either side of it.
                return <line key={year.year} x1={x} x2={x + width} y1={zero} y2={zero} className="stroke-foreground/60" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              }
              // At least a pixel tall, on the value's own side of zero.
              const height = Math.max(Math.abs(yPx(value) - zero), 1)
              const top = value > 0 ? zero - height : zero
              const isActive = index === shown
              const tone =
                year.year === partial ? undefined
                : value < 0 ? (isActive ? 'fill-destructive' : 'fill-destructive/55')
                : isActive ? 'fill-primary'
                : 'fill-primary/40'
              return (
                <rect
                  key={year.year}
                  x={x}
                  y={top}
                  width={width}
                  height={height}
                  fill={year.year === partial ? `url(#${hatchId})` : undefined}
                  className={cn(tone, year.year === partial && isActive && 'stroke-primary', 'transition-[fill] duration-150')}
                  strokeWidth={year.year === partial && isActive ? 1.5 : 0}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </svg>

          {reading && reading.year ? (
            <ChartTooltip tooltipRef={tooltipRef} left={tooltipLeft}>
              <MonoLabel className="block text-muted-foreground">
                {reading.year.year}
                {reading.year.year === partial ? ` · ${t`posibil incomplet`}` : ''}
              </MonoLabel>
              {reading.value === null ? (
                <p className="mt-1.5 text-sm text-muted-foreground">{reading.year[measure].gap ? gapReasonLabel(reading.year[measure].gap) : t`Nicio valoare raportată`}</p>
              ) : (
                <>
                  <p className="mt-1.5 text-base font-semibold tabular-nums text-foreground">{formatHubValueText(reading.value, unit)}</p>
                  {unit === 'lei' ? <p className="tabular-nums text-muted-foreground">{t`${formatHubNumber(reading.value)} lei`}</p> : null}
                  {reading.change ? <p className="mt-1 tabular-nums text-muted-foreground">{t`${reading.change} față de ${reading.year.year - 1}`}</p> : null}
                </>
              )}
              <p className="mt-1.5 border-t pt-1.5 text-muted-foreground">
                {reportedText(reading.year, measure)}
              </p>
            </ChartTooltip>
          ) : null}
        </div>

        <ChartPeriodAxis
          periods={years.map((year) => String(year.year))}
          ticks={yearTickIndices(years.map((year) => String(year.year)))}
          left={centre}
          active={active}
          centred
        />
      </div>

      <figcaption className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 bg-primary/40" aria-hidden="true" />
          {unit === 'lei' ? t`Pe an fiscal, în lei nominali` : t`Pe an fiscal`}
        </span>
        {present.some((value) => value < 0) ? (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 bg-destructive/55" aria-hidden="true" />
            {t`Pierdere netă, sub zero`}
          </span>
        ) : null}
        {partial !== null ? (
          <span className="flex items-center gap-1.5">
            <svg className="h-2.5 w-4" aria-hidden="true">
              <rect width="100%" height="100%" fill={`url(#${hatchId})`} />
            </svg>
            {t`${partial}: mai puține bilanțuri decât în ${partial - 1}, posibil incomplet`}
          </span>
        ) : null}
      </figcaption>
    </figure>
  )
}

/**
 * The run of years in two figures: the first year with a value and the last
 * whole one, and the change between them — a percent where both are positive,
 * the difference otherwise (a net result can change sign). What the years
 * are and where they come from (`note`) sits behind an info button at the end
 * of the change, as the analysis head keeps its notes.
 */
export function HubEconomySpan({
  years,
  measure,
  note,
  className,
}: {
  readonly years: readonly HubFiscalYear[]
  readonly measure: EconomyMeasure
  readonly note?: ReactNode
  readonly className?: string
}) {
  const unit = ECONOMY_UNIT[measure]
  const partial = partialYear(years)
  const whole = years.filter((year) => year.year !== partial && year[measure].sum !== null)
  const first = whole[0]
  const last = whole[whole.length - 1]
  if (!first || !last || first === last) return null
  const from = first[measure].sum ?? 0
  const to = last[measure].sum ?? 0
  const change = economyChange(from, to, measure)
  const figure = (year: HubFiscalYear) => {
    const value = formatHubValue(year[measure].sum ?? 0, unit)
    // The unit under the figure: two figures and an arrow fit a phone and the band's narrow column.
    return (
      <div className="min-w-0">
        <MonoLabel className="block text-muted-foreground">{year.year}</MonoLabel>
        <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl xl:text-3xl">{value.value}</p>
        <p className="text-sm text-muted-foreground">{value.unit}</p>
      </div>
    )
  }
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-x-4 border-y border-border/70 py-4', className)} data-testid="company-hub-economy-span">
      {figure(first)}
      <span className="pb-6 text-muted-foreground" aria-hidden="true">
        →
      </span>
      {figure(last)}
      <p className="col-span-3 mt-2 flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
        {change ? t`${change} din ${first.year} până în ${last.year}` : null}
        {note ? <HubInfoNote>{note}</HubInfoNote> : null}
      </p>
    </div>
  )
}
