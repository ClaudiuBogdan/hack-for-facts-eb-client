import { getApiBaseUrl } from "@/config/env";
import { t } from "@lingui/core/macro";
import { API_FETCH_REFERRER_POLICY } from "@/lib/api/fetch-options";
import { getAuthToken } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import {
  parseCampaignAdminErrorEnvelope,
  parseCampaignAdminUsersListResponse,
  parseCampaignAdminUsersMetaResponse,
} from "@/features/campaigns/buget/admin/schemas/api-schemas";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminUsersListResponse,
  CampaignAdminUsersMetaResponse,
  CampaignAdminUsersSearch,
} from "@/features/campaigns/buget/admin/types";
import { CampaignAdminApiError } from "./campaign-admin-user-interactions";

const logger = createLogger("campaign-admin-users-api");

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
    logger.error("Failed to parse campaign admin users response JSON", {
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
    return t`Campaign admin users request was invalid.`;
  }

  if (status === 401) {
    return t`Sign in required for this campaign users directory.`;
  }

  if (status === 403) {
    return t`You do not have access to this campaign users directory.`;
  }

  if (status === 404) {
    return t`The campaign users directory is unavailable on this server or the campaign key is not supported.`;
  }

  if (status === 502) {
    return t`Campaign users could not be loaded right now.`;
  }

  return t`Campaign admin users request failed.`;
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
    error: input.error instanceof Error ? input.error.message : String(input.error),
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
      t`Sign in required for this campaign users directory.`,
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
  value: string | number | undefined,
) {
  if (value === undefined) {
    return;
  }

  searchParams.set(key, String(value));
}

function buildCampaignAdminUsersQueryString(
  search: Omit<CampaignAdminUsersSearch, "pageIndex">,
): string {
  const searchParams = new URLSearchParams();

  appendOptionalSearchParam(searchParams, "query", search.query);
  appendOptionalSearchParam(searchParams, "entityCui", search.entityCui);
  appendOptionalSearchParam(searchParams, "sortBy", search.sortBy);
  appendOptionalSearchParam(searchParams, "sortOrder", search.sortOrder);
  appendOptionalSearchParam(searchParams, "cursor", search.cursor);
  appendOptionalSearchParam(searchParams, "limit", search.limit);

  const nextSearch = searchParams.toString();
  return nextSearch.length > 0 ? `?${nextSearch}` : "";
}

export async function listCampaignAdminUsers(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: Omit<CampaignAdminUsersSearch, "pageIndex">;
}): Promise<CampaignAdminUsersListResponse> {
  const payload = await authorizedRequest(
    input.campaignKey,
    `/users${buildCampaignAdminUsersQueryString(input.search)}`,
    {
      method: "GET",
    },
  );

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminUsersListResponse,
    errorMessage: t`Campaign admin users response was invalid.`,
    logMessage: "Campaign admin users response did not match the expected schema",
  });
}

export async function getCampaignAdminUsersMeta(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
}): Promise<CampaignAdminUsersMetaResponse> {
  const payload = await authorizedRequest(input.campaignKey, "/users/meta", {
    method: "GET",
  });

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminUsersMetaResponse,
    errorMessage: t`Campaign admin users metadata response was invalid.`,
    logMessage:
      "Campaign admin users metadata response did not match the expected schema",
  });
}
