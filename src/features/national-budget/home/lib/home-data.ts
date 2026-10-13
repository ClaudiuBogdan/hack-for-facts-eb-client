/**
 * The national budget page's data, over three sources that stay apart:
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
 * from 1 January, and every source reads that same window. The reads
 * themselves are `../hooks/use-home-data.ts`.
 */
import { queryOptions } from '@tanstack/react-query'

import { cellsOf, type Cell } from '@/features/national-budget/analytics/lib/analytics-data'
import { lastCompleteYear, periodText } from '@/features/national-budget/analytics/lib/analytics-view'
import { canonicalDecimal } from '@/features/national-budget/analytics/lib/exact'
import { yearOf } from '@/features/national-budget/analytics/lib/series'
import { fetchCompleteAggregatedLineItems, fetchEntityAnalytics } from '@/lib/api/entity-analytics'
import { compareDecimal, isDecimalString, sumDecimals } from '@/lib/exact-decimal'
import type { AnalyticsFilterType } from '@/schemas/charts'
import type { BudgetApprovedEdition, BudgetNationalCatalog, BudgetNationalSeries, BudgetObservation } from '@/schemas/national-budget-api'

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
}

/** The years the bulletins cover, oldest first; the year in progress last. */
export function yearViews(catalog: BudgetNationalCatalog): readonly YearView[] {
  const coverage = catalog.execution.coverage
  const complete = lastCompleteYear(coverage)
  const views: YearView[] = []
  for (let year = yearOf(coverage.firstMonth); year <= yearOf(coverage.lastMonth); year += 1) {
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
    })
  }
  return views
}

/** The year a bare page opens on: the newest year the bulletins finish. */
export function defaultYear(catalog: BudgetNationalCatalog): number {
  return lastCompleteYear(catalog.execution.coverage)
}

/** The page's year from its address: one the bulletins cover, else the default. */
export function viewOfYear(catalog: BudgetNationalCatalog, asked: number | undefined): YearView {
  const views = yearViews(catalog)
  const fallback = defaultYear(catalog)
  return views.find((entry) => entry.year === asked) ?? views.find((entry) => entry.year === fallback) ?? views[views.length - 1]!
}

/**
 * What a band's read answers for: its year and the lanes' loads. A read
 * boundary keyed by it starts afresh for a new year, or after a lane moved
 * (the catalog read again), instead of keeping an error that belongs to
 * another question.
 */
export function readKey(view: YearView | null, catalog: BudgetNationalCatalog): string {
  return `${view?.label ?? 'every-year'}|${catalog.snapshots.execution}|${catalog.snapshots.approved}`
}

/** The address's keys that are the site's, not this page's (`lang`): carried into the pages it links to. */
export function siteKeys(search: Record<string, unknown>): Record<string, unknown> {
  return typeof search.lang === 'string' ? { lang: search.lang } : {}
}

// ───────────────────────────────────────────────────────────── bulletins ──

export const TOTAL_ITEMS = {
  revenue: 'mfin.bgc.revenue.total',
  spending: 'mfin.bgc.expenditure.total',
  balance: 'mfin.bgc.balance.surplus_deficit',
} as const

/**
 * The full years the bulletins don't vouch for, with the server's reason, from
 * the years' read of the totals: the year menus list them but don't offer
 * them. Which years these are is the API's answer, never a list kept here.
 */
export function unfinishedYearsOf(results: readonly BudgetNationalSeries[]): readonly (readonly [string, string | null])[] {
  const cells = cellsOf(results.find((result) => result.item.itemId === TOTAL_ITEMS.spending))
  return [...cells].filter(([, cell]) => cell.exact === null).map(([label, cell]) => [label, cell.reason] as const)
}

/** A year's three totals as the bulletin prints them: the balance its own line, never revenue less spending. */
export type YearTotals = {
  readonly year: number
  readonly revenue: string | null
  readonly spending: string | null
  readonly balance: string | null
  /** Why the bulletins answer no balance for the year; null when they do. */
  readonly gap: { readonly reason: string | null } | null
}

