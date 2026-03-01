import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  getAuthToken: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  getApiBaseUrl: vi.fn(() => 'https://api.example.com'),
}));

import { getAuthToken } from '@/lib/auth';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options';
import {
  createAdvancedMapAnalyticsMap,
  getAdvancedMapAnalyticsMap,
  getPublicAdvancedMapAnalyticsMap,
  listAdvancedMapAnalyticsSnapshots,
  listAdvancedMapAnalyticsMaps,
} from './advanced-map-analytics-api';

function createMockMapDetail(config = AdvancedMapAnalyticsUrlStateSchema.parse({})) {
  return {
    mapId: 'map_123',
    visibility: 'private',
    title: 'My map',
    description: null,
    publicId: null,
    snapshotCount: 1,
    lastSnapshotId: 'snap_123',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    lastSnapshot: {
      title: 'My map',
      description: null,
      state: config,
      savedAt: '2026-03-01T10:00:00.000Z',
    },
  };
}

function createMockGroupedSeriesData(seriesId = 'series_1') {
  return {
    manifest: {
      generated_at: '2026-03-01T10:00:00.000Z',
      format: 'wide_matrix_v1' as const,
      granularity: 'UAT' as const,
      series: [
        {
          series_id: seriesId,
          unit: 'RON',
          defined_value_count: 1,
        },
      ],
    },
    payload: {
      mime: 'text/csv' as const,
      compression: 'none' as const,
      data: `siruta_code,${seriesId}\n1001,10`,
    },
    warnings: [],
  };
}

