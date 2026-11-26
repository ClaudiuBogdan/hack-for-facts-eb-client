import { useId, useState, type KeyboardEvent } from 'react'
import { t } from '@lingui/core/macro'
import { ArrowUpRight } from 'lucide-react'
import { niceScale } from '@/features/statistics/lib/period-chart'
import { count, moneyText, moneyTick } from '../../lib/company-profile-format'
import type { CompanyProfileModel } from '../../lib/company-profile-model'
import {
  ifrsBlankZeroNote,
  ifrsFormLabel,
  ifrsNotesLabel,
  ifrsSeamNote,
  ifrsTurnoverNote,
  measureLabel,
  netChartLabel,
  netPointLabel,
  publisherName,
} from '../../lib/company-profile-text'
import { isEmptyRow, sameStretch, yearRowsOf, type YearRow } from '../../lib/company-years-rows'
import { cn } from '@/lib/utils'
import { HubInfoNote } from '../hub/hub-info-note'

/**
 * A company's years as one figure (owner, 25 November 2026: „focus on a good
 * chart", version „Două panouri"): two panels that share the years and
 * nothing else — one scale each, never two on one panel.
 *
 * - Money, above: turnover as a wide pale bar, the bottom line as a narrow
 *   solid bar in front of it from the same zero — a loss red and below it, an
 *   admitted profit whose result is held outlined, never drawn as a result. A
 *   small loss takes only the room it needs below zero.
 * - People, below and shorter: the average headcount as a line, from zero.
 *
 * Each year is drawn in the series of its own form (owner, 25–26 November
 * 2026, „curat"): the years the publisher put on the IFRS form — its own file's
 * (the Ministry's, FY2012–2018) or ANAF's IFRS layout — are named by a thin
 * rule „IFRS" over each run and the legend's „Raportat pe formularul IFRS",
 * whose ⓘ holds the turnover note and the publishers' seam; every other year
 * carries no form label. The line joins only consecutive years on the same
 * form: it breaks at a change of form, at a missing year and at a blank. A zero
 * is a zero.
 *
 * Years with nothing to draw in a row (unmarked ones) collapse into one narrow
 * hatched column named by its span. Nothing is read at rest; pointing at a year
 * (a tap; the arrow keys) marks it across both panels and reads its form, its
 * publisher, its three figures and its source. The same figures are a table
 * for assistive technology.
 */

type Slot = { readonly kind: 'year'; readonly row: YearRow } | { readonly kind: 'gap'; readonly from: number; readonly to: number }

/** A year a slot of its own; a run of two or more unmarked years with nothing to draw, one narrow slot. */
function slotsOf(rows: readonly YearRow[]): readonly Slot[] {
  const slots: Slot[] = []
  let run: YearRow[] = []
  const flush = () => {
    if (run.length >= 2) slots.push({ kind: 'gap', from: run[0]!.year, to: run[run.length - 1]!.year })
    else for (const row of run) slots.push({ kind: 'year', row })
    run = []
  }
  for (const row of rows) {
    if (isEmptyRow(row) && row.form === null) {
      run.push(row)
      continue
    }
    flush()
    slots.push({ kind: 'year', row })
  }
  flush()
  return slots
}

const GAP_WIDTH = 0.8

type PanelKind = 'money' | 'people'
type Panel = { readonly kind: PanelKind; readonly height: string; readonly allTicks: boolean }

/** About `count` ticks over zero and the values; a small negative part takes whole steps of the positive scale, never half the panel. */
function scaleOf(values: readonly number[], count: number): { readonly from: number; readonly to: number; readonly ticks: readonly number[] } {
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  if (low < 0 && high > 0 && -low < high / 2) {
    // The positive scale's ticks; below zero only the room the lowest value needs (and a tick where a whole step fits).
    const up = niceScale(0, high, count)
    const step = (up.ticks[1] ?? up.to) - (up.ticks[0] ?? 0) || up.to
    const from = Math.min(low * 1.15, -step / 10)
    const below = Array.from({ length: Math.floor(-from / step) }, (_, index) => -(index + 1) * step).reverse()
    return { from, to: up.to, ticks: [...below, ...up.ticks] }
  }
  return niceScale(low, high, count)
}

const HATCH = 'bg-[repeating-linear-gradient(135deg,transparent_0_6px,hsl(var(--muted-foreground)/0.12)_6px_7px)]'
const percent = (fraction: number) => `${(fraction * 100).toFixed(4)}%`

