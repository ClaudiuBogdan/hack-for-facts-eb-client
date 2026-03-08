import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { BudgetItemAnalytics } from './budget-item-analytics'
import type { BudgetItemAnalyticsProps } from './budget-item-analytics-context'
import { useBudgetItemAnalyticsTitle } from './use-budget-item-analytics-title'

export type BudgetItemAnalyticsModalProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly analyticsProps: BudgetItemAnalyticsProps | null
}

export function BudgetItemAnalyticsModal({
  open,
  onOpenChange,
  analyticsProps,
}: Readonly<BudgetItemAnalyticsModalProps>) {
  const { resolvedTitle } = useBudgetItemAnalyticsTitle({
    entityCui: analyticsProps?.context.entityCui ?? '',
    subjectLabel: analyticsProps?.context.subjectLabel ?? '',
    language: analyticsProps?.context.language,
    functionalCode: analyticsProps?.context.functionalCode,
    economicCode: analyticsProps?.context.economicCode,
  })

  if (!analyticsProps) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(96vw,1200px)] max-h-[92vh] max-w-6xl overflow-y-auto overscroll-contain p-0 gap-0"
      >
        <DialogTitle className="sr-only">
          {`Analytics: ${resolvedTitle}`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {`Analytics for ${resolvedTitle}.`}
        </DialogDescription>
        <BudgetItemAnalytics {...analyticsProps} />
      </DialogContent>
    </Dialog>
  )
}
