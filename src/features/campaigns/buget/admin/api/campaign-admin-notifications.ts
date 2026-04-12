import { getApiBaseUrl } from "@/config/env";
import { t } from "@lingui/core/macro";
import { API_FETCH_REFERRER_POLICY } from "@/lib/api/fetch-options";
import { getAuthToken } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import {
  parseCampaignAdminErrorEnvelope,
  parseCampaignAdminNotificationTemplatePreviewResponse,
  parseCampaignAdminNotificationTemplatesResponse,
  parseCampaignAdminNotificationTriggerExecutionBody,
  parseCampaignAdminNotificationTriggerExecutionResponse,
  parseCampaignAdminNotificationTriggersResponse,
  parseCampaignAdminNotificationsListResponse,
  parseCampaignAdminNotificationsMetaResponse,
} from "@/features/campaigns/buget/admin/schemas/api-schemas";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminNotificationsAuditFilters,
  CampaignAdminNotificationsListResponse,
  CampaignAdminNotificationsMetaResponse,
  CampaignAdminNotificationTemplateDescriptor,
  CampaignAdminNotificationTemplatePreview,
  CampaignAdminNotificationTriggerDescriptor,
  CampaignAdminNotificationTriggerExecutionBody,
  CampaignAdminNotificationTriggerExecutionResponse,
} from "@/features/campaigns/buget/admin/types";
import { CampaignAdminApiError } from "./campaign-admin-user-interactions";

const logger = createLogger("campaign-admin-notifications-api");

type CampaignAdminNotificationsRequestKind =
  | "audit"
  | "meta"
  | "triggerCatalog"
  | "triggerExecution"
  | "templateCatalog"
  | "templatePreview";

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
    logger.error("Failed to parse campaign admin notifications response JSON", {
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

function getFallbackErrorMessage(
  status: number,
  requestKind: CampaignAdminNotificationsRequestKind,
): string {
  if (status === 400) {
    switch (requestKind) {
      case "audit":
        return t`Campaign admin notifications request was invalid.`;
      case "meta":
        return t`Campaign admin notifications metadata request was invalid.`;
      case "triggerCatalog":
        return t`Campaign admin notification triggers request was invalid.`;
      case "triggerExecution":
        return t`Campaign admin notification trigger request was invalid.`;
      case "templateCatalog":
        return t`Campaign admin notification templates request was invalid.`;
      case "templatePreview":
        return t`Campaign admin notification template preview request was invalid.`;
      default:
        return t`Campaign admin notifications request was invalid.`;
    }
  }

  if (status === 401) {
    return t`Sign in required for this campaign notifications admin.`;
  }

  if (status === 403) {
    return t`You do not have access to this campaign notifications admin.`;
  }

  if (status === 404) {
    switch (requestKind) {
      case "templatePreview":
        return t`This campaign notification template preview is unavailable on this server or the template is not supported.`;
      case "triggerExecution":
        return t`This campaign notification trigger is unavailable on this server or the campaign key is not supported.`;
      default:
        return t`The campaign notifications admin is unavailable on this server or the campaign key is not supported.`;
    }
  }

  if (status === 409) {
    return t`This campaign notification trigger could not be completed because the underlying state changed.`;
  }

  if (status === 502) {
    switch (requestKind) {
      case "audit":
        return t`Campaign notification audit could not be loaded right now.`;
      case "meta":
        return t`Campaign notification summary could not be loaded right now.`;
      case "triggerCatalog":
        return t`Campaign notification triggers could not be loaded right now.`;
      case "triggerExecution":
        return t`Campaign notification trigger could not be completed right now.`;
      case "templateCatalog":
        return t`Campaign notification templates could not be loaded right now.`;
      case "templatePreview":
        return t`Campaign notification template preview could not be loaded right now.`;
      default:
        return t`Campaign admin notifications request failed.`;
    }
  }

  switch (requestKind) {
    case "audit":
      return t`Campaign notification audit request failed.`;
    case "meta":
      return t`Campaign notification summary request failed.`;
    case "triggerCatalog":
      return t`Campaign notification triggers request failed.`;
    case "triggerExecution":
      return t`Campaign notification trigger request failed.`;
    case "templateCatalog":
      return t`Campaign notification templates request failed.`;
    case "templatePreview":
      return t`Campaign notification template preview request failed.`;
    default:
      return t`Campaign admin notifications request failed.`;
  }
}

function buildCampaignAdminApiError(
  status: number,
  payload: unknown,
  requestKind: CampaignAdminNotificationsRequestKind,
): CampaignAdminApiError {
  const fallbackMessage = getFallbackErrorMessage(status, requestKind);
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

async function authorizedRequest(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly pathname: string;
  readonly init: RequestInit;
  readonly requestKind: CampaignAdminNotificationsRequestKind;
}): Promise<unknown> {
  const token = await getAuthToken();
  if (token === null || token.trim().length === 0) {
    throw new CampaignAdminApiError(
      t`Sign in required for this campaign notifications admin.`,
      401,
    );
  }

  const response = await fetch(
    getCampaignAdminEndpoint(input.campaignKey, input.pathname),
    {
      ...input.init,
      referrerPolicy: API_FETCH_REFERRER_POLICY,
      headers: {
        ...(input.init.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const rawText = await response.text();
  const { payload, invalidJson } = parseJsonSafely(rawText);

  if (!response.ok) {
    throw buildCampaignAdminApiError(
      response.status,
      payload,
      input.requestKind,
    );
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

function buildCampaignAdminNotificationsAuditQueryString(
  filters: CampaignAdminNotificationsAuditFilters,
  cursor: string | null,
  limit: number,
): string {
  const searchParams = new URLSearchParams();

  appendOptionalSearchParam(
    searchParams,
    "notificationType",
    filters.notificationType,
  );
  appendOptionalSearchParam(searchParams, "templateId", filters.templateId);
  appendOptionalSearchParam(searchParams, "userId", filters.userId);
  appendOptionalSearchParam(searchParams, "status", filters.status);
  appendOptionalSearchParam(searchParams, "eventType", filters.eventType);
  appendOptionalSearchParam(searchParams, "entityCui", filters.entityCui);
  appendOptionalSearchParam(searchParams, "threadId", filters.threadId);
  appendOptionalSearchParam(searchParams, "source", filters.source);
  appendOptionalSearchParam(searchParams, "sortBy", filters.sortBy);
  appendOptionalSearchParam(searchParams, "sortOrder", filters.sortOrder);
  appendOptionalSearchParam(searchParams, "cursor", cursor ?? undefined);
  appendOptionalSearchParam(searchParams, "limit", limit);

  const nextSearch = searchParams.toString();
  return nextSearch.length > 0 ? `?${nextSearch}` : "";
}

export async function listCampaignAdminNotifications(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly filters: CampaignAdminNotificationsAuditFilters;
  readonly cursor: string | null;
  readonly limit: number;
}): Promise<CampaignAdminNotificationsListResponse> {
  const payload = await authorizedRequest({
    campaignKey: input.campaignKey,
    pathname: `/notifications${buildCampaignAdminNotificationsAuditQueryString(
      input.filters,
      input.cursor,
      input.limit,
    )}`,
    init: {
      method: "GET",
    },
    requestKind: "audit",
  });

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminNotificationsListResponse,
    errorMessage: t`Campaign notification audit response was invalid.`,
    logMessage:
      "Campaign notification audit response did not match the expected schema",
  });
}

export async function getCampaignAdminNotificationsMeta(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
}): Promise<CampaignAdminNotificationsMetaResponse> {
  const payload = await authorizedRequest({
    campaignKey: input.campaignKey,
    pathname: "/notifications/meta",
    init: {
      method: "GET",
    },
    requestKind: "meta",
  });

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminNotificationsMetaResponse,
    errorMessage: t`Campaign notification summary response was invalid.`,
    logMessage:
      "Campaign notification summary response did not match the expected schema",
  });
}

export async function listCampaignAdminNotificationTriggers(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
}): Promise<readonly CampaignAdminNotificationTriggerDescriptor[]> {
  const payload = await authorizedRequest({
    campaignKey: input.campaignKey,
    pathname: "/notifications/triggers",
    init: {
      method: "GET",
    },
    requestKind: "triggerCatalog",
  });

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminNotificationTriggersResponse,
    errorMessage: t`Campaign notification triggers response was invalid.`,
    logMessage:
      "Campaign notification triggers response did not match the expected schema",
  });
}

