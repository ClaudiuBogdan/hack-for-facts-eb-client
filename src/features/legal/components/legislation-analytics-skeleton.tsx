import { t } from '@lingui/core/macro'
import { Skeleton } from '@/components/ui/skeleton'

/** Layout-matching skeleton for the analytics tab. */
export function LegislationAnalyticsSkeleton() {
  return (
    <div
      className="flex flex-col gap-10"
      aria-busy="true"
      aria-label={t`Se încarcă analiza legislației`}
    >
      <Skeleton className="h-44 w-full rounded-none" />
      <Skeleton className="h-96 w-full rounded-none" />
      <Skeleton className="h-64 w-full rounded-none" />
    </div>
  )
}
