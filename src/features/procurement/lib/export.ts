import { t } from '@lingui/core/macro'
import type { ProcurementRecordSummary } from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import { moneyValueCurrency } from './formatting'
import {
  recordAuthority,
  recordCpv,
  recordDate,
  recordNumberLabel,
  recordPrimaryMoney,
  recordSourceSystem,
  recordSourceUrl,
  recordStatus,
  recordSupplier,
  recordTitle,
} from './record-accessors'

function escapeCsvCell(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const needsQuote = /[",\n\r]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

/**
 * Build a CSV string (no BOM) for the current search page. Field access goes
 * through `record-accessors` (the same per-grain logic the card and detail
 * page use). The caller adds the UTF-8 BOM on download, mirroring
 * `PnrrExportButton`.
 */
export function buildProcurementSearchCsv(
  records: readonly ProcurementRecordSummary[],
  _params: ProcurementSearchState,
): string {
  const header = [
    t`Grain`,
    t`ID`,
    t`Title`,
    t`Number`,
    t`Date`,
    t`CPV`,
    t`Status`,
    t`Source`,
    t`Value (RON)`,
    t`Currency`,
    t`Source URL`,
    t`Authority`,
    t`Authority CUI`,
    t`Supplier`,
    t`Supplier CUI`,
  ]

  const rows = records.map((record) => {
    const money = recordPrimaryMoney(record)
    const authority = recordAuthority(record)
    const supplier = recordSupplier(record)

    return [
      record.grain,
      record.id,
      recordTitle(record) ?? '',
      recordNumberLabel(record) ?? '',
      recordDate(record) ?? '',
      recordCpv(record) ?? '',
      recordStatus(record) ?? '',
      recordSourceSystem(record) ?? '',
      money?.valueRon ?? '',
      money ? moneyValueCurrency(money) : '',
      recordSourceUrl(record) ?? '',
      authority.displayName ?? authority.name ?? authority.cui ?? '',
      authority.cui ?? '',
      supplier?.displayName ?? supplier?.name ?? supplier?.cui ?? '',
      supplier?.cui ?? '',
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
