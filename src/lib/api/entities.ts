import { graphqlRequest } from "./graphql";
import { createLogger } from "../logger";
import { EntitySearchResult, EntitySearchNode } from "@/schemas/entities";
import { AnalyticsSeries } from '@/schemas/charts';
import { GqlReportType, ReportPeriodInput } from "@/schemas/reporting";
import type { NormalizationOptions } from "@/lib/normalization";

const logger = createLogger("entities-api");

export interface FundingSourceOption {
  source_id: string;
  source_description: string;
}

export interface ExecutionLineItem {
  line_item_id: string;
  account_category: 'vn' | 'ch';
  funding_source_id: number;
  expense_type?: 'dezvoltare' | 'functionare';
  anomaly?: 'YTD_ANOMALY' | 'MISSING_LINE_ITEM';
  functionalClassification?: {
    functional_name: string;
    functional_code: string;
  };
  economicClassification?: {
    economic_name: string;
    economic_code: string;
  } | null;
  ytd_amount: number;
  quarterly_amount: number;
  monthly_amount: number;
  // Client-computed unified amount for UI, based on the period type
  // Ex: yearly: amount <= ytd_amount, quarterly: amount <= quarterly_amount, monthly: amount <= monthly_amount
  amount: number;
}

type RawExecutionLineItem = Pick<ExecutionLineItem, 'line_item_id' | 'account_category' | 'funding_source_id' | 'expense_type' | 'anomaly' | 'functionalClassification' | 'economicClassification' | 'ytd_amount' | 'quarterly_amount' | 'monthly_amount'>;

export interface EntityDetailsData {
  cui: string;
  name: string;
  address?: string | null;
  default_report_type: GqlReportType;
  entity_type?: string | null;
  is_uat?: boolean | null;
  uat?: {
    county_name?: string | null;
    county_code?: string | null;
    name?: string | null;
    siruta_code?: number | null;
    population?: number | null;
    county_entity?: {
      cui: string;
      name: string;
    } | null;
  } | null;
  children?: {
    cui: string;
    name: string;
  }[];
  parents?: {
    cui: string;
    name: string;
  }[];
  totalIncome?: number | null;
  totalExpenses?: number | null;
  budgetBalance?: number | null;
  incomeTrend?: AnalyticsSeries | null;
  expenseTrend?: AnalyticsSeries | null;
  balanceTrend?: AnalyticsSeries | null;
  executionLineItems?: {
    nodes: ExecutionLineItem[];
  } | null;
  reports?: {
    nodes: {
      report_id: string;
      reporting_year: number;
      report_type: string;
      report_date: string;
      download_links: string[];
      main_creditor: {
        cui: string;
        name: string;
      };
      budgetSector: {
        sector_id: string;
        sector_description: string;
      };
    }[];
  } | null;
}

export type EntityShareSnapshotData = Pick<
  EntityDetailsData,
  | "cui"
  | "name"
  | "default_report_type"
  | "entity_type"
  | "uat"
  | "totalIncome"
  | "totalExpenses"
  | "budgetBalance"
>;

export interface EntityRoutingSummary {
  cui: string;
  entity_type?: string | null;
  is_uat?: boolean | null;
}

// --- Reports types (connection for pagination) ---
export interface ReportNode {
  report_id: string;
  reporting_year: number;
  report_type: string;
  report_date: string;
  download_links: string[];
  main_creditor: { cui: string; name: string };
  budgetSector: { sector_id: string; sector_description: string };
}

