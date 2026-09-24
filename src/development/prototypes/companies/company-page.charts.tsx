import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import {
  ChartGridLines,
  ChartPeriodAxis,
  ChartRule,
  ChartTooltip,
  ChartValueTicks,
} from '@/features/statistics/components/charts/period-chart-parts'
import { CHART_HEIGHT, CHART_PLOT_CLASS, CHART_WIDTH, niceScale } from '@/features/statistics/lib/period-chart'
import { cn } from '@/lib/utils'

/**
 * Annual bars in the INS charts' idiom — ticks in the gutter, HTML text over
 * a stretched SVG, a rule and a tooltip on the year being read, the same
 * pointer and keyboard model — for figures that are one number per year
 * rather than a trend: a statement per fiscal year, money per year.
 *
 * A year with nothing in it keeps its slot, shaded, so a gap in the
 * statements reads as a gap and never as a fall to zero.
 */

export interface BarSeries {
  readonly key: string
  readonly label: string
  readonly values: readonly (number | null)[]
  /** The bars' SVG fill utility. */
  readonly fill: string
  /** The legend swatch's background utility. */
  readonly swatch: string
  /** Outlined, stacked on top: a figure of another kind (an obligation, not a payment). */
  readonly outline?: boolean
}

const GUTTER = 56
const TOOLTIP_GAP = 12

/** The reading of a bar chart: `useChartReading`, with a year per slot rather than per point. */
function useSlotReading(count: number) {
  const [selection, setSelection] = useState<{ readonly index: number; readonly held: boolean } | null>(null)
  const active = selection === null ? null : Math.min(selection.index, count - 1)
  const held = selection?.held ?? false
  const plotRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipLeft, setTooltipLeft] = useState(0)

  useEffect(() => {
    if (!held) return
    const release = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && plotRef.current?.contains(event.target)) return
      setSelection(null)
    }
    document.addEventListener('pointerdown', release)
    return () => document.removeEventListener('pointerdown', release)
  }, [held])

  useLayoutEffect(() => {
    const plot = plotRef.current
    const tooltip = tooltipRef.current
    if (active === null || !plot || !tooltip) return
    const width = plot.clientWidth
    const size = tooltip.offsetWidth
    const x = ((active + 0.5) / count) * width
    const right = x + TOOLTIP_GAP
    const left = x - TOOLTIP_GAP - size
    setTooltipLeft(right + size <= width ? right : left >= -GUTTER ? left : Math.min(Math.max(-GUTTER, x - size / 2), width - size))
  }, [active, count])

  const setActive = (index: number | null, hold = false) =>
    setSelection((current) => {
      if (index === null) return current === null ? current : null
      return current && current.index === index && current.held === hold ? current : { index, held: hold }
    })
  const indexAt = (clientX: number) => {
    const rect = plotRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return count - 1
    return Math.min(count - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * count)))
  }
  const handlers = {
    onPointerDown: (event: PointerEvent) => setActive(indexAt(event.clientX), event.pointerType !== 'mouse'),
    onPointerMove: (event: PointerEvent) => setActive(indexAt(event.clientX), event.pointerType !== 'mouse'),
    onPointerLeave: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') setActive(null)
    },
    onPointerCancel: (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') setActive(null)
    },
    onFocus: () => {
      if (active === null) setActive(count - 1)
    },
    onBlur: () => setActive(null),
    onKeyDown: (event: KeyboardEvent) => {
      const from = active ?? count - 1
      const next =
        event.key === 'ArrowLeft' ? Math.max(0, active === null ? from : from - 1)
        : event.key === 'ArrowRight' ? Math.min(count - 1, active === null ? from : from + 1)
        : event.key === 'Home' ? 0
        : event.key === 'End' ? count - 1
        : undefined
      if (next !== undefined) {
        event.preventDefault()
        setActive(next)
      } else if (event.key === 'Escape') {
        setActive(null)
      }
    },
  }
  return { active, plotRef, tooltipRef, tooltipLeft, handlers }
}

/** First, last, and the years ending in 0 or 5 well clear of both. */
function yearTicks(years: readonly number[]): readonly number[] {
  const last = years.length - 1
  if (last < 1) return last === 0 ? [0] : []
  const inner = years.flatMap((year, index) => (year % 5 === 0 && index >= 3 && last - index >= 3 ? [index] : []))
  return [0, ...inner, last]
}

