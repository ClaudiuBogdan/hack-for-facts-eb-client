import { getApiBaseUrl } from "@/config/env";
import { t } from "@lingui/core/macro";
import { API_FETCH_REFERRER_POLICY } from "@/lib/api/fetch-options";
import { getAuthToken } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import {
  parseCampaignAdminEntityConfigDetailResponse,
  parseCampaignAdminEntityConfigListResponse,
  parseCampaignAdminErrorEnvelope,
  parseCampaignAdminUpdateEntityConfigBody,
} from "@/features/campaigns/buget/admin/schemas/api-schemas";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntityConfigDetail,
  CampaignAdminEntityConfigExportFilters,
  CampaignAdminEntityConfigFilters,
  CampaignAdminEntityConfigListResponse,
  CampaignAdminUpdateEntityConfigBody,
} from "@/features/campaigns/buget/admin/types";
import { CampaignAdminApiError } from "./campaign-admin-user-interactions";

const logger = createLogger("campaign-admin-entity-config-api");

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
    logger.error("Failed to parse campaign admin entity config JSON", {
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
    return t`Campaign entity config request was invalid.`;
  }

  if (status === 401) {
    return t`Sign in required for campaign entity config admin.`;
  }

  if (status === 403) {
    return t`You do not have access to campaign entity config admin.`;
  }

  if (status === 404) {
    return t`The requested entity config was not found.`;
  }

  if (status === 409) {
    return t`This entity config changed before your update was saved.`;
  }

  if (status === 502) {
    return t`Campaign entity config request could not be completed right now.`;
  }

  return t`Campaign entity config request failed.`;
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

function getDownloadFilename(
  contentDisposition: string | null,
  fallbackFilename: string,
): string {
  if (contentDisposition === null) {
    return fallbackFilename;
  }

  const filenameStarMatch = contentDisposition.match(
    /filename\*\s*=\s*(?:"([^"]+)"|([^;]+))/i,
  );
  const encodedFilename = filenameStarMatch?.[1] ?? filenameStarMatch?.[2];
  if (encodedFilename !== undefined) {
    const normalizedFilename = encodedFilename.replace(/^UTF-8''/i, "").trim();

    try {
      return decodeURIComponent(normalizedFilename);
    } catch {
      return normalizedFilename;
    }
  }

  const filenameMatch = contentDisposition.match(
    /filename\s*=\s*(?:"([^"]+)"|([^;]+))/i,
  );
  const filename = filenameMatch?.[1] ?? filenameMatch?.[2]?.trim();

  return filename || fallbackFilename;
}

