import { t } from '@lingui/core/macro'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Layout-matching skeleton for the finder's result list — one bar per result
 * card. It fills only the LIST area: the section chrome and the query form
 * stay live while a search runs (the box must not flash away between
 * queries), the changes-feed skeleton's pattern.
 */
export function LegislationSearchSkeleton() {
  return (
    <div
      className="flex flex-col"
      aria-busy="true"
      aria-label={t`Se caută în legislație`}
    >
      {Array.from({ length: 5 }, (_unused, index) => (
        <div
          key={index}
          className="border-b border-[var(--pnrr-subtle)] px-5 py-4 last:border-b-0 sm:px-6"
        >
          <Skeleton className="h-14 w-full rounded-none" />
        </div>
      ))}
    </div>
  )
}
