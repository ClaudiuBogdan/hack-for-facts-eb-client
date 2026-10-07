import { useState } from 'react'
import { t } from '@lingui/core/macro'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { changeText, periodText, reasonText } from '@/features/national-budget/analytics/lib/analytics-view'
import { exactRounded } from '@/features/national-budget/analytics/lib/exact'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { ReadingRow, TimeLines } from './home-time-chart'
import { useTotalsHistory } from '../hooks/use-home-data'
import { TOTAL_ITEMS } from '../lib/home-data'
import { monthShort, moneyText } from '../lib/home-format'
import { AnalyticsLink, SourceNote, type BandProps } from './home-shell'

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

export function NowBand({ index, titleId }: BandProps) {
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
            label={measure === 'cheltuieli' ? t`Cheltuielile de la 1 ianuarie, ${months.year} față de ${months.year - 1}` : t`Veniturile de la 1 ianuarie, ${months.year} față de ${months.year - 1}`}
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

