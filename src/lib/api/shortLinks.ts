import { createLogger } from "../logger";
import { getAuthToken } from "../auth";
import { getApiBaseUrl } from "@/config/env";
import type { QueryClient } from "@tanstack/react-query";
import { API_FETCH_REFERRER_POLICY } from "./fetch-options";

const logger = createLogger("short-links-client");

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiError = {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
};

type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * A failure as these functions tell it: the operation and, for a failed
 * response, its status number. Never the API's message, error type, status
 * text or body, nor what fetch or the JSON parser threw: the API's not-found
 * message repeats the code, and its other messages are free text (LOG-001).
 */
class ShortLinkFailure extends Error {
  constructor(operation: string, reason?: number | "not authenticated") {
    super(reason === undefined ? `${operation} failed` : `${operation} failed: ${reason}`);
    this.name = "ShortLinkFailure";
  }
}

async function told<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const failure = error instanceof ShortLinkFailure ? error : new ShortLinkFailure(operation);
    logger.error(`${operation} failed`, { error: failure });
    throw failure;
  }
}

/**
 * Create a deterministic short link code for a given URL.
 * Requires authentication via Bearer token.
 */
export async function createShortLink(originalUrl: string): Promise<string> {
  const operation = "Create short link";

  return told(operation, async () => {
    const endpoint = `${getApiBaseUrl()}/api/v1/short-links`;
    const token = await getAuthToken();
    if (!token) {
      throw new ShortLinkFailure(operation, "not authenticated");
    }

    logger.info("Creating short link");

    const response = await fetch(endpoint, {
      method: "POST",
      referrerPolicy: API_FETCH_REFERRER_POLICY,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: originalUrl }),
    });

    if (!response.ok) {
      throw new ShortLinkFailure(operation, response.status);
    }

    const result = (await response.json()) as ApiResponse<{ code: string }>;
    const code: unknown = result?.ok ? result.data?.code : undefined;
    // No answer without a code: an undefined one would fail in the cache helper, whose key is the shared URL.
    if (typeof code !== "string" || code === "") {
      throw new ShortLinkFailure(operation, response.status);
    }

    return code;
  });
}

/**
 * Resolve a short link code into the original URL. Public endpoint.
 */
export async function resolveShortLinkCode(code: string): Promise<string> {
  const operation = "Resolve short link";

  return told(operation, async () => {
    const endpoint = `${getApiBaseUrl()}/api/v1/short-links/${encodeURIComponent(code)}`;
    logger.info("Resolving short link code");
    const response = await fetch(endpoint, {
      method: "GET",
      referrerPolicy: API_FETCH_REFERRER_POLICY,
    });

    if (!response.ok) {
      throw new ShortLinkFailure(operation, response.status);
    }

    const result = (await response.json()) as ApiResponse<{ url: string }>;
    const url: unknown = result?.ok ? result.data?.url : undefined;
    if (typeof url !== "string" || url === "") {
      throw new ShortLinkFailure(operation, response.status);
    }

    return url;
  });
}

/**
 * Cached helper: ensure we have a short code for a URL using TanStack Query cache.
 * - Keyed by ['short-link-code', url]
 * - Deduplicates concurrent calls, returns cached value if present
 */
export async function ensureShortCodeForUrl(
  url: string,
  queryClient: QueryClient
): Promise<string> {
  return queryClient.ensureQueryData({
    queryKey: ["short-link-code", url],
    queryFn: async () => {
      return await createShortLink(url);
    },
    // We don't need background revalidation for deterministic codes
    revalidateIfStale: false,
  });
}

/**
 * Cached helper: ensure we have a short redirect URL for a URL.
 * - Produces `${getSiteUrl()}/share/:code` via cached code generation
 */
export async function ensureShortRedirectUrl(
  url: string,
  siteBaseUrl: string,
  queryClient: QueryClient
): Promise<string> {
  const code = await ensureShortCodeForUrl(url, queryClient);
  return `${siteBaseUrl}/share/${code}`;
}
