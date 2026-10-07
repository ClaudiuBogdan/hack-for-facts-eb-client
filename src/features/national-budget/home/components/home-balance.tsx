import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { reasonText } from '@/features/national-budget/analytics/lib/analytics-view'
import { exactRounded } from '@/features/national-budget/analytics/lib/exact'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { ReadingRow, TimeLines } from './home-time-chart'
import { useTotalsHistory } from '../hooks/use-home-data'
import { useHomeYear } from '../hooks/use-home-year'
import { TOTAL_ITEMS, type YearView } from '../lib/home-data'
import { deficitOf, moneyText, sizeText } from '../lib/home-format'
import { AnalyticsLink, SourceNote, type BandProps } from './home-shell'

/**
 * „Deficitul": how much more the state spends than it collects, year by year
 * since 2006: revenue and spending as two lines in each year's lei, the
 * deficit shaded between them. Every year a December bulletin finishes; a
 * year it doesn't is a gap that says why.
 */

type YearRow = {
  readonly year: number
  readonly revenue: string | null
  readonly spending: string | null
  readonly balance: string | null
  /** Why the bulletins answer nothing for this year. */
  readonly gap: string | null
}

/** Every finished year, oldest first, with its three totals; then the year in progress to its newest bulletin. */
function useYearRows(): { readonly rows: readonly YearRow[] } {
  const history = useTotalsHistory()
  const cellOf = (itemId: string, year: number) => history.yearCells.get(itemId)?.get(String(year)) ?? null
  const rows: YearRow[] = []
  for (let year = 2006; year <= history.complete; year += 1) {
    const balance = cellOf(TOTAL_ITEMS.balance, year)
    const vouched = balance?.exact != null
    rows.push({
      year,
      revenue: cellOf(TOTAL_ITEMS.revenue, year)?.exact ?? null,
      spending: cellOf(TOTAL_ITEMS.spending, year)?.exact ?? null,
      balance: balance?.exact ?? null,
      gap: vouched ? null : reasonText(balance?.reason ?? null),
    })
  }
  return { rows }
}


const bn = (exact: string | null) => (exact ? exactRounded(exact, 9, 1) : null)

/** The axis' years: the first, the last, and every fifth between, clear of both ends. */
function everyFifth(years: readonly number[]): readonly number[] {
  const last = years.length - 1
  return years.flatMap((year, index) => (index === 0 || index === last || (year % 5 === 0 && index > 1 && last - index > 1) ? [index] : []))
}

/** „deficit de 146,0 mld. lei" / „excedent de …": the balance in words, its sign the word's. */
function balanceWords(balance: string): string {
  return deficitOf(balance) ? t`un deficit de ${sizeText(balance)}` : t`un excedent de ${moneyText(balance)}`
}

function Sources({ note }: { readonly note?: string }) {
  return (
    <SourceNote>
      {t`Bugetul general consolidat (toate bugetele publice, fără transferurile dintre ele), din buletinele de execuție de decembrie ale Ministerului Finanțelor.`}
      {note ? ` ${note}` : ''}
    </SourceNote>
  )
}

function Links() {
  return (
    <div className="mt-4 flex flex-wrap gap-x-5">
      <AnalyticsLink patch={{ tip: 'sold', dupa: 'timp' }}>{t`Deficitul, an de an`}</AnalyticsLink>
      <AnalyticsLink patch={{ tip: 'sold', dupa: 'timp', pas: 'luna' }}>{t`Lună de lună`}</AnalyticsLink>
    </div>
  )
}

/** The page's year among the rows, or null when it is the year in progress (or a year without a bulletin). */
const selectedIndex = (rows: readonly YearRow[], view: YearView) => (view.partial ? null : rows.findIndex((row) => row.year === view.year))

// ────────────────────────────────────────────────── A: two lines in lei ──

export function BalanceBand({ view, index, titleId }: BandProps) {
  const { setYear } = useHomeYear()
  const { rows } = useYearRows()
  const at = selectedIndex(rows, view)
  const row = at === null ? null : (rows[at] ?? null)
  // The largest deficit in lei: a comparison of plotting values, the year's own exact figure told.
  const largest = rows.reduce<YearRow | null>((best, entry) => {
    const value = bn(entry.balance)
    return value !== null && (best === null || value < (bn(best.balance) ?? 0)) ? entry : best
  }, null)
  const periods = rows.map((entry) => String(entry.year))
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        <HubSectionHead
          titleId={titleId}
          index={index}
          title={t`Cât cheltuie statul peste ce încasează`}
          lede={
            row?.revenue && row.spending && row.balance
              ? t`În ${row.year}, statul a încasat ${moneyText(row.revenue)} și a cheltuit ${moneyText(row.spending)}: ${balanceWords(row.balance)}, acoperit din împrumuturi.`
              : view.partial
                ? t`Anul ${view.year} nu s-a încheiat: lunile lui sunt în secțiunea „Anul în curs".`
                : null
          }
        />
        {largest?.balance ? (
          <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
            {t`Cel mai mare deficit, în lei: ${largest.year}, ${sizeText(largest.balance)}. Sumele sunt în lei ai fiecărui an, fără ajustare cu inflația.`}
          </p>
        ) : null}
        <Links />
      </div>
      <div className={cn('lg:col-span-7 lg:col-start-6', HUB_BESIDE_TITLE_CLASS)}>
        <MonoLabel className="block text-muted-foreground">{t`Mld. lei pe an, lei ai fiecărui an`}</MonoLabel>
        <div className="mt-3">
          <TimeLines
            label={t`Veniturile și cheltuielile publice, ${periods[0]}–${periods[periods.length - 1]}`}
            periods={periods}
            axisLabel={(period) => period}
            ticks={everyFifth(rows.map((entry) => entry.year))}
            series={[
              { key: 'revenue', label: t`Venituri`, tone: 'sky', values: rows.map((entry) => bn(entry.revenue)), texts: rows.map((entry) => (entry.revenue ? moneyText(entry.revenue) : entry.gap)) },
              { key: 'spending', label: t`Cheltuieli`, tone: 'navy', values: rows.map((entry) => bn(entry.spending)), texts: rows.map((entry) => (entry.spending ? moneyText(entry.spending) : entry.gap)) },
            ]}
            shade={{ upper: 'revenue', lower: 'spending', above: t`Excedent`, below: t`Deficit` }}
            gaps={rows.map((entry) => entry.gap)}
            selected={at}
            onPick={(position) => {
              const year = rows[position]?.year
              if (year !== undefined && rows[position]?.gap === null) setYear(year)
            }}
            extra={(position) => {
              const balance = rows[position]?.balance ?? null
              return balance ? <ReadingRow label={deficitOf(balance) ? t`Deficit` : t`Excedent`} value={sizeText(balance)} /> : null
            }}
          />
        </div>
        <Sources />
      </div>
    </div>
  )
}

