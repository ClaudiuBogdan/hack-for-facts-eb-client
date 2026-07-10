import { normalizeFilterSearchText } from '@/lib/filter-option-search'
import type {
  InsDatasetDetails,
  InsDimensionValue,
  InsDimensionValueConnection,
  InsObservation,
  InsObservationConnection,
  InsObservationFilterInput,
} from '@/schemas/ins'
import { periodSortKey } from '../lib/period'
import {
  MOCK_DETAIL_DATASETS,
  MOCK_DETAIL_OBSERVATIONS,
  MOCK_DIMENSION_VALUES,
} from '../mocks/statistics-detail-fixtures'

/**
 * Mock dataset detail adapter. Applies the same `InsObservationFilterInput`
 * the live adapter sends, in-memory, so `dataset-selection` stays the single
 * source of filter truth on both sides of the seam.
 */

export function fetchDatasetDetailMock(
  code: string,
): Promise<InsDatasetDetails | null> {
  return Promise.resolve(MOCK_DETAIL_DATASETS.get(code) ?? null)
}

export function fetchDimensionValuesPageMock(params: {
  readonly datasetCode: string
  readonly dimensionIndex: number
  readonly search?: string
  readonly limit: number
  readonly offset: number
}): Promise<InsDimensionValueConnection> {
  const all = MOCK_DIMENSION_VALUES.get(params.datasetCode)?.get(
    params.dimensionIndex,
  ) ?? []

  const needle = params.search?.trim()
    ? normalizeFilterSearchText(params.search)
    : null
  const matches = needle
    ? all.filter((value) => matchesDimensionSearch(value, needle))
    : all

  const page = matches.slice(params.offset, params.offset + params.limit)

  return Promise.resolve({
    nodes: [...page],
    pageInfo: {
      totalCount: matches.length,
      hasNextPage: params.offset + page.length < matches.length,
      hasPreviousPage: params.offset > 0,
    },
  })
}

export function fetchObservationsPageMock(params: {
  readonly datasetCode: string
  readonly filter: InsObservationFilterInput
  readonly limit: number
  readonly offset: number
}): Promise<InsObservationConnection> {
  const all = MOCK_DETAIL_OBSERVATIONS.get(params.datasetCode) ?? []

  const matches = all
    .filter((observation) => matchesFilter(observation, params.filter))
    .sort(
      (left, right) =>
        periodSortKey(left.time_period) - periodSortKey(right.time_period),
    )

  const page = matches.slice(params.offset, params.offset + params.limit)

  return Promise.resolve({
    nodes: page,
    pageInfo: {
      totalCount: matches.length,
      hasNextPage: params.offset + page.length < matches.length,
      hasPreviousPage: params.offset > 0,
    },
  })
}

function matchesDimensionSearch(
  value: InsDimensionValue,
  needle: string,
): boolean {
  const haystack = normalizeFilterSearchText(
    [
      value.label_ro ?? '',
      value.territory?.name_ro ?? '',
      value.territory?.siruta_code ?? '',
      value.classification_value?.name_ro ?? '',
      value.unit?.name_ro ?? '',
    ].join(' '),
  )
  return haystack.includes(needle)
}

function matchesFilter(
  observation: InsObservation,
  filter: InsObservationFilterInput,
): boolean {
  if (
    filter.sirutaCodes &&
    !filter.sirutaCodes.includes(observation.territory?.siruta_code ?? '')
  ) {
    return false
  }

  if (
    filter.territoryCodes &&
    !filter.territoryCodes.includes(observation.territory?.code ?? '')
  ) {
    return false
  }

  if (
    filter.territoryLevels &&
    !filter.territoryLevels.includes(
      observation.territory?.level as (typeof filter.territoryLevels)[number],
    )
  ) {
    return false
  }

  if (filter.unitCodes && !filter.unitCodes.includes(observation.unit?.code ?? '')) {
    return false
  }

  // Every pinned classification code must be present on the row: the pins are
  // an AND across dimensions, not an OR across values.
  if (filter.classificationValueCodes) {
    const codes = new Set(
      (observation.classifications ?? []).map((classification) => classification.code),
    )
    if (!filter.classificationValueCodes.every((code) => codes.has(code))) {
      return false
    }
  }

  const interval = filter.period?.selection.interval
  if (interval) {
    const year = observation.time_period.year
    if (year < Number(interval.start) || year > Number(interval.end)) {
      return false
    }
  }

  return true
}
