import { getApiBaseUrl } from "@/config/env";
import { t } from "@lingui/core/macro";
import { API_FETCH_REFERRER_POLICY } from "@/lib/api/fetch-options";
import { getAuthToken } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import {
  parseCampaignAdminEntitiesListResponse,
  parseCampaignAdminEntitiesMetaResponse,
  parseCampaignAdminErrorEnvelope,
} from "@/features/campaigns/buget/admin/schemas/api-schemas";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntitiesFilters,
  CampaignAdminEntitiesListResponse,
  CampaignAdminEntitiesMetaResponse,
} from "@/features/campaigns/buget/admin/types";
import { CampaignAdminApiError } from "./campaign-admin-user-interactions";

const logger = createLogger("campaign-admin-entities-api");

function getCampaignAdminEndpoint(
  campaignKey: CampaignAdminCampaignKey,
  pathname = "",
): string {
  return `${getApiBaseUrl()}/api/v1/admin/campaigns/${encodeURIComponent(campaignKey)}${pathname}`;
}

function parseJsonSafely(rawText: string): {
  readonly payload: unknown;
  readonly invalidJson: boolean;
} {
  if (rawText.trim().length === 0) {
    return {
      payload: null,
      invalidJson: false,
    };
  }

  try {
    return {
      payload: JSON.parse(rawText) as unknown,
      invalidJson: false,
    };
  } catch (error) {
    logger.error("Failed to parse campaign admin entities response JSON", {
      error: error instanceof Error ? error.message : String(error),
      responseLength: rawText.length,
    });

    return {
      payload: null,
      invalidJson: true,
    };
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function getFallbackErrorMessage(status: number): string {
  if (status === 400) {
    return t`Campaign admin entities request was invalid.`;
  }

  if (status === 401) {
    return t`Sign in required for this campaign entities admin.`;
  }

  if (status === 403) {
    return t`You do not have access to this campaign entities admin.`;
  }

  if (status === 404) {
    return t`The campaign entities admin is unavailable on this server or the campaign key is not supported.`;
  }

  if (status === 502) {
    return t`Campaign entities could not be loaded right now.`;
  }

  return t`Campaign admin entities request failed.`;
}

function buildCampaignAdminApiError(
  status: number,
  payload: unknown,
): CampaignAdminApiError {
  const fallbackMessage = getFallbackErrorMessage(status);
  const envelope = parseCampaignAdminErrorEnvelope(payload);

  if (envelope !== null) {
    return new CampaignAdminApiError(
      envelope.message ?? envelope.error ?? fallbackMessage,
      status,
      {
        code: envelope.code,
        retryable:
          typeof envelope.retryable === "boolean"
            ? envelope.retryable
            : isRetryableStatus(status),
        details: envelope.details,
      },
    );
  }

  return new CampaignAdminApiError(fallbackMessage, status, {
    retryable: isRetryableStatus(status),
  });
}

function buildInvalidCampaignAdminResponseError(input: {
  readonly message: string;
  readonly logMessage: string;
  readonly error: unknown;
}): CampaignAdminApiError {
  logger.error(input.logMessage, {
    error:
      input.error instanceof Error ? input.error.message : String(input.error),
  });

  return new CampaignAdminApiError(input.message, 502, {
    code: "invalid_response",
    retryable: false,
  });
}

function parseCampaignAdminSuccessPayload<T>(input: {
  readonly payload: unknown;
  readonly parse: (payload: unknown) => T;
  readonly errorMessage: string;
  readonly logMessage: string;
}): T {
  try {
    return input.parse(input.payload);
  } catch (error) {
    throw buildInvalidCampaignAdminResponseError({
      message: input.errorMessage,
      logMessage: input.logMessage,
      error,
    });
  }
}

async function authorizedRequest(
  campaignKey: CampaignAdminCampaignKey,
  pathname: string,
  init: RequestInit,
): Promise<unknown> {
  const token = await getAuthToken();
  if (token === null || token.trim().length === 0) {
    throw new CampaignAdminApiError(
      t`Sign in required for this campaign entities admin.`,
      401,
    );
  }

  const response = await fetch(getCampaignAdminEndpoint(campaignKey, pathname), {
    ...init,
    referrerPolicy: API_FETCH_REFERRER_POLICY,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const rawText = await response.text();
  const { payload, invalidJson } = parseJsonSafely(rawText);

  if (!response.ok) {
    throw buildCampaignAdminApiError(response.status, payload);
  }

  if (invalidJson) {
    throw new CampaignAdminApiError(
      t`Campaign admin server returned invalid JSON.`,
      502,
      {
        code: "invalid_json_response",
        retryable: false,
      },
    );
  }

  return payload;
}

function appendOptionalSearchParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined,
) {
  if (value === undefined) {
    return;
  }

  searchParams.set(key, String(value));
}

function buildCampaignAdminEntitiesQueryString(
  filters: CampaignAdminEntitiesFilters,
  cursor: string | null,
  limit: number,
): string {
  const searchParams = new URLSearchParams();

  appendOptionalSearchParam(searchParams, "query", filters.query);
  appendOptionalSearchParam(searchParams, "interactionId", filters.interactionId);
  appendOptionalSearchParam(
    searchParams,
    "hasPendingReviews",
    filters.hasPendingReviews,
  );
  appendOptionalSearchParam(
    searchParams,
    "hasSubscribers",
    filters.hasSubscribers,
  );
  appendOptionalSearchParam(
    searchParams,
    "hasNotificationActivity",
    filters.hasNotificationActivity,
  );
  appendOptionalSearchParam(
    searchParams,
    "hasFailedNotifications",
    filters.hasFailedNotifications,
  );
  appendOptionalSearchParam(
    searchParams,
    "latestNotificationType",
    filters.latestNotificationType,
  );
  appendOptionalSearchParam(
    searchParams,
    "latestNotificationStatus",
    filters.latestNotificationStatus,
  );
  appendOptionalSearchParam(searchParams, "sortBy", filters.sortBy);
  appendOptionalSearchParam(searchParams, "sortOrder", filters.sortOrder);
  appendOptionalSearchParam(searchParams, "cursor", cursor ?? undefined);
  appendOptionalSearchParam(searchParams, "limit", limit);

  const nextSearch = searchParams.toString();
  return nextSearch.length > 0 ? `?${nextSearch}` : "";
}

export async function listCampaignAdminEntities(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminEntitiesFilters;
  readonly cursor: string | null;
  readonly limit: number;
}): Promise<CampaignAdminEntitiesListResponse> {
  const payload = await authorizedRequest(
    input.campaignKey,
    `/entities${buildCampaignAdminEntitiesQueryString(
      input.filters,
      input.cursor,
      input.limit,
    )}`,
    {
      method: "GET",
    },
  );

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminEntitiesListResponse,
    errorMessage: t`Campaign admin entities response was invalid.`,
    logMessage:
      "Campaign admin entities response did not match the expected schema",
  });
}

export async function getCampaignAdminEntitiesMeta(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
}): Promise<CampaignAdminEntitiesMetaResponse> {
  const payload = await authorizedRequest(input.campaignKey, "/entities/meta", {
    method: "GET",
  });

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminEntitiesMetaResponse,
    errorMessage: t`Campaign admin entities metadata response was invalid.`,
    logMessage:
      "Campaign admin entities metadata response did not match the expected schema",
  });
}
