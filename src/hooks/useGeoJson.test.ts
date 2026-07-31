import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('resolves public asset URLs per map view type', async () => {
    const { resolveGeoJsonAssetUrl } = await import('./useGeoJson');

    expect(resolveGeoJsonAssetUrl('UAT')).toBe('/geojson/uat-2026-03-09.json');
    expect(resolveGeoJsonAssetUrl('County')).toBe('/geojson/judete-2026-03-09.json');
    expect(resolveGeoJsonAssetUrl('Region')).toBe('/geojson/region-2026-07-25.json');
  });

  it('includes the resolved asset URL in the query key', async () => {
    const { geoJsonQueryOptions } = await import('./useGeoJson');

    expect(geoJsonQueryOptions('UAT').queryKey).toEqual([
      'geoJsonData',
      'UAT',
      '/geojson/uat-2026-03-09.json',
    ]);
    expect(geoJsonQueryOptions('County').queryKey).toEqual([
      'geoJsonData',
      'County',
      '/geojson/judete-2026-03-09.json',
    ]);
    expect(geoJsonQueryOptions('Region').queryKey).toEqual([
      'geoJsonData',
      'Region',
      '/geojson/region-2026-07-25.json',
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
    const data = await fetchGeoJsonData('/geojson/uat-2026-03-09.json');

    expect(data).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
    expect(fetchMock).toHaveBeenCalledWith('/geojson/uat-2026-03-09.json');
    expect(fetchMock.mock.calls[0]?.[1]).toBeUndefined();
  });
});
