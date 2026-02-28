import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultExperimentalMapSeries } from '@/schemas/experimental-map';
import { parseGroupedSeriesWideCsv } from '@/lib/map-series/csv';

const originalFetch = global.fetch;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('fetchGroupedSeriesData', () => {
  async function importApi() {
    return import('@/lib/api/map-series');
  }

  it('returns wide-matrix grouped data keyed by siruta_code', async () => {
    const geoJsonPayload = {
      type: 'FeatureCollection',
      features: [
        { properties: { natcode: '1001' } },
        { properties: { natcode: '1002' } },
        { properties: { natcode: '1003' } },
        { properties: { natcode: '1004' } },
        { properties: { natcode: '1005' } },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => geoJsonPayload,
    } as Response);

    const series = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    if (series.type === 'aggregated-series-calculation') {
      throw new Error('Unexpected calculation series in test setup');
    }

    const { fetchGroupedSeriesData } = await importApi();
    const response = await fetchGroupedSeriesData({
      granularity: 'UAT',
      series: [series],
    });

    expect(response.manifest.granularity).toBe('UAT');
    expect(response.manifest.format).toBe('wide_matrix_v1');
    expect(response.manifest.series).toHaveLength(1);
    expect(response.manifest.series[0]?.series_id).toBe(series.id);
    expect(response.payload.mime).toBe('text/csv');

    const parsed = parseGroupedSeriesWideCsv(response.payload.data);
    expect(parsed.seriesIds).toEqual([series.id]);

    const seriesVector = parsed.valuesBySeriesId.get(series.id);
    expect(seriesVector).toBeDefined();
    expect(seriesVector !== undefined && seriesVector.size > 0).toBe(true);

    const sirutaCodes = Array.from(seriesVector?.keys() ?? []);
    expect(sirutaCodes.every((sirutaCode) => /^100[1-5]$/.test(sirutaCode))).toBe(true);
  });

  it('retries loading SIRUTA codes after transient fetch failures', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'FeatureCollection',
          features: [{ properties: { natcode: '1001' } }],
        }),
      } as Response);

    const series = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    if (series.type === 'aggregated-series-calculation') {
      throw new Error('Unexpected calculation series in test setup');
    }

    const { fetchGroupedSeriesData } = await importApi();

    await expect(
      fetchGroupedSeriesData({
        granularity: 'UAT',
        series: [series],
      })
    ).rejects.toThrow('Failed to load UAT geometry for mock map-series adapter');

    const response = await fetchGroupedSeriesData({
      granularity: 'UAT',
      series: [series],
    });

    expect(response.manifest.granularity).toBe('UAT');
    expect(response.manifest.series[0]?.series_id).toBe(series.id);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
