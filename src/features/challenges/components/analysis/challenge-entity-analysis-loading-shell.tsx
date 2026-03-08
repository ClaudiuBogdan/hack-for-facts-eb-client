import { t } from '@lingui/core/macro'

import { EntityFinancialSummarySkeleton } from '@/components/entities/EntityFinancialSummarySkeleton'
import { EntityFinancialTrendsSkeleton } from '@/components/entities/EntityFinancialTrendsSkeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ChallengeEntityAnalysisLoadingShell() {
  return (
    <div className="space-y-6" aria-label={t`Loading…`}>
      <section className="rounded-[32px] border border-border/50 bg-background px-6 py-7 shadow-sm sm:px-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-2/3" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
      </section>

      <Card className="rounded-[28px] border-border/50">
        <CardContent className="space-y-3 px-6 py-6">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>

      <EntityFinancialSummarySkeleton />
      <EntityFinancialTrendsSkeleton />

      <Card className="rounded-[28px] border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[520px] w-full" />
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-56" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-64 w-full rounded-[24px]" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
