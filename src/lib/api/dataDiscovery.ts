import { createLogger } from "../logger";
import { LineItemsFilter, SortOrder } from "@/schemas/interfaces";
import { graphqlRequest } from "./graphql";

const logger = createLogger("data-discovery-api");

// Types based on the GraphQL schema
export type UATData = {
  uat_code?: string;
  name?: string;
  county_name?: string;
  county_code?: string;
  region?: string;
  population?: number;
};

export type EntityData = {
  cui: string;
  name: string;
  sector_type?: string; // Renamed from uat_type, maps to Entity.sector_type
  // Fields from UAT relation
  uat?: UATData;
  address?: string;
  // budget_summary was removed as it's not directly on Entity in the new schema
};

export type BudgetLineItem = {
  line_item_id: string;
  report_id: string; // Kept as string to match current usage, even if schema ID is Int for report_id
  entity_cui: string;
  entity_name?: string;
  reporting_year: number;
  reporting_period: string;
  functional_code: string;
  functional_name?: string;
  economic_code?: string; // Made optional to match schema: economic_code: String
  economic_name?: string;
  amount: number;
  account_category: string;
  // For when we fetch relations
  report?: {
    entity?: {
      name: string;
    };
    reporting_year: number;
    reporting_period: string;
  };
  functionalClassification?: {
    functional_name: string;
  };
  economicClassification?: {
    economic_name: string;
  };
};

export type AggregatedBudgetData = {
  id: string;
  category: string;
  name: string;
  value: number;
  percentage: number;
  children?: AggregatedBudgetData[];
};
export type GetDataParams = {
  filters: LineItemsFilter;
  sort?: SortOrder;
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  pageSize: number;
  totalPages: number;
};

