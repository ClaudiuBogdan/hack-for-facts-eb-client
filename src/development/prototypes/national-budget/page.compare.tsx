import { t } from '@lingui/core/macro'
import { Check, Info, X } from 'lucide-react'

import { approvedAmountToLei, executionAmountToLei } from '@/features/national-budget/page/model/amounts'
import type { Comparison, ExecutionOperand, PlanOperand } from '@/features/national-budget/page/model/comparability'
import { cn } from '@/lib/utils'
import type { ApprovedFund, ApprovedSeriesPoint, BudgetEdition, CreditType, ExecutionFact } from '@/schemas/national-budget-page'
import { checkDetail, checkLabel, comparisonKindLabel } from './page.format'

export function planOperand({
  edition,
  targetYear,
  fund,
  basis,
  amountThousandLei,
}: {
  readonly edition: BudgetEdition
  readonly targetYear: number
  readonly fund: ApprovedFund
  readonly basis: CreditType | 'revenue'
  readonly amountThousandLei: string
}): PlanOperand {
  return {
    kind: 'plan',
    edition: edition.key,
    editionStatus: edition.status,
    measure: targetYear !== edition.budgetYear ? 'forecast' : edition.status === 'draft' ? 'proposed' : 'approved',
    scope: fund,
    basis,
    targetYear,
    valueLei: approvedAmountToLei(amountThousandLei),
  }
}

export function pointOperand(point: ApprovedSeriesPoint, fund: ApprovedFund, basis: CreditType | 'revenue'): PlanOperand {
  return {
    kind: 'plan',
    edition: point.edition,
    editionStatus: point.editionStatus,
    measure: point.kind,
    scope: fund,
    basis,
    targetYear: point.measureYear,
    valueLei: approvedAmountToLei(point.amountThousandLei),
  }
}

export function executionOperand(fact: ExecutionFact): ExecutionOperand {
  return {
    kind: 'execution',
    periodEnd: fact.periodEnd,
    scope: fact.component,
    basis: fact.section === 'revenue' ? 'revenue' : 'payments',
    fiscalStart: fact.fiscalStart ?? fact.reportStart,
    fiscalEnd: fact.fiscalEnd ?? fact.reportEnd,
    executionStatus: fact.executionStatus,
    finality: fact.finality,
    valueLei: executionAmountToLei(fact.value),
  }
}

export function Verdict({ comparison, className }: { readonly comparison: Comparison; readonly className?: string }) {
  const ok = comparison.verdict === 'comparable'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs font-medium',
        ok ? 'border-foreground/30 text-foreground' : 'border-amber-600/50 bg-amber-50/60 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
        className,
      )}
    >
      {ok ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
      {ok ? t`Se compară` : t`Nu se compară direct`}
    </span>
  )
}

/** Each dimension the comparison was checked on, and what it found. */
export function ChecksList({ comparison, className }: { readonly comparison: Comparison; readonly className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs text-muted-foreground">{comparisonKindLabel(comparison.kind)}</p>
      <ul className="space-y-1.5 text-sm">
        {comparison.checks.map((item) => (
          <li key={item.dimension} className="grid grid-cols-[1rem_6.5rem_minmax(0,1fr)] items-start gap-2">
            {item.outcome === 'same' ? (
              <Check className="mt-0.5 size-4 text-foreground" aria-label={t`la fel`} />
            ) : item.outcome === 'noted' ? (
              <Info className="mt-0.5 size-4 text-muted-foreground" aria-label={t`de reținut`} />
            ) : (
              <X className="mt-0.5 size-4 text-amber-700 dark:text-amber-400" aria-label={t`diferit`} />
            )}
            <span className="font-medium">{checkLabel(item.dimension)}</span>
            <span className="text-muted-foreground">{checkDetail(comparison.kind, item)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
