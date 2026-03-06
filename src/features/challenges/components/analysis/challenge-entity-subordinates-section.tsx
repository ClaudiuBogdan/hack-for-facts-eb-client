import { t } from '@lingui/core/macro'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import type { NormalizationOptions } from '@/lib/normalization'
import { formatNormalizedValue } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChallengeLocale } from '../../types'

export type ChallengeEntitySubordinateCardItem = {
  readonly entityCui: string
  readonly entityName: string
  readonly entityTypeLabel: string | null
  readonly totalSpending: number
  readonly entitySearch: Record<string, unknown>
}

type ChallengeEntitySubordinatesSectionProps = {
  readonly locale: ChallengeLocale
  readonly items: readonly ChallengeEntitySubordinateCardItem[]
  readonly totalResultsCount: number
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
  readonly normalizationOptions: NormalizationOptions
  readonly showAllSearch: Record<string, unknown>
}

const SUBORDINATES_COPY = {
  ro: {
    totalSpending: 'Total cheltuieli',
    title: 'Instituții subordonate',
    description:
      'Am ordonat instituțiile după cheltuielile raportate prin această primărie, ca ordonator principal de credite, pentru anul selectat.',
    error:
      'Nu am putut încărca instituțiile subordonate pentru această perioadă.',
    emptyChildren:
      'Nu există instituții subordonate conectate acestei primării în datele disponibile.',
    emptySpending:
      'Nu am găsit cheltuieli raportate pentru instituțiile subordonate în perioada selectată.',
    showAll: 'Vezi toate instituțiile',
    formatSummaryCount: (visibleCount: number, totalCount: number) =>
      visibleCount < totalCount
        ? `Top ${visibleCount} din ${totalCount}`
        : `${totalCount} ${totalCount === 1 ? 'instituție' : 'instituții'}`,
  },
  en: {
    totalSpending: 'Total spending',
    title: 'Subordinate institutions',
    description:
      'Institutions are ranked by the spending they reported through this city hall, acting as the main budget creditor, for the selected year.',
    error: 'We could not load subordinate institutions for this period.',
    emptyChildren:
      'No subordinate institutions are connected to this city hall in the available data.',
    emptySpending:
      'We did not find reported spending for subordinate institutions in the selected period.',
    showAll: 'View all institutions',
    formatSummaryCount: (visibleCount: number, totalCount: number) =>
      visibleCount < totalCount
        ? `Top ${visibleCount} of ${totalCount}`
        : `${totalCount} ${totalCount === 1 ? 'institution' : 'institutions'}`,
  },
} as const

function ChallengeEntitySubordinateCardSkeleton() {
  return (
    <Card className="rounded-[24px] border-border/50">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-14 w-full rounded-[16px]" />
        </div>
      </CardContent>
    </Card>
  )
}

function ChallengeEntitySubordinateCard({
  locale,
  index,
  item,
  normalizationOptions,
}: {
  readonly locale: ChallengeLocale
  readonly index: number
  readonly item: ChallengeEntitySubordinateCardItem
  readonly normalizationOptions: NormalizationOptions
}) {
  const copy = SUBORDINATES_COPY[locale]

  return (
    <Card className="rounded-[24px] border-border/50 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <Link
          to="/entities/$cui"
          params={{ cui: item.entityCui }}
          search={item.entitySearch as any}
          className="group block rounded-md text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="px-1.5 py-0 text-[11px] tabular-nums">
                  #{index + 1}
                </Badge>
                {item.entityTypeLabel ? (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
                    {item.entityTypeLabel}
                  </Badge>
                ) : null}
              </div>

              <p className="text-pretty text-[0.9375rem] font-semibold leading-snug text-foreground decoration-2 underline-offset-4 group-hover:text-primary group-hover:underline group-focus-visible:underline">
                {item.entityName}
              </p>
            </div>

            <ArrowUpRight
              className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary"
              aria-hidden="true"
            />
          </div>

          <div className="mt-3 rounded-2xl bg-muted/18 px-3.5 py-2.5">
            <div className="flex flex-col items-end text-right">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {copy.totalSpending}
              </p>
              <p className="mt-1 text-lg font-bold leading-none tabular-nums text-foreground">
                {formatNormalizedValue(
                  item.totalSpending,
                  normalizationOptions,
                  'compact',
                )}
              </p>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}

export function ChallengeEntitySubordinatesSection({
  locale,
  items,
  totalResultsCount,
  isLoading,
  isError,
  onRetry,
  normalizationOptions,
  showAllSearch,
}: ChallengeEntitySubordinatesSectionProps) {
  const copy = SUBORDINATES_COPY[locale]
  const summaryCountLabel =
    totalResultsCount > 0 && items.length > 0
      ? copy.formatSummaryCount(items.length, totalResultsCount)
      : null

  return (
    <Card className="rounded-[28px] border-border/50">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-xl font-black tracking-tight">
            {copy.title}
          </CardTitle>
          {summaryCountLabel ? (
            <Badge variant="outline" className="px-3 py-1 font-medium">
              {summaryCountLabel}
            </Badge>
          ) : null}
        </div>
        <CardDescription className="max-w-3xl text-sm leading-6">
          {copy.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <ChallengeEntitySubordinateCardSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-5 py-6">
            <p className="text-sm text-muted-foreground">
              {copy.error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 rounded-full"
              onClick={onRetry}
            >
              {t`Încearcă din nou`}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-5 py-6 text-sm text-muted-foreground">
            {copy.emptySpending}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {items.map((item, index) => (
                <ChallengeEntitySubordinateCard
                  key={item.entityCui}
                  locale={locale}
                  index={index}
                  item={item}
                  normalizationOptions={normalizationOptions}
                />
              ))}
            </div>

            <Button asChild variant="outline" className="rounded-full">
              <Link to="/entity-analytics" search={showAllSearch as any}>
                {copy.showAll}
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
