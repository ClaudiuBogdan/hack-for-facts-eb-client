import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/assets/geojson/uat.json?url', () => ({
  default: '/assets/uat.hash.json',
}));

vi.mock('@/assets/geojson/judete.json?url', () => ({
  default: '/assets/judete.hash.json',
}));

describe('useGeoJson query helpers', () => {
  const originalFetch = global.fetch;
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('resolves hashed asset URLs per map view type', async () => {
    const { resolveGeoJsonAssetUrl } = await import('./useGeoJson');

    expect(resolveGeoJsonAssetUrl('UAT')).toBe('/assets/uat.hash.json');
    expect(resolveGeoJsonAssetUrl('County')).toBe('/assets/judete.hash.json');
  });

  it('includes the resolved asset URL in the query key', async () => {
    const { geoJsonQueryOptions } = await import('./useGeoJson');

    expect(geoJsonQueryOptions('UAT').queryKey).toEqual([
      'geoJsonData',
      'UAT',
      '/assets/uat.hash.json',
    ]);
    expect(geoJsonQueryOptions('County').queryKey).toEqual([
      'geoJsonData',
      'County',
      '/assets/judete.hash.json',
    ]);
  });

  it('fetches GeoJSON without force-cache or request cache-control overrides', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'FeatureCollection',
        features: [],
      }),
    });

    const { fetchGeoJsonData } = await import('./useGeoJson');
    const data = await fetchGeoJsonData('/assets/uat.hash.json');

    expect(data).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
    expect(fetchMock).toHaveBeenCalledWith('/assets/uat.hash.json');
    expect(fetchMock.mock.calls[0]?.[1]).toBeUndefined();
  });
});