/** Every year from `first` to `last`, oldest first, from the years' read of the totals by item and year. */
export function yearTotalsOf(cells: ReadonlyMap<string, ReadonlyMap<string, Cell>>, first: number, last: number): readonly YearTotals[] {
  const cellOf = (itemId: string, year: number) => cells.get(itemId)?.get(String(year)) ?? null
  const rows: YearTotals[] = []
  for (let year = first; year <= last; year += 1) {
    const balance = cellOf(TOTAL_ITEMS.balance, year)
    rows.push({
      year,
      revenue: cellOf(TOTAL_ITEMS.revenue, year)?.exact ?? null,
      spending: cellOf(TOTAL_ITEMS.spending, year)?.exact ?? null,
      balance: balance?.exact ?? null,
      gap: balance?.exact == null ? { reason: balance?.reason ?? null } : null,
    })
  }
  return rows
}

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
  R('eu_2014_2020_receipts'),
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
  E('eu_2014_2020_projects'),
  E('eu_2014_2020_modernisation_projects'),
  E('pnrr_grant_projects'),
  E('other_transfers'),
  E('subsidies'),
] as const

/**
 * How one GDP figure stands: printed once (or the same value repeated),
 * not printed, printed twice with different values, or printed in a unit the
 * figure cannot carry. Only `available` is shown; the other three are said.
 */
export type GdpStatus = 'available' | 'absent' | 'conflicting' | 'unqualified'

/** The GDP figures of one year's release, each with how it stands. */
export type GdpRead = {
  /** The printed share of the consolidated budget for an item, as a fraction; null unless available. */
  readonly share: (itemId: string) => string | null
  readonly shareStatus: (itemId: string) => GdpStatus
  /** The year's GDP in lei; null unless available. */
  readonly gdp: string | null
  readonly gdpStatus: GdpStatus
}

/** One figure from its candidate printed values: the one value, or why there is none. */
function standing(candidates: readonly { readonly value: string; readonly unit: string | null }[], unit: 'FRACTION' | 'RON') {
  if (candidates.length === 0) return { status: 'absent' as const, value: null }
  // A candidate in another (or no) unit is never read as this figure's unit.
  if (candidates.some((row) => row.unit !== unit)) return { status: 'unqualified' as const, value: null }
  const [first] = candidates
  if (!first || candidates.some((row) => compareDecimal(row.value, first.value) !== 0)) return { status: 'conflicting' as const, value: null }
  return { status: 'available' as const, value: canonicalDecimal(first.value) }
}

/**
 * The GDP figures of a year, each from its own source. Shares: the BGC's
 * printed share of the consolidated budget, matched to an item by its label
 * (shares carry no item). GDP: the denominator the BGC or the Sinteza prints
 * for exactly the view's year, in lei. A figure printed with different
 * values, or in a unit it cannot carry, is refused and said — never chosen by
 * row order, and never computed from the other figures.
 */
export function gdpOf({
  catalog,
  shares,
  denominators,
  year,
}: {
  readonly catalog: BudgetNationalCatalog
  readonly shares: readonly BudgetObservation[]
  readonly denominators: readonly BudgetObservation[]
  readonly year: number
}): GdpRead {
  const printed = (row: BudgetObservation) => row.disposition === 'FACT' && row.periodRole === 'CURRENT' && row.value !== null && isDecimalString(row.value)
  const byItem = new Map<string, { readonly value: string; readonly unit: string | null }[]>()
  for (const row of shares) {
    if (row.input !== 'BGC' || row.measure !== 'GDP_SHARE' || row.component !== 'general_consolidated_budget' || !printed(row)) continue
    const item = catalog.execution.seriesItems.find((entry) => entry.sourceLabel === row.lineItem && entry.section === row.section)
    if (!item) continue
    byItem.set(item.itemId, [...(byItem.get(item.itemId) ?? []), { value: row.value ?? '', unit: row.unit }])
  }
  const shareOf = new Map([...byItem].map(([itemId, rows]) => [itemId, standing(rows, 'FRACTION')]))
  const gdp = standing(
    denominators
      .filter(
        (row) =>
          (row.input === 'BGC' || row.input === 'SINTEZA') &&
          row.measure === 'GDP_DENOMINATOR' &&
          row.component === 'gdp' &&
          row.lineItem === 'pib' &&
          row.referenceYear === year &&
          printed(row),
      )
      .map((row) => ({ value: row.value ?? '', unit: row.unit })),
    'RON',
  )
  return {
    share: (itemId) => shareOf.get(itemId)?.value ?? null,
    shareStatus: (itemId) => shareOf.get(itemId)?.status ?? 'absent',
    gdp: gdp.value,
    gdpStatus: gdp.status,
  }
}

