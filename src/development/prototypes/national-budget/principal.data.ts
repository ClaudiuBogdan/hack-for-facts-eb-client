/**
 * The citizens' page's reads, over three sources that stay apart:
 *
 * - **the MF bulletins** (the national budget API): the whole public purse —
 *   the consolidated general budget's revenue, spending and deficit, its
 *   lines, its GDP shares, the budgets that make it up, month by month;
 * - **ANAF's budget execution** (`entityAnalytics`, `aggregatedLineItems`):
 *   the state budget's detail — who pays (the ministries, by CUI) and for
 *   what (the functional chapters). Read over the bulletin's own window, so
 *   both describe the same months (ANAF's state budget equals the bulletin's
 *   state-budget column: 499,44 bn lei in 2025, 271,98 bn in Jan.–Jul. 2026);
 * - **the budget laws** (the national budget API): what Parliament approved.
 *
 * A year is the December release; the year in progress is its newest month
 * from 1 January, and every source reads that same window.
 */
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQueries, useSuspenseQuery, queryOptions } from '@tanstack/react-query'
import { useCallback } from 'react'

import {
  approvedTotalsOptions,
  executionGridOptions,
  observationsOptions,
  useNationalCatalog,
} from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { cellsOf, type Cell } from '@/features/national-budget/analytics/lib/analytics-data'
import { FUND_OF, LAW_FUNDS, SPENDING_TOTAL_OF, lastCompleteYear, periodText } from '@/features/national-budget/analytics/lib/analytics-view'
import type { LawFund } from '@/features/national-budget/analytics/lib/analytics-state'
import { canonicalDecimal } from '@/features/national-budget/analytics/lib/exact'
import { yearOf } from '@/features/national-budget/analytics/lib/series'
import { fetchAggregatedLineItems, fetchEntityAnalytics } from '@/lib/api/entity-analytics'
import { sumDecimals } from '@/lib/exact-decimal'
import type { AnalyticsFilterType } from '@/schemas/charts'
import type { BudgetApprovedEdition, BudgetApprovedTotalCell, BudgetNationalCatalog, BudgetObservation } from '@/schemas/national-budget-api'

// ──────────────────────────────────────────────────────────────── the year ──

/** One year as the page reads it: the whole year, or the year in progress to its newest bulletin. */
export type YearView = {
  readonly year: number
  /** The year in progress: its figures run from 1 January to `month`. */
  readonly partial: boolean
  /** The release the year's cumulative figures belong to: „2025-12", „2026-07". */
  readonly month: string
  /** The series label the grid reads: „2025" or „2026-07". */
  readonly label: string
  readonly type: 'YEAR' | 'MONTH'
  readonly basis: 'FULL_YEAR' | 'YTD'
  /** The same window a year earlier: „2024", „2025-07". */
  readonly previous: string
  readonly previousMonth: string
  /** „2025", „ianuarie–iulie 2026". */
  readonly text: string
  /** Why the bulletins answer nothing for this year (2008, 2011, 2013), or null. */
  readonly gap: string | null
}

const GAPS: Readonly<Record<string, string>> = {}

/** The years the bulletins cover, oldest first; the year in progress last. */
export function yearViews(catalog: BudgetNationalCatalog): readonly YearView[] {
  const coverage = catalog.execution.coverage
  const first = yearOf(coverage.firstMonth)
  const complete = lastCompleteYear(coverage)
  const last = yearOf(coverage.lastMonth)
  const missing = new Set(coverage.missingMonths)
  const views: YearView[] = []
  for (let year = first; year <= last; year += 1) {
    const partial = year > complete
    const month = partial ? coverage.lastMonth : `${year}-12`
    const previousMonth = `${year - 1}${month.slice(4)}`
    views.push({
      year,
      partial,
      month,
      label: partial ? month : String(year),
      type: partial ? 'MONTH' : 'YEAR',
      basis: partial ? 'YTD' : 'FULL_YEAR',
      previous: partial ? previousMonth : String(year - 1),
      previousMonth,
      text: partial ? periodText(month, 'YTD') : String(year),
      gap: missing.has(month) ? 'missing_endpoint_release' : (GAPS[String(year)] ?? null),
    })
  }
  return views
}

/** The year a bare page opens on: the newest year the bulletins finish. */
export function defaultYear(catalog: BudgetNationalCatalog): number {
  return lastCompleteYear(catalog.execution.coverage)
}

