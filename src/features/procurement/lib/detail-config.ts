/**
 * Configuration for the shared `ProcurementDetailPage`, which serves the
 * procedure route. Contracts and direct purchases have pages of their own
 * (`components/contract/`, `components/direct-purchase/`).
 */
import { t } from '@lingui/core/macro'
import type { ProcedureRecord } from '@/schemas/procurement'
import { contractKindLabel } from './enum-labels'

/** Contracts and direct purchases have pages of their own. */
export type DetailGrainKey = 'procedures'

export type DetailRecord = ProcedureRecord

export type DetailRow = {
  readonly key: string
  readonly label: string
  readonly value: string | null
}

export type DetailConfig = {
  readonly grain: DetailGrainKey
  readonly pageLabel: () => string
  /** Label for the record's primary money slice. */
  readonly primaryValueLabel: () => string
  /** Label for the estimated-value slice (null = grain has none). */
  readonly secondaryValueLabel: (() => string) | null
  readonly identifierRows: (record: DetailRecord) => readonly DetailRow[]
  readonly lifecycleRows: (record: DetailRecord) => readonly DetailRow[]
  /** Procedure-only: render the contracts awarded under it. */
  readonly showRelatedContracts: boolean
}

export const DETAIL_CONFIG: Record<DetailGrainKey, DetailConfig> = {
  procedures: {
    grain: 'procedures',
    pageLabel: () => t`Procedure`,
    primaryValueLabel: () => t`Awarded value`,
    secondaryValueLabel: () => t`Estimated value`,
    identifierRows: (record) => {
      if (record.grain !== 'procedure') return []
      return [
        { key: 'noticeNo', label: t`Notice number`, value: record.noticeNo },
        {
          key: 'procedureType',
          label: t`Procedure type`,
          value: record.procedureType,
        },
        {
          key: 'contractKind',
          label: t`Contract kind`,
          value: record.contractKind
            ? contractKindLabel(record.contractKind)
            : null,
        },
        { key: 'county', label: t`County`, value: record.countyName },
      ]
    },
    lifecycleRows: (record) => {
      if (record.grain !== 'procedure') return []
      return [
        {
          key: 'publicationDate',
          label: t`Published`,
          value: record.publicationDate,
        },
        { key: 'stateDate', label: t`Last state change`, value: record.stateDate },
      ]
    },
    showRelatedContracts: true,
  },
}
