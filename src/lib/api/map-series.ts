import { createLogger } from '../logger';
import { getAuthToken } from '../auth';
import { getApiBaseUrl } from '@/config/env';
import { API_FETCH_REFERRER_POLICY } from './fetch-options';
import type {
  GroupedSeriesDataRequest,
  GroupedSeriesDataResponse,
} from '@/lib/map-series/interfaces';
import { GroupedSeriesDataResponseSchema } from '@/lib/map-series/interfaces';

const logger = createLogger('map-series-client');

const GROUPED_SERIES_ENDPOINT_PATH = '/api/v1/advanced-map-analytics/grouped-series';
const UNAUTHORIZED_MESSAGE = 'Sign in required for advanced map analytics data.';
const FORBIDDEN_MESSAGE = 'Your account is not allowlisted for advanced map analytics access.';

interface GroupedSeriesApiRequest extends GroupedSeriesDataRequest {
  payload: {
    format: 'csv_wide_matrix_v1';
    compression: 'none';
  };
}

type GroupedSeriesApiSuccess = {
  ok: true;
  data: GroupedSeriesDataResponse;
};

type GroupedSeriesApiFailure = {
  ok: false;
  error: string;
  message?: string;
  code?: string;
  details?: unknown;
};

type GroupedSeriesApiEnvelope = GroupedSeriesApiSuccess | GroupedSeriesApiFailure;

function parseJsonSafely(raw: string): unknown {
  if (raw.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function getEnvelopeMessage(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const message = record.message;
  return typeof message === 'string' && message.trim().length > 0 ? message : undefined;
}

function buildHttpErrorMessage(
  status: number,
  statusText: string,
  payload: unknown,
  raw: string
): string {
  if (status === 401) {
    return UNAUTHORIZED_MESSAGE;
  }

  if (status === 403) {
    return FORBIDDEN_MESSAGE;
  }

  const payloadMessage = getEnvelopeMessage(payload);
  if (payloadMessage !== undefined) {
    return `Advanced map analytics grouped-series request failed: ${payloadMessage}`;
  }

  const rawMessage = raw.trim();
  if (rawMessage.length > 0) {
    return `Advanced map analytics grouped-series request failed: ${status} ${statusText} - ${rawMessage}`;
  }

  return `Advanced map analytics grouped-series request failed: ${status} ${statusText}`;
}

function buildRequestBody(request: GroupedSeriesDataRequest): GroupedSeriesApiRequest {
  return {
    granularity: request.granularity,
    series: request.series,
    payload: {
      format: 'csv_wide_matrix_v1',
      compression: 'none',
    },
  };
}

export async function fetchGroupedSeriesData(
  request: GroupedSeriesDataRequest
): Promise<GroupedSeriesDataResponse> {
  const token = await getAuthToken();
  const endpoint = `${getApiBaseUrl()}${GROUPED_SERIES_ENDPOINT_PATH}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token && token.trim().length > 0) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    logger.info('Fetching grouped-series series data', {
      granularity: request.granularity,
      seriesCount: request.series.length,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      referrerPolicy: API_FETCH_REFERRER_POLICY,
      headers,
      body: JSON.stringify(buildRequestBody(request)),
    });

    const rawText = await response.text();
    const parsed = parseJsonSafely(rawText);

    if (!response.ok) {
      throw new Error(buildHttpErrorMessage(response.status, response.statusText, parsed, rawText));
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Advanced map analytics grouped-series API returned an invalid response payload.');
    }

    const envelope = parsed as GroupedSeriesApiEnvelope;
    if (envelope.ok !== true) {
      const message =
        getEnvelopeMessage(parsed) ?? 'Advanced map analytics grouped-series API returned an unknown error.';
      throw new Error(message);
    }

    const validationResult = GroupedSeriesDataResponseSchema.safeParse(envelope.data);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      const issueMessage = firstIssue?.message ?? 'unknown validation error';
      throw new Error(
        `Advanced map analytics grouped-series API returned invalid data: ${issueMessage}`
      );
    }

    return validationResult.data;
  } catch (error) {
    logger.error('Failed to fetch grouped-series series data', {
      error,
      granularity: request.granularity,
      seriesCount: request.series.length,
    });

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to fetch grouped-series series data.');
  }
}
