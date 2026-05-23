import { Skeleton } from '@/components/ui/skeleton'

export function PrivateCompanyHeaderSkeleton() {
  return (
    <header className="company-page-header space-y-2 pb-0">
      <Skeleton className="h-8 w-[min(100%,20rem)] sm:h-9" />
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="border-t pt-2 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-1 border-b pb-3 last:border-0">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full max-w-xs" />
          </div>
        ))}
        <div className="space-y-1 pb-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <Skeleton className="h-3 w-56 border-t pt-2" />
    </header>
  )
}
