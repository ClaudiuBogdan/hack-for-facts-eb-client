import { graphqlQuery } from "@/lib/graphql/graphql-client";
import type {
  EntityAnalyticsConnection,
  SortOrder,
  AggregatedLineItemConnection,
} from "@/schemas/entity-analytics";
import { AnalyticsFilterType } from "@/schemas/charts";
import { prepareFilterForServer } from "@/lib/filterUtils";

const ENTITY_ANALYTICS_QUERY = /* GraphQL */ `
  query EntityAnalytics(
    $filter: AnalyticsFilterInput!
    $sort: SortOrder
    $limit: Int
    $offset: Int
  ) {
    entityAnalytics(
      filter: $filter
      sort: $sort
      limit: $limit
      offset: $offset
    ) {
      nodes {
        entity_cui
        entity_name
        entity_type
        uat_id
        county_code
        county_name
        population
        amount
        total_amount
        per_capita_amount
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

const AGGREGATED_LINE_ITEMS_QUERY = /* GraphQL */ `
  query AggregatedLineItems(
    $filter: AnalyticsFilterInput!
    $limit: Int
    $offset: Int
  ) {
    aggregatedLineItems(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        fn_c: functional_code
        fn_n: functional_name
        ec_c: economic_code
        ec_n: economic_name
        amount
        count
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export async function fetchEntityAnalytics(params: {
  filter: AnalyticsFilterType;
  sort?: SortOrder;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<EntityAnalyticsConnection> {
  const data = await graphqlQuery<{
    entityAnalytics: EntityAnalyticsConnection;
  }>(
    ENTITY_ANALYTICS_QUERY,
    {
      filter: prepareFilterForServer(params.filter),
      sort: params.sort,
      limit: params.limit,
      offset: params.offset,
    },
    { signal: params.signal, auth: "none" },
  );
  return data.entityAnalytics;
}

export async function fetchAggregatedLineItems(params: {
  filter: AnalyticsFilterType;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<AggregatedLineItemConnection> {
  const data = await graphqlQuery<{
    aggregatedLineItems: AggregatedLineItemConnection;
  }>(
    AGGREGATED_LINE_ITEMS_QUERY,
    {
      filter: prepareFilterForServer(params.filter),
      limit: params.limit,
      offset: params.offset,
    },
    { signal: params.signal, auth: "none" },
  );
  return data.aggregatedLineItems;
}

/** Treemap consumers require a complete vector, never a silently truncated page. */
export async function fetchCompleteAggregatedLineItems(
  filter: AnalyticsFilterType,
  signal?: AbortSignal,
): Promise<AggregatedLineItemConnection> {
  const page = await fetchAggregatedLineItems({
    filter,
    limit: 100000,
    signal,
  });
  if (
    page.pageInfo.hasNextPage ||
    page.nodes.length !== page.pageInfo.totalCount
  ) {
    throw new Error(
      "The classification result is incomplete. Narrow the filters before displaying the budget distribution.",
    );
  }
  return page;
}

/** App-owned ranking defaults; an explicit executive filter is never overwritten. */
export function entityRankingFilter(
  filter: AnalyticsFilterType,
): AnalyticsFilterType {
  const perCapita =
    filter.normalization === "per_capita" ||
    filter.normalization === "per_capita_euro";
  return perCapita && filter.is_territorial_executive === undefined
    ? { ...filter, is_territorial_executive: true }
    : filter;
}