/** The budgets the release prints a column for, in the order the page lists them. */
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

// ─────────────────────────────────────────────────────────────────── ANAF ──

const ANAF_ROOT = 'national-budget-home-anaf'
const ANAF_STALE = 10 * 60_000
/** The principal authorities in one read: 55 in 2025. A longer list fails the read rather than being cut. */
const AUTHORITIES_LIMIT = 200

/** ANAF's state budget: sector 1, funding source 1, the principal authorities' aggregated reports, payments. */
export function anafFilter(view: YearView, extra: Partial<AnalyticsFilterType> = {}): AnalyticsFilterType {
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

/** An API amount (a float in this lane) as the two-decimal string the page sums and prints. */
const leiOf = (amount: number | string): string => Number(amount).toFixed(2)

export type AnafAuthority = { readonly cui: string; readonly name: string; readonly lei: string }

export function anafAuthoritiesOptions(view: YearView) {
  return queryOptions({
    queryKey: [ANAF_ROOT, 'authorities', view.year, view.month] as const,
    queryFn: async ({ signal }) => {
      const page = await fetchEntityAnalytics({ filter: anafFilter(view), sort: { by: 'amount', order: 'DESC' }, limit: AUTHORITIES_LIMIT, signal })
      // Every authority or none: a cut list would understate the state budget it is summed into, and inflate every share.
      if (page.pageInfo.hasNextPage || page.nodes.length < page.pageInfo.totalCount) throw new Error(`ANAF listed ${page.nodes.length} of ${page.pageInfo.totalCount} authorities`)
      return page.nodes.map((node): AnafAuthority => ({ cui: node.entity_cui, name: node.entity_name, lei: leiOf(node.amount) }))
    },
    staleTime: ANAF_STALE,
    retry: 1,
  })
}

export type AnafChapter = { readonly code: string; readonly lei: string }

/** Line items' amounts by functional chapter (the code's first two digits), summed on the exact decimals; the largest first. */
export function chaptersOf(nodes: readonly { readonly fn_c?: string | null; readonly amount: number | string }[]): readonly AnafChapter[] {
  const byChapter = new Map<string, string[]>()
  for (const node of nodes) {
    const code = String(node.fn_c ?? '').split('.')[0] ?? ''
    const list = byChapter.get(code) ?? []
    list.push(leiOf(node.amount))
    byChapter.set(code, list)
  }
  return [...byChapter]
    .map(([code, amounts]): AnafChapter => ({ code, lei: sumDecimals(amounts) ?? '0' }))
    .sort((a, b) => Number(b.lei) - Number(a.lei))
}

/** The state budget's payments by functional chapter, or one authority's. */
export function anafChaptersOptions(view: YearView, cui: string | null = null) {
  return queryOptions({
    queryKey: [ANAF_ROOT, 'chapters', view.year, view.month, cui] as const,
    queryFn: async ({ signal }) => {
      // The whole list or an error: the explorer's reader refuses a cut page.
      const page = await fetchCompleteAggregatedLineItems(anafFilter(view, cui ? { entity_cuis: [cui] } : {}), signal)
      return chaptersOf(page.nodes)
    },
    staleTime: ANAF_STALE,
    retry: 1,
  })
}

/** The total of a list of ANAF amounts, exactly. */
export const anafTotal = (rows: readonly { readonly lei: string }[]): string => sumDecimals(rows.map((row) => row.lei)) ?? '0'

// ──────────────────────────────────────────────────────────────── the law ──

/** The law of a year, as loaded: null for a year no law of the catalog answers (2026: still pending). */
export function lawEditionOf(catalog: BudgetNationalCatalog, year: number): BudgetApprovedEdition | null {
  return catalog.approved.editions.find((entry) => entry.budgetYear === year) ?? null
}
