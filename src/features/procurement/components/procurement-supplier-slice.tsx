import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  type SupplierProcurementSlice as SupplierSliceData,
} from '@/schemas/procurement'
import type { ProcurementSliceScope } from '../api/procurement-api'
import {
  useProcurementSearch,
  useProcurementSupplierRecords,
  useProcurementSupplierSlice,
} from '../hooks/use-procurement-data'
import { withProcurementSearchDefaults } from '@/schemas/procurement-search'
import { monthEndDate } from '../lib/institution-scopes'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  procurementChipClassName,
  procurementOutlineButtonClassName,
  procurementSectionLabelClassName,
  procurementUnderlineLinkClassName,
} from '../lib/procurement-theme'
import { ProcurementStatTile } from './procurement-stat-tile'
import { ProcurementPartyRanking } from './procurement-party-ranking'
import {
  ProcurementCategoryBars,
  type CategorySelection,
} from './procurement-category-bars'
import { ProcurementMonthlyChart } from './procurement-monthly-chart'
import { ProcurementRecordList } from './procurement-record-card'
import { ProcurementErrorState } from './procurement-error-state'
import { SupplierSliceSkeleton } from './procurement-skeletons'
import { CpvLabel } from './cpv-label'
import { ProcurementAnswerabilityNotice } from './procurement-answerability-notice'
import {
  ProcurementAnalysisGrainToggle,
  type FlowAnalysisGrain,
} from './procurement-analysis-grain-toggle'

type Props = {
  readonly supplierCui: string
  readonly className?: string
  /** Profile quick filters; omit for the all-time slice (company embed). */
  readonly scope?: ProcurementSliceScope
  /**
   * Controlled analysis population. The supplier profile owns the selection
   * (its tabs ARE the switcher), so the slice must not carry a second toggle
   * with its own state.
   */
  readonly analysis?: { readonly grain: FlowAnalysisGrain }
  /** Makes the CPV breakdown card the page's category filter. */
  readonly categoryFilter?: CategorySelection
}

/**
 * Procurement slice embedded in company profiles (`private-company-achizitii-tab`).
 * Import path and export name are stable — the company feature needs no edits.
 */
export function ProcurementSupplierSlice({
  supplierCui,
  className,
  scope,
  analysis,
  categoryFilter,
}: Props) {
  const query = useProcurementSupplierSlice(supplierCui, scope)
  const slice = query.data

  if (query.isPending) {
    return <SupplierSliceSkeleton />
  }
  if (query.isError && !slice) {
    return (
      <ProcurementErrorState
        compact
        error={query.error}
        onRetry={() => void query.refetch()}
        isRetrying={query.isRefetching}
        className={className}
      />
    )
  }
  if (!slice) return null

  const isEmpty =
    slice.summary.contractsCount === '0' &&
    slice.summary.directAcquisitionsCount === '0'

  if (isEmpty) {
    return (
      <p className={cn('text-sm text-[var(--pnrr-muted)]', className)}>
        <Trans>
          This company does not appear as a supplier in the procurement data.
        </Trans>
      </p>
    )
  }

  return (
    <SliceContent
      slice={slice}
      className={className}
      scope={scope}
      analysis={analysis}
      categoryFilter={categoryFilter}
    />
  )
}

