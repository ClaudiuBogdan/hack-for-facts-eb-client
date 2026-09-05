import { graphqlRequest } from "./graphql";
import { fetchBudgetDimensionNodes } from "./budget-dimensions";
import { createLogger } from "../logger";

const logger = createLogger("classifications-api");

interface ClassificationResponse {
    nodes: {
        code: string;
        name: string;
    }[];
}

interface BudgetSectorResponse {
    nodes: {
        sector_id: string;
        sector_description: string;
    }[];
}

interface FundingSourceResponse {
    nodes: {
        source_id: string;
        source_description: string;
    }[];
}


interface UatNamesResponse {
    uats: {
        nodes: {
            id: string;
            name: string;
        }[];
    };
}


interface EntityNamesResponse {
    entities: {
        nodes: {
            cui: string;
            name: string;
            uat?: {
                county_name?: string | null;
            } | null;
        }[];
    }
}

const ENTITY_NAMES_QUERY = `
    query EntityNames($entityCuis: [ID!]) {
      entities(filter: { cuis: $entityCuis }, limit: 1000) {
        nodes {
          cui
          name
          uat {
            county_name
          }
        }
      }
    }
  `;


const UAT_NAMES_QUERY = `
    query UatNames($uatIds: [String!]!) {
        uats(filter: { ids: $uatIds }) {
            nodes {
                id
                name
            }
        }
    }
`;


const FUNCTIONAL_CLASSIFICATION_NAMES_QUERY = `
    query FunctionalClassificationNames($codes: [String!], $limit: Int!, $offset: Int!) {
        functionalClassifications(filter: { functional_codes: $codes }, limit: $limit, offset: $offset) {
            nodes {
                code: functional_code
                name: functional_name
            }
            pageInfo { totalCount hasNextPage }
        }
    }
`;

const ECONOMIC_CLASSIFICATION_NAMES_QUERY = `
    query EconomicClassificationNames($codes: [String!], $limit: Int!, $offset: Int!) {
        economicClassifications(filter: { economic_codes: $codes }, limit: $limit, offset: $offset) {
            nodes {
                code: economic_code
                name: economic_name
            }
            pageInfo { totalCount hasNextPage }
        }
    }
`;

const BUDGET_SECTOR_NAMES_QUERY = `
    query BudgetSectorNames($ids: [ID!], $limit: Int!, $offset: Int!) {
        budgetSectors(filter: { sector_ids: $ids }, limit: $limit, offset: $offset) {
            nodes {
                sector_id
                sector_description
            }
            pageInfo { totalCount hasNextPage }
        }
    }
`;

const FUNDING_SOURCE_NAMES_QUERY = `
    query FundingSourceNames($ids: [ID!], $limit: Int!, $offset: Int!) {
        fundingSources(filter: { source_ids: $ids }, limit: $limit, offset: $offset) {
            nodes {
                source_id
                source_description
            }
            pageInfo { totalCount hasNextPage }
        }
    }
`;

const ALL_FUNCTIONAL_CLASSIFICATIONS_QUERY = `
    query AllFunctionalClassifications($limit: Int!, $offset: Int!) {
        functionalClassifications(limit: $limit, offset: $offset) {
            nodes {
                code: functional_code
                name: functional_name
            }
            pageInfo { totalCount hasNextPage }
        }
    }
`;

const ALL_ECONOMIC_CLASSIFICATIONS_QUERY = `
    query AllEconomicClassifications($limit: Int!, $offset: Int!) {
        economicClassifications(limit: $limit, offset: $offset) {
            nodes {
                code: economic_code
                name: economic_name
            }
            pageInfo { totalCount hasNextPage }
        }
    }
`;


export async function getFunctionalClassificationLabels(ids: (string | number)[]): Promise<{ id: string; label: string }[]> {
    const stringIds = ids.map(String);
    if (stringIds.length === 0) return [];
    try {
        const nodes = await fetchBudgetDimensionNodes<ClassificationResponse["nodes"][number]>(FUNCTIONAL_CLASSIFICATION_NAMES_QUERY, "functionalClassifications", { codes: stringIds });
        return nodes.map(({ code, name }) => ({ id: code, label: name }));
    } catch (error) {
        logger.error("Error fetching functional classification labels", { error, ids });
        throw error;
    }
}

export async function getEconomicClassificationLabels(ids: (string | number)[]): Promise<{ id: string; label: string }[]> {
    const stringIds = ids.map(String);
    if (stringIds.length === 0) return [];
    try {
        const nodes = await fetchBudgetDimensionNodes<ClassificationResponse["nodes"][number]>(ECONOMIC_CLASSIFICATION_NAMES_QUERY, "economicClassifications", { codes: stringIds });
        return nodes.map(({ code, name }) => ({ id: code, label: name }));
    }
    catch (error) {
        logger.error("Error fetching economic classification labels", { error, ids });
        throw error;
    }
}

