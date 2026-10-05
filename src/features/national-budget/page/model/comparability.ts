import type { ApprovedFund, BudgetEdition, CreditType, EditionKey } from '@/schemas/national-budget-page'

/**
 * Whether two figures may be set against each other, and on what basis.
 *
 * Plan and execution must share scope, unit, period and accounting basis, and
 * the plan must be the final one (after rectifications) before a rate or a gap
 * means anything. The laws in the data are the versions sent to the Monitorul
 * Oficial, so a plan-versus-execution pair is never comparable today: the page
 * shows both values and says why, it does not compute a percentage.
 */

export type PlanOperand = {
  readonly kind: 'plan'
  readonly edition: EditionKey
  readonly editionStatus: BudgetEdition['status']
  readonly measure: 'approved' | 'forecast' | 'proposed'
  readonly scope: ApprovedFund
  readonly basis: CreditType | 'revenue'
  readonly targetYear: number
  readonly valueLei: number
}

export type ExecutionOperand = {
  readonly kind: 'execution'
  readonly periodEnd: string
  readonly scope: string
  readonly basis: 'payments' | 'revenue'
  readonly fiscalStart: string
  readonly fiscalEnd: string
  readonly executionStatus: 'actual' | 'estimate' | null
  readonly finality: 'final' | 'operative' | 'unknown' | null
  readonly valueLei: number
}

export type Operand = PlanOperand | ExecutionOperand

export type ComparisonKind = 'plan_evolution' | 'year_over_year' | 'plan_vs_execution' | 'execution_periods'

export type CheckDimension = 'scope' | 'unit' | 'period' | 'basis' | 'version' | 'measure' | 'status'

/** `same`: matches; `different`: blocks the comparison; `noted`: allowed, said aloud. */
export type Check = {
  readonly dimension: CheckDimension
  readonly outcome: 'same' | 'different' | 'noted'
}

export type Comparison = {
  readonly kind: ComparisonKind
  readonly verdict: 'comparable' | 'not_comparable'
  readonly checks: readonly Check[]
  /** Only when comparable: b − a, and (b − a) / |a| when a ≠ 0. Nominal lei. */
  readonly difference: { readonly lei: number; readonly relative: number | null } | null
}

const check = (dimension: CheckDimension, ok: boolean): Check => ({ dimension, outcome: ok ? 'same' : 'different' })
const note = (dimension: CheckDimension): Check => ({ dimension, outcome: 'noted' })

function monthOf(date: string): string {
  return date.slice(5, 7)
}

function planVsPlan(a: PlanOperand, b: PlanOperand): Omit<Comparison, 'difference'> {
  const sameYear = a.targetYear === b.targetYear
  const checks: Check[] = [check('scope', a.scope === b.scope), { dimension: 'unit', outcome: 'same' }, check('basis', a.basis === b.basis)]
  if (sameYear) {
    // The same year as seen by successive laws: the editions differ by design.
    checks.push(check('period', true))
    if (a.measure !== b.measure) checks.push(note('measure'))
    if (a.editionStatus !== b.editionStatus) checks.push(note('version'))
    return { kind: 'plan_evolution', verdict: verdictOf(checks), checks }
  }
  // Year over year: each law's own approved (or proposed) year, never a forecast against an approval.
  checks.push(check('measure', a.measure !== 'forecast' && b.measure !== 'forecast'))
  checks.push(note('period'))
  if (a.editionStatus !== b.editionStatus) checks.push(note('version'))
  return { kind: 'year_over_year', verdict: verdictOf(checks), checks }
}

function executionVsExecution(a: ExecutionOperand, b: ExecutionOperand): Omit<Comparison, 'difference'> {
  const sameShape =
    monthOf(a.fiscalStart) === monthOf(b.fiscalStart) &&
    monthOf(a.fiscalEnd) === monthOf(b.fiscalEnd) &&
    a.fiscalEnd !== b.fiscalEnd
  const checks: Check[] = [
    check('scope', a.scope === b.scope),
    { dimension: 'unit', outcome: 'same' },
    check('basis', a.basis === b.basis),
    check('period', sameShape),
    check('status', a.executionStatus === 'actual' && b.executionStatus === 'actual'),
  ]
  if (a.finality !== 'final' || b.finality !== 'final') checks.push(note('version'))
  return { kind: 'execution_periods', verdict: verdictOf(checks), checks }
}

function planVsExecution(plan: PlanOperand, execution: ExecutionOperand): Omit<Comparison, 'difference'> {
  const executionBasisMatches =
    (plan.basis === 'revenue' && execution.basis === 'revenue') ||
    (plan.basis === 'budget_credits' && execution.basis === 'payments')
  const fullYear =
    execution.fiscalStart === `${plan.targetYear}-01-01` && execution.fiscalEnd === `${plan.targetYear}-12-31`
  const checks: Check[] = [
    check('scope', plan.scope === execution.scope),
    { dimension: 'unit', outcome: 'same' },
    check('period', fullYear),
    check('basis', executionBasisMatches),
    // A law as sent to the Monitorul Oficial is the initial plan; the final
    // credits after rectifications are not in the data.
    check('version', false),
    check('measure', plan.measure === 'approved'),
    check('status', execution.executionStatus === 'actual'),
  ]
  return { kind: 'plan_vs_execution', verdict: verdictOf(checks), checks }
}

function verdictOf(checks: readonly Check[]): Comparison['verdict'] {
  return checks.some((item) => item.outcome === 'different') ? 'not_comparable' : 'comparable'
}

export function compare(a: Operand, b: Operand): Comparison {
  const base =
    a.kind === 'plan' && b.kind === 'plan'
      ? planVsPlan(a, b)
      : a.kind === 'execution' && b.kind === 'execution'
        ? executionVsExecution(a, b)
        : a.kind === 'plan' && b.kind === 'execution'
          ? planVsExecution(a, b)
          : planVsExecution(b as PlanOperand, a as ExecutionOperand)
  if (base.verdict !== 'comparable') return { ...base, difference: null }
  const lei = b.valueLei - a.valueLei
  return { ...base, difference: { lei, relative: a.valueLei === 0 ? null : lei / Math.abs(a.valueLei) } }
}
