import { describe, expect, it } from 'vitest';
import {
  createDefaultExperimentalMapBinsPreset,
  createDefaultExperimentalMapSeries,
  ExperimentalMapUrlStateSchema,
} from '@/schemas/experimental-map';

describe('ExperimentalMapUrlStateSchema', () => {
  it('defaults to an empty state', () => {
    const parsed = ExperimentalMapUrlStateSchema.parse({});

    expect(parsed.series).toEqual([]);
    expect(parsed.activeSeriesId).toBeUndefined();
    expect(parsed.activeView).toBe('map');
    expect(parsed.mapName).toBe('Experimental UAT Map');
    expect(parsed.seriesPanelCollapsed).toBe(false);
    expect(parsed.configPanelCollapsed).toBe(false);
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

    const state = ExperimentalMapUrlStateSchema.parse({
      series: [baseSeries, calcSeries],
      activeSeriesId: calcSeries.id,
      activeView: 'table',
      mapName: 'Custom Experimental Map',
      seriesPanelCollapsed: true,
      configPanelCollapsed: true,
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
  });

  it('ignores legacy binsConfig key from old URLs', () => {
    const parsed = ExperimentalMapUrlStateSchema.parse({
      binsConfig: {
        enabled: true,
      },
    });

    expect(parsed.binsPresets).toEqual([]);
    expect(parsed.activeBinPresetId).toBeUndefined();
    expect(parsed.activeView).toBe('map');
  });

  it('defaults INS series unit to empty string', () => {
    const insSeries = createDefaultExperimentalMapSeries('ins-series');
    if (insSeries.type !== 'ins-series') {
      throw new Error('Expected ins-series default');
    }

    expect(insSeries.unit).toBe('');
  });
});
