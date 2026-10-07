import { useState } from 'react'
import { t } from '@lingui/core/macro'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { monthText } from '@/features/national-budget/analytics/lib/analytics-format'
import { changeText, periodText, reasonText } from '@/features/national-budget/analytics/lib/analytics-view'
import { exactRounded } from '@/features/national-budget/analytics/lib/exact'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { LineKey, ReadingRow, TimeLines } from './principal.balance.chart'
import { TOTAL_ITEMS, useTotalsHistory } from './principal.data'
import { deficitOf, monthShort, moneyText, sizeText } from './principal.format'
import { AnalyticsLink, SourceNote, type BandDefinition, type BandProps } from './principal.shell'

/**
 * „Anul în curs": the newest year the bulletins reach (2026, from January to
 * its newest month) against the same months of the year before, month by
 * month and from 1 January — whatever year the page shows above. When the
 * bulletins end in a December, the newest year is a whole one and is set
 * against the year before it. A month without a bulletin is a gap that says
 * why. Nothing here is set against the law: the law's credits are not final.
 */

type Item = (typeof TOTAL_ITEMS)[keyof typeof TOTAL_ITEMS]

type MonthCell = { readonly exact: string | null; readonly reason: string | null }

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))

/** The newest year's months and the year before's, from 1 January, by item. */
function useMonths() {
  const history = useTotalsHistory()
  const last = history.lastMonth
  const year = Number(last.slice(0, 4))
  const lastIndex = Number(last.slice(5)) - 1
  const cell = (itemId: Item, month: string): MonthCell => {
    const found = history.monthCells.get(itemId)?.get(month)
    return { exact: found?.exact ?? null, reason: found?.exact ? null : (found?.reason ?? null) }
  }
  const now = (itemId: Item) => MONTH_NUMBERS.map((month, index) => (index <= lastIndex ? cell(itemId, `${year}-${month}`) : { exact: null, reason: null }))
  const before = (itemId: Item) => MONTH_NUMBERS.map((month) => cell(itemId, `${year - 1}-${month}`))
  return {
    year,
    last,
    lastIndex,
    now,
    before,
    /** „ianuarie–iulie 2026", and the same months a year earlier. */
    nowText: periodText(last, 'YTD'),
    beforeText: periodText(`${year - 1}${last.slice(4)}`, 'YTD'),
    whole: last.endsWith('-12'),
    complete: history.complete,
    yearCells: history.yearCells,
  }
}

const bn = (exact: string | null) => (exact ? exactRounded(exact, 9, 1) : null)

/** A month's words on the axis and in a reading: „iul.". */
const monthLabel = (_: string, index: number) => monthShort(index + 1)

function Note({ whole, year }: { readonly whole: boolean; readonly year: number }) {
  return (
    <MonoLabel className="mt-5 block max-w-[46ch] leading-relaxed text-muted-foreground">
      {whole ? t`Cel mai nou an din buletine, ${year}, față de anul dinainte; oricare ar fi anul ales mai sus.` : t`Anul în curs, ${year}, oricare ar fi anul ales mai sus.`}
    </MonoLabel>
  )
}

function Sources({ nowText }: { readonly nowText: string }) {
  return (
    <SourceNote>
      {t`Bugetul general consolidat, de la 1 ianuarie până la sfârșitul fiecărei luni, din buletinele lunare de execuție ale Ministerului Finanțelor (ultimul: ${nowText}). O lună fără buletin rămâne goală. Lei curenți.`}
    </SourceNote>
  )
}

/** The cumulative change on the same months, in words: „+11,2%". */
const changeOn = (now: MonthCell | undefined, before: MonthCell | undefined) => changeText(now?.exact ?? null, before?.exact ?? null)

// ──────────────────────────────────────────── A: the year, month by month ──

type Measure = 'cheltuieli' | 'venituri'

