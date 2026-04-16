import { getApiBaseUrl } from "@/config/env";
import { t } from "@lingui/core/macro";
import { API_FETCH_REFERRER_POLICY } from "@/lib/api/fetch-options";
import { getAuthToken } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { CampaignAdminApiError } from "@/features/campaigns/buget/admin/api/campaign-admin-user-interactions";
import {
  parseCampaignAdminAppendInstitutionThreadResponse,
  parseCampaignAdminAppendInstitutionThreadResponseBody,
  parseCampaignAdminErrorEnvelope,
  parseCampaignAdminInstitutionThreadDetailResponse,
  parseCampaignAdminInstitutionThreadsListResponse,
} from "@/features/campaigns/buget/admin/schemas/api-schemas";
import type {
  CampaignAdminAppendInstitutionThreadResponseBody,
  CampaignAdminAppendInstitutionThreadResponseResult,
  CampaignAdminCampaignKey,
  CampaignAdminInstitutionThreadDetail,
  CampaignAdminInstitutionThreadsFilters,
  CampaignAdminInstitutionThreadsListResponse,
} from "@/features/campaigns/buget/admin/types";

const logger = createLogger("campaign-admin-institution-threads-api");

export { CampaignAdminApiError };

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
    logger.error("Failed to parse campaign admin institution threads JSON", {
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
    return t`Campaign admin institution thread request was invalid.`;
  }

  if (status === 401) {
    return t`Sign in required for campaign admin institution threads.`;
  }

  if (status === 403) {
    return t`You do not have access to campaign admin institution threads.`;
  }

  if (status === 404) {
    return t`The requested institution thread was not found.`;
  }

  if (status === 409) {
    return t`This institution thread changed before your response was saved.`;
  }

  if (status === 502) {
    return t`Campaign admin institution thread request could not be completed right now.`;
  }

  return t`Campaign admin institution thread request failed.`;
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
      t`Sign in required for campaign admin institution threads.`,
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
      t`Campaign admin institution threads server returned invalid JSON.`,
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

export async function listCampaignAdminInstitutionThreads(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminInstitutionThreadsFilters;
  readonly cursor: string | null;
  readonly limit: number;
}): Promise<CampaignAdminInstitutionThreadsListResponse> {
  const searchParams = new URLSearchParams();
  const { filters } = input;

  appendOptionalSearchParam(searchParams, "stateGroup", filters.stateGroup);
  appendOptionalSearchParam(searchParams, "threadState", filters.threadState);
  appendOptionalSearchParam(
    searchParams,
    "responseStatus",
    filters.responseStatus,
  );
  appendOptionalSearchParam(searchParams, "query", filters.query);
  appendOptionalSearchParam(searchParams, "entityCui", filters.entityCui);
  appendOptionalSearchParam(
    searchParams,
    "updatedAtFrom",
    filters.updatedAtFrom,
  );
  appendOptionalSearchParam(searchParams, "updatedAtTo", filters.updatedAtTo);
  appendOptionalSearchParam(
    searchParams,
    "latestResponseAtFrom",
    filters.latestResponseAtFrom,
  );
  appendOptionalSearchParam(
    searchParams,
    "latestResponseAtTo",
    filters.latestResponseAtTo,
  );
  appendOptionalSearchParam(searchParams, "cursor", input.cursor ?? undefined);
  appendOptionalSearchParam(searchParams, "limit", input.limit);

  const payload = await authorizedRequest(
    input.campaignKey,
    `/institution-threads?${searchParams.toString()}`,
    {
      method: "GET",
    },
  );

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminInstitutionThreadsListResponse,
    errorMessage: t`Campaign admin institution threads response was invalid.`,
    logMessage: "Invalid campaign admin institution threads list response",
  });
}

export async function getCampaignAdminInstitutionThreadDetail(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly threadId: string;
}): Promise<CampaignAdminInstitutionThreadDetail> {
  const payload = await authorizedRequest(
    input.campaignKey,
    `/institution-threads/${encodeURIComponent(input.threadId)}`,
    {
      method: "GET",
    },
  );

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminInstitutionThreadDetailResponse,
    errorMessage: t`Campaign admin institution thread detail response was invalid.`,
    logMessage: "Invalid campaign admin institution thread detail response",
  });
}

export async function appendCampaignAdminInstitutionThreadResponse(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly threadId: string;
  readonly body: CampaignAdminAppendInstitutionThreadResponseBody;
}): Promise<CampaignAdminAppendInstitutionThreadResponseResult> {
  const body = parseCampaignAdminAppendInstitutionThreadResponseBody(input.body);
  const payload = await authorizedRequest(
    input.campaignKey,
    `/institution-threads/${encodeURIComponent(input.threadId)}/responses`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminAppendInstitutionThreadResponse,
    errorMessage: t`Campaign admin institution thread response append result was invalid.`,
    logMessage: "Invalid campaign admin institution thread append response",
  });
}
