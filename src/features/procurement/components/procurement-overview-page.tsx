import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  analysisGrainToHubGrain,
  hubGrainToAnalysisGrain,
  type ProcurementHubState,
} from '@/schemas/procurement-hub'
import {
  useProcurementGeographyOptions,
  useProcurementLanding,
} from '../hooks/use-procurement-data'
import { useProcurementHubState } from '../hooks/use-procurement-hub-state'
import { effectiveBuyerRegion } from '../lib/procurement-geography'
import { ProcurementShell } from './procurement-shell'
import { ProcurementSearchDock } from './procurement-search-dock'
import { ProcurementPartyRanking } from './procurement-party-ranking'
import { ProcurementCategoryBars } from './procurement-category-bars'
import { ProcurementMonthlyChart } from './procurement-monthly-chart'
import { ProcurementQuickLinks } from './procurement-quick-links'
import { ProcurementMapView } from './procurement-map-view'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementOverviewSkeleton } from './procurement-skeletons'
import { ProcurementAnswerabilityNotice } from './procurement-answerability-notice'
import { ProcurementAnalysisGrainToggle } from './procurement-analysis-grain-toggle'
import {
  ProcurementHubFilterSheet,
  ProcurementHubFilterTrigger,
} from './procurement-hub-filter-sheet'
import { ProcurementHubActiveFilters } from './procurement-hub-active-filters'
import { ProcurementHubDevPanel } from './procurement-hub-dev-panel'
import { ProcurementSearchContent } from './procurement-search-content'
import { ProcurementRankingsView } from './procurement-rankings-view'

