import Papa from 'papaparse'
import { t } from '@lingui/core/macro'
import type { InsObservation } from '@/schemas/ins'
import { CSV_MAX_ROWS } from './dataset-selection'

/**
 * CSV export for the observations table.
 *
 * Values are written **verbatim** — they arrive as Decimal strings and a round
 * trip through `Number` would silently reshape `1234567.890` into
 * `1234567.89`. The export is the row the server sent, not our rendering of it.
 *
 * Quoting is delegated to papaparse, which wraps any cell containing a comma,
 * quote or newline. Diacritics need no escaping in UTF-8; `downloadCsv` adds
 * the BOM that makes Excel on Windows read them.
 */

/** A classification column, in dimension order. */
export interface CsvClassificationColumn {
  readonly typeCode: string
  readonly label: string
}

export interface ObservationsCsv {
  readonly csv: string
  readonly rowCount: number
  /** True when rows beyond `CSV_MAX_ROWS` were dropped. */
  readonly truncated: boolean
}

function classificationCell(
  observation: InsObservation,
  typeCode: string,
): string {
  const match = (observation.classifications ?? []).find(
    (classification) => classification.type_code === typeCode,
  )
  return match?.name_ro ?? match?.code ?? ''
}

/**
 * Builds the CSV for the current selection. Columns are period, territory,
 * unit, one per classification type in the dataset, then the value and its INS
 * quality flag.
 */
export function buildObservationsCsv(params: {
  readonly observations: readonly InsObservation[]
  readonly classificationColumns: readonly CsvClassificationColumn[]
  readonly maxRows?: number
}): ObservationsCsv {
  const maxRows = params.maxRows ?? CSV_MAX_ROWS
  const truncated = params.observations.length > maxRows
  const rows = truncated
    ? params.observations.slice(0, maxRows)
    : params.observations

  const header = [
    t`Perioadă`,
    t`Teritoriu`,
    t`Cod SIRUTA`,
    t`Unitate`,
    ...params.classificationColumns.map((column) => column.label),
    t`Valoare`,
    t`Stare valoare`,
  ]

  const body = rows.map((observation) => [
    observation.time_period.iso_period,
    observation.territory?.name_ro ?? '',
    observation.territory?.siruta_code ?? '',
    observation.unit?.name_ro ?? observation.unit?.symbol ?? '',
    ...params.classificationColumns.map((column) =>
      classificationCell(observation, column.typeCode),
    ),
    observation.value ?? '',
    observation.value_status ?? '',
  ])

  return {
    csv: Papa.unparse([header, ...body], { newline: '\n' }),
    rowCount: rows.length,
    truncated,
  }
}

/** `POP107D-2024-01-31.csv` — dataset code plus the day of export. */
export function buildObservationsCsvFilename(datasetCode: string): string {
  return `${datasetCode}-${new Date().toISOString().slice(0, 10)}.csv`
}

/** Downloads a CSV string with a UTF-8 BOM so Excel reads diacritics. */
export function downloadObservationsCsv(csv: string, filename: string): void {
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
