import { getAuthToken } from '@/lib/auth';
import { getApiBaseUrl } from '@/config/env';
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import {
  parseEnvelope,
  normalizeMapDetail,
  normalizeMapList,
  normalizeSnapshot,
  normalizeSnapshotsList,
  type AdvancedMapAnalyticsMapDetail,
  type AdvancedMapAnalyticsMapSummary,
  type AdvancedMapAnalyticsSnapshot,
  type AdvancedMapAnalyticsSnapshotsList,
  type AdvancedMapAnalyticsVisibility,
} from './schemas';

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

interface CreateMapInput {
  title?: string;
  description?: string | null;
  state?: AdvancedMapAnalyticsVisibility;
  schemaVersion: number;
  config: AdvancedMapAnalyticsUrlState;
}

interface UpdateMapInput {
  title?: string;
  description?: string | null;
  state?: AdvancedMapAnalyticsVisibility;
}

interface CreateSnapshotInput {
  title?: string;
  description?: string | null;
  stateAtSave?: AdvancedMapAnalyticsVisibility;
  schemaVersion: number;
  config: AdvancedMapAnalyticsUrlState;
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

function asRecord(value: unknown): Record<string, unknown> {
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

async function ownerRequest(pathname: string, init: RequestInit = {}): Promise<unknown> {
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

function unwrapData(payload: unknown): unknown {
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

function ensureBundledGroupedSeriesData(
  mapDetail: AdvancedMapAnalyticsMapDetail,
  endpointName: 'owner' | 'public'
): AdvancedMapAnalyticsMapDetail {
  if (mapDetail.groupedSeriesData !== undefined) {
    return mapDetail;
  }

  throw new AdvancedMapAnalyticsApiError(
    endpointName === 'owner'
      ? 'Owner map detail response missing grouped-series bundled data.'
      : 'Public map detail response missing grouped-series bundled data.',
    500,
    'BUNDLED_GROUPED_SERIES_MISSING'
  );
}

export async function createAdvancedMapAnalyticsMap(
  input: CreateMapInput
): Promise<AdvancedMapAnalyticsMapDetail> {
  const payload = await ownerRequest('/maps', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: input.title,
      description: input.description ?? undefined,
      visibility: input.state ?? 'private',
      state: input.config,
      schemaVersion: input.schemaVersion,
    }),
  });

  return normalizeMapDetail(unwrapData(payload));
}

export async function listAdvancedMapAnalyticsMaps(): Promise<AdvancedMapAnalyticsMapSummary[]> {
  const payload = await ownerRequest('/maps', {
    method: 'GET',
  });

  return normalizeMapList(unwrapData(payload));
}

export async function getAdvancedMapAnalyticsMap(mapId: string): Promise<AdvancedMapAnalyticsMapDetail> {
  const payload = await ownerRequest(`/maps/${encodeURIComponent(mapId)}`, {
    method: 'GET',
  });

  return ensureBundledGroupedSeriesData(normalizeMapDetail(unwrapData(payload)), 'owner');
}

export async function updateAdvancedMapAnalyticsMap(
  mapId: string,
  input: UpdateMapInput
): Promise<AdvancedMapAnalyticsMapDetail> {
  const payload = await ownerRequest(`/maps/${encodeURIComponent(mapId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      visibility: input.state,
    }),
  });

  return normalizeMapDetail(unwrapData(payload));
}

export async function createAdvancedMapAnalyticsSnapshot(
  mapId: string,
  input: CreateSnapshotInput
): Promise<AdvancedMapAnalyticsSnapshot> {
  const mapPatch: Record<string, unknown> = {};
  if (input.title !== undefined) {
    mapPatch.title = input.title;
  }
  if (input.description !== undefined) {
    mapPatch.description = input.description;
  }
  if (input.stateAtSave !== undefined) {
    mapPatch.visibility = input.stateAtSave;
  }

  const payload = await ownerRequest(`/maps/${encodeURIComponent(mapId)}/snapshots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state: input.config,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(Object.keys(mapPatch).length > 0 ? { mapPatch } : {}),
    }),
  });

  const unwrapped = unwrapData(payload);
  const record = asRecord(unwrapped);
  return normalizeSnapshot(record.snapshot ?? unwrapped);
}

export async function listAdvancedMapAnalyticsSnapshots(
  mapId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<AdvancedMapAnalyticsSnapshotsList> {
  const queryParams = new URLSearchParams();
  if (typeof params.page === 'number' && Number.isFinite(params.page)) {
    queryParams.set('page', String(Math.max(1, Math.trunc(params.page))));
  }
  if (typeof params.pageSize === 'number' && Number.isFinite(params.pageSize)) {
    queryParams.set('pageSize', String(Math.max(1, Math.trunc(params.pageSize))));
  }
  const queryString = queryParams.toString();
  const snapshotsPath = `/maps/${encodeURIComponent(mapId)}/snapshots${
    queryString.length > 0 ? `?${queryString}` : ''
  }`;

  const payload = await ownerRequest(snapshotsPath, {
    method: 'GET',
  });

  const list = normalizeSnapshotsList(unwrapData(payload));

  const hydratedSnapshots = await Promise.all(
    list.snapshots.map(async (snapshot) => {
      if (snapshot.snapshotId.trim().length === 0) {
        return snapshot;
      }

      try {
        return await getAdvancedMapAnalyticsSnapshot(mapId, snapshot.snapshotId);
      } catch {
        return snapshot;
      }
    })
  );

  return {
    snapshots: hydratedSnapshots,
    page: list.page,
    pageSize: list.pageSize,
    total: list.total,
    hasNextPage: list.hasNextPage,
  };
}

export async function getAdvancedMapAnalyticsSnapshot(
  mapId: string,
  snapshotId: string
): Promise<AdvancedMapAnalyticsSnapshot> {
  const payload = await ownerRequest(
    `/maps/${encodeURIComponent(mapId)}/snapshots/${encodeURIComponent(snapshotId)}`,
    {
      method: 'GET',
    }
  );

  return normalizeSnapshot(unwrapData(payload));
}

export async function deleteAdvancedMapAnalyticsMap(mapId: string): Promise<void> {
  throw new AdvancedMapAnalyticsApiError(
    `Deleting map "${mapId}" is not available yet.`,
    501,
    'NOT_IMPLEMENTED'
  );
}

export async function getPublicAdvancedMapAnalyticsMap(publicId: string): Promise<AdvancedMapAnalyticsMapDetail> {
  try {
    const payload = await publicRequest(`/${encodeURIComponent(publicId)}`);
    return ensureBundledGroupedSeriesData(normalizeMapDetail(unwrapData(payload)), 'public');
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
