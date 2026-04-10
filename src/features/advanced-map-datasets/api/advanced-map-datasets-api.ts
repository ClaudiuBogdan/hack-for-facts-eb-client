import { getApiBaseUrl } from '@/config/env';
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options';
import { getAuthToken } from '@/lib/auth';
import {
  normalizeAdvancedMapDatasetConnection,
  normalizeAdvancedMapDatasetDetail,
  normalizeAdvancedMapDatasetPublicDetail,
  parseApiEnvelope,
  type AdvancedMapDatasetConnection,
  type AdvancedMapDatasetDetail,
  type AdvancedMapDatasetJsonItem,
  type AdvancedMapDatasetVisibility,
} from './schemas';

const OWNER_BASE_ENDPOINT = '/api/v1/advanced-map-datasets';
const PUBLIC_BASE_ENDPOINT = '/api/v1/advanced-map-datasets/public';

export class AdvancedMapDatasetsApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'AdvancedMapDatasetsApiError';
  }
}

export interface AdvancedMapDatasetRowInput {
  readonly sirutaCode: string;
  readonly valueNumber?: string | number | null | undefined;
  readonly valueJson?: AdvancedMapDatasetJsonItem | null | undefined;
}

export interface AdvancedMapDatasetCreateInput {
  readonly title: string;
  readonly description?: string | null;
  readonly markdown?: string | null;
  readonly unit?: string | null;
  readonly visibility?: AdvancedMapDatasetVisibility;
  readonly rows: readonly AdvancedMapDatasetRowInput[];
}

export interface AdvancedMapDatasetUpdateMetadataInput {
  readonly title?: string;
  readonly description?: string | null;
  readonly markdown?: string | null;
  readonly unit?: string | null;
  readonly visibility?: AdvancedMapDatasetVisibility;
}

export interface AdvancedMapDatasetReplaceRowsInput {
  readonly rows: readonly AdvancedMapDatasetRowInput[];
}

// Client/server dataset contract:
// docs/specs/specs-202604092015-custom-map-data-series-editor.md
// Advanced Map datasets now use JSON row writes with { valueNumber, valueJson }.
// CSV remains a local import/export concern in the client.

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

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getFallbackErrorMessage(status: number): string {
  if (status === 401) {
    return 'Sign in required for advanced map datasets.';
  }

  if (status === 403) {
    return 'You do not have access to this dataset resource.';
  }

  if (status === 404) {
    return 'Requested dataset resource was not found.';
  }

  if (status === 409) {
    return 'The requested dataset operation conflicts with the current state.';
  }

  if (status === 413) {
    return 'The dataset payload is too large to be saved.';
  }

  return 'Advanced map datasets request failed.';
}

function buildApiError(status: number, payload: unknown, rawText: string): AdvancedMapDatasetsApiError {
  const fallbackMessage = getFallbackErrorMessage(status);

  if (payload === null) {
    return new AdvancedMapDatasetsApiError(
      rawText.trim().length > 0 ? `${fallbackMessage} ${rawText.trim()}` : fallbackMessage,
      status
    );
  }

  const envelope = parseApiEnvelope(payload);
  const record = asRecord(payload);
  const message =
    envelope.message ??
    envelope.error ??
    (typeof record.message === 'string' ? record.message : undefined) ??
    fallbackMessage;

  return new AdvancedMapDatasetsApiError(message, status, envelope.code, envelope.details);
}

