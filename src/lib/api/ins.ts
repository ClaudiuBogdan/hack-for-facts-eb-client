import { createLogger } from '../logger';
import { graphqlRequest } from './graphql';
import type {
  InsContextConnection,
  InsContextFilterInput,
  InsDataset,
  InsDatasetConnection,
  InsDatasetDetails,
  InsDatasetDimensionsResult,
  InsDatasetFilterInput,
  InsDimensionValueConnection,
  InsObservation,
  InsObservationConnection,
  InsObservationFilterInput,
  InsUatDatasetGroup,
  InsDashboardData,
} from '@/schemas/ins';

const logger = createLogger('ins-api');

const INS_UAT_DASHBOARD_LIMIT = 2000;
const INS_OBSERVATION_LIMIT = 200;

const INS_DATASET_FIELDS = `
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
`;

const INS_OBSERVATION_FIELDS = `
  dataset_code
  value
  value_status
  time_period { iso_period year quarter month periodicity }
  territory { code siruta_code level name_ro }
  unit { code symbol name_ro }
  classifications { id type_code type_name_ro type_name_en code name_ro name_en sort_order }
`;

const INS_UAT_DASHBOARD_QUERY = `
  query InsUatDashboard($sirutaCode: String!, $period: PeriodDate, $contextCode: String) {
    insUatDashboard(sirutaCode: $sirutaCode, period: $period, contextCode: $contextCode) {
      latestPeriod
      dataset { ${INS_DATASET_FIELDS} }
      observations { ${INS_OBSERVATION_FIELDS} }
    }
  }
`;

const INS_DATASETS_BY_CODES_QUERY = `
  query InsDatasetsByCodes($codes: [String!], $limit: Int) {
    insDatasets(filter: { codes: $codes }, limit: $limit, offset: 0) {
      nodes { ${INS_DATASET_FIELDS} }
    }
  }
`;

const INS_CONTEXTS_QUERY = `
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
`;

const INS_DATASETS_QUERY = `
  query InsDatasets($filter: InsDatasetFilterInput, $limit: Int, $offset: Int) {
    insDatasets(filter: $filter, limit: $limit, offset: $offset) {
      nodes { ${INS_DATASET_FIELDS} }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`;

const INS_DATASET_DETAILS_QUERY = `
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
`;

const INS_DATASET_DIMENSION_VALUES_QUERY = `
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
`;

const INS_OBSERVATIONS_QUERY = `
  query InsObservations($datasetCode: String!, $filter: InsObservationFilterInput, $limit: Int, $offset: Int) {
    insObservations(datasetCode: $datasetCode, filter: $filter, limit: $limit, offset: $offset) {
      nodes { ${INS_OBSERVATION_FIELDS} }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`;

const INS_DATASET_HISTORY_QUERY = `
  query InsDatasetHistory($datasetCode: String!, $filter: InsObservationFilterInput, $limit: Int, $offset: Int) {
    insObservations(datasetCode: $datasetCode, filter: $filter, limit: $limit, offset: $offset) {
      nodes { ${INS_OBSERVATION_FIELDS} }
      pageInfo { totalCount hasNextPage hasPreviousPage }
    }
  }
`;

const INS_DATASET_DIMENSIONS_QUERY = `
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
`;

function buildInsObservationsBatchQuery(datasetCodes: string[]) {
  const aliasMap: Record<string, string> = {};
  const fields = datasetCodes.map((code, index) => {
    const alias = `d${index}`;
    aliasMap[alias] = code;
    return `${alias}: insObservations(datasetCode: "${code}", filter: $filter, limit: $limit, offset: 0) {\n` +
      `  nodes { ${INS_OBSERVATION_FIELDS} }\n` +
      `  pageInfo { totalCount hasNextPage hasPreviousPage }\n` +
      `}`;
  }).join('\n');

  const query = `
    query InsObservationsBatch($filter: InsObservationFilterInput, $limit: Int) {
      ${fields}
    }
  `;

  return { query, aliasMap };
}

export async function getInsUatDashboard(params: {
  sirutaCode: string;
  period?: string;
  contextCode?: string;
}): Promise<InsDashboardData> {
  logger.info('Fetching INS UAT dashboard', params);

  const response = await graphqlRequest<{ insUatDashboard: InsUatDatasetGroup[] }>(
    INS_UAT_DASHBOARD_QUERY,
    {
      sirutaCode: params.sirutaCode,
      period: params.period,
      contextCode: params.contextCode,
    }
  );

  const groups = response.insUatDashboard ?? [];
  const totalObservations = groups.reduce((total, group) => total + group.observations.length, 0);

  return {
    groups,
    partial: totalObservations >= INS_UAT_DASHBOARD_LIMIT,
  };
}

export async function getInsDatasetsByCodes(codes: string[]): Promise<InsDataset[]> {
  if (codes.length === 0) return [];

  logger.info('Fetching INS datasets by codes', { count: codes.length });

  const response = await graphqlRequest<{ insDatasets: { nodes: InsDataset[] } }>(
    INS_DATASETS_BY_CODES_QUERY,
    {
      codes,
      limit: Math.min(codes.length, 200),
    }
  );

  return response.insDatasets.nodes ?? [];
}

