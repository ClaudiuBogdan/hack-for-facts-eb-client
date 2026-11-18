import { getAuthToken } from '@/lib/auth';
import { getApiBaseUrl } from '@/config/env';
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options';
import { parseEnvelope } from './envelope';

/**
 * The advanced map analytics API's transport: endpoints, requests, errors and
 * the response envelope, without the response decoders (`./schemas`, which
 * build the map and chart schemas). The public map route, which every page
 * evaluates, starts its read with this alone (`fetchPublicMapPayload`); the map
 * page decodes it with `advanced-map-analytics-api.ts`, which arrives with the
 * page's own code (docs/route-contracts.md).
 */

const OWNER_BASE_ENDPOINT = '/api/v1/advanced-map-analytics';
const PUBLIC_BASE_ENDPOINT = '/api/v1/advanced-map-analytics/public';

export class AdvancedMapAnalyticsApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'AdvancedMapAnalyticsApiError';
  }
}

function getOwnerEndpoint(pathname: string): string {
  return `${getApiBaseUrl()}${OWNER_BASE_ENDPOINT}${pathname}`;
}

function getPublicEndpoint(pathname: string): string {
  return `${getApiBaseUrl()}${PUBLIC_BASE_ENDPOINT}${pathname}`;
}

function parseJsonSafely(rawText: string): unknown {
  if (rawText.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return null;
  }
}

function resolveFallbackErrorMessage(status: number): string {
  if (status === 401) {
    return 'Sign in required for advanced map analytics.';
  }

  if (status === 403) {
    return 'You do not have access to this map resource. Please contact support if you need assistance.';
  }

  if (status === 404) {
    return 'Requested map resource was not found.';
  }

  if (status === 409) {
    return 'The requested operation conflicts with map snapshot limits or current state.';
  }

  if (status === 413) {
    return 'The map payload is too large to be saved.';
  }

  return 'Advanced map analytics request failed.';
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  return value as Record<string, unknown>;
}

function buildApiError(status: number, payload: unknown, rawText: string): AdvancedMapAnalyticsApiError {
  const fallbackMessage = resolveFallbackErrorMessage(status);

  if (status === 401 || status === 403 || status === 404 || status === 409 || status === 413) {
    return new AdvancedMapAnalyticsApiError(fallbackMessage, status);
  }

  if (payload === null) {
    return new AdvancedMapAnalyticsApiError(
      rawText.trim().length > 0 ? `${fallbackMessage} ${rawText.trim()}` : fallbackMessage,
      status
    );
  }

  const parsedEnvelope = parseEnvelope(payload);
  const details = asRecord(payload);
  const message =
    parsedEnvelope.message ??
    parsedEnvelope.error ??
    (typeof details.message === 'string' ? details.message : undefined) ??
    fallbackMessage;

  return new AdvancedMapAnalyticsApiError(message, status, parsedEnvelope.code, parsedEnvelope.details);
}

export async function ownerRequest(pathname: string, init: RequestInit = {}): Promise<unknown> {
  const token = await getAuthToken();
  if (token === null || token.trim().length === 0) {
    throw new AdvancedMapAnalyticsApiError('Sign in required for advanced map analytics.', 401);
  }

  const response = await fetch(getOwnerEndpoint(pathname), {
    ...init,
    referrerPolicy: API_FETCH_REFERRER_POLICY,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const rawText = await response.text();
  const payload = parseJsonSafely(rawText);

  if (!response.ok) {
    throw buildApiError(response.status, payload, rawText);
  }

  return payload;
}

async function publicRequest(pathname: string): Promise<unknown> {
  const response = await fetch(getPublicEndpoint(pathname), {
    method: 'GET',
    referrerPolicy: API_FETCH_REFERRER_POLICY,
  });

  const rawText = await response.text();
  const payload = parseJsonSafely(rawText);

  if (!response.ok) {
    throw buildApiError(response.status, payload, rawText);
  }

  return payload;
}

export function unwrapData(payload: unknown): unknown {
  const envelope = parseEnvelope(payload);
  const record = asRecord(payload);

  if (envelope.ok === false) {
    throw new AdvancedMapAnalyticsApiError(
      envelope.message ?? envelope.error ?? 'Advanced map analytics request failed.',
      500,
      envelope.code,
      envelope.details
    );
  }

  if (envelope.data !== undefined) {
    return envelope.data;
  }

  return record.data ?? record;
}

function isInternalMapId(value: string): boolean {
  return /^ama_[a-f0-9]{32}$/i.test(value.trim());
}

/**
 * A public map's response, unwrapped from its envelope and not yet decoded. A
 * 404 for what looks like an internal map ID says which ID to use instead.
 */
export async function fetchPublicMapPayload(publicId: string): Promise<unknown> {
  try {
    return unwrapData(await publicRequest(`/${encodeURIComponent(publicId)}`));
  } catch (error) {
    if (
      error instanceof AdvancedMapAnalyticsApiError &&
      error.status === 404 &&
      isInternalMapId(publicId)
    ) {
      throw new AdvancedMapAnalyticsApiError(
        'Public map not found. The provided ID looks like an internal map ID (ama_...). Use the map public ID from a published map URL.',
        404,
        error.code,
        error.details
      );
    }

    throw error;
  }
}
