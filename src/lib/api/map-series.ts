import { createLogger } from '../logger';
import { getAuthToken } from '../auth';
import { getApiBaseUrl } from '@/config/env';
import { API_FETCH_REFERRER_POLICY } from './fetch-options';
import type {
  GroupedSeriesDataRequest,
  GroupedSeriesDataResponse,
} from '@/lib/map-series/interfaces';

const logger = createLogger('map-series-client');

const GROUPED_SERIES_ENDPOINT_PATH = '/api/v1/experimental/map/grouped-series';
const UNAUTHORIZED_MESSAGE = 'Sign in required for experimental map data.';
const FORBIDDEN_MESSAGE = 'Your account is not allowlisted for experimental map access.';

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
    return `Experimental map grouped-series request failed: ${payloadMessage}`;
  }

  const rawMessage = raw.trim();
  if (rawMessage.length > 0) {
    return `Experimental map grouped-series request failed: ${status} ${statusText} - ${rawMessage}`;
  }

  return `Experimental map grouped-series request failed: ${status} ${statusText}`;
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
  if (token === null || token.trim().length === 0) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }

  const endpoint = `${getApiBaseUrl()}${GROUPED_SERIES_ENDPOINT_PATH}`;

  try {
    logger.info('Fetching grouped experimental map series data', {
      granularity: request.granularity,
      seriesCount: request.series.length,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      referrerPolicy: API_FETCH_REFERRER_POLICY,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(buildRequestBody(request)),
    });

    const rawText = await response.text();
    const parsed = parseJsonSafely(rawText);

    if (!response.ok) {
      throw new Error(buildHttpErrorMessage(response.status, response.statusText, parsed, rawText));
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Experimental map grouped-series API returned an invalid response payload.');
    }

    const envelope = parsed as GroupedSeriesApiEnvelope;
    if (envelope.ok !== true) {
      const message =
        getEnvelopeMessage(parsed) ?? 'Experimental map grouped-series API returned an unknown error.';
      throw new Error(message);
    }

    return envelope.data;
  } catch (error) {
    logger.error('Failed to fetch grouped experimental map series data', {
      error,
      granularity: request.granularity,
      seriesCount: request.series.length,
    });

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to fetch grouped experimental map series data.');
  }
}
