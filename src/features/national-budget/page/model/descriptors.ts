import type {
  ApprovedFund,
  ApprovedLine,
  ApprovedTotalCell,
  CreditType,
} from '@/schemas/national-budget-page'

/**
 * Which printed row is a budget's total. Law forms print totals, subtotals and
 * details side by side, so a total is read from one explicit descriptor and
 * never by adding rows. A proposal for the server's selection, mirrored here.
 *
 * - Revenue: the synthesis's first record, `VENITURI - TOTAL`.
 * - Expenditure: the credit rows of the expenditure total. The state budget
 *   prints it under capitol 5001 „CHELTUIELI - BUGET DE STAT"; the social
 *   insurance, health and unemployment budgets under 5000 „TOTAL GENERAL".
 *   (Health also prints 5005 „CHELTUIELI - TOTAL", a few million apart; one
 *   descriptor is chosen and named, the other is not added to it.)
 */
export const TOTAL_DESCRIPTORS: Readonly<
  Record<ApprovedFund, { readonly synthesisForm: ApprovedLine['form']; readonly capitol: string; readonly contextLabel: string }>
> = {
  state_budget: { synthesisForm: 'state_budget_synthesis', capitol: '5001', contextLabel: 'CHELTUIELI - BUGET DE STAT' },
  state_social_insurance: { synthesisForm: 'state_social_insurance_synthesis', capitol: '5000', contextLabel: 'TOTAL GENERAL' },
  health_insurance: { synthesisForm: 'health_insurance_synthesis', capitol: '5000', contextLabel: 'TOTAL GENERAL' },
  unemployment_insurance: { synthesisForm: 'unemployment_insurance_synthesis', capitol: '5000', contextLabel: 'TOTAL GENERAL' },
}

export const REVENUE_TOTAL_LABEL = 'VENITURI - TOTAL'

type TotalQuery = {
  readonly fund: ApprovedFund
  readonly budgetYear: number
  readonly measureYear: number
}

function pick(matches: readonly ApprovedLine[]): ApprovedTotalCell {
  if (matches.length === 1) return { status: 'ok', line: matches[0], origin: 'real_sample' }
  if (matches.length === 0) return { status: 'unavailable', reason: 'not_in_sample' }
  return { status: 'ambiguous', count: matches.length }
}

export function selectRevenueTotal(lines: readonly ApprovedLine[], query: TotalQuery): ApprovedTotalCell {
  const form = TOTAL_DESCRIPTORS[query.fund].synthesisForm
  return pick(
    lines.filter(
      (line) =>
        line.form === form &&
        line.budgetYear === query.budgetYear &&
        line.measureYear === query.measureYear &&
        line.rowRole === 'descriptor' &&
        line.provenance.recordIndex === 0 &&
        line.label === REVENUE_TOTAL_LABEL,
    ),
  )
}

export function selectCreditTotal(
  lines: readonly ApprovedLine[],
  query: TotalQuery & { readonly creditType: CreditType },
): ApprovedTotalCell {
  const descriptor = TOTAL_DESCRIPTORS[query.fund]
  return pick(
    lines.filter(
      (line) =>
        line.form === descriptor.synthesisForm &&
        line.budgetYear === query.budgetYear &&
        line.measureYear === query.measureYear &&
        line.rowRole === 'credit' &&
        line.creditType === query.creditType &&
        line.codes.capitol === descriptor.capitol &&
        line.context?.label === descriptor.contextLabel,
    ),
  )
}

/**
 * The level of a row of a state-budget authority annex, from its codes alone:
 * the authority's 5001 total, a group (`01` current, `70` capital, `79`
 * financial operations, `84` prior-year payments recovered) or a title.
 */
export function authorityLineLevel(line: Pick<ApprovedLine, 'codes'>): 0 | 1 | 2 {
  const title = (line.codes.titlu ?? '').trim()
  if (title === '') return 0
  if (['01', '70', '79', '84'].includes(title)) return 1
  return 2
}