export async function executeCampaignAdminNotificationTrigger(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly triggerId: string;
  readonly body: CampaignAdminNotificationTriggerExecutionBody;
}): Promise<CampaignAdminNotificationTriggerExecutionResponse> {
  const body = parseCampaignAdminNotificationTriggerExecutionBody(input.body);
  const payload = await authorizedRequest({
    campaignKey: input.campaignKey,
    pathname: `/notifications/triggers/${encodeURIComponent(input.triggerId)}`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    requestKind: "triggerExecution",
  });

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminNotificationTriggerExecutionResponse,
    errorMessage: t`Campaign notification trigger response was invalid.`,
    logMessage:
      "Campaign notification trigger response did not match the expected schema",
  });
}

export async function listCampaignAdminNotificationTemplates(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
}): Promise<readonly CampaignAdminNotificationTemplateDescriptor[]> {
  const payload = await authorizedRequest({
    campaignKey: input.campaignKey,
    pathname: "/notifications/templates",
    init: {
      method: "GET",
    },
    requestKind: "templateCatalog",
  });

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminNotificationTemplatesResponse,
    errorMessage: t`Campaign notification templates response was invalid.`,
    logMessage:
      "Campaign notification templates response did not match the expected schema",
  });
}

export async function getCampaignAdminNotificationTemplatePreview(input: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly templateId: string;
}): Promise<CampaignAdminNotificationTemplatePreview> {
  const payload = await authorizedRequest({
    campaignKey: input.campaignKey,
    pathname: `/notifications/templates/${encodeURIComponent(input.templateId)}/preview`,
    init: {
      method: "GET",
    },
    requestKind: "templatePreview",
  });

  return parseCampaignAdminSuccessPayload({
    payload,
    parse: parseCampaignAdminNotificationTemplatePreviewResponse,
    errorMessage: t`Campaign notification template preview response was invalid.`,
    logMessage:
      "Campaign notification template preview response did not match the expected schema",
  });
}
