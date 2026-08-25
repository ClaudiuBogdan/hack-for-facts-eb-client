import { t } from '@lingui/core/macro'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Layout-matching skeleton for the change feed — one bar per row at row
 * height, then the load-more footer. It fills only the LIST area: section
 * chrome, the count line and the filter controls carry no rows and stay live
 * while a page loads (the view/kind/source controls must not flash away on
 * every filter change).
 */
export function LegislationChangesSkeleton() {
  return (
    <div
      className="flex flex-col"
      aria-busy="true"
      aria-label={t`Se încarcă modificările legislative`}
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
        <Skeleton className="h-11 w-44 rounded-none" />
      </div>
    </div>
  )
}
