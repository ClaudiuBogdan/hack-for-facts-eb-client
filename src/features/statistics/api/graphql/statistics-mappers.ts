import type {
  StatisticsDatasetDataStatus,
  StatisticsDatasetSummary,
  StatisticsTerritorySearchRow,
} from '@/schemas/statistics'
import { getDatasetDataStatus } from '../../lib/dataset-status'
import type { InsDatasetNodeRaw, InsTerritoryNodeRaw } from './statistics-raw-schemas'

/**
 * Wire → domain mappers. Every optional wire field lands as an explicit `null`
 * so downstream code never has to distinguish "absent" from "null".
 */

function mapDataStatus(node: InsDatasetNodeRaw): StatisticsDatasetDataStatus {
  if (node.data_status) {
    return node.data_status === 'AVAILABLE' ? 'available' : 'catalog-only'
  }
  // Server predates the explicit `data_status` field: fall back to inferring
  // it from the sync vocabulary.
  return getDatasetDataStatus({ sync_status: node.sync_status })
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
