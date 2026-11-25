import { useId, useState, type KeyboardEvent } from 'react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { t } from '@lingui/core/macro'
import { niceScale } from '@/features/statistics/lib/period-chart'
import { count, moneyText, moneyTick } from '@/features/private-companies/lib/company-profile-format'
import type { CompanyProfileModel, NetPoint } from '@/features/private-companies/lib/company-profile-model'
import { measureLabel, netPointLabel } from '@/features/private-companies/lib/company-profile-text'
import { cn } from '@/lib/utils'

/**
 * PROTOTYPE (owner, 25 November 2026: „focus on a good chart"; „I want one
 * graphic, … different versions so I can choose"). A company's years as one
 * figure, its panels sharing the years and nothing else — one scale each,
 * never two on one panel. Turnover is a pale bar (or an area), the bottom
 * line a solid bar from zero (a loss red and below it; an admitted profit
 * whose result is held outlined, never drawn as a result), people a line.
 *
 * Years with no comparable values in a row collapse into one narrow hatched
 * column named by its span („2012–2018"), so seven empty slots do not take
 * half the width. Pointing at a year (a tap; the arrow keys) highlights it
 * across both panels and reads its three figures.
 */

type Slot = { readonly kind: 'year'; readonly index: number; readonly year: number } | { readonly kind: 'gap'; readonly from: number; readonly to: number }

/** A year a slot of its own; a run of two or more years with no comparable values one narrow slot. */
function slotsOf(span: readonly number[], missing: ReadonlySet<number>): readonly Slot[] {
  const slots: Slot[] = []
  let run: number[] = []
  const flush = () => {
    if (run.length >= 2) slots.push({ kind: 'gap', from: run[0]!, to: run[run.length - 1]! })
    else for (const year of run) slots.push({ kind: 'year', index: span.indexOf(year), year })
    run = []
  }
  span.forEach((year, index) => {
    if (missing.has(year)) {
      run.push(year)
      return
    }
    flush()
    slots.push({ kind: 'year', index, year })
  })
  flush()
  return slots
}

const GAP_WIDTH = 0.8

/** The bottom line's name over its panel, as the page's switch names it („Rezultat net", „Rezultat sau profit net"). */
const netChartTitle = (net: readonly NetPoint[]) => measureLabel('profit', net)

/**
 * The chart's versions, for the owner to choose, each one figure:
 * - `panouri`: money (turnover and the bottom line) above, people in a short panel below;
 * - `trei`: three panels, one scale each — turnover, the bottom line, people — so a small result still reads;
 * - `bani`: money only; people in each year's reading;
 * - `arie`: money only, turnover as an area, the bottom line as bars;
 * - `comutator`: one measure at a time, chosen by a switch, each on its own scale.
 */
export type YearsChartVersion = 'panouri' | 'trei' | 'bani' | 'arie' | 'comutator'

type PanelKind = 'money' | 'turnover' | 'net' | 'people'
type Panel = { readonly kind: PanelKind; readonly height: string; readonly title?: string; readonly allTicks: boolean }

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
const percent = (fraction: number) => `${(fraction * 100).toFixed(3)}%`

