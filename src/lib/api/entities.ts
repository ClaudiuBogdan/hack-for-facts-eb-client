import { graphqlRequest } from "./graphql";
import { createLogger } from "../logger";
import { EntitySearchResult, EntitySearchNode } from "@/schemas/entities";
import { AnalyticsSeries } from "@/schemas/charts";
import { GqlReportType, ReportPeriodInput } from "@/schemas/reporting";
import type { NormalizationOptions } from "@/lib/normalization";
import {
  fetchRedesignEntityDetails,
  fetchRedesignEntityExecutionLineItems,
  fetchRedesignEntityRelationships,
  fetchRedesignEntityRoutingSummary,
  fetchRedesignReportsConnection,
} from "./entities-redesign";

const logger = createLogger("entities-api");

export interface FundingSourceOption {
  source_id: string;
  source_description: string;
}

export interface ExecutionLineItem {
  line_item_id: string;
  account_category: "vn" | "ch";
  funding_source_id: number;
  expense_type?: "dezvoltare" | "functionare";
  anomaly?: "YTD_ANOMALY" | "MISSING_LINE_ITEM";
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

export interface EntityProfileData {
  institution_type: string | null;
  website_url: string | null;
  official_email: string | null;
  phone_primary: string | null;
  address_raw: string | null;
  address_locality: string | null;
  county_code: string | null;
  county_name: string | null;
  leader_name: string | null;
  leader_title: string | null;
  leader_party: string | null;
  scraped_at: string;
  extraction_confidence: number | null;
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
  pageInfo: PageInfo;
}

export async function getEntityDetails(
  params: {
    cui: string;
    reportPeriod: ReportPeriodInput;
    reportType?: GqlReportType;
    trendPeriod?: ReportPeriodInput;
    mainCreditorCui?: string;
  } & NormalizationOptions,
): Promise<EntityDetailsData | null> {
  logger.info(`Fetching entity details for CUI: ${params.cui}`);

  try {
    return await fetchRedesignEntityDetails(params);
  } catch (error) {
    logger.error(`Error fetching entity details for CUI: ${params.cui}`, {
      error,
      cui: params.cui,
    });
    throw error;
  }
}

export async function getEntityShareSnapshot(
  params: {
    cui: string;
    reportPeriod: ReportPeriodInput;
    reportType?: GqlReportType;
    mainCreditorCui?: string;
  } & NormalizationOptions,
): Promise<EntityShareSnapshotData | null> {
  logger.info(`Fetching entity share snapshot for CUI: ${params.cui}`);

  try {
    const entity = await fetchRedesignEntityDetails({
      ...params,
      trendPeriod: params.reportPeriod,
    });
    if (!entity) {
      logger.warn(
        "Received null or undefined response for entity share snapshot",
        {
          cui: params.cui,
        },
      );
      return null;
    }
    return entity;
  } catch (error) {
    logger.error(
      `Error fetching entity share snapshot for CUI: ${params.cui}`,
      {
        error,
        cui: params.cui,
      },
    );
    throw error;
  }
}

export async function getEntityRoutingSummary(
  cui: string,
): Promise<EntityRoutingSummary | null> {
  logger.info(`Fetching entity routing summary for CUI: ${cui}`);

  try {
    return await fetchRedesignEntityRoutingSummary(cui);
  } catch (error) {
    logger.error(`Error fetching entity routing summary for CUI: ${cui}`, {
      error,
      cui,
    });
    throw error;
  }
}

export async function getEntityProfile(
  cui: string,
): Promise<EntityProfileData | null> {
  logger.info(`Fetching entity profile for CUI: ${cui}`);

  // The redesign API does not yet expose the provenance-matched, automatically
  // scraped contact/leadership profile. Returning null preserves the existing
  // explicit "No profile data available" state instead of relabelling registry
  // fields as scraper evidence.
  return null;
}

export async function getEntityRelationships(
  cui: string,
): Promise<Pick<EntityDetailsData, "children" | "parents">> {
  return fetchRedesignEntityRelationships(cui);
}

export async function getEntityReports(
  cui: string,
  params?: {
    limit?: number;
    offset?: number;
    year?: number;
    period?: string;
    type?: GqlReportType;
    sort?: { by: string; order: "ASC" | "DESC" };
  },
): Promise<ReportConnection | null> {
  const filter: ReportsFilterInput = {
    entity_cui: cui,
    ...(params?.year !== undefined ? { reporting_year: params.year } : {}),
    ...(params?.period !== undefined
      ? { reporting_period: params.period }
      : {}),
    ...(params?.type !== undefined ? { report_type: params.type } : {}),
  };
  return fetchRedesignReportsConnection(
    filter,
    params?.limit ?? 10,
    params?.offset ?? 0,
  );
}

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
  offset: number = 0,
): Promise<ReportConnection> {
  return fetchRedesignReportsConnection(filter, limit, offset);
}

export async function getEntityExecutionLineItems(
  params: {
    cui: string;
    reportPeriod: ReportPeriodInput;
    reportType?: GqlReportType;
    mainCreditorCui?: string;
  } & NormalizationOptions,
): Promise<{
  nodes: ExecutionLineItem[];
  fundingSources: FundingSourceOption[];
}> {
  return fetchRedesignEntityExecutionLineItems(params);
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
): Promise<EntitySearchNode[]> {
  // Return nodes directly for simplicity in the component
  if (!searchTerm || searchTerm.trim() === "") {
    return Promise.resolve([]);
  }

  // Length, never the term. `logger.info` becomes a Sentry breadcrumb, so the
  // raw query string was leaving the browser on every debounced search —
  // including whatever a user typed before realising it was a search box. The
  // analytics event on this same path already sends `query_len` only; this now
  // matches it (SEARCH_LAYER_REVIEW_2026-08-25.md F15).
  logger.info("Searching entities", {
    queryLength: searchTerm.length,
    limit,
    options,
  });

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
    const response = await graphqlRequest<{ entities: EntitySearchResult }>(
      ENTITY_SEARCH_QUERY,
      variables,
    );

    // Check if response and response.entities and response.entities.nodes exist
    if (response && response.entities && response.entities.nodes) {
      if (!options.excludeCounty) {
        return response.entities.nodes;
      }

      return response.entities.nodes.filter(
        (entity) => entity.entity_type !== "admin_county_council",
      );
    }
    return []; // Return empty array if data is not in the expected shape
  } catch (error) {
    // `logger.error` ships a full Sentry EVENT, not just a breadcrumb, so the
    // raw term was landing on a real retained issue.
    logger.error("Error searching entities", {
      error,
      queryLength: searchTerm.length,
    });
    // Depending on error handling strategy, you might want to throw the error
    // or return an empty array / specific error object.
    throw error; // Or return [];
  }
}

export const filterLineItems = (
  items: readonly ExecutionLineItem[],
  filter: string | undefined,
): readonly ExecutionLineItem[] => {
  if (!filter) return items;

  return items.filter((item) => {
    const ecCode = item.economicClassification?.economic_code || "";

    switch (filter) {
      case "economic:all":
        return true;
      case "economic:personal":
        return ecCode.startsWith("10");
      case "economic:goods":
        return ecCode.startsWith("20");
      case "economic:others":
        return !ecCode.startsWith("10") && !ecCode.startsWith("20");
      case "anomaly:missing":
        return item.anomaly === "MISSING_LINE_ITEM";
      case "anomaly:value_changed":
        return item.anomaly === "YTD_ANOMALY";
      default:
        return true;
    }
  });
};