export function YearBars({
  years,
  series,
  format,
  label,
  emptyLabel,
  className = 'h-52 sm:h-60 lg:h-72',
  legend = true,
  shadeEmpty = true,
  integer = false,
  note,
}: {
  readonly years: readonly number[]
  readonly series: readonly BarSeries[]
  /** A value as a tick and in the tooltip. */
  readonly format: (value: number) => string
  /** The chart's accessible name. */
  readonly label: string
  /** What a year with no value in any series means („Fără bilanț"). */
  readonly emptyLabel?: (index: number) => string
  readonly className?: string
  readonly legend?: boolean
  /** Shade a year with nothing in it: a gap in the record. Off where an empty year is a real zero (no payment). */
  readonly shadeEmpty?: boolean
  /** Whole-number values (people): ticks at whole numbers only, so „0, 1, 1" never labels three heights. */
  readonly integer?: boolean
  /**
   * A line for a year's reading beyond its values — a year the read stops
   * inside („până în iunie"), records with no published amount. A year with
   * a note is drawn quieter, so a part-year never reads as a fall.
   */
  readonly note?: (index: number) => { readonly text: string; readonly quiet?: boolean } | null
}) {
  const count = years.length
  const { active, plotRef, tooltipRef, tooltipLeft, handlers } = useSlotReading(count)
  const hintId = useId()
  if (count === 0) return null

  const stacks = years.map((_, index) => {
    let up = 0
    let down = 0
    return series.map((entry) => {
      const value = entry.values[index] ?? null
      if (value === null || value === 0) return null
      if (value > 0) {
        const segment = { from: up, to: up + value }
        up += value
        return segment
      }
      const segment = { from: down + value, to: down }
      down += value
      return segment
    })
  })
  const tops = stacks.flatMap((stack) => stack.flatMap((segment) => (segment ? [segment.from, segment.to] : [])))
  const nice = niceScale(Math.min(0, ...tops), Math.max(0, ...tops), 4)
  const scale = integer ? { ...nice, ticks: nice.ticks.filter((tick) => Number.isInteger(tick)) } : nice
  const yAt = (value: number) => (1 - (value - scale.from) / (scale.to - scale.from)) * 100
  const slot = CHART_WIDTH / count
  const bar = Math.min(slot * 0.62, 34)
  const centre = (index: number) => ((index + 0.5) / count) * 100
  const empty = (index: number) => series.every((entry) => (entry.values[index] ?? null) === null)
  const shown = series.filter((entry) => entry.values.some((value) => value !== null && value !== 0))

  const readingAt = (index: number) => ({
    year: years[index] ?? 0,
    rows: series.map((entry) => ({ entry, value: entry.values[index] ?? null })).filter((row) => row.value !== null),
  })
  const spoken = (index: number) => {
    const at = readingAt(index)
    const extra = note?.(index)?.text
    if (empty(index)) return [String(at.year), emptyLabel?.(index) ?? '—', extra].filter(Boolean).join(', ')
    return [String(at.year), ...at.rows.map((row) => `${row.entry.label} ${format(row.value as number)}`), extra].filter(Boolean).join(', ')
  }
  const reading = active === null ? null : readingAt(active)
  const readingNote = active === null ? null : (note?.(active) ?? null)
  const range = years[0] === years[count - 1] ? String(years[0]) : `${years[0]}–${years[count - 1]}`

  return (
    <figure>
      {legend && shown.length > 1 ? (
        <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {shown.map((entry) => (
            <span key={entry.key} className="flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-[2px]', entry.swatch)} aria-hidden="true" />
              {entry.label}
            </span>
          ))}
        </figcaption>
      ) : null}
      <div className={cn('pl-14', legend && shown.length > 1 && 'mt-4')}>
        <div
          ref={plotRef}
          tabIndex={0}
          role="slider"
          aria-label={`${label}, ${range}`}
          aria-describedby={hintId}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={count - 1}
          aria-valuenow={active ?? count - 1}
          aria-valuetext={spoken(active ?? count - 1)}
          className={cn(CHART_PLOT_CLASS, className)}
          {...handlers}
        >
          <span id={hintId} className="sr-only">
            {t`Săgețile stânga și dreapta trec de la un an la altul; Home și End duc la primul și la ultimul.`}
          </span>
          <ChartValueTicks ticks={scale.ticks} top={yAt} format={format} />
          <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" className="block size-full overflow-visible" aria-hidden="true">
            {years.map((year, index) =>
              shadeEmpty && empty(index) ? (
                <rect key={`gap-${year}`} x={index * slot + 1} width={slot - 2} y={0} height={CHART_HEIGHT} className="fill-muted/60" />
              ) : null,
            )}
            <ChartGridLines ticks={scale.ticks} top={yAt} emphasis={scale.from < 0 ? 0 : undefined} />
            {stacks.map((stack, index) =>
              stack.map((segment, position) => {
                const entry = series[position]
                if (!segment || !entry) return null
                const y = (yAt(segment.to) * CHART_HEIGHT) / 100
                const height = Math.max(((yAt(segment.from) - yAt(segment.to)) * CHART_HEIGHT) / 100, 0.8)
                return (
                  <rect
                    key={`${entry.key}-${index}`}
                    x={index * slot + (slot - bar) / 2}
                    width={bar}
                    y={y}
                    height={height}
                    className={cn(
                      entry.outline ? 'fill-primary/10 stroke-primary' : entry.fill,
                      (active !== null && active !== index) || (active === null && note?.(index)?.quiet) ? 'opacity-40' : null,
                      'transition-opacity',
                    )}
                    strokeWidth={entry.outline ? 1.25 : undefined}
                    strokeDasharray={entry.outline ? '3 2' : undefined}
                    vectorEffect={entry.outline ? 'non-scaling-stroke' : undefined}
                  />
                )
              }),
            )}
          </svg>
          {active !== null && reading ? (
            <>
              <ChartRule left={centre(active)} />
              <ChartTooltip tooltipRef={tooltipRef} left={tooltipLeft}>
                <MonoLabel className="block text-muted-foreground">{reading.year}</MonoLabel>
                {empty(active) ? (
                  <p className="mt-2 text-muted-foreground">{emptyLabel?.(active) ?? '—'}</p>
                ) : (
                  <dl className="mt-2 grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1">
                    {reading.rows.map((row) => (
                      <TooltipRow key={row.entry.key} swatch={row.entry.swatch} label={row.entry.label} value={format(row.value as number)} />
                    ))}
                  </dl>
                )}
                {readingNote ? <p className="mt-2 border-t pt-1.5 text-muted-foreground">{readingNote.text}</p> : null}
              </ChartTooltip>
            </>
          ) : null}
        </div>
        <ChartPeriodAxis periods={years.map(String)} ticks={yearTicks(years)} left={centre} active={active} />
      </div>
    </figure>
  )
}

