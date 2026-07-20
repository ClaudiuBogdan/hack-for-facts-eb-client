import { useCallback, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProcurementLandingFilters } from '@/schemas/procurement-overview'
import { buildProcurementOverviewMonthScope } from '@/schemas/procurement-overview'
import {
  useProcurementGeographyOptions,
  useProcurementLanding,
} from '../hooks/use-procurement-data'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  effectiveBuyerRegion,
  findProcurementCounty,
  formatProcurementCountyName,
} from '../lib/procurement-geography'
import { ProcurementShell } from './procurement-shell'
import { ProcurementStatTile } from './procurement-stat-tile'
import { ProcurementSearchDock } from './procurement-search-dock'
import { ProcurementPartyRanking } from './procurement-party-ranking'
import { ProcurementCategoryBars } from './procurement-category-bars'
import { ProcurementMonthlyChart } from './procurement-monthly-chart'
import { ProcurementQuickLinks } from './procurement-quick-links'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementOverviewSkeleton } from './procurement-skeletons'
import { ProcurementAnswerabilityNotice } from './procurement-answerability-notice'
import { ProcurementAnalysisWorkspace } from './procurement-analysis-workspace'
import {
  ProcurementAnalysisGrainToggle,
  type FlowAnalysisGrain,
} from './procurement-analysis-grain-toggle'
import {
  ProcurementOverviewFilterSheet,
  ProcurementOverviewFilterTrigger,
} from './procurement-overview-filter-sheet'

function countOrDash(count: string | null): string {
  return count === null ? '—' : formatFlowCount(count)
}

