/**
 * The national budget page's reads, as suspense queries: they run on the
 * server and reach the browser through the router's query integration, so
 * the document carries its numbers. Each band reads on its own; the page
 * starts every read of its year at once (`useHomePrefetch`), so no band
 * waits on a read before its own. Each read's options are one function, so
 * the prefetch and the band share a key.
 */
import { isServer, queryOptions, usePrefetchQuery, useQueryClient, useSuspenseQueries, useSuspenseQuery, type QueryClient } from '@tanstack/react-query'

import { NationalBudgetApiError, fetchApprovedRecords, isRetryable } from '@/features/national-budget/analytics/api/national-budget-api'
import {
  approvedRecordsOptions,
  approvedTotalsOptions,
  executionGridOptions,
  nationalCatalogKey,
  nationalCatalogOptions,
  observationsOptions,
  useNationalCatalog,
} from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { cellsOf, type Cell } from '@/features/national-budget/analytics/lib/analytics-data'
import { lastCompleteYear } from '@/features/national-budget/analytics/lib/analytics-view'
import { yearOf } from '@/features/national-budget/analytics/lib/series'
import type { BudgetApprovedEdition, BudgetNationalCatalog } from '@/schemas/national-budget-api'
import {
  ANAF_FIRST_YEAR,
  REVENUE_PARTS,
  SPENDING_PARTS,
  TOTAL_ITEMS,
  anafAuthoritiesOptions,
  anafChaptersOptions,
  gdpOf,
  lawEditionOf,
  previousView,
  type YearView,
} from '../lib/home-data'
import { lawChaptersOf, lawDeficitInput, planTotalsInput, previousEdition } from '../lib/home-law'

const TOTALS = [TOTAL_ITEMS.revenue, TOTAL_ITEMS.spending, TOTAL_ITEMS.balance]

/** The lines the page reads for a year: the three totals (head, figures), spending and revenue with their parts (their bands). */
export const LINE_SETS = {
  totals: TOTALS,
  spending: [TOTAL_ITEMS.spending, ...SPENDING_PARTS],
  revenue: [TOTAL_ITEMS.revenue, ...REVENUE_PARTS],
} as const

// ───────────────────────────────────────────────────────────── options ──

function totalsHistoryOptions(client: QueryClient, catalog: BudgetNationalCatalog) {
  const coverage = catalog.execution.coverage
  return [
    executionGridOptions(client, catalog.snapshots.execution, {
      itemIds: TOTALS,
      basis: 'FULL_YEAR',
      period: { type: 'YEAR', interval: { start: coverage.firstMonth.slice(0, 4), end: String(lastCompleteYear(coverage)) } },
    }),
    // The year in progress against the one before, from 1 January.
    executionGridOptions(client, catalog.snapshots.execution, {
      itemIds: TOTALS,
      basis: 'YTD',
      period: { type: 'MONTH', interval: { start: `${yearOf(coverage.lastMonth) - 1}-01`, end: coverage.lastMonth } },
    }),
  ] as const
}

function yearLinesOptions(client: QueryClient, catalog: BudgetNationalCatalog, view: YearView, itemIds: readonly string[]) {
  return executionGridOptions(client, catalog.snapshots.execution, { itemIds, basis: view.basis, period: { type: view.type, dates: [view.previous, view.label] } })
}

function gdpOptions(client: QueryClient, catalog: BudgetNationalCatalog, view: YearView) {
  // The three totals' shares and the GDP they divide by (its row is „pib"): not the release's fifty share rows.
  return observationsOptions(client, catalog.snapshots.execution, {
    months: [view.month],
    measures: ['GDP_SHARE', 'GDP_DENOMINATOR'],
    lineItems: ['venituri totale', 'cheltuieli totale', 'excedent(+) / deficit(-)', 'pib'],
  })
}

function budgetColumnsOptions(client: QueryClient, catalog: BudgetNationalCatalog, view: YearView) {
  return observationsOptions(client, catalog.snapshots.execution, {
    months: [view.month],
    lineItems: ['venituri totale', 'cheltuieli totale'],
    sections: ['REVENUE', 'EXPENDITURE'],
    measures: ['AMOUNT'],
  })
}

/**
 * The state budget's approved chapters in one law, and its 5001 total: read
 * from the synthesis' credit rows and kept as the chapters only, so the cache
 * — and the document the server sends — holds some twenty chapters, not the
 * law's rows. A lane that moved under the read sends the catalog to be read
 * again, as the analysis page's reads do.
 */
