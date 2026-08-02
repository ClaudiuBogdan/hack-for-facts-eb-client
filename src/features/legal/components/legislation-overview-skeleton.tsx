import { t } from '@lingui/core/macro'
import { Skeleton } from '@/components/ui/skeleton'

/** Layout-matching skeleton for the overview tab. */
export function LegislationOverviewSkeleton() {
  return (
    <div
      className="flex flex-col gap-10"
      aria-busy="true"
      aria-label={t`Se încarcă prezentarea legislației`}
    >
      <Skeleton className="h-14 w-full rounded-none" />
      <Skeleton className="h-72 w-full rounded-none" />
      <Skeleton className="h-64 w-full rounded-none" />
      <Skeleton className="h-64 w-full rounded-none" />
    </div>
  )
}