/** The figures a year's reading names. */
export type ChartMetric = 'turnover' | 'net' | 'employees'

export function CompanyYearsChart({
  model,
  reasonOf,
  className,
}: {
  readonly model: CompanyProfileModel
  /** Why a year's figure is not drawn, said in its reading in place of the figure. */
  readonly reasonOf?: (year: number, metric: ChartMetric) => string
  readonly className?: string
}) {
  const id = useId()
  const rows = yearRowsOf(model)
  const net = rows.map((row) => row.net)
  const slots = slotsOf(rows)
  const units = slots.reduce((sum, slot) => sum + (slot.kind === 'gap' ? GAP_WIDTH : 1), 0)
  let cursor = 0
  const placed = slots.map((slot) => {
    const width = (slot.kind === 'gap' ? GAP_WIDTH : 1) / units
    const left = cursor
    cursor += width
    return { slot, left, width }
  })
  const yearSlots = placed.flatMap(({ slot, left, width }) => (slot.kind === 'year' ? [{ row: slot.row, slot, left, width }] : []))
  const [active, setActive] = useState<number | null>(null)
  // Nothing is read at rest: a reading opens on a pointer, a tap or the keyboard.
  const shown = active ?? -1
  const isActive = (slot: Slot) => yearSlots[shown]?.slot === slot

  // The IFRS runs: neighbouring IFRS-form years, one rule each.
  const runs: { left: number; right: number; from: number; to: number }[] = []
  for (const entry of yearSlots) {
    if (entry.row.form !== 'ifrs') continue
    const run = runs[runs.length - 1]
    if (run && run.to === entry.row.year - 1) {
      run.right = entry.left + entry.width
      run.to = entry.row.year
    } else {
      runs.push({ left: entry.left, right: entry.left + entry.width, from: entry.row.year, to: entry.row.year })
    }
  }
  // The publishers' seam: IFRS-form years from the Ministry's file and from ANAF.
  const ministryIfrsYears = rows.filter((row) => row.form === 'ifrs' && row.ifrsFile && row.publisher === 'mfp').map((row) => row.year)
  const seam = ministryIfrsYears.length > 0 && rows.some((row) => row.form === 'ifrs' && row.year >= 2019)
  const blankThenZero = (() => {
    const before = rows.find((row) => row.year === 2018 && row.form === 'ifrs')
    const after = rows.find((row) => row.year === 2019 && row.form === 'ifrs')
    if (!before || !after) return false
    return (before.turnover === null && after.turnover === 0) || (before.employees === null && after.employees === 0)
  })()

  const panels: readonly Panel[] = [
    { kind: 'money', height: 'h-64 sm:h-80', allTicks: true },
    { kind: 'people', height: 'h-20 sm:h-24', allTicks: false },
  ]

  const hasLoss = net.some((point) => point.value !== null && point.value < 0)
  const hasProfitOnly = net.some((point) => point.kind === 'profit' && point.value !== null)
  // Every year labelled where they fit (past twelve, every other one); on a phone every third, the newest always.
  const last = yearSlots.length - 1
  const labelled = (position: number) => yearSlots.length <= 12 || position % 2 === last % 2
  const phoneLabelled = (position: number) => position % 3 === last % 3

  const reading = yearSlots[shown] ?? null

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = active ?? last + 1
    const next = event.key === 'ArrowLeft' ? from - 1 : event.key === 'ArrowRight' ? Math.min(from + 1, last) : event.key === 'Home' ? 0 : event.key === 'End' ? last : null
    if (next === null) return
    event.preventDefault()
    setActive(Math.max(0, Math.min(last, next)))
  }

  const swatch = (className: string) => <span className={cn('inline-block size-2.5 shrink-0 rounded-[2px]', className)} aria-hidden="true" />
  const netTone = (row: YearRow) =>
    row.net.value != null && row.net.value < 0 ? 'bg-destructive' : row.net.kind === 'profit' ? 'bg-background ring-2 ring-inset ring-primary' : 'bg-primary'

  /** The people line in stretches: broken at every blank, every gap and wherever two years are no stretch (`sameStretch`). */
  const stretchesOf = (y: (value: number) => number) => {
    const stretches: { readonly x: number; readonly y: number }[][] = []
    let stretch: { x: number; y: number }[] = []
    let previous: YearRow | null = null
    for (const { slot, left, width } of placed) {
      const row = slot.kind === 'year' ? slot.row : null
      if (row === null || row.employees === null) {
        if (stretch.length) stretches.push(stretch)
        stretch = []
        previous = null
        continue
      }
      if (previous && !sameStretch(previous, row)) {
        stretches.push(stretch)
        stretch = []
      }
      stretch.push({ x: (left + width / 2) * 1000, y: y(row.employees) * 100 })
      previous = row
    }
    if (stretch.length) stretches.push(stretch)
    return stretches
  }

  const renderPanel = (panel: Panel, position: number) => {
    const values = (
      panel.kind === 'money' ? rows.flatMap((row) => [row.turnover, row.net.value]) : rows.map((row) => row.employees)
    ).filter((value): value is number => value !== null)
    const scale = panel.kind === 'people' ? niceScale(0, Math.max(1, ...values), panel.allTicks ? 4 : 3) : scaleOf(values, panel.allTicks ? 4 : 3)
    const y = (value: number) => (scale.to - value) / (scale.to - scale.from || 1)
    const zero = y(0)
    const ticks = panel.allTicks ? scale.ticks : [...new Set([scale.from, 0, scale.to])].filter((tick) => tick >= scale.from && tick <= scale.to)
    const format = panel.kind === 'people' ? (value: number) => count(value) : moneyTick
    // A value is at least 2px tall, from the zero line outwards: never rounded away; a zero is a 2px mark on the line.
    const bar = (left: number, width: number, from: number, to: number, share: number) => ({
      left: percent(left + (width * (1 - share)) / 2),
      width: percent(width * share),
      top: to < from ? `min(${percent(to)}, calc(${percent(from)} - 2px))` : percent(from),
      height: `max(${percent(Math.abs(to - from))}, 2px)`,
    })
    return (
      // A clear gap between the panels, with no label in it (owner, 25 November 2026): two scales, never read as one;
      // people are named in the legend, by their colour.
      <div key={`${panel.kind}-${position}`} className={cn('relative', panel.height, position > 0 && 'mt-8')}>
        {ticks.map((tick) => (
          <div key={tick} className="pointer-events-none absolute inset-x-0" style={{ top: percent(y(tick)) }} aria-hidden="true">
            <span className={cn('absolute inset-x-0 border-t', tick === 0 ? 'border-foreground/40' : 'border-border/60')} />
            <span className="absolute right-full -translate-y-1/2 whitespace-nowrap pr-3 font-mono text-[11px] tabular-nums text-muted-foreground">{format(tick)}</span>
          </div>
        ))}
        {placed.map(({ slot, left, width }) =>
          slot.kind === 'gap' ? (
            <div key={`gap-${slot.from}`} className={cn('absolute inset-y-0', HATCH)} style={{ left: percent(left), width: percent(width) }} aria-hidden="true" />
          ) : isActive(slot) ? (
            <div key={`hl-${slot.row.year}`} className="absolute inset-y-0 bg-muted/70" style={{ left: percent(left), width: percent(width) }} aria-hidden="true" />
          ) : null,
        )}
        {/* Bars. */}
        {panel.kind === 'money'
          ? placed.map(({ slot, left, width }) => {
              if (slot.kind !== 'year') return null
              const { turnover } = slot.row
              const value = slot.row.net.value
              return (
                <div key={slot.row.year} aria-hidden="true">
                  {turnover !== null ? <div className="absolute rounded-t-[3px] bg-primary/20" style={bar(left, width, zero, y(turnover), 0.7)} /> : null}
                  {value !== null ? (
                    <div className={cn('absolute', value < 0 ? 'rounded-b-[3px]' : 'rounded-t-[3px]', netTone(slot.row))} style={bar(left, width, zero, y(value), 0.3)} />
                  ) : null}
                </div>
              )
            })
          : null}
        {/* People: a line in stretches and its points. */}
        {panel.kind === 'people' ? (
          <>
            <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
              {stretchesOf(y).map((points, key) =>
                points.length > 1 ? (
                  <polyline
                    key={key}
                    points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="none"
                    className="stroke-amber-500"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    data-testid="company-years-people-stretch"
                  />
                ) : null,
              )}
            </svg>
            {placed.map(({ slot, left, width }) => {
              if (slot.kind !== 'year' || slot.row.employees === null) return null
              return (
                <span
                  key={slot.row.year}
                  className={cn('absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500 ring-2 ring-background', isActive(slot) ? 'size-3' : 'size-2')}
                  style={{ left: percent(left + width / 2), top: percent(y(slot.row.employees)) }}
                  aria-hidden="true"
                />
              )
            })}
          </>
        ) : null}
      </div>
    )
  }

  const reasonFor = (row: YearRow, metric: ChartMetric) => reasonOf?.(row.year, metric)
  const turnoverLabel = (row: YearRow) => (row.form === 'ifrs' ? t`Cifra de afaceri netă` : t`Cifra de afaceri`)
  // The statements band's words for the same links.
  const sourceLabel = ({ year, source }: YearRow) => (source?.kind === 'mfp_resource' ? t`Fișierul pe data.gov.ro` : t`Interoghează ANAF pentru ${year}`)

  return (
    <figure className={cn('w-full', className)} aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="sr-only">
        {t`Cifra de afaceri, rezultatul net și salariații, pe ani`}
      </figcaption>
      {/* The legend: every mark as drawn, people first by their colour (owner, 25 November 2026). */}
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-flex w-3.5 items-center" aria-hidden="true">
            <span className="h-0.5 w-full bg-amber-500" />
          </span>
          {t`Salariați`}
        </li>
        <li className="inline-flex items-center gap-1.5">
          {swatch('bg-primary/20')}
          {t`Cifra de afaceri`}
        </li>
        <li className="inline-flex items-center gap-1.5">
          {swatch('bg-primary')}
          {t`Rezultat net`}
        </li>
        {hasLoss ? (
          <li className="inline-flex items-center gap-1.5">
            {swatch('bg-destructive')}
            {t`Pierdere netă`}
          </li>
        ) : null}
        {hasProfitOnly ? (
          <li className="inline-flex items-center gap-1.5">
            {swatch('border-2 border-primary bg-transparent')}
            {t`Profit net (rezultatul net reținut)`}
          </li>
        ) : null}
        {/* The only words the IFRS form adds (owner, 26 November 2026: „just a short mention"); its notes behind the ⓘ. */}
        {runs.length > 0 ? (
          <li className="inline-flex items-center gap-1.5 text-foreground" data-testid="company-years-ifrs-legend">
            <span className="inline-flex h-2.5 w-4 border-t-2 border-primary" aria-hidden="true" />
            {ifrsFormLabel()}
            <HubInfoNote label={ifrsNotesLabel()}>
              <p>{ifrsTurnoverNote()}</p>
              {seam ? (
                <p>
                  {ifrsSeamNote(ministryIfrsYears)}
                  {blankThenZero ? ` ${ifrsBlankZeroNote()}` : null}
                </p>
              ) : null}
            </HubInfoNote>
          </li>
        ) : null}
      </ul>

      <div
        role="group"
        tabIndex={0}
        aria-label={t`Anii: săgețile stânga și dreapta trec de la un an la altul`}
        onKeyDown={onKey}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setActive(null)
        }}
        className={cn('relative pl-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', runs.length > 0 ? 'mt-3' : 'mt-4')}
      >
        {/* The IFRS runs, each named by a rule over it; the full label is the legend's. */}
        {runs.length > 0 ? (
          <div className="relative mb-2 h-5" aria-hidden="true">
            {runs.map((run) => (
              <div key={run.from} className="absolute bottom-0 border-t-2 border-primary" style={{ left: percent(run.left), width: percent(run.right - run.left) }}>
                <span className="absolute bottom-full left-0 mb-0.5 whitespace-nowrap text-[10px] font-semibold leading-none text-primary">IFRS</span>
              </div>
            ))}
          </div>
        ) : null}

        {panels.map(renderPanel)}

        {/* The years. */}
        <div className="relative mt-2 h-5" aria-hidden="true">
          {placed.map(({ slot, left, width }) => {
            if (slot.kind === 'gap') {
              return (
                // On a phone the span is said under the chart: here it would run into its neighbours.
                <span key={`gap-${slot.from}`} className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground max-sm:hidden" style={{ left: percent(left + width / 2) }}>
                  {slot.from}–{slot.to}
                </span>
              )
            }
            const position = yearSlots.findIndex((entry) => entry.slot === slot)
            if (!labelled(position)) return null
            return (
              <span
                key={slot.row.year}
                className={cn(
                  'absolute -translate-x-1/2 font-mono text-[11px] tabular-nums',
                  isActive(slot) ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  !phoneLabelled(position) && !isActive(slot) && 'max-sm:hidden',
                )}
                style={{ left: percent(left + width / 2) }}
              >
                {slot.row.year}
              </span>
            )
          })}
        </div>

        {/* Hit areas: a year across every panel. */}
        <div className="absolute inset-y-0 left-16 right-0">
          {yearSlots.map(({ row, left, width }, position) => (
            <div
              key={row.year}
              className="absolute inset-y-0"
              style={{ left: percent(left), width: percent(width) }}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setActive(position)
              }}
              onClick={() => setActive(position)}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* The year's reading: its form, its publisher, all three figures whatever the panels draw, its source. One width,
            centred over its year and kept inside the plot, so a phone shows all of it. The live region stays mounted, so
            its first reading is announced. Only the source link takes the pointer: a tap elsewhere on the box reaches the
            year under it (on a phone the box covers most of the plot). */}
        <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-0 z-10">
          {reading ? (
            <div
              className="absolute top-0 w-64 max-w-full rounded-sm border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
              // The plot starts after the 4rem gutter: a point of it is 4rem + fraction × (100% − 4rem).
              style={{ left: `clamp(0px, calc(4rem + (100% - 4rem) * ${(reading.left + reading.width / 2).toFixed(4)} - 8rem), calc(100% - 16rem))` }}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-mono tabular-nums text-muted-foreground">{reading.row.year}</span>
                {reading.row.form === 'ifrs' ? <span className="font-medium text-primary">{ifrsFormLabel()}</span> : null}
              </span>
              {reading.row.publisher ? <span className="mt-0.5 block text-muted-foreground">{publisherName(reading.row.publisher)}</span> : null}
              <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1" data-testid="company-years-reading">
                <dt className="inline-flex items-center gap-1.5">
                  {swatch('bg-primary/20')}
                  {turnoverLabel(reading.row)}
                </dt>
                <Figure value={reading.row.turnover === null ? null : moneyText(reading.row.turnover)} reason={() => reasonFor(reading.row, 'turnover')} />
                <dt className="inline-flex items-center gap-1.5">
                  {swatch(netTone(reading.row))}
                  {netPointLabel(reading.row.net)}
                </dt>
                <Figure value={reading.row.net.value === null ? null : moneyText(reading.row.net.value)} reason={() => reasonFor(reading.row, 'net')} />
                <dt className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-2.5 bg-amber-500" aria-hidden="true" />
                  {t`Salariați`}
                </dt>
                <Figure value={reading.row.employees === null ? null : count(reading.row.employees)} reason={() => reasonFor(reading.row, 'employees')} />
              </dl>
              {reading.row.source ? (
                <a
                  href={reading.row.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto mt-1.5 inline-flex min-h-8 items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  data-testid="company-years-reading-source"
                >
                  {sourceLabel(reading.row)}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* The same figures, read out as a table; the form is a column only where a year is on the IFRS form. */}
      <table className="sr-only">
        <caption>{netChartLabel(net)}</caption>
        <thead>
          <tr>
            <th scope="col">{t`An`}</th>
            {runs.length > 0 ? <th scope="col">{t`Formularul`}</th> : null}
            <th scope="col">{t`Cifra de afaceri`}</th>
            <th scope="col">{measureLabel('profit', net)}</th>
            <th scope="col">{t`Salariați`}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year}>
              <th scope="row">{row.year}</th>
              {runs.length > 0 ? <td>{row.form === 'ifrs' ? ifrsFormLabel() : ''}</td> : null}
              <td>{row.turnover === null ? (reasonFor(row, 'turnover') ?? '—') : moneyText(row.turnover)}</td>
              <td>{row.net.value === null ? (reasonFor(row, 'net') ?? '—') : `${moneyText(row.net.value)} (${netPointLabel(row.net)})`}</td>
              <td>{row.employees === null ? (reasonFor(row, 'employees') ?? '—') : count(row.employees)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

/** A year's figure, or why it is not drawn — never a bare dash where the reason is known. */
function Figure({ value, reason }: { readonly value: string | null; readonly reason: () => string | undefined }) {
  if (value !== null) return <dd className="text-right font-medium tabular-nums">{value}</dd>
  return <dd className="text-right text-muted-foreground">{reason() ?? '—'}</dd>
}
