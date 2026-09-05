/**
 * INS Tempo GraphQL documents.
 *
 * Single home for every INS operation the client sends. Field selections are
 * shared through the `*_FIELDS` constants so a schema change lands in one place.
 */

export const INS_DATASET_FIELDS = `
  id
  code
  name_ro
  name_en
  definition_ro
  definition_en
  periodicity
  year_range
  dimension_count
  has_uat_data
  has_county_data
  has_siruta
  sync_status
  data_status
  last_sync_at
  context_code
  context_name_ro
  context_name_en
  context_path
  metadata
`

export const INS_DATASET_DIMENSION_FIELDS = `
  dimensions {
        index
        type
        label_ro
        label_en
        is_hierarchical
        option_count
        classification_type {
          code
          name_ro
          name_en
          is_hierarchical
        }
      }
`

export const INS_OBSERVATION_FIELDS = `
  id
  dimensions
  dataset_code
  value
  value_status
  time_period { iso_period year quarter month periodicity }
  territory { code siruta_code level name_ro }
  unit { code symbol name_ro }
  classifications { id type_code type_name_ro type_name_en code name_ro name_en sort_order }
`

export const INS_TERRITORY_FIELDS = `
  code
  siruta_code
  level
  name_ro
  parent_code
  parent_name_ro
`

export const INS_UAT_DASHBOARD_QUERY = `
  query InsUatDashboard($sirutaCode: String!, $period: PeriodDate, $contextCode: String) {
    insUatDashboard(sirutaCode: $sirutaCode, period: $period, contextCode: $contextCode) {
      latestPeriod
      dataset { ${INS_DATASET_FIELDS} }
      observations { ${INS_OBSERVATION_FIELDS} }
    }
  }
`

export const INS_DATASETS_BY_CODES_QUERY = `
  query InsDatasetsByCodes($codes: [String!], $limit: Int) {
    insDatasets(filter: { codes: $codes }, limit: $limit, offset: 0) {
      nodes { ${INS_DATASET_FIELDS} }
    }
  }
`

