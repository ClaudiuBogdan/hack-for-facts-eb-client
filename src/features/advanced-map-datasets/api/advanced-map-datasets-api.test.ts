import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAuthTokenMock = vi.fn();
const getApiBaseUrlMock = vi.fn();

vi.mock('@/config/env', async () => {
  return {
    getApiBaseUrl: getApiBaseUrlMock,
  };
});

vi.mock('@/lib/auth', async () => {
  return {
    getAuthToken: getAuthTokenMock,
  };
});

describe('advanced map datasets api', () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthTokenMock.mockReset();
    getApiBaseUrlMock.mockReset();
    getAuthTokenMock.mockResolvedValue('test-token');
    getApiBaseUrlMock.mockReturnValue('https://example.test');
  });

  it('serializes create requests against the JSON dataset endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          data: {
            id: 'dataset-1',
            publicId: 'public-1',
            userId: 'user-1',
            title: 'Test dataset',
            description: null,
            markdown: null,
            unit: 'lei',
            visibility: 'private',
            rowCount: 1,
            replacedAt: null,
            createdAt: '2026-04-09T10:00:00.000Z',
            updatedAt: '2026-04-09T10:00:00.000Z',
            rows: [{ sirutaCode: '12345', valueNumber: '10', valueJson: null }],
          },
        })
      ),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createAdvancedMapDataset } = await import('./advanced-map-datasets-api');

    const result = await createAdvancedMapDataset({
      title: 'Test dataset',
      unit: 'lei',
      rows: [
        { sirutaCode: '12345', valueNumber: 10 },
        { sirutaCode: '', valueNumber: 100 },
      ],
    });

    expect(result.id).toBe('dataset-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(
      JSON.stringify({
        title: 'Test dataset',
        unit: 'lei',
        rows: [{ sirutaCode: '12345', valueNumber: '10', valueJson: null }],
      })
    );
  });

  it('preserves explicit null unit when patching metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          ok: true,
          data: {
            id: 'dataset-1',
            publicId: 'public-1',
            userId: 'user-1',
            title: 'Test dataset',
            description: null,
            markdown: null,
            unit: null,
            visibility: 'private',
            rowCount: 1,
            replacedAt: null,
            createdAt: '2026-04-09T10:00:00.000Z',
            updatedAt: '2026-04-09T10:00:00.000Z',
            rows: [{ sirutaCode: '12345', valueNumber: '10', valueJson: null }],
          },
        })
      ),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { updateAdvancedMapDatasetMetadata } = await import('./advanced-map-datasets-api');

    await updateAdvancedMapDatasetMetadata('dataset-1', {
      unit: null,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ unit: null }));
  });

});
