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
  methodology_ro
  methodology_en
  data_sources_ro
  data_sources_en
  data_sources { name type type_code link_number }
  observations_ro
  observations_en
  discontinued_after_ro
  discontinued_after_en
  successor_dataset_code
  continues_from { dataset_code last_period_ro last_period_en }
  source_last_update
`

/**
 * What a catalog row shows: the summary a list of 25 needs, without the
 * definition, methodology and source prose a dataset page reads once. The
 * full selection weighs 120–260 KB a page; this one about 15 KB.
 */
export const INS_DATASET_SUMMARY_FIELDS = `
  id
  code
  name_ro
  name_en
  periodicity
  year_range
  has_uat_data
  has_county_data
  has_siruta
  sync_status
  data_status
  context_code
  context_name_ro
  context_name_en
  context_path
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

/**
 * What the territory hub reads of a dataset: identity, cadence, status, and
 * the layout the source certification needs. None of the published prose —
 * the page never shows it, and across 73 matrices it weighed 0.26 MB.
 */
export const TERRITORY_DATASET_FIELDS = `
  id
  code
  name_ro
  name_en
  periodicity
  dimension_count
  has_uat_data
  has_county_data
  has_siruta
  sync_status
  data_status
  metadata
  dimensions {
    index
    type
    label_ro
    classification_type { code }
  }
`

/**
 * What the territory hub reads of an observation: the cell's value, period
 * and unit, plus the coordinates and geography the certification checks.
 * Member and axis names are not read (they weighed 1.4 MB per territory).
 */
export const TERRITORY_OBSERVATION_FIELDS = `
  id
  dataset_code
  value
  value_status
  time_period { iso_period year quarter month periodicity }
  unit { code symbol name_ro name_en }
  classifications { id type_code code }
  dimensions
`

/**
 * What one comparison default needs: the outcome, the layout the
 * certification checks, and the resolved cell's coordinates. Repeated once
 * per compared territory, so it has to stay small: with the exhaustive
 * fragments six territories exceeded the server's 500-field cap.
 */
export const INS_COMPARISON_DEFAULT_FIELDS = `
  latestPeriod
  matchStrategy
  hasData
  geographicWitnesses
  dataset {
    id
    code
    data_status
    dimension_count
    metadata
    dimensions { index type label_ro classification_type { code } }
  }
  observation {
    id
    dataset_code
    value
    value_status
    time_period { iso_period year quarter month periodicity }
    territory { code siruta_code level name_ro }
    unit { code symbol name_ro }
    classifications { id type_code code }
    dimensions
  }
`

export const INS_TERRITORY_FIELDS = `
  code
  siruta_code
  level
  name_ro
  parent_code
  parent_name_ro
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

/**
 * The whole INS context tree in one round trip.
 *
 * `insContexts` caps `limit` at 200 server-side, so the tree arrives as two
 * aliased pages; it held 340 nodes when this shipped (8 domains, 70 groups,
 * 262 subdomains, verified live 2026-09-17), and the fetcher logs a warning if
 * a future catalog outgrows the two pages.
 *
 * Only the fields the rail draws are selected. Two the deployed API makes
 * useless here (probed against dev-chronos-api on 2026-09-17, where the
 * sibling server sources say otherwise — trust the probe, re-probe before
 * relying on either): `path` comes back as a display string of ancestor names,
 * not the ltree identifier, and `matrix_count` is a subtree roll-up filled on
 * the eight domains alone, `0` on every group and subdomain.
 */
export const STATISTICS_CONTEXT_TREE_QUERY = `
  query StatisticsContextTree {
    firstPage: insContexts(limit: 200, offset: 0) {
      nodes { code name_ro name_en level parent_code }
      pageInfo { totalCount }
    }
    secondPage: insContexts(limit: 200, offset: 200) {
      nodes { code name_ro name_en level parent_code }
      pageInfo { totalCount }
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
 * Explorer catalog query: the summary fields only, under a distinct operation
 * name so the explorer's requests are separable in traces and in the
 * integration fixtures.
 */
export const INS_DATASETS_EXPLORER_QUERY = `
  query InsDatasetsExplorer($filter: InsDatasetFilterInput, $limit: Int, $offset: Int) {
    insDatasets(filter: $filter, limit: $limit, offset: $offset) {
      nodes { ${INS_DATASET_SUMMARY_FIELDS} }
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
        territory { code siruta_code canonical_siruta_code level name_ro }
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
 * Builds an aliased multi-dataset observations query, one alias per matrix
 * because `insObservations` takes `datasetCode` as a positional argument
 * rather than a list. Each code travels as its own variable (`$code0`…), so
 * a code from a saved chart can never alter the document.
 */
export function buildInsObservationsBatchQuery(
  datasetCodes: readonly string[],
) {
  const aliasMap: Record<string, string> = {}
  const variables: Record<string, string> = {}
  const declarations = datasetCodes.map((_, index) => `$code${index}: String!`).join(', ')
  const fields = datasetCodes
    .map((code, index) => {
      const alias = `d${index}`
      aliasMap[alias] = code
      variables[`code${index}`] = code
      return (
        `${alias}: insObservations(datasetCode: $code${index}, filter: $filter, limit: $limit, offset: 0) {\n` +
        `  nodes { ${INS_OBSERVATION_FIELDS} }\n` +
        `  pageInfo { totalCount hasNextPage hasPreviousPage }\n` +
        `}`
      )
    })
    .join('\n')

  const query = `
    query InsObservationsBatch(${declarations}${declarations ? ', ' : ''}$filter: InsObservationFilterInput, $limit: Int) {
      ${fields}
    }
  `

  return { query, aliasMap, variables }
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
 * Landing POST 2 — catalog honesty counts + per-theme counts, all as aliased
 * 1-row probes (`totalCount` is authoritative; nodes are discarded).
 *
 * `catalog` passes `dataStatus: []`, which asks for the full INS Tempo
 * catalog; with every matrix loaded (1,916 of 1,916 on 2026-09-23) it counts
 * the same as omitting it, and stays explicit for when that is no longer so.
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
      dataset { ${TERRITORY_DATASET_FIELDS} }
      observations { ${TERRITORY_OBSERVATION_FIELDS} }
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
      dimensions { index type label_ro label_en classification_type { code } }
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
      nodes { code name_ro name_en data_status }
    }
  }
`
