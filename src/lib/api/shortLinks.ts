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
 * Create a deterministic short link code for a given URL.
 * Requires authentication via Bearer token.
 */
export async function createShortLink(originalUrl: string): Promise<string> {
  const endpoint = `${getApiBaseUrl()}/api/v1/short-links`;

  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    logger.info("Creating short link", { originalUrl });

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
      const errorText = await response.text();
      throw new Error(
        `Create short link failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = (await response.json()) as ApiResponse<{ code: string }>;
    if (!result.ok) {
      throw new Error(result.error || "Unknown short link API error");
    }

    return result.data.code;
  } catch (error) {
    logger.error("Failed to create short link", { error });
    throw error;
  }
}

/**
 * Resolve a short link code into the original URL. Public endpoint.
 */
export async function resolveShortLinkCode(code: string): Promise<string> {
  const endpoint = `${getApiBaseUrl()}/api/v1/short-links/${encodeURIComponent(code)}`;

  try {
    logger.info("Resolving short link code", { code });
    const response = await fetch(endpoint, {
      method: "GET",
      referrerPolicy: API_FETCH_REFERRER_POLICY,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Resolve short link failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = (await response.json()) as ApiResponse<{ url: string }>;
    if (!result.ok) {
      throw new Error(result.error || "Unknown short link API error");
    }

    return result.data.url;
  } catch (error) {
    logger.error("Failed to resolve short link", { error });
    throw error;
  }
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
