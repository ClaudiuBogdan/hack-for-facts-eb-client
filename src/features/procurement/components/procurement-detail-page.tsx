import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RequestDatasetAction } from '@/components/shared/procurement-data/request-dataset-action'
import { SourceProvenanceDrawer } from '@/components/shared/procurement-data/source-provenance-drawer'
import {
  type ProcurementRecordDetail,
  type ProvenanceInfo,
} from '@/schemas/procurement'
import { DETAIL_CONFIG, type DetailGrainKey, type DetailRecord } from '../lib/detail-config'
import { recordDate, recordSupplier } from '../lib/record-accessors'
import { sourceSystemLabel } from '../lib/enum-labels'
import { PROCUREMENT_DATASET_ID } from '../lib/dataset'
import {
  ProcurementDetailHero,
  ProcurementKeyFactsSection,
  ProcurementModificationTrail,
  ProcurementPartiesSection,
  ProcurementRelatedRecords,
} from './procurement-detail-sections'

type Props = {
  readonly grain: DetailGrainKey
  readonly detail: ProcurementRecordDetail<DetailRecord>
  readonly className?: string
}

function buildProvenance(record: DetailRecord): ProvenanceInfo {
  return {
    sourceLabel: sourceSystemLabel(record.sourceSystem),
    sourceUrl: record.sourceUrl,
    scraperRef: PROCUREMENT_DATASET_ID,
    retrievedAt: null,
    publishedAt: recordDate(record),
    parserNotes: [
      t`Non-RON values have no RON amount; the currency code is shown instead.`,
      t`Party names may carry source artifacts (own-CUI prefixes, separators) and are shown cleaned.`,
    ],
  }
}

/**
 * Shared detail page for the three record grains, driven by `DETAIL_CONFIG`
 * (replaces three near-identical page implementations). Breadcrumb → hero →
 * parties → key facts → per-grain sections → provenance footer.
 */
export function ProcurementDetailPage({ grain, detail, className }: Props) {
  const config = DETAIL_CONFIG[grain]
  const record = detail.record

  return (
    <div className={cn('mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8', className)}>
      <nav aria-label={t`Breadcrumb`} className="flex flex-wrap items-center gap-1 text-sm text-[var(--pnrr-muted)]">
        <Link
          to="/procurement"
          className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
        >
          <Trans>Public procurement</Trans>
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link
          to="/procurement"
          search={{ view: 'list', grain: config.grain }}
          className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
        >
          {config.pageLabel()}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[var(--pnrr-fg)]">{record.id}</span>
      </nav>

      <ProcurementDetailHero record={record} config={config} />

      <ProcurementPartiesSection
        authority={record.authority}
        supplier={recordSupplier(record)}
      />

      <ProcurementKeyFactsSection record={record} config={config} />

      {config.showModificationTrail ? (
        <ProcurementModificationTrail modifications={detail.related.modifications} />
      ) : null}

      <ProcurementRelatedRecords
        config={config}
        procedure={detail.related.procedure}
        contracts={detail.related.contracts}
        duplicates={detail.related.duplicates}
        perLotWinners={detail.related.perLotWinners}
        ted={detail.related.ted}
      />

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[var(--pnrr-border)] pt-4">
        <SourceProvenanceDrawer provenance={buildProvenance(record)} />
        <RequestDatasetAction dataset={PROCUREMENT_DATASET_ID} />
      </footer>
    </div>
  )
}
