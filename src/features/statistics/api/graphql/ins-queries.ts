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
  last_sync_at
  context_code
  context_name_ro
  context_name_en
  context_path
  metadata
`

export const INS_OBSERVATION_FIELDS = `
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
 * Explorer catalog query. Distinct from `INS_DATASETS_QUERY` because it selects
 * the server's `data_status` field, which only the explorer surfaces reads —
 * keeping it off the legacy document avoids breaking older server deployments
 * for the entity tab and chart builder.
 */
export const INS_DATASETS_EXPLORER_QUERY = `
  query InsDatasetsExplorer($filter: InsDatasetFilterInput, $limit: Int, $offset: Int) {
    insDatasets(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        ${INS_DATASET_FIELDS}
        data_status
      }
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