export async function getInsContexts(params: {
  filter?: InsContextFilterInput;
  limit?: number;
  offset?: number;
}): Promise<InsContextConnection> {
  const response = await graphqlRequest<{ insContexts: InsContextConnection }>(INS_CONTEXTS_QUERY, {
    filter: params.filter,
    limit: params.limit ?? 200,
    offset: params.offset ?? 0,
  });

  return response.insContexts;
}

export async function getInsDatasetsCatalog(params: {
  filter?: InsDatasetFilterInput;
  limit?: number;
  offset?: number;
}): Promise<InsDatasetConnection> {
  const response = await graphqlRequest<{ insDatasets: InsDatasetConnection }>(INS_DATASETS_QUERY, {
    filter: params.filter,
    limit: params.limit ?? 500,
    offset: params.offset ?? 0,
  });

  return response.insDatasets;
}

export async function searchInsDatasets(params: {
  filter?: InsDatasetFilterInput;
  limit?: number;
  offset?: number;
}): Promise<InsDatasetConnection> {
  const response = await graphqlRequest<{ insDatasets: InsDatasetConnection }>(INS_DATASETS_QUERY, {
    filter: params.filter,
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  });

  return response.insDatasets;
}

export async function getInsDatasetDetails(code: string): Promise<InsDatasetDetails | null> {
  if (!code) return null;

  const response = await graphqlRequest<{ insDataset: InsDatasetDetails | null }>(
    INS_DATASET_DETAILS_QUERY,
    { code }
  );

  return response.insDataset;
}

export async function getInsDimensionValuesPage(params: {
  datasetCode: string;
  dimensionIndex: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<InsDimensionValueConnection> {
  if (!params.datasetCode) {
    return {
      nodes: [],
      pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false },
    };
  }

  const response = await graphqlRequest<{
    insDatasetDimensionValues: InsDimensionValueConnection;
  }>(INS_DATASET_DIMENSION_VALUES_QUERY, {
    datasetCode: params.datasetCode,
    dimensionIndex: params.dimensionIndex,
    search: params.search ?? '',
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
  });

  return response.insDatasetDimensionValues ?? {
    nodes: [],
    pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false },
  };
}

export async function getInsObservationsPage(params: {
  datasetCode: string;
  filter?: InsObservationFilterInput;
  limit?: number;
  offset?: number;
}): Promise<InsObservationConnection> {
  const response = await graphqlRequest<{ insObservations: InsObservationConnection }>(
    INS_OBSERVATIONS_QUERY,
    {
      datasetCode: params.datasetCode,
      filter: params.filter,
      limit: params.limit ?? 200,
      offset: params.offset ?? 0,
    }
  );

  return response.insObservations;
}

export async function getAllInsObservations(params: {
  datasetCode: string;
  filter?: InsObservationFilterInput;
  pageSize?: number;
  maxPages?: number;
}): Promise<InsObservation[]> {
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 1000, 1000));
  const maxPages = Math.max(1, params.maxPages ?? 20);

  const allNodes: InsObservation[] = [];
  let offset = 0;
  let page = 0;
  let hasNext = true;

  while (hasNext && page < maxPages) {
    const response = await getInsObservationsPage({
      datasetCode: params.datasetCode,
      filter: params.filter,
      limit: pageSize,
      offset,
    });

    const nodes = response.nodes ?? [];
    allNodes.push(...nodes);

    hasNext = !!response.pageInfo?.hasNextPage;
    offset += nodes.length;
    page += 1;

    if (nodes.length === 0) {
      break;
    }
  }

  return allNodes;
}

export interface InsDatasetHistoryResult {
  observations: InsObservation[];
  totalCount: number;
  partial: boolean;
}

export interface InsObservationsSnapshotByDatasetResult {
  observationsByDataset: Map<string, InsObservation[]>;
}

function getConnectionNodes(connection: InsObservationConnection | null | undefined): InsObservation[] {
  return connection?.nodes ?? [];
}

function connectionHasNextPage(connection: InsObservationConnection | null | undefined): boolean {
  return connection?.pageInfo?.hasNextPage ?? false;
}

export async function getInsDatasetDimensions(datasetCode: string): Promise<InsDatasetDimensionsResult | null> {
  if (datasetCode.trim().length === 0) return null;

  const response = await graphqlRequest<{
    insDatasets: {
      nodes: Array<{
        code: string;
        dimensions?: InsDatasetDimensionsResult['dimensions'] | null;
      }>;
    };
  }>(INS_DATASET_DIMENSIONS_QUERY, { datasetCode });

  const node = response.insDatasets?.nodes?.[0];
  if (!node) return null;

  return {
    datasetCode: node.code,
    dimensions: node.dimensions ?? [],
  };
}

