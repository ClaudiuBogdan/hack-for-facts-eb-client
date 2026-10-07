import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { reasonText } from '@/features/national-budget/analytics/lib/analytics-view'
import { exactRounded } from '@/features/national-budget/analytics/lib/exact'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { ReadingRow, ShareColumns, TimeLines, type ShareBar } from './principal.balance.chart'
import { TOTAL_ITEMS, useGdpHistory, useTotalsHistory, useYear, type YearView } from './principal.data'
import { deficitOf, gdpNumber, gdpSizeText, gdpText, moneyText, sizeText } from './principal.format'
import { AnalyticsLink, SourceNote, type BandDefinition, type BandProps } from './principal.shell'

/**
 * „Deficitul": how much more the state spends than it collects, year by year
 * since 2006 — in lei, as a share of GDP against the EU's 3% threshold, and
 * the budget's size in GDP. Every year a December bulletin finishes; the year
 * in progress only where a design can say its months (its share of GDP is
 * the bulletin's own, against the whole year's estimated GDP).
 */

type YearRow = {
  readonly year: number
  readonly revenue: string | null
  readonly spending: string | null
  readonly balance: string | null
  /** Why the bulletins answer nothing for this year. */
  readonly gap: string | null
  readonly revenueGdp: string | null
  readonly spendingGdp: string | null
  readonly balanceGdp: string | null
}

/** Every finished year, oldest first, with its three totals and the GDP shares its December release prints. */
function useYearRows(): { readonly rows: readonly YearRow[]; readonly partial: YearRow | null; readonly partialText: string } {
  const history = useTotalsHistory()
  const gdp = useGdpHistory()
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
      // A share only where the series vouches for the whole year: a December release covering another period is not that year's.
      revenueGdp: vouched ? gdp.share(`${year}-12`, TOTAL_ITEMS.revenue) : null,
      spendingGdp: vouched ? gdp.share(`${year}-12`, TOTAL_ITEMS.spending) : null,
      balanceGdp: vouched ? gdp.share(`${year}-12`, TOTAL_ITEMS.balance) : null,
    })
  }
  const last = history.lastMonth
  const partialCell = (itemId: string) => history.monthCells.get(itemId)?.get(last)?.exact ?? null
  const partial = last.endsWith('-12')
    ? null
    : {
        year: Number(last.slice(0, 4)),
        revenue: partialCell(TOTAL_ITEMS.revenue),
        spending: partialCell(TOTAL_ITEMS.spending),
        balance: partialCell(TOTAL_ITEMS.balance),
        gap: null,
        revenueGdp: gdp.share(last, TOTAL_ITEMS.revenue),
        spendingGdp: gdp.share(last, TOTAL_ITEMS.spending),
        balanceGdp: gdp.share(last, TOTAL_ITEMS.balance),
      }
  return { rows, partial, partialText: t`ian.–${monthWord(last)} ${last.slice(0, 4)}` }
}

const MONTHS = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sep.', 'oct.', 'nov.', 'dec.']
const monthWord = (month: string) => MONTHS[Number(month.slice(5)) - 1] ?? month.slice(5)

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

