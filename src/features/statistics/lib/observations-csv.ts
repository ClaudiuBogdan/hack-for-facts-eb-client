import Papa from 'papaparse'
import { validatedSourceRows } from './source-observations'
import type { InsObservation } from '@/schemas/ins'

/**
 * Archival CSV. String fields use explicit JSON encoding so spreadsheet coercion
 * cannot round decimal strings or execute formula-like source labels. JSON.parse
 * restores exact text, nulls, empty strings and nested provenance. No row slicing.
 */
export function buildObservationsCsv(params: {
  readonly descriptor: unknown
  readonly observations: readonly InsObservation[]
  readonly complete: boolean
}): { readonly csv: string; readonly rowCount: number } {
  if (!params.complete)
    throw new Error('A complete INS selection is required for export')
  const { descriptor, observations } = validatedSourceRows(
    params.descriptor,
    params.observations,
  )
  const dimensions = descriptor.dimensions
    .filter((d) => d.type === 'CLASSIFICATION' || d.type === 'TERRITORIAL')
    .sort((a, b) => a.index - b.index)
  const header = [
    'dataset_code_json',
    'observation_id_json',
    'period_json',
    'periodicity_json',
    'year',
    'quarter',
    'month',
    ...dimensions.flatMap((d) => [
      `D${d.index}_member_code_json`,
      `D${d.index}_classification_json`,
    ]),
    'unit_json',
    'value_decimal_json',
    'value_is_null',
    'value_status_json',
    'canonical_territory_json',
    'geography_json',
    'publication_json',
    'dimensions_json',
    'source_row_json',
  ]
  const body = observations.map((row) => [
    JSON.stringify(row.dataset_code),
    JSON.stringify(row.id),
    JSON.stringify(row.time_period.iso_period),
    JSON.stringify(row.time_period.periodicity),
    row.time_period.year,
    row.time_period.quarter ?? '',
    row.time_period.month ?? '',
    ...dimensions.flatMap((d) => {
      const member = row.classifications.find(
        (c) => c.type_code === `D${d.index}`,
      )!
      return [JSON.stringify(member.code), JSON.stringify(member)]
    }),
    JSON.stringify(row.unit),
    JSON.stringify(row.value),
    row.value === null,
    JSON.stringify(row.value_status),
    JSON.stringify(row.territory),
    JSON.stringify(row.dimensions.geography),
    JSON.stringify(descriptor.metadata),
    JSON.stringify(descriptor.dimensions),
    JSON.stringify(row),
  ])
  return {
    csv: Papa.unparse([header, ...body], { newline: '\n' }),
    rowCount: observations.length,
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