export function lawChaptersOptions(client: QueryClient, snapshot: string, edition: BudgetApprovedEdition) {
  return queryOptions({
    queryKey: ['national-budget-home', 'law-chapters', snapshot, edition.id] as const,
    queryFn: ({ signal }) =>
      fetchApprovedRecords({ editionId: edition.id, form: 'STATE_BUDGET_SYNTHESIS', rowRoles: ['CREDIT'], creditTypes: ['BUDGET_CREDITS'] }, snapshot, signal)
        .then(({ rows, truncated }) => {
          // A cut list would make the chapters it never reached part of „the rest": not shown at all, then.
          if (truncated) throw new NationalBudgetApiError('malformed', `The ${edition.budgetYear} law's records were cut short`)
          return lawChaptersOf(rows, edition.budgetYear)
        })
        .catch((error: unknown) => {
          if (error instanceof NationalBudgetApiError && error.kind === 'snapshot_changed') void client.invalidateQueries({ queryKey: nationalCatalogKey })
          throw error
        }),
    staleTime: 5 * 60_000,
    retry: (count, error) => count < 1 && isRetryable(error),
  })
}

// ──────────────────────────────────────────────────────────── the reads ──

/** Every year the bulletins finish, then the two last years month by month: the three totals. One key for the page's time bands. */
export function useTotalsHistory() {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const [{ data: years }, { data: months }] = useSuspenseQueries({ queries: totalsHistoryOptions(client, catalog) })
  const yearCells = new Map(years.results.map((result) => [result.item.itemId, cellsOf(result)]))
  const monthCells = new Map(months.results.map((result) => [result.item.itemId, cellsOf(result)]))
  return { yearCells, monthCells, complete: lastCompleteYear(catalog.execution.coverage), lastMonth: catalog.execution.coverage.lastMonth }
}

/**
 * The full years the bulletins don't answer, each with the server's reason
 * (2008: no December release; 2011, 2013: a release covering another period):
 * the year menus list them but don't offer them. The same read as the years
 * of `useTotalsHistory`.
 */
export function useUnfinishedYears(views: readonly YearView[]): ReadonlyMap<number, string | null> {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const [years] = totalsHistoryOptions(client, catalog)
  // Its own key over the years' read (shared through the cache, one request): it never fails. If the years can't be
  // read, the menus offer every year — on the server too, where an error boundary can't catch it — and the page stands.
  const { data } = useSuspenseQuery({
    queryKey: ['national-budget-home', 'unfinished-years', catalog.snapshots.execution] as const,
    queryFn: () =>
      client
        .fetchQuery(years)
        .then((grid): readonly (readonly [string, string | null])[] => {
          const cells = cellsOf(grid.results.find((result) => result.item.itemId === TOTAL_ITEMS.spending))
          return [...cells].filter(([, cell]) => !cell.exact).map(([label, cell]) => [label, cell.reason] as const)
        })
        .catch(() => []),
    staleTime: 5 * 60_000,
  })
  const unfinished = new Map(data)
  return new Map(views.filter((view) => !view.partial && unfinished.has(String(view.year))).map((view) => [view.year, unfinished.get(String(view.year)) ?? null]))
}

/** Some lines for the year and the same window a year earlier. */
export function useYearLines(view: YearView, itemIds: readonly string[]) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(yearLinesOptions(client, catalog, view, itemIds))
  const cells = new Map(data.results.map((result) => [result.item.itemId, cellsOf(result)]))
  return {
    now: (itemId: string): Cell | null => cells.get(itemId)?.get(view.label) ?? null,
    before: (itemId: string): Cell | null => cells.get(itemId)?.get(view.previous) ?? null,
  }
}

/** The GDP shares the year's release prints for the consolidated budget, and the GDP it divides by. */
export function useGdp(view: YearView) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(gdpOptions(client, catalog, view))
  return gdpOf(catalog, data.rows)
}

/** The year's release: each budget's printed column for the revenue and spending totals. */
export function useBudgetColumns(view: YearView) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const { data } = useSuspenseQuery(budgetColumnsOptions(client, catalog, view))
  const value = (component: string, section: 'REVENUE' | 'EXPENDITURE') => data.rows.find((row) => row.component === component && row.section === section)?.value ?? null
  return { value, printed: data.rows.length > 0 }
}

