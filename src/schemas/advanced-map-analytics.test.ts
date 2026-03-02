import { describe, expect, it, vi } from 'vitest';
import {
  ADVANCED_MAP_ANALYTICS_VERSION,
  AdvancedMapAnalyticsBinSchema,
  createUniqueAdvancedMapAnalyticsId,
  createDefaultAdvancedMapAnalyticsBinsPreset,
  createDefaultAdvancedMapAnalyticsWidgets,
  createDefaultAdvancedMapAnalyticsStatsValueFilterRule,
  createDefaultAdvancedMapAnalyticsValueFilterRule,
  createDefaultAdvancedMapAnalyticsSeries,
  AdvancedMapAnalyticsUrlStateSchema,
  GEOJSON_POPULATION_DATASET_KEYS,
} from '@/schemas/advanced-map-analytics';

describe('AdvancedMapAnalyticsUrlStateSchema', () => {
  it('defaults to an empty state', () => {
    const parsed = AdvancedMapAnalyticsUrlStateSchema.parse({});

    expect(parsed.version).toBe(ADVANCED_MAP_ANALYTICS_VERSION);
    expect(parsed.series).toEqual([]);
    expect(parsed.activeSeriesId).toBeUndefined();
    expect(parsed.valueFilters.rules).toEqual([]);
    expect(parsed.activeView).toBe('map');
    expect(parsed.analyticsWidgets).toEqual(createDefaultAdvancedMapAnalyticsWidgets());
    expect(parsed.mapName).toBe('Untitled map');
    expect(parsed.showCountyBoundaries).toBe(true);
    expect(parsed.seriesPanelCollapsed).toBe(false);
    expect(parsed.configPanelCollapsed).toBe(false);
    expect(parsed.valueFiltersPanelCollapsed).toBe(false);
    expect(parsed.binsPanelCollapsed).toBe(false);
    expect(parsed.binsPresets).toEqual([]);
    expect(parsed.activeBinPresetId).toBeUndefined();
    expect(parsed.tableBinFiltersByPresetId).toEqual({});
  });

  it('retries id generation when candidate id already exists', () => {
    const randomUuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('abc12300-0000-4000-8000-000000000000')
      .mockReturnValueOnce('def45600-0000-4000-8000-000000000000');

    const id = createUniqueAdvancedMapAnalyticsId(['abc123']);
    expect(id).toBe('def456');

    randomUuidSpy.mockRestore();
  });

  it('supports serialize/parse round-trip with multiple series and bins presets', () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const calcSeries = createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation');
    const firstPreset = createDefaultAdvancedMapAnalyticsBinsPreset('Preset 1');
    const firstPresetFirstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: null,
      label: '>= 0',
      color: '#fee08b',
      disabled: true,
    });
    firstPreset.config.bins = [
      firstPresetFirstBin,
    ];
    const secondPreset = createDefaultAdvancedMapAnalyticsBinsPreset('Preset 2');
    const secondPresetFirstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 1000,
      label: '0 - 1.000',
      color: '#fee08b',
    });
    const secondPresetSecondBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 1000,
      max: null,
      label: '>= 1.000',
      color: '#f46d43',
    });
    secondPreset.config.bins = [
      secondPresetFirstBin,
      secondPresetSecondBin,
    ];
    firstPreset.config.title = 'Revenue bands';
    secondPreset.config.showBinLabelOnLegend = false;
    secondPreset.config.defaultBinCount = 7;
    const firstValueRule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    firstValueRule.operator = 'lt';
    firstValueRule.value = 0;
    const secondValueRule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    secondValueRule.operator = 'between';
    secondValueRule.value = 1000;
    secondValueRule.secondValue = 2000;
    secondValueRule.joinWithPrevious = 'OR';
    secondValueRule.seriesRef = {
      mode: 'series',
      seriesId: baseSeries.id,
    };
    secondValueRule.enabled = false;
    const analyticsWidgets = createDefaultAdvancedMapAnalyticsWidgets().map((widget) => {
      if (widget.key === 'distribution') {
        return {
          ...widget,
          enabled: false,
          binCount: 20,
          seriesId: calcSeries.id,
          viewMode: 'table' as const,
        };
      }

      if (widget.key === 'outliers') {
        return {
          ...widget,
          iqrMultiplier: 2.2,
          limit: 5,
          seriesId: calcSeries.id,
          viewMode: 'chart' as const,
        };
      }

      if (widget.key === 'series_coverage') {
        return {
          ...widget,
          showCoveragePercent: false,
        };
      }

      return widget;
    });

    const state = AdvancedMapAnalyticsUrlStateSchema.parse({
      series: [baseSeries, calcSeries],
      activeSeriesId: calcSeries.id,
      valueFilters: {
        rules: [firstValueRule, secondValueRule],
      },
      activeView: 'table',
      analyticsWidgets,
      mapName: 'Custom map',
      showCountyBoundaries: false,
      seriesPanelCollapsed: true,
      configPanelCollapsed: true,
      valueFiltersPanelCollapsed: true,
      binsPanelCollapsed: true,
      binsPresets: [firstPreset, secondPreset],
      activeBinPresetId: secondPreset.id,
      tableBinFiltersByPresetId: {
        [firstPreset.id]: [firstPresetFirstBin.id, 'NO_DATA'],
        [secondPreset.id]: [secondPresetSecondBin.id],
      },
      mapCenter: [45.1, 24.8],
      mapZoom: 7.2,
    });

    const serialized = JSON.stringify(state);
    const roundTripped = AdvancedMapAnalyticsUrlStateSchema.parse(JSON.parse(serialized));

    expect(roundTripped).toEqual(state);
    expect(roundTripped.showCountyBoundaries).toBe(false);
    expect(roundTripped.binsPresets[0]?.config.title).toBe('Revenue bands');
    expect(roundTripped.valueFilters.rules[1]?.joinWithPrevious).toBe('OR');
    expect(roundTripped.analyticsWidgets).toEqual(analyticsWidgets);
  });

  it('normalizes analytics widgets by deduping keys and filling missing defaults', () => {
    const parsed = AdvancedMapAnalyticsUrlStateSchema.parse({
      analyticsWidgets: [
        { key: 'distribution', enabled: false, binCount: 17, seriesId: 'series-custom' },
        { key: 'series_coverage', enabled: true, showCoveragePercent: false },
        { key: 'distribution', enabled: true, binCount: 3 },
        { key: 'outliers', enabled: true, method: 'iqr', iqrMultiplier: 2, limit: 4 },
        { key: 'invalid_widget' },
      ],
    });

    expect(parsed.analyticsWidgets).toHaveLength(4);
    expect(parsed.analyticsWidgets.map((widget) => widget.key)).toEqual([
      'distribution',
      'series_coverage',
      'outliers',
      'series_totals',
    ]);
    expect(parsed.analyticsWidgets[0]).toMatchObject({
      key: 'distribution',
      enabled: false,
      binCount: 17,
      seriesId: 'series-custom',
    });
    expect(parsed.analyticsWidgets[1]).toMatchObject({
      key: 'series_coverage',
      showCoveragePercent: false,
    });
    expect(parsed.analyticsWidgets[2]).toMatchObject({
      key: 'outliers',
      method: 'iqr',
      iqrMultiplier: 2,
      limit: 4,
    });
    expect(parsed.analyticsWidgets[3]).toMatchObject({
      key: 'series_totals',
      enabled: true,
    });
  });

  it('supports threshold and stats rules round-trip', () => {
    const thresholdRule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    thresholdRule.operator = 'lt';
    thresholdRule.value = 0;

    const statsRule = createDefaultAdvancedMapAnalyticsStatsValueFilterRule('rank');
    statsRule.joinWithPrevious = 'OR';
    statsRule.direction = 'top';
    statsRule.count = 25;

    const parsed = AdvancedMapAnalyticsUrlStateSchema.parse({
      valueFilters: {
        rules: [thresholdRule, statsRule],
      },
    });

    const serialized = JSON.stringify(parsed);
    const roundTripped = AdvancedMapAnalyticsUrlStateSchema.parse(JSON.parse(serialized));

    expect(roundTripped.valueFilters.rules[0]?.kind).toBe('threshold');
    expect(roundTripped.valueFilters.rules[1]?.kind).toBe('stats');
    expect(roundTripped.valueFilters.rules[1]).toMatchObject({
      statsType: 'rank',
      direction: 'top',
      count: 25,
    });
  });

  it('rejects value filters rules without explicit kind', () => {
    const invalidRule = {
      ...createDefaultAdvancedMapAnalyticsValueFilterRule(),
      kind: undefined,
      operator: 'gt',
      value: 5,
    };

    expect(() =>
      AdvancedMapAnalyticsUrlStateSchema.parse({
        valueFilters: {
          rules: [invalidRule],
        },
      })
    ).toThrow();
  });

  it('rejects legacy value filter combinator shape', () => {
    expect(() =>
      AdvancedMapAnalyticsUrlStateSchema.parse({
        valueFilters: {
          combinator: 'OR',
          rules: [createDefaultAdvancedMapAnalyticsValueFilterRule()],
        },
      })
    ).toThrow();
  });

  it('defaults distribution viewMode to chart and outliers viewMode to table', () => {
    const widgets = createDefaultAdvancedMapAnalyticsWidgets();
    const distribution = widgets.find((widget) => widget.key === 'distribution');
    const outliers = widgets.find((widget) => widget.key === 'outliers');

    expect(distribution).toBeDefined();
    expect(outliers).toBeDefined();
    if (distribution?.key === 'distribution') {
      expect(distribution.viewMode).toBe('chart');
      expect(distribution.binMethod).toBe('log');
    }
    if (outliers?.key === 'outliers') {
      expect(outliers.viewMode).toBe('table');
    }
  });

  it('round-trips viewMode values through parse', () => {
    const widgets = createDefaultAdvancedMapAnalyticsWidgets().map((widget) => {
      if (widget.key === 'distribution') {
        return { ...widget, viewMode: 'table' as const };
      }
      if (widget.key === 'outliers') {
        return { ...widget, viewMode: 'chart' as const };
      }
      return widget;
    });

    const state = AdvancedMapAnalyticsUrlStateSchema.parse({ analyticsWidgets: widgets });
    const serialized = JSON.stringify(state);
    const roundTripped = AdvancedMapAnalyticsUrlStateSchema.parse(JSON.parse(serialized));

    const distribution = roundTripped.analyticsWidgets.find((widget) => widget.key === 'distribution');
    const outliers = roundTripped.analyticsWidgets.find((widget) => widget.key === 'outliers');

    if (distribution?.key === 'distribution') {
      expect(distribution.viewMode).toBe('table');
    }
    if (outliers?.key === 'outliers') {
      expect(outliers.viewMode).toBe('chart');
    }
  });

  it('rejects unsupported schema versions', () => {
    expect(() =>
      AdvancedMapAnalyticsUrlStateSchema.parse({
        version: ADVANCED_MAP_ANALYTICS_VERSION + 1,
      })
    ).toThrow();
  });

  it('rejects invalid threshold parameters', () => {
    const invalidRule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    invalidRule.operator = 'between';
    invalidRule.value = 1;
    invalidRule.secondValue = undefined;

    expect(() =>
      AdvancedMapAnalyticsUrlStateSchema.parse({
        valueFilters: {
          rules: [invalidRule],
        },
      })
    ).toThrow();
  });

  it('rejects invalid map viewport values', () => {
    expect(() =>
      AdvancedMapAnalyticsUrlStateSchema.parse({
        mapCenter: [120, 30],
      })
    ).toThrow();

    expect(() =>
      AdvancedMapAnalyticsUrlStateSchema.parse({
        mapZoom: 25,
      })
    ).toThrow();
  });

  it('defaults INS series unit to empty string', () => {
    const insSeries = createDefaultAdvancedMapAnalyticsSeries('ins-series');
    if (insSeries.type !== 'ins-series') {
      throw new Error('Expected ins-series default');
    }

    expect(insSeries.unit).toBe('');
  });

  it('supports geojson dataset series defaults', () => {
    const geojsonSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    if (geojsonSeries.type !== 'geojson-dataset-series') {
      throw new Error('Expected geojson-dataset-series default');
    }

    expect(geojsonSeries.datasetKey).toBe('insPop2021');
    expect(geojsonSeries.label).toBe('GeoJSON dataset');
    expect(geojsonSeries.unit).toBe('');
    expect(geojsonSeries.countyFilterIds).toEqual([]);
    expect(geojsonSeries.regionFilterIds).toEqual([]);
  });

  it('round-trips each geojson population dataset key', () => {
    const series = GEOJSON_POPULATION_DATASET_KEYS.map((datasetKey, index) => ({
      ...createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series'),
      id: `geojson-population-${index}`,
      datasetKey,
    }));

    const state = AdvancedMapAnalyticsUrlStateSchema.parse({
      series,
      activeView: 'table',
    });

    const serialized = JSON.stringify(state);
    const roundTripped = AdvancedMapAnalyticsUrlStateSchema.parse(JSON.parse(serialized));

    expect(roundTripped.series).toHaveLength(series.length);
    expect(roundTripped.series.every((entry) => entry.type === 'geojson-dataset-series')).toBe(true);
    expect(
      roundTripped.series
        .filter((entry) => entry.type === 'geojson-dataset-series')
        .map((entry) => entry.datasetKey)
        .sort((left, right) => left.localeCompare(right))
    ).toEqual([...GEOJSON_POPULATION_DATASET_KEYS].sort((left, right) => left.localeCompare(right)));
  });
});
