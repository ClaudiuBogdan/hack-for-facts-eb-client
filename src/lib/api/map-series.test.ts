import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultExperimentalMapSeries } from '@/schemas/experimental-map';
import { parseGroupedSeriesWideCsv } from '@/lib/map-series/csv';

const originalFetch = global.fetch;

beforeEach(() => {
  vi.resetModules();
  vi.unmock('@/lib/map-series/ins-scalar');
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

  it('builds INS rows using INS scalar semantics', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'FeatureCollection',
        features: [
          { properties: { natcode: '1001' } },
          { properties: { natcode: '1002' } },
          { properties: { natcode: '1003' } },
        ],
      }),
    } as Response);

    const series = createDefaultExperimentalMapSeries('ins-series');
    if (series.type !== 'ins-series') {
      throw new Error('Unexpected non-INS series in test setup');
    }
    series.datasetCode = 'POP107D';
    series.aggregation = 'sum';
    series.period = {
      type: 'YEAR',
      selection: {
        dates: ['2022', '2023'],
      },
    };
    series.classificationSelections = {
      SEXE: ['TOTAL'],
    };

    const { fetchGroupedSeriesData } = await importApi();
    const response = await fetchGroupedSeriesData({
      granularity: 'UAT',
      series: [series],
    });

    const parsed = parseGroupedSeriesWideCsv(response.payload.data);
    const vector = parsed.valuesBySeriesId.get(series.id);

    expect(vector).toBeDefined();
    expect((vector?.size ?? 0) > 0).toBe(true);
    expect(response.manifest.series[0]?.unit).toBeTruthy();
    expect(
      response.warnings?.some(
        (warning) => warning.type === 'ins_partial_mock_coverage' || warning.type === 'ins_mixed_units'
      )
    ).toBe(true);
  });

  it('computes INS partial coverage using filtered SIRUTA scope', async () => {
    vi.doMock('@/lib/map-series/ins-scalar', () => ({
      evaluateInsSeriesToMapVector: () => ({
        valuesBySiruta: new Map([['1001', 25]]),
        unit: 'pers.',
        warnings: [],
      }),
    }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'FeatureCollection',
        features: [
          { properties: { natcode: '1001' } },
          { properties: { natcode: '1002' } },
          { properties: { natcode: '1003' } },
        ],
      }),
    } as Response);

    const series = createDefaultExperimentalMapSeries('ins-series');
    if (series.type !== 'ins-series') {
      throw new Error('Unexpected non-INS series in test setup');
    }
    series.datasetCode = 'POP107D';
    series.sirutaCodes = ['1001', '1002'];

    const { fetchMockInsSeriesVectors } = await importApi();
    const response = await fetchMockInsSeriesVectors([series]);

    const coverageWarning = response.warnings.find(
      (warning) => warning.type === 'ins_partial_mock_coverage'
    );
    expect(coverageWarning).toBeDefined();
    expect(coverageWarning?.details).toEqual(
      expect.objectContaining({
        definedCount: 1,
        totalCount: 2,
        coverage: 0.5,
      })
    );
  });
});