describe('advanced-map-analytics api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('creates map with auth and normalized payload', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('token-123');
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Shared map' });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(JSON.stringify({ ok: true, data: createMockMapDetail(mapState) })),
    } satisfies Partial<Response>);

    const result = await createAdvancedMapAnalyticsMap({
      config: mapState,
      schemaVersion: mapState.version,
      state: 'private',
      title: 'Shared map',
    });

    expect(result.id).toBe('map_123');
    expect(result.snapshotCount).toBe(1);
    expect(result.lastSnapshot.config.mapName).toBe('Shared map');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/advanced-map-analytics/maps');
    expect(init.referrerPolicy).toBe(API_FETCH_REFERRER_POLICY);
    expect(init.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer token-123',
        'Content-Type': 'application/json',
      })
    );

    expect(init.body).toBe(
      JSON.stringify({
        title: 'Shared map',
        description: undefined,
        visibility: 'private',
        state: mapState,
        schemaVersion: mapState.version,
      })
    );
  });

  it('throws explicit 401 error when token is missing', async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null);

    await expect(listAdvancedMapAnalyticsMaps()).rejects.toThrow(
      'Sign in required for advanced map analytics.'
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps 403 response to explicit allowlist error', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('token-123');

    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: vi.fn().mockResolvedValue(JSON.stringify({ ok: false, error: 'ForbiddenError' })),
    } satisfies Partial<Response>);

    await expect(listAdvancedMapAnalyticsMaps()).rejects.toThrow(
      'You do not have access to this map resource.'
    );
  });

  it('keeps server pagination and forwards page query params for snapshots list', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('token-123');
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Page snapshot map' });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          data: {
            snapshots: [
              {
                snapshotId: '',
                createdAt: '2026-03-01T10:00:00.000Z',
                schemaVersion: 1,
                stateAtSave: 'private',
                title: 'Page snapshot',
                description: null,
                config: mapState,
              },
            ],
            page: 2,
            pageSize: 10,
            total: 25,
            hasNextPage: true,
          },
        })
      ),
    } satisfies Partial<Response>);

    const result = await listAdvancedMapAnalyticsSnapshots('map_123', { page: 2, pageSize: 10 });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(25);
    expect(result.hasNextPage).toBe(true);
    expect(result.snapshots).toHaveLength(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/advanced-map-analytics/maps/map_123/snapshots?page=2&pageSize=10');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer token-123',
      })
    );
  });

  it('fetches public map without auth header', async () => {
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Public map' });
    const groupedSeriesData = createMockGroupedSeriesData();

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          data: {
            mapId: 'map_123',
            publicId: 'map_public',
            title: 'Public map',
            description: null,
            snapshotId: 'snap_public',
            snapshot: {
              title: 'Public map',
              description: null,
              state: mapState,
              savedAt: '2026-03-01T10:00:00.000Z',
            },
            groupedSeriesData,
            updatedAt: '2026-03-01T10:00:00.000Z',
          },
        })
      ),
    } satisfies Partial<Response>);

    const result = await getPublicAdvancedMapAnalyticsMap('map_public');

    expect(result.lastSnapshot.config.mapName).toBe('Public map');
    expect(result.groupedSeriesData).toEqual(groupedSeriesData);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/advanced-map-analytics/public/map_public');
    expect(init.headers).toBeUndefined();
  });

  it('parses bundled grouped-series data from owner map detail endpoint', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('token-123');
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Owner map' });
    const groupedSeriesData = createMockGroupedSeriesData('owner_series');

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          data: {
            ...createMockMapDetail(mapState),
            groupedSeriesData,
          },
        })
      ),
    } satisfies Partial<Response>);

    const result = await getAdvancedMapAnalyticsMap('map_123');

    expect(result.lastSnapshot.config.mapName).toBe('Owner map');
    expect(result.groupedSeriesData).toEqual(groupedSeriesData);
  });

  it('throws when owner map detail response misses grouped-series bundled data', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('token-123');
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Owner map' });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          data: createMockMapDetail(mapState),
        })
      ),
    } satisfies Partial<Response>);

    await expect(getAdvancedMapAnalyticsMap('map_123')).rejects.toThrow(
      'Owner map detail response missing grouped-series bundled data.'
    );
  });

  it('throws when public map detail response misses grouped-series bundled data', async () => {
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Public map' });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          data: {
            mapId: 'map_123',
            publicId: 'map_public',
            title: 'Public map',
            description: null,
            snapshotId: 'snap_public',
            snapshot: {
              title: 'Public map',
              description: null,
              state: mapState,
              savedAt: '2026-03-01T10:00:00.000Z',
            },
            updatedAt: '2026-03-01T10:00:00.000Z',
          },
        })
      ),
    } satisfies Partial<Response>);

    await expect(getPublicAdvancedMapAnalyticsMap('map_public')).rejects.toThrow(
      'Public map detail response missing grouped-series bundled data.'
    );
  });

  it('returns a helpful message when public endpoint is called with an internal map id', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: vi.fn().mockResolvedValue(JSON.stringify({ ok: false, error: 'NotFoundError' })),
    } satisfies Partial<Response>);

    await expect(
      getPublicAdvancedMapAnalyticsMap('ama_96e8120e16724b90b25d42302c2c9603')
    ).rejects.toThrow(
      'Public map not found. The provided ID looks like an internal map ID (ama_...). Use the map public ID from a published map URL.'
    );
  });

  it('throws when bundled grouped-series data shape is invalid', async () => {
    vi.mocked(getAuthToken).mockResolvedValue('token-123');
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({ mapName: 'Owner map' });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          data: {
            ...createMockMapDetail(mapState),
            groupedSeriesData: {
              manifest: {
                generated_at: '2026-03-01T10:00:00.000Z',
                format: 'wide_matrix_v2',
                granularity: 'UAT',
                series: [],
              },
              payload: {
                mime: 'text/csv',
                compression: 'none',
                data: 'siruta_code',
              },
              warnings: [],
            },
          },
        })
      ),
    } satisfies Partial<Response>);

    await expect(getAdvancedMapAnalyticsMap('map_123')).rejects.toThrow(
      'Owner map detail response missing grouped-series bundled data.'
    );
  });
});
