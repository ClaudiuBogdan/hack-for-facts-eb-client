import type {
  StatisticsDatasetDataStatus,
  StatisticsDatasetSummary,
  StatisticsDecadeObservation,
  StatisticsExampleObservation,
  StatisticsLatestValue,
  StatisticsTerritorySearchRow,
} from '@/schemas/statistics'
import { getDatasetDataStatus } from '../../lib/dataset-status'
import type {
  InsDatasetNodeRaw,
  InsLatestValueNodeRaw,
  InsTerritoryNodeRaw,
  LandingDecadeNodeRaw,
  LandingExampleNodeRaw,
} from './statistics-raw-schemas'

/**
 * Wire → domain mappers. Every optional wire field lands as an explicit `null`
 * so downstream code never has to distinguish "absent" from "null".
 */

function mapDataStatus(node: InsDatasetNodeRaw): StatisticsDatasetDataStatus {
  return getDatasetDataStatus({
    sync_status: node.sync_status,
    data_status: node.data_status,
  })
}

export function mapDatasetSummary(node: InsDatasetNodeRaw): StatisticsDatasetSummary {
  return {
    code: node.code,
    nameRo: node.name_ro ?? null,
    nameEn: node.name_en ?? null,
    periodicity: node.periodicity ?? [],
    yearRange: node.year_range ?? null,
    hasUatData: node.has_uat_data ?? false,
    hasCountyData: node.has_county_data ?? false,
    hasSiruta: node.has_siruta ?? false,
    dataStatus: mapDataStatus(node),
    latestPeriod: null,
    contextNameRo: node.context_name_ro ?? null,
    contextPath: node.context_path ?? null,
  }
}

/**
 * Territory rows are keyed by SIRUTA in the product (it is the join to the
 * budget world). NUTS3 rows have no SIRUTA of their own.
 *
 * The wire's `parent_*` fields carry the containing territory. For the LAU rows
 * the search surfaces, that parent is the county, which is what the UI labels
 * it — but only LAU rows are read that way.
 */
export function mapTerritorySearchRow(
  node: InsTerritoryNodeRaw,
): StatisticsTerritorySearchRow {
  return {
    code: node.code,
    siruta: node.siruta_code ?? null,
    name: node.name_ro ?? null,
    level: node.level ?? null,
    countyCode: node.level === 'LAU' ? (node.parent_code ?? null) : null,
    countyName: node.level === 'LAU' ? (node.parent_name_ro ?? null) : null,
  }
}

export function mapLatestValue(node: InsLatestValueNodeRaw): StatisticsLatestValue {
  return {
    datasetCode: node.dataset.code,
    datasetNameRo: node.dataset.name_ro ?? null,
    datasetNameEn: node.dataset.name_en ?? null,
    periodicity: node.dataset.periodicity ?? [],
    matchStrategy: node.matchStrategy,
    hasData: node.hasData,
    value: node.observation?.value ?? null,
    valueStatus: node.observation?.value_status ?? null,
    unitSymbol: node.observation?.unit?.symbol ?? null,
    unitNameRo: node.observation?.unit?.name_ro ?? null,
    period: node.observation?.time_period.iso_period ?? node.latestPeriod ?? null,
  }
}

/**
 * Rows without a territory are dropped (a county row without its county is
 * unusable); rows with a `value_status` marker keep their value — the status
 * is the flag, absence stays `null`.
 */
export function mapDecadeRows(
  nodes: readonly LandingDecadeNodeRaw[],
): readonly StatisticsDecadeObservation[] {
  return nodes.flatMap((node) => {
    if (!node.territory) return []
    return [
      {
        countyCode: node.territory.code,
        countyName: node.territory.name_ro ?? null,
        year: node.time_period.year,
        value: node.value ?? null,
      },
    ]
  })
}

export function mapExampleRows(
  nodes: readonly LandingExampleNodeRaw[],
): readonly StatisticsExampleObservation[] {
  return nodes.flatMap((node) => {
    if (!node.territory) return []
    return [
      {
        level: node.territory.level ?? null,
        code: node.territory.code,
        siruta: node.territory.siruta_code ?? null,
        name: node.territory.name_ro ?? null,
        year: node.time_period.year,
        value: node.value ?? null,
        unitSymbol: node.unit?.symbol ?? null,
      },
    ]
  })
}
