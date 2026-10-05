/**
 * One budget's printed column (the state budget, the local budgets, …). The
 * national series are the consolidated budget's only, so a budget is read
 * from its column in each release: a figure from 1 January, in the workbook
 * releases only (2019 on; until 2023 some months are PDFs, December 2023
 * among them). A year is its December release; a quarter or a month alone
 * would be a difference the server has not audited, so there is none
 * (server ask 11).
 */
import { useQueryClient, useSuspenseQueries, type QueryClient } from '@tanstack/react-query'

import { observationsOptions } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { focusOf, itemsOf, type Cell, type Population } from '@/features/national-budget/analytics/lib/analytics-data'
import type { AdvancedState, BudgetKey } from '@/features/national-budget/analytics/lib/analytics-state'
import { SECTION_OF, lastCompleteYear, type ExecPeriod } from '@/features/national-budget/analytics/lib/analytics-view'
import { plotOf } from '@/features/national-budget/analytics/lib/exact'
import { periodsBetween, shiftYears, yearOf, type PeriodLabel } from '@/features/national-budget/analytics/lib/series'
import type { BudgetNationalCatalog, BudgetObservation } from '@/schemas/national-budget-api'

/** The column every workbook release prints next to the budgets: its presence tells a blank cell from a release with no budget columns. */
export const ALL_BUDGETS = 'budget_total_before_transfers'

/** The releases a budget's history reads: every December (a year), or the last 36 months, from 1 January. */
export type BudgetWindow = {
  readonly months: readonly string[]
  readonly labelOf: (month: string) => PeriodLabel
  readonly type: 'YEAR' | 'MONTH'
  readonly basis: 'FULL_YEAR' | 'YTD'
}

export function budgetWindow(catalog: BudgetNationalCatalog, pas: 'an' | 'luna'): BudgetWindow {
  const coverage = catalog.execution.coverage
  if (pas === 'an') {
    const months: string[] = []
    for (let year = yearOf(coverage.firstMonth); year <= lastCompleteYear(coverage); year += 1) months.push(`${year}-12`)
    return { months, labelOf: (month) => month.slice(0, 4), type: 'YEAR', basis: 'FULL_YEAR' }
  }
  const last = coverage.lastMonth
  return { months: periodsBetween('MONTH', `${yearOf(last) - 3}-01`, last).slice(-36), labelOf: (month) => month, type: 'MONTH', basis: 'YTD' }
}

/** A population's lines as the release prints them: what a budget's observations are read and matched by. */
export function printedLines(catalog: BudgetNationalCatalog, tip: Population) {
  const itemIds = new Set(itemsOf(catalog, tip))
  const items = catalog.execution.seriesItems.filter((item) => itemIds.has(item.itemId))
  return { items, lineItems: items.map((item) => item.sourceLabel), sections: tip === 'sold' ? null : [SECTION_OF[tip]] }
}

/** One budget's column for a population's lines, in some releases. */
export function budgetLinesOptions(client: QueryClient, catalog: BudgetNationalCatalog, tip: Population, component: BudgetKey, months: readonly string[]) {
  const { lineItems, sections } = printedLines(catalog, tip)
  return observationsOptions(client, catalog.snapshots.execution, { months, components: [component], lineItems, ...(sections ? { sections } : {}), measures: ['AMOUNT'] })
}

export type BudgetCell = Cell & { readonly row: BudgetObservation | null }

/** The releases from the first that prints this budget's column: the PDF years before it stay out of the window. */
export function printedFrom(months: readonly string[], rows: readonly BudgetObservation[]): readonly string[] {
  const printed = new Set(rows.map((row) => row.month))
  const first = months.findIndex((month) => printed.has(month))
  return first < 0 ? [] : months.slice(first)
}

/**
 * One budget's lines by period, matched to the catalog by printed label and
 * section. A period without a value says why: no release, a release without
 * this budget's column (a PDF year), or a blank cell.
 */
export function budgetCells(
  catalog: BudgetNationalCatalog,
  tip: Population,
  rows: readonly BudgetObservation[],
  months: readonly string[],
  labelOfMonth: (month: string) => PeriodLabel,
): ReadonlyMap<string, ReadonlyMap<string, BudgetCell>> {
  const coverage = catalog.execution.coverage
  const missing = new Set(coverage.missingMonths)
  const printed = new Set(rows.map((row) => row.month))
  const byKey = new Map(rows.map((row) => [`${row.month}|${row.section}|${row.lineItem}`, row]))
  return new Map(
    printedLines(catalog, tip).items.map((item) => [
      item.itemId,
      new Map(
        months.map((month) => {
          const row = byKey.get(`${month}|${item.section}|${item.sourceLabel}`) ?? null
          const exact = row?.value ?? null
          const reason = exact
            ? null
            : missing.has(month)
              ? 'missing_endpoint_release'
              : month > coverage.lastMonth
                ? 'after_last_release'
                : printed.has(month)
                  ? 'blank_in_source'
                  : 'no_budget_columns'
          return [labelOfMonth(month), { value: plotOf(exact), exact, reason, start: row?.reportPeriod?.start ?? '', end: row?.reportPeriod?.end ?? '', row }] as const
        }),
      ),
    ]),
  )
}

/** The figures of one budget: its line now and a year earlier, its share of all budgets, its largest line. */
export function useBudgetFigures(state: AdvancedState, catalog: BudgetNationalCatalog, period: ExecPeriod) {
  const tip = state.tip as Population
  const component = state.buget!
  const client = useQueryClient()
  const month = period.releaseMonth
  const previous = shiftYears(month, -1)
  const focus = focusOf({ ...state, rand: null }, catalog, tip)
  const root = catalog.execution.seriesItems.find((item) => item.itemId === focus)
  const rootLabel = root?.sourceLabel ?? ''
  const rootSection = root?.section ?? (tip === 'sold' ? 'BALANCE' : SECTION_OF[tip])
  const [{ data: lines }, { data: all }] = useSuspenseQueries({
    queries: [
      budgetLinesOptions(client, catalog, tip, component, [previous, month]),
      observationsOptions(client, catalog.snapshots.execution, { months: [month], components: [ALL_BUDGETS], lineItems: [rootLabel], sections: [rootSection], measures: ['AMOUNT'] }),
    ],
  })
  const cells = budgetCells(catalog, tip, lines.rows, [previous, month], (item) => item)
  return {
    focus,
    now: cells.get(focus)?.get(month) ?? null,
    before: cells.get(focus)?.get(previous) ?? null,
    allBudgets: all.rows.find((row) => row.section === rootSection)?.value ?? null,
    at: (itemId: string) => cells.get(itemId)?.get(month) ?? null,
  }
}
