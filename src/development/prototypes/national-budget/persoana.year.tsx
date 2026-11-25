import { useState, type PointerEvent } from 'react'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { moneyText } from '@/features/national-budget/home/lib/home-format'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'
import { changeOf, useNewestView, useOfficialTotals, useYearSoFar, type MonthPoint, type RunningYear } from './persoana.data'
import { MEASURES, type Measure } from './persoana.debt'
import { Mark, Note, Section, Stat } from './persoana.shell'

/**
 * The working version's fourth section: the year in progress against the
 * year before, month by month (owner: lines, with the borrowing chart's
 * switch). Each point is the deficit from January to the end of the month,
 * as that month's bulletin prints it; the pointer reads any month. Under
 * the chart, the deficit so far and how revenue and spending moved.
 */

const MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'] as const
const MONTH_NAMES = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'] as const

function valueOf(point: MonthPoint | undefined, measure: Measure): number | null {
  if (!point) return null
  if (measure === 'pib') return point.gdpShare === null ? null : point.gdpShare * 100
  return point.deficit === null ? null : point.deficit / 1e9
}

function figureOf(value: number | null, measure: Measure): string {
  if (value === null) return '–'
  return measure === 'pib' ? `${formatHubNumber(value, { digits: 2 })}%` : `${formatHubNumber(value, { digits: 1 })} mld. lei`
}

/** Round steps from zero past the largest value, about four of them. */
function ticksOf(max: number): readonly number[] {
  const rough = Math.max(max, 1) / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? power * 10
  return Array.from({ length: Math.ceil(Math.max(max, 1) / step) + 1 }, (_, index) => index * step)
}

/** The two years' lines; the newest month read out above them, or the month under the pointer. */
function Lines({ now, before, measure, onMeasure }: { readonly now: RunningYear; readonly before: RunningYear; readonly measure: Measure; readonly onMeasure: (measure: Measure) => void }) {
  const last = Math.max(1, ...now.points.filter((point) => valueOf(point, measure) !== null).map((point) => point.month))
  const [pointed, setPointed] = useState<number | null>(null)
  const month = pointed ?? last
  const values = [...now.points, ...before.points].map((point) => valueOf(point, measure)).filter((value): value is number => value !== null)
  const ticks = ticksOf(Math.max(0, ...values))
  const top = ticks[ticks.length - 1] ?? 1
  const bottom = Math.min(0, ...values)
  const x = (at: number) => ((at - 0.5) / 12) * 100
  const y = (value: number) => ((top - value) / (top - bottom)) * 100
  const lines = [
    { year: before, className: 'text-muted-foreground/70', width: 2 },
    { year: now, className: 'text-primary', width: 3 },
  ]
  const pointsOf = (year: RunningYear) =>
    year.points
      .flatMap((point) => {
        const value = valueOf(point, measure)
        return value === null ? [] : [`${x(point.month)},${y(value)}`]
      })
      .join(' ')
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    setPointed(Math.min(12, Math.max(1, Math.floor(((event.clientX - box.left) / box.width) * 12) + 1)))
  }
  return (
    <figure>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <span className="text-sm font-semibold">Deficitul de la începutul anului</span>
        <IndicatorToggle label="Deficitul, măsurat în" options={MEASURES} value={measure} onChange={onMeasure} />
      </figcaption>
      {/* The read-out is the legend: each year's line, and its figure at the month read. */}
      <p className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <span className="text-muted-foreground">Până la sfârșitul lui {MONTH_NAMES[month - 1]}:</span>
        {[...lines].reverse().map((line) => (
          <span key={line.year.year} className="inline-flex items-baseline gap-2">
            <span aria-hidden="true" className={cn('inline-block h-[3px] w-4 -translate-y-[3px] rounded-full bg-current', line.className)} />
            {line.year.year}
            <Mark>{figureOf(valueOf(line.year.points[month - 1], measure), measure)}</Mark>
          </span>
        ))}
      </p>
      <div className="ml-7 mt-5">
        <div
          className="relative h-56 touch-pan-y"
          onPointerMove={point}
          onPointerDown={point}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setPointed(null)
          }}
        >
          {ticks.map((tick) => (
            <div key={tick} className="absolute inset-x-0 border-t border-border/70" style={{ top: `${y(tick)}%` }}>
              <span className="absolute right-full top-0 -translate-y-1/2 pr-2 text-[0.6875rem] tabular-nums text-muted-foreground">{formatHubNumber(tick, { digits: 0 })}</span>
            </div>
          ))}
          <span aria-hidden="true" className="absolute inset-y-0 w-px bg-foreground/15" style={{ left: `${x(month)}%` }} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
            {lines.map((line) => (
              <polyline
                key={line.year.year}
                points={pointsOf(line.year)}
                fill="none"
                stroke="currentColor"
                strokeWidth={line.width}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={line.className}
              />
            ))}
          </svg>
          {lines.map((line) => {
            const value = valueOf(line.year.points[month - 1], measure)
            return value === null ? null : (
              <span
                key={line.year.year}
                aria-hidden="true"
                className={cn('absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-current', line.className)}
                style={{ left: `${x(month)}%`, top: `${y(value)}%` }}
              />
            )
          })}
        </div>
        <div className="mt-2 grid grid-cols-12 text-center text-[0.6875rem] text-muted-foreground" aria-hidden="true">
          {MONTHS.map((name, index) => (
            <span key={name} className={cn(index + 1 === month && 'font-semibold text-foreground')}>
              {name}
            </span>
          ))}
        </div>
      </div>
    </figure>
  )
}

