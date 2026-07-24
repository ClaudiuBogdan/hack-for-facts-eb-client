import { useEffect } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  hubStateToRankingScopeInput,
  resolveProcurementValueBasisPlan,
  scrubScopeForAnalysisGrain,
  type ProcurementHubState,
  type ProcurementRankDim,
} from '@/schemas/procurement-hub'
import type { ProcurementGrain } from '@/schemas/procurement'
import { useProcurementLeaderboard } from '../hooks/use-procurement-data'
import type { ProcurementHubFilterState } from '../hooks/use-procurement-hub-state'
import { formatFlowCount } from '../lib/formatting'
import {
  procurementSectionClassName,
  procurementSectionDescriptionClassName,
  procurementSectionHeaderClassName,
  procurementSectionTitleClassName,
} from '../lib/procurement-theme'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementOverviewSkeleton } from './procurement-skeletons'
import { ProcurementRankingTable } from './procurement-ranking-table'
import { ProcurementValueBasisNotice } from './procurement-value-basis-notice'

function rankingsGrainLabel(grain: ProcurementGrain): string {
  switch (grain) {
    case 'contracts':
      return t`Contracts`
    case 'direct_acquisitions':
      return t`Direct acquisitions`
    case 'procedures':
      return t`Procedures`
    case 'modifications':
      return t`Modifications`
  }
}

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
  const plan = resolveProcurementValueBasisPlan(hubState)
  const countsOnly = plan.valueMeasure === null
  const rankingsWithheld = plan.breakdowns === 'withheld'
  const supplierUnsupported = !plan.supplierDimension && rankDim === 'supplier'
  // Populations carrying only a CPV division collapse finer levels to it.
  const effectiveCpvLevel = plan.cpvBeyondDivision
    ? hubState.cpvLevel
    : 'division'
  const effectiveRankBy = countsOnly ? 'count' : hubState.rankBy

  const { scope: scrubbedScope, dropped } = scrubScopeForAnalysisGrain(
    hubStateToRankingScopeInput(hubState),
    plan.analysisGrain,
  )
  // A breakdown over a dimension the scope already FIXES is a single bucket
  // the server rejects (and the rejection fails the WHOLE operation) — guard
  // here and explain instead of querying. CPV: a scope at level L fixes every
  // breakdown at level ≤ L; finer levels stay free (the server's rule).
  const scopeCpvLevel = scrubbedScope.cpvCode
    ? 4
    : scrubbedScope.cpvCategory
      ? 3
      : scrubbedScope.cpvClass
        ? 2
        : scrubbedScope.cpvGroup
          ? 1
          : scrubbedScope.cpvDivision
            ? 0
            : null
  const CPV_LEVEL_ORDER = {
    division: 0,
    group: 1,
    class: 2,
    category: 3,
    code: 4,
  } as const
  const dimensionFixedByScope =
    rankDim === 'buyer'
      ? Boolean(scrubbedScope.authorityCui)
      : rankDim === 'supplier'
        ? Boolean(scrubbedScope.supplierCui)
        : scopeCpvLevel !== null &&
          scopeCpvLevel >= CPV_LEVEL_ORDER[effectiveCpvLevel]

  const query = useProcurementLeaderboard(
    {
      scope: { ...scrubbedScope, grain: plan.analysisGrain },
      rankDim,
      cpvLevel: effectiveCpvLevel,
      rankBy: effectiveRankBy,
      // A supplier-scoped concentration is a single-supplier tautology the
      // server rejects outright — independent of the ranking dimension.
      includeConcentration:
        plan.concentration && !scrubbedScope.supplierCui,
    },
    !supplierUnsupported && !rankingsWithheld && !dimensionFixedByScope,
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

  const dims: Array<{ id: ProcurementRankDim; label: string }> = [
    { id: 'buyer', label: t`Buyers` },
    { id: 'supplier', label: t`Suppliers` },
    { id: 'cpv', label: t`CPV` },
  ]

  const unavailableReason = supplierUnsupported
    ? t`Supplier rankings need a population that carries suppliers — procedures and framework ceilings have none.`
    : dimensionFixedByScope
      ? t`Your filters already fix this dimension to a single bucket, so there is nothing to rank. Clear the corresponding filter to see this leaderboard.`
      : undefined

  // The server echoes the effective basis: a value request falls back to count
  // when the spend gate suppresses money — reflect what was actually served.
  const servedRankedBy = query.data?.rankedBy ?? effectiveRankBy
  const valueFellBack =
    effectiveRankBy === 'value' && query.data?.rankedBy === 'count'

  if (rankingsWithheld) {
    return (
      <div className="space-y-6">
        <ProcurementValueBasisNotice
          vbasis={hubState.vbasis}
          droppedFilters={dropped}
        />
        <section className={cn(procurementSectionClassName, 'p-5 sm:p-6')}>
          <h2 className={procurementSectionTitleClassName}>
            <Trans>Rankings are withheld for framework ceilings</Trans>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--pnrr-muted)]">
            <Trans>
              A ceiling ranking sliced by buyer, supplier or territory can count
              the same framework's ceiling more than once and materially mislead
              the order, so only the overall total and the monthly series are
              served on the Overview. Switch the value logic back to awarded
              value to rank institutions and suppliers.
            </Trans>
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hubState.vbasis !== 'awarded' || countsOnly ? (
        <ProcurementValueBasisNotice
          vbasis={hubState.vbasis}
          droppedFilters={dropped}
          countsOnly={countsOnly}
          valueBoundsOnAnchor={
            (hubState.valueMin !== undefined ||
              hubState.valueMax !== undefined) &&
            (hubState.vbasis === 'estimated' ||
              hubState.vbasis === 'mod_adjusted')
          }
        />
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          {plan.grainOptions.length > 1 ? (
            <div
              className="inline-flex border-2 border-[var(--pnrr-border)]"
              role="group"
              aria-label={t`Record population`}
            >
              {plan.grainOptions.map((grain, index) => (
                <Button
                  key={grain}
                  type="button"
                  variant={hubState.grain === grain ? 'default' : 'ghost'}
                  aria-pressed={hubState.grain === grain}
                  className={cn(
                    'rounded-none',
                    index > 0 && 'border-l-2 border-[var(--pnrr-border)]',
                  )}
                  onClick={() => hub.updateFilters({ grain })}
                >
                  {rankingsGrainLabel(grain)}
                </Button>
              ))}
            </div>
          ) : null}

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
        </div>

        <div
          className="inline-flex border-2 border-[var(--pnrr-border)]"
          role="group"
          aria-label={t`Ranking basis`}
        >
          <Button
            type="button"
            variant={effectiveRankBy === 'count' ? 'default' : 'ghost'}
            className="rounded-none"
            aria-pressed={effectiveRankBy === 'count'}
            onClick={() => hub.setRankBy('count')}
          >
            <Trans>By count</Trans>
          </Button>
          <Button
            type="button"
            variant={effectiveRankBy === 'value' ? 'default' : 'ghost'}
            className="rounded-none border-l-2 border-[var(--pnrr-border)]"
            aria-pressed={effectiveRankBy === 'value'}
            disabled={countsOnly}
            title={
              countsOnly
                ? t`Modifications are counts-only — there is no servable money to rank on.`
                : undefined
            }
            onClick={() => hub.setRankBy('value')}
          >
            <Trans>By value</Trans>
          </Button>
        </div>
      </div>

      {rankDim === 'cpv' ? (
        <div
          className="inline-flex flex-wrap border-2 border-[var(--pnrr-border)]"
          role="group"
          aria-label={t`CPV level`}
        >
          {(
            [
              { level: 'division' as const, label: t`Division` },
              { level: 'group' as const, label: t`Group` },
              { level: 'class' as const, label: t`Class` },
              { level: 'category' as const, label: t`Category` },
              { level: 'code' as const, label: t`Code` },
            ]
          ).map(({ level, label }) => {
            const levelUnavailable =
              !plan.cpvBeyondDivision && level !== 'division'
            return (
              <Button
                key={level}
                type="button"
                variant={effectiveCpvLevel === level ? 'default' : 'ghost'}
                className={cn(
                  'rounded-none border-l-2 border-[var(--pnrr-border)] first:border-l-0',
                )}
                aria-pressed={effectiveCpvLevel === level}
                disabled={levelUnavailable}
                title={
                  levelUnavailable
                    ? t`This population carries a validated CPV division only.`
                    : undefined
                }
                onClick={() => hub.setCpvLevel(level)}
              >
                {label}
              </Button>
            )
          })}
        </div>
      ) : null}

      <section className={procurementSectionClassName}>
        <div className={procurementSectionHeaderClassName}>
          <h2 className={procurementSectionTitleClassName}>
            {rankDim === 'buyer'
              ? t`Top public buyers`
              : rankDim === 'supplier'
                ? t`Top suppliers`
                : effectiveCpvLevel === 'code'
                  ? t`Top CPV codes`
                  : effectiveCpvLevel === 'group'
                    ? t`Top CPV groups`
                    : effectiveCpvLevel === 'class'
                      ? t`Top CPV classes`
                      : effectiveCpvLevel === 'category'
                        ? t`Top CPV categories`
                        : t`Top CPV divisions`}
          </h2>
          <p className={procurementSectionDescriptionClassName}>
            {servedRankedBy === 'value' ? (
              hubState.vbasis === 'calloff' ? (
                <Trans>
                  Sorted by reported call-off value for the current filters —
                  execution under frameworks, never summed with contract
                  awards.
                </Trans>
              ) : (
                <Trans>Sorted by awarded value for the current filters.</Trans>
              )
            ) : countsOnly ? (
              <Trans>
                Sorted by record count. Modifications are counts-only — no
                money column is served.
              </Trans>
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

        <div className="px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-4 text-sm">
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
        </div>

        {unavailableReason ? (
          <div className="p-5 sm:p-6">
            <ProcurementRankingTable
              rows={[]}
              hubState={hubState}
              rankDim={rankDim}
              cpvLevel={effectiveCpvLevel}
              rankPage={hubState.rankPage}
              rankPageSize={hubState.rankPageSize}
              onRankPageChange={hub.setRankPage}
              onRankPageSizeChange={hub.setRankPageSize}
              unavailableReason={unavailableReason}
            />
          </div>
        ) : query.isPending && !query.data ? (
          <div className="p-5 sm:p-6">
            <ProcurementOverviewSkeleton />
          </div>
        ) : query.isError && !query.data ? (
          <div className="p-5 sm:p-6">
            <ProcurementErrorState
              error={query.error}
              onRetry={() => void query.refetch()}
              isRetrying={query.isRefetching}
            />
          </div>
        ) : (
          <ProcurementRankingTable
            rows={rows}
            hubState={hubState}
            rankDim={rankDim}
            cpvLevel={effectiveCpvLevel}
            rankPage={hubState.rankPage}
            rankPageSize={hubState.rankPageSize}
            onRankPageChange={hub.setRankPage}
            onRankPageSizeChange={hub.setRankPageSize}
          />
        )}
      </section>
    </div>
  )
}
