import { Skeleton } from '@/components/ui/skeleton'

export function PnrrSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Skeleton className="h-4 w-32 rounded-full bg-white/10" />
          <Skeleton className="mt-4 h-10 w-64 bg-white/10 sm:h-12 sm:w-80" />
          <Skeleton className="mt-3 h-4 w-96 bg-white/10" />
          <div className="mt-6 flex gap-3">
            <Skeleton className="h-16 w-24 rounded-2xl bg-white/10" />
            <Skeleton className="h-16 w-24 rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )
}

/** Skeleton for the main content area below the header, shown while data loads. */
export function PnrrContentSkeleton({
  hideMetricCards = false,
}: {
  readonly hideMetricCards?: boolean
}) {
  return (
    <div className="space-y-8" data-testid="pnrr-content-skeleton">
      {!hideMetricCards && (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="pnrr-metric-skeleton-row"
        >
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      )}
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
