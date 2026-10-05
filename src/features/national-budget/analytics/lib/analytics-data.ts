/**
 * The page's reads over the API's answers, kept apart from what draws them:
 * a series' periods as cells, the items a population reads, the inputs of the
 * grid reads, the line a view follows, a release's GDP shares, a chart's
 * points, the largest line's share; the law's edition and credits. Nothing is
 * summed: a value is the server's audited series or a printed observation.
 */
import type { ExecutionGridInput } from '@/features/national-budget/analytics/api/national-budget-api'
import type { BudgetApprovedEdition, BudgetCreditType, BudgetNationalCatalog, BudgetNationalSeries, BudgetObservation, BudgetSection, BudgetSeriesBasis } from '@/schemas/national-budget-api'
import { itemOfRand, type AdvancedState } from './analytics-state'
import { SECTION_OF, itemLabel, lastCompleteYear, periodText, reasonText } from './analytics-view'
import { plotOf } from './exact'
import { SECTION_ROOT, cutLines } from './lines'
import { lastWholeQuarter, periodsBetween, toAnalyticsSeries, yearOf, type PeriodLabel } from './series'

/** The bulletins' populations. */
export type Population = 'cheltuieli' | 'venituri' | 'sold'

/** One period of a chart: its label, the plotting coordinate, the exact amount, why there is none. */
export type BarPoint = {
  readonly label: string
  /** The plotting coordinate; null for a gap. */
  readonly value: number | null
  readonly exact: string | null
  /** Why there is no value: shown for a gap. */
  readonly gap?: string
  /** What the full label says: „ianuarie–iulie 2026". */
  readonly title: string
}

/** One period of one item: the plotted value, the exact one, why there is none. */
export type Cell = {
  readonly value: number | null
  readonly exact: string | null
  readonly reason: string | null
  readonly start: string
  readonly end: string
}

/** A series' periods by label, through the chart contract: a value only where the period vouches for it. */
export function cellsOf(result: BudgetNationalSeries | undefined): ReadonlyMap<string, Cell> {
  if (!result) return new Map()
  const series = toAnalyticsSeries(result.item.itemId, result)
  return new Map(
    result.periods.map((period) => {
      const exact = series.pointDetails[period.date]?.exact ?? null
      return [period.date, { value: plotOf(exact), exact, reason: period.reason, start: period.periodStart, end: period.periodEnd }] as const
    }),
  )
}

export const BALANCE_ITEMS = ['mfin.bgc.revenue.total', 'mfin.bgc.expenditure.total', 'mfin.bgc.balance.surplus_deficit'] as const

/** The items a population reads: a section's lines, or for the balance its three headline lines. */
export function itemsOf(catalog: BudgetNationalCatalog, tip: Population): readonly string[] {
  if (tip === 'sold') return BALANCE_ITEMS
  const section = SECTION_OF[tip]
  return catalog.execution.seriesItems.filter((item) => item.section === section).map((item) => item.itemId)
}

/** Every full year the bulletins finish, 2006 on: one key, so the table's years, the time tab and the years band share one read. */
export function yearsInput(catalog: BudgetNationalCatalog, itemIds: readonly string[]): ExecutionGridInput {
  return { itemIds, basis: 'FULL_YEAR', period: { type: 'YEAR', interval: { start: catalog.execution.coverage.firstMonth.slice(0, 4), end: String(lastCompleteYear(catalog.execution.coverage)) } } }
}

/** The time tab's window: every year; the last eight years by quarter; the last 36 months. */
export function windowInput(catalog: BudgetNationalCatalog, itemIds: readonly string[], state: Pick<AdvancedState, 'pas' | 'cumulat'>): ExecutionGridInput {
  const last = catalog.execution.coverage.lastMonth
  if (state.pas === 'an') return yearsInput(catalog, itemIds)
  if (state.pas === 'trimestru') return { itemIds, basis: 'PERIOD_DIFFERENCE', period: { type: 'QUARTER', interval: { start: `${yearOf(last) - 7}-Q1`, end: lastWholeQuarter(last) } } }
  const months = periodsBetween('MONTH', `${yearOf(last) - 3}-01`, last).slice(-36)
  return { itemIds, basis: state.cumulat ? 'YTD' : 'PERIOD_DIFFERENCE', period: { type: 'MONTH', interval: { start: months[0]!, end: last } } }
}

export function focusOf(state: AdvancedState, catalog: BudgetNationalCatalog, tip: Population): string {
  if (tip === 'sold') return 'mfin.bgc.balance.surplus_deficit'
  const item = itemOfRand(state.rand)
  const section = SECTION_OF[tip]
  return item && catalog.execution.seriesItems.some((entry) => entry.itemId === item && entry.section === section) ? item : SECTION_ROOT[section]
}

/**
 * The GDP shares a release prints, by item. A share observation carries no
 * catalog item (only the amounts map to one), so it is matched by its line's
 * source label, within the section the read asked for.
 */
export function gdpShares(catalog: BudgetNationalCatalog, rows: readonly BudgetObservation[]): ReadonlyMap<string, number> {
  const out = new Map<string, number>()
  for (const row of rows) {
    const item = catalog.execution.seriesItems.find((entry) => entry.sourceLabel === row.lineItem && entry.section === row.section)
    const value = plotOf(row.value)
    if (item && value !== null && row.measure === 'GDP_SHARE') out.set(item.itemId, value)
  }
  return out
}

export function labelOf(catalog: BudgetNationalCatalog, itemId: string): string {
  return itemLabel(catalog.execution.seriesItems.find((item) => item.itemId === itemId)?.sourceLabel, itemId)
}

export function pointsOf(cells: ReadonlyMap<string, Cell>, dates: readonly string[], basis: BudgetSeriesBasis): readonly BarPoint[] {
  return dates.map((date) => {
    const cell = cells.get(date)
    return { label: date, value: cell?.value ?? null, exact: cell?.exact ?? null, gap: cell?.exact ? undefined : reasonText(cell?.reason ?? null), title: periodText(date, basis) }
  })
}

/** A share for the figures: the largest row of the default cut, against the section's total. */
export function largestShare(grid: { readonly results: readonly BudgetNationalSeries[] }, section: Exclude<BudgetSection, 'BALANCE'>, itemIds: readonly string[], label: PeriodLabel, depth: number) {
  const cells = new Map(grid.results.map((result) => [result.item.itemId, cellsOf(result).get(label)]))
  const present = new Set(itemIds.filter((itemId) => cells.get(itemId)?.exact))
  const rows = cutLines({ section, sectionItems: itemIds, present, depth })
  const total = cells.get(SECTION_ROOT[section])?.exact ?? null
  const top = rows.map((itemId) => ({ itemId, value: cells.get(itemId)?.value ?? null, exact: cells.get(itemId)?.exact ?? null })).sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))[0]
  return top && top.value !== null && top.exact !== null && total ? { itemId: top.itemId, value: top.value, exact: top.exact, total } : null
}

export const creditTypeOf = (state: Pick<AdvancedState, 'credite'>): BudgetCreditType => (state.credite === 'angajament' ? 'COMMITMENT_CREDITS' : 'BUDGET_CREDITS')

export function editionOf(catalog: BudgetNationalCatalog, year: number | null): BudgetApprovedEdition | null {
  const editions = [...catalog.approved.editions].sort((a, b) => b.budgetYear - a.budgetYear)
  return editions.find((edition) => edition.budgetYear === year) ?? editions[0] ?? null
}
