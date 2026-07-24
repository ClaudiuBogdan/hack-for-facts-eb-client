import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  hubStateToRankingScopeInput,
  resolveProcurementValueBasisPlan,
  scrubScopeForAnalysisGrain,
  type ProcurementHubState,
} from '@/schemas/procurement-hub'
import type { ProcurementGrain } from '@/schemas/procurement'
import { useProcurementBasisOverview } from '../hooks/use-procurement-data'
import type { ProcurementHubFilterState } from '../hooks/use-procurement-hub-state'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  procurementChoiceButtonActiveClassName,
  procurementChoiceButtonClassName,
  procurementSectionClassName,
} from '../lib/procurement-theme'
import { valueBasisMoneyLabel } from '../lib/value-basis-meta'
import { ProcurementAnswerabilityNotice } from './procurement-answerability-notice'
import { ProcurementCategoryBars } from './procurement-category-bars'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementMonthlyChart } from './procurement-monthly-chart'
import { ProcurementOverviewSkeleton } from './procurement-skeletons'
import { ProcurementPartyRanking } from './procurement-party-ranking'
import { ProcurementStatTile } from './procurement-stat-tile'
import { ProcurementValueBasisNotice } from './procurement-value-basis-notice'

type Props = {
  readonly hubState: ProcurementHubState
  readonly hub: ProcurementHubFilterState
}

