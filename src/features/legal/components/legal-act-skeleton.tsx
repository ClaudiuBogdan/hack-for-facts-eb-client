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
        <div className="mx-auto max-w-7xl px-4 pt-5 pb-6 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-40 rounded-none" />
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-32 rounded-none" />
              <Skeleton className="mt-2.5 h-12 w-80 max-w-full rounded-none" />
              <Skeleton className="mt-2 h-6 w-[26rem] max-w-full rounded-none" />
              <Skeleton className="mt-2 h-5 w-72 max-w-full rounded-none" />
            </div>
            <Skeleton className="h-10 w-52 shrink-0 rounded-none" />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-24 w-full rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
        <Skeleton className="h-96 w-full rounded-none" />
      </div>
    </div>
  )
}
