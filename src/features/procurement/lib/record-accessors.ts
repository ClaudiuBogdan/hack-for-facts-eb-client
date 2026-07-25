/**
 * Per-grain field access for the `ProcurementRecordSummary` discriminated
 * union — the single place that knows which column carries a record's title,
 * date, number, parties or money. Consumed by the record card, the detail
 * page and the CSV export (previously three divergent switch copies).
 */
import type {
  MoneyFields,
  Party,
  ProcurementGrain,
  ProcurementRecordSummary,
  ProcurementStatus,
} from '@/schemas/procurement'

export function recordTitle(record: ProcurementRecordSummary): string | null {
  switch (record.grain) {
    case 'procedure':
    case 'direct_acquisition':
      return record.title
    case 'contract':
      return record.displayTitle?.text ?? null
    case 'modification':
      return record.modificationType
  }
}

/** The record's primary chronology date (what lists sort by). */
export function recordDate(record: ProcurementRecordSummary): string | null {
  switch (record.grain) {
    case 'procedure':
      return record.publicationDate ?? record.stateDate
    case 'contract':
      return record.contractDate
    case 'direct_acquisition':
      return record.publicationDate ?? record.finalizationDate
    case 'modification':
      return record.modificationDate
  }
}

/** The human identifier (notice no / contract no / unique code). */
export function recordNumberLabel(
  record: ProcurementRecordSummary,
): string | null {
  switch (record.grain) {
    case 'procedure':
      return record.noticeNo
    case 'contract':
      return record.contractNo ?? record.noticeNo
    case 'direct_acquisition':
      return record.uniqueCode
    case 'modification':
      return record.contractNo ?? record.noticeNo
  }
}

export function recordAuthority(record: ProcurementRecordSummary): Party {
  return record.authority
}

export function recordSupplier(
  record: ProcurementRecordSummary,
): Party | null {
  switch (record.grain) {
    case 'contract':
    case 'direct_acquisition':
    case 'modification':
      return record.supplier
    case 'procedure':
      return null
  }
}

/**
 * The primary money slice: awarded value for procedures, contract/DA value,
 * the (possibly negative) delta for modifications. Null when nothing usable.
 */
export function recordPrimaryMoney(
  record: ProcurementRecordSummary,
): MoneyFields | null {
  switch (record.grain) {
    case 'procedure':
      // The awarded value carries the row's resolution.
      return {
        valueRon: record.awardedValueRon,
        currency: record.currency,
        value: record.value,
      }
    case 'contract':
    case 'direct_acquisition':
      return {
        valueRon: record.valueRon,
        currency: record.currency,
        value: record.value,
      }
    case 'modification':
      // A modification delta is a plain RON figure — no resolution.
      return record.valueDeltaRon !== null
        ? {
            valueRon: record.valueDeltaRon,
            currency: null,
            value: null,
          }
        : null
  }
}

/** The secondary money slice (estimated value), where the grain has one. */
export function recordSecondaryMoney(
  record: ProcurementRecordSummary,
): MoneyFields | null {
  // The estimated value is a raw figure with no per-value resolution (`value:
  // null` → shown plainly, never with a state badge).
  switch (record.grain) {
    case 'procedure':
      return record.estimatedValueRon !== null
        ? {
            valueRon: record.estimatedValueRon,
            currency: record.currency,
            value: null,
          }
        : null
    case 'contract':
    case 'direct_acquisition':
      return record.estimatedValueRon !== null
        ? {
            valueRon: record.estimatedValueRon,
            currency: record.currency,
            value: null,
          }
        : null
    case 'modification':
      return null
  }
}

export function recordCpv(record: ProcurementRecordSummary): string | null {
  return 'cpvCode' in record ? record.cpvCode : null
}

export function recordStatus(
  record: ProcurementRecordSummary,
): ProcurementStatus | null {
  return 'status' in record ? record.status : null
}

export function recordSourceSystem(
  record: ProcurementRecordSummary,
): string | null {
  return 'sourceSystem' in record ? record.sourceSystem : null
}

export function recordSourceUrl(
  record: ProcurementRecordSummary,
): string | null {
  return 'sourceUrl' in record ? record.sourceUrl : null
}

/** UI search grain (plural route vocabulary) for a record union member. */
export function uiGrainOf(record: ProcurementRecordSummary): ProcurementGrain {
  switch (record.grain) {
    case 'procedure':
      return 'procedures'
    case 'contract':
      return 'contracts'
    case 'direct_acquisition':
      return 'direct_acquisitions'
    case 'modification':
      return 'modifications'
  }
}

export type RecordDetailLink = {
  readonly to:
    | '/procurement/procedures/$id'
    | '/procurement/contracts/$id'
    | '/procurement/direct-acquisitions/$id'
  readonly params: { readonly id: string }
  readonly hash?: string
}

/**
 * Where a record card navigates. Modifications link to their parent
 * contract's trail anchor; an unlinked modification has no destination
 * (`null` → the card renders non-navigable with an explanation).
 */
export function recordDetailLink(
  record: ProcurementRecordSummary,
): RecordDetailLink | null {
  switch (record.grain) {
    case 'procedure':
      return { to: '/procurement/procedures/$id', params: { id: record.id } }
    case 'contract':
      return { to: '/procurement/contracts/$id', params: { id: record.id } }
    case 'direct_acquisition':
      return {
        to: '/procurement/direct-acquisitions/$id',
        params: { id: record.id },
      }
    case 'modification':
      return record.contractId !== null
        ? {
            to: '/procurement/contracts/$id',
            params: { id: record.contractId },
            hash: 'modificari',
          }
        : null
  }
}
