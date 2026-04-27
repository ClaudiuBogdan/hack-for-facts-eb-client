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
  readonly totalSpending?: number
  readonly entitySearch: Record<string, unknown>
}

type ChallengeEntitySubordinatesSectionVariant =
  | 'subordinates'
  | 'parent-main-creditors'

type ChallengeEntitySubordinatesSectionProps = {
  readonly locale: ChallengeLocale
  readonly items: readonly ChallengeEntitySubordinateCardItem[]
  readonly totalResultsCount: number
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
  readonly normalizationOptions: NormalizationOptions
  readonly showAllSearch?: Record<string, unknown>
  readonly description?: string
  readonly emptyStateKind?: 'children' | 'spending'
  readonly variant?: ChallengeEntitySubordinatesSectionVariant
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
    parentTitle: 'Ordonator principal',
    parentDescription:
      'Această instituție nu are instituții subordonate în datele disponibile. Este conectată la ordonatorul principal de mai jos.',
    parentError:
      'Nu am putut încărca ordonatorul principal pentru această instituție.',
    parentEmpty:
      'Nu am găsit un ordonator principal conectat acestei instituții în datele disponibile.',
    parentShowAll: 'Vezi instituțiile aceluiași ordonator',
    parentCount: (totalCount: number) =>
      `${totalCount} ${totalCount === 1 ? 'ordonator' : 'ordonatori'}`,
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
    parentTitle: 'Parent main creditor',
    parentDescription:
      'This institution does not have subordinate institutions in the available data. It is connected to the parent main creditor below.',
    parentError:
      'We could not load the main creditor for this institution.',
    parentEmpty:
      'No main creditor is connected to this institution in the available data.',
    parentShowAll: 'View institutions under this creditor',
    parentCount: (totalCount: number) =>
      `${totalCount} ${totalCount === 1 ? 'creditor' : 'creditors'}`,
    formatSummaryCount: (visibleCount: number, totalCount: number) =>
      visibleCount < totalCount
        ? `Top ${visibleCount} of ${totalCount}`
        : `${totalCount} ${totalCount === 1 ? 'institution' : 'institutions'}`,
  },
} as const

function ChallengeEntitySubordinateRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <Skeleton className="h-5 w-8 rounded-full shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3.5 w-24 rounded-full" />
      </div>
      <Skeleton className="h-5 w-24 shrink-0" />
    </div>
  )
}

function ChallengeEntitySubordinateRow({
  index,
  item,
  normalizationOptions,
  totalSpendingLabel,
  showTotalSpending,
  showRank,
}: {
  readonly index: number
  readonly item: ChallengeEntitySubordinateCardItem
  readonly normalizationOptions: NormalizationOptions
  readonly totalSpendingLabel: string
  readonly showTotalSpending: boolean
  readonly showRank: boolean
}) {
  return (
    <Link
      to="/entities/$cui"
      params={{ cui: item.entityCui }}
      search={item.entitySearch as Record<string, unknown>}
      className="group flex flex-col gap-1.5 py-3.5 text-foreground touch-manipulation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:rounded-md"
    >
      <div className="flex items-start gap-3">
        {showRank ? (
          <span className="shrink-0 pt-0.5 text-xs font-medium tabular-nums text-muted-foreground/60">
            #{index + 1}
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground decoration-2 underline-offset-4 group-hover:text-primary group-hover:underline group-focus-visible:underline">
            {item.entityName}
          </p>
          {item.entityTypeLabel ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.entityTypeLabel}
            </p>
          ) : null}
        </div>

        <ArrowUpRight
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary"
          aria-hidden="true"
        />
      </div>

      {showTotalSpending && item.totalSpending !== undefined ? (
        <div className="flex flex-col items-end">
          <span className="text-[11px] text-muted-foreground">
            {totalSpendingLabel}
          </span>
          <span className="text-sm font-bold tabular-nums text-foreground">
            {formatNormalizedValue(
              item.totalSpending,
              normalizationOptions,
              'compact',
            )}
          </span>
        </div>
      ) : null}
    </Link>
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
  description,
  emptyStateKind = 'spending',
  variant = 'subordinates',
}: ChallengeEntitySubordinatesSectionProps) {
  const copy = SUBORDINATES_COPY[locale]
  const isParentMainCreditorVariant = variant === 'parent-main-creditors'
  const summaryCountLabel =
    totalResultsCount > 0 && items.length > 0
      ? isParentMainCreditorVariant
        ? copy.parentCount(totalResultsCount)
        : copy.formatSummaryCount(items.length, totalResultsCount)
      : null
  const emptyStateMessage =
    isParentMainCreditorVariant
      ? copy.parentEmpty
      : emptyStateKind === 'children'
      ? copy.emptyChildren
      : copy.emptySpending
  const sectionTitle = isParentMainCreditorVariant
    ? copy.parentTitle
    : copy.title
  const sectionDescription = description ??
    (isParentMainCreditorVariant ? copy.parentDescription : copy.description)
  const errorMessage = isParentMainCreditorVariant
    ? copy.parentError
    : copy.error
  const showAllLabel = isParentMainCreditorVariant
    ? copy.parentShowAll
    : copy.showAll

  return (
    <Card className="rounded-[28px] border-border/50">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-xl font-black tracking-tight">
            {sectionTitle}
          </CardTitle>
          {summaryCountLabel ? (
            <Badge variant="outline" className="px-3 py-1 font-medium">
              {summaryCountLabel}
            </Badge>
          ) : null}
        </div>
        <CardDescription className="max-w-3xl text-sm leading-6">
          {sectionDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="divide-y divide-border/40">
            {Array.from({ length: 3 }, (_, index) => (
              <ChallengeEntitySubordinateRowSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-5 py-6">
            <p className="text-sm text-muted-foreground">
              {errorMessage}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 rounded-full"
              onClick={onRetry}
            >
              {t`Try again`}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-5 py-6 text-sm text-muted-foreground">
            {emptyStateMessage}
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/40">
              {items.map((item, index) => (
                <ChallengeEntitySubordinateRow
                  key={item.entityCui}
                  index={index}
                  item={item}
                  normalizationOptions={normalizationOptions}
                  totalSpendingLabel={copy.totalSpending}
                  showTotalSpending={!isParentMainCreditorVariant}
                  showRank={!isParentMainCreditorVariant}
                />
              ))}
            </div>

            {showAllSearch ? (
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/entity-analytics" search={showAllSearch as Record<string, unknown>}>
                  {showAllLabel}
                </Link>
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
