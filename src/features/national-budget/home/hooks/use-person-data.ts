/**
 * The page's reads at one person's scale (promoted from the prototype
 * `national-budget/persoana`, variant `lucru`, 25 November 2026): every
 * amount is a printed cell, kept exact; per resident it is divided by the
 * resident population on 1 January of its year (`lib/per-resident.ts`).
 * Shares and changes are rounded once from the exact decimals; floats serve
 * only to draw and to apportion whole lei out of 100.
 */
import { usePrefetchQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'

import { executionGridOptions, observationsOptions, useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { cellsOf } from '@/features/national-budget/analytics/lib/analytics-data'
import { lastCompleteYear } from '@/features/national-budget/analytics/lib/analytics-view'
import { absDecimal, exactChange, exactPercent, isNegative, plotOf } from '@/features/national-budget/analytics/lib/exact'
import { sumDecimals } from '@/lib/exact-decimal'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import type { BudgetNationalCatalog } from '@/schemas/national-budget-api'
import { REVENUE_PARTS, SPENDING_PARTS, TOTAL_ITEMS, anafTotal, gdpOf, yearTotalsOf, yearViews, type YearView } from '../lib/home-data'
import { authorityName, chapterName, partHint, partName, restOf } from '../lib/home-format'
import { gdpLeiOf, outOfHundred, populationOf } from '../lib/per-resident'
import { useAnafAuthorities, useAnafChapterYears, useTotalsHistory, useYearLines } from './use-home-data'

// ───────────────────────────────────────────────────────────── changes ──

/** „+12%", „−4,2%": a change on the exact amounts, one decimal under ten; „0%" when it rounds to nothing; null without a base. */
export function changeText(now: string | null | undefined, before: string | null | undefined): string | null {
  if (!now || !before) return null
  const precise = exactChange(now, before, 1)
  if (precise === null) return null
  if (precise === 0) return '0%'
  const digits = Math.abs(precise) < 10 ? 1 : 0
  const shown = digits === 1 ? precise : exactChange(now, before, 0)
  if (shown === null) return null
  return `${shown > 0 ? '+' : '−'}${formatHubNumber(Math.abs(shown), { digits })}%`
}

/** The years a reader can pick: the full years with a population, newest first, the year in progress before them. */
export function personYearsOf(catalog: BudgetNationalCatalog): readonly YearView[] {
  return [...yearViews(catalog).filter((view) => populationOf(view.year) !== null)].reverse()
}

/** The newest view the bulletins cover: the year in progress, or the newest full year. */
export function newestViewOf(catalog: BudgetNationalCatalog): YearView {
  const views = yearViews(catalog)
  return views[views.length - 1]!
}

// ──────────────────────────────────────────────────── lei out of 100 ──

export type HundredLine = {
  readonly key: string
  readonly label: string
  readonly hint: string | null
  /** Lei, as printed (the rest: the total minus the lines named). */
  readonly exact: string
  /** Whole lei of every 100. */
  readonly lei: number
  readonly change: string | null
  readonly rest?: boolean
}

/** „The rest" of a side; the PNRR (from 2021) only in the years it exists. */
function restLine(side: 'spending' | 'revenue', year: number): { readonly label: string; readonly hint: string } {
  if (side === 'revenue') return { label: t`Alte venituri`, hint: t`taxe vamale, alte impozite, venituri din capital, alte sume de la UE` }
  return { label: t`Alte cheltuieli`, hint: year >= 2021 ? t`proiecte PNRR din împrumuturi, active financiare, rambursări, alte cheltuieli` : t`active financiare, rambursări, alte cheltuieli` }
}

/**
 * A printed total and its named lines as lei out of every 100: the official
 * amounts, each line's whole lei (they make 100 with „the rest"), and the
 * change on the same window a year earlier.
 */
export function useHundred(view: YearView, side: 'spending' | 'revenue') {
  const total = side === 'spending' ? TOTAL_ITEMS.spending : TOTAL_ITEMS.revenue
  const items: readonly string[] = side === 'spending' ? SPENDING_PARTS : REVENUE_PARTS
  const lines = useYearLines(view, [total, ...items])
  const whole = lines.now(total)?.exact ?? null
  if (!whole) return { whole: null, before: null, lines: [] as readonly HundredLine[] }
  const named = items.flatMap((itemId) => {
    const exact = lines.now(itemId)?.exact
    return exact ? [{ key: itemId, label: partName(itemId), hint: partHint(itemId), exact, change: changeText(exact, lines.before(itemId)?.exact) }] : []
  })
  return { whole, before: lines.before(total)?.exact ?? null, lines: hundredOf(whole, named, restLine(side, view.year)) }
}

/**
 * A printed total's named lines as whole lei of every 100, largest first,
 * with „the rest" (the total minus them) when it is half a percent or more;
 * none when no line is printed: a total without its lines is not a whole
 * that is all „the rest" (design §11.5).
 */
export function hundredOf(
  whole: string,
  named: readonly Omit<HundredLine, 'lei' | 'rest'>[],
  rest: { readonly label: string; readonly hint: string },
): readonly HundredLine[] {
  if (!named.length) return []
  const sorted = [...named].sort((a, b) => (plotOf(b.exact) ?? 0) - (plotOf(a.exact) ?? 0))
  const remainder = restOf(whole, sorted.map((line) => line.exact))
  const share = remainder ? exactPercent(remainder, whole, 1) : null
  const withRest = remainder && share !== null && share >= 0.5 ? [...sorted, { key: 'rest', ...rest, exact: remainder, change: null, rest: true }] : sorted
  const hundreds = outOfHundred(withRest.map((line) => plotOf(line.exact) ?? 0))
  return withRest.map((line, index): HundredLine => ({ ...line, lei: hundreds[index] ?? 0 }))
}

/** The year's totals as printed, and how many lei of every 100 spent were borrowed (and came from revenue). */
export function useOfficialTotals(view: YearView) {
  const lines = useYearLines(view, [TOTAL_ITEMS.revenue, TOTAL_ITEMS.spending, TOTAL_ITEMS.balance])
  const at = (itemId: string) => lines.now(itemId)?.exact ?? null
  const was = (itemId: string) => lines.before(itemId)?.exact ?? null
  const spending = at(TOTAL_ITEMS.spending)
  const revenue = at(TOTAL_ITEMS.revenue)
  const balance = at(TOTAL_ITEMS.balance)
  const balanceBefore = was(TOTAL_ITEMS.balance)
  const deficit = balance !== null && isNegative(balance) ? absDecimal(balance) : null
  const deficitBefore = balanceBefore !== null && isNegative(balanceBefore) ? absDecimal(balanceBefore) : null
  const [fromRevenue, borrowed] = spending && revenue && deficit ? outOfHundred([plotOf(revenue) ?? 0, plotOf(deficit) ?? 0]) : [100, 0]
  return {
    spending,
    revenue,
    balance,
    deficit,
    deficitBefore,
    fromRevenue: fromRevenue ?? 100,
    borrowed: borrowed ?? 0,
    spendingChange: changeText(spending, was(TOTAL_ITEMS.spending)),
    revenueChange: changeText(revenue, was(TOTAL_ITEMS.revenue)),
    deficitChange: changeText(deficit, deficitBefore),
  }
}

// ──────────────────────────────────────────────────── the state budget ──

export type StateLine = { readonly key: string; readonly label: string; readonly exact: string; readonly lei: number; readonly change: string | null }

function stateLines(rows: readonly { readonly key: string; readonly label: string; readonly exact: string }[], before: ReadonlyMap<string, string>): readonly StateLine[] {
  const sorted = [...rows].sort((a, b) => (plotOf(b.exact) ?? 0) - (plotOf(a.exact) ?? 0))
  const hundreds = outOfHundred(sorted.map((row) => plotOf(row.exact) ?? 0))
  return sorted.map((row, index) => ({ ...row, lei: hundreds[index] ?? 0, change: changeText(row.exact, before.get(row.key)) }))
}

/** The state budget's payments (ANAF) by functional chapter and by principal authority; only for a year ANAF covers. */
export function useStateBudget(view: YearView) {
  const chapters = useAnafChapterYears(view)
  const authorities = useAnafAuthorities(view)
  const whole = anafTotal(chapters.now)
  return {
    whole,
    change: changeText(whole, chapters.before ? anafTotal(chapters.before) : null),
    domains: stateLines(
      chapters.now.map((chapter) => ({ key: chapter.code, label: chapterName(chapter.code), exact: chapter.lei })),
      new Map((chapters.before ?? []).map((chapter) => [chapter.code, chapter.lei])),
    ),
    authorities: stateLines(
      authorities.now.map((row) => ({ key: row.cui, label: authorityName(row.cui, row.name), exact: row.lei })),
      new Map((authorities.before ?? []).map((row) => [row.cui, row.lei])),
    ),
  }
}

// ─────────────────────────────────────────────────── borrowing, by year ──

export type BorrowedYear = {
  readonly year: number
  /** The year in progress: January to the newest bulletin. */
  readonly partial: boolean
  /** The deficit as printed, positive; null in a surplus or without an answer. */
  readonly deficit: string | null
  /** The deficit's share of GDP in percent (0 in a surplus), four decimals kept so the page rounds it once; null where neither the share nor the GDP is known. */
  readonly gdpShare: number | null
  /** Printed in the year's bulletin, or the printed deficit over the year's GDP (`lib/per-resident.ts`). */
  readonly gdpShareFrom: 'printed' | 'computed' | null
  /** Whole lei of every 100 spent that were borrowed; null without the year's totals. */
  readonly lei: number | null
}

export function borrowedSharesOptions(client: ReturnType<typeof useQueryClient>, catalog: BudgetNationalCatalog) {
  return observationsOptions(client, catalog.snapshots.execution, {
    months: personYearsOf(catalog).map((view) => view.month),
    measures: ['GDP_SHARE'],
    lineItems: ['excedent(+) / deficit(-)'],
  })
}

/**
 * Every year the page offers, oldest first: the deficit as printed and its
 * share of GDP. The share is the bulletin's own where it prints one (2019
 * on, not 2023); before, it is the printed deficit over the annual GDP.
 */
export function useBorrowedYears(): readonly BorrowedYear[] {
  const { yearCells, complete } = useTotalsHistory()
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const views = [...personYearsOf(catalog)].reverse()
  const { data: shares } = useSuspenseQuery(borrowedSharesOptions(client, catalog))
  const first = Number(catalog.execution.coverage.firstMonth.slice(0, 4))
  const running = useOfficialTotals(newestViewOf(catalog))
  const totals = new Map(yearTotalsOf(yearCells, first, complete).map((row) => [row.year, row]))
  return views.map((view): BorrowedYear => {
    const row = view.partial ? { revenue: running.revenue, spending: running.spending, balance: running.balance } : totals.get(view.year)
    const printed = gdpOf({ catalog, shares: shares.rows.filter((entry) => entry.month === view.month), denominators: [], year: view.year }).share(TOTAL_ITEMS.balance)
    const known = row?.revenue && row.spending && row.balance !== null && row.balance !== undefined ? row : null
    const deficit = known && known.balance && isNegative(known.balance) ? absDecimal(known.balance) : null
    const gdp = view.partial ? null : gdpLeiOf(view.year)
    // The balance's share is signed: a surplus borrows nothing.
    const printedShare = printed === null ? null : isNegative(printed) ? exactPercent(absDecimal(printed), '1', 4) : 0
    const computedShare = printedShare === null && deficit && gdp ? exactPercent(deficit, String(Math.round(gdp)), 4) : null
    return {
      year: view.year,
      partial: view.partial,
      deficit,
      gdpShare: printedShare ?? computedShare,
      gdpShareFrom: printedShare !== null ? 'printed' : computedShare !== null ? 'computed' : null,
      lei: known ? (deficit ? (outOfHundred([plotOf(known.revenue) ?? 0, plotOf(deficit) ?? 0])[1] ?? 0) : 0) : null,
    }
  })
}

export function interestTrendOptions(client: ReturnType<typeof useQueryClient>, catalog: BudgetNationalCatalog) {
  return executionGridOptions(client, catalog.snapshots.execution, {
    itemIds: ['mfin.bgc.expenditure.interest'],
    basis: 'FULL_YEAR',
    period: { type: 'YEAR', interval: { start: '2006', end: String(lastCompleteYear(catalog.execution.coverage)) } },
  })
}

/** Interest on the debt every full year since 2006, as printed; null where a year has none. */
export function useInterestTrend(): readonly { readonly year: number; readonly exact: string | null }[] {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(interestTrendOptions(client, catalog))
  const cells = cellsOf(data.results[0])
  const complete = lastCompleteYear(catalog.execution.coverage)
  return Array.from({ length: complete - 2005 }, (_, index) => ({ year: 2006 + index, exact: cells.get(String(2006 + index))?.exact ?? null }))
}

// ─────────────────────────────────────────── the year, month by month ──

/** The deficit from January to the end of a month, as that month's bulletin prints it; null where it prints none. */
export type MonthPoint = {
  /** 1 to 12. */
  readonly month: number
  /** Lei, positive for a deficit, negative for a surplus. */
  readonly deficit: number | null
  /** The bulletin's share of the year's GDP, in percent, signed as `deficit`. */
  readonly gdpShare: number | null
}

export type RunningYear = { readonly year: number; readonly points: readonly MonthPoint[] }

const monthsOfYear = (year: number, count: number) => Array.from({ length: count }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
const monthsCovered = (view: YearView) => (view.partial ? Number(view.month.slice(5, 7)) : 12)

export function yearSoFarOptions(client: ReturnType<typeof useQueryClient>, catalog: BudgetNationalCatalog) {
  const newest = newestViewOf(catalog)
  return observationsOptions(client, catalog.snapshots.execution, {
    months: [...monthsOfYear(newest.year - 1, 12), ...monthsOfYear(newest.year, monthsCovered(newest))],
    components: ['general_consolidated_budget'],
    sections: ['BALANCE'],
    lineItems: ['excedent(+) / deficit(-)'],
    measures: ['AMOUNT', 'GDP_SHARE'],
  })
}

/** The newest year the bulletins cover and the year before it, whole: the consolidated deficit from January to each month. */
export function useYearSoFar(): { readonly newest: YearView; readonly now: RunningYear; readonly before: RunningYear } {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const newest = newestViewOf(catalog)
  const { data } = useSuspenseQuery(yearSoFarOptions(client, catalog))
  const printed = new Map<string, number>()
  for (const row of data.rows) {
    if (row.disposition !== 'FACT' || row.value === null) continue
    const value = plotOf(row.value)
    if (value !== null) printed.set(`${row.month} ${row.measure}`, -value)
  }
  const yearOf = (year: number, count: number): RunningYear => ({
    year,
    points: monthsOfYear(year, count).map((month, index) => {
      const share = printed.get(`${month} GDP_SHARE`)
      return { month: index + 1, deficit: printed.get(`${month} AMOUNT`) ?? null, gdpShare: share === undefined ? null : share * 100 }
    }),
  })
  return { newest, now: yearOf(newest.year, monthsCovered(newest)), before: yearOf(newest.year - 1, 12) }
}


// ─────────────────────────────────────────────── the budgets, compared ──

export type Part = 'own' | 'others' | 'eu' | 'borrowed'

const LINE = {
  revenue: 'venituri totale',
  fromOthers: 'subventii',
  euCurrent: 'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari',
  euPrevious: 'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari aferente cadrului financiar 2014-2020',
  euOther: 'alte sume primite de la ue',
  pnrr: 'sume aferente asistentei financiare nerambursabile alocate pentru pnrr',
  spending: 'cheltuieli totale',
  balance: 'excedent(+) / deficit(-)',
} as const

const NAMED = ['state_budget', 'territorial_units_budget', 'state_social_insurance_budget', 'national_health_insurance_fund'] as const
const BEFORE = 'budget_total_before_transfers'
const TRANSFERS = 'signed_interbudget_transfers'
const CONSOLIDATED = 'general_consolidated_budget'
const OPERATIONS = 'signed_financial_operations'

export type BudgetRow = {
  readonly key: string
  /** Lei, as printed. */
  readonly spending: string
  /** Where the spending came from; the four add up to the spending. */
  readonly parts: Readonly<Record<Part, string>>
  /** Revenue the budget kept unspent (its surplus); null in a deficit. */
  readonly surplus: string | null
}

/** The bulletin's own bridge from the budgets to the consolidated budget, as printed. */
export type BudgetBridge = {
  /** All budgets' spending before transfers (the printed column). */
  readonly before: string
  /** Money passed from one budget to another, netted once in the consolidated total. */
  readonly passed: string
  /** Of it, what the receivers book as „subvenții"; null when the release doesn't print it. */
  readonly received: string | null
  /** Public spending: the consolidated budget. */
  readonly consolidated: string
  /** The consolidated budget's deficit; null in a surplus. */
  readonly deficit: string | null
  /**
   * The financial operations between the budgets netted and the consolidated
   * budget, signed as printed (NB-001: 1.003,1 − 185,1 − 9,3 = 808,7 mld. lei
   * in 2025); null when the printed steps don't add up to the consolidated
   * budget, and then no sentence does the sum.
   */
  readonly operations: string | null
}

type Column = { readonly spending: string; readonly others: string; readonly eu: string; readonly balance: string }

/** A budget's spending by source; its own revenue is what the others leave, and can come out negative when the printed cells don't reconcile. */
function rowOf(key: string, column: Column): BudgetRow {
  const borrowed = isNegative(column.balance) ? absDecimal(column.balance) : '0'
  const own = restOf(column.spending, [column.others, column.eu, borrowed]) ?? '0'
  return {
    key,
    spending: column.spending,
    parts: { own, others: column.others, eu: column.eu, borrowed },
    surplus: isNegative(column.balance) || column.balance === '0' ? null : column.balance,
  }
}

export function budgetsOptions(client: ReturnType<typeof useQueryClient>, catalog: BudgetNationalCatalog, view: YearView) {
  return observationsOptions(client, catalog.snapshots.execution, {
    months: [view.month],
    components: [...NAMED, BEFORE, TRANSFERS, OPERATIONS, CONSOLIDATED],
    measures: ['AMOUNT'],
    lineItems: Object.values(LINE),
  })
}

export type Budgets = {
  readonly rows: readonly BudgetRow[]
  readonly bridge: BudgetBridge
  /** Whether every budget's sources add up to its spending, none negative: only then are they drawn as flows. */
  readonly flows: boolean
}

/** The year's budgets from the release's printed cells (`component|section|lineItem` → exact lei); null without the four budgets' columns. */
export function budgetsFrom(cells: ReadonlyMap<string, string>): Budgets | null {
  const at = (component: string, section: string, line: string) => cells.get(`${component}|${section}|${line}`) ?? '0'
  const columnOf = (component: string): Column => ({
    spending: at(component, 'EXPENDITURE', LINE.spending),
    others: at(component, 'REVENUE', LINE.fromOthers),
    // The four lines of EU money, siblings under total revenue: the payments for both financial frameworks, the other sums, the PNRR grants.
    eu: sumDecimals([LINE.euCurrent, LINE.euPrevious, LINE.euOther, LINE.pnrr].map((line) => at(component, 'REVENUE', line))) ?? '0',
    balance: at(component, 'BALANCE', LINE.balance),
  })
  // A budget missing from the release would end up inside „the other budgets", and public spending is what they are
  // compared with: without either, no comparison.
  if (![...NAMED, BEFORE, CONSOLIDATED].every((component) => plotOf(cells.get(`${component}|EXPENDITURE|${LINE.spending}`) ?? null))) return null
  const named = NAMED.map(columnOf)
  const before = columnOf(BEFORE)
  const minus = (pick: (column: Column) => string) => restOf(pick(before), named.map(pick)) ?? '0'
  const rest: Column = { spending: minus((c) => c.spending), others: minus((c) => c.others), eu: minus((c) => c.eu), balance: minus((c) => c.balance) }
  const consolidatedBalance = at(CONSOLIDATED, 'BALANCE', LINE.balance)
  const transfers = at(TRANSFERS, 'EXPENDITURE', LINE.spending)
  const operations = at(OPERATIONS, 'EXPENDITURE', LINE.spending)
  const consolidated = at(CONSOLIDATED, 'EXPENDITURE', LINE.spending)
  const steps = [TRANSFERS, OPERATIONS, CONSOLIDATED].every((component) => cells.has(`${component}|EXPENDITURE|${LINE.spending}`))
  // The cells carry the spreadsheet's float noise (2025: 0,00007 lei): under a leu, the steps add up.
  const reconciles = steps && Math.abs(plotOf(restOf(consolidated, [before.spending, transfers, operations])) ?? Number.POSITIVE_INFINITY) < 1
  const rows = [...NAMED.map((key, index) => rowOf(key, named[index]!)), rowOf('rest', rest)]
  return {
    rows,
    bridge: {
      before: before.spending,
      passed: absDecimal(transfers),
      received: cells.get(`${BEFORE}|REVENUE|${LINE.fromOthers}`) ?? null,
      consolidated,
      deficit: isNegative(consolidatedBalance) ? absDecimal(consolidatedBalance) : null,
      operations: reconciles ? operations : null,
    },
    flows: rows.every((row) => !Object.values(row.parts).some(isNegative)),
  }
}

/** The year's budgets as printed; null when the release prints no budget columns (before 2019, and December 2023). */
export function useBudgets(view: YearView): Budgets | null {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(budgetsOptions(client, catalog, view))
  const cells = new Map<string, string>()
  for (const row of data.rows) {
    if (row.disposition !== 'FACT' || row.value === null || !row.component) continue
    cells.set(`${row.component}|${row.section}|${row.lineItem}`, row.value)
  }
  return budgetsFrom(cells)
}

/** The page's own reads for a year, started at once beside the live reads (`useHomePrefetch`), so the server's render doesn't wait read after read. */
export function usePersonPrefetch(view: YearView) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  usePrefetchQuery(borrowedSharesOptions(client, catalog))
  usePrefetchQuery(interestTrendOptions(client, catalog))
  usePrefetchQuery(yearSoFarOptions(client, catalog))
  usePrefetchQuery(budgetsOptions(client, catalog, view))
}