async function ownerRequest(pathname: string, init: RequestInit = {}): Promise<unknown> {
  const token = await getAuthToken();
  if (token === null || token.trim().length === 0) {
    throw new AdvancedMapDatasetsApiError('Sign in required for advanced map datasets.', 401);
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
  const envelope = parseApiEnvelope(payload);
  const record = asRecord(payload);

  if (envelope.ok === false) {
    throw new AdvancedMapDatasetsApiError(
      envelope.message ?? envelope.error ?? 'Advanced map datasets request failed.',
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

function readTrimmedText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function normalizeRowInput(row: AdvancedMapDatasetRowInput): {
  sirutaCode: string;
  valueNumber: string | null;
  valueJson: AdvancedMapDatasetJsonItem | null;
} | null {
  const sirutaCode = readTrimmedText(row.sirutaCode);
  const valueNumber = readTrimmedText(row.valueNumber);
  const hasValueNumber = valueNumber.length > 0;
  const valueJson = row.valueJson ?? null;

  if (sirutaCode.length === 0) {
    return null;
  }

  if (!hasValueNumber && valueJson === null) {
    return null;
  }

  return {
    sirutaCode,
    valueNumber: hasValueNumber ? valueNumber : null,
    valueJson,
  };
}

function normalizeRows(rows: readonly AdvancedMapDatasetRowInput[]) {
  const normalizedRows: Array<{
    sirutaCode: string;
    valueNumber: string | null;
    valueJson: AdvancedMapDatasetJsonItem | null;
  }> = [];

  for (const row of rows) {
    const normalized = normalizeRowInput(row);
    if (normalized !== null) {
      normalizedRows.push(normalized);
    }
  }

  return normalizedRows;
}

function appendMetadataBody(
  body: Record<string, string | null | undefined>
): Record<string, string | null> {
  const nextBody: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      nextBody[key] = value;
    }
  }

  return nextBody;
}

function buildPaginationSearchParams(input?: { limit?: number; offset?: number }): string {
  const searchParams = new URLSearchParams();
  if (typeof input?.limit === 'number' && Number.isFinite(input.limit)) {
    searchParams.set('limit', String(Math.max(0, Math.trunc(input.limit))));
  }

  if (typeof input?.offset === 'number' && Number.isFinite(input.offset)) {
    searchParams.set('offset', String(Math.max(0, Math.trunc(input.offset))));
  }

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : '';
}

export async function listAdvancedMapDatasets(input?: {
  readonly limit?: number;
  readonly offset?: number;
}): Promise<AdvancedMapDatasetConnection> {
  const payload = await ownerRequest(buildPaginationSearchParams(input));
  return normalizeAdvancedMapDatasetConnection(unwrapData(payload));
}

export async function getAdvancedMapDataset(datasetId: string): Promise<AdvancedMapDatasetDetail> {
  const payload = await ownerRequest(`/${encodeURIComponent(datasetId)}`);
  return normalizeAdvancedMapDatasetDetail(unwrapData(payload));
}

export async function createAdvancedMapDataset(
  input: AdvancedMapDatasetCreateInput
): Promise<AdvancedMapDatasetDetail> {
  // See docs/specs/specs-202604092015-custom-map-data-series-editor.md:
  // owner writes send JSON rows with valueNumber/valueJson; CSV is import/export only.
  const payload = await ownerRequest('/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: input.title,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.markdown !== undefined ? { markdown: input.markdown } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      rows: normalizeRows(input.rows),
    }),
  });

  return normalizeAdvancedMapDatasetDetail(unwrapData(payload));
}

export async function updateAdvancedMapDatasetMetadata(
  datasetId: string,
  input: AdvancedMapDatasetUpdateMetadataInput
): Promise<AdvancedMapDatasetDetail> {
  const payload = await ownerRequest(`/${encodeURIComponent(datasetId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      appendMetadataBody({
        title: input.title,
        description: input.description !== undefined ? input.description : undefined,
        markdown: input.markdown !== undefined ? input.markdown : undefined,
        unit: input.unit !== undefined ? input.unit : undefined,
        visibility: input.visibility,
      })
    ),
  });

  return normalizeAdvancedMapDatasetDetail(unwrapData(payload));
}

export async function replaceAdvancedMapDatasetRows(
  datasetId: string,
  input: AdvancedMapDatasetReplaceRowsInput
): Promise<AdvancedMapDatasetDetail> {
  // See docs/specs/specs-202604092015-custom-map-data-series-editor.md:
  // numeric and typed payload layers move together through the JSON row endpoint.
  const payload = await ownerRequest(`/${encodeURIComponent(datasetId)}/rows`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rows: normalizeRows(input.rows),
    }),
  });

  return normalizeAdvancedMapDatasetDetail(unwrapData(payload));
}

export async function deleteAdvancedMapDataset(datasetId: string): Promise<void> {
  await ownerRequest(`/${encodeURIComponent(datasetId)}`, {
    method: 'DELETE',
  });
}

export async function listPublicAdvancedMapDatasets(input?: {
  readonly limit?: number;
  readonly offset?: number;
}): Promise<AdvancedMapDatasetConnection> {
  const payload = await publicRequest(buildPaginationSearchParams(input));
  return normalizeAdvancedMapDatasetConnection(unwrapData(payload));
}

export async function getPublicAdvancedMapDataset(publicId: string): Promise<AdvancedMapDatasetDetail> {
  const payload = await publicRequest(`/${encodeURIComponent(publicId)}`);
  return normalizeAdvancedMapDatasetPublicDetail(unwrapData(payload));
}
