import { describe, expect, it } from 'vitest';
import {
  createDefaultExperimentalMapBinsPreset,
  createDefaultExperimentalMapStatsValueFilterRule,
  createDefaultExperimentalMapValueFilterRule,
  createDefaultExperimentalMapSeries,
  ExperimentalMapUrlStateSchema,
  GEOJSON_POPULATION_DATASET_KEYS,
} from '@/schemas/experimental-map';

describe('ExperimentalMapUrlStateSchema', () => {
  it('defaults to an empty state', () => {
    const parsed = ExperimentalMapUrlStateSchema.parse({});

    expect(parsed.series).toEqual([]);
    expect(parsed.activeSeriesId).toBeUndefined();
    expect(parsed.valueFilters.rules).toEqual([]);
    expect(parsed.activeView).toBe('map');
    expect(parsed.mapName).toBe('Experimental UAT Map');
    expect(parsed.seriesPanelCollapsed).toBe(false);
    expect(parsed.configPanelCollapsed).toBe(false);
    expect(parsed.valueFiltersPanelCollapsed).toBe(false);
    expect(parsed.binsPanelCollapsed).toBe(false);
    expect(parsed.binsPresets).toEqual([]);
    expect(parsed.activeBinPresetId).toBeUndefined();
    expect(parsed.tableBinFiltersByPresetId).toEqual({});
  });

  it('supports serialize/parse round-trip with multiple series and bins presets', () => {
    const baseSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    const calcSeries = createDefaultExperimentalMapSeries('aggregated-series-calculation');
    const firstPreset = createDefaultExperimentalMapBinsPreset('Preset 1');
    firstPreset.config.bins = [
      { min: 0, max: null, label: '>= 0', color: '#fee08b', disabled: true },
    ];
    const secondPreset = createDefaultExperimentalMapBinsPreset('Preset 2');
    secondPreset.config.bins = [
      { min: 0, max: 1000, label: '0 - 1.000', color: '#fee08b' },
      { min: 1000, max: null, label: '>= 1.000', color: '#f46d43' },
    ];
    firstPreset.config.title = 'Revenue bands';
    secondPreset.config.showBinLabelOnLegend = false;
    secondPreset.config.defaultBinCount = 7;
    const firstValueRule = createDefaultExperimentalMapValueFilterRule();
    firstValueRule.operator = 'lt';
    firstValueRule.value = 0;
    const secondValueRule = createDefaultExperimentalMapValueFilterRule();
    secondValueRule.operator = 'between';
    secondValueRule.value = 1000;
    secondValueRule.secondValue = 2000;
    secondValueRule.joinWithPrevious = 'OR';
    secondValueRule.seriesRef = {
      mode: 'series',
      seriesId: baseSeries.id,
    };
    secondValueRule.enabled = false;

    const state = ExperimentalMapUrlStateSchema.parse({
      series: [baseSeries, calcSeries],
      activeSeriesId: calcSeries.id,
      valueFilters: {
        rules: [firstValueRule, secondValueRule],
      },
      activeView: 'table',
      mapName: 'Custom Experimental Map',
      seriesPanelCollapsed: true,
      configPanelCollapsed: true,
      valueFiltersPanelCollapsed: true,
      binsPanelCollapsed: true,
      binsPresets: [firstPreset, secondPreset],
      activeBinPresetId: secondPreset.id,
      tableBinFiltersByPresetId: {
        [firstPreset.id]: ['G1', 'NO_DATA'],
        [secondPreset.id]: ['G2'],
      },
      mapCenter: [45.1, 24.8],
      mapZoom: 7.2,
    });

    const serialized = JSON.stringify(state);
    const roundTripped = ExperimentalMapUrlStateSchema.parse(JSON.parse(serialized));

    expect(roundTripped).toEqual(state);
    expect(roundTripped.binsPresets[0]?.config.title).toBe('Revenue bands');
    expect(roundTripped.valueFilters.rules[1]?.joinWithPrevious).toBe('OR');
  });

  it('supports threshold and stats rules round-trip', () => {
    const thresholdRule = createDefaultExperimentalMapValueFilterRule();
    thresholdRule.operator = 'lt';
    thresholdRule.value = 0;

    const statsRule = createDefaultExperimentalMapStatsValueFilterRule('rank');
    statsRule.joinWithPrevious = 'OR';
    statsRule.direction = 'top';
    statsRule.count = 25;

    const parsed = ExperimentalMapUrlStateSchema.parse({
      valueFilters: {
        rules: [thresholdRule, statsRule],
      },
    });

    const serialized = JSON.stringify(parsed);
    const roundTripped = ExperimentalMapUrlStateSchema.parse(JSON.parse(serialized));

    expect(roundTripped.valueFilters.rules[0]?.kind).toBe('threshold');
    expect(roundTripped.valueFilters.rules[1]?.kind).toBe('stats');
    expect(roundTripped.valueFilters.rules[1]).toMatchObject({
      statsType: 'rank',
      direction: 'top',
      count: 25,
    });
  });

  it('migrates legacy global combinator into per-rule joins', () => {
    const firstRule = createDefaultExperimentalMapValueFilterRule();
    const secondRule = createDefaultExperimentalMapValueFilterRule();
    const thirdRule = createDefaultExperimentalMapValueFilterRule();

    const parsed = ExperimentalMapUrlStateSchema.parse({
      valueFilters: {
        combinator: 'OR',
        rules: [
          {
            ...firstRule,
            joinWithPrevious: undefined,
          },
          {
            ...secondRule,
            joinWithPrevious: undefined,
          },
          {
            ...thirdRule,
            joinWithPrevious: undefined,
          },
        ],
      },
    });

    expect(parsed.valueFilters.rules[0]?.joinWithPrevious).toBe('AND');
    expect(parsed.valueFilters.rules[1]?.joinWithPrevious).toBe('OR');
    expect(parsed.valueFilters.rules[2]?.joinWithPrevious).toBe('OR');
  });

  it('migrates legacy rules without kind to threshold kind', () => {
    const legacyRule = {
      ...createDefaultExperimentalMapValueFilterRule(),
      kind: undefined,
      operator: 'gt',
      value: 5,
    };

    const parsed = ExperimentalMapUrlStateSchema.parse({
      valueFilters: {
        rules: [legacyRule],
      },
    });

    expect(parsed.valueFilters.rules[0]?.kind).toBe('threshold');
    if (parsed.valueFilters.rules[0]?.kind !== 'threshold') {
      throw new Error('Expected threshold rule after migration');
    }

    expect(parsed.valueFilters.rules[0].operator).toBe('gt');
    expect(parsed.valueFilters.rules[0].value).toBe(5);
  });

  it('defaults INS series unit to empty string', () => {
    const insSeries = createDefaultExperimentalMapSeries('ins-series');
    if (insSeries.type !== 'ins-series') {
      throw new Error('Expected ins-series default');
    }

    expect(insSeries.unit).toBe('');
  });

  it('supports geojson dataset series defaults', () => {
    const geojsonSeries = createDefaultExperimentalMapSeries('geojson-dataset-series');
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
      ...createDefaultExperimentalMapSeries('geojson-dataset-series'),
      id: `geojson-population-${index}`,
      datasetKey,
    }));

    const state = ExperimentalMapUrlStateSchema.parse({
      series,
      activeView: 'table',
    });

    const serialized = JSON.stringify(state);
    const roundTripped = ExperimentalMapUrlStateSchema.parse(JSON.parse(serialized));

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