/** The page's year (`?an=`), and the prototype's per-section variant picks (`?venituri=b`). */
export function usePageSearch() {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const set = useCallback(
    (patch: Record<string, string | number | null>) => {
      void navigate({
        to: '.',
        search: (previous: Record<string, unknown>) => {
          const next: Record<string, unknown> = { ...previous }
          for (const [key, value] of Object.entries(patch)) {
            if (value === null) delete next[key]
            else next[key] = value
          }
          return next
        },
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
  )
  return { search, set }
}

export function useYear(): { readonly view: YearView; readonly views: readonly YearView[]; readonly setYear: (year: number) => void } {
  const catalog = useNationalCatalog()
  const { search, set } = usePageSearch()
  const views = yearViews(catalog)
  const fallback = defaultYear(catalog)
  const asked = Number(search.an)
  const view = views.find((entry) => entry.year === asked) ?? views.find((entry) => entry.year === fallback) ?? views[views.length - 1]!
  const setYear = useCallback((year: number) => set({ an: year === fallback ? null : year }), [set, fallback])
  return { view, views, setYear }
}

// ───────────────────────────────────────────────────────────── bulletins ──

export const TOTAL_ITEMS = {
  revenue: 'mfin.bgc.revenue.total',
  spending: 'mfin.bgc.expenditure.total',
  balance: 'mfin.bgc.balance.surplus_deficit',
} as const

const E = (key: string) => `mfin.bgc.expenditure.${key}`
const R = (key: string) => `mfin.bgc.revenue.${key}`

/**
 * Where the money comes from, as a reader groups it: each a printed line of
 * the bulletin, from one level of its tree or another, never two that hold
 * each other. What they leave is „the rest" of the printed total.
 */
export const REVENUE_PARTS = [
  R('social_contributions'),
  R('vat'),
  R('salary_income_tax'),
  R('excise'),
  R('profit_tax'),
  R('non_tax'),
  R('eu_other_donor_receipts'),
  R('pnrr_grants'),
  R('property_tax'),
] as const

/** What the money is spent on, by its nature: printed lines under „current" and „capital" spending. */
export const SPENDING_PARTS = [
  E('social_assistance'),
  E('personnel'),
  E('goods_services'),
  E('nonfinancial_assets'),
  E('interest'),
  E('external_grant_projects'),
  E('pnrr_grant_projects'),
  E('other_transfers'),
  E('subsidies'),
] as const

/** Every year the bulletins finish, then the year in progress: the three totals. One read for the page's time bands. */
export function useTotalsHistory() {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const coverage = catalog.execution.coverage
  const complete = lastCompleteYear(coverage)
  const items = [TOTAL_ITEMS.revenue, TOTAL_ITEMS.spending, TOTAL_ITEMS.balance]
  const [{ data: years }, { data: months }] = useSuspenseQueries({
    queries: [
      executionGridOptions(client, catalog.snapshots.execution, {
        itemIds: items,
        basis: 'FULL_YEAR',
        period: { type: 'YEAR', interval: { start: coverage.firstMonth.slice(0, 4), end: String(complete) } },
      }),
      // The two last years month by month, from 1 January: the year in progress against the one before.
      executionGridOptions(client, catalog.snapshots.execution, {
        itemIds: items,
        basis: 'YTD',
        period: { type: 'MONTH', interval: { start: `${yearOf(coverage.lastMonth) - 1}-01`, end: coverage.lastMonth } },
      }),
    ],
  })
  const yearCells = new Map(years.results.map((result) => [result.item.itemId, cellsOf(result)]))
  const monthCells = new Map(months.results.map((result) => [result.item.itemId, cellsOf(result)]))
  return { yearCells, monthCells, complete, lastMonth: coverage.lastMonth }
}

/** One section's lines for the year and the same window a year earlier. */
export function useYearLines(view: YearView, itemIds: readonly string[]) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(
    executionGridOptions(client, catalog.snapshots.execution, {
      itemIds,
      basis: view.basis,
      period: { type: view.type, dates: [view.previous, view.label] },
    }),
  )
  const cells = new Map(data.results.map((result) => [result.item.itemId, cellsOf(result)]))
  return {
    now: (itemId: string): Cell | null => cells.get(itemId)?.get(view.label) ?? null,
    before: (itemId: string): Cell | null => cells.get(itemId)?.get(view.previous) ?? null,
  }
}

/** The GDP shares the year's release prints for the consolidated budget, by item, and the GDP it divides by. */
export function useGdp(view: YearView) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(
    observationsOptions(client, catalog.snapshots.execution, { months: [view.month], measures: ['GDP_SHARE', 'GDP_DENOMINATOR'] }),
  )
  return gdpOf(catalog, data.rows)
}

export function gdpOf(catalog: BudgetNationalCatalog, rows: readonly BudgetObservation[]) {
  const shares = new Map<string, string>()
  let gdp: string | null = null
  for (const row of rows) {
    if (row.measure === 'GDP_DENOMINATOR') gdp = row.value
    if (row.measure !== 'GDP_SHARE' || row.value === null) continue
    const item = catalog.execution.seriesItems.find((entry) => entry.sourceLabel === row.lineItem && entry.section === row.section)
    if (item) shares.set(item.itemId, canonicalDecimal(row.value))
  }
  return { share: (itemId: string) => shares.get(itemId) ?? null, gdp }
}

/** Every December's GDP shares of the three totals: the deficit and the budget's size in GDP, year by year. */
export function useGdpHistory() {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const coverage = catalog.execution.coverage
  const months: string[] = []
  for (let year = yearOf(coverage.firstMonth); year <= lastCompleteYear(coverage); year += 1) months.push(`${year}-12`)
  if (!coverage.lastMonth.endsWith('-12')) months.push(coverage.lastMonth)
  const { data } = useSuspenseQuery(
    observationsOptions(client, catalog.snapshots.execution, {
      months,
      measures: ['GDP_SHARE'],
      lineItems: ['venituri totale', 'cheltuieli totale', 'excedent(+) / deficit(-)'],
    }),
  )
  const byMonth = new Map<string, Map<string, string>>()
  for (const row of data.rows) {
    if (row.value === null) continue
    const item = catalog.execution.seriesItems.find((entry) => entry.sourceLabel === row.lineItem && entry.section === row.section)
    if (!item) continue
    const month = byMonth.get(row.month) ?? new Map<string, string>()
    month.set(item.itemId, canonicalDecimal(row.value))
    byMonth.set(row.month, month)
  }
  return { share: (month: string, itemId: string) => byMonth.get(month)?.get(itemId) ?? null, months }
}

/** The budgets the release prints a column for, then the bridge to the consolidated budget: spending and revenue totals. */
export const BUDGET_COLUMNS = [
  'state_budget',
  'territorial_units_budget',
  'state_social_insurance_budget',
  'national_health_insurance_fund',
  'public_bodies_own_revenue_budget',
  'national_road_infrastructure_company_budget',
  'unemployment_insurance_budget',
  'exim_source_component',
  'treasury_budget',
  'ministry_external_loans',
  'nonrefundable_external_funds',
] as const

export function useBudgetColumns(view: YearView) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(
    observationsOptions(client, catalog.snapshots.execution, {
      months: [view.month],
      lineItems: ['venituri totale', 'cheltuieli totale'],
      sections: ['REVENUE', 'EXPENDITURE'],
      measures: ['AMOUNT'],
    }),
  )
  const value = (component: string, section: 'REVENUE' | 'EXPENDITURE') =>
    data.rows.find((row) => row.component === component && row.section === section)?.value ?? null
  return { value, printed: data.rows.length > 0 }
}

