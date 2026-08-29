import type {
  InsDatasetDetails,
  InsObservation,
} from '@/schemas/ins'
import type {
  StatisticsDatasetDataStatus,
  StatisticsDatasetSummary,
  StatisticsDecadeObservation,
  StatisticsExampleObservation,
  StatisticsLatestValue,
  StatisticsRelatedDataset,
  StatisticsTerritorySearchRow,
} from '@/schemas/statistics'
import { getDatasetDataStatus } from '../../lib/dataset-status'
import type {
  InsDatasetNodeRaw,
  InsLatestValueNodeRaw,
  InsObservationNodeRaw,
  InsTerritoryNodeRaw,
  LandingDecadeNodeRaw,
  LandingExampleNodeRaw,
  StatisticsDatasetSeriesResponseRaw,
  StatisticsDatasetTier0ResponseRaw,
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
 * The wire's `parent_*` fields carry the containing territory, which for a LAU
 * is usually — but not always — the county: a Bucharest sector's parent would
 * be the numeric municipality `179132`, and `countyCode` feeds NUTS3-typed
 * requests (hub county benchmarks, `cod:` compare tokens), so a numeric parent
 * must never pass through. Romanian NUTS3 codes are 1–2 letters; NUTS2 codes
 * carry digits (`RO32`) and fail the pattern too.
 */
const NUTS3_COUNTY_CODE_PATTERN = /^[A-Za-z]{1,2}$/

/**
 * The one LAU that contains other LAUs. Sectors resolve to county `B` so they
 * keep București benchmarks (user decision). The display name is the county's
 * wire name — `179132`'s own `parent_name_ro` on `insTerritories` is
 * „București" (verified live 2026-08-26), NOT the municipality's
 * „MUNICIPIUL BUCUREŞTI".
 */
const BUCHAREST_MUNICIPALITY_SIRUTA = '179132'
const BUCHAREST_COUNTY_CODE = 'B'
const BUCHAREST_COUNTY_NAME = 'București'

function isNuts3CountyCode(code: string | null | undefined): code is string {
  return typeof code === 'string' && NUTS3_COUNTY_CODE_PATTERN.test(code.trim())
}

export function mapTerritorySearchRow(
  node: InsTerritoryNodeRaw,
): StatisticsTerritorySearchRow {
  const parentCode = node.parent_code?.trim() ?? null
  let countyCode: string | null = null
  let countyName: string | null = null
  if (node.level === 'LAU') {
    if (isNuts3CountyCode(parentCode)) {
      countyCode = parentCode.toUpperCase()
      countyName = node.parent_name_ro ?? null
    } else if (parentCode === BUCHAREST_MUNICIPALITY_SIRUTA) {
      countyCode = BUCHAREST_COUNTY_CODE
      countyName = BUCHAREST_COUNTY_NAME
    }
  }
  return {
    code: node.code,
    siruta: node.siruta_code ?? null,
    name: node.name_ro ?? null,
    level: node.level ?? null,
    countyCode,
    countyName,
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
    unitCode: node.observation?.unit?.code ?? null,
    unitSymbol: node.observation?.unit?.symbol ?? null,
    unitNameRo: node.observation?.unit?.name_ro ?? null,
    period: node.observation?.time_period.iso_period ?? node.latestPeriod ?? null,
    resolvedPeriodicity: node.observation?.time_period.periodicity ?? null,
    resolvedClassifications: (node.observation?.classifications ?? []).flatMap(
      (classification) => {
        if (!classification.type_code || !classification.code) return []
        return [
          {
            typeCode: classification.type_code,
            code: classification.code,
            nameRo: classification.name_ro ?? null,
          },
        ]
      },
    ),
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
        unitNameRo: node.unit?.name_ro ?? node.unit?.symbol ?? null,
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

/** Tier-0 dataset node → the detail shape the page consumes. */
export function mapDatasetDetails(
  node: NonNullable<StatisticsDatasetTier0ResponseRaw['dataset']>,
): InsDatasetDetails {
  return {
    id: node.id,
    code: node.code,
    name_ro: node.name_ro ?? null,
    name_en: node.name_en ?? null,
    definition_ro: node.definition_ro ?? null,
    definition_en: node.definition_en ?? null,
    periodicity: [...(node.periodicity ?? [])],
    year_range: node.year_range ? [...node.year_range] : null,
    dimension_count: node.dimension_count ?? null,
    has_uat_data: node.has_uat_data ?? false,
    has_county_data: node.has_county_data ?? false,
    has_siruta: node.has_siruta ?? false,
    sync_status: node.sync_status ?? null,
    data_status: node.data_status ?? null,
    last_sync_at: node.last_sync_at ?? null,
    context_code: node.context_code ?? null,
    context_name_ro: node.context_name_ro ?? null,
    context_name_en: node.context_name_en ?? null,
    context_path: node.context_path ?? null,
    metadata: node.metadata ?? null,
    dimensions: (node.dimensions ?? []).map((dimension) => ({
      index: dimension.index,
      type: dimension.type,
      label_ro: dimension.label_ro ?? null,
      label_en: dimension.label_en ?? null,
      is_hierarchical: dimension.is_hierarchical ?? null,
      option_count: dimension.option_count ?? null,
      classification_type: dimension.classification_type
        ? {
            code: dimension.classification_type.code ?? null,
            name_ro: dimension.classification_type.name_ro ?? null,
            name_en: dimension.classification_type.name_en ?? null,
            is_hierarchical: dimension.classification_type.is_hierarchical ?? null,
          }
        : null,
    })),
  }
}

/** Series observation node → the shared `InsObservation` shape. */
export function mapObservationNode(node: InsObservationNodeRaw): InsObservation {
  return {
    dataset_code: '',
    value: node.value ?? null,
    value_status: node.value_status ?? null,
    time_period: {
      iso_period: node.time_period.iso_period,
      year: node.time_period.year,
      quarter: node.time_period.quarter ?? null,
      month: node.time_period.month ?? null,
      periodicity: node.time_period.periodicity,
    },
    territory: node.territory
      ? {
          code: node.territory.code ?? null,
          siruta_code: node.territory.siruta_code ?? null,
          level: node.territory.level ?? null,
          name_ro: node.territory.name_ro ?? null,
        }
      : null,
    unit: node.unit
      ? {
          code: node.unit.code ?? null,
          symbol: node.unit.symbol ?? null,
          name_ro: node.unit.name_ro ?? null,
        }
      : null,
    classifications: (node.classifications ?? []).map((classification) => ({
      type_code: classification.type_code ?? null,
      type_name_ro: classification.type_name_ro ?? null,
      code: classification.code ?? null,
      name_ro: classification.name_ro ?? null,
      sort_order: classification.sort_order ?? null,
    })),
    dimensions: null,
  }
}

export function mapRelatedDatasets(
  related: StatisticsDatasetSeriesResponseRaw['related'],
  selfCode: string,
): readonly StatisticsRelatedDataset[] {
  if (!related) return []
  return related.nodes
    .filter((node) => node.code !== selfCode)
    .map((node) => ({
      code: node.code,
      nameRo: node.name_ro ?? null,
      dataStatus: node.data_status === 'CATALOG_ONLY' ? 'catalog-only' : 'available',
    }))
}