async function authorizedResponse(
  campaignKey: CampaignAdminCampaignKey,
  pathname: string,
  init: RequestInit,
): Promise<Response> {
  const token = await getAuthToken();
  if (token === null || token.trim().length === 0) {
    throw new CampaignAdminApiError(
      t`Sign in required for campaign entity config admin.`,
      401,
    );
  }

  return fetch(getCampaignAdminEndpoint(campaignKey, pathname), {
    ...init,
    referrerPolicy: API_FETCH_REFERRER_POLICY,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

async function authorizedRequest(
  campaignKey: CampaignAdminCampaignKey,
  pathname: string,
  init: RequestInit,
): Promise<unknown> {
  const response = await authorizedResponse(campaignKey, pathname, init);
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

function buildCampaignAdminEntityConfigQueryString(
  filters: CampaignAdminEntityConfigFilters,
  cursor: string | null,
  limit: number,
): string {
  const searchParams = new URLSearchParams();

  appendOptionalSearchParam(searchParams, "entityCui", filters.entityCui);
  appendOptionalSearchParam(
    searchParams,
    "budgetPublicationDate",
    filters.budgetPublicationDate,
  );
  appendOptionalSearchParam(
    searchParams,
    "hasBudgetPublicationDate",
    filters.hasBudgetPublicationDate,
  );
  appendOptionalSearchParam(
    searchParams,
    "officialBudgetUrl",
    filters.officialBudgetUrl,
  );
  appendOptionalSearchParam(
    searchParams,
    "hasOfficialBudgetUrl",
    filters.hasOfficialBudgetUrl,
  );
  appendOptionalSearchParam(
    searchParams,
    "updatedAtFrom",
    filters.updatedAtFrom,
  );
  appendOptionalSearchParam(searchParams, "updatedAtTo", filters.updatedAtTo);
  appendOptionalSearchParam(searchParams, "sortBy", filters.sortBy);
  appendOptionalSearchParam(searchParams, "sortOrder", filters.sortOrder);
  appendOptionalSearchParam(searchParams, "cursor", cursor ?? undefined);
  appendOptionalSearchParam(searchParams, "limit", limit);

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : "";
}

function buildCampaignAdminEntityConfigExportQueryString(input: {
  readonly filters: CampaignAdminEntityConfigExportFilters;
}): string {
  const searchParams = new URLSearchParams();

  appendOptionalSearchParam(searchParams, "query", input.filters.query);
  appendOptionalSearchParam(searchParams, "entityCui", input.filters.entityCui);
  appendOptionalSearchParam(
    searchParams,
    "budgetPublicationDate",
    input.filters.budgetPublicationDate,
  );
  appendOptionalSearchParam(
    searchParams,
    "hasBudgetPublicationDate",
    input.filters.hasBudgetPublicationDate,
  );
  appendOptionalSearchParam(
    searchParams,
    "officialBudgetUrl",
    input.filters.officialBudgetUrl,
  );
  appendOptionalSearchParam(
    searchParams,
    "hasOfficialBudgetUrl",
    input.filters.hasOfficialBudgetUrl,
  );
  appendOptionalSearchParam(
    searchParams,
    "updatedAtFrom",
    input.filters.updatedAtFrom,
  );
  appendOptionalSearchParam(
    searchParams,
    "updatedAtTo",
    input.filters.updatedAtTo,
  );

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : "";
}

export async function listCampaignAdminEntityConfig(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminEntityConfigFilters;
  readonly cursor: string | null;
  readonly limit: number;
}): Promise<CampaignAdminEntityConfigListResponse> {
  const payload = await authorizedRequest(
    input.campaignKey,
    `/entity-config${buildCampaignAdminEntityConfigQueryString(
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
    parse: parseCampaignAdminEntityConfigListResponse,
    errorMessage: t`Campaign entity config response was invalid.`,
    logMessage: "Invalid campaign admin entity config list response",
  });
}

export async function getCampaignAdminEntityConfig(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly entityCui: string;
}): Promise<CampaignAdminEntityConfigDetail> {
  const payload = await authorizedRequest(
    input.campaignKey,
    `/entities/${encodeURIComponent(input.entityCui)}/config`,
    {
      method: "GET",
    },
  );

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminEntityConfigDetailResponse,
    errorMessage: t`Campaign entity config detail response was invalid.`,
    logMessage: "Invalid campaign admin entity config detail response",
  });
}

export async function updateCampaignAdminEntityConfig(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly entityCui: string;
  readonly body: CampaignAdminUpdateEntityConfigBody;
}): Promise<CampaignAdminEntityConfigDetail> {
  const body = parseCampaignAdminUpdateEntityConfigBody(input.body);
  const payload = await authorizedRequest(
    input.campaignKey,
    `/entities/${encodeURIComponent(input.entityCui)}/config`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminEntityConfigDetailResponse,
    errorMessage: t`Campaign entity config update response was invalid.`,
    logMessage: "Invalid campaign admin entity config update response",
  });
}

export async function downloadCampaignAdminEntityConfigCsv(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminEntityConfigExportFilters;
}): Promise<{ readonly blob: Blob; readonly filename: string }> {
  const response = await authorizedResponse(
    input.campaignKey,
    `/entity-config/export${buildCampaignAdminEntityConfigExportQueryString(
      {
        filters: input.filters,
      },
    )}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const rawText = await response.text();
    const { payload } = parseJsonSafely(rawText);
    throw buildCampaignAdminApiError(response.status, payload);
  }

  return {
    blob: await response.blob(),
    filename: getDownloadFilename(
      response.headers.get("Content-Disposition"),
      "entity-config.csv",
    ),
  };
}
