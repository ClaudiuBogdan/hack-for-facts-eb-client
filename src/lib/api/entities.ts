import { graphqlRequest } from "./graphql";
import { createLogger } from "../logger";

const logger = createLogger("entities-api");

export interface TrendPoint {
  year: number;
  totalAmount: number;
}

export interface TopExecutionItem {
  economicClassification?: {
    economic_name: string;
  };
  functionalClassification?: {
    functional_name: string;
  };
  amount: number;
}

export interface EntityDetailsData {
  cui: string;
  name: string;
  address?: string | null;
  uat?: {
    county_name?: string | null;
    name?: string | null;
  } | null;
  totalIncome?: number | null;
  totalExpenses?: number | null;
  budgetBalance?: number | null;
  incomeTrend?: TrendPoint[] | null;
  expenseTrend?: TrendPoint[] | null;
  balanceTrend?: TrendPoint[] | null;
  topExpenses?: {
    nodes: TopExecutionItem[];
  } | null;
  topIncome?: {
    nodes: TopExecutionItem[];
  } | null;
}

interface EntityDetailsResponse {
  entity: EntityDetailsData | null;
}

const GET_ENTITY_DETAILS_QUERY = `
  query GetEntityDetails($cui: ID!, $year: Int!, $startYear: Int!, $endYear: Int!) {
    entity(cui: $cui) {
      cui
      name
      address
      uat {
        county_name
        name
      }
      totalIncome(year: $year)
      totalExpenses(year: $year)
      budgetBalance(year: $year)
      incomeTrend(startYear: $startYear, endYear: $endYear) {
        year
        totalAmount
      }
      expenseTrend(startYear: $startYear, endYear: $endYear) {
        year
        totalAmount
      }
      balanceTrend(startYear: $startYear, endYear: $endYear) {
        year
        totalAmount
      }
      topExpenses: executionLineItems(
        filter: { account_categories: "ch", year: $year }
        sort: { by: "amount", order: "DESC" }
        limit: 5
      ) {
        nodes {
          economicClassification {
            economic_name
          }
          amount
        }
      }
      topIncome: executionLineItems(
        filter: { account_categories: "vn", year: $year }
        sort: { by: "amount", order: "DESC" }
        limit: 5
      ) {
        nodes {
          functionalClassification {
            functional_name
          }
          amount
        }
      }
    }
  }
`;

export async function getEntityDetails(
  cui: string,
  year: number = 2024, // Defaulting to 2024 as in the query
  startYear: number = 2016, // Defaulting as in the query
  endYear: number = 2025 // Defaulting as in the query
): Promise<EntityDetailsData | null> {
  logger.info(`Fetching entity details for CUI: ${cui}`, { cui, year, startYear, endYear });

  try {
    const response = await graphqlRequest<EntityDetailsResponse>(
      GET_ENTITY_DETAILS_QUERY,
      { cui, year, startYear, endYear }
    );

    if (!response || !response.entity) {
      logger.warn("Received null or undefined response for entity details", {
        response,
        cui,
      });
      return null;
    }

    return response.entity;
  } catch (error) {
    logger.error(`Error fetching entity details for CUI: ${cui}`, {
      error,
      cui,
    });
    throw error; // Re-throw the error to be handled by React Query
  }
}
