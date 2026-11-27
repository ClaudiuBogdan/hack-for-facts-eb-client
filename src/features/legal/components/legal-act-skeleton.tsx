import { t } from '@lingui/core/macro'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ACT_COLUMN, ACT_GRID } from './reader/act-page-grid'

/** The act page while the act loads: the page's own grid, so nothing moves when the act arrives. */
export function LegalActSkeleton() {
  return (
    <div
      className="min-h-screen min-w-0 bg-background"
      aria-busy="true"
      aria-label={t`Se încarcă actul normativ`}
    >
      <div className={cn(ACT_GRID, 'pt-8 pb-8')}>
        <Skeleton className="h-4 w-40" />
        <div className={cn(ACT_COLUMN, 'mt-4 lg:mt-0')}>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-3 h-10 w-72 max-w-full" />
          <Skeleton className="mt-3 h-6 w-96 max-w-full" />
          <Skeleton className="mt-6 h-14 w-full" />
        </div>
      </div>
      <div className="h-[3.125rem] border-y" />
      <div className={cn(ACT_GRID, 'pt-6')}>
        <Skeleton className="hidden h-64 lg:block" />
        <div className={cn(ACT_COLUMN, 'space-y-6')}>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  )
}
