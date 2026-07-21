import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  type SupplierProcurementSlice as SupplierSliceData,
} from '@/schemas/procurement'
import {
  useProcurementSupplierRecords,
  useProcurementSupplierSlice,
} from '../hooks/use-procurement-data'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  procurementChipClassName,
  procurementOutlineButtonClassName,
  procurementSectionLabelClassName,
  procurementUnderlineLinkClassName,
} from '../lib/procurement-theme'
import { ProcurementStatTile } from './procurement-stat-tile'
import { ProcurementPartyRanking } from './procurement-party-ranking'
import { ProcurementCategoryBars } from './procurement-category-bars'
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
}

/**
 * Procurement slice embedded in company profiles (`private-company-achizitii-tab`).
 * Import path and export name are stable — the company feature needs no edits.
 */
export function ProcurementSupplierSlice({ supplierCui, className }: Props) {
  const query = useProcurementSupplierSlice(supplierCui)
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

  return <SliceContent slice={slice} className={className} />
}

function SliceContent({
  slice,
  className,
}: {
  readonly slice: SupplierSliceData
  readonly className?: string
}) {
  const [grain, setGrain] = useState<FlowAnalysisGrain>('direct_acquisition')
  const analytics =
    grain === 'contract'
      ? slice.analysisByGrain.contract
      : slice.analysisByGrain.directAcquisition

  return (
    <div className={cn('space-y-5', className)}>
      <section
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
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

      <div className="flex justify-end">
        <ProcurementAnalysisGrainToggle value={grain} onChange={setGrain} />
      </div>

      <ProcurementAnswerabilityNotice meta={analytics.stats.meta} />

      <div className="grid gap-5 lg:grid-cols-2">
        <ProcurementPartyRanking
          title={t`Top public buyers`}
          description={t`By number of records.`}
          rows={analytics.topAuthorities}
          kind="authority"
          pairScope={{ kind: 'supplier', cui: slice.supplierCui }}
          grain={grain}
        />
        <ProcurementCategoryBars
          rows={analytics.topCategories}
          title={t`Categories supplied`}
          description={t`By number of records.`}
        />
      </div>

      <ProcurementMonthlyChart
        points={analytics.monthly}
        title={t`Public revenue over time`}
        description={t`Records per month for this supplier.`}
      />

      <SupplierRecords supplierCui={slice.supplierCui} />

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