export async function getBudgetSectorLabels(ids: (string | number)[]): Promise<{ id: string | number; label: string }[]> {
    const stringIds = ids.map(String);
    if (stringIds.length === 0) return [];
    try {
        const nodes = await fetchBudgetDimensionNodes<BudgetSectorResponse["nodes"][number]>(BUDGET_SECTOR_NAMES_QUERY, "budgetSectors", { ids: stringIds });
        return nodes.map(({ sector_id, sector_description }) => ({ id: sector_id, label: sector_description }));
    }
    catch (error) {
        logger.error("Error fetching budget sector labels", { error, ids });
        throw error;
    }
}

export async function getFundingSourceLabels(ids: (string | number)[]): Promise<{ id: string | number; label: string }[]> {
    const stringIds = ids.map(String);
    if (stringIds.length === 0) return [];
    try {
        const nodes = await fetchBudgetDimensionNodes<FundingSourceResponse["nodes"][number]>(FUNDING_SOURCE_NAMES_QUERY, "fundingSources", { ids: stringIds });
        return nodes.map(({ source_id, source_description }) => ({ id: source_id, label: source_description }));
    }
    catch (error) {
        logger.error("Error fetching funding source labels", { error, ids });
        throw error;
    }
}


export async function getEntityLabels(
    ids: (string | number)[],
): Promise<{ id: string; label: string; countyName?: string | null }[]> {
    const stringIds = ids.map(String);
    if (stringIds.length === 0) return [];
    try {
        const response = await graphqlRequest<EntityNamesResponse>(ENTITY_NAMES_QUERY, { entityCuis: stringIds });
        return response.entities.nodes.map(({ cui, name, uat }) => ({
            id: cui,
            label: name,
            countyName: uat?.county_name ?? null,
        }));
    }
    catch (error) {
        logger.error("Error fetching entity labels", { error, ids });
        return [];
    }
}


export async function getUatLabels(ids: (string | number)[]): Promise<{ id: string; label: string }[]> {
    const stringIds = ids.map(String);
    if (stringIds.length === 0) return [];
    try {
        const response = await graphqlRequest<UatNamesResponse>(UAT_NAMES_QUERY, { uatIds: stringIds });
        return response.uats.nodes.map(({ id, name }) => ({ id, label: name }));
    }
    catch (error) {
        logger.error("Error fetching uat labels", { error, ids });
        return [];
    }
}

/**
 * Helper function to remove trailing .00 from classification codes
 * E.g., "01.00" -> "01", "01.02.00" -> "01.02"
 */
function removeTailingZeroCodes(code: string): string {
    const parts = code.split('.');
    // Remove trailing .00 parts
    while (parts.length > 1 && parts[parts.length - 1] === '00') {
        parts.pop();
    }
    return parts.join('.');
}

export async function getAllFunctionalClassifications(signal?: AbortSignal): Promise<{ code: string; name: string }[]> {
    try {
        const nodes = await fetchBudgetDimensionNodes<ClassificationResponse["nodes"][number]>(ALL_FUNCTIONAL_CLASSIFICATIONS_QUERY, "functionalClassifications", {}, signal);

        // Remove duplicates and process codes
        const uniqueCodes = new Map<string, string>();
        for (const classification of nodes) {
            const cleanCode = removeTailingZeroCodes(classification.code);
            // Keep the first occurrence (or update if we prefer the cleaned version)
            if (!uniqueCodes.has(cleanCode)) {
                uniqueCodes.set(cleanCode, classification.name);
            }
        }

        return Array.from(uniqueCodes.entries()).map(([code, name]) => ({ code, name }));
    } catch (error) {
        logger.error("Error fetching all functional classifications", { error });
        throw error;
    }
}

export async function getAllEconomicClassifications(signal?: AbortSignal): Promise<{ code: string; name: string }[]> {
    try {
        const nodes = await fetchBudgetDimensionNodes<ClassificationResponse["nodes"][number]>(ALL_ECONOMIC_CLASSIFICATIONS_QUERY, "economicClassifications", {}, signal);

        // Remove duplicates and process codes
        const uniqueCodes = new Map<string, string>();
        for (const classification of nodes) {
            const cleanCode = removeTailingZeroCodes(classification.code);
            // Keep the first occurrence (or update if we prefer the cleaned version)
            if (!uniqueCodes.has(cleanCode)) {
                uniqueCodes.set(cleanCode, classification.name);
            }
        }

        return Array.from(uniqueCodes.entries()).map(([code, name]) => ({ code, name }));
    } catch (error) {
        logger.error("Error fetching all economic classifications", { error });
        throw error;
    }
}
