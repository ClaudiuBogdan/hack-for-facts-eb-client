import { t } from '@lingui/core/macro'
import type { MoneyValue, Party, ProcurementRecordSummary } from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import { moneyValueCurrency } from './formatting'

function escapeCsvCell(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const needsQuote = /[",\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

function moneyCell(value: MoneyValue): string {
  if (value.ron !== null) return String(value.ron)
  if (value.nativeValue !== null) return String(value.nativeValue)
  return ''
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

const EMPTY_MONEY: MoneyValue = {
  ron: null,
  nativeValue: null,
  currency: null,
  isOutlier: false,
}

function recordValue(record: ProcurementRecordSummary): MoneyValue {
  if ('value' in record) return record.value
  if ('awardedValue' in record) return record.awardedValue
  if ('valueDelta' in record) return record.valueDelta
  return EMPTY_MONEY
}

function recordAuthority(record: ProcurementRecordSummary): Party | undefined {
  switch (record.grain) {
    case 'procedure':
    case 'contract':
    case 'direct_acquisition':
      return record.authority
    case 'modification':
      return record.parentContract?.authority ?? undefined
  }
}

function recordSupplier(record: ProcurementRecordSummary): Party | undefined {
  switch (record.grain) {
    case 'contract':
    case 'direct_acquisition':
      return record.supplier
    case 'modification':
      return record.parentContract?.supplier ?? undefined
    case 'procedure':
      return undefined
  }
}

function recordTitle(record: ProcurementRecordSummary): string {
  switch (record.grain) {
    case 'procedure':
    case 'contract':
      return record.title ?? ''
    case 'direct_acquisition':
      return ''
    case 'modification':
      return record.modificationType ?? ''
  }
}

/**
 * Build a CSV string (no BOM) for the current search page. The caller adds
 * the UTF-8 BOM (`\uFEFF`) on download, mirroring `PnrrExportButton`.
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
    t`Valoare nativă`,
    t`URL sursă`,
    ...partyColumns<ProcurementRecordSummary>(recordAuthority, recordSupplier).map((c) => c.label),
  ]

  const rows = records.map((r) => {
    const value = recordValue(r)
    const numberLabel =
      r.grain === 'procedure'
        ? r.noticeNo ?? ''
        : r.grain === 'contract'
          ? r.contractNo ?? ''
          : r.grain === 'direct_acquisition'
            ? r.uniqueCode ?? ''
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
    const sourceUrl = 'provenance' in r ? r.provenance.sourceUrl ?? '' : ''
    const party = partyColumns<ProcurementRecordSummary>(recordAuthority, recordSupplier)

    return [
      r.grain,
      r.id,
      recordTitle(r),
      numberLabel,
      date,
      cpv,
      'status' in r ? r.status : '',
      'provenance' in r ? r.provenance.sourceSystem : '',
      moneyCell(value),
      moneyValueCurrency(value),
      value.nativeValue !== null ? String(value.nativeValue) : '',
      sourceUrl,
      ...party.map((c) => c.value(r)),
    ].map((cell) => escapeCsvCell(String(cell)))
  })

  return [header.map(escapeCsvCell).join(','), ...rows.map((row) => row.join(','))].join('\n')
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
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
