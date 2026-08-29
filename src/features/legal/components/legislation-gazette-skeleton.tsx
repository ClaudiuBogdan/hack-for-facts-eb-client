import { t } from '@lingui/core/macro'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Layout-matching skeleton for the gazette issue list — one bar per row at
 * row height, then the paging footer. It fills only the LIST area: the
 * staleness note, section chrome and filters carry no data and stay live
 * while a page loads (the year and part selects must not flash away on every
 * page turn).
 */
export function LegislationGazetteSkeleton() {
  return (
    <div
      className="flex flex-col"
      aria-busy="true"
      aria-label={t`Se încarcă edițiile Monitorului Oficial`}
    >
      {Array.from({ length: 8 }, (_unused, index) => (
        <div
          key={index}
          className="border-b border-[var(--pnrr-subtle)] px-5 py-3 sm:px-6"
        >
          <Skeleton className="h-10 w-full rounded-none" />
        </div>
      ))}
      <div className="px-5 py-4 sm:px-6">
        <Skeleton className="h-11 w-full max-w-md rounded-none" />
      </div>
    </div>
  )
}
