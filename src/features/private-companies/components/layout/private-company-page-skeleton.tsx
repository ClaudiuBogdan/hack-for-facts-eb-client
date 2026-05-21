import './company-page.css'
import { Skeleton } from '@/components/ui/skeleton'
import { PrivateCompanyHeaderSkeleton } from './private-company-header-skeleton'

const PAGE_GUTTER = 'mx-auto w-full max-w-[48rem] px-4 sm:px-6 lg:px-8'

export function PrivateCompanyPageSkeleton() {
  return (
    <div className="company-page-v2 min-h-screen bg-background">
      <div className="border-b border-border">
        <div className={`${PAGE_GUTTER} py-3 sm:py-4`}>
          <PrivateCompanyHeaderSkeleton />
          <div className="-mx-4 mt-2 flex gap-1 border-t px-4 pt-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-20 shrink-0" />
            ))}
          </div>
        </div>
      </div>
      <div className={`${PAGE_GUTTER} py-4`}>
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}
