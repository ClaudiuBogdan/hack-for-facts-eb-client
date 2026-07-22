import { useEffect } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  analysisGrainToHubGrain,
  hubGrainToAnalysisGrain,
  hubStateToRankingScopeInput,
  type ProcurementHubState,
  type ProcurementRankDim,
} from '@/schemas/procurement-hub'
import { useProcurementLeaderboard } from '../hooks/use-procurement-data'
import type { ProcurementHubFilterState } from '../hooks/use-procurement-hub-state'
import { formatFlowCount } from '../lib/formatting'
import {
  procurementSectionClassName,
  procurementSectionDescriptionClassName,
  procurementSectionHeaderClassName,
  procurementSectionTitleClassName,
} from '../lib/procurement-theme'
import { ProcurementAnalysisGrainToggle } from './procurement-analysis-grain-toggle'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementOverviewSkeleton } from './procurement-skeletons'
import { ProcurementRankingTable } from './procurement-ranking-table'

type Props = {
  readonly hubState: ProcurementHubState
  readonly hub: ProcurementHubFilterState
}

/**
 * Rankings hub view — top-100 leaderboards (count- or value-ranked) with
 * client-simulated pagination over the honest payload.
 */
export function ProcurementRankingsView({ hubState, hub }: Props) {
  const rankDim = hubState.rankDim
  const supplierUnsupported = hubState.grain === 'procedures' && rankDim === 'supplier'

  const scope = hubStateToRankingScopeInput(hubState)
  const query = useProcurementLeaderboard(
    {
      scope,
      rankDim,
      cpvLevel: hubState.cpvLevel,
      rankBy: hubState.rankBy,
    },
    !supplierUnsupported,
  )

  const rows = query.data?.rows ?? []
  const totalPages = Math.max(1, Math.ceil(rows.length / hubState.rankPageSize))
  const { setRankPage } = hub
  const hasData = query.data !== undefined

  useEffect(() => {
    // Clamp only once data is in — clamping against the empty loading payload
    // would rewrite a deep-linked rankPage to 1 before rows arrive.
    if (hasData && hubState.rankPage > totalPages) {
      setRankPage(totalPages)
    }
  }, [setRankPage, hasData, hubState.rankPage, totalPages])

  const analysisGrain =
    hubState.grain === 'contracts' || hubState.grain === 'direct_acquisitions'
      ? hubGrainToAnalysisGrain(hubState.grain)
      : null
  const dims: Array<{ id: ProcurementRankDim; label: string }> = [
    { id: 'buyer', label: t`Buyers` },
    { id: 'supplier', label: t`Suppliers` },
    { id: 'cpv', label: t`CPV` },
  ]

  const unavailableReason = supplierUnsupported
    ? t`Supplier rankings need contracts or direct acquisitions — procedures have no awards.`
    : undefined

  // The server echoes the effective basis: a value request falls back to count
  // when the spend gate suppresses money — reflect what was actually served.
  const servedRankedBy = query.data?.rankedBy ?? hubState.rankBy
  const valueFellBack =
    hubState.rankBy === 'value' && query.data?.rankedBy === 'count'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex border-2 border-[var(--pnrr-border)]"
          role="tablist"
          aria-label={t`Ranking dimension`}
        >
          {dims.map((dim) => (
            <Button
              key={dim.id}
              type="button"
              role="tab"
              aria-selected={rankDim === dim.id}
              variant={rankDim === dim.id ? 'default' : 'ghost'}
              className="rounded-none border-l-2 border-[var(--pnrr-border)] first:border-l-0"
              onClick={() => hub.setRankDim(dim.id)}
            >
              {dim.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div
            className="inline-flex border-2 border-[var(--pnrr-border)]"
            role="group"
            aria-label={t`Ranking basis`}
          >
            <Button
              type="button"
              variant={hubState.rankBy === 'count' ? 'default' : 'ghost'}
              className="rounded-none"
              aria-pressed={hubState.rankBy === 'count'}
              onClick={() => hub.setRankBy('count')}
            >
              <Trans>By count</Trans>
            </Button>
            <Button
              type="button"
              variant={hubState.rankBy === 'value' ? 'default' : 'ghost'}
              className="rounded-none border-l-2 border-[var(--pnrr-border)]"
              aria-pressed={hubState.rankBy === 'value'}
              onClick={() => hub.setRankBy('value')}
            >
              <Trans>By value</Trans>
            </Button>
          </div>

          {analysisGrain ? (
            <ProcurementAnalysisGrainToggle
              value={analysisGrain}
              onChange={(grain) =>
                hub.updateFilters({ grain: analysisGrainToHubGrain(grain) })
              }
            />
          ) : null}
        </div>
      </div>

      {rankDim === 'cpv' ? (
        <div
          className="inline-flex border-2 border-[var(--pnrr-border)]"
          role="group"
          aria-label={t`CPV level`}
        >
          <Button
            type="button"
            variant={hubState.cpvLevel === 'division' ? 'default' : 'ghost'}
            className="rounded-none"
            aria-pressed={hubState.cpvLevel === 'division'}
            onClick={() => hub.setCpvLevel('division')}
          >
            <Trans>Division</Trans>
          </Button>
          <Button
            type="button"
            variant={hubState.cpvLevel === 'code' ? 'default' : 'ghost'}
            className={cn(
              'rounded-none border-l-2 border-[var(--pnrr-border)]',
            )}
            aria-pressed={hubState.cpvLevel === 'code'}
            onClick={() => hub.setCpvLevel('code')}
          >
            <Trans>Code</Trans>
          </Button>
        </div>
      ) : null}

      <section className={procurementSectionClassName}>
        <div className={procurementSectionHeaderClassName}>
          <h2 className={procurementSectionTitleClassName}>
            {rankDim === 'buyer'
              ? t`Top public buyers`
              : rankDim === 'supplier'
                ? t`Top suppliers`
                : hubState.cpvLevel === 'code'
                  ? t`Top CPV codes`
                  : t`Top CPV divisions`}
          </h2>
          <p className={procurementSectionDescriptionClassName}>
            {servedRankedBy === 'value' ? (
              <Trans>Sorted by awarded value for the current filters.</Trans>
            ) : (
              <Trans>
                Sorted by record count. Awarded value is shown when the API
                returns it for the current filters.
              </Trans>
            )}
            {valueFellBack ? (
              <>
                {' '}
                <Trans>
                  Value ranking is unavailable for this scope — showing count
                  order instead.
                </Trans>
              </>
            ) : null}
          </p>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap gap-4 border-b-2 border-[var(--pnrr-border)] pb-4 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
                <Trans>Distinct institutions</Trans>
              </p>
              <p className="mt-1 font-bold tabular-nums text-[var(--pnrr-fg)]">
                {query.data?.distinctAuthorities == null
                  ? '—'
                  : formatFlowCount(query.data.distinctAuthorities)}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
                <Trans>Distinct suppliers</Trans>
              </p>
              <p className="mt-1 font-bold tabular-nums text-[var(--pnrr-fg)]">
                {query.data?.distinctSuppliers == null
                  ? '—'
                  : formatFlowCount(query.data.distinctSuppliers)}
              </p>
            </div>
            {query.data?.distinctAuthorities == null &&
            query.data?.distinctSuppliers != null ? (
              <p className="max-w-md text-sm leading-6 text-[var(--pnrr-muted)]">
                <Trans>
                  Distinct institution counts are not published on this
                  concentration payload yet.
                </Trans>
              </p>
            ) : null}
          </div>

          {unavailableReason ? (
            <ProcurementRankingTable
              rows={[]}
              hubState={hubState}
              rankDim={rankDim}
              cpvLevel={hubState.cpvLevel}
              rankPage={hubState.rankPage}
              rankPageSize={hubState.rankPageSize}
              onRankPageChange={hub.setRankPage}
              onRankPageSizeChange={hub.setRankPageSize}
              unavailableReason={unavailableReason}
            />
          ) : query.isPending && !query.data ? (
            <ProcurementOverviewSkeleton />
          ) : query.isError && !query.data ? (
            <ProcurementErrorState
              error={query.error}
              onRetry={() => void query.refetch()}
              isRetrying={query.isRefetching}
            />
          ) : (
            <ProcurementRankingTable
              rows={rows}
              hubState={hubState}
              rankDim={rankDim}
              cpvLevel={hubState.cpvLevel}
              rankPage={hubState.rankPage}
              rankPageSize={hubState.rankPageSize}
              onRankPageChange={hub.setRankPage}
              onRankPageSizeChange={hub.setRankPageSize}
            />
          )}
        </div>
      </section>
    </div>
  )
}
