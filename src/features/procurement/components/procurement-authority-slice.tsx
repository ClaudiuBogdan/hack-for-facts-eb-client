import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { AuthorityProcurementSlice as AuthoritySliceData } from '@/schemas/procurement'
import { useProcurementAuthoritySlice } from '../hooks/use-procurement-data'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
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
import { ProcurementAnswerabilityNotice } from './procurement-answerability-notice'
import {
  ProcurementAnalysisGrainToggle,
  type FlowAnalysisGrain,
} from './procurement-analysis-grain-toggle'

type Props = {
  readonly authorityCui: string
  readonly initialSlice?: AuthoritySliceData
  readonly className?: string
  /** When true, hide the deep-link to the dedicated institution page. */
  readonly embedded?: boolean
}

/**
 * Buyer-side procurement slice — used on `/entities/$cui?view=contracts` and
 * reused by the dedicated institution page.
 */
export function ProcurementAuthoritySlice({
  authorityCui,
  initialSlice,
  className,
  embedded = false,
}: Props) {
  const query = useProcurementAuthoritySlice(authorityCui, initialSlice)
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
    slice.summary.directAcquisitionsCount === '0' &&
    (slice.summary.proceduresCount === null ||
      slice.summary.proceduresCount === '0')

  if (isEmpty) {
    return (
      <p className={cn('text-sm text-[var(--pnrr-muted)]', className)}>
        <Trans>
          This institution does not appear as a buyer in the procurement data.
        </Trans>
      </p>
    )
  }

  return (
    <SliceContent slice={slice} className={className} embedded={embedded} />
  )
}

function SliceContent({
  slice,
  className,
  embedded,
}: {
  readonly slice: AuthoritySliceData
  readonly className?: string
  readonly embedded: boolean
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
        aria-label={t`Authority procurement indicators`}
      >
        <ProcurementStatTile
          label={t`Spend (RON)`}
          value={
            slice.summary.totalSpendRon !== null
              ? formatRon(slice.summary.totalSpendRon, 'compact')
              : '—'
          }
          hint={t`partial sum, values are not payments`}
        />
        <ProcurementStatTile
          label={t`Contracts`}
          value={
            slice.summary.contractsCount === null
              ? '—'
              : formatFlowCount(slice.summary.contractsCount)
          }
        />
        <ProcurementStatTile
          label={t`Direct acquisitions`}
          value={
            slice.summary.directAcquisitionsCount === null
              ? '—'
              : formatFlowCount(slice.summary.directAcquisitionsCount)
          }
        />
        <ProcurementStatTile
          label={t`Procedures`}
          value={
            slice.summary.proceduresCount === null
              ? '—'
              : formatFlowCount(slice.summary.proceduresCount)
          }
        />
      </section>

      <div className="flex justify-start">
        <ProcurementAnalysisGrainToggle value={grain} onChange={setGrain} />
      </div>

      <ProcurementAnswerabilityNotice meta={analytics.stats.meta} />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ProcurementPartyRanking
          title={t`Top suppliers`}
          description={t`By number of records.`}
          rows={analytics.topSuppliers}
          kind="supplier"
          pairScope={{ kind: 'authority', cui: slice.authorityCui }}
          grain={grain}
        />
        <ProcurementCategoryBars
          rows={analytics.topCategories}
          title={t`Categories purchased`}
          description={t`By number of records.`}
        />
      </div>

      <ProcurementMonthlyChart
        points={analytics.monthly}
        title={t`Purchases over time`}
        description={t`Records per month for this public buyer.`}
      />

      {slice.recentRecords.length > 0 ? (
        <section className="space-y-2">
          <h2 className={procurementSectionLabelClassName}>
            <Trans>Recent contracts</Trans>
          </h2>
          <ProcurementRecordList records={slice.recentRecords} />
        </section>
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <Link
          to="/procurement"
          search={{ view: 'list', authority_cui: slice.authorityCui }}
          className={procurementUnderlineLinkClassName}
        >
          <Trans>Search all records for this institution</Trans>
        </Link>
        {embedded ? (
          <Link
            to="/procurement/institutions/$cui"
            params={{ cui: slice.authorityCui }}
            className={procurementUnderlineLinkClassName}
          >
            <Trans>Open full procurement profile</Trans>
          </Link>
        ) : null}
      </div>
    </div>
  )
}