function grainOptionLabel(grain: ProcurementGrain): string {
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

/**
 * Overview analytics for a NON-default value logic (vbasis ≠ awarded) or the
 * counts-only modifications population. The default awarded overview stays on
 * the untouched landing pipeline — this component never renders for it.
 */
export function ProcurementValueBasisOverview({ hubState, hub }: Props) {
  const plan = resolveProcurementValueBasisPlan(hubState)
  const { scope, dropped } = scrubScopeForAnalysisGrain(
    hubStateToRankingScopeInput(hubState),
    plan.analysisGrain,
  )
  const countsOnly = plan.valueMeasure === null
  const rankBy =
    plan.breakdowns === 'anchor' && hubState.measure === 'value_awarded'
      ? ('value' as const)
      : ('count' as const)

  const query = useProcurementBasisOverview(
    {
      analysisGrain: plan.analysisGrain,
      valueMeasure: plan.valueMeasure,
      breakdowns: plan.breakdowns,
      supplierDimension: plan.supplierDimension,
      scope,
      rankBy,
    },
    true,
  )
  const data = query.data

  const moneyLabel = valueBasisMoneyLabel(plan.vbasis)
  const basisMoneySum = data
    ? plan.vbasis === 'ceiling'
      ? data.stats.valueCeilingSum
      : plan.vbasis === 'mod_adjusted'
        ? data.stats.valueModAdjustedSum
        : plan.vbasis === 'estimated'
          ? data.stats.valueEstimatedSum
          : data.stats.valueAwardedSum
    : null
  // The displayed coverage verdict must be the SELECTED measure's own — the
  // block meta carries the anchor-money gate, which can differ (estimated
  // abstains while awarded discloses, mod-adjusted serves while awarded is
  // partial). Ceiling/call-off anchors coincide with the block meta.
  const basisVerdict =
    plan.valueMeasure !== null &&
    (plan.vbasis === 'estimated' || plan.vbasis === 'mod_adjusted')
      ? data?.stats.moneyVerdicts.find(
          (verdict) => verdict.measure === plan.valueMeasure,
        )
      : undefined
  // Composition law: a gate-BLOCKED block (time/geo abstain) stays abstained —
  // a money verdict computed independently must not resurrect it. Otherwise
  // the verdict's own answerability/reason/caveats replace the anchor-money
  // ones; block caveats are carried over ONLY for shape (time/geo)
  // degradation, never the anchor's unrelated money caveats.
  const blockGateBlocked = data?.stats.meta.answerability === 'abstained'
  const statsMeta = data
    ? basisVerdict && !blockGateBlocked
      ? {
          ...data.stats.meta,
          answerability: basisVerdict.answerability,
          reason: basisVerdict.reason,
          caveats: [
            ...new Set([
              ...basisVerdict.caveats,
              ...(data.stats.meta.reason === 'TIME_COVERAGE_DEGRADED' ||
              data.stats.meta.reason === 'GEO_COVERAGE_DEGRADED'
                ? data.stats.meta.caveats
                : []),
            ]),
          ],
        }
      : data.stats.meta
    : undefined
  const valueBoundsOnAnchor =
    (hubState.valueMin !== undefined || hubState.valueMax !== undefined) &&
    (plan.vbasis === 'estimated' || plan.vbasis === 'mod_adjusted')
  const chartMeasure =
    !countsOnly && hubState.measure === 'value_awarded'
      ? ('value_awarded' as const)
      : ('record_count' as const)

  // Breakdown cards over a scope-FIXED dimension are single buckets — hidden,
  // computed from the SCRUBBED scope so a dropped filter cannot hide a card.
  const showAuthorities = plan.breakdowns !== 'withheld' && !scope.authorityCui
  const showSuppliers =
    plan.breakdowns !== 'withheld' &&
    plan.supplierDimension &&
    !scope.supplierCui
  const showCategories =
    plan.breakdowns !== 'withheld' &&
    !scope.cpvDivision &&
    !scope.cpvGroup &&
    !scope.cpvClass &&
    !scope.cpvCategory &&
    !scope.cpvCode

  const breakdownDescription =
    plan.breakdowns === 'counts-only'
      ? t`By number of records. Amendment money is never ranked.`
      : plan.vbasis === 'calloff'
        ? t`Ranked by reported call-off value.`
        : plan.vbasis === 'estimated' || plan.vbasis === 'mod_adjusted'
          ? t`Rankings stay on awarded value (the population's anchor money); the selected value logic applies to the totals and the monthly chart.`
          : t`Ranked by awarded value.`

  return (
    <div className="space-y-6">
      <ProcurementValueBasisNotice
        vbasis={hubState.vbasis}
        droppedFilters={dropped}
        countsOnly={countsOnly}
        valueBoundsOnAnchor={valueBoundsOnAnchor}
      />

      {plan.grainOptions.length > 1 ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t`Record population`}
        >
          {plan.grainOptions.map((grain) => {
            const active = hubState.grain === grain
            return (
              <Button
                key={grain}
                type="button"
                variant="outline"
                aria-pressed={active}
                className={cn(
                  procurementChoiceButtonClassName,
                  active && procurementChoiceButtonActiveClassName,
                )}
                onClick={() => hub.updateFilters({ grain })}
              >
                {grainOptionLabel(grain)}
              </Button>
            )
          })}
        </div>
      ) : null}

      {query.isPending && !data ? (
        <ProcurementOverviewSkeleton />
      ) : query.isError && !data ? (
        <ProcurementErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      ) : data && statsMeta ? (
        <>
          <ProcurementAnswerabilityNotice meta={statsMeta} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ProcurementStatTile
              label={t`Records`}
              value={
                data.stats.recordCount !== null
                  ? formatFlowCount(data.stats.recordCount)
                  : '—'
              }
            />
            {!countsOnly ? (
              <>
                <ProcurementStatTile
                  label={moneyLabel}
                  value={
                    basisMoneySum !== null ? formatRon(basisMoneySum, 'compact') : '—'
                  }
                  hint={
                    basisMoneySum === null
                      ? t`Withheld for this scope — no value substituted.`
                      : undefined
                  }
                />
                {/* The count must match the SELECTED value's population:
                    withValueCount follows the anchor (awarded) predicate, so
                    estimated shows withEstimatedCount and mod-adjusted shows
                    no count (the server publishes none for its population). */}
                {plan.vbasis !== 'mod_adjusted' ? (
                  <ProcurementStatTile
                    label={t`Records with this value`}
                    value={
                      plan.vbasis === 'estimated'
                        ? data.stats.withEstimatedCount !== null
                          ? formatFlowCount(data.stats.withEstimatedCount)
                          : '—'
                        : data.stats.withValueCount !== null
                          ? formatFlowCount(data.stats.withValueCount)
                          : '—'
                    }
                  />
                ) : null}
              </>
            ) : null}
            {plan.vbasis === 'mod_adjusted' || plan.vbasis === 'estimated' ? (
              <ProcurementStatTile
                label={t`Awarded value (comparison)`}
                value={
                  data.stats.valueAwardedSum !== null
                    ? formatRon(data.stats.valueAwardedSum, 'compact')
                    : '—'
                }
              />
            ) : null}
            {plan.vbasis === 'calloff' && data.stats.avgValueAwarded !== null ? (
              <ProcurementStatTile
                label={t`Average call-off value`}
                value={formatRon(data.stats.avgValueAwarded, 'compact')}
              />
            ) : null}
          </div>

          {plan.breakdowns === 'withheld' ? (
            <section className={cn(procurementSectionClassName, 'p-5 sm:p-6')}>
              <h2 className="text-lg font-black tracking-tight text-[var(--pnrr-fg)]">
                <Trans>Rankings and maps are withheld for framework ceilings</Trans>
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--pnrr-muted)]">
                <Trans>
                  Ceiling totals sliced by buyer, supplier or territory can
                  repeat the same framework's ceiling and materially mislead a
                  ranking, so only the overall total and the monthly series are
                  served. This unlocks once framework identities can be
                  clustered reliably.
                </Trans>
              </p>
            </section>
          ) : (
            <>
              <div className="grid items-start gap-6 lg:grid-cols-2">
                {showAuthorities ? (
                  <ProcurementPartyRanking
                    title={t`Top public buyers`}
                    description={breakdownDescription}
                    rows={data.topAuthorities}
                    kind="authority"
                    rankingsDim="buyer"
                    measure={countsOnly ? 'record_count' : hubState.measure}
                    rankedBy={data.meta.authoritiesRankedBy}
                  />
                ) : null}
                {showSuppliers ? (
                  <ProcurementPartyRanking
                    title={t`Top suppliers`}
                    description={breakdownDescription}
                    rows={data.topSuppliers}
                    kind="supplier"
                    rankingsDim="supplier"
                    measure={countsOnly ? 'record_count' : hubState.measure}
                    rankedBy={data.meta.suppliersRankedBy}
                  />
                ) : null}
              </div>

              {showCategories ? (
                <ProcurementCategoryBars
                  rows={data.topCategories}
                  rankingsDim="cpv"
                  measure={countsOnly ? 'record_count' : hubState.measure}
                  rankedBy={data.meta.categoriesRankedBy}
                  description={breakdownDescription}
                />
              ) : null}
            </>
          )}

          <ProcurementMonthlyChart
            points={data.monthly}
            measure={chartMeasure}
            valueLabel={moneyLabel}
            title={
              chartMeasure === 'value_awarded'
                ? t`Monthly ${moneyLabel.toLocaleLowerCase()}`
                : t`Monthly volume`
            }
            description={
              countsOnly
                ? t`Number of amendment records per month. Undated records are disclosed by the coverage notice, never guessed into a month.`
                : chartMeasure === 'value_awarded'
                  ? t`${moneyLabel} per month in RON. Tooltips and the table retain record counts for context.`
                  : t`Number of records per month.`
            }
          />
        </>
      ) : null}
    </div>
  )
}
