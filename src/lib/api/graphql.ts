import { createLogger } from "../logger";

const logger = createLogger("graphql-client");

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
    extensions?: Record<string, unknown>;
  }>;
}

/**
 * Simple GraphQL client to make queries to the server
 */
export async function graphqlRequest<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const endpoint = "http://localhost:3000/graphql";

  try {
    logger.info("Making GraphQL request", { query, variables });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GraphQL request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(", ");
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }

    if (!result.data) {
      throw new Error("GraphQL response contains no data");
    }

    return result.data;
  } catch (error) {
    logger.error("GraphQL request failed", { error });
    throw error;
  }
}
