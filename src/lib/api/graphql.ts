import { createLogger } from "../logger";
import { getAuthToken } from "../auth";
import { getApiBaseUrl } from "@/config/env";
import { API_FETCH_REFERRER_POLICY } from "./fetch-options";

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

type GraphQLErrorLike = {
  message?: unknown;
  [key: string]: unknown;
};

const summarizeValue = (value: unknown): string => {
  if (value == null) return String(value);
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message || value.name;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const formatGraphQLErrorMessages = (errors: unknown[]): string => {
  const messages = errors.map((entry) => {
    if (!entry) return "Unknown error";
    if (typeof entry === "string") return entry;
    if (entry instanceof Error) return entry.message || entry.name;
    if (typeof entry === "object") {
      const errorLike = entry as GraphQLErrorLike;
      if (typeof errorLike.message === "string") return errorLike.message;
      return summarizeValue(errorLike);
    }
    return summarizeValue(entry);
  });

  const filtered = messages.filter((message) => message.trim().length > 0);
  return filtered.length > 0 ? filtered.join(", ") : "Unknown GraphQL error";
};

const parseJsonSafely = (text: string): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const buildHttpErrorMessage = (response: Response, payload: unknown, rawText: string): string => {
  if (Array.isArray(payload)) {
    return `GraphQL request failed: ${response.status} ${response.statusText} - ${formatGraphQLErrorMessages(payload)}`;
  }
  if (payload && typeof payload === "object") {
    const maybeErrors = (payload as GraphQLResponse<unknown>).errors;
    if (Array.isArray(maybeErrors) && maybeErrors.length > 0) {
      return `GraphQL request failed: ${response.status} ${response.statusText} - ${formatGraphQLErrorMessages(maybeErrors)}`;
    }
    return `GraphQL request failed: ${response.status} ${response.statusText} - ${summarizeValue(payload)}`;
  }
  if (rawText) {
    return `GraphQL request failed: ${response.status} ${response.statusText} - ${rawText}`;
  }
  return `GraphQL request failed: ${response.status} ${response.statusText}`;
};

export interface GraphQLRequestOptions {
  /**
   * Skip the Authorization header even when a Clerk token exists. For public
   * reads (the INS surface) a stale token turns an otherwise-public request
   * into a 401 before any resolver runs — sending no header is strictly safer.
   */
  skipAuth?: boolean;
  /** Abort signal threaded to fetch (route loaders / TanStack Query). */
  signal?: AbortSignal;
}

/**
 * Simple GraphQL client to make queries to the server
 */
export async function graphqlRequest<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  options?: GraphQLRequestOptions
): Promise<T> {
  const endpoint = `${getApiBaseUrl()}/graphql`;

  try {
    logger.info("Making GraphQL request", { query, variables });

    // Get a fresh token for the request; Clerk manages token lifecycle
    const token = options?.skipAuth ? null : await getAuthToken();

    const response = await fetch(endpoint, {
      method: "POST",
      referrerPolicy: API_FETCH_REFERRER_POLICY,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      ...(options?.signal ? { signal: options.signal } : {}),
    })

    const rawText = await response.text();
    const parsed = parseJsonSafely(rawText);

    if (!response.ok) {
      throw new Error(buildHttpErrorMessage(response, parsed, rawText));
    }

    if (Array.isArray(parsed)) {
      throw new Error(`GraphQL returned error array: ${formatGraphQLErrorMessages(parsed)}`);
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error(
        `GraphQL returned unexpected response type: ${parsed === null ? "null" : typeof parsed}`
      );
    }

    const result = parsed as GraphQLResponse<T>;

    if (Array.isArray(result.errors) && result.errors.length > 0) {
      throw new Error(`GraphQL errors: ${formatGraphQLErrorMessages(result.errors)}`);
    }

    if (!("data" in result)) {
      throw new Error("GraphQL response missing data field");
    }

    if (!result.data) {
      throw new Error("GraphQL response contains no data");
    }

    return result.data;
  } catch (error) {
    logger.error("GraphQL request failed", { error });
    if (error instanceof Error) {
      throw error;
    }
    const wrappedError = new Error(
      `GraphQL request failed: ${summarizeValue(error)}`,
    ) as Error & { cause: unknown };
    wrappedError.cause = error;
    throw wrappedError;
  }
}