function TooltipRow({ swatch, label, value }: { readonly swatch: string; readonly label: ReactNode; readonly value: string }) {
  return (
    <>
      <dt className="flex items-center gap-1.5">
        <span className={cn('size-2 shrink-0 rounded-[2px]', swatch)} />
        {label}
      </dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </>
  )
}

/**
 * Turnover, net result and people over every year with a statement, on one
 * reading: the full-size sibling of the head's chart. People are a line in a
 * band of their own above, with its low and high in the gutter in its colour;
 * lei are bars below on their own axis — turnover wide and pale, the net
 * result narrow and solid in front of it from the same zero, a loss red and
 * under the line. The two bands share only the years, so no line is read
 * against a bar's scale. A year with no statement stays shaded across both.
 * Pointer and keyboard as on `YearBars`: a rule, and the year's three figures.
 */
export function CombinedYears({
  years,
  turnover,
  net,
  employees,
  labels,
  formatTick,
  formatMoney,
  formatCount,
  emptyLabel,
  label,
}: {
  readonly years: readonly number[]
  readonly turnover: readonly (number | null)[]
  readonly net: readonly (number | null)[]
  readonly employees: readonly (number | null)[]
  readonly labels: { readonly turnover: string; readonly net: string; readonly loss: string; readonly employees: string }
  readonly formatTick: (value: number) => string
  readonly formatMoney: (value: number) => string
  readonly formatCount: (value: number) => string
  /** What a year with no value at all means („Niciun bilanț publicat"). */
  readonly emptyLabel: (index: number) => string
  /** The chart's accessible name. */
  readonly label: string
}) {
  const count = years.length
  const { active, plotRef, tooltipRef, tooltipLeft, handlers } = useSlotReading(count)
  const hintId = useId()
  if (count === 0) return null

  const lei = [...turnover, ...net].filter((value): value is number => value !== null)
  const scale = niceScale(Math.min(0, ...lei), Math.max(0, ...lei), 4)
  const yAt = (value: number) => (1 - (value - scale.from) / (scale.to - scale.from)) * 100
  const staff = employees.filter((value): value is number => value !== null)
  const hasStaff = staff.length > 0
  const staffLow = Math.min(...staff)
  const staffHigh = Math.max(...staff)
  // The people's band shows the change, from its low to its high, padded; the gutter says both ends.
  const staffPad = (staffHigh - staffLow) * 0.15 || Math.max(staffHigh * 0.1, 1)
  const staffY = (value: number) => (1 - (value - (staffLow - staffPad)) / (staffHigh - staffLow + staffPad * 2)) * 100
  const slot = CHART_WIDTH / count
  const wide = Math.min(slot * 0.62, 34)
  const narrow = Math.min(slot * 0.26, 14)
  const centre = (index: number) => ((index + 0.5) / count) * 100
  const empty = (index: number) => (turnover[index] ?? null) === null && (net[index] ?? null) === null && (employees[index] ?? null) === null
  const losses = net.some((value) => value !== null && value < 0)
  const dim = (index: number) => active !== null && active !== index && 'opacity-40'

  let staffPath = ''
  employees.forEach((value, index) => {
    if (value === null) return
    const move = staffPath === '' || (employees[index - 1] ?? null) === null
    staffPath += `${move ? 'M' : 'L'}${((centre(index) * CHART_WIDTH) / 100).toFixed(1)},${staffY(value).toFixed(2)} `
  })

  const spoken = (index: number) => {
    if (empty(index)) return `${years[index]}, ${emptyLabel(index)}`
    const part = (name: string, value: number | null, format: (value: number) => string) => `${name} ${value === null ? '—' : format(value)}`
    return [
      String(years[index]),
      part(labels.turnover, turnover[index] ?? null, formatMoney),
      part(labels.net, net[index] ?? null, formatMoney),
      part(labels.employees, employees[index] ?? null, formatCount),
    ].join(', ')
  }
  const gaps = years.map((year, index) =>
    empty(index) ? <rect key={`gap-${year}`} x={index * slot + 1} width={slot - 2} y={0} height="100%" className="fill-muted/60" /> : null,
  )

  return (
    <figure>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-primary/30" aria-hidden="true" />
          {labels.turnover}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-primary" aria-hidden="true" />
          {labels.net}
        </span>
        {losses ? (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-destructive/70" aria-hidden="true" />
            {labels.loss}
          </span>
        ) : null}
        {hasStaff ? (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-amber-500 dark:bg-amber-400" aria-hidden="true" />
            {labels.employees}
          </span>
        ) : null}
      </figcaption>
      <div className="mt-4 pl-14">
        <div
          ref={plotRef}
          tabIndex={0}
          role="slider"
          aria-label={`${label}, ${years[0] === years[count - 1] ? years[0] : `${years[0]}–${years[count - 1]}`}`}
          aria-describedby={hintId}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={count - 1}
          aria-valuenow={active ?? count - 1}
          aria-valuetext={spoken(active ?? count - 1)}
          className={cn(CHART_PLOT_CLASS, 'flex flex-col gap-4')}
          {...handlers}
        >
          <span id={hintId} className="sr-only">
            {t`Săgețile stânga și dreapta trec de la un an la altul; Home și End duc la primul și la ultimul.`}
          </span>

          {hasStaff ? (
            <div className="relative h-14 sm:h-16" aria-hidden="true">
              {[staffHigh, staffLow].map((value, index) =>
                index === 1 && staffLow === staffHigh ? null : (
                  <span
                    key={index}
                    className="pointer-events-none absolute right-full -translate-y-1/2 pr-3 font-mono text-[10px] tabular-nums text-amber-600 dark:text-amber-400"
                    style={{ top: `${staffY(value).toFixed(1)}%` }}
                  >
                    {formatCount(value)}
                  </span>
                ),
              )}
              <svg viewBox={`0 0 ${CHART_WIDTH} 100`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                {gaps}
                <path d={staffPath} fill="none" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              {employees.map((value, index) =>
                value === null ? null : (
                  <span
                    key={years[index]}
                    className={cn(
                      'absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background transition-all',
                      active === index ? 'size-2.5 bg-amber-600 dark:bg-amber-400' : 'size-1.5 bg-amber-500/80',
                    )}
                    style={{ left: `${centre(index).toFixed(2)}%`, top: `${staffY(value).toFixed(1)}%` }}
                  />
                ),
              )}
            </div>
          ) : null}

          <div className="relative h-44 sm:h-52 lg:h-60" aria-hidden="true">
            <ChartValueTicks ticks={scale.ticks} top={yAt} format={formatTick} />
            <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" className="block size-full overflow-visible">
              {gaps}
              <ChartGridLines ticks={scale.ticks} top={yAt} emphasis={scale.from < 0 ? 0 : undefined} />
              {years.map((year, index) =>
                [
                  { key: 'turnover', value: turnover[index] ?? null, width: wide },
                  { key: 'net', value: net[index] ?? null, width: narrow },
                ].map((bar) => {
                  if (bar.value === null || bar.value === 0) return null
                  const from = yAt(Math.max(bar.value, 0))
                  const to = yAt(Math.min(bar.value, 0))
                  return (
                    <rect
                      key={`${bar.key}-${year}`}
                      x={index * slot + (slot - bar.width) / 2}
                      width={bar.width}
                      y={(from * CHART_HEIGHT) / 100}
                      height={Math.max(((to - from) * CHART_HEIGHT) / 100, 0.8)}
                      className={cn(
                        'transition-opacity',
                        bar.key === 'turnover' ? 'fill-primary/30' : bar.value < 0 ? 'fill-destructive/70' : 'fill-primary',
                        dim(index),
                      )}
                    />
                  )
                }),
              )}
            </svg>
          </div>

          {active !== null ? (
            <>
              <ChartRule left={centre(active)} />
              <ChartTooltip tooltipRef={tooltipRef} left={tooltipLeft}>
                <MonoLabel className="block text-muted-foreground">{years[active]}</MonoLabel>
                {empty(active) ? (
                  <p className="mt-2 text-muted-foreground">{emptyLabel(active)}</p>
                ) : (
                  <dl className="mt-2 grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1">
                    {[
                      { key: 'turnover', name: labels.turnover, swatch: 'size-2 rounded-[2px] bg-primary/30', value: turnover[active] ?? null, format: formatMoney },
                      {
                        key: 'net',
                        name: (net[active] ?? 0) < 0 ? labels.loss : labels.net,
                        swatch: cn('size-2 rounded-[2px]', (net[active] ?? 0) < 0 ? 'bg-destructive/70' : 'bg-primary'),
                        value: net[active] ?? null,
                        format: formatMoney,
                      },
                      { key: 'employees', name: labels.employees, swatch: 'h-0.5 w-3 rounded-full bg-amber-500', value: employees[active] ?? null, format: formatCount },
                    ].map((row) => (
                      <Fragment key={row.key}>
                        <dt className="flex items-center gap-1.5">
                          <span className="flex w-3 shrink-0 justify-center">
                            <span className={row.swatch} />
                          </span>
                          {row.name}
                        </dt>
                        <dd className={cn('text-right font-medium tabular-nums', row.value !== null && row.value < 0 && 'text-destructive')}>
                          {row.value === null ? '—' : row.format(row.value)}
                        </dd>
                      </Fragment>
                    ))}
                  </dl>
                )}
              </ChartTooltip>
            </>
          ) : null}
        </div>
        <ChartPeriodAxis periods={years.map(String)} ticks={yearTicks(years)} left={centre} active={active} />
      </div>
    </figure>
  )
}
