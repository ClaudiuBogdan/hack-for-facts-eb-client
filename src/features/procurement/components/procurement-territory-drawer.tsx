import { useNavigate } from '@tanstack/react-router'
import { type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  cleanProcurementHubSearch,
  hubGrainToAnalysisGrain,
  hubStateToTerritoryLandingFilters,
  type ProcurementHubMapGrain,
  type ProcurementHubState,
} from '@/schemas/procurement-hub'
import { useProcurementTerritoryOverview } from '../hooks/use-procurement-data'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  findRegionBucket,
  type ProcurementRegionMapBucket,
} from '../lib/procurement-map-series'
import { ProcurementPreviewBadge } from './procurement-preview-badge'
import { ProcurementPartyRanking } from './procurement-party-ranking'
import { ProcurementCategoryBars } from './procurement-category-bars'
import { ProcurementMonthlyChart } from './procurement-monthly-chart'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementAnswerabilityNotice } from './procurement-answerability-notice'
import {
  procurementPrimaryButtonClassName,
  procurementSectionClassName,
} from '../lib/procurement-theme'

type Props = {
  readonly open: boolean
  /** Grain of the selected territory (from paint mode), used for metrics + Apply. */
  readonly territoryGrain: ProcurementHubMapGrain
  readonly territoryId: string | undefined
  readonly territoryLabel: string | undefined
  readonly regionBuckets: readonly ProcurementRegionMapBucket[]
  readonly hubState: ProcurementHubState
  readonly onOpenChange: (open: boolean) => void
}

/**
 * Territory drawer for map clicks (inspect only).
 * Mini Overview: institutions → suppliers → CPV → monthly; Apply CTAs pinned
 * to the sheet footer (PNRR filter-sheet pattern).
 *
 * Headline metrics prefer the same facet buckets that paint the map so the
 * sidebar matches the choropleth under shared hub filters + selected geo.
 *
 * @see docs/specs/procurement-buyer-map-requirements.md
 */
