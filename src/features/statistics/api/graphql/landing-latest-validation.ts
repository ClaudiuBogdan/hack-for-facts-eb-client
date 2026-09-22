import { validSourcePeriodFields } from '@/lib/ins/source-periods'
import type { InsLatestValueNodeRaw } from './statistics-raw-schemas'

/**
 * Every requested dataset has an explicit outcome, and successful cells keep
 * the requested geography. A matrix with no geography axis (IPC102E, FOM106D)
 * publishes the country and nothing else: its cell carries no territory to
 * check, and it can only answer a national request.
 */
export function validateLandingLatest(
  latest: readonly InsLatestValueNodeRaw[],
  datasetCodes: readonly string[],
  territory: { readonly code: string; readonly level: string },
) {
  const codes = new Set(latest.map((entry) => entry.dataset.code))
  if (
    latest.length !== datasetCodes.length ||
    codes.size !== latest.length ||
    datasetCodes.some((code) => !codes.has(code))
  )
    throw new Error('Missing or unexpected native landing tile outcome')
  for (const outcome of latest) {
    const row = outcome.observation
    if (!row) continue // Explicit no-data and ambiguity already validated by the outcome schema.
    const geo = row.dimensions.geography
    const dimensions = outcome.dataset.dimensions ?? []
    const nationalOnly =
      dimensions.length > 0 && dimensions.every((dimension) => dimension.type !== 'TERRITORIAL')
    if (nationalOnly) {
      if (territory.level !== 'NATIONAL' || geo || row.territory)
        throw new Error('Landing observation is outside the requested territory scope')
    } else if (
      geo?.resolution !== 'EXACT' ||
      geo.resolvedTerritory?.code !== territory.code ||
      geo.resolvedTerritory.level !== territory.level ||
      (row.territory &&
        (row.territory.code !== territory.code ||
          row.territory.level !== territory.level))
    )
      throw new Error(
        'Landing observation is outside the requested territory scope',
      )
    if (
      (row.value !== null && !/^-?[0-9]+(?:\.[0-9]+)?$/.test(row.value)) ||
      !validSourcePeriodFields(row.time_period)
    )
      throw new Error('Invalid landing tile decimal or period')
    if (row.value_status !== null && typeof row.value_status !== 'string')
      throw new Error('Missing landing tile source value status')
  }
}
