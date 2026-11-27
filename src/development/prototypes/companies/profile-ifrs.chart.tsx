import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { niceScale } from '@/features/statistics/lib/period-chart'
import { count, moneyText, moneyTick, yearRanges } from '@/features/private-companies/lib/company-profile-format'
import { HubInfoNote } from '@/features/private-companies/components/hub/hub-info-note'
import { cn } from '@/lib/utils'
import type { FormRow } from './profile-ifrs.data'

/**
 * PROTOTYPE: the company chart (version „Două panouri", as on the page) drawing each year in the series of its own
 * form (owner, 25 November 2026). Years the publisher put on the IFRS form carry „raportat pe formularul IFRS"; every
 * other year carries no form label. The people line joins two years only when they are consecutive, both have a
 * value and both are on the same form: it breaks at every change of form, at an unmarked or missing year and at a
 * blank. A zero is a zero. Copied from `company-years-chart.tsx`, which stays as it is.
 */

/** How an IFRS run is marked: a named rule above the money panel, a faint ground across both panels, or both. */
export type Marking = 'banda' | 'fundal' | 'ambele'
export type SourcePlace = 'citire' | 'rand'

type Slot = { readonly kind: 'year'; readonly row: FormRow } | { readonly kind: 'gap'; readonly from: number; readonly to: number }

const GAP_WIDTH = 0.8
const HATCH = 'bg-[repeating-linear-gradient(135deg,transparent_0_6px,hsl(var(--muted-foreground)/0.12)_6px_7px)]'
const percent = (fraction: number) => `${(fraction * 100).toFixed(4)}%`

export const IFRS_LABEL = 'Raportat pe formularul IFRS'
// The IFRS session's wording (26 November 2026): the form's row by its name, not the company's IFRS sales line.
export const TURNOVER_NOTE = 'Pe formularul IFRS, cifra de afaceri este rândul „Cifra de afaceri netă" din formularul depus, nu linia de venituri din vânzări din situația IFRS a companiei.'
const PUBLISHER: Record<'mfp' | 'anaf', string> = { mfp: 'Ministerul Finanțelor', anaf: 'ANAF' }

/**
 * The years as ranges, the last joined by „și" („2014 și 2016–2018"): only the years there are, never first–last
 * (a company moves between the Ministry's files). Commas would run into the sentence's own.
 */
export function yearsSaid(years: readonly number[]): string {
  const ranges = yearRanges(years).split(', ').filter(Boolean)
  return ranges.length > 1 ? `${ranges.slice(0, -1).join(', ')} și ${ranges[ranges.length - 1]}` : (ranges[0] ?? '')
}

const empty = (row: FormRow) => row.turnover === null && row.net.value === null && row.employees === null

/** A year a slot of its own; a run of two or more unmarked years with nothing to draw, one narrow hatched slot. */
function slotsOf(rows: readonly FormRow[]): readonly Slot[] {
  const slots: Slot[] = []
  let run: FormRow[] = []
  const flush = () => {
    if (run.length >= 2) slots.push({ kind: 'gap', from: run[0]!.year, to: run[run.length - 1]!.year })
    else for (const row of run) slots.push({ kind: 'year', row })
    run = []
  }
  for (const row of rows) {
    if (empty(row) && row.form === null) {
      run.push(row)
      continue
    }
    flush()
    slots.push({ kind: 'year', row })
  }
  flush()
  return slots
}

function scaleOf(values: readonly number[], ticks: number) {
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  if (low < 0 && high > 0 && -low < high / 2) {
    const up = niceScale(0, high, ticks)
    const step = (up.ticks[1] ?? up.to) - (up.ticks[0] ?? 0) || up.to
    const from = Math.min(low * 1.15, -step / 10)
    const below = Array.from({ length: Math.floor(-from / step) }, (_, index) => -(index + 1) * step).reverse()
    return { from, to: up.to, ticks: [...below, ...up.ticks] }
  }
  return niceScale(low, high, ticks)
}

