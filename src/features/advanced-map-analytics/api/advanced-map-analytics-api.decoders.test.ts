import { beforeEach, expect, it, vi } from 'vitest';

// The decoders' chunk fails to load (a deploy removed it from an old tab).
vi.mock('./schemas', () => {
  throw new Error('Failed to fetch dynamically imported module');
});
vi.mock('@/lib/auth', () => ({ getAuthToken: vi.fn(async () => 'token') }));
vi.mock('@/config/env', () => ({ getApiBaseUrl: vi.fn(() => 'https://api.example.com') }));

const fetchMock = vi.fn();
beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

it('sends no owner mutation when its decoder cannot load, so a retry cannot create a second map', async () => {
  const api = await import('./advanced-map-analytics-api');

  await expect(api.createAdvancedMapAnalyticsMap({ title: 'Map', config: {} as never, schemaVersion: 1 } as never)).rejects.toThrow();
  await expect(api.updateAdvancedMapAnalyticsMap('map_1', { title: 'Map' } as never)).rejects.toThrow();
  await expect(api.createAdvancedMapAnalyticsSnapshot('map_1', { title: 'Map', config: {} as never } as never)).rejects.toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('reports the public API failure before the decoder failure', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    text: vi.fn().mockResolvedValue(JSON.stringify({ ok: false, error: 'NotFoundError' })),
  } satisfies Partial<Response>);
  const api = await import('./advanced-map-analytics-api');

  await expect(api.getPublicAdvancedMapAnalyticsMap('ama_96e8120e16724b90b25d42302c2c9603')).rejects.toThrow(
    'Public map not found. The provided ID looks like an internal map ID (ama_...). Use the map public ID from a published map URL.',
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