function BalanceLines({ view, index, titleId }: BandProps) {
  const { setYear } = useYear()
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
            {t`Cel mai mare deficit, în lei: ${largest.year}, ${sizeText(largest.balance)}. Sumele sunt în lei ai fiecărui an, fără ajustare cu inflația; ponderea în PIB, în varianta următoare, le face comparabile.`}
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

// ──────────────────────────────────────────── B: the deficit in GDP, bars ──

/** The EU treaty's reference value for a government deficit. */
const EU_THRESHOLD = 3

/**
 * The years whose December bulletin prints GDP shares: the workbook releases,
 * 2019 on (December 2023 is a PDF and prints none). Earlier years are left
 * out rather than shown as a long row of gaps; the one gap inside says why.
 */
function shareRows(rows: readonly YearRow[]): readonly YearRow[] {
  const first = rows.findIndex((row) => row.balanceGdp !== null)
  return first < 0 ? [] : rows.slice(first)
}

const noShare = (row: YearRow) => row.gap ?? t`buletinul din decembrie ${row.year} e un PDF: nu tipărește ponderile în PIB`

function DeficitBars({ view, index, titleId }: BandProps) {
  const { setYear } = useYear()
  const { rows, partial, partialText } = useYearRows()
  const printed = shareRows(rows)
  const barOf = (row: YearRow, partialYear: boolean): ShareBar => ({
    year: row.year,
    value: gdpNumber(row.balanceGdp, 2),
    text: gdpSizeText(row.balanceGdp),
    gap: row.balanceGdp === null ? noShare(row) : null,
    partial: partialYear,
    note: partialYear ? partialText : null,
  })
  const bars = [...printed.map((row) => barOf(row, false)), ...(partial?.balanceGdp ? [barOf(partial, true)] : [])]
  const finished = printed.filter((row) => row.balanceGdp !== null)
  const over = finished.filter((row) => (gdpNumber(row.balanceGdp, 2) ?? 0) < -EU_THRESHOLD)
  // The largest deficit in GDP, the year's own printed share told.
  const largest = finished.reduce<YearRow | null>((best, row) => ((gdpNumber(row.balanceGdp, 2) ?? 0) < (gdpNumber(best?.balanceGdp ?? null, 2) ?? 0) ? row : best), null)
  const chosen = view.partial ? partial : (rows.find((row) => row.year === view.year) ?? null)
  const chosenSize = chosen ? gdpSizeText(chosen.balanceGdp) : null
  const chosenShare = chosen ? gdpNumber(chosen.balanceGdp, 2) : null
  const firstYear = finished[0]?.year
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        <HubSectionHead
          titleId={titleId}
          index={index}
          title={t`Deficitul, din PIB`}
          lede={
            chosen && chosenSize && chosenShare !== null
              ? view.partial
                ? t`În ${partialText}, deficitul adunat de la 1 ianuarie e ${chosenSize} din PIB-ul estimat pe tot anul.`
                : chosenShare < -EU_THRESHOLD
                  ? t`În ${chosen.year}, deficitul a fost ${chosenSize} din PIB, peste pragul UE de 3%.`
                  : chosenShare < 0
                    ? t`În ${chosen.year}, deficitul a fost ${chosenSize} din PIB, sub pragul UE de 3%.`
                    : t`În ${chosen.year}, bugetul a avut un excedent de ${chosenSize} din PIB.`
              : chosen
                ? t`Pentru ${chosen.year} buletinul nu tipărește ponderea în PIB; o au buletinele din ${firstYear ?? 2019} încoace.`
                : null
          }
        />
        <dl className="mt-6 grid grid-cols-2 gap-px border bg-border/70">
          <div className="flex flex-col-reverse justify-end gap-2 bg-background p-4">
            <dt>
              <MonoLabel className="block leading-relaxed text-muted-foreground">{t`Ani peste 3% din PIB, din ${firstYear ?? ''}`}</MonoLabel>
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">{t`${over.length} din ${finished.length}`}</dd>
          </div>
          {largest ? (
            <div className="flex flex-col-reverse justify-end gap-2 bg-background p-4">
              <dt>
                <MonoLabel className="block leading-relaxed text-muted-foreground">{t`Cel mai mare, în ${largest.year}`}</MonoLabel>
              </dt>
              <dd className="text-2xl font-semibold tabular-nums">{gdpSizeText(largest.balanceGdp)}</dd>
            </div>
          ) : null}
        </dl>
        <Links />
      </div>
      <div className={cn('lg:col-span-7 lg:col-start-6', HUB_BESIDE_TITLE_CLASS)}>
        <ShareColumns
          bars={bars}
          selected={view.year}
          onSelect={setYear}
          label={t`Deficitul, % din PIB · alege un an`}
          reference={{ value: -EU_THRESHOLD, label: t`pragul UE: 3% din PIB` }}
        />
        <Sources
          note={[
            t`Ponderile în PIB le tipăresc buletinele în format de tabel, din ${firstYear ?? 2019}; decembrie 2023 e un PDF, fără ele.`,
            partial?.balanceGdp ? t`${partialText}*: deficitul de la 1 ianuarie, din PIB-ul estimat pe tot anul.` : null,
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────── C: the budget's size in GDP ──

function SizeLines({ view, index, titleId }: BandProps) {
  const { setYear } = useYear()
  const all = useYearRows()
  const rows = shareRows(all.rows)
  const found = selectedIndex(rows, view)
  const at = found === null || found < 0 ? null : found
  const row = at === null ? null : (rows[at] ?? null)
  const periods = rows.map((entry) => String(entry.year))
  const pct = (fraction: string | null) => gdpNumber(fraction, 2)
  const pctText = (fraction: string | null, entry: YearRow) => (fraction ? `${gdpText(fraction)} ${t`din PIB`}` : noShare(entry))
  const spendingNow = row ? gdpText(row.spendingGdp) : null
  const revenueNow = row ? gdpText(row.revenueGdp) : null
  if (rows.length < 2) return <HubSectionHead titleId={titleId} index={index} title={t`Cât de mare e statul față de economie`} lede={t`Buletinele nu tipăresc ponderile în PIB.`} />
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        <HubSectionHead
          titleId={titleId}
          index={index}
          title={t`Cât de mare e statul față de economie`}
          lede={
            row && spendingNow && revenueNow
              ? t`În ${row.year}, statul a cheltuit cât ${spendingNow} din tot ce a produs economia și a încasat cât ${revenueNow}. Diferența e deficitul.`
              : view.partial
                ? t`Anul ${view.year} nu s-a încheiat: ponderea lui în PIB se poate citi doar la sfârșitul anului.`
                : t`Pentru ${view.year} buletinul nu tipărește ponderile în PIB; le au buletinele din ${periods[0]} încoace (fără 2023).`
          }
        />
        <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
          {t`Ca pondere în PIB, sumele din ani diferiți se pot compara: creșterea prețurilor și a economiei nu le mai umflă.`}
        </p>
        <Links />
      </div>
      <div className={cn('lg:col-span-7 lg:col-start-6', HUB_BESIDE_TITLE_CLASS)}>
        <MonoLabel className="block text-muted-foreground">{t`% din PIB, pe an`}</MonoLabel>
        <div className="mt-3">
          <TimeLines
            label={t`Veniturile și cheltuielile publice ca pondere în PIB, ${periods[0]}–${periods[periods.length - 1]}`}
            periods={periods}
            axisLabel={(period) => period}
            ticks={rows.map((_, position) => position)}
            format={(value) => `${formatHubNumber(value)}%`}
            fromZero={false}
            series={[
              { key: 'revenue', label: t`Venituri`, tone: 'sky', values: rows.map((entry) => pct(entry.revenueGdp)), texts: rows.map((entry) => pctText(entry.revenueGdp, entry)) },
              { key: 'spending', label: t`Cheltuieli`, tone: 'navy', values: rows.map((entry) => pct(entry.spendingGdp)), texts: rows.map((entry) => pctText(entry.spendingGdp, entry)) },
            ]}
            shade={{ upper: 'revenue', lower: 'spending', above: t`Excedent`, below: t`Deficit` }}
            gaps={rows.map((entry) => (entry.spendingGdp === null ? noShare(entry) : null))}
            selected={at}
            onPick={(position) => {
              const year = rows[position]?.year
              if (year !== undefined && rows[position]?.spendingGdp !== null) setYear(year)
            }}
            extra={(position) => {
              const fraction = rows[position]?.balanceGdp ?? null
              return fraction ? <ReadingRow label={fraction.startsWith('-') ? t`Deficit` : t`Excedent`} value={`${gdpSizeText(fraction)} ${t`din PIB`}`} /> : null
            }}
          />
        </div>
        <Sources note={t`Ponderile în PIB sunt cele tipărite de buletinele în format de tabel, din ${periods[0]}; decembrie 2023 e un PDF, fără ele.`} />
      </div>
    </div>
  )
}

export const BALANCE_BAND: BandDefinition = {
  id: 'deficit',
  nav: t`Deficitul`,
  variants: [
    {
      key: 'lei',
      title: t`Venituri și cheltuieli, în lei`,
      note: t`Două linii din 2006: încasările și plățile; spațiul dintre ele, hașurat, e deficitul. Clic pe un an îl alege pentru pagină.`,
      component: BalanceLines,
    },
    {
      key: 'pib',
      title: t`Deficitul din PIB, cu pragul de 3%`,
      note: t`Coloane: deficitul fiecărui an ca pondere în PIB, cu linia pragului UE de 3%; anul în curs, deschis. Coloanele aleg anul.`,
      component: DeficitBars,
    },
    {
      key: 'marime',
      title: t`Statul, cât din economie`,
      note: t`Veniturile și cheltuielile ca pondere în PIB: fără inflație, anii se compară direct; deficitul, între linii.`,
      component: SizeLines,
    },
  ],
}
