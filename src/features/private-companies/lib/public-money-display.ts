/**
 * Naming for the flows that carried public money to a company.
 *
 * The umbrella term "public money" is deliberately not used in the UI: a direct
 * acquisition, a procurement contract and a PNRR commitment are different
 * instruments with different meanings, and collapsing them into one label tells
 * a reader less than naming each one does.
 *
 * `flowType` is a CLOSED set of six in the server kernel. `FLOW_META` is
 * declared `satisfies Record<MoneyFlowType, FlowMeta>`, so adding a seventh on
 * the server fails typecheck here rather than leaking a raw database key into
 * the page as a row's primary label.
 */
import { plural, t } from '@lingui/core/macro'
import type {
  PrivateCompanyMoneyFlow,
  PrivateCompanyMoneyYear,
} from '@/schemas/private-company'

export const MONEY_FLOW_TYPES = [
  'direct_acquisition',
  'procurement_contract',
  'pnrr_payment',
  'pnrr_commitment',
  'pnrr_subcontract',
  'budget_execution',
] as const

export type MoneyFlowType = (typeof MONEY_FLOW_TYPES)[number]

type FlowMeta = {
  /**
   * False when the amount is an obligation rather than money received. The PNRR
   * spec is explicit that a commitment must never be summed with payments, so
   * these are never shown as receipts.
   */
  readonly isReceipt: boolean
}

const FLOW_META = {
  direct_acquisition: { isReceipt: true },
  procurement_contract: { isReceipt: true },
  pnrr_payment: { isReceipt: true },
  pnrr_subcontract: { isReceipt: true },
  budget_execution: { isReceipt: true },
  /** An obligation entered into, not money paid out. */
  pnrr_commitment: { isReceipt: false },
} satisfies Record<MoneyFlowType, FlowMeta>

function isKnownFlowType(flowType: string): flowType is MoneyFlowType {
  return flowType in FLOW_META
}

export function isReceiptFlow(flowType: string): boolean {
  return isKnownFlowType(flowType) ? FLOW_META[flowType].isReceipt : false
}

/** Labels resolve at call time so a locale switch re-renders them. */
export function getMoneyFlowLabel(flowType: string): string {
  switch (flowType) {
    case 'direct_acquisition':
      return t`Direct acquisitions`
    case 'procurement_contract':
      return t`Public procurement contracts`
    case 'pnrr_payment':
      return t`PNRR payments`
    case 'pnrr_commitment':
      return t`PNRR commitments`
    case 'pnrr_subcontract':
      return t`PNRR subcontracts`
    case 'budget_execution':
      return t`Budget execution`
    default:
      return t`Other public flows`
  }
}

/**
 * What one record of this flow actually counts. A procurement contract row is
 * an award and a subcontract row is one acquisition — neither is a payment, so
 * a single "N payments" noun would misdescribe most rows.
 */
export function getMoneyFlowCountLabel(flowType: string, count: number): string {
  switch (flowType) {
    case 'direct_acquisition':
      return plural(count, { one: '# purchase', few: '# purchases', other: '# purchases' })
    case 'procurement_contract':
      return plural(count, { one: '# contract', few: '# contracts', other: '# contracts' })
    case 'pnrr_payment':
      return plural(count, { one: '# payment', few: '# payments', other: '# payments' })
    case 'pnrr_commitment':
      return plural(count, { one: '# commitment', few: '# commitments', other: '# commitments' })
    case 'pnrr_subcontract':
      return plural(count, { one: '# subcontract', few: '# subcontracts', other: '# subcontracts' })
    default:
      return plural(count, { one: '# record', few: '# records', other: '# records' })
  }
}

/**
 * Value-descending, with unknown totals last — a row whose amount we could not
 * read must not sort as if it were zero.
 */
export function sortMoneyFlows(
  flows: readonly PrivateCompanyMoneyFlow[],
): PrivateCompanyMoneyFlow[] {
  return [...flows].sort((a, b) => {
    if (a.totalRon === null) return b.totalRon === null ? 0 : 1
    if (b.totalRon === null) return -1
    if (b.totalRon !== a.totalRon) return b.totalRon - a.totalRon
    return indexOfFlow(a.flowType) - indexOfFlow(b.flowType)
  })
}

function indexOfFlow(flowType: string): number {
  const index = (MONEY_FLOW_TYPES as readonly string[]).indexOf(flowType)
  return index === -1 ? MONEY_FLOW_TYPES.length : index
}

/**
 * When a flow's money actually happened, and where that answer is incomplete.
 *
 * A bare "2007–2025" makes two claims a min/max cannot support: that records
 * exist throughout, and that the interval covers all the money. Neither holds
 * here — some years inside a range carry no records at all, and some flows have
 * no year recorded in the source, so their amount sits outside every interval.
 */
export type MoneyFlowCoverage = {
  readonly firstYear: number | null
  readonly lastYear: number | null
  /** Years inside the interval with no records — the interval is not continuous. */
  readonly missingYears: readonly number[]
  /** Amount the source never dated, and so belongs to no year in the interval. */
  readonly undatedRon: number
  readonly undatedCount: number
}

export function getMoneyFlowCoverage(
  byYear: readonly PrivateCompanyMoneyYear[],
  flowType: string,
): MoneyFlowCoverage {
  const rows = byYear.filter((row) => row.flowType === flowType)
  const years = rows
    .map((row) => row.year)
    .filter((year): year is number => year !== null)
    .sort((a, b) => a - b)

  const undated = rows.filter((row) => row.year === null)
  const firstYear = years[0] ?? null
  const lastYear = years[years.length - 1] ?? null

  const present = new Set(years)
  const missingYears: number[] = []
  if (firstYear !== null && lastYear !== null) {
    for (let year = firstYear; year <= lastYear; year += 1) {
      if (!present.has(year)) missingYears.push(year)
    }
  }

  return {
    firstYear,
    lastYear,
    missingYears,
    undatedRon: undated.reduce((sum, row) => sum + (row.totalRon ?? 0), 0),
    undatedCount: undated.reduce((sum, row) => sum + row.count, 0),
  }
}