function SliceContent({
  slice,
  className,
  scope,
  analysis,
  categoryFilter,
}: {
  readonly slice: SupplierSliceData
  readonly className?: string
  readonly scope?: ProcurementSliceScope
  readonly analysis?: { readonly grain: FlowAnalysisGrain }
  readonly categoryFilter?: CategorySelection
}) {
  const [ownGrain, setOwnGrain] = useState<FlowAnalysisGrain>(
    'direct_acquisition',
  )
  const grain = analysis?.grain ?? ownGrain
  const analytics =
    grain === 'contract'
      ? slice.analysisByGrain.contract
      : slice.analysisByGrain.directAcquisition

  // Money is what a reader is here for; the gate reports whether it could
  // actually order by value, and the cards label themselves from that.
  const suppliersByValue = analytics.meta.authoritiesRankedBy === 'value'
  const categoriesByValue = analytics.meta.categoriesRankedBy === 'value'
  const valueSeriesServed =
    analytics.meta.valueSeries.answerability !== 'abstained'
  const rankingsSearch = analysis
    ? {
        supplier_cui: slice.supplierCui,
        ...(scope?.monthFrom ? { dateFrom: `${scope.monthFrom}-01` } : {}),
        ...(scope?.monthTo ? { dateTo: monthEndDate(scope.monthTo) } : {}),
        ...(scope?.cpvDivision ? { cpv_division: scope.cpvDivision } : {}),
      }
    : undefined

  return (
    <div className={cn('space-y-5', className)}>
      <section
        className={cn(
          'grid grid-cols-2 gap-3 md:grid-cols-4',
          analysis ? 'hidden' : '',
        )}
        aria-label={t`Supplier procurement indicators`}
      >
        <ProcurementStatTile
          label={t`Public revenue (RON)`}
          value={
            slice.summary.totalPublicRevenueRon !== null
              ? formatRon(slice.summary.totalPublicRevenueRon, 'compact')
              : '—'
          }
          hint={t`partial sum, values are not payments`}
        />
        <ProcurementStatTile
          label={t`Public buyers`}
          value={slice.summary.buyersCount === null ? '—' : formatFlowCount(slice.summary.buyersCount)}
        />
        <ProcurementStatTile
          label={t`Contracts`}
          value={slice.summary.contractsCount === null ? '—' : formatFlowCount(slice.summary.contractsCount)}
        />
        <ProcurementStatTile
          label={t`Direct acquisitions`}
          value={slice.summary.directAcquisitionsCount === null ? '—' : formatFlowCount(slice.summary.directAcquisitionsCount)}
        />
      </section>

      {analysis === undefined ? (
        <div className="flex justify-start">
          <ProcurementAnalysisGrainToggle
            value={grain}
            onChange={setOwnGrain}
          />
        </div>
      ) : null}

      <ProcurementAnswerabilityNotice metas={[analytics.stats.meta]} />

      {/* No `items-start`: the two cards share a row and must share a height,
          so their footers line up when collapsed. */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ProcurementPartyRanking
          title={t`Cumpărători`}
          measure="value_awarded"
          rankedBy={analytics.meta.authoritiesRankedBy}
          description={
            suppliersByValue
              ? t`După valoarea atribuită.`
              : t`Clasamentul pe valoare nu este disponibil aici, așa că ordinea este dată de numărul de înregistrări.`
          }
          rows={analytics.topAuthorities}
          kind="authority"
          pairScope={{ kind: 'supplier', cui: slice.supplierCui }}
          grain={grain}
          {...(rankingsSearch
            ? { rankingsDim: 'buyer' as const, rankingsSearch }
            : {})}
        />
        <ProcurementCategoryBars
          rows={analytics.topCategories}
          title={t`Categorii livrate`}
          measure="value_awarded"
          rankedBy={analytics.meta.categoriesRankedBy}
          description={
            categoriesByValue
              ? t`După valoarea atribuită.`
              : t`Clasamentul pe valoare nu este disponibil aici, așa că ordinea este dată de numărul de înregistrări.`
          }
          select={categoryFilter}
          {...(rankingsSearch
            ? { rankingsDim: 'cpv' as const, rankingsSearch }
            : {})}
        />
      </div>

      <ProcurementMonthlyChart
        points={analytics.monthly}
        title={t`Venit public în timp`}
        measure={valueSeriesServed ? 'value_awarded' : 'record_count'}
        description={
          valueSeriesServed
            ? t`Valoare atribuită pe lună pentru acest furnizor.`
            : t`Înregistrări pe lună — seria pe valoare nu este disponibilă pentru această selecție.`
        }
      />

      {analysis ? (
        <ScopedSupplierRecords
          supplierCui={slice.supplierCui}
          grain={grain}
          scope={scope}
        />
      ) : (
        <SupplierRecords supplierCui={slice.supplierCui} />
      )}

      <CrossDomainChips slice={slice} />

      <div>
        <Link
          to="/procurement"
          search={{ view: 'list', supplier_cui: slice.supplierCui }}
          className={procurementUnderlineLinkClassName}
        >
          <Trans>Search all records for this supplier</Trans>
        </Link>
        {' · '}
        <Link
          to="/procurement/suppliers/$cui"
          params={{ cui: slice.supplierCui }}
          className={procurementUnderlineLinkClassName}
        >
          <Trans>Open full procurement profile</Trans>
        </Link>
      </div>
    </div>
  )
}

/**
 * Recent records for the SELECTED population. The cursor list below spans both
 * grains, so a profile whose tab says "Achiziții directe" has to re-ask —
 * otherwise the heading sits over contract rows.
 */
function ScopedSupplierRecords({
  supplierCui,
  grain,
  scope,
}: {
  readonly supplierCui: string
  readonly grain: FlowAnalysisGrain
  readonly scope?: ProcurementSliceScope
}) {
  const query = useProcurementSearch(
    withProcurementSearchDefaults({
      grain: grain === 'contract' ? 'contracts' : 'direct_acquisitions',
      supplier_cui: supplierCui,
      ...(scope?.monthFrom ? { dateFrom: `${scope.monthFrom}-01` } : {}),
      ...(scope?.monthTo ? { dateTo: monthEndDate(scope.monthTo) } : {}),
      ...(scope?.cpvDivision ? { cpv_division: scope.cpvDivision } : {}),
      sort: 'date_desc',
      page: 1,
      pageSize: 10,
    }),
  )
  const records = query.data?.records ?? []
  if (records.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className={procurementSectionLabelClassName}>
        <Trans>
          Înregistrări recente ·{' '}
          {grain === 'contract' ? t`Contracte` : t`Achiziții directe`}
        </Trans>
      </h2>
      <ProcurementRecordList records={records} />
    </section>
  )
}

/** Cursor-paged recent records with a "load more" button. */
function SupplierRecords({ supplierCui }: { readonly supplierCui: string }) {
  const query = useProcurementSupplierRecords(supplierCui)
  const records = query.data?.pages.flatMap((page) => page.records) ?? []

  if (query.isPending || records.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className={procurementSectionLabelClassName}>
        <Trans>Recent records</Trans>
      </h2>
      <ProcurementRecordList records={records} />
      {query.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          className={cn(procurementOutlineButtonClassName, 'w-full sm:w-auto px-6')}
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? (
            <Trans>Loading…</Trans>
          ) : (
            <Trans>Load more records</Trans>
          )}
        </Button>
      ) : null}
    </section>
  )
}

/** Hidden entirely when `crossDomain` is null (unknown — never fabricated). */
function CrossDomainChips({ slice }: { readonly slice: SupplierSliceData }) {
  const crossDomain = slice.crossDomain
  if (crossDomain === null) return null

  const chips = [
    { key: 'pnrr', label: t`PNRR`, available: crossDomain.pnrr },
    {
      key: 'investments',
      label: t`Public investments`,
      available: crossDomain.publicInvestments,
    },
    { key: 'litigation', label: t`Litigation`, available: crossDomain.litigation },
    { key: 'flows', label: t`Money flows`, available: crossDomain.moneyFlows },
  ].filter((chip) => chip.available)

  if (chips.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className={procurementSectionLabelClassName}>
        <Trans>Also appears in</Trans>
      </h2>
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.key} className={procurementChipClassName}>
            {chip.label}
          </li>
        ))}
      </ul>
    </section>
  )
}

export { CpvLabel }