// ─────────────────────────────────────────────────────────────────── ANAF ──

const ANAF_ROOT = 'national-budget-citizens-anaf'
const ANAF_STALE = 10 * 60_000

/** ANAF's state budget: sector 1, funding source 1, the principal authorities' aggregated reports, payments. */
function anafFilter(view: YearView, extra: Partial<AnalyticsFilterType> = {}): AnalyticsFilterType {
  return {
    report_period: view.partial
      ? { type: 'MONTH', selection: { interval: { start: `${view.year}-01`, end: view.month } } }
      : { type: 'YEAR', selection: { interval: { start: String(view.year), end: String(view.year) } } },
    account_category: 'ch',
    report_type: 'Executie bugetara agregata la nivel de ordonator principal',
    normalization: 'total',
    currency: 'RON',
    inflation_adjusted: false,
    show_period_growth: false,
    budget_sector_ids: ['1'],
    funding_source_ids: ['1'],
    ...extra,
  }
}

/** ANAF's first year: its execution reports start in 2016. */
export const ANAF_FIRST_YEAR = 2016

/** The same window a year earlier, for the change. */
export function previousView(view: YearView): YearView {
  return { ...view, year: view.year - 1, month: view.previousMonth, label: view.previous }
}

export type AnafAuthority = { readonly cui: string; readonly name: string; readonly lei: string }

