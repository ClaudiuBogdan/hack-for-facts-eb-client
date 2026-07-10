import type { InsObservation } from '@/schemas/ins'
import {
  MOCK_COMPARISON_DATASETS,
  MOCK_COMPARISON_OBSERVATIONS,
} from '../mocks/statistics-comparison-fixtures'
import {
  buildComparisonObservationFilter,
  type ComparisonDatasetMeta,
  type ComparisonObservationsParams,
  type ComparisonObservationsResult,
} from './comparisons-api'

/**
 * Mock comparisons adapter.
 *
 * Applies the very same `InsObservationFilterInput` the live adapter sends, in
 * memory — so a pin combination that yields rows in mock mode yields rows
 * against the server, and `buildComparisonObservationFilter` stays the single
 * source of filter truth.
 *
 * A pin the fixtures do not carry (e.g. `SEX:SEX_M`) returns zero rows rather
 * than falling back to the totals. Mock mode must be able to show the honest
 * "no data for this combination" state, not paper over it.
 */
export function fetchComparisonDatasetMock(
  code: string,
): Promise<ComparisonDatasetMeta | null> {
  const match = MOCK_COMPARISON_DATASETS.find((dataset) => dataset.code === code)
  return Promise.resolve(match ?? null)
}

export function fetchComparisonObservationsMock(
  params: ComparisonObservationsParams,
): Promise<ComparisonObservationsResult> {
  const filter = buildComparisonObservationFilter(params)
  const sirutaCodes = new Set(filter.sirutaCodes ?? [])
  const unitCodes = filter.unitCodes ? new Set(filter.unitCodes) : null
  const classificationValueCodes = filter.classificationValueCodes ?? []

  const observations = MOCK_COMPARISON_OBSERVATIONS.filter((observation) => {
    if (observation.dataset_code !== params.datasetCode) return false

    const siruta = observation.territory?.siruta_code ?? ''
    if (!sirutaCodes.has(siruta)) return false

    if (unitCodes && !unitCodes.has(observation.unit?.code ?? '')) return false

    return matchesClassifications(observation, classificationValueCodes)
  })

  return Promise.resolve({ observations, partial: false })
}

/**
 * Every pinned value must be present on the observation. The live filter is an
 * AND across dimensions (one pinned value per classification type), so the
 * mock ANDs too.
 */
function matchesClassifications(
  observation: InsObservation,
  pinnedValueCodes: readonly string[],
): boolean {
  if (pinnedValueCodes.length === 0) return true

  const present = new Set(
    (observation.classifications ?? [])
      .map((classification) => classification.code)
      .filter((code): code is string => typeof code === 'string'),
  )

  return pinnedValueCodes.every((code) => present.has(code))
}
