import { useState, type PointerEvent } from 'react'
import { t } from '@lingui/core/macro'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'
import { useOfficialTotals, useYearSoFar, type MonthPoint, type RunningYear } from '../hooks/use-person-data'
import { monthShort, moneyText } from '../lib/home-format'
import { moneyParts, percentText, previousText } from '../lib/person-format'
import type { Measure } from './person-debt'
import { Mark, Note, Section, Stat } from './person-shell'
import { monthName } from '../lib/person-format'

/**
 * The year in progress against the year before, month by month (owner:
 * lines, with the borrowing chart's switch). Each point is the deficit from
 * January to the end of the month, as that month's bulletin prints it; the
 * pointer reads any month. Under the chart, the deficit so far and how
 * revenue and spending moved.
 */

const monthOf = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

function valueOf(point: MonthPoint | undefined, measure: Measure): number | null {
  if (!point) return null
  if (measure === 'pib') return point.gdpShare
  return point.deficit === null ? null : point.deficit / 1e9
}

function figureOf(value: number | null, measure: Measure): string {
  if (value === null) return '–'
  return measure === 'pib' ? percentText(value, 2) : t`${formatHubNumber(value, { digits: 1 })} mld. lei`
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
  const options = [
    { key: 'pib' as const, label: t`% din PIB` },
    { key: 'lei' as const, label: t`mld. lei` },
  ]
  return (
    <figure>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <span className="text-sm font-semibold">{t`Deficitul de la începutul anului`}</span>
        <IndicatorToggle label={t`Deficitul, măsurat în`} options={options} value={measure} onChange={onMeasure} />
      </figcaption>
      {/* The read-out is the legend: each year's line, and its figure at the month read. */}
      <p className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <span className="text-muted-foreground">{t`Până la sfârșitul lui ${monthName(monthOf(now.year, month))}:`}</span>
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
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} className={cn(index + 1 === month && 'font-semibold text-foreground')}>
              {monthShort(index + 1)}
            </span>
          ))}
        </div>
      </div>
    </figure>
  )
}

function YearSoFar() {
  const [measure, setMeasure] = useState<Measure>('pib')
  const { newest, now, before } = useYearSoFar()
  const totals = useOfficialTotals(newest)
  const previous = previousText(newest)
  // The share of the newest month, the amount's month: none printed, and the amount alone is said.
  const share = now.points[now.points.length - 1]?.gdpShare ?? null
  const period = newest.text
  const shareText = share === null ? null : percentText(share, 2)
  const amount = totals.deficit ? moneyParts(totals.deficit) : null
  const byShare = measure === 'pib' && shareText !== null
  const unprinted = [now, before].flatMap((year) => year.points.filter((entry) => entry.deficit !== null && entry.gdpShare === null).map((entry) => monthText(year.year, entry.month)))
  const changeStat = (change: string | null, exact: string | null, words: string) =>
    change && exact ? (
      <Stat
        value={change}
        unit=""
        label={words}
        notes={[
          <>
            <Mark>{moneyText(exact)}</Mark> {t`în ${newest.text}`}
          </>,
        ]}
      />
    ) : null
  return (
    <div>
      <Lines now={now} before={before} measure={measure} onMeasure={setMeasure} />
      <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-3">
        {amount && totals.deficit ? (
          <Stat
            value={byShare ? shareText.replace('%', '') : amount.value}
            unit={byShare ? t`% din PIB` : amount.unit}
            label={t`deficit în ${newest.text}`}
            notes={[
              byShare ? (
                <Mark>{moneyText(totals.deficit)}</Mark>
              ) : shareText ? (
                <>
                  <Mark>{shareText}</Mark> {t`din PIB`}
                </>
              ) : null,
              totals.deficitChange && totals.deficitBefore ? (
                <>
                  <Mark>{totals.deficitChange}</Mark> {t`față de ${previous} (${moneyText(totals.deficitBefore)})`}
                </>
              ) : null,
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{totals.balance === null ? t`Buletinul nu are deficitul pentru ${period}.` : t`Fără deficit în ${period}.`}</p>
        )}
        {changeStat(totals.revenueChange, totals.revenue, t`venituri față de ${previous}`)}
        {changeStat(totals.spendingChange, totals.spending, t`cheltuieli față de ${previous}`)}
      </div>
      <Note>
        {t`Deficitul bugetului general consolidat (cash), adunat din ianuarie până la sfârșitul fiecărei luni, cum îl tipărește buletinul lunii.`}{' '}
        {measure === 'lei'
          ? t`Sumele sunt în lei curenți.`
          : unprinted.length
            ? t`Ponderea în PIB e cea tipărită în buletinul fiecărei luni, la publicare: deficitul de până atunci împărțit la PIB-ul estimat atunci pentru tot anul, de aceea urcă spre decembrie. Un buletin mai nou poate recalcula o lună cu PIB-ul revizuit. Datele încărcate nu au ponderea pentru ${unprinted.join(', ')}; linia trece peste.`
            : t`Ponderea în PIB e cea tipărită în buletinul fiecărei luni, la publicare: deficitul de până atunci împărțit la PIB-ul estimat atunci pentru tot anul, de aceea urcă spre decembrie. Un buletin mai nou poate recalcula o lună cu PIB-ul revizuit.`}
      </Note>
    </div>
  )
}

/** „mai 2025", in the reader's language. */
function monthText(year: number, month: number): string {
  return `${monthName(monthOf(year, month))} ${year}`
}

export function YearSection() {
  // The years are named in the chart's legend: the head of the section is drawn before the catalog is read.
  return (
    <Section
      id="anul"
      title={t`Anul în curs, lună de lună`}
      lede={t`Deficitul adunat din ianuarie până la fiecare lună, anul acesta și anul trecut: arată dacă anul merge mai bine sau mai rău decât cel trecut.`}
    >
      <YearSoFar />
    </Section>
  )
}
