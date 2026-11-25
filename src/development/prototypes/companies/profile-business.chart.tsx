import { useId, useState, type KeyboardEvent } from 'react'
import { t } from '@lingui/core/macro'
import { niceScale } from '@/features/statistics/lib/period-chart'
import { count, moneyText, moneyTick } from '@/features/private-companies/lib/company-profile-format'
import type { CompanyProfileModel, NetPoint } from '@/features/private-companies/lib/company-profile-model'
import { netPointLabel } from '@/features/private-companies/lib/company-profile-text'
import { cn } from '@/lib/utils'

/**
 * PROTOTYPE (owner, 25 November 2026: „focus on a good chart"). A company's
 * years on one reading, in two panels that share the years and nothing else
 * — one scale each, never two on one panel:
 *
 * - money, above: turnover as a wide pale bar, the bottom line as a narrow
 *   solid bar in front of it from the same zero (a loss red and below the
 *   line; an admitted profit whose result is held outlined, never drawn as a
 *   result);
 * - people, below and shorter: the average headcount as a line, its own
 *   axis.
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

export function CompanyYearsChart({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const id = useId()
  const span = model.span
  const turnover = model.series.turnover.map((point) => point.value)
  const net = model.series.net
  const employees = model.series.employees.map((point) => point.value)
  const slots = slotsOf(span, new Set(model.missingYears))
  const units = slots.reduce((sum, slot) => sum + (slot.kind === 'gap' ? GAP_WIDTH : 1), 0)
  // Each slot's left edge and width, as fractions of the plot.
  let cursor = 0
  const placed = slots.map((slot) => {
    const width = (slot.kind === 'gap' ? GAP_WIDTH : 1) / units
    const left = cursor
    cursor += width
    return { slot, left, width }
  })
  const yearSlots = placed.filter((entry) => entry.slot.kind === 'year')
  const [active, setActive] = useState<number | null>(null)
  // Nothing is read at rest: a reading opens on a pointer, a tap or the keyboard, and the arrow keys start from the newest year.
  const shown = active ?? -1

  // Money: one scale from the lowest bottom line (or zero) to the highest turnover or bottom line.
  const moneyValues = [...turnover, ...net.map((point) => point.value)].filter((value): value is number => value !== null)
  const money = niceScale(Math.min(0, ...moneyValues), Math.max(0, ...moneyValues), 4)
  const moneyY = (value: number) => (money.to - value) / (money.to - money.from)
  // People: their own scale, from zero so a fall reads as one.
  const peopleValues = employees.filter((value): value is number => value !== null)
  const people = niceScale(0, Math.max(1, ...peopleValues), 3)
  const peopleY = (value: number) => (people.to - value) / (people.to - people.from)

  const hasLoss = net.some((point) => point.value !== null && point.value < 0)
  const hasProfitOnly = net.some((point) => point.kind === 'profit' && point.value !== null)
  // Every year labelled where they fit; past twelve, every other one and the last.
  const labelled = (position: number) => yearSlots.length <= 12 || position % 2 === (yearSlots.length - 1) % 2

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

  return (
    <figure className={cn('w-full', className)} aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="sr-only">
        {t`Cifra de afaceri, rezultatul net și salariații, pe ani`}
      </figcaption>
      {/* The legend: one row, the marks as drawn. */}
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
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
      </ul>

      <div
        role="group"
        tabIndex={0}
        aria-label={t`Anii: săgețile stânga și dreapta trec de la un an la altul`}
        onKeyDown={onKey}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setActive(null)
        }}
        className="relative mt-4 pl-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Money. */}
        <div className="relative h-64 sm:h-80">
          {money.ticks.map((tick) => (
            <div key={tick} className="pointer-events-none absolute inset-x-0" style={{ top: `${(moneyY(tick) * 100).toFixed(2)}%` }} aria-hidden="true">
              <span className={cn('absolute inset-x-0 border-t', tick === 0 ? 'border-foreground/40' : 'border-border/60')} />
              <span className="absolute right-full -translate-y-1/2 pr-3 font-mono text-[11px] tabular-nums text-muted-foreground">{moneyTick(tick)}</span>
            </div>
          ))}
          {placed.map(({ slot, left, width }, position) => {
            if (slot.kind === 'gap') {
              return (
                <div
                  key={`gap-${slot.from}`}
                  className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,hsl(var(--muted-foreground)/0.12)_6px_7px)]"
                  style={{ left: `${(left * 100).toFixed(3)}%`, width: `${(width * 100).toFixed(3)}%` }}
                  aria-hidden="true"
                />
              )
            }
            const index = slot.index
            const isActive = yearSlots[shown]?.slot === slot
            const turn = turnover[index] ?? null
            const point = net[index]
            const value = point?.value ?? null
            const zero = moneyY(0)
            const barStyle = (from: number, to: number, share: number) => ({
              left: `${((left + width * (1 - share) / 2) * 100).toFixed(3)}%`,
              width: `${(width * share * 100).toFixed(3)}%`,
              top: `${(Math.min(from, to) * 100).toFixed(3)}%`,
              height: `${(Math.abs(to - from) * 100).toFixed(3)}%`,
            })
            return (
              <div key={slot.year} aria-hidden="true">
                {isActive ? <div className="absolute inset-y-0 bg-muted/70" style={{ left: `${(left * 100).toFixed(3)}%`, width: `${(width * 100).toFixed(3)}%` }} /> : null}
                {turn !== null ? <div className="absolute rounded-t-[3px] bg-primary/20" style={barStyle(zero, moneyY(turn), 0.7)} data-position={position} /> : null}
                {value !== null ? (
                  <div
                    className={cn(
                      'absolute',
                      value < 0 ? 'rounded-b-[3px] bg-destructive' : point?.kind === 'profit' ? 'rounded-t-[3px] border-2 border-primary bg-background' : 'rounded-t-[3px] bg-primary',
                    )}
                    style={barStyle(zero, moneyY(value), 0.3)}
                  />
                ) : null}
              </div>
            )
          })}
        </div>

        {/* People: their own panel and axis. */}
        <div className="relative mt-10 h-20 sm:h-24">
          <span className="absolute -top-7 left-0 text-xs text-muted-foreground">{t`Salariați`}</span>
          {[people.from, people.to].map((tick) => (
            <div key={tick} className="pointer-events-none absolute inset-x-0" style={{ top: `${(peopleY(tick) * 100).toFixed(2)}%` }} aria-hidden="true">
              <span className={cn('absolute inset-x-0 border-t', tick === 0 ? 'border-foreground/40' : 'border-border/60')} />
              <span className="absolute right-full -translate-y-1/2 pr-3 font-mono text-[11px] tabular-nums text-muted-foreground">{count(tick)}</span>
            </div>
          ))}
          {placed.map(({ slot, left, width }) =>
            slot.kind === 'gap' ? (
              <div
                key={`gap-${slot.from}`}
                className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,hsl(var(--muted-foreground)/0.12)_6px_7px)]"
                style={{ left: `${(left * 100).toFixed(3)}%`, width: `${(width * 100).toFixed(3)}%` }}
                aria-hidden="true"
              />
            ) : yearSlots[shown]?.slot === slot ? (
              <div key={slot.year} className="absolute inset-y-0 bg-muted/70" style={{ left: `${(left * 100).toFixed(3)}%`, width: `${(width * 100).toFixed(3)}%` }} aria-hidden="true" />
            ) : null,
          )}
          {/* The line, broken at every year with no headcount and at every gap. */}
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
            {(() => {
              const runs: string[][] = []
              let run: string[] = []
              for (const { slot, left, width } of placed) {
                const value = slot.kind === 'year' ? (employees[slot.index] ?? null) : null
                if (value === null) {
                  if (run.length) runs.push(run)
                  run = []
                  continue
                }
                run.push(`${((left + width / 2) * 1000).toFixed(1)},${(peopleY(value) * 100).toFixed(2)}`)
              }
              if (run.length) runs.push(run)
              return runs.map((points, key) => <polyline key={key} points={points.join(' ')} fill="none" className="stroke-amber-500" strokeWidth={2} vectorEffect="non-scaling-stroke" />)
            })()}
          </svg>
          {placed.map(({ slot, left, width }) => {
            if (slot.kind !== 'year') return null
            const value = employees[slot.index] ?? null
            if (value === null) return null
            const isActive = yearSlots[shown]?.slot === slot
            return (
              <span
                key={slot.year}
                className={cn('absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500 ring-2 ring-background', isActive ? 'size-3' : 'size-2')}
                style={{ left: `${((left + width / 2) * 100).toFixed(3)}%`, top: `${(peopleY(value) * 100).toFixed(2)}%` }}
                aria-hidden="true"
              />
            )
          })}
        </div>

        {/* The years. */}
        <div className="relative mt-2 h-5" aria-hidden="true">
          {placed.map(({ slot, left, width }) => {
            if (slot.kind === 'gap') {
              return (
                <span key={`gap-${slot.from}`} className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground" style={{ left: `${((left + width / 2) * 100).toFixed(3)}%` }}>
                  {slot.from}–{slot.to}
                </span>
              )
            }
            const position = yearSlots.findIndex((entry) => entry.slot === slot)
            if (!labelled(position)) return null
            return (
              <span
                key={slot.year}
                className={cn('absolute -translate-x-1/2 font-mono text-[11px] tabular-nums', yearSlots[shown]?.slot === slot ? 'font-semibold text-foreground' : 'text-muted-foreground')}
                style={{ left: `${((left + width / 2) * 100).toFixed(3)}%` }}
              >
                {slot.year}
              </span>
            )
          })}
        </div>

        {/* Hit areas: a year across both panels. */}
        <div className="absolute inset-y-0 left-16 right-0">
          {yearSlots.map(({ slot, left, width }, position) => (
            <div
              key={slot.kind === 'year' ? slot.year : position}
              className="absolute inset-y-0"
              style={{ left: `${(left * 100).toFixed(3)}%`, width: `${(width * 100).toFixed(3)}%` }}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setActive(position)
              }}
              onClick={() => setActive(position)}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* The year's reading, beside its column. */}
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
                {swatch(reading.net?.value != null && reading.net.value < 0 ? 'bg-destructive' : reading.net?.kind === 'profit' ? 'border-2 border-primary' : 'bg-primary')}
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
