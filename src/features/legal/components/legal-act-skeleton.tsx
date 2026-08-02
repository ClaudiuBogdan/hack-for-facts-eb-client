import { t } from '@lingui/core/macro'
import { Skeleton } from '@/components/ui/skeleton'

/** Layout-matching skeleton for the act detail page. */
export function LegalActSkeleton() {
  return (
    <div
      className="min-h-screen min-w-0 bg-background"
      aria-busy="true"
      aria-label={t`Se încarcă actul normativ`}
    >
      <div className="border-b-2 border-[var(--pnrr-border)]">
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-40 rounded-none" />
          <Skeleton className="mt-4 h-12 w-80 max-w-full rounded-none" />
          <Skeleton className="mt-3 h-6 w-[28rem] max-w-full rounded-none" />
          <Skeleton className="mt-4 h-7 w-64 rounded-none" />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-56 w-full rounded-none" />
        <Skeleton className="h-48 w-full rounded-none" />
        <Skeleton className="h-40 w-full rounded-none" />
        <Skeleton className="h-32 w-full rounded-none" />
      </div>
    </div>
  )
}
