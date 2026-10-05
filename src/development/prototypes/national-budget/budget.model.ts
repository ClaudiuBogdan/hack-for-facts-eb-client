/**
 * What the hub and the analysis page compute from the adapter's answers. Pure,
 * and only within one source: a bulletin's line over the same bulletin's
 * total, an ANAF row over the same ANAF total, a law's value as printed.
 * Nothing here adds rows of a law form or mixes a law with a bulletin.
 */
import { approvedAmountToLei, executionAmountToLei, executionShareToPercent } from '@/features/national-budget/page/model/amounts'
import { cutRows, executionHeadline, hasChildren, type ExecutionSection } from '@/features/national-budget/page/model/execution-lines'
import type { AnafStateBudget, ApprovedTotalCell, ExecutionFact, ExecutionRelease } from '@/schemas/national-budget-page'
import { COMPONENT_OF, type BudgetScope } from './budget.format'

export type LineRow = {
  readonly lineItem: string
  /** Null: the bulletin prints the line with its value cell blank (never zero). */
  readonly lei: number | null
  /** Of the section's total in the same release. */
  readonly share: number | null
  readonly gdpPercent: number | null
  readonly opens: boolean
  /** The amount's fact, or the GDP share's when the amount is blank. */
  readonly fact: ExecutionFact
}

/** A bulletin's lines at one depth (or under one line), largest first, a negative line last; each with its share of the section's total. */
export function lineRows(
  release: ExecutionRelease,
  { scope, section, depth, under = null }: { readonly scope: BudgetScope; readonly section: ExecutionSection; readonly depth: number; readonly under?: string | null },
): readonly LineRow[] {
  const component = COMPONENT_OF[scope]
  const total = executionHeadline(release.facts, { component, section })?.amount
  const totalLei = total ? executionAmountToLei(total.value) : null
  return cutRows(release.facts, { component, section, depth, under })
    .flatMap((row) => {
      const fact = row.amount ?? row.gdpShare
      if (!fact) return []
      const lei = row.amount ? executionAmountToLei(row.amount.value) : null
      return [
        {
          lineItem: row.lineItem,
          lei,
          share: totalLei && lei !== null && lei >= 0 ? lei / totalLei : null,
          gdpPercent: row.gdpShare ? executionShareToPercent(row.gdpShare.value) : null,
          opens: hasChildren(section, row.lineItem),
          fact,
        },
      ]
    })
    // Largest first; a negative line, then a blank one, last.
    .sort((a, b) => rank(b) - rank(a))
}

/** The order's key: the value; a negative below every positive; a blank below everything (finite, so two compare to 0). */
function rank(row: LineRow): number {
  if (row.lei === null) return -2e18
  return row.lei < 0 ? -1e18 + row.lei : row.lei
}

export type Headline = { readonly lei: number; readonly gdpPercent: number | null; readonly fact: ExecutionFact } | null

export function headlineOf(release: ExecutionRelease, scope: BudgetScope, section: ExecutionSection): Headline {
  const row = executionHeadline(release.facts, { component: COMPONENT_OF[scope], section })
  if (!row?.amount) return null
  return { lei: executionAmountToLei(row.amount.value), gdpPercent: row.gdpShare ? executionShareToPercent(row.gdpShare.value) : null, fact: row.amount }
}

/** A law total's lei, from its printed thousands; null when the cell is missing. */
export function cellLei(cell: ApprovedTotalCell | undefined): number | null {
  if (!cell || cell.status !== 'ok') return null
  return approvedAmountToLei(cell.origin === 'real_sample' ? cell.line.amountThousandLei : cell.amountThousandLei)
}

export type AuthorityRanking = {
  readonly year: number
  readonly throughMonth: string
  readonly total: number
  readonly rows: readonly { readonly cui: string; readonly name: string; readonly lei: number; readonly share: number }[]
}

/** One year of the ANAF ranking, each row's share of the same year's ANAF total. */
export function anafRanking(anaf: AnafStateBudget, year: number): AuthorityRanking | null {
  const entry = anaf.authorities[String(year)]
  const point = anaf.years.find((item) => item.year === year)
  if (!entry || !point) return null
  const total = Number(point.lei)
  return {
    year,
    throughMonth: entry.throughMonth,
    total,
    rows: entry.rows.map((row) => ({ cui: row.cui, name: row.name, lei: Number(row.lei), share: total > 0 ? Number(row.lei) / total : 0 })),
  }
}

/** The top `count` rows' share of the total: concentration, not a ranking of value. */
export function topShare(ranking: AuthorityRanking, count: number): number {
  return ranking.rows.slice(0, count).reduce((acc, row) => acc + row.share, 0)
}