export function ProcurementTerritoryDrawer({
  open,
  territoryGrain,
  territoryId,
  territoryLabel,
  regionBuckets,
  hubState,
  onOpenChange,
}: Props) {
  const navigate = useNavigate()
  const landingFilters = hubStateToTerritoryLandingFilters(
    hubState,
    territoryGrain,
    territoryId,
  )
  const overviewQuery = useProcurementTerritoryOverview(
    landingFilters,
    open && Boolean(territoryId),
  )

  const analysisGrain = hubGrainToAnalysisGrain(hubState.grain)
  const analytics = overviewQuery.data
    ? analysisGrain === 'contract'
      ? overviewQuery.data.analysisByGrain.contract
      : overviewQuery.data.analysisByGrain.directAcquisition
    : undefined

  // Same facet buckets that drive map paint (region name or county/UAT key).
  const mapBucket = territoryId
    ? findRegionBucket(regionBuckets, territoryId)
    : undefined

  const geoPatch =
    territoryGrain === 'uat'
      ? {
          buyerSiruta: territoryId,
          buyerCounty: undefined,
          buyerRegion: undefined,
        }
      : territoryGrain === 'county'
        ? {
            buyerCounty: territoryId,
            buyerRegion: undefined,
            buyerSiruta: undefined,
          }
        : {
            buyerRegion: territoryId,
            buyerCounty: undefined,
            buyerSiruta: undefined,
          }

  const appliedSearch = cleanProcurementHubSearch({
    ...hubState,
    ...geoPatch,
  })

  const title = territoryLabel ?? territoryId ?? t`Territory`
  const measureIsValue = hubState.measure === 'value_awarded'
  const showPreviewBadge = territoryGrain !== 'region'
  const isPending = overviewQuery.isPending
  const queryFailed = overviewQuery.isError && !overviewQuery.data
  const retry = () => void overviewQuery.refetch()

  const buyersTitle = t`Top public buyers`
  const buyersDescription = measureIsValue
    ? t`By awarded value when available.`
    : t`By number of records.`
  const suppliersTitle = t`Top suppliers`
  const suppliersDescription = measureIsValue
    ? t`By awarded value when available.`
    : t`By number of records.`
  const cpvTitle = t`Top CPV divisions`
  const cpvDescription = t`Spending categories in this territory.`
  const monthlyTitle = t`Monthly volume`
  const monthlyDescription = measureIsValue
    ? t`Awarded value per month when amounts are present.`
    : t`Number of records per month.`

  const recordCount =
    mapBucket?.recordCount !== null && mapBucket?.recordCount !== undefined
      ? String(mapBucket.recordCount)
      : (analytics?.stats.recordCount ?? null)
  const awardedValue =
    mapBucket?.valueAwardedSum !== null &&
    mapBucket?.valueAwardedSum !== undefined
      ? String(mapBucket.valueAwardedSum)
      : (analytics?.stats.valueAwardedSum ?? null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-full max-w-full flex-col gap-0 overflow-hidden border-l-2 border-[var(--pnrr-border)] p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b-2 border-[var(--pnrr-border)] p-6 pr-14 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-2xl font-black tracking-tight text-[var(--pnrr-fg)]">
              {title}
            </SheetTitle>
            {showPreviewBadge ? <ProcurementPreviewBadge /> : null}
          </div>
          <SheetDescription className="pt-1 text-sm font-semibold text-[var(--pnrr-muted)]">
            {territoryGrain === 'region' ? (
              <Trans>
                Buyer-side development region. Inspect below, then apply a
                filter if you want Overview or List scoped to this area.
              </Trans>
            ) : territoryGrain === 'county' ? (
              <Trans>
                County inspect panel. Apply below to set the buyer location
                filter.
              </Trans>
            ) : (
              <Trans>
                Locality inspect panel. Apply below to set the buyer location
                filter.
              </Trans>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-6">
          <div className="grid grid-cols-2 gap-4">
            <Metric
              label={t`Records`}
              value={
                isPending && recordCount === null
                  ? null
                  : recordCount !== null
                    ? formatFlowCount(recordCount)
                    : '—'
              }
              loading={isPending && recordCount === null}
            />
            <Metric
              label={t`Awarded value`}
              value={
                isPending && awardedValue === null
                  ? null
                  : awardedValue !== null
                    ? formatRon(awardedValue, 'compact')
                    : '—'
              }
              loading={isPending && awardedValue === null}
            />
          </div>

          {analytics?.stats.meta ? (
            <ProcurementAnswerabilityNotice meta={analytics.stats.meta} />
          ) : null}

          <div className="space-y-5">
            {isPending ? (
              <SectionCard
                title={buyersTitle}
                description={buyersDescription}
              >
                <ListBodySkeleton rows={4} />
              </SectionCard>
            ) : queryFailed ? (
              <SectionCard
                title={buyersTitle}
                description={t`Could not load this section.`}
              >
                <ProcurementErrorState
                  error={overviewQuery.error}
                  onRetry={retry}
                  isRetrying={overviewQuery.isRefetching}
                  embedded
                />
              </SectionCard>
            ) : (
              <ProcurementPartyRanking
                title={buyersTitle}
                description={buyersDescription}
                rows={analytics?.topAuthorities ?? []}
                kind="authority"
                grain={analysisGrain}
              />
            )}

            {isPending ? (
              <SectionCard
                title={suppliersTitle}
                description={suppliersDescription}
              >
                <ListBodySkeleton rows={4} />
              </SectionCard>
            ) : queryFailed ? (
              <SectionCard
                title={suppliersTitle}
                description={t`Could not load this section.`}
              >
                <ProcurementErrorState
                  error={overviewQuery.error}
                  onRetry={retry}
                  isRetrying={overviewQuery.isRefetching}
                  embedded
                />
              </SectionCard>
            ) : (
              <ProcurementPartyRanking
                title={suppliersTitle}
                description={suppliersDescription}
                rows={analytics?.topSuppliers ?? []}
                kind="supplier"
                grain={analysisGrain}
              />
            )}

            {isPending ? (
              <SectionCard title={cpvTitle} description={cpvDescription}>
                <ListBodySkeleton rows={4} />
              </SectionCard>
            ) : queryFailed ? (
              <SectionCard
                title={cpvTitle}
                description={t`Could not load this section.`}
              >
                <ProcurementErrorState
                  error={overviewQuery.error}
                  onRetry={retry}
                  isRetrying={overviewQuery.isRefetching}
                  embedded
                />
              </SectionCard>
            ) : (
              <ProcurementCategoryBars
                rows={analytics?.topCategories ?? []}
                title={cpvTitle}
                description={cpvDescription}
              />
            )}

            {isPending ? (
              <SectionCard
                title={monthlyTitle}
                description={monthlyDescription}
              >
                <ChartBodySkeleton />
              </SectionCard>
            ) : queryFailed ? (
              <SectionCard
                title={monthlyTitle}
                description={t`Could not load this section.`}
              >
                <ProcurementErrorState
                  error={overviewQuery.error}
                  onRetry={retry}
                  isRetrying={overviewQuery.isRefetching}
                  embedded
                />
              </SectionCard>
            ) : (
              <ProcurementMonthlyChart
                points={analytics?.monthly ?? []}
                title={monthlyTitle}
                description={monthlyDescription}
              />
            )}
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4">
          {territoryId ? (
            <Button
              type="button"
              className={cn(procurementPrimaryButtonClassName, 'w-full')}
              onClick={() => {
                onOpenChange(false)
                void navigate({
                  to: '/procurement',
                  search: appliedSearch,
                })
              }}
            >
              <Trans>Apply filter</Trans>
            </Button>
          ) : null}
          {hubState.view === 'list' ? (
            <p className="mt-3 text-xs leading-5 text-[var(--pnrr-muted)]">
              {/* TODO(Search geography API): list does not apply buyer geo yet (B1). */}
              <Trans>
                Buyer location stays in the URL with a “Not applied yet” chip
                until the list geo API lands.
              </Trans>
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SectionCard({
  title,
  description,
  children,
}: {
  readonly title: string
  readonly description?: string
  readonly children: ReactNode
}) {
  return (
    <section className={cn(procurementSectionClassName, 'flex flex-col')}>
      <div className="space-y-1 px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 className="text-lg font-bold tracking-tight text-[var(--pnrr-fg)]">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-6 text-[var(--pnrr-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">{children}</div>
    </section>
  )
}

function ListBodySkeleton({ rows }: { readonly rows: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-2/3 rounded-none" />
            <Skeleton className="h-4 w-12 rounded-none" />
          </div>
          <Skeleton className="h-2 w-full rounded-none" />
        </div>
      ))}
    </div>
  )
}

function ChartBodySkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="flex h-36 items-end gap-1.5">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton
            key={index}
            className="min-w-0 flex-1 rounded-none"
            style={{ height: `${28 + ((index * 17) % 60)}%` }}
          />
        ))}
      </div>
      <Skeleton className="h-3 w-1/3 rounded-none" />
    </div>
  )
}

function Metric({
  label,
  value,
  loading = false,
}: {
  readonly label: string
  readonly value: string | null
  readonly loading?: boolean
}) {
  return (
    <div className="border-2 border-[var(--pnrr-border)] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-20 rounded-none" />
      ) : (
        <p className="mt-1.5 text-lg font-bold tabular-nums text-[var(--pnrr-fg)]">
          {value ?? '—'}
        </p>
      )}
    </div>
  )
}
