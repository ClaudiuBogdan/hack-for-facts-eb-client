import { validSourcePeriodFields } from '@/lib/ins/source-periods'
import type { InsLatestValueNodeRaw } from './statistics-raw-schemas'

/**
 * The outcomes that answer a request for the latest national cells, and the
 * codes the answer left out.
 *
 * The API omits a code it does not know — a matrix INS retired or re-coded,
 * one the scrapper stopped loading — rather than answering for it. That is
 * one missing figure, not a failed read, so it is reported and the rest
 * are kept. A duplicate or an unrequested code, and a cell that does not
 * hold the requested geography, are contract breaches and refused.
 *
 * A matrix with no geography axis (IPC102E, FOM106D) publishes the country
 * and nothing else: its cell carries no territory to check, and it can only
 * answer a national request.
 */
export function validateNationalLatest(
  latest: readonly InsLatestValueNodeRaw[],
  datasetCodes: readonly string[],
  territory: { readonly code: string; readonly level: string },
): { readonly outcomes: readonly InsLatestValueNodeRaw[]; readonly missing: readonly string[] } {
  const requested = new Set(datasetCodes)
  const codes = new Set(latest.map((entry) => entry.dataset.code))
  if (codes.size !== latest.length || latest.some((entry) => !requested.has(entry.dataset.code)))
    throw new Error('Duplicate or unexpected national latest outcome')
  for (const outcome of latest) {
    const row = outcome.observation
    if (!row) continue // Explicit no-data and ambiguity already validated by the outcome schema.
    const geo = row.dimensions.geography
    const dimensions = outcome.dataset.dimensions ?? []
    const nationalOnly =
      dimensions.length > 0 && dimensions.every((dimension) => dimension.type !== 'TERRITORIAL')
    if (nationalOnly) {
      if (territory.level !== 'NATIONAL' || geo || row.territory)
        throw new Error('National latest observation is outside the requested territory scope')
    } else if (
      geo?.resolution !== 'EXACT' ||
      geo.resolvedTerritory?.code !== territory.code ||
      geo.resolvedTerritory.level !== territory.level ||
      (row.territory &&
        (row.territory.code !== territory.code ||
          row.territory.level !== territory.level))
    )
      throw new Error(
        'National latest observation is outside the requested territory scope',
      )
    if (
      (row.value !== null && !/^-?[0-9]+(?:\.[0-9]+)?$/.test(row.value)) ||
      !validSourcePeriodFields(row.time_period)
    )
      throw new Error('Invalid national latest decimal or period')
    if (row.value_status !== null && typeof row.value_status !== 'string')
      throw new Error('Missing national latest source value status')
  }
  return { outcomes: latest, missing: datasetCodes.filter((code) => !codes.has(code)) }
}