export async function getInsDatasetHistory(params: {
  datasetCode: string;
  filter: InsObservationFilterInput;
  pageSize?: number;
  maxPages?: number;
}): Promise<InsDatasetHistoryResult> {
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 500, 1000));
  const maxPages = Math.max(1, params.maxPages ?? 20);

  let offset = 0;
  let page = 0;
  let totalCount = 0;
  let hasNextPage = true;
  const observations: InsObservation[] = [];

  while (hasNextPage && page < maxPages) {
    const response = await graphqlRequest<{ insObservations: InsObservationConnection }>(
      INS_DATASET_HISTORY_QUERY,
      {
        datasetCode: params.datasetCode,
        filter: params.filter,
        limit: pageSize,
        offset,
      }
    );

    const connection = response.insObservations;
    const nodes = getConnectionNodes(connection);
    observations.push(...nodes);
    totalCount = connection.pageInfo?.totalCount ?? totalCount;
    hasNextPage = connectionHasNextPage(connection);

    offset += nodes.length;
    page += 1;

    if (nodes.length === 0) {
      break;
    }
  }

  return {
    observations,
    totalCount,
    partial: hasNextPage,
  };
}

async function getInsObservationsBatch(params: {
  datasetCodes: string[];
  filter: InsObservationFilterInput;
  limit?: number;
}): Promise<Map<string, InsObservationConnection>> {
  if (params.datasetCodes.length === 0) return new Map();

  const { query, aliasMap } = buildInsObservationsBatchQuery(params.datasetCodes);
  const response = await graphqlRequest<Record<string, InsObservationConnection>>(query, {
    filter: params.filter,
    limit: params.limit ?? INS_OBSERVATION_LIMIT,
  });

  const result = new Map<string, InsObservationConnection>();
  for (const [alias, connection] of Object.entries(response)) {
    const datasetCode = aliasMap[alias];
    if (datasetCode) {
      result.set(datasetCode, connection);
    }
  }

  return result;
}

export async function getInsObservationsSnapshotByDatasets(params: {
  datasetCodes: string[];
  filter: InsObservationFilterInput;
  limit?: number;
}): Promise<InsObservationsSnapshotByDatasetResult> {
  const observationsByDatasetConnection = await getInsObservationsBatch({
    datasetCodes: params.datasetCodes,
    filter: params.filter,
    limit: params.limit,
  });

  const observationsByDataset = new Map<string, InsObservation[]>();
  for (const [datasetCode, connection] of observationsByDatasetConnection.entries()) {
    observationsByDataset.set(datasetCode, getConnectionNodes(connection));
  }

  for (const datasetCode of params.datasetCodes) {
    if (!observationsByDataset.has(datasetCode)) {
      observationsByDataset.set(datasetCode, []);
    }
  }

  return { observationsByDataset };
}

function getLatestPeriod(observations: InsObservation[]): string | null {
  let latestPeriod: string | null = null;
  let latestKey: number | null = null;

  for (const observation of observations) {
    const period = observation.time_period;
    const key = period.year * 10000 + (period.quarter ?? 0) * 100 + (period.month ?? 0);
    if (latestKey === null || key > latestKey) {
      latestKey = key;
      latestPeriod = period.iso_period;
    }
  }

  return latestPeriod;
}

export async function getInsCountyDashboard(params: {
  countyCode: string;
  datasetCodes: string[];
}): Promise<InsDashboardData> {
  const datasetCodes = params.datasetCodes;
  if (datasetCodes.length === 0) return { groups: [], partial: false };

  const normalizedCountyCode = params.countyCode.trim().toUpperCase();
  if (normalizedCountyCode.length === 0) {
    return { groups: [], partial: false };
  }

  const observationFilter: InsObservationFilterInput = {
    territoryCodes: [normalizedCountyCode],
    territoryLevels: ['NUTS3'],
  };

  logger.info('Fetching INS county dashboard', {
    countyCode: normalizedCountyCode,
    filterMode: 'territoryCode',
    datasetCount: datasetCodes.length,
  });

  const datasets = await getInsDatasetsByCodes(datasetCodes);
  const datasetMap = new Map(datasets.map((dataset) => [dataset.code, dataset]));

  const buildGroups = (observationsMap: Map<string, InsObservationConnection>) => {
    const groups: InsUatDatasetGroup[] = [];
    let partial = false;

    for (const code of datasetCodes) {
      const dataset = datasetMap.get(code);
      const connection = observationsMap.get(code);
      if (!dataset || !connection) continue;
      if (!dataset.has_county_data) continue;
      if (connectionHasNextPage(connection)) {
        partial = true;
      }

      const observations = getConnectionNodes(connection);
      if (observations.length === 0) continue;

      groups.push({
        dataset,
        observations,
        latestPeriod: getLatestPeriod(observations),
      });
    }

    return { groups, partial };
  };

  const observationsByDataset = await getInsObservationsBatch({
    datasetCodes,
    filter: observationFilter,
  });

  return buildGroups(observationsByDataset);
}