/** Unified hub: Overview (incl. buyer map) + Rankings + List share one URL schema (A2 / F2). */
export function ProcurementOverviewPage({
  hubState,
}: {
  readonly hubState: ProcurementHubState
}) {
  const hub = useProcurementHubState(hubState)
  const query = useProcurementLanding(hub.landingFilters)
  const geographyQuery = useProcurementGeographyOptions()
  const data = query.data
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const hasBuyerGeography = Boolean(
    hubState.buyerRegion || hubState.buyerCounty || hubState.buyerSiruta,
  )
  const appliedBuyerRegion = effectiveBuyerRegion(
    geographyQuery.data,
    hub.landingFilters,
  )
  const analysisGrain = hubGrainToAnalysisGrain(hubState.grain)
  const analytics = data
    ? analysisGrain === 'contract'
      ? data.analysisByGrain.contract
      : data.analysisByGrain.directAcquisition
    : undefined
  const activeTab = hubState.view
  const appliedChipCount = hub.hubChips.filter(
    (chip) => chip.kind === 'applied',
  ).length

  const activeFilters = <ProcurementHubActiveFilters hub={hub} />

  return (
    <ProcurementShell
      activeTab={activeTab}
      landingFilters={hub.landingFilters}
      enableStickyChrome
      onTabChange={hub.setView}
      actions={
        <ProcurementHubFilterTrigger
          activeCount={appliedChipCount}
          onClick={() => setFilterSheetOpen(true)}
        />
      }
      toolbar={
        <>
          <ProcurementSearchDock
            variant="inline"
            value={hubState.q ?? ''}
            onCommitQuery={hub.setQuery}
          />
          {activeFilters}
          {hubState.buyerCounty && appliedBuyerRegion ? (
            <p className="text-sm leading-6 text-[var(--pnrr-muted)]">
              <Trans>
                County precision is not available yet. Counts and charts below
                are scoped to the wider region: {appliedBuyerRegion}.
              </Trans>
            </p>
          ) : null}
          <ProcurementHubDevPanel />
        </>
      }
      stickyFilters={<ProcurementHubActiveFilters hub={hub} compact />}
    >
      {hubState.view === 'list' ? (
        <div className="space-y-4">
          {hasBuyerGeography ||
          hubState.supplierRegion ||
          hubState.supplierCounty ? (
            <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
              <Trans>
                Geography filters are kept in the URL but are not applied to
                the record list yet. Overview analytics still use buyer
                location when supported.
              </Trans>
            </p>
          ) : null}
          <ProcurementSearchContent
            search={hub.listSearch}
            filterState={hub.listFilterState}
            hideFilterChrome
            onOpenFilters={() => setFilterSheetOpen(true)}
          />
        </div>
      ) : hubState.view === 'rankings' ? (
        <ProcurementRankingsView hubState={hubState} hub={hub} />
      ) : (
        <div className="space-y-6">
          {hasBuyerGeography ? (
            <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
              <Trans>
                The overview analytics are filtered by buyer location. The
                record list does not apply geography yet — switch to List to
                browse records without silently dropping this filter from the
                URL.
              </Trans>
            </p>
          ) : null}

          <div className="flex justify-end">
            <ProcurementAnalysisGrainToggle
              value={analysisGrain}
              onChange={(grain) =>
                hub.updateFilters({ grain: analysisGrainToHubGrain(grain) })
              }
            />
          </div>

          {/* Landing-gated charts only — map keeps its own analysis query and
              must stay mounted across landing pending/refetch (drawer state). */}
          {query.isPending && !data ? (
            <ProcurementOverviewSkeleton />
          ) : query.isError && !data ? (
            <ProcurementErrorState
              error={query.error}
              onRetry={() => void query.refetch()}
              isRetrying={query.isRefetching}
            />
          ) : analytics ? (
            <>
              <ProcurementAnswerabilityNotice meta={analytics.stats.meta} />

              <div className="grid gap-6 lg:grid-cols-2">
                <ProcurementPartyRanking
                  title={t`Top public buyers`}
                  description={
                    hubState.measure === 'value_awarded' &&
                    analytics.meta.authoritiesRankedBy === 'value'
                      ? t`Ranked and scaled by awarded value. Record counts remain visible for context.`
                      : hubState.measure === 'value_awarded'
                        ? t`Awarded-value ranking is unavailable for this scope, so the server ranked by record count.`
                      : t`By number of records.`
                  }
                  rows={analytics.topAuthorities}
                  kind="authority"
                  rankingsDim="buyer"
                  measure={hubState.measure}
                  rankedBy={analytics.meta.authoritiesRankedBy}
                />
                <ProcurementPartyRanking
                  title={t`Top suppliers`}
                  description={
                    hubState.measure === 'value_awarded' &&
                    analytics.meta.suppliersRankedBy === 'value'
                      ? t`Ranked and scaled by awarded value. Record counts remain visible for context.`
                      : hubState.measure === 'value_awarded'
                        ? t`Awarded-value ranking is unavailable for this scope, so the server ranked by record count.`
                      : t`By number of records.`
                  }
                  rows={analytics.topSuppliers}
                  kind="supplier"
                  rankingsDim="supplier"
                  measure={hubState.measure}
                  rankedBy={analytics.meta.suppliersRankedBy}
                />
              </div>

              <ProcurementCategoryBars
                rows={analytics.topCategories}
                rankingsDim="cpv"
                measure={hubState.measure}
                rankedBy={analytics.meta.categoriesRankedBy}
                description={
                  hubState.measure === 'value_awarded' &&
                  analytics.meta.categoriesRankedBy === 'value'
                    ? t`Ranked and scaled by awarded value. Record counts remain visible for context.`
                    : hubState.measure === 'value_awarded'
                      ? t`Awarded-value ranking is unavailable for this scope, so the server ranked by record count.`
                      : t`By number of records.`
                }
              />

              <ProcurementMonthlyChart
                points={analytics.monthly}
                measure={hubState.measure}
                title={
                  hubState.measure === 'value_awarded'
                    ? t`Monthly awarded value`
                    : t`Monthly volume`
                }
                description={
                  hubState.measure === 'value_awarded'
                    ? t`Awarded value per month in RON. Tooltips and the table retain record counts for context.`
                    : t`Number of records per month.`
                }
              />
            </>
          ) : null}

          <ProcurementMapView
            hubState={hubState}
            updateFilters={hub.updateFilters}
            showAnalysisGrainToggle={false}
          />

          <ProcurementQuickLinks />
        </div>
      )}

      <ProcurementHubFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        hub={hub}
      />
    </ProcurementShell>
  )
}