export function CompanyYearsChart({
  model,
  className,
  version = 'panouri',
}: {
  readonly model: CompanyProfileModel
  readonly className?: string
  readonly version?: YearsChartVersion
}) {
  const id = useId()
  const [measure, setMeasure] = useState<'turnover' | 'net' | 'people'>('turnover')
  const span = model.span
  const turnover = model.series.turnover.map((point) => point.value)
  const net = model.series.net
  const netValues = net.map((point) => point.value)
  const employees = model.series.employees.map((point) => point.value)
  const slots = slotsOf(span, new Set(model.missingYears))
  const units = slots.reduce((sum, slot) => sum + (slot.kind === 'gap' ? GAP_WIDTH : 1), 0)
  let cursor = 0
  const placed = slots.map((slot) => {
    const width = (slot.kind === 'gap' ? GAP_WIDTH : 1) / units
    const left = cursor
    cursor += width
    return { slot, left, width }
  })
  const yearSlots = placed.filter((entry) => entry.slot.kind === 'year')
  const [active, setActive] = useState<number | null>(null)
  // Nothing is read at rest: a reading opens on a pointer, a tap or the keyboard.
  const shown = active ?? -1
  const isActive = (slot: Slot) => yearSlots[shown]?.slot === slot

  const tall = 'h-64 sm:h-80'
  const panels: readonly Panel[] =
    version === 'panouri'
      ? [{ kind: 'money', height: tall, allTicks: true }, { kind: 'people', height: 'h-20 sm:h-24', title: t`Salariați`, allTicks: false }]
      : version === 'trei'
        ? [
            { kind: 'turnover', height: 'h-44 sm:h-52', title: t`Cifra de afaceri`, allTicks: true },
            { kind: 'net', height: 'h-28 sm:h-32', title: netChartTitle(net), allTicks: true },
            { kind: 'people', height: 'h-20 sm:h-24', title: t`Salariați`, allTicks: false },
          ]
        : version === 'comutator'
          ? [{ kind: measure, height: tall, allTicks: true }]
          : [{ kind: 'money', height: tall, allTicks: true }]
  const area = version === 'arie'
  const kinds = new Set(panels.map((panel) => panel.kind))
  const showsTurnover = kinds.has('money') || kinds.has('turnover')
  const showsNet = kinds.has('money') || kinds.has('net')

  const hasLoss = net.some((point) => point.value !== null && point.value < 0)
  const hasProfitOnly = net.some((point) => point.kind === 'profit' && point.value !== null)
  // Every year labelled where they fit (past twelve, every other one); on a phone every third, the newest always.
  const last = yearSlots.length - 1
  const labelled = (position: number) => yearSlots.length <= 12 || position % 2 === last % 2
  const phoneLabelled = (position: number) => position % 3 === last % 3

  const reading = (() => {
    const entry = yearSlots[shown]
    if (!entry || entry.slot.kind !== 'year') return null
    const index = entry.slot.index
    return { entry, year: entry.slot.year, turnover: turnover[index] ?? null, net: net[index] as NetPoint | undefined, employees: employees[index] ?? null }
  })()

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = yearSlots.length - 1
    const from = active ?? last + 1
    const next = event.key === 'ArrowLeft' ? from - 1 : event.key === 'ArrowRight' ? Math.min(from + 1, last) : event.key === 'Home' ? 0 : event.key === 'End' ? last : null
    if (next === null) return
    event.preventDefault()
    setActive(Math.max(0, Math.min(last, next)))
  }

  const swatch = (className: string) => <span className={cn('inline-block size-2.5 shrink-0 rounded-[2px]', className)} aria-hidden="true" />
  const netTone = (point: NetPoint | undefined) =>
    point?.value != null && point.value < 0 ? 'bg-destructive' : point?.kind === 'profit' ? 'border-2 border-primary bg-background' : 'bg-primary'

  /** A run of points, broken at every year without a value and at every gap. */
  const runsOf = (values: readonly (number | null)[], y: (value: number) => number) => {
    const runs: { readonly x: number; readonly y: number }[][] = []
    let run: { x: number; y: number }[] = []
    for (const { slot, left, width } of placed) {
      const value = slot.kind === 'year' ? (values[slot.index] ?? null) : null
      if (value === null) {
        if (run.length) runs.push(run)
        run = []
        continue
      }
      run.push({ x: (left + width / 2) * 1000, y: y(value) * 100 })
    }
    if (run.length) runs.push(run)
    return runs
  }

  const renderPanel = (panel: Panel, position: number) => {
    const values = (
      panel.kind === 'money' ? [...turnover, ...netValues] : panel.kind === 'turnover' ? turnover : panel.kind === 'net' ? netValues : employees
    ).filter((value): value is number => value !== null)
    const scale = panel.kind === 'people' ? niceScale(0, Math.max(1, ...values), panel.allTicks ? 4 : 3) : scaleOf(values, panel.allTicks ? 4 : 3)
    const y = (value: number) => (scale.to - value) / (scale.to - scale.from || 1)
    const zero = y(0)
    const ticks = panel.allTicks ? scale.ticks : [...new Set([scale.from, 0, scale.to])].filter((tick) => tick >= scale.from && tick <= scale.to)
    const format = panel.kind === 'people' ? (value: number) => count(value) : moneyTick
    const bar = (left: number, width: number, from: number, to: number, share: number) => ({
      left: percent(left + (width * (1 - share)) / 2),
      width: percent(width * share),
      top: percent(Math.min(from, to)),
      height: percent(Math.abs(to - from)),
    })
    return (
      <div key={`${panel.kind}-${position}`} className={cn('relative', panel.height, position > 0 && 'mt-10')}>
        {panel.title && panels.length > 1 ? <span className="absolute -top-7 left-0 text-xs text-muted-foreground">{panel.title}</span> : null}
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
            <div key={`hl-${slot.year}`} className="absolute inset-y-0 bg-muted/70" style={{ left: percent(left), width: percent(width) }} aria-hidden="true" />
          ) : null,
        )}
        {/* Bars. */}
        {panel.kind !== 'people'
          ? placed.map(({ slot, left, width }) => {
              if (slot.kind !== 'year') return null
              const turn = turnover[slot.index] ?? null
              const point = net[slot.index]
              const value = point?.value ?? null
              const drawTurnover = (panel.kind === 'money' && !area) || panel.kind === 'turnover'
              const drawNet = panel.kind === 'money' || panel.kind === 'net'
              const netShare = panel.kind === 'net' ? 0.55 : 0.3
              return (
                <div key={slot.year} aria-hidden="true">
                  {drawTurnover && turn !== null ? (
                    <div className={cn('absolute rounded-t-[3px]', panel.kind === 'turnover' ? 'bg-primary/35' : 'bg-primary/20')} style={bar(left, width, zero, y(turn), 0.7)} />
                  ) : null}
                  {drawNet && value !== null ? (
                    <div className={cn('absolute', value < 0 ? 'rounded-b-[3px]' : 'rounded-t-[3px]', netTone(point))} style={bar(left, width, zero, y(value), netShare)} />
                  ) : null}
                </div>
              )
            })
          : null}
        {/* Turnover as an area (`arie`). */}
        {panel.kind === 'money' && area ? (
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
            {runsOf(turnover, y).map((points, key) => (
              <g key={key}>
                <polygon
                  points={`${points[0]!.x},${zero * 100} ${points.map((point) => `${point.x},${point.y}`).join(' ')} ${points[points.length - 1]!.x},${zero * 100}`}
                  className="fill-primary/15"
                />
                <polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" className="stroke-primary/60" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              </g>
            ))}
          </svg>
        ) : null}
        {/* People: a line and its points. */}
        {panel.kind === 'people' ? (
          <>
            <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
              {runsOf(employees, y).map((points, key) => (
                <polyline key={key} points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" className="stroke-amber-500" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
            {placed.map(({ slot, left, width }) => {
              if (slot.kind !== 'year') return null
              const value = employees[slot.index] ?? null
              if (value === null) return null
              return (
                <span
                  key={slot.year}
                  className={cn('absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500 ring-2 ring-background', isActive(slot) ? 'size-3' : 'size-2')}
                  style={{ left: percent(left + width / 2), top: percent(y(value)) }}
                  aria-hidden="true"
                />
              )
            })}
          </>
        ) : null}
      </div>
    )
  }

  return (
    <figure className={cn('w-full', className)} aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="sr-only">
        {t`Cifra de afaceri, rezultatul net și salariații, pe ani`}
      </figcaption>
      {version === 'comutator' ? (
        <div className="mb-4 sm:w-fit">
          <IndicatorToggle
            label={t`Graficul arată`}
            options={[
              { key: 'turnover', label: t`Cifra de afaceri` },
              { key: 'net', label: netChartTitle(net) },
              { key: 'people', label: t`Salariați` },
            ]}
            value={measure}
            onChange={(key: 'turnover' | 'net' | 'people') => setMeasure(key)}
          />
        </div>
      ) : null}
      {/* The legend: the marks as drawn; none for a lone line, whose switch names it. */}
      {showsTurnover || showsNet ? (
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          {showsTurnover && panels.length === 1 && kinds.has('money') ? (
            <li className="inline-flex items-center gap-1.5">
              {area ? <span className="inline-block h-2.5 w-3 shrink-0 border-t-2 border-primary/60 bg-primary/15" aria-hidden="true" /> : swatch('bg-primary/20')}
              {t`Cifra de afaceri`}
            </li>
          ) : kinds.has('money') ? (
            <li className="inline-flex items-center gap-1.5">
              {swatch('bg-primary/20')}
              {t`Cifra de afaceri`}
            </li>
          ) : null}
          {showsNet ? (
            <>
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
            </>
          ) : null}
        </ul>
      ) : null}

      <div
        role="group"
        tabIndex={0}
        aria-label={t`Anii: săgețile stânga și dreapta trec de la un an la altul`}
        onKeyDown={onKey}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setActive(null)
        }}
        className={cn('relative pl-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', panels.length > 1 && panels[0]?.title ? 'mt-10' : 'mt-4')}
      >
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
                key={slot.year}
                className={cn(
                  'absolute -translate-x-1/2 font-mono text-[11px] tabular-nums',
                  isActive(slot) ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  !phoneLabelled(position) && !isActive(slot) && 'max-sm:hidden',
                )}
                style={{ left: percent(left + width / 2) }}
              >
                {slot.year}
              </span>
            )
          })}
        </div>

        {/* Hit areas: a year across every panel. */}
        <div className="absolute inset-y-0 left-16 right-0">
          {yearSlots.map(({ slot, left, width }, position) => (
            <div
              key={slot.kind === 'year' ? slot.year : position}
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

        {/* The year's reading, beside its column: all three figures, whatever the panels draw. */}
        {reading ? (
          <div
            aria-live="polite"
            className={cn(
              'pointer-events-none absolute top-0 z-10 w-max min-w-48 rounded-sm border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md',
              reading.entry.left + reading.entry.width / 2 > 0.6 ? '-translate-x-full' : '',
            )}
            // The plot starts after the 4rem gutter: a fraction of it is 4rem + fraction × (100% − 4rem).
            style={{
              left:
                reading.entry.left + reading.entry.width / 2 > 0.6
                  ? `calc(4rem + (100% - 4rem) * ${reading.entry.left.toFixed(4)} - 0.5rem)`
                  : `calc(4rem + (100% - 4rem) * ${(reading.entry.left + reading.entry.width).toFixed(4)} + 0.5rem)`,
            }}
          >
            <span className="block font-mono tabular-nums text-muted-foreground">{reading.year}</span>
            <dl className="mt-1.5 grid grid-cols-[auto_auto] gap-x-4 gap-y-1">
              <dt className="inline-flex items-center gap-1.5">
                {swatch('bg-primary/20')}
                {t`Cifra de afaceri`}
              </dt>
              <dd className="text-right font-medium tabular-nums">{reading.turnover === null ? '—' : moneyText(reading.turnover)}</dd>
              <dt className="inline-flex items-center gap-1.5">
                {swatch(netTone(reading.net))}
                {netPointLabel(reading.net)}
              </dt>
              <dd className="text-right font-medium tabular-nums">{reading.net?.value == null ? '—' : moneyText(reading.net.value)}</dd>
              <dt className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-2.5 bg-amber-500" aria-hidden="true" />
                {t`Salariați`}
              </dt>
              <dd className="text-right font-medium tabular-nums">{reading.employees === null ? '—' : count(reading.employees)}</dd>
            </dl>
          </div>
        ) : null}
      </div>

      {/* The same figures, read out as a table. */}
      <table className="sr-only">
        <caption>{t`Cifra de afaceri, rezultatul net și salariații, pe ani`}</caption>
        <thead>
          <tr>
            <th scope="col">{t`An`}</th>
            <th scope="col">{t`Cifra de afaceri`}</th>
            <th scope="col">{t`Rezultat net`}</th>
            <th scope="col">{t`Salariați`}</th>
          </tr>
        </thead>
        <tbody>
          {span.map((year, index) => (
            <tr key={year}>
              <th scope="row">{year}</th>
              <td>{turnover[index] == null ? '—' : moneyText(turnover[index]!)}</td>
              <td>{net[index]?.value == null ? '—' : `${moneyText(net[index]!.value!)} (${netPointLabel(net[index])})`}</td>
              <td>{employees[index] == null ? '—' : count(employees[index]!)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
