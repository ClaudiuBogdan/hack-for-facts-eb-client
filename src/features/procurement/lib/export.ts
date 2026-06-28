import { t } from '@lingui/core/macro'
import type {
  MoneyFields,
  Party,
  ProcurementRecordSummary,
} from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import { moneyValueCurrency } from './formatting'

function escapeCsvCell(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const needsQuote = /[",\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

type Column<T> = {
  readonly key: string
  readonly label: string
  readonly value: (record: T) => string
}

function partyColumns<T>(
  getAuthority: (r: T) => Party | undefined,
  getSupplier: (r: T) => Party | undefined,
): Column<T>[] {
  return [
    {
      key: 'authority_name',
      label: t`Autoritate`,
      value: (r) => {
        const p = getAuthority(r)
        return p?.displayName ?? p?.name ?? p?.cui ?? ''
      },
    },
    {
      key: 'authority_cui',
      label: t`CUI autoritate`,
      value: (r) => getAuthority(r)?.cui ?? '',
    },
    {
      key: 'supplier_name',
      label: t`Furnizor`,
      value: (r) => {
        const p = getSupplier(r)
        return p?.displayName ?? p?.name ?? p?.cui ?? ''
      },
    },
    {
      key: 'supplier_cui',
      label: t`CUI furnizor`,
      value: (r) => getSupplier(r)?.cui ?? '',
    },
  ]
}

const EMPTY_MONEY: MoneyFields = {
  valueRon: null,
  currency: null,
  isRon: false,
  valueSuspect: false,
}

/** The primary money slice for a record (flat fields → renderer slice). */
function recordMoney(record: ProcurementRecordSummary): MoneyFields {
  switch (record.grain) {
    case 'contract':
    case 'direct_acquisition':
      return {
        valueRon: record.valueRon,
        currency: record.currency,
        isRon: record.isRon,
        valueSuspect: record.valueSuspect,
      }
    case 'procedure':
      return {
        valueRon: record.awardedValueRon,
        currency: record.currency,
        isRon: record.isRon,
        valueSuspect: record.valueSuspect,
      }
    case 'modification':
      // Modification deltas are RON-only decimal strings.
      return {
        valueRon: record.valueDeltaRon,
        currency: 'RON',
        isRon: true,
        valueSuspect: false,
      }
    default:
      return EMPTY_MONEY
  }
}

function recordAuthority(record: ProcurementRecordSummary): Party | undefined {
  switch (record.grain) {
    case 'procedure':
    case 'contract':
    case 'direct_acquisition':
    case 'modification':
      return record.authority
  }
}

function recordSupplier(record: ProcurementRecordSummary): Party | undefined {
  switch (record.grain) {
    case 'contract':
    case 'direct_acquisition':
    case 'modification':
      return record.supplier
    case 'procedure':
      return undefined
  }
}

function recordTitle(record: ProcurementRecordSummary): string {
  switch (record.grain) {
    case 'procedure':
    case 'contract':
    case 'direct_acquisition':
      return record.title ?? ''
    case 'modification':
      return record.modificationType ?? ''
  }
}

function recordSourceSystem(record: ProcurementRecordSummary): string {
  return 'sourceSystem' in record ? record.sourceSystem : ''
}

/**
 * Build a CSV string (no BOM) for the current search page. The caller adds
 * the UTF-8 BOM on download, mirroring `PnrrExportButton`.
 */
export function buildProcurementSearchCsv(
  records: readonly ProcurementRecordSummary[],
  _params: ProcurementSearchState,
): string {
  const header = [
    t`Grain`,
    t`ID`,
    t`Titlu`,
    t`Număr`,
    t`Dată`,
    t`CPV`,
    t`Stadiu`,
    t`Sursă`,
    t`Valoare (RON)`,
    t`Monedă`,
    t`URL sursă`,
    ...partyColumns<ProcurementRecordSummary>(
      recordAuthority,
      recordSupplier,
    ).map((c) => c.label),
  ]

  const rows = records.map((r) => {
    const money = recordMoney(r)
    const numberLabel =
      r.grain === 'procedure'
        ? r.noticeNo ?? ''
        : r.grain === 'contract'
          ? r.contractNo ?? ''
          : r.grain === 'direct_acquisition'
            ? r.uniqueCode ?? ''
            : r.grain === 'modification'
              ? r.contractNo ?? ''
              : ''
    const date =
      r.grain === 'procedure'
        ? r.publicationDate ?? r.stateDate ?? ''
        : r.grain === 'contract'
          ? r.contractDate ?? ''
          : r.grain === 'direct_acquisition'
            ? r.publicationDate ?? r.finalizationDate ?? ''
            : r.grain === 'modification'
              ? r.modificationDate ?? ''
              : ''
    const cpv = 'cpvCode' in r ? r.cpvCode ?? '' : ''
    const sourceUrl = 'sourceUrl' in r ? r.sourceUrl ?? '' : ''
    const party = partyColumns<ProcurementRecordSummary>(
      recordAuthority,
      recordSupplier,
    )

    return [
      r.grain,
      r.id,
      recordTitle(r),
      numberLabel,
      date,
      cpv,
      'status' in r ? r.status : '',
      recordSourceSystem(r),
      money.valueRon ?? '',
      moneyValueCurrency(money),
      sourceUrl,
      ...party.map((c) => c.value(r)),
    ].map((cell) => escapeCsvCell(String(cell)))
  })

  return [
    header.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')
}

export function buildProcurementSearchFilename(
  grain: string,
  dataAsOf: string | null,
): string {
  const stamp = dataAsOf ?? new Date().toISOString().slice(0, 10)
  return `achizitii-${grain}-${stamp}.csv`
}

/**
 * Download a CSV string with a UTF-8 BOM (so Excel on Windows reads
 * diacritics). Mirrors `PnrrExportButton`.
 */
export function downloadProcurementCsv(csv: string, filename: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