function formatMonth(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale || 'en', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

/** The overview tab: headline tiles, search dock, rankings, categories, trend. */
export function ProcurementOverviewPage({
  filters,
}: {
  readonly filters: ProcurementLandingFilters
}) {
  const { i18n } = useLingui()
  const navigate = useNavigate({ from: '/procurement/' })
  const query = useProcurementLanding(filters)
  const geographyQuery = useProcurementGeographyOptions()
  const data = query.data
  const [grain, setGrain] = useState<FlowAnalysisGrain>('direct_acquisition')
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const hasActivePeriod = Boolean(filters.dateFrom || filters.dateTo)
  const hasBuyerGeography = Boolean(filters.buyerRegion || filters.buyerCounty)
  const activeFilterCount =
    (hasActivePeriod ? 1 : 0) +
    (hasBuyerGeography ? 1 : 0) +
    (filters.supplierRegion || filters.supplierCounty ? 1 : 0)
  const selectedCounty = findProcurementCounty(
    geographyQuery.data,
    filters.buyerCounty,
  )
  const appliedBuyerRegion = effectiveBuyerRegion(geographyQuery.data, filters)
  const monthScope = buildProcurementOverviewMonthScope(filters)
  const analysisScope = {
    ...(monthScope.monthFrom ? { from: monthScope.monthFrom } : {}),
    ...(monthScope.monthTo ? { to: monthScope.monthTo } : {}),
  }
  const updateFilters = useCallback(
    (next: ProcurementLandingFilters) => {
      void navigate({
        search: (previous) => ({
          ...previous,
          dateFrom: next.dateFrom,
          dateTo: next.dateTo,
          buyerRegion: next.buyerRegion,
          buyerCounty: next.buyerCounty,
          supplierRegion: next.supplierRegion,
          supplierCounty: next.supplierCounty,
        }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
  )
  const clearBuyerGeography = useCallback(() => {
    updateFilters({
      ...filters,
      buyerRegion: undefined,
      buyerCounty: undefined,
    })
  }, [filters, updateFilters])
  const analytics = data
    ? grain === 'contract'
      ? data.analysisByGrain.contract
      : data.analysisByGrain.directAcquisition
    : undefined

  return (
    <ProcurementShell
      activeTab="overview"
      landingFilters={filters}
      actions={
        <ProcurementOverviewFilterTrigger
          activeCount={activeFilterCount}
          onClick={() => setFilterSheetOpen(true)}
        />
      }
    >
      {query.isPending ? (
        <ProcurementOverviewSkeleton />
      ) : query.isError && !data ? (
        <ProcurementErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      ) : data ? (
        <div className="space-y-6">
          {hasActivePeriod || hasBuyerGeography ? (
            <section
              className="space-y-3 border-l-4 border-[#1d70b8] bg-[var(--pnrr-subtle)] px-4 py-3"
              aria-label={t`Active procurement filters`}
            >
              <p className="text-sm font-bold text-[var(--pnrr-fg)]">
                <Trans>Active Filters</Trans>
              </p>
              <div className="flex flex-wrap gap-2">
                {hasActivePeriod ? (
                  <span className="inline-flex min-w-0 items-center border-2 border-[var(--pnrr-border)] bg-background px-3 py-1.5 text-sm text-[var(--pnrr-fg)]">
                    <span className="mr-1 font-bold"><Trans>Period:</Trans></span>
                    <span className="truncate tabular-nums">
                      {filters.dateFrom
                        ? formatMonth(filters.dateFrom, i18n.locale)
                        : t`First available month`}{' '}
                      –{' '}
                      {filters.dateTo
                        ? formatMonth(filters.dateTo, i18n.locale)
                        : t`Latest available month`}
                    </span>
                  </span>
                ) : null}
                {hasBuyerGeography ? (
                  <span className="inline-flex min-w-0 items-center gap-2 border-2 border-[var(--pnrr-border)] bg-background py-1 pl-3 pr-1 text-sm text-[var(--pnrr-fg)]">
                    <span className="min-w-0 truncate">
                      <strong><Trans>Public institution:</Trans></strong>{' '}
                      {filters.buyerCounty
                        ? selectedCounty
                          ? t`${formatProcurementCountyName(selectedCounty.countyName)} County → ${selectedCounty.region ?? t`unknown region`} approximation`
                          : t`County ${filters.buyerCounty}`
                        : filters.buyerRegion}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-none"
                      aria-label={t`Clear public institution location`}
                      onClick={clearBuyerGeography}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </span>
                ) : null}
              </div>
              {filters.buyerCounty && appliedBuyerRegion ? (
                <p className="text-sm leading-6 text-[var(--pnrr-muted)]">
                  <Trans>
                    County precision is not available yet. Every result below
                    is currently scoped to the wider region:{' '}
                    {appliedBuyerRegion}.
                  </Trans>
                </p>
              ) : null}
            </section>
          ) : null}

          <section
            className="grid grid-cols-2 gap-3 md:grid-cols-4"
            aria-label={t`Headline indicators`}
          >
            <ProcurementStatTile
              label={t`Direct acquisitions`}
              value={countOrDash(data.headline.directAcquisitionsCount)}
              hint={t`canonical records`}
            />
            <ProcurementStatTile
              label={t`Contracts`}
              value={countOrDash(data.headline.contractsCount)}
              hint={t`contracts and awards served`}
            />
            <ProcurementStatTile
              label={t`Public buyers`}
              value={countOrDash(data.headline.buyersCount)}
              hint={t`contracting authorities`}
            />
            <ProcurementStatTile
              label={t`Suppliers`}
              value={countOrDash(data.headline.suppliersCount)}
              hint={t`identified companies`}
            />
          </section>

          {data.headline.totalValueRon !== null ? (
            <section className="rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
                    <Trans>Total value, shown with caution</Trans>
                  </p>
                  <p className="text-sm text-[var(--pnrr-muted)]">
                    <Trans>
                      Awarded-value sum across contracts and direct
                      acquisitions; procurement values are not payments.
                    </Trans>
                  </p>
                </div>
                <p className="text-2xl font-semibold text-[var(--pnrr-fg)]">
                  {formatRon(data.headline.totalValueRon, 'compact')}
                </p>
              </div>
            </section>
          ) : null}

          <ProcurementSearchDock />

          {hasBuyerGeography ? (
            <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
              <Trans>
                The overview analytics are filtered. Record search does not
                support geography yet and opens without this location filter.
              </Trans>
            </p>
          ) : null}

          <div className="flex justify-end">
            <ProcurementAnalysisGrainToggle value={grain} onChange={setGrain} />
          </div>

          {analytics ? (
            <ProcurementAnswerabilityNotice meta={analytics.stats.meta} />
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <ProcurementPartyRanking
              title={t`Top public buyers`}
              description={t`Ranked by number of records.`}
              rows={analytics?.topAuthorities ?? []}
              kind="authority"
              seeAllParam="authority_cui"
              unavailableReason={
                hasBuyerGeography
                  ? t`Authority rankings are unavailable under the current regional rollup.`
                  : undefined
              }
            />
            <ProcurementPartyRanking
              title={t`Top suppliers`}
              description={t`Ranked by number of records.`}
              rows={analytics?.topSuppliers ?? []}
              kind="supplier"
              seeAllParam="supplier_cui"
              unavailableReason={
                hasBuyerGeography
                  ? t`Supplier rankings are unavailable under the current regional rollup.`
                  : undefined
              }
            />
          </div>

          <ProcurementCategoryBars rows={analytics?.topCategories ?? []} />

          <ProcurementMonthlyChart
            points={analytics?.monthly ?? []}
          />

          <ProcurementQuickLinks />

          {hasBuyerGeography ? (
            <section className="border-2 border-[var(--pnrr-border)] bg-background p-5 sm:p-6">
              <h2 className="text-lg font-black text-[var(--pnrr-fg)]">
                <Trans>Analysis Workspace</Trans>
              </h2>
              <p className="mt-2 border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
                <Trans>
                  The interactive workspace contains combinations that the
                  regional rollup cannot answer yet. It is paused for this
                  filter instead of showing unfiltered or partial results.
                </Trans>
              </p>
            </section>
          ) : (
            <ProcurementAnalysisWorkspace scope={analysisScope} />
          )}
        </div>
      ) : null}
      <ProcurementOverviewFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={filters}
        onChange={updateFilters}
      />
    </ProcurementShell>
  )
}
