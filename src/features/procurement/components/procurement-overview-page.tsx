import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { MockDataStatusBadge } from '@/components/shared/procurement-data/data-status-badge'
import { useProcurementLanding } from '../hooks/use-procurement-data'
import { isProcurementMock } from '../api/procurement-api'
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

function countOrDash(count: number | null): string {
  return count === null ? '—' : formatFlowCount(count)
}

/** The overview tab: headline tiles, search dock, rankings, categories, trend. */
export function ProcurementOverviewPage() {
  const query = useProcurementLanding()
  const data = query.data
  const mock = isProcurementMock()
  const badge = mock ? <MockDataStatusBadge /> : undefined

  return (
    <ProcurementShell activeTab="overview">
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
          <section
            className="grid grid-cols-2 gap-3 md:grid-cols-4"
            aria-label={t`Headline indicators`}
          >
            <ProcurementStatTile
              label={t`Direct acquisitions`}
              value={countOrDash(data.headline.directAcquisitionsCount)}
              hint={t`canonical records`}
              badge={badge}
            />
            <ProcurementStatTile
              label={t`Contracts`}
              value={countOrDash(data.headline.contractsCount)}
              hint={t`contracts and awards served`}
              badge={badge}
            />
            <ProcurementStatTile
              label={t`Public buyers`}
              value={countOrDash(data.headline.buyersCount)}
              hint={t`contracting authorities`}
              badge={badge}
            />
            <ProcurementStatTile
              label={t`Suppliers`}
              value={countOrDash(data.headline.suppliersCount)}
              hint={t`identified companies`}
              badge={badge}
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
                      Partial RON sum over records that clear the coverage
                      gate; procurement values are not payments.
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

          <div className="grid gap-6 lg:grid-cols-2">
            <ProcurementPartyRanking
              title={t`Top public buyers`}
              description={t`Ranked by number of records.`}
              rows={data.topAuthorities}
              kind="authority"
              seeAllParam="authority_cui"
            />
            <ProcurementPartyRanking
              title={t`Top suppliers`}
              description={t`Ranked by number of records.`}
              rows={data.topSuppliers}
              kind="supplier"
              seeAllParam="supplier_cui"
            />
          </div>

          <ProcurementCategoryBars rows={data.topCategories} />

          <ProcurementMonthlyChart
            points={data.spendOverTime}
            showAmounts={data.gate.spendRankingsAllowed}
          />

          <ProcurementQuickLinks />
        </div>
      ) : null}
    </ProcurementShell>
  )
}
