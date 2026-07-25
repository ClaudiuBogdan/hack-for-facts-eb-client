import { useMemo, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  analysisGrainToHubGrain,
  hubGrainToAnalysisGrain,
  resolveProcurementValueBasisPlan,
  type ProcurementHubState,
} from '@/schemas/procurement-hub'
import {
  getCalendarMonthBounds,
  getCalendarYearBounds,
  selectedMonthFromPeriod,
} from '@/schemas/procurement-overview'
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
import { ProcurementValueBasisOverview } from './procurement-value-basis-overview'

/** Unified hub: Overview (incl. buyer map) + Rankings + List share one URL schema (A2 / F2). */
export function ProcurementOverviewPage({
  hubState,
}: {
  readonly hubState: ProcurementHubState
}) {
  const hub = useProcurementHubState(hubState)
  // Non-default value logics (and the counts-only modifications population)
  // render through the explicit-grain basis overview; the awarded landing
  // bundle is not fetched for them.
  const basisPlan = resolveProcurementValueBasisPlan(hubState)
  const query = useProcurementLanding(
    hub.landingFilters,
    basisPlan.usesLandingPipeline,
  )
  // The monthly chart doubles as a period picker, so its series must span more
  // than the current selection: when the period IS one month, the picker
  // widens to that month's year and the columns stay reachable. Any other
  // period is its own picker range, and the key matches `query` — one request.
  const selectedMonth = selectedMonthFromPeriod(hub.period)
  const pickerFilters = useMemo(
    () =>
      selectedMonth
        ? {
            ...hub.landingFilters,
            ...getCalendarYearBounds(Number(selectedMonth.slice(0, 4))),
          }
        : hub.landingFilters,
    [hub.landingFilters, selectedMonth],
  )
  const pickerQuery = useProcurementLanding(
    pickerFilters,
    basisPlan.usesLandingPipeline,
  )
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
  const pickerAnalytics = pickerQuery.data
    ? analysisGrain === 'contract'
      ? pickerQuery.data.analysisByGrain.contract
      : pickerQuery.data.analysisByGrain.directAcquisition
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
        </>
      }
      stickyFilters={<ProcurementHubActiveFilters hub={hub} compact />}
    >
      {hubState.view === 'list' ? (
        <div className="space-y-4">
          {/* Geography now filters the record list (search engine, 2026-07-25).
              What a given record type cannot honor is disclosed inside the
              list, from the capability registry the builders scrub with. */}
          <ProcurementSearchContent
            search={hub.listSearch}
            filterState={hub.listFilterState}
            hubState={hubState}
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

          {!basisPlan.usesLandingPipeline ? (
            <>
              <ProcurementValueBasisOverview hubState={hubState} hub={hub} />
              {basisPlan.analysisGrain !== 'framework' ? (
                <ProcurementMapView
                  hubState={hubState}
                  updateFilters={hub.updateFilters}
                  showAnalysisGrainToggle={false}
                />
              ) : null}
              <ProcurementQuickLinks />
            </>
          ) : (
            <>
          <div className="flex justify-start">
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
              <ProcurementAnswerabilityNotice metas={[analytics.stats.meta]} />

              {/* A card whose dimension the scope FIXES is a single bucket —
                  the landing fetch skips it and the card hides (C1). */}
              <div className="grid items-start gap-6 lg:grid-cols-2">
                {hubState.authority_cui ? null : (
                  <ProcurementPartyRanking
                    title={t`Top public buyers`}
                    description={
                      hubState.measure === 'value_awarded' &&
                      analytics.meta.authoritiesRankedBy === 'value'
                        ? t`Ranked by awarded value.`
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
                )}
                {hubState.supplier_cui ? null : (
                  <ProcurementPartyRanking
                    title={t`Top suppliers`}
                    description={
                      hubState.measure === 'value_awarded' &&
                      analytics.meta.suppliersRankedBy === 'value'
                        ? t`Ranked by awarded value.`
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
                )}
              </div>

              {hubState.cpv ||
              hubState.cpv_division ||
              hubState.cpv_group ||
              hubState.cpv_class ||
              hubState.cpv_category ? null : (
                <ProcurementCategoryBars
                  rows={analytics.topCategories}
                  rankingsDim="cpv"
                  measure={hubState.measure}
                  rankedBy={analytics.meta.categoriesRankedBy}
                  description={
                    hubState.measure === 'value_awarded' &&
                    analytics.meta.categoriesRankedBy === 'value'
                      ? t`Ranked by awarded value.`
                      : hubState.measure === 'value_awarded'
                        ? t`Awarded-value ranking is unavailable for this scope, so the server ranked by record count.`
                        : t`By number of records.`
                  }
                />
              )}

              <ProcurementMonthlyChart
                points={pickerAnalytics?.monthly.length
                  ? pickerAnalytics.monthly
                  : analytics.monthly}
                select={{
                  activeMonth: selectedMonth,
                  onSelect: (month) => {
                    // Clearing returns to the picker's own range (the year),
                    // which is the period the columns were drawn from.
                    const bounds = month
                      ? getCalendarMonthBounds(month)
                      : selectedMonth
                        ? getCalendarYearBounds(
                            Number(selectedMonth.slice(0, 4)),
                          )
                        : { dateFrom: undefined, dateTo: undefined }
                    hub.setDates(bounds.dateFrom, bounds.dateTo)
                  },
                }}
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
            </>
          )}
        </div>
      )}

      {/* Dev-only capability matrix — below the content, out of the header flow. */}
      <div className="mt-10">
        <ProcurementHubDevPanel />
      </div>

      <ProcurementHubFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        hub={hub}
      />
    </ProcurementShell>
  )
}