/** Two neighbouring years joined by the line: consecutive, both on the same form (IFRS or unmarked), both with a value. */
const joins = (a: FormRow, b: FormRow) => b.year === a.year + 1 && a.form === b.form

export function IfrsYearsChart({
  rows,
  marking,
  sources,
  notes = 'sub',
  className,
}: {
  readonly rows: readonly FormRow[]
  readonly marking: Marking
  readonly sources: SourcePlace
  /** The IFRS notes under the chart, or behind an ⓘ on the legend's IFRS entry (owner: „just a short mention"). */
  readonly notes?: 'sub' | 'info'
  readonly className?: string
}) {
  const id = useId()
  const slots = slotsOf(rows)
  const units = slots.reduce((sum, slot) => sum + (slot.kind === 'gap' ? GAP_WIDTH : 1), 0)
  let cursor = 0
  const placed = slots.map((slot) => {
    const width = (slot.kind === 'gap' ? GAP_WIDTH : 1) / units
    const left = cursor
    cursor += width
    return { slot, left, width }
  })
  const yearSlots = placed.filter((entry): entry is { slot: { kind: 'year'; row: FormRow }; left: number; width: number } => entry.slot.kind === 'year')
  const [active, setActive] = useState<number | null>(null)
  const shown = active ?? -1
  const isActive = (slot: Slot) => yearSlots[shown]?.slot === slot

  // The IFRS runs: neighbouring IFRS-form year slots, one label each.
  const runs: { readonly left: number; readonly right: number; readonly from: number; readonly to: number }[] = []
  for (const entry of yearSlots) {
    const last = runs[runs.length - 1]
    if (entry.slot.row.form !== 'ifrs') continue
    if (last && Math.abs(last.right - entry.left) < 1e-9 && last.to === entry.slot.row.year - 1) {
      runs[runs.length - 1] = { ...last, right: entry.left + entry.width, to: entry.slot.row.year }
    } else {
      runs.push({ left: entry.left, right: entry.left + entry.width, from: entry.slot.row.year, to: entry.slot.row.year })
    }
  }

  const hasLoss = rows.some((row) => row.net.value !== null && row.net.value < 0)
  const hasProfitOnly = rows.some((row) => row.net.kind === 'profit' && row.net.value !== null)
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

  const swatch = (tone: string) => <span className={cn('inline-block size-2.5 shrink-0 rounded-[2px]', tone)} aria-hidden="true" />
  const netTone = (row: FormRow) => (row.net.value !== null && row.net.value < 0 ? 'bg-destructive' : row.net.kind === 'profit' ? 'bg-background ring-2 ring-inset ring-primary' : 'bg-primary')

  /** The people line, broken wherever `joins` says the years are not one segment, at every blank and every gap. */
  const segments = (y: (value: number) => number) => {
    const out: { x: number; y: number }[][] = []
    let run: { x: number; y: number }[] = []
    let previous: FormRow | null = null
    for (const { slot, left, width } of placed) {
      const row = slot.kind === 'year' ? slot.row : null
      const value = row?.employees ?? null
      if (row === null || value === null) {
        if (run.length) out.push(run)
        run = []
        previous = null
        continue
      }
      if (previous && !joins(previous, row)) {
        out.push(run)
        run = []
      }
      run.push({ x: (left + width / 2) * 1000, y: y(value) * 100 })
      previous = row
    }
    if (run.length) out.push(run)
    return out
  }

  const tint = (key: string) =>
    marking !== 'banda'
      ? runs.map((run) => (
          <div key={`${key}-${run.from}`} className="absolute inset-y-0 bg-primary/[0.07]" style={{ left: percent(run.left), width: percent(run.right - run.left) }} aria-hidden="true" />
        ))
      : null

  const renderPanel = (kind: 'money' | 'people', height: string, position: number) => {
    const values =
      kind === 'money'
        ? rows.flatMap((row) => [row.turnover, row.net.value]).filter((value): value is number => value !== null)
        : rows.map((row) => row.employees).filter((value): value is number => value !== null)
    const scale = kind === 'people' ? niceScale(0, Math.max(1, ...values), 3) : scaleOf(values, 4)
    const y = (value: number) => (scale.to - value) / (scale.to - scale.from || 1)
    const zero = y(0)
    const ticks = kind === 'money' ? scale.ticks : [...new Set([scale.from, 0, scale.to])].filter((tick) => tick >= scale.from && tick <= scale.to)
    const format = kind === 'people' ? (value: number) => count(value) : moneyTick
    const bar = (left: number, width: number, from: number, to: number, share: number) => ({
      left: percent(left + (width * (1 - share)) / 2),
      width: percent(width * share),
      top: to < from ? `min(${percent(to)}, calc(${percent(from)} - 2px))` : percent(from),
      height: `max(${percent(Math.abs(to - from))}, 2px)`,
    })
    return (
      <div key={kind} className={cn('relative', height, position > 0 && 'mt-8')}>
        {tint(kind)}
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
        {kind === 'money'
          ? placed.map(({ slot, left, width }) => {
              if (slot.kind !== 'year') return null
              const { turnover, net } = slot.row
              return (
                <div key={slot.row.year} aria-hidden="true">
                  {turnover !== null ? <div className="absolute rounded-t-[3px] bg-primary/20" style={bar(left, width, zero, y(turnover), 0.7)} /> : null}
                  {net.value !== null ? (
                    <div className={cn('absolute', net.value < 0 ? 'rounded-b-[3px]' : 'rounded-t-[3px]', netTone(slot.row))} style={bar(left, width, zero, y(net.value), 0.3)} />
                  ) : null}
                </div>
              )
            })
          : (
            <>
              <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
                {segments(y).map((points, key) =>
                  points.length > 1 ? (
                    <polyline key={key} points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" className="stroke-amber-500" strokeWidth={2} vectorEffect="non-scaling-stroke" />
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
          )}
      </div>
    )
  }

  const figure = (value: string | null, reason: string | undefined): ReactNode =>
    value !== null ? (
      <dd className="text-right font-medium tabular-nums text-foreground">{value}</dd>
    ) : (
      <dd className="text-right text-muted-foreground">{reason ?? 'Nicio valoare disponibilă aici'}</dd>
    )

  const ifrsSources = rows.filter((row) => row.form === 'ifrs' && row.publisher === 'mfp' && row.source)
  // The publisher's seam: IFRS-form years on both sides of 2018/2019.
  const seam = rows.some((row) => row.form === 'ifrs' && row.year <= 2018) && rows.some((row) => row.form === 'ifrs' && row.year >= 2019)
  const blankThenZero = (() => {
    const before = rows.find((row) => row.year === 2018 && row.form === 'ifrs')
    const after = rows.find((row) => row.year === 2019 && row.form === 'ifrs')
    if (!before || !after) return false
    return (before.turnover === null && after.turnover === 0) || (before.employees === null && after.employees === 0)
  })()
  const gaps = slots.filter((slot): slot is { kind: 'gap'; from: number; to: number } => slot.kind === 'gap')

  // What the IFRS label means: the turnover note and the publishers' seam — under the chart, or behind the legend's ⓘ.
  const ifrsNotes =
    runs.length > 0 ? (
      <>
        <p>{TURNOVER_NOTE}</p>
        {seam ? (
          // The company's own Ministry years, inclusive („până în 2018" could read as ending before it); the blank-to-zero
          // difference as measured, on 2019, the year both publishers cover.
          <p>
            Pentru {yearsSaid(rows.filter((row) => row.form === 'ifrs' && row.publisher === 'mfp').map((row) => row.year))}, cifrele formularului IFRS vin din fișierul
            Ministerului Finanțelor; din 2019, de la ANAF.
            {blankThenZero ? ' În 2019, unde fișierul Ministerului avea celula goală, ANAF a publicat 0: trecerea de la gol la 0 nu e o scădere.' : null}
          </p>
        ) : null}
      </>
    ) : null

  return (
    <figure className={cn('w-full', className)} aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="sr-only">
        Cifra de afaceri, rezultatul net și salariații, pe ani; anii raportați pe formularul IFRS sunt marcați.
      </figcaption>
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <li className="inline-flex items-center gap-1.5">
          <span className="inline-flex w-3.5 items-center" aria-hidden="true">
            <span className="h-0.5 w-full bg-amber-500" />
          </span>
          Salariați
        </li>
        <li className="inline-flex items-center gap-1.5">
          {swatch('bg-primary/20')}
          Cifra de afaceri
        </li>
        <li className="inline-flex items-center gap-1.5">
          {swatch('bg-primary')}
          Rezultat net
        </li>
        {hasLoss ? (
          <li className="inline-flex items-center gap-1.5">
            {swatch('bg-destructive')}
            Pierdere netă
          </li>
        ) : null}
        {hasProfitOnly ? (
          <li className="inline-flex items-center gap-1.5">
            {swatch('border-2 border-primary bg-transparent')}
            Profit net (rezultatul net reținut)
          </li>
        ) : null}
        {runs.length > 0 ? (
          <li className="inline-flex items-center gap-1.5 text-foreground">
            {marking !== 'fundal' ? (
              <span className={cn('inline-flex h-2.5 w-4 items-start border-t-2 border-primary', marking === 'ambele' && 'bg-primary/[0.12]')} aria-hidden="true" />
            ) : (
              swatch('bg-primary/[0.12]')
            )}
            {IFRS_LABEL}
            {notes === 'info' ? <HubInfoNote label="Despre anii pe formularul IFRS">{ifrsNotes}</HubInfoNote> : null}
          </li>
        ) : null}
      </ul>

      <div
        role="group"
        tabIndex={0}
        aria-label="Anii: săgețile stânga și dreapta trec de la un an la altul"
        onKeyDown={onKey}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setActive(null)
        }}
        className={cn('relative pl-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', marking !== 'fundal' ? 'mt-3' : 'mt-4')}
      >
        {/* The IFRS runs, named above the money panel: a rule over the run and a short name, the full one in the legend. */}
        {marking !== 'fundal' ? (
          <div className="relative mb-2 h-5" aria-hidden="true">
            {runs.map((run) => (
              <div key={run.from} className="absolute bottom-0 border-t-2 border-primary" style={{ left: percent(run.left), width: percent(run.right - run.left) }}>
                <span className="absolute bottom-full left-0 mb-0.5 whitespace-nowrap text-[10px] font-semibold leading-none text-primary">IFRS</span>
              </div>
            ))}
          </div>
        ) : null}
        {marking === 'fundal' ? (
          <div className="relative h-4" aria-hidden="true">
            {runs.map((run) => (
              <span key={run.from} className="absolute bottom-0.5 whitespace-nowrap text-[10px] font-semibold leading-none text-primary" style={{ left: percent(run.left) }}>
                IFRS
              </span>
            ))}
          </div>
        ) : null}

        {renderPanel('money', 'h-64 sm:h-80', 0)}
        {renderPanel('people', 'h-20 sm:h-24', 1)}

        <div className="relative mt-2 h-5" aria-hidden="true">
          {placed.map(({ slot, left, width }) => {
            if (slot.kind === 'gap') {
              return (
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

        <div className="absolute inset-y-0 left-16 right-0">
          {yearSlots.map(({ slot, left, width }, position) => (
            <div
              key={slot.row.year}
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

        {/* The year's reading: its form and publisher, three figures or why not, the turnover note on an IFRS year, its source. */}
        <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-0 z-10">
          {reading ? (
            <div
              // Only the source link takes the pointer: a tap elsewhere on the box reaches the year under it (a phone's box
              // covers most of the plot).
              className="absolute top-0 w-64 max-w-full rounded-sm border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
              style={{ left: `clamp(0px, calc(4rem + (100% - 4rem) * ${(reading.left + reading.width / 2).toFixed(4)} - 8rem), calc(100% - 16rem))` }}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-mono tabular-nums text-muted-foreground">{reading.slot.row.year}</span>
                {reading.slot.row.form === 'ifrs' ? <span className="font-medium text-primary">{IFRS_LABEL}</span> : null}
              </span>
              {reading.slot.row.publisher ? <span className="mt-0.5 block text-muted-foreground">{PUBLISHER[reading.slot.row.publisher]}</span> : null}
              <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
                <dt className="inline-flex items-center gap-1.5">
                  {swatch('bg-primary/20')}
                  {reading.slot.row.form === 'ifrs' ? (notes === 'info' ? 'Cifra de afaceri netă' : 'Cifra de afaceri netă*') : 'Cifra de afaceri'}
                </dt>
                {figure(reading.slot.row.turnover === null ? null : moneyText(reading.slot.row.turnover), reading.slot.row.reasons.turnover)}
                <dt className="inline-flex items-center gap-1.5">
                  {swatch(netTone(reading.slot.row))}
                  {reading.slot.row.net.kind === 'profit' ? 'Profit net' : 'Rezultat net'}
                </dt>
                {figure(reading.slot.row.net.value === null ? null : moneyText(reading.slot.row.net.value), reading.slot.row.reasons.net)}
                <dt className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-2.5 bg-amber-500" aria-hidden="true" />
                  Salariați
                </dt>
                {figure(reading.slot.row.employees === null ? null : count(reading.slot.row.employees), reading.slot.row.reasons.employees)}
              </dl>
              {reading.slot.row.form === 'ifrs' && notes === 'sub' ? (
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">* cifra netă din formular, nu linia de vânzări a situației IFRS</p>
              ) : null}
              {sources === 'citire' ? (
                reading.slot.row.source ? (
                  <a
                    href={reading.slot.row.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto mt-1.5 inline-flex min-h-8 items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {reading.slot.row.source.label}
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="mt-1.5 block text-muted-foreground">Date fictive: fără sursă</span>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Under the chart: what the IFRS label means, the publishers' seam, the files, the real gaps. */}
      <div className="mt-3 max-w-[72ch] space-y-1.5 text-xs leading-relaxed text-muted-foreground">
        {notes === 'sub' ? ifrsNotes : null}
        {sources === 'rand' && ifrsSources.length > 0 ? (
          <p>
            Fișierele Ministerului Finanțelor pentru anii pe formularul IFRS:{' '}
            {ifrsSources.map((row, index) => (
              <span key={row.year}>
                {index > 0 ? ' · ' : null}
                <a href={row.source!.url} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:text-primary">
                  {row.year}
                </a>
              </span>
            ))}
            . Anii de la ANAF au sursa în „Bilanțurile, an cu an".
          </p>
        ) : null}
        {gaps.length > 0 ? <p>Fără valori comparabile pentru {yearRanges(gaps.flatMap((gap) => Array.from({ length: gap.to - gap.from + 1 }, (_, index) => gap.from + index)))}.</p> : null}
      </div>

      <table className="sr-only">
        <caption>Cifra de afaceri, rezultatul net și salariații, pe ani, cu formularul fiecărui an</caption>
        <thead>
          <tr>
            <th scope="col">An</th>
            <th scope="col">Formular</th>
            <th scope="col">Cifra de afaceri</th>
            <th scope="col">Rezultat net</th>
            <th scope="col">Salariați</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year}>
              <th scope="row">{row.year}</th>
              <td>{row.form === 'ifrs' ? IFRS_LABEL : ''}</td>
              <td>{row.turnover === null ? row.reasons.turnover : moneyText(row.turnover)}</td>
              <td>{row.net.value === null ? row.reasons.net : moneyText(row.net.value)}</td>
              <td>{row.employees === null ? row.reasons.employees : count(row.employees)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
