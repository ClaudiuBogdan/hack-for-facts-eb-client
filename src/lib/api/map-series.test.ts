import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../auth', () => ({
  getAuthToken: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  getApiBaseUrl: vi.fn(() => 'https://api.example.com'),
}));

import { createDefaultExperimentalMapSeries } from '@/schemas/experimental-map';
import { getAuthToken } from '../auth';
import { API_FETCH_REFERRER_POLICY } from './fetch-options';
import { fetchGroupedSeriesData } from './map-series';

function createSeriesRequest() {
  const series = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
  if (series.type === 'aggregated-series-calculation') {
    throw new Error('Unexpected calculation series in test setup');
  }

  return {
    granularity: 'UAT' as const,
    series: [series],
  };
}

function createGroupedData(seriesId: string) {
  return {
    manifest: {
      generated_at: '2026-02-28T10:00:00.000Z',
      format: 'wide_matrix_v1' as const,
      granularity: 'UAT' as const,
      series: [
        {
          series_id: seriesId,
          unit: 'RON',
          defined_value_count: 2,
        },
      ],
    },
    payload: {
      mime: 'text/csv' as const,
      compression: 'none' as const,
      data: `siruta_code,${seriesId}\n1001,10\n1002,null`,
    },
    warnings: [],
  };
}

describe('fetchGroupedSeriesData', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('posts grouped-series request with auth and unwraps success envelope', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('test-token');

    const request = createSeriesRequest();
    const groupedData = createGroupedData(request.series[0].id);

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(JSON.stringify({ ok: true, data: groupedData })),
    } satisfies Partial<Response>);

    const result = await fetchGroupedSeriesData(request);

    expect(result).toEqual(groupedData);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/experimental/map/grouped-series');
    expect(init.method).toBe('POST');
    expect(init.referrerPolicy).toBe(API_FETCH_REFERRER_POLICY);

    expect(init.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      })
    );

    const body = JSON.parse(String(init.body)) as {
      granularity: string;
      series: unknown[];
      payload: { format: string; compression: string };
    };

    expect(body.granularity).toBe('UAT');
    expect(body.series).toHaveLength(1);
    expect(body.payload).toEqual({
      format: 'csv_wide_matrix_v1',
      compression: 'none',
    });
  });

  it('throws auth-required error and skips fetch when token is missing', async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    await expect(fetchGroupedSeriesData(createSeriesRequest())).rejects.toThrow(
      'Sign in required for experimental map data.'
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps 401 and 403 responses to explicit authz messages', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('test-token');

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: vi.fn().mockResolvedValue(JSON.stringify({ ok: false, error: 'UnauthorizedError' })),
    } satisfies Partial<Response>);

    await expect(fetchGroupedSeriesData(createSeriesRequest())).rejects.toThrow(
      'Sign in required for experimental map data.'
    );

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: vi.fn().mockResolvedValue(JSON.stringify({ ok: false, error: 'ForbiddenError' })),
    } satisfies Partial<Response>);

    await expect(fetchGroupedSeriesData(createSeriesRequest())).rejects.toThrow(
      'Your account is not allowlisted for experimental map access.'
    );
  });

  it('includes server message for non-auth HTTP failures', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('test-token');

    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: vi
        .fn()
        .mockResolvedValue(JSON.stringify({ ok: false, error: 'ProviderError', message: 'DB down' })),
    } satisfies Partial<Response>);

    await expect(fetchGroupedSeriesData(createSeriesRequest())).rejects.toThrow(
      'Experimental map grouped-series request failed: DB down'
    );
  });

  it('fails when server returns invalid grouped-series payload shape', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('test-token');

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify({
            ok: true,
            data: {
              manifest: {
                generated_at: '2026-02-28T10:00:00.000Z',
                format: 'wide_matrix_v2',
                granularity: 'UAT',
                series: [],
              },
              payload: {
                mime: 'text/csv',
                compression: 'none',
                data: 'siruta_code',
              },
            },
          })
        ),
    } satisfies Partial<Response>);

    await expect(fetchGroupedSeriesData(createSeriesRequest())).rejects.toThrow(
      'Experimental map grouped-series API returned invalid data'
    );
  });
});
