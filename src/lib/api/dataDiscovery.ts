import { createLogger } from "../logger";
import { graphqlRequest } from "./graphql";
import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from "@/schemas/heatmap";
import { AnalyticsFilterType } from "@/schemas/charts";
import { prepareFilterForServer } from "@/lib/filterUtils";

const logger = createLogger("data-discovery-api");

interface HeatmapUATDataApiResponse {
  heatmapUATData: HeatmapUATDataPoint[];
}

interface HeatmapCountyDataApiResponse {
  heatmapCountyData: HeatmapCountyDataPoint[];
}

const GET_HEATMAP_JUDET_DATA_QUERY = `
  query GetHeatmapCountyData($filter: AnalyticsFilterInput!) {
    heatmapCountyData(filter: $filter) {
      county_code
      county_name
      county_population
      total_amount
      per_capita_amount
      county_entity {
        cui
        name
      }
    }
  }
`;

const GET_HEATMAP_UAT_DATA_QUERY = `
  query GetHeatmapUATData($filter: AnalyticsFilterInput!) {
    heatmapUATData(filter: $filter) {
      uat_id
      uat_name
      uat_code
      siruta_code
      county_code
      county_name
      population
      amount
      total_amount
      per_capita_amount
    }
  }
`;

export async function getHeatmapUATData(
  filter: AnalyticsFilterType
): Promise<HeatmapUATDataPoint[]> {
  logger.info("Fetching heatmap UAT data with filter", { filter });

  try {
    const response = await graphqlRequest<HeatmapUATDataApiResponse>(
      GET_HEATMAP_UAT_DATA_QUERY,
      { filter: prepareFilterForServer(filter) }
    );

    if (!response || !response.heatmapUATData) {
      logger.warn("Received null or undefined response for heatmapUATData", {
        response,
      });
      // Consider throwing an error or returning a default/empty state
      // depending on how callers should handle this.
      // For now, returning empty array if data is not in the expected shape.
      return [];
    }

    return response.heatmapUATData;
  } catch (error) {
    logger.error("Error fetching heatmap UAT data", { error, filter });
    throw error; // Re-throw the error to be handled by the caller
  }
}

export async function getHeatmapCountyData(
  filter: AnalyticsFilterType
): Promise<HeatmapCountyDataPoint[]> {
  logger.info("Fetching heatmap JUDET data with filter", { filter });

  try {
    const response = await graphqlRequest<HeatmapCountyDataApiResponse>(
      GET_HEATMAP_JUDET_DATA_QUERY,
      { filter: prepareFilterForServer(filter) }
    );

    if (!response || !response.heatmapCountyData) {
      logger.warn("Received null or undefined response for heatmapCountyData", {
        response,
      });
      return [];
    }

    return response.heatmapCountyData;
  } catch (error) {
    logger.error("Error fetching heatmap JUDET data", { error, filter });
    throw error;
  }
}