// Query to get entities with filtering
const GET_ENTITIES_QUERY = `
  query GetEntities($filter: EntityFilter, $limit: Int, $offset: Int) {
    entities(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        cui
        name
        sector_type
        uat {
          name
          county_code
          region
          population
        }
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

// Query to get execution line items with filtering
const GET_EXECUTION_LINE_ITEMS_QUERY = `
  query GetExecutionLineItems($filter: ExecutionLineItemFilter, $sort: SortOrder, $limit: Int, $offset: Int) {
    executionLineItems(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
      nodes {
        line_item_id
        report_id
        functional_code
        economic_code
        amount
        account_category
        report {
          reporting_year
          reporting_period
          entity {
            name
          }
        }
        functionalClassification {
          functional_name
        }
        economicClassification {
          economic_name
        }
      }
      pageInfo {
        totalCount
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export async function getEntities({
  filters,
  page = 1,
  pageSize = 50,
}: GetDataParams): Promise<PaginatedResult<EntityData>> {
  logger.info("Fetching entities with filters", { filters, page, pageSize });

  try {
    const offset = (page - 1) * pageSize;

    const response = await graphqlRequest<{
      entities: {
        nodes: EntityData[];
        pageInfo: {
          totalCount: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
      };
    }>(GET_ENTITIES_QUERY, {
      filter: filters,
      limit: pageSize,
      offset,
    });

    const { nodes, pageInfo } = response.entities;
    const totalPages = Math.ceil(pageInfo.totalCount / pageSize);

    return {
      data: nodes,
      totalCount: pageInfo.totalCount,
      hasNextPage: pageInfo.hasNextPage,
      hasPreviousPage: pageInfo.hasPreviousPage,
      currentPage: page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    logger.error("Error fetching entities", { error });
    throw error;
  }
}

export async function getBudgetLineItems({
  filters,
  sort,
  page = 1,
  pageSize = 100,
}: GetDataParams): Promise<PaginatedResult<BudgetLineItem>> {
  logger.info("Fetching budget line items with filters", {
    filters,
    page,
    pageSize,
    sort,
  });

  try {
    const offset = (page - 1) * pageSize;
    const response = await graphqlRequest<{
      executionLineItems: {
        nodes: BudgetLineItem[];
        pageInfo: {
          totalCount: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
      };
    }>(GET_EXECUTION_LINE_ITEMS_QUERY, {
      filter: filters,
      sort: sort?.by ? sort : undefined,
      limit: pageSize,
      offset,
    });

    const { nodes, pageInfo } = response.executionLineItems;
    const totalPages = Math.ceil(pageInfo.totalCount / pageSize);

    // Transform response to match our expected format
    const data = nodes.map((item) => ({
      ...item,
      entity_name: item.report?.entity?.name,
      reporting_year: item.report?.reporting_year || 0,
      reporting_period: item.report?.reporting_period || "",
      functional_name: item.functionalClassification?.functional_name,
      economic_name: item.economicClassification?.economic_name,
    }));


    return {
      data,
      totalCount: pageInfo.totalCount,
      hasNextPage: pageInfo.hasNextPage,
      hasPreviousPage: pageInfo.hasPreviousPage,
      currentPage: page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    logger.error("Error fetching budget line items", { error });
    // Return empty paginated result in case of error
    return {
      data: [],
      totalCount: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      currentPage: page,
      pageSize,
      totalPages: 0,
    };
  }
}

export async function getAggregatedData({
  filters,
}: GetDataParams): Promise<AggregatedBudgetData[]> {
  logger.info("Fetching aggregated data with filters", { filters });

  try {
    // For aggregation, we need a reasonable amount of data but still with pagination
    const result = await getBudgetLineItems({
      filters,
      page: 1,
      pageSize: 500, // Limit to 500 items for aggregation
      sort: {
        by: "amount",
        order: "desc",
      },
    });

    const budgetItems = result.data;

    if (budgetItems.length === 0) {
      return [];
    }

    // Group by functional code and aggregate
    const functionalGroups = budgetItems.reduce((acc, item) => {
      if (!item.functional_code || !item.functional_name) return acc;

      const existingGroup = acc.find(
        (group) => group.id === item.functional_code
      );

      if (existingGroup) {
        existingGroup.value += item.amount;
      } else {
        acc.push({
          id: item.functional_code,
          category: "functional",
          name: item.functional_name,
          value: item.amount,
          percentage: 0, // Will calculate after sum is known
        });
      }

      return acc;
    }, [] as AggregatedBudgetData[]);

    // Calculate total and percentages
    const total = functionalGroups.reduce((sum, group) => sum + group.value, 0);
    functionalGroups.forEach((group) => {
      group.percentage = Math.round((group.value / total) * 100);
    });

    // Sort by value descending
    return functionalGroups.sort((a, b) => b.value - a.value);
  } catch (error) {
    logger.error("Error fetching aggregated data", { error });
    return [];
  }
}

// Functions to get metadata for filters

export async function getUniqueFunctionalCategories(): Promise<
  { code: string; name: string }[]
> {
  try {
    // Use GraphQL query instead of fetching all budget items
    const response = await graphqlRequest<{
      functionalClassifications: {
        functional_code: string;
        functional_name: string;
      }[];
    }>(`
      query GetFunctionalClassifications {
        functionalClassifications {
          functional_code
          functional_name
        }
      }
    `);

    return response.functionalClassifications
      .map((fc) => ({
        code: fc.functional_code,
        name: fc.functional_name,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  } catch (error) {
    logger.error("Error fetching functional categories", { error });
    return [];
  }
}

export async function getUniqueEconomicCategories(): Promise<
  { code: string; name: string }[]
> {
  try {
    // Use GraphQL query instead of fetching all budget items
    const response = await graphqlRequest<{
      economicClassifications: {
        economic_code: string;
        economic_name: string;
      }[];
    }>(`
      query GetEconomicClassifications {
        economicClassifications {
          economic_code
          economic_name
        }
      }
    `);

    return response.economicClassifications
      .map((ec) => ({
        code: ec.economic_code,
        name: ec.economic_name,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  } catch (error) {
    logger.error("Error fetching economic categories", { error });
    return [];
  }
}

export async function getUniqueEntityTypes(): Promise<string[]> {
  try {
    // Get just the entity types, limited by pagination
    const result = await getEntities({
      filters: {
      },
      page: 1,
      pageSize: 100, // Fetch enough entities to get a good sample of types
    });

    return Array.from(new Set(result.data.map((entity) => entity.sector_type).filter(Boolean) as string[]));
  } catch (error) {
    logger.error("Error fetching entity types", { error });
    return [];
  }
}

export async function getUniqueCounties(): Promise<
  { code: string; name: string }[]
> {
  try {
    // Get counties, limited by pagination
    const result = await getEntities({
      filters: {
      },
      page: 1,
      pageSize: 250 // Fetch more entities to get a wider range of countie
    });

    const uniqueCodes = new Set<string>();
    const counties: { code: string; name: string }[] = [];

    result.data.forEach((entity) => {
      // Access county info from the nested uat object
      const countyCode = entity.uat?.county_code;
      const countyName = entity.uat?.county_name;

      if (countyCode && countyName && !uniqueCodes.has(countyCode)) {
        uniqueCodes.add(countyCode);
        counties.push({
          code: countyCode,
          name: countyName,
        });
      }
    });

    return counties.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    logger.error("Error fetching counties", { error });
    return [];
  }
}
