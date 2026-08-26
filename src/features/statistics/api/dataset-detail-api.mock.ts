import { normalizeFilterSearchText } from '@/lib/filter-option-search'
import type {
  InsDatasetDetails,
  InsDimensionValue,
  InsDimensionValueConnection,
  InsEntitySelectorInput,
  InsObservation,
  InsObservationConnection,
  InsObservationFilterInput,
} from '@/schemas/ins'
import type {
  StatisticsDatasetSeries,
  StatisticsDatasetTier0,
  StatisticsLatestValue,
} from '@/schemas/statistics'
import { getDatasetDataStatus } from '../lib/dataset-status'
import { isTotalOption } from '../lib/dataset-selection'
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

/**
 * Mock tier-0 resolution. Mirrors `insLatestDatasetValues` semantics: filter
 * to the entity's rows, prefer the all-total cell, answer NO_DATA when the
 * entity has no rows (the mock corpus is LAU-only, so the national default
 * exercises the scope-prompt path — as a live dataset without national rows
 * would).
 */
export async function fetchDatasetTier0Mock(params: {
  readonly code: string
  readonly entity: InsEntitySelectorInput
}): Promise<StatisticsDatasetTier0> {
  const dataset = MOCK_DETAIL_DATASETS.get(params.code) ?? null
  const all = MOCK_DETAIL_OBSERVATIONS.get(params.code) ?? []

  const entityRows = all.filter((observation) => {
    if (params.entity.sirutaCode) {
      return observation.territory?.siruta_code === params.entity.sirutaCode
    }
    if (params.entity.territoryCode) {
      return (
        observation.territory?.code === params.entity.territoryCode &&
        observation.territory?.level === params.entity.territoryLevel
      )
    }
    return false
  })

  const totalRows = entityRows.filter((observation) =>
    (observation.classifications ?? []).every((classification) =>
      isTotalOption(classification.name_ro ?? classification.code),
    ),
  )
  const pool = totalRows.length > 0 ? totalRows : entityRows
  const latestObservation = [...pool].sort(
    (left, right) =>
      periodSortKey(right.time_period) - periodSortKey(left.time_period),
  )[0]

  const latest: StatisticsLatestValue | null = dataset
    ? {
        datasetCode: dataset.code,
        datasetNameRo: dataset.name_ro ?? null,
        datasetNameEn: dataset.name_en ?? null,
        periodicity: dataset.periodicity,
        matchStrategy: latestObservation
          ? totalRows.length > 0
            ? 'TOTAL_FALLBACK'
            : 'REPRESENTATIVE_FALLBACK'
          : 'NO_DATA',
        hasData: Boolean(latestObservation),
        value: latestObservation?.value ?? null,
        valueStatus: latestObservation?.value_status ?? null,
        unitCode: latestObservation?.unit?.code ?? null,
        unitSymbol: latestObservation?.unit?.symbol ?? null,
        unitNameRo: latestObservation?.unit?.name_ro ?? null,
        period: latestObservation?.time_period.iso_period ?? null,
        resolvedClassifications: (latestObservation?.classifications ?? []).flatMap(
          (classification) =>
            classification.type_code && classification.code
              ? [
                  {
                    typeCode: classification.type_code,
                    code: classification.code,
                    nameRo: classification.name_ro ?? null,
                  },
                ]
              : [],
        ),
      }
    : null

  return { dataset, latest }
}

/** Mock series: the same in-memory filter, plus a same-context related list. */
export async function fetchDatasetSeriesMock(params: {
  readonly code: string
  readonly filter: InsObservationFilterInput
  readonly contextCode: string | null
  readonly limit: number
}): Promise<StatisticsDatasetSeries> {
  const page = await fetchObservationsPageMock({
    datasetCode: params.code,
    filter: params.filter,
    limit: params.limit,
    offset: 0,
  })

  const related = params.contextCode
    ? [...MOCK_DETAIL_DATASETS.values()]
        .filter(
          (dataset) =>
            dataset.context_code === params.contextCode &&
            dataset.code !== params.code,
        )
        .map((dataset) => ({
          code: dataset.code,
          nameRo: dataset.name_ro ?? null,
          dataStatus: getDatasetDataStatus(dataset),
        }))
    : []

  return {
    observations: page.nodes,
    totalCount: page.pageInfo.totalCount,
    related,
    relatedTotalCount: params.contextCode ? related.length + 1 : null,
  }
}
