import { describe, expect, it } from 'vitest';
import { createDefaultExperimentalMapBinsPreset } from '@/schemas/experimental-map';
import type { ExperimentalMapTableRow } from '@/components/maps/experimental/experimental-map-table-types';
import { deriveExperimentalMapTableBinsFilter } from '@/hooks/useExperimentalMapTableBinsFilter';

const baseRows: ExperimentalMapTableRow[] = [
  {
    sirutaCode: '1001',
    uatName: 'UAT 1',
    countyName: 'County',
    valuesBySeriesId: {},
  },
  {
    sirutaCode: '1002',
    uatName: 'UAT 2',
    countyName: 'County',
    valuesBySeriesId: {},
  },
  {
    sirutaCode: '1003',
    uatName: 'UAT 3',
    countyName: 'County',
    valuesBySeriesId: {},
  },
  {
    sirutaCode: '1004',
    uatName: 'UAT 4',
    countyName: 'County',
    valuesBySeriesId: {},
  },
];

describe('deriveExperimentalMapTableBinsFilter', () => {
  it('returns all rows when no preset has selected filters', () => {
    const preset = createDefaultExperimentalMapBinsPreset('Preset 1');
    preset.config.bins = [
      { min: 0, max: 10, label: '0-10', color: '#ff0000' },
      { min: 10, max: null, label: '>=10', color: '#00ff00' },
    ];

    const result = deriveExperimentalMapTableBinsFilter({
      rows: baseRows,
      binsPresets: [preset],
      activeValues: new Map([
        ['1001', 5],
        ['1002', 15],
      ]),
      tableBinFiltersByPresetId: {},
    });

    expect(result.filteredRows).toHaveLength(baseRows.length);
    expect(result.hasActiveBinFilters).toBe(false);
  });

  it('filters rows by selected groups within one preset', () => {
    const preset = createDefaultExperimentalMapBinsPreset('Preset 1');
    preset.config.bins = [
      { min: 0, max: 10, label: '0-10', color: '#ff0000' },
      { min: 10, max: null, label: '>=10', color: '#00ff00' },
    ];

    const result = deriveExperimentalMapTableBinsFilter({
      rows: baseRows,
      binsPresets: [preset],
      activeValues: new Map([
        ['1001', 5],
        ['1002', 15],
        ['1003', 30],
      ]),
      tableBinFiltersByPresetId: {
        [preset.id]: ['G1'],
      },
    });

    expect(result.filteredRows.map((row) => row.sirutaCode)).toEqual(['1001']);
    expect(result.hasActiveBinFilters).toBe(true);
  });

  it('supports OR logic across multiple presets', () => {
    const firstPreset = createDefaultExperimentalMapBinsPreset('Preset 1');
    firstPreset.config.bins = [
      { min: 0, max: 10, label: '0-10', color: '#ff0000' },
      { min: 10, max: null, label: '>=10', color: '#00ff00' },
    ];

    const secondPreset = createDefaultExperimentalMapBinsPreset('Preset 2');
    secondPreset.config.bins = [
      { min: 0, max: 100, label: '0-100', color: '#111111' },
      { min: 100, max: null, label: '>=100', color: '#222222' },
    ];

    const result = deriveExperimentalMapTableBinsFilter({
      rows: baseRows,
      binsPresets: [firstPreset, secondPreset],
      activeValues: new Map([
        ['1001', 5],
        ['1002', 20],
        ['1003', 150],
      ]),
      tableBinFiltersByPresetId: {
        [firstPreset.id]: ['G1'],
        [secondPreset.id]: ['G2'],
      },
    });

    expect(result.filteredRows.map((row) => row.sirutaCode)).toEqual(['1001', '1003']);
  });

  it('treats missing classifications as NO_DATA', () => {
    const preset = createDefaultExperimentalMapBinsPreset('Preset 1');
    preset.config.bins = [{ min: 0, max: null, label: '>=0', color: '#ff0000' }];

    const result = deriveExperimentalMapTableBinsFilter({
      rows: baseRows,
      binsPresets: [preset],
      activeValues: new Map([
        ['1001', 5],
        ['1002', 15],
      ]),
      tableBinFiltersByPresetId: {
        [preset.id]: ['NO_DATA'],
      },
    });

    expect(result.filteredRows.map((row) => row.sirutaCode)).toEqual(['1003', '1004']);
  });

  it('disables invalid preset sections and ignores them in filtering', () => {
    const invalidPreset = createDefaultExperimentalMapBinsPreset('Invalid preset');
    invalidPreset.config.bins = [
      { min: 0, max: 10, label: '0-10', color: '#ff0000' },
      { min: 9, max: null, label: '>=9', color: '#00ff00' },
    ];

    const result = deriveExperimentalMapTableBinsFilter({
      rows: baseRows,
      binsPresets: [invalidPreset],
      activeValues: new Map([
        ['1001', 5],
        ['1002', 15],
      ]),
      tableBinFiltersByPresetId: {
        [invalidPreset.id]: ['G1'],
      },
    });

    expect(result.filteredRows).toHaveLength(baseRows.length);
    expect(result.binsFilterSections[0]?.disabledReason).toBe('Invalid bins config');
  });
});