export function anafAuthoritiesOptions(view: YearView) {
  return queryOptions({
    queryKey: [ANAF_ROOT, 'authorities', view.year, view.month] as const,
    queryFn: async ({ signal }) => {
      const page = await fetchEntityAnalytics({ filter: anafFilter(view), sort: { by: 'amount', order: 'DESC' }, limit: 200, signal })
      return page.nodes.map((node): AnafAuthority => ({ cui: node.entity_cui, name: node.entity_name, lei: Number(node.amount).toFixed(2) }))
    },
    staleTime: ANAF_STALE,
    retry: 1,
  })
}

export type AnafChapter = { readonly code: string; readonly lei: string }

/** The state budget's payments by functional chapter (the line items' first two digits), summed on the exact decimals. */
export function anafChaptersOptions(view: YearView, cui: string | null = null) {
  return queryOptions({
    queryKey: [ANAF_ROOT, 'chapters', view.year, view.month, cui] as const,
    queryFn: async ({ signal }) => {
      const page = await fetchAggregatedLineItems({ filter: anafFilter(view, cui ? { entity_cuis: [cui] } : {}), limit: 100000, signal })
      const byChapter = new Map<string, string[]>()
      for (const node of page.nodes) {
        const code = String(node.fn_c ?? '').split('.')[0] ?? ''
        const list = byChapter.get(code) ?? []
        list.push(Number(node.amount).toFixed(2))
        byChapter.set(code, list)
      }
      return [...byChapter]
        .map(([code, amounts]): AnafChapter => ({ code, lei: sumDecimals(amounts) ?? '0' }))
        .sort((a, b) => Number(b.lei) - Number(a.lei))
    },
    staleTime: ANAF_STALE,
    retry: 1,
  })
}

export function useAnafAuthorities(view: YearView) {
  const [{ data: now }, { data: before }] = useSuspenseQueries({ queries: [anafAuthoritiesOptions(view), anafAuthoritiesOptions(previousView(view))] })
  return { now, before }
}

export function useAnafChapters(view: YearView, cui: string | null = null) {
  return useSuspenseQuery(anafChaptersOptions(view, cui)).data
}

/** The total of a list of ANAF amounts, exactly. */
export const anafTotal = (rows: readonly { readonly lei: string }[]): string => sumDecimals(rows.map((row) => row.lei)) ?? '0'

// ──────────────────────────────────────────────────────────────── the law ──

/** The law of a year, as loaded: null for a year no law of the catalog answers (2026: still pending). */
export function lawEditionOf(catalog: BudgetNationalCatalog, year: number): BudgetApprovedEdition | null {
  return catalog.approved.editions.find((entry) => entry.budgetYear === year) ?? null
}

/** The year's law: each fund's printed spending and revenue totals for its own year, in lei. */
export function useLawTotals(edition: BudgetApprovedEdition) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(
    approvedTotalsOptions(client, catalog.snapshots.approved, {
      totals: ['EXPENDITURE_5001_STATE_BUDGET', 'EXPENDITURE_5000_TOTAL_GENERAL', 'REVENUE_TOTAL'],
      editionIds: [edition.id],
      creditTypes: ['BUDGET_CREDITS'],
      measureYears: [edition.budgetYear],
    }),
  )
  const spending = (fund: LawFund): BudgetApprovedTotalCell | null =>
    data.find((cell) => cell.fund === FUND_OF[fund] && cell.total === SPENDING_TOTAL_OF[fund] && cell.measureYear === edition.budgetYear) ?? null
  const revenue = (fund: LawFund): BudgetApprovedTotalCell | null =>
    data.find((cell) => cell.fund === FUND_OF[fund] && cell.total === 'REVENUE_TOTAL' && cell.measureYear === edition.budgetYear) ?? null
  return { funds: LAW_FUNDS, spending, revenue }
}