function YearSoFar() {
  const newest = useNewestView()
  const [measure, setMeasure] = useState<Measure>('pib')
  const { now, before } = useYearSoFar(newest)
  const totals = useOfficialTotals(newest)
  const previous = newest.partial ? `aceleași luni din ${newest.year - 1}` : String(newest.year - 1)
  const share = [...now.points].reverse().find((entry) => entry.gdpShare !== null)?.gdpShare ?? null
  const shareText = share === null ? null : figureOf(share * 100, 'pib')
  const amount = totals.deficit ? moneyText(totals.deficit) : null
  const amountBefore = totals.deficitBefore && Number(totals.deficitBefore) < 0 ? moneyText((-Number(totals.deficitBefore)).toFixed(2)) : null
  const byShare = measure === 'pib' && shareText !== null
  const unprinted = [now, before].flatMap((year) => year.points.filter((entry) => entry.deficit !== null && entry.gdpShare === null).map((entry) => `${MONTH_NAMES[entry.month - 1]} ${year.year}`))
  const changeStat = (change: string | null, exact: string | null, words: string) =>
    change && exact ? (
      <Stat
        value={change}
        unit=""
        label={`${words} față de ${previous}`}
        notes={[
          <>
            <Mark>{moneyText(exact)}</Mark> în {newest.text}
          </>,
        ]}
      />
    ) : null
  return (
    <div>
      <Lines now={now} before={before} measure={measure} onMeasure={setMeasure} />
      <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-3">
        {amount ? (
          <Stat
            value={byShare ? shareText.replace('%', '') : amount.replace(/\s*mld\. lei$/u, '')}
            unit={byShare ? '% din PIB' : amount.endsWith('mld. lei') ? 'mld. lei' : ''}
            label={`deficit în ${newest.text}`}
            notes={[
              byShare ? <Mark>{amount}</Mark> : shareText ? (
                <>
                  <Mark>{shareText}</Mark> din PIB
                </>
              ) : null,
              amountBefore ? (
                <>
                  <Mark>{changeOf(Number(totals.deficit), -Number(totals.deficitBefore))}</Mark> față de {previous} ({amountBefore})
                </>
              ) : null,
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Fără deficit în {newest.text}.</p>
        )}
        {changeStat(totals.revenueChange, totals.revenue, 'venituri')}
        {changeStat(totals.spendingChange, totals.spending, 'cheltuieli')}
      </div>
      <Note>
        Deficitul bugetului general consolidat (cash), adunat din ianuarie până la sfârșitul fiecărei luni, cum îl tipărește buletinul lunii.{' '}
        {measure === 'lei'
          ? 'Sumele sunt în lei curenți.'
          : `Ponderea în PIB e cea tipărită: deficitul de până atunci împărțit la PIB-ul estimat pentru tot anul, de aceea urcă spre decembrie.${unprinted.length ? ` Buletinul din ${unprinted.join(', ')} nu o tipărește; linia trece peste.` : ''}`}
      </Note>
    </div>
  )
}

export function YearSection() {
  const newest = useNewestView()
  return (
    <Section
      id="anul"
      title="Anul în curs, lună de lună"
      lede={`Deficitul adunat din ianuarie până la fiecare lună, în ${newest.year} și în ${newest.year - 1}: arată dacă anul merge mai bine sau mai rău decât cel trecut.`}
    >
      <YearSoFar />
    </Section>
  )
}
