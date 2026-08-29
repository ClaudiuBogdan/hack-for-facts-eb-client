import type { InsObservation, InsObservationFilterInput } from '@/schemas/ins'
import { isStatisticsMockEnabled } from '../lib/mock-mode'
import type { ClassificationPin } from '../lib/comparison-series'
import {
  getInsDatasetDetails,
  getInsDimensionValuesPage,
  getInsObservationsPage,
} from './graphql/ins-fetchers'
import {
  fetchComparisonDatasetMock,
  fetchComparisonObservationsMock,
} from './comparisons-api.mock'

/**
 * Comparisons seam. Mirrors `dataset-explorer-api.ts`: one exported function
 * per read, mock/live chosen by `isStatisticsMockEnabled()` so the swap is a
 * single-call change.
 *
 * The comparisons page makes exactly TWO reads:
 *
 * - {@link fetchComparisonDataset} — dataset metadata + the pinnable dimension
 *   options. Keyed by dataset code alone, so it is cached across territory and
 *   period changes.
 * - {@link fetchComparisonObservations} — ONE `insObservations` call scoped to
 *   every selected territory at once, with classifications and unit pinned.
 *   The table, both charts and the period dropdown all derive from its result,
 *   which is why the period is not one of its parameters.
 */

/** Per-dimension option cap. INS classification dimensions are small; a runaway one is truncated rather than paged. */
const DIMENSION_OPTION_LIMIT = 100

/**
 * Row cap for the single observations read. Six territories × ~40 periods is
 * ~240 rows; 500 leaves headroom while staying far below the point where the
 * unfiltered 23.6M-row query times out.
 */
const COMPARISON_OBSERVATION_LIMIT = 500

/** One selectable value of a classification or unit dimension. */
export interface ComparisonDimensionOption {
  readonly code: string
  readonly label: string
}

/** A classification dimension the user can pin. */
export interface ComparisonClassificationDimension {
  readonly index: number
  readonly typeCode: string
  readonly label: string
  readonly options: readonly ComparisonDimensionOption[]
}

/** Dataset metadata plus everything the pin controls need to render. */
export interface ComparisonDatasetMeta {
  readonly code: string
  readonly nameRo: string | null
  readonly nameEn: string | null
  readonly classifications: readonly ComparisonClassificationDimension[]
  readonly units: readonly ComparisonDimensionOption[]
}

/** The single observation read's result. */
export interface ComparisonObservationsResult {
  readonly observations: readonly InsObservation[]
  /** True when the server had more rows than {@link COMPARISON_OBSERVATION_LIMIT}. */
  readonly partial: boolean
}

const EMPTY_OBSERVATIONS: ComparisonObservationsResult = {
  observations: [],
  partial: false,
}

/** Parameters of the one observations request. Deliberately has no `period`. */
export interface ComparisonObservationsParams {
  readonly datasetCode: string
  readonly signal?: AbortSignal
  /**
   * Resolved territory CODES (a LAU's code IS its SIRUTA; counties are
   * alphabetic; `RO` is the national row) — ONE `territoryCodes` filter
   * serves mixed levels. Filter keys AND together, so `sirutaCodes` must
   * never be combined with it.
   */
  readonly territoryCodes: readonly string[]
  readonly classificationPins: readonly ClassificationPin[]
  readonly unitCode: string | undefined
}

/** Dataset metadata + pinnable dimension options, or `null` when unknown. */
export async function fetchComparisonDataset(
  code: string,
  signal?: AbortSignal,
): Promise<ComparisonDatasetMeta | null> {
  if (code.trim().length === 0) return null

  if (isStatisticsMockEnabled()) {
    return fetchComparisonDatasetMock(code)
  }

  const details = await getInsDatasetDetails(code, signal)
  if (!details) return null

  const classifications: ComparisonClassificationDimension[] = []
  const units: ComparisonDimensionOption[] = []

  for (const dimension of details.dimensions ?? []) {
    if (dimension.type !== 'CLASSIFICATION' && dimension.type !== 'UNIT_OF_MEASURE') {
      continue
    }

    const page = await getInsDimensionValuesPage({
      datasetCode: code,
      dimensionIndex: dimension.index,
      limit: DIMENSION_OPTION_LIMIT,
      signal,
    })

    if (dimension.type === 'UNIT_OF_MEASURE') {
      for (const node of page.nodes) {
        const unitCode = node.unit?.code?.trim()
        if (!unitCode) continue
        units.push({
          code: unitCode,
          label: node.unit?.name_ro?.trim() || node.label_ro?.trim() || unitCode,
        })
      }
      continue
    }

    const typeCode =
      ('classification_type' in dimension ? dimension.classification_type?.code : null)?.trim()
    if (!typeCode) continue

    const options: ComparisonDimensionOption[] = []
    for (const node of page.nodes) {
      const valueCode = node.classification_value?.code?.trim()
      if (!valueCode) continue
      options.push({
        code: valueCode,
        label: node.classification_value?.name_ro?.trim() || node.label_ro?.trim() || valueCode,
      })
    }

    if (options.length === 0) continue

    classifications.push({
      index: dimension.index,
      typeCode,
      label: dimension.label_ro?.trim() || typeCode,
      options,
    })
  }

  return {
    code: details.code,
    nameRo: details.name_ro ?? null,
    nameEn: details.name_en ?? null,
    classifications,
    units,
  }
}

/**
 * Builds the `InsObservationFilterInput` for the one comparison read.
 *
 * Exported so the mock adapter applies the exact filter the live adapter
 * sends — the mock cannot drift from live filter semantics.
 */
export function buildComparisonObservationFilter(
  params: ComparisonObservationsParams,
): InsObservationFilterInput {
  const filter: InsObservationFilterInput = {
    territoryCodes: [...new Set(params.territoryCodes)],
  }

  if (params.classificationPins.length > 0) {
    filter.classificationValueCodes = [
      ...new Set(params.classificationPins.map((pin) => pin.valueCode)),
    ]
    // Type-aware AND (each requested type must carry one of the values). The
    // server still shares ONE value set across types, so sibling cells can
    // slip through — the client exact-cell match closes that (use-comparisons).
    const typeCodes = params.classificationPins.map((pin) => pin.typeCode)
    if (typeCodes.every((code) => !code.startsWith('DIM'))) {
      filter.classificationTypeCodes = typeCodes
    }
  }

  if (params.unitCode) {
    filter.unitCodes = [params.unitCode]
  }

  return filter
}

/**
 * The single observations read, scoped to every selected territory at once.
 *
 * Guards an empty territory list at the seam as well as at the query's
 * `enabled` flag: an `insObservations` call with no territory filter scans
 * 23.6M rows and is documented to time out at 30s.
 */
export async function fetchComparisonObservations(
  params: ComparisonObservationsParams,
): Promise<ComparisonObservationsResult> {
  if (params.datasetCode.trim().length === 0 || params.territoryCodes.length === 0) {
    return EMPTY_OBSERVATIONS
  }

  if (isStatisticsMockEnabled()) {
    return fetchComparisonObservationsMock(params)
  }

  const connection = await getInsObservationsPage({
    datasetCode: params.datasetCode,
    filter: buildComparisonObservationFilter(params),
    limit: COMPARISON_OBSERVATION_LIMIT,
    offset: 0,
    signal: params.signal,
  })

  return {
    observations: connection.nodes ?? [],
    partial: connection.pageInfo?.hasNextPage ?? false,
  }
}