function CumulativeLines({ index, titleId }: BandProps) {
  const months = useMonths()
  const [measure, setMeasure] = useState<Measure>('cheltuieli')
  const itemId = measure === 'cheltuieli' ? TOTAL_ITEMS.spending : TOTAL_ITEMS.revenue
  const now = months.now(itemId)
  const before = months.before(itemId)
  const latestNow = now[months.lastIndex]
  const latestBefore = before[months.lastIndex]
  const change = changeOn(latestNow, latestBefore)
  const texts = (cells: readonly MonthCell[]) => cells.map((cell) => (cell.exact ? moneyText(cell.exact) : cell.reason ? reasonText(cell.reason) : null))
  const spending = months.now(TOTAL_ITEMS.spending)[months.lastIndex]
  const revenue = months.now(TOTAL_ITEMS.revenue)[months.lastIndex]
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        <HubSectionHead
          titleId={titleId}
          index={index}
          title={t`Cum merge anul ${months.year}`}
          lede={
            spending?.exact && revenue?.exact
              ? t`În ${months.nowText}, statul a încasat ${moneyText(revenue.exact)} și a cheltuit ${moneyText(spending.exact)}.`
              : null
          }
        />
        {latestNow?.exact && latestBefore?.exact && change ? (
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-muted-foreground">
            {measure === 'cheltuieli'
              ? t`Cheltuielile: ${change} față de ${months.beforeText}, când au fost ${moneyText(latestBefore.exact)}.`
              : t`Veniturile: ${change} față de ${months.beforeText}, când au fost ${moneyText(latestBefore.exact)}.`}
          </p>
        ) : null}
        <Note whole={months.whole} year={months.year} />
        <div className="mt-4">
          <AnalyticsLink patch={{ tip: measure, dupa: 'timp', pas: 'luna' }}>{t`Lună de lună, pe rânduri`}</AnalyticsLink>
        </div>
      </div>
      <div className={cn('lg:col-span-7 lg:col-start-6', HUB_BESIDE_TITLE_CLASS)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonoLabel className="text-muted-foreground">{t`De la 1 ianuarie, mld. lei`}</MonoLabel>
          <IndicatorToggle
            label={t`Cheltuieli sau venituri`}
            options={[
              { key: 'cheltuieli', label: t`Cheltuieli` },
              { key: 'venituri', label: t`Venituri` },
            ]}
            value={measure}
            onChange={setMeasure}
          />
        </div>
        <div className="mt-4">
          <TimeLines
            label={t`${measure === 'cheltuieli' ? 'Cheltuielile' : 'Veniturile'} de la 1 ianuarie, ${months.year} față de ${months.year - 1}`}
            periods={MONTH_NUMBERS}
            axisLabel={monthLabel}
            ticks={MONTH_NUMBERS.map((_, position) => position)}
            series={[
              { key: 'now', label: String(months.year), tone: 'navy', values: now.map((cell) => bn(cell.exact)), texts: texts(now) },
              { key: 'before', label: String(months.year - 1), tone: 'grey', dashed: true, values: before.map((cell) => bn(cell.exact)), texts: texts(before) },
            ]}
            selected={months.lastIndex}
            extra={(position) => {
              const delta = changeOn(now[position], before[position])
              return delta ? <ReadingRow label={t`Față de ${months.year - 1}`} value={delta} /> : null
            }}
          />
        </div>
        <Sources nowText={months.nowText} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────── B: the deficit as it builds up ──

/** Each month's deficit from 1 January, the year in navy beside the one before in grey, hanging under the line. */
function DeficitMonths({ index, titleId }: BandProps) {
  const months = useMonths()
  const now = months.now(TOTAL_ITEMS.balance)
  const before = months.before(TOTAL_ITEMS.balance)
  const [hover, setHover] = useState<number | null>(null)
  const values = [...now, ...before].flatMap((cell) => (cell.exact ? [bn(cell.exact) ?? 0] : []))
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const span = max - min || 1
  const zero = (max / span) * 100
  const focus = hover ?? months.lastIndex
  const latestNow = now[months.lastIndex]
  const latestBefore = before[months.lastIndex]
  const words = (cell: MonthCell | undefined) =>
    cell?.exact ? (deficitOf(cell.exact) ? t`deficit ${sizeText(cell.exact)}` : t`excedent ${moneyText(cell.exact)}`) : cell?.reason ? reasonText(cell.reason) : t`fără buletin încă`
  const bar = (cell: MonthCell, tone: 'now' | 'before') => {
    const value = bn(cell.exact)
    if (value === null) {
      return cell.reason ? (
        <span aria-hidden="true" className="absolute inset-x-0 border border-dashed border-muted-foreground/50" style={{ top: `${zero}%`, height: '14%' }} />
      ) : null
    }
    const top = ((max - Math.max(value, 0)) / span) * 100
    const bottom = ((max - Math.min(value, 0)) / span) * 100
    return (
      <span
        aria-hidden="true"
        className={cn('absolute inset-x-0', value >= 0 ? 'rounded-t-[3px]' : 'rounded-b-[3px]', tone === 'now' ? 'bg-primary' : 'bg-chart-4')}
        style={{ top: `${top}%`, bottom: `${100 - bottom}%` }}
      />
    )
  }
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        <HubSectionHead
          titleId={titleId}
          index={index}
          title={t`Deficitul anului, lună de lună`}
          lede={
            latestNow?.exact && latestBefore?.exact
              ? t`La sfârșitul lui ${monthText(months.last)}, bugetul avea ${deficitOf(latestNow.exact) ? t`un deficit de ${sizeText(latestNow.exact)}` : t`un excedent de ${moneyText(latestNow.exact)}`} de la 1 ianuarie, față de ${deficitOf(latestBefore.exact) ? sizeText(latestBefore.exact) : moneyText(latestBefore.exact)} în aceleași luni din ${months.year - 1}.`
              : null
          }
        />
        <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
          {t`Deficitul crește de obicei spre sfârșitul anului: în decembrie se plătesc multe investiții și se închid conturile.`}
        </p>
        <Note whole={months.whole} year={months.year} />
        <div className="mt-4">
          <AnalyticsLink patch={{ tip: 'sold', dupa: 'timp', pas: 'luna' }}>{t`Deficitul, lună de lună`}</AnalyticsLink>
        </div>
      </div>
      <div className={cn('lg:col-span-7 lg:col-start-6', HUB_BESIDE_TITLE_CLASS)}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-[2px] bg-primary" aria-hidden="true" />
              {months.year}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-[2px] bg-chart-4" aria-hidden="true" />
              {months.year - 1}
            </span>
          </span>
          <span className="text-right text-sm tabular-nums">
            <span className="font-mono text-xs text-muted-foreground">{monthShort(focus + 1)} · </span>
            <span className="font-semibold text-foreground">{words(now[focus])}</span>
            <span className="text-muted-foreground"> / {words(before[focus])}</span>
          </span>
        </div>
        <div className="relative mt-4 h-56 sm:h-72" onPointerLeave={() => setHover(null)}>
          <span aria-hidden="true" className="absolute inset-x-0 h-px bg-foreground/30" style={{ top: `${zero}%` }} />
          <div className="absolute inset-0 flex gap-1 sm:gap-2" role="list" aria-label={t`Soldul de la 1 ianuarie, pe luni, ${months.year} și ${months.year - 1}`}>
            {MONTH_NUMBERS.map((month, position) => (
              <div
                key={month}
                role="listitem"
                tabIndex={0}
                aria-label={`${monthShort(position + 1)}: ${months.year} ${words(now[position])}; ${months.year - 1} ${words(before[position])}`}
                onPointerEnter={() => setHover(position)}
                onFocus={() => setHover(position)}
                onBlur={() => setHover(null)}
                className={cn('flex h-full min-w-0 flex-1 gap-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', focus === position && 'bg-muted/50')}
              >
                <span className="relative h-full flex-1">{now[position] ? bar(now[position], 'now') : null}</span>
                <span className="relative h-full flex-1">{before[position] ? bar(before[position], 'before') : null}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex gap-1 sm:gap-2" aria-hidden="true">
          {MONTH_NUMBERS.map((month, position) => (
            <MonoLabel key={month} className={cn('min-w-0 flex-1 text-center', position === focus ? 'text-foreground' : 'text-muted-foreground')}>
              {monthShort(position + 1).replace('.', '')}
            </MonoLabel>
          ))}
        </div>
        <Sources nowText={months.nowText} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────── C: three cards ──

/**
 * Revenue, spending and the deficit: the year to date, the same months a
 * year earlier, the change; under each, the two on the scale of the whole
 * year before (a ruler, not a rate: nothing is set against the law).
 */
function ProgressCards({ index, titleId }: BandProps) {
  const months = useMonths()
  const previousYear = months.year - 1
  const wholeBefore = (itemId: Item) => months.yearCells.get(itemId)?.get(String(previousYear))?.exact ?? null
  const cards: readonly { readonly key: string; readonly itemId: Item; readonly title: string }[] = [
    { key: 'venituri', itemId: TOTAL_ITEMS.revenue, title: t`Încasări` },
    { key: 'cheltuieli', itemId: TOTAL_ITEMS.spending, title: t`Cheltuieli` },
    { key: 'deficit', itemId: TOTAL_ITEMS.balance, title: t`Deficit` },
  ]
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <HubSectionHead titleId={titleId} index={index} title={t`Anul ${months.year} până acum`} lede={t`${months.nowText}, față de ${months.beforeText}.`} />
          <Note whole={months.whole} year={months.year} />
        </div>
        <AnalyticsLink patch={{ tip: 'sold', dupa: 'timp', pas: 'luna' }}>{t`Lună de lună`}</AnalyticsLink>
      </div>
      <ul className="mt-8 grid gap-px border bg-border/70 md:grid-cols-3">
        {cards.map((card) => {
          const now = months.now(card.itemId)[months.lastIndex]
          const before = months.before(card.itemId)[months.lastIndex]
          const whole = wholeBefore(card.itemId)
          const balance = card.itemId === TOTAL_ITEMS.balance
          // The deficit's size: its sign is the card's word.
          const size = (exact: string | null) => (exact ? (balance ? exact.replace(/^-/u, '') : exact) : null)
          const nowSize = size(now?.exact ?? null)
          const beforeSize = size(before?.exact ?? null)
          const wholeSize = size(whole)
          const scale = bn(wholeSize)
          const width = (exact: string | null) => (scale && exact ? Math.min(((bn(exact) ?? 0) / scale) * 100, 100) : 0)
          const change = changeText(nowSize, beforeSize)
          const word = balance && now?.exact && !deficitOf(now.exact) ? t`Excedent` : card.title
          return (
            <li key={card.key} className="flex flex-col bg-background p-5 sm:p-6">
              <MonoLabel className="text-primary">{word}</MonoLabel>
              <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">{nowSize ? moneyText(nowSize) : '—'}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {beforeSize ? t`${months.beforeText}: ${moneyText(beforeSize)}` : before?.reason ? reasonText(before.reason) : null}
                {change ? <span className="ml-1.5 font-medium text-foreground">{change}</span> : null}
              </p>
              {scale ? (
                <div className="mt-auto pt-6" aria-hidden="true">
                  <div className="space-y-1.5">
                    <span className="block h-2 bg-muted">
                      <span className="block h-full bg-primary" style={{ width: `${width(nowSize)}%` }} />
                    </span>
                    <span className="block h-2 bg-muted">
                      <span className="block h-full bg-chart-4" style={{ width: `${width(beforeSize)}%` }} />
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex gap-3">
                      <LineKey tone="navy">{String(months.year)}</LineKey>
                      <LineKey tone="grey">{String(previousYear)}</LineKey>
                    </span>
                    <span className="tabular-nums">{t`tot anul ${previousYear}: ${wholeSize ? moneyText(wholeSize) : '—'}`}</span>
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      <p className="mt-4 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
        {t`Barele pun anul acesta și aceleași luni de anul trecut pe scara întregului an ${previousYear}: arată cât din drumul de anul trecut s-a parcurs, nu cât s-a executat din lege.`}
      </p>
      <Sources nowText={months.nowText} />
    </div>
  )
}

export const NOW_BAND: BandDefinition = {
  id: 'anul',
  nav: t`Anul în curs`,
  variants: [
    {
      key: 'cumulat',
      title: t`Lună de lună, față de anul trecut`,
      note: t`Cheltuielile (sau veniturile) de la 1 ianuarie, lună de lună: anul în curs, plin; anul trecut, punctat.`,
      component: CumulativeLines,
    },
    {
      key: 'deficit',
      title: t`Deficitul, cum se adună`,
      note: t`Coloane pe luni: deficitul adunat de la 1 ianuarie, anul în curs lângă anul trecut, și fraza „după iulie…".`,
      component: DeficitMonths,
    },
    {
      key: 'carduri',
      title: t`Trei cartonașe`,
      note: t`Încasări, cheltuieli, deficit: până acum, față de aceleași luni de anul trecut, pe scara întregului an trecut.`,
      component: ProgressCards,
    },
  ],
}
