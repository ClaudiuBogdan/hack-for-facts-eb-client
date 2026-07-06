/**
 * Per-grain configuration for the shared `ProcurementDetailPage` — the three
 * detail routes differ by *fields*, not layout, so one config map replaces
 * three near-identical page implementations.
 */
import { t } from '@lingui/core/macro'
import type {
  ContractRecord,
  DirectAcquisitionRecord,
  ProcedureRecord,
} from '@/schemas/procurement'
import { contractKindLabel } from './enum-labels'

export type DetailGrainKey =
  | 'procedures'
  | 'contracts'
  | 'direct_acquisitions'

export type DetailRecord =
  | ProcedureRecord
  | ContractRecord
  | DirectAcquisitionRecord

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
  /** Contract-only: render the modification trail (anchor `#modificari`). */
  readonly showModificationTrail: boolean
  /** Procedure-only: render the contracts awarded under it. */
  readonly showRelatedContracts: boolean
  /** Contract-only: render the source procedure link. */
  readonly showSourceProcedure: boolean
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
    showModificationTrail: false,
    showRelatedContracts: true,
    showSourceProcedure: false,
  },
  contracts: {
    grain: 'contracts',
    pageLabel: () => t`Contract`,
    primaryValueLabel: () => t`Contract value`,
    secondaryValueLabel: () => t`Estimated value`,
    identifierRows: (record) => {
      if (record.grain !== 'contract') return []
      return [
        { key: 'contractNo', label: t`Contract number`, value: record.contractNo },
        { key: 'noticeNo', label: t`Notice number`, value: record.noticeNo },
      ]
    },
    lifecycleRows: (record) => {
      if (record.grain !== 'contract') return []
      return [
        { key: 'contractDate', label: t`Signed`, value: record.contractDate },
      ]
    },
    showModificationTrail: true,
    showRelatedContracts: false,
    showSourceProcedure: true,
  },
  direct_acquisitions: {
    grain: 'direct_acquisitions',
    pageLabel: () => t`Direct acquisition`,
    primaryValueLabel: () => t`Value`,
    secondaryValueLabel: () => t`Estimated value`,
    identifierRows: (record) => {
      if (record.grain !== 'direct_acquisition') return []
      return [
        { key: 'uniqueCode', label: t`Unique code`, value: record.uniqueCode },
        { key: 'county', label: t`County`, value: record.countyName },
      ]
    },
    lifecycleRows: (record) => {
      if (record.grain !== 'direct_acquisition') return []
      return [
        {
          key: 'publicationDate',
          label: t`Published`,
          value: record.publicationDate,
        },
        {
          key: 'finalizationDate',
          label: t`Finalized`,
          value: record.finalizationDate,
        },
      ]
    },
    showModificationTrail: false,
    showRelatedContracts: false,
    showSourceProcedure: false,
  },
}