interface PageInfo {
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ReportConnection {
  nodes: ReportNode[];
  pageInfo: PageInfo
}

const GET_ENTITY_DETAILS_QUERY = `
  query GetEntityDetails(
    $cui: ID!
    $normalization: Normalization
    $currency: Currency
    $inflation_adjusted: Boolean
    $show_period_growth: Boolean
    $reportPeriod: ReportPeriodInput!
    $reportType: ReportType
    $trendPeriod: ReportPeriodInput!
    $mainCreditorCui: String
  ) {
    entity(cui: $cui) {
      cui
      name
      address
      default_report_type
      entity_type
      is_uat
      uat {
        county_name
        county_code
        name
        siruta_code
        population
        county_entity{
          cui
          name
        }
      }
      parents { 
        cui 
        name
      }
      totalIncome(period: $reportPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui)
      totalExpenses(period: $reportPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui)
      budgetBalance(period: $reportPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui)
      incomeTrend(period: $trendPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, show_period_growth: $show_period_growth, main_creditor_cui: $mainCreditorCui) {
        seriesId
        xAxis { name type unit }
        yAxis { name type unit }
        data { x y }
      }
      expenseTrend: expensesTrend(period: $trendPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, show_period_growth: $show_period_growth, main_creditor_cui: $mainCreditorCui) {
        seriesId
        xAxis { name type unit }
        yAxis { name type unit }
        data { x y }
      }
      balanceTrend(period: $trendPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, show_period_growth: $show_period_growth, main_creditor_cui: $mainCreditorCui) {
        seriesId
        xAxis { name type unit }
        yAxis { name type unit }
        data { x y }
      }
    }
  }
`;

const GET_ENTITY_SHARE_SNAPSHOT_QUERY = `
  query GetEntityShareSnapshot(
    $cui: ID!
    $normalization: Normalization
    $currency: Currency
    $inflation_adjusted: Boolean
    $reportPeriod: ReportPeriodInput!
    $reportType: ReportType
    $mainCreditorCui: String
  ) {
    entity(cui: $cui) {
      cui
      name
      default_report_type
      entity_type
      uat {
        county_name
        county_code
        name
        siruta_code
        population
      }
      totalIncome(period: $reportPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui)
      totalExpenses(period: $reportPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui)
      budgetBalance(period: $reportPeriod, reportType: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui)
    }
  }
`;

const GET_ENTITY_ROUTING_SUMMARY_QUERY = `
  query GetEntityRoutingSummary($cui: ID!) {
    entity(cui: $cui) {
      cui
      entity_type
      is_uat
    }
  }
`;

export async function getEntityDetails(params: {
  cui: string
  reportPeriod: ReportPeriodInput
  reportType?: GqlReportType
  trendPeriod?: ReportPeriodInput
  mainCreditorCui?: string
} & NormalizationOptions): Promise<EntityDetailsData | null> {
  const {
    cui,
    reportPeriod,
    reportType,
    trendPeriod,
    mainCreditorCui,
    normalization = 'total',
    currency = 'RON',
    inflation_adjusted = false,
    show_period_growth = false,
  } = params
  logger.info(`Fetching entity details for CUI: ${cui}`);

  try {
    const response = await graphqlRequest<{
      entity: (Omit<EntityDetailsData, 'incomeTrend' | 'expenseTrend' | 'balanceTrend'> & {
        incomeTrend?: AnalyticsSeries | null;
        expenseTrend?: AnalyticsSeries | null;
        balanceTrend?: AnalyticsSeries | null;
      }) | null;
    }>(
      GET_ENTITY_DETAILS_QUERY,
      { cui, normalization, currency, inflation_adjusted, show_period_growth, reportPeriod, reportType, trendPeriod: trendPeriod ?? reportPeriod, mainCreditorCui }
    );

    if (!response || !response.entity) {
      logger.warn("Received null or undefined response for entity details", {
        response,
        cui,
      });
      return null;
    }

    const merged: EntityDetailsData = {
      ...response.entity,
      incomeTrend: response.entity.incomeTrend ?? null,
      expenseTrend: response.entity.expenseTrend ?? null,
      balanceTrend: response.entity.balanceTrend ?? null,
    } as EntityDetailsData;

    return merged;
  } catch (error) {
    logger.error(`Error fetching entity details for CUI: ${cui}`, {
      error,
      cui,
    });
    throw error;
  }
}

export async function getEntityShareSnapshot(params: {
  cui: string
  reportPeriod: ReportPeriodInput
  reportType?: GqlReportType
  mainCreditorCui?: string
} & NormalizationOptions): Promise<EntityShareSnapshotData | null> {
  const {
    cui,
    reportPeriod,
    reportType,
    mainCreditorCui,
    normalization = 'total',
    currency = 'RON',
    inflation_adjusted = false,
  } = params

  logger.info(`Fetching entity share snapshot for CUI: ${cui}`)

  try {
    const response = await graphqlRequest<{
      entity: EntityShareSnapshotData | null
    }>(
      GET_ENTITY_SHARE_SNAPSHOT_QUERY,
      { cui, normalization, currency, inflation_adjusted, reportPeriod, reportType, mainCreditorCui }
    )

    if (!response || !response.entity) {
      logger.warn("Received null or undefined response for entity share snapshot", {
        response,
        cui,
      })
      return null
    }

    return response.entity
  } catch (error) {
    logger.error(`Error fetching entity share snapshot for CUI: ${cui}`, {
      error,
      cui,
    })
    throw error
  }
}

export async function getEntityRoutingSummary(
  cui: string,
): Promise<EntityRoutingSummary | null> {
  logger.info(`Fetching entity routing summary for CUI: ${cui}`);

  try {
    const response = await graphqlRequest<{
      entity: EntityRoutingSummary | null;
    }>(GET_ENTITY_ROUTING_SUMMARY_QUERY, { cui });

    if (!response || !response.entity) {
      logger.warn("Received null or undefined response for entity routing summary", {
        response,
        cui,
      });
      return null;
    }

    return response.entity;
  } catch (error) {
    logger.error(`Error fetching entity routing summary for CUI: ${cui}`, {
      error,
      cui,
    });
    throw error;
  }
}

const GET_ENTITY_RELATIONSHIPS_QUERY = `
  query GetEntityRelationships($cui: ID!) {
    entity(cui: $cui) {
      children { cui name }
      parents { cui name }
    }
  }
`;

export async function getEntityRelationships(cui: string): Promise<Pick<EntityDetailsData, 'children' | 'parents'>> {
  const data = await graphqlRequest<{ entity: { children?: { cui: string; name: string }[]; parents?: { cui: string; name: string }[] } | null }>(
    GET_ENTITY_RELATIONSHIPS_QUERY,
    { cui }
  );
  const children = data?.entity?.children ?? [];
  const parents = data?.entity?.parents ?? [];
  return { children, parents };
}

const GET_ENTITY_REPORTS_QUERY = `
  query GetEntityReports(
    $cui: ID!
    $limit: Int
    $offset: Int
    $year: Int
    $period: String
    $type: ReportType
    $sort: SortOrder
  ) {
    entity(cui: $cui) {
      reports(limit: $limit, offset: $offset, year: $year, period: $period, type: $type, sort: $sort) {
        nodes {
          report_id
          reporting_year
          report_type
          report_date
          download_links
          main_creditor { cui name }
          budgetSector { sector_id sector_description }
        }
        pageInfo {
          totalCount
          hasNextPage
          hasPreviousPage
        }
      }
    }
  }
`;

export async function getEntityReports(
  cui: string,
  params?: {
    limit?: number;
    offset?: number;
    year?: number;
    period?: string;
    type?: GqlReportType;
    sort?: { by: string; order: 'ASC' | 'DESC' };
  }
): Promise<ReportConnection | null> {
  const variables = { cui, ...(params ?? {}) } as const;
  const data = await graphqlRequest<{ entity: { reports: { nodes: ReportNode[]; pageInfo: PageInfo } } | null }>(
    GET_ENTITY_REPORTS_QUERY,
    variables
  );
  const conn = data?.entity?.reports;
  if (!conn) return null;
  return { nodes: conn.nodes, pageInfo: conn.pageInfo };
}

const GET_REPORTS_QUERY = `
  query GetReports($filter: ReportFilter, $limit: Int, $offset: Int) {
    reports(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        report_id
        reporting_year
        report_type
        report_date
        download_links
        main_creditor { cui name }
        budgetSector { sector_id sector_description }
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export interface ReportsFilterInput {
  entity_cui?: string;
  reporting_year?: number;
  reporting_period?: string;
  report_type?: GqlReportType;
  report_date_start?: string;
  report_date_end?: string;
  main_creditor_cui?: string;
  search?: string;
}

export async function getReportsConnection(
  filter: ReportsFilterInput,
  limit: number = 10,
  offset: number = 0
): Promise<ReportConnection> {
  const data = await graphqlRequest<{ reports: { nodes: ReportNode[]; totalCount: number } }>(
    GET_REPORTS_QUERY,
    { filter, limit, offset }
  );
  const conn = (data as any)?.reports;
  return { nodes: conn?.nodes ?? [], pageInfo: conn?.pageInfo ?? { totalCount: 0, hasNextPage: false, hasPreviousPage: false } };
}

const GET_ENTITY_LINE_ITEMS_QUERY = `
  query GetEntityLineItems(
    $cui: ID!
    $reportPeriod: ReportPeriodInput!
    $reportType: ReportType
    $normalization: Normalization
    $currency: Currency
    $inflation_adjusted: Boolean
    $mainCreditorCui: String
  ) {
    entity(cui: $cui) {
      executionLineItemsCh: executionLineItems(
        filter: { account_category: ch, report_period: $reportPeriod, report_type: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui }
        sort: { by: "amount", order: "DESC" }
        limit: 15000
      ) {
        nodes {
          line_item_id
          account_category
          funding_source_id
          expense_type
          anomaly
          functionalClassification { functional_name functional_code }
          economicClassification { economic_name economic_code }
          ytd_amount
          quarterly_amount
          monthly_amount
        }
      }
      executionLineItemsVn: executionLineItems(
        filter: { account_category: vn, report_period: $reportPeriod, report_type: $reportType, normalization: $normalization, currency: $currency, inflation_adjusted: $inflation_adjusted, main_creditor_cui: $mainCreditorCui }
        sort: { by: "amount", order: "DESC" }
        limit: 15000
      ) {
        nodes {
          line_item_id
          account_category
          funding_source_id
          expense_type
          anomaly
          functionalClassification { functional_name functional_code }
          economicClassification { economic_name economic_code }
          ytd_amount
          quarterly_amount
          monthly_amount
        }
      }
    }
    fundingSources {
      nodes {
        source_id
        source_description
      }
    }
  }
`;

export async function getEntityExecutionLineItems(
  params: {
    cui: string
    reportPeriod: ReportPeriodInput
    reportType?: GqlReportType
    mainCreditorCui?: string
  } & NormalizationOptions,
): Promise<{ nodes: ExecutionLineItem[], fundingSources: FundingSourceOption[] }> {
  const {
    cui,
    reportPeriod,
    reportType,
    mainCreditorCui,
    normalization = 'total',
    currency = 'RON',
    inflation_adjusted = false,
  } = params
  const data = await graphqlRequest<{
    entity: {
      executionLineItemsCh?: { nodes: ExecutionLineItem[] } | null;
      executionLineItemsVn?: { nodes: ExecutionLineItem[] } | null;
    } | null;
    fundingSources?: { nodes: FundingSourceOption[] } | null;
  }>(GET_ENTITY_LINE_ITEMS_QUERY, { cui, reportPeriod, reportType, normalization, currency, inflation_adjusted, mainCreditorCui });

  const periodType = reportPeriod.type;
  const mapWithAmount = (n: RawExecutionLineItem): ExecutionLineItem => {
    const amount = periodType === 'YEAR' ? Number(n?.ytd_amount ?? 0) : periodType === 'QUARTER' ? Number(n?.quarterly_amount ?? 0) : Number(n?.monthly_amount ?? 0);
    return { ...n, amount };
  };

  const mergedNodes: ExecutionLineItem[] = [
    ...(data?.entity?.executionLineItemsCh?.nodes ?? []),
    ...(data?.entity?.executionLineItemsVn?.nodes ?? []),
  ].map(mapWithAmount);

  return { nodes: mergedNodes, fundingSources: data?.fundingSources?.nodes ?? [] };
}

const ENTITY_SEARCH_QUERY = `
  query EntitySearch($filter: EntityFilter, $limit: Int) {
    entities(filter: $filter, limit: $limit) {
      nodes {
        name
        cui
        entity_type
        is_uat
        uat {
          county_name
          name
        }
      }
      # If your API returns pagination info for search, you can include it here
      # pageInfo {
      #   totalCount
      # }
    }
  }
`;

export type SearchEntitiesOptions = {
  readonly isUat?: boolean;
  readonly excludeCounty?: boolean;
};

/**
 * Searches for entities based on a search term.
 * @param searchTerm The term to search for.
 * @param limit The maximum number of results to return (default: 10).
 * @returns A promise that resolves to the search results.
 */
export async function searchEntities(
  searchTerm: string,
  limit: number = 10,
  options: SearchEntitiesOptions = {},
): Promise<EntitySearchNode[]> { // Return nodes directly for simplicity in the component
  if (!searchTerm || searchTerm.trim() === "") {
    return Promise.resolve([]);
  }

  logger.info("Searching entities", { searchTerm, limit, options });

  try {
    const filter = {
      search: searchTerm,
      ...(options.isUat ? { is_uat: true } : {}),
    };

    const variables = {
      filter,
      limit,
    };

    // The actual response structure from graphqlRequest will be { data: { entities: EntitySearchResult } }
    // or just { entities: EntitySearchResult } if graphqlRequest unwraps the 'data' object.
    // Adjust based on how graphqlRequest is implemented.
    // The current type { entities: EntitySearchResult } assumes graphqlRequest returns the direct GQL response data.
    const response = await graphqlRequest<{ entities: EntitySearchResult }>(ENTITY_SEARCH_QUERY, variables);

    // Check if response and response.entities and response.entities.nodes exist
    if (response && response.entities && response.entities.nodes) {
      if (!options.excludeCounty) {
        return response.entities.nodes;
      }

      return response.entities.nodes.filter(
        (entity) => entity.entity_type !== 'admin_county_council',
      );
    }
    return []; // Return empty array if data is not in the expected shape

  } catch (error) {
    logger.error("Error searching entities", { error, searchTerm });
    // Depending on error handling strategy, you might want to throw the error
    // or return an empty array / specific error object.
    throw error; // Or return [];
  }
}

export const filterLineItems = (items: readonly ExecutionLineItem[], filter: string | undefined): readonly ExecutionLineItem[] => {
  if (!filter) return items;

  return items.filter(item => {
    const ecCode = item.economicClassification?.economic_code || '';

    switch (filter) {
      case 'economic:all':
        return true;
      case 'economic:personal':
        return ecCode.startsWith('10');
      case 'economic:goods':
        return ecCode.startsWith('20');
      case 'economic:others':
        return !ecCode.startsWith('10') && !ecCode.startsWith('20');
      case 'anomaly:missing':
        return item.anomaly === 'MISSING_LINE_ITEM';
      case 'anomaly:value_changed':
        return item.anomaly === 'YTD_ANOMALY';
      default:
        return true;
    }
  });
};
