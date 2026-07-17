import { useCallback, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { useNavigate } from '@tanstack/react-router'
import type { ProcurementLandingFilters } from '@/schemas/procurement-overview'
import { buildProcurementOverviewMonthScope } from '@/schemas/procurement-overview'
import { useProcurementLanding } from '../hooks/use-procurement-data'
import { formatFlowCount, formatRon } from '../lib/formatting'
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
  const data = query.data
  const [grain, setGrain] = useState<FlowAnalysisGrain>('direct_acquisition')
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const hasActivePeriod = Boolean(filters.dateFrom || filters.dateTo)
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
        }),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate],
  )
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
          active={hasActivePeriod}
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
          {hasActivePeriod ? (
            <section
              className="flex flex-col gap-1 border-l-4 border-[#1d70b8] bg-[var(--pnrr-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              aria-label={t`Active period filter`}
            >
              <p className="text-sm font-bold text-[var(--pnrr-fg)]">
                <Trans>Filtered period</Trans>
              </p>
              <p className="text-sm tabular-nums text-[var(--pnrr-muted)]">
                {filters.dateFrom
                  ? formatMonth(filters.dateFrom, i18n.locale)
                  : t`First available month`}{' '}
                –{' '}
                {filters.dateTo
                  ? formatMonth(filters.dateTo, i18n.locale)
                  : t`Latest available month`}
              </p>
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
            />
            <ProcurementPartyRanking
              title={t`Top suppliers`}
              description={t`Ranked by number of records.`}
              rows={analytics?.topSuppliers ?? []}
              kind="supplier"
              seeAllParam="supplier_cui"
            />
          </div>

          <ProcurementCategoryBars rows={analytics?.topCategories ?? []} />

          <ProcurementMonthlyChart
            points={analytics?.monthly ?? []}
          />

          <ProcurementAnalysisWorkspace scope={analysisScope} />

          <ProcurementQuickLinks />
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
