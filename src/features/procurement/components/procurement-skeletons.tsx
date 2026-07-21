import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { procurementSectionClassName } from '../lib/procurement-theme'

/**
 * Loading skeletons that mirror the final layouts (PnrrSkeleton pattern) —
 * square corners, section blocks in place of the real sections.
 */

function SectionSkeleton({ className }: { readonly className?: string }) {
  return (
    <div className={cn(procurementSectionClassName, 'p-5 sm:p-6', className)}>
      <Skeleton className="h-5 w-48 rounded-none" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-4 w-full rounded-none" />
        <Skeleton className="h-4 w-5/6 rounded-none" />
        <Skeleton className="h-4 w-2/3 rounded-none" />
      </div>
    </div>
  )
}

export function ProcurementOverviewSkeleton() {
  return (
    <div className="space-y-6" data-testid="procurement-overview-skeleton">
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  )
}

export function ProcurementSearchSkeleton({
  rows = 6,
}: {
  readonly rows?: number
}) {
  return (
    <div className="space-y-4" data-testid="procurement-search-skeleton">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-28 rounded-none" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className={cn(procurementSectionClassName, 'flex gap-4 p-5')}
          >
            <Skeleton className="h-12 w-16 shrink-0 rounded-none" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-none" />
              <Skeleton className="h-3 w-1/2 rounded-none" />
            </div>
            <Skeleton className="h-6 w-24 shrink-0 rounded-none" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProcurementDetailSkeleton() {
  return (
    <div className="space-y-6" data-testid="procurement-detail-skeleton">
      <Skeleton className="h-4 w-64 rounded-none" />
      <div className={cn(procurementSectionClassName, 'p-6')}>
        <Skeleton className="h-3 w-24 rounded-none" />
        <Skeleton className="mt-3 h-8 w-3/4 rounded-none" />
        <Skeleton className="mt-3 h-5 w-40 rounded-none" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
      <SectionSkeleton />
    </div>
  )
}

export function SupplierSliceSkeleton() {
  return (
    <div className="space-y-4" data-testid="supplier-slice-skeleton">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={cn(procurementSectionClassName, 'p-4')}>
            <Skeleton className="h-3 w-20 rounded-none" />
            <Skeleton className="mt-3 h-6 w-16 rounded-none" />
          </div>
        ))}
      </div>
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  )
}