/** Whether ANAF covers the same window a year earlier: its reports start in 2016, so 2016 has nothing to compare with. */
export const comparableWithAnaf = (view: YearView): boolean => view.year - 1 >= ANAF_FIRST_YEAR

/** The principal authorities' payments for the year, and for the same window a year earlier (null when ANAF has none). */
export function useAnafAuthorities(view: YearView) {
  const compared = comparableWithAnaf(view)
  const results = useSuspenseQueries({ queries: [anafAuthoritiesOptions(view), ...(compared ? [anafAuthoritiesOptions(previousView(view))] : [])] })
  return { now: results[0]!.data, before: compared ? (results[1]?.data ?? null) : null }
}

/** The state budget's payments by chapter for the year, and for the same window a year earlier (null when ANAF has none). */
export function useAnafChapterYears(view: YearView) {
  const compared = comparableWithAnaf(view)
  const results = useSuspenseQueries({ queries: [anafChaptersOptions(view), ...(compared ? [anafChaptersOptions(previousView(view))] : [])] })
  return { now: results[0]!.data, before: compared ? (results[1]?.data ?? null) : null }
}

export function useAnafChapters(view: YearView, cui: string | null = null) {
  return useSuspenseQuery(anafChaptersOptions(view, cui)).data
}

/** The approved chapters of a law and of the one before it (by chapter code), read together; without a law the year before, the second is none. */
export function useLawChapters(edition: BudgetApprovedEdition, previous: BudgetApprovedEdition | null) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const results = useSuspenseQueries({
    queries: [lawChaptersOptions(client, catalog.snapshots.approved, edition), ...(previous ? [lawChaptersOptions(client, catalog.snapshots.approved, previous)] : [])],
  })
  return { now: results[0]!.data, before: previous ? (results[1]?.data ?? null) : null }
}

// ──────────────────────────────────────────────────────────── prefetch ──

/** One of two reads of different data, as the prefetch takes it: it only starts the read, so the data's type is not its concern. */
const either = (options: object) => options as Parameters<typeof usePrefetchQuery>[0]

/**
 * Every read of the year's view, started at once when the page renders —
 * on the server and on a change of year — so that a band whose reads run
 * one after another (a law's totals, then its deficit, then its chapters)
 * finds them in flight. A source a year doesn't reach (ANAF before 2016, a
 * law not loaded) prefetches the catalog in its place: the hooks stay the
 * same in number and order.
 */
export function useHomePrefetch(view: YearView) {
  const catalog = useNationalCatalog()
  const client = useQueryClient()
  const [years, months] = totalsHistoryOptions(client, catalog)
  usePrefetchQuery(years)
  usePrefetchQuery(months)
  usePrefetchQuery(yearLinesOptions(client, catalog, view, LINE_SETS.totals))
  usePrefetchQuery(yearLinesOptions(client, catalog, view, LINE_SETS.spending))
  usePrefetchQuery(yearLinesOptions(client, catalog, view, LINE_SETS.revenue))
  usePrefetchQuery(gdpOptions(client, catalog, view))
  usePrefetchQuery(budgetColumnsOptions(client, catalog, view))
  const anaf = view.year >= ANAF_FIRST_YEAR
  const fallback = nationalCatalogOptions()
  usePrefetchQuery(either(anaf ? anafAuthoritiesOptions(view) : fallback))
  const compared = anaf && comparableWithAnaf(view)
  usePrefetchQuery(either(compared ? anafAuthoritiesOptions(previousView(view)) : fallback))
  usePrefetchQuery(either(anaf ? anafChaptersOptions(view) : fallback))
  usePrefetchQuery(either(compared ? anafChaptersOptions(previousView(view)) : fallback))
  const edition = lawEditionOf(catalog, view.year)
  const previous = edition ? previousEdition(catalog.approved.editions, edition) : null
  usePrefetchQuery(either(edition ? approvedTotalsOptions(client, catalog.snapshots.approved, planTotalsInput(edition, previous)) : fallback))
  usePrefetchQuery(either(edition ? approvedRecordsOptions(client, catalog.snapshots.approved, lawDeficitInput(edition)) : fallback))
  // The law's chapters are read in the browser only (their rows come in pages, some 5 s): the server's document doesn't wait for them.
  const chapters = edition && !isServer
  usePrefetchQuery(either(chapters ? lawChaptersOptions(client, catalog.snapshots.approved, edition) : fallback))
  usePrefetchQuery(either(chapters && previous ? lawChaptersOptions(client, catalog.snapshots.approved, previous) : fallback))
}