export const INS_CONTEXTS_QUERY = `
  query InsContexts($filter: InsContextFilterInput, $limit: Int, $offset: Int) {
    insContexts(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        id
        code
        name_ro
        name_en
        name_ro_markdown
        name_en_markdown
        level
        parent_id
        parent_code
        path
        matrix_count
      }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

export const INS_DATASETS_QUERY = `
  query InsDatasets($filter: InsDatasetFilterInput, $limit: Int, $offset: Int) {
    insDatasets(filter: $filter, limit: $limit, offset: $offset) {
      nodes { ${INS_DATASET_FIELDS} }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

/**
 * Explorer catalog query. Same selection as `INS_DATASETS_QUERY`, but a
 * distinct operation name so the explorer's requests are separable in traces
 * and in the integration fixtures.
 */
export const INS_DATASETS_EXPLORER_QUERY = `
  query InsDatasetsExplorer($filter: InsDatasetFilterInput, $limit: Int, $offset: Int) {
    insDatasets(filter: $filter, limit: $limit, offset: $offset) {
      nodes { ${INS_DATASET_FIELDS} }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

export const INS_TERRITORIES_QUERY = `
  query InsTerritories($filter: InsTerritoryFilterInput, $limit: Int, $offset: Int) {
    insTerritories(filter: $filter, limit: $limit, offset: $offset) {
      nodes { ${INS_TERRITORY_FIELDS} }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

export const INS_DATASET_DETAILS_QUERY = `
  query InsDatasetDetails($code: String!) {
    insDataset(code: $code) {
      ${INS_DATASET_FIELDS}
      ${INS_DATASET_DIMENSION_FIELDS}
    }
  }
`

export const INS_DATASET_DIMENSION_VALUES_QUERY = `
  query InsDatasetDimensionValues(
    $datasetCode: String!
    $dimensionIndex: Int!
    $search: String
    $limit: Int
    $offset: Int
  ) {
    descriptor: insDataset(code: $datasetCode) {
      ${INS_DATASET_FIELDS}
      ${INS_DATASET_DIMENSION_FIELDS}
    }
    insDatasetDimensionValues(
      datasetCode: $datasetCode
      dimensionIndex: $dimensionIndex
      filter: { search: $search }
      limit: $limit
      offset: $offset
    ) {
      nodes {
        nom_item_id
        dimension_type
        label_ro
        label_en
        parent_nom_item_id
        offset_order
        territory { code siruta_code level name_ro }
        time_period { iso_period year quarter month periodicity }
        classification_value { type_code code name_ro }
        unit { code symbol name_ro }
      }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

export const INS_OBSERVATIONS_QUERY = `
  query InsObservations($datasetCode: String!, $filter: InsObservationFilterInput, $limit: Int, $offset: Int) {
    insObservations(datasetCode: $datasetCode, filter: $filter, limit: $limit, offset: $offset) {
      nodes { ${INS_OBSERVATION_FIELDS} }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

export const INS_DATASET_HISTORY_QUERY = `
  query InsDatasetHistory($datasetCode: String!, $filter: InsObservationFilterInput, $limit: Int, $offset: Int) {
    insObservations(datasetCode: $datasetCode, filter: $filter, limit: $limit, offset: $offset) {
      nodes { ${INS_OBSERVATION_FIELDS} }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

export const INS_DATASET_DIMENSIONS_QUERY = `
  query InsDatasetDimensions($datasetCode: String!) {
    insDatasets(filter: { codes: [$datasetCode] }, limit: 1, offset: 0) {
      nodes {
        code
        dimensions {
          index
          type
          label_ro
          label_en
          classification_type { code name_ro name_en }
        }
      }
    }
  }
`

/**
 * Builds an aliased multi-dataset observations query. Dataset codes are
 * interpolated into the document (they are internal INS matrix codes, never
 * user input) because `insObservations` takes `datasetCode` as a positional
 * argument rather than a list.
 */
export function buildInsObservationsBatchQuery(datasetCodes: readonly string[]) {
  const aliasMap: Record<string, string> = {}
  const fields = datasetCodes
    .map((code, index) => {
      const alias = `d${index}`
      aliasMap[alias] = code
      return (
        `${alias}: insObservations(datasetCode: "${code}", filter: $filter, limit: $limit, offset: 0) {\n` +
        `  nodes { ${INS_OBSERVATION_FIELDS} }\n` +
        `  pageInfo { totalCount hasNextPage hasPreviousPage }\n` +
        `}`
      )
    })
    .join('\n')

  const query = `
    query InsObservationsBatch($filter: InsObservationFilterInput, $limit: Int) {
      ${fields}
    }
  `

  return { query, aliasMap }
}

export const INS_LATEST_VALUE_FIELDS = `
  latestPeriod
  matchStrategy
  hasData
  geographicWitnesses
  dataset { ${INS_DATASET_FIELDS} ${INS_DATASET_DIMENSION_FIELDS} }
  observation { ${INS_OBSERVATION_FIELDS} }
`

/**
 * Landing POST 1 — every observation-bearing landing block in ONE operation
 * (HTTP-level batching is off; multiple root fields in one document are fine).
 *
 * - `latest`: the four national headline tiles.
 * - `decade`: NUTS3 endpoint-year rows for the decade story. The
 *   classification filter (SEX+AGE_GROUP TOTAL) is POP107D-specific and also
 *   disables the server's representative re-ranking pool, giving stable rows.
 * - `example`: the worked comparison example — every year for the three
 *   territories; the latest common year is picked client-side so no year is
 *   hardcoded. `limit: 300` keeps it above the ≤250 re-ranking threshold.
 */
export const STATISTICS_LANDING_DATA_QUERY = `
  query StatisticsLandingData(
    $nationalCodes: [String!]!
    $decadeCode: String!
    $decadeYears: [PeriodDate!]!
    $exampleCode: String!
    $exampleTerritories: [String!]!
  ) {
    latest: insLatestDatasetValues(
      entity: { territoryCode: "RO", territoryLevel: NATIONAL }
      datasetCodes: $nationalCodes
      preferredClassificationCodes: ["TOTAL"]
    ) {
      ${INS_LATEST_VALUE_FIELDS}
    }
    decade: insObservations(
      datasetCode: $decadeCode
      filter: {
        territoryLevels: [NUTS3]
        period: { type: YEAR, selection: { dates: $decadeYears } }
        classificationValueCodes: ["TOTAL"]
        classificationTypeCodes: ["SEX", "AGE_GROUP"]
      }
      limit: 200
    ) {
      pageInfo { totalCount }
      nodes {
        value
        value_status
        territory { code name_ro }
        time_period { iso_period year }
        unit { symbol name_ro }
      }
    }
    example: insObservations(
      datasetCode: $exampleCode
      filter: { territoryCodes: $exampleTerritories, hasValue: true }
      limit: 300
    ) {
      nodes {
        value
        territory { code siruta_code level name_ro }
        time_period { iso_period year }
        unit { symbol }
      }
    }
  }
`

/**
 * Landing POST 2 — catalog honesty counts + per-theme counts, all as aliased
 * 1-row probes (`totalCount` is authoritative; nodes are discarded).
 *
 * `catalog` passes `dataStatus: []` — ANY value (including the empty list)
 * switches the server to the full INS Tempo catalog; omitting it counts only
 * fact-loaded datasets.
 */
export const STATISTICS_LANDING_CATALOG_QUERY = `
  query StatisticsLandingCatalog {
    loaded: insDatasets(limit: 1) { pageInfo { totalCount } }
    catalog: insDatasets(filter: { dataStatus: [] }, limit: 1) { pageInfo { totalCount } }
    t1: insDatasets(filter: { rootContextCode: "1" }, limit: 1) { pageInfo { totalCount } }
    t2: insDatasets(filter: { rootContextCode: "2" }, limit: 1) { pageInfo { totalCount } }
    t3: insDatasets(filter: { rootContextCode: "3" }, limit: 1) { pageInfo { totalCount } }
    t4: insDatasets(filter: { rootContextCode: "4" }, limit: 1) { pageInfo { totalCount } }
    t5: insDatasets(filter: { rootContextCode: "5" }, limit: 1) { pageInfo { totalCount } }
    t6: insDatasets(filter: { rootContextCode: "6" }, limit: 1) { pageInfo { totalCount } }
    t7: insDatasets(filter: { rootContextCode: "7" }, limit: 1) { pageInfo { totalCount } }
    t8: insDatasets(filter: { rootContextCode: "8" }, limit: 1) { pageInfo { totalCount } }
  }
`

/**
 * The „Locul tău" band re-render — latest values for a picked UAT plus its
 * identity, ONE POST. `insLatestDatasetValues` is deliberate: the no-period
 * `insUatIndicators` path fans out to the 2000-row dashboard budget (measured
 * 15.8s uncached) for four values this query returns in ~1s.
 */
export const STATISTICS_UAT_SNAPSHOT_QUERY = `
  query StatisticsUatSnapshot($siruta: String!, $codes: [String!]!) {
    latest: insLatestDatasetValues(
      entity: { sirutaCode: $siruta }
      datasetCodes: $codes
      preferredClassificationCodes: ["TOTAL"]
    ) {
      ${INS_LATEST_VALUE_FIELDS}
    }
    territory: insTerritories(filter: { sirutaCodes: [$siruta] }, limit: 1) {
      nodes { ${INS_TERRITORY_FIELDS} }
    }
  }
`

/**
 * Detail POST A — the dataset's full metadata (the only query that populates
 * `metadata`) plus the server-resolved latest value for the tier-0 entity in
 * one operation. `entity` is national by default or the URL's territory pin.
 */
export const STATISTICS_DATASET_TIER0_QUERY = `
  query StatisticsDatasetTier0($code: String!, $codes: [String!]!, $entity: InsEntitySelectorInput!) {
    dataset: insDataset(code: $code) {
      ${INS_DATASET_FIELDS}
      ${INS_DATASET_DIMENSION_FIELDS}
    }
    latest: insLatestDatasetValues(
      entity: $entity
      datasetCodes: $codes
      preferredClassificationCodes: ["TOTAL"]
    ) {
      ${INS_LATEST_VALUE_FIELDS}
    }
  }
`

/**
 * Hub POST 1 — the one-fetch dashboard (client-side period filtering) plus
 * the territory identity (the ONLY source of `parent_code`/`parent_name_ro`,
 * hard-coded null inside observations) as two root fields of one operation.
 */
export const STATISTICS_TERRITORY_HUB_QUERY = `
  query StatisticsTerritoryHub($sirutaCode: String!) {
    dashboard: insUatDashboard(sirutaCode: $sirutaCode) {
      latestPeriod
      status
      truncated
      geographicWitnesses
      dataset { ${INS_DATASET_FIELDS} ${INS_DATASET_DIMENSION_FIELDS} }
      observations { ${INS_OBSERVATION_FIELDS} }
    }
    identity: insTerritories(filter: { sirutaCodes: [$sirutaCode] }, limit: 1) {
      nodes { ${INS_TERRITORY_FIELDS} }
    }
  }
`

/**
 * Hub POST 2 — exact catalog counts (no clamped page scans) plus the county
 * and national benchmark values for the headline datasets, aliased into one
 * operation. \`withCounty\` guards the county alias when the identity carries
 * no parent code.
 */
export const STATISTICS_TERRITORY_HUB_CONTEXT_QUERY = `
  query StatisticsTerritoryHubContext(
    $countyCode: String
    $benchmarkCodes: [String!]!
    $withCounty: Boolean!
  ) {
    loaded: insDatasets(limit: 1) { pageInfo { totalCount } }
    catalog: insDatasets(filter: { dataStatus: [] }, limit: 1) { pageInfo { totalCount } }
    county: insLatestDatasetValues(
      entity: { territoryCode: $countyCode, territoryLevel: NUTS3 }
      datasetCodes: $benchmarkCodes
      preferredClassificationCodes: ["TOTAL"]
    ) @include(if: $withCounty) {
      ${INS_LATEST_VALUE_FIELDS}
    }
    national: insLatestDatasetValues(
      entity: { territoryCode: "RO", territoryLevel: NATIONAL }
      datasetCodes: $benchmarkCodes
      preferredClassificationCodes: ["TOTAL"]
    ) {
      ${INS_LATEST_VALUE_FIELDS}
    }
  }
`

/** Descriptor and source cells share the native operation snapshot. */
export const INS_SOURCE_OBSERVATIONS_QUERY = `
  query InsSourceObservations($datasetCode: String!, $filter: InsObservationFilterInput, $limit: Int!, $offset: Int!) {
    descriptor: insDataset(code: $datasetCode) {
      code
      dimension_count
      metadata
      dimensions { index type classification_type { code } }
    }
    insObservations(datasetCode: $datasetCode, filter: $filter, limit: $limit, offset: $offset) {
      nodes { ${INS_OBSERVATION_FIELDS} }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`

/** Related catalog metadata does not determine observation publication or source identity. */
export const STATISTICS_RELATED_DATASETS_QUERY = `
  query StatisticsRelatedDatasets($contextCode: String!) {
    related: insDatasets(filter: { contextCode: $contextCode }, limit: 7) {
      pageInfo { totalCount }
      nodes { code name_ro data_status }
    }
  }
`
