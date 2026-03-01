import { describe, expect, it } from 'vitest';
import { AdvancedMapAnalyticsBinSchema, createDefaultAdvancedMapAnalyticsBinsPreset } from '@/schemas/advanced-map-analytics';
import type { AdvancedMapAnalyticsTableRow } from '@/components/maps/advanced-map-analytics/advanced-map-analytics-table-types';
import { deriveAdvancedMapAnalyticsTableBinsFilter } from '@/hooks/useAdvancedMapAnalyticsTableBinsFilter';

const baseRows: AdvancedMapAnalyticsTableRow[] = [
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

describe('deriveAdvancedMapAnalyticsTableBinsFilter', () => {
  it('returns all rows when no preset has selected filters', () => {
    const preset = createDefaultAdvancedMapAnalyticsBinsPreset('Preset 1');
    const firstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 10,
      label: '0-10',
      color: '#ff0000',
    });
    const secondBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 10,
      max: null,
      label: '>=10',
      color: '#00ff00',
    });
    preset.config.bins = [
      firstBin,
      secondBin,
    ];

    const result = deriveAdvancedMapAnalyticsTableBinsFilter({
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
    const preset = createDefaultAdvancedMapAnalyticsBinsPreset('Preset 1');
    const firstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 10,
      label: '0-10',
      color: '#ff0000',
    });
    const secondBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 10,
      max: null,
      label: '>=10',
      color: '#00ff00',
    });
    preset.config.bins = [
      firstBin,
      secondBin,
    ];

    const result = deriveAdvancedMapAnalyticsTableBinsFilter({
      rows: baseRows,
      binsPresets: [preset],
      activeValues: new Map([
        ['1001', 5],
        ['1002', 15],
        ['1003', 30],
      ]),
      tableBinFiltersByPresetId: {
        [preset.id]: [firstBin.id],
      },
    });

    expect(result.filteredRows.map((row) => row.sirutaCode)).toEqual(['1001']);
    expect(result.hasActiveBinFilters).toBe(true);
  });

  it('supports OR logic across multiple presets', () => {
    const firstPreset = createDefaultAdvancedMapAnalyticsBinsPreset('Preset 1');
    const firstPresetFirstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 10,
      label: '0-10',
      color: '#ff0000',
    });
    const firstPresetSecondBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 10,
      max: null,
      label: '>=10',
      color: '#00ff00',
    });
    firstPreset.config.bins = [
      firstPresetFirstBin,
      firstPresetSecondBin,
    ];

    const secondPreset = createDefaultAdvancedMapAnalyticsBinsPreset('Preset 2');
    const secondPresetFirstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 100,
      label: '0-100',
      color: '#111111',
    });
    const secondPresetSecondBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 100,
      max: null,
      label: '>=100',
      color: '#222222',
    });
    secondPreset.config.bins = [
      secondPresetFirstBin,
      secondPresetSecondBin,
    ];

    const result = deriveAdvancedMapAnalyticsTableBinsFilter({
      rows: baseRows,
      binsPresets: [firstPreset, secondPreset],
      activeValues: new Map([
        ['1001', 5],
        ['1002', 20],
        ['1003', 150],
      ]),
      tableBinFiltersByPresetId: {
        [firstPreset.id]: [firstPresetFirstBin.id],
        [secondPreset.id]: [secondPresetSecondBin.id],
      },
    });

    expect(result.filteredRows.map((row) => row.sirutaCode)).toEqual(['1001', '1003']);
  });

  it('treats missing classifications as NO_DATA', () => {
    const preset = createDefaultAdvancedMapAnalyticsBinsPreset('Preset 1');
    const firstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: null,
      label: '>=0',
      color: '#ff0000',
    });
    preset.config.bins = [firstBin];

    const result = deriveAdvancedMapAnalyticsTableBinsFilter({
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
    const invalidPreset = createDefaultAdvancedMapAnalyticsBinsPreset('Invalid preset');
    const invalidFirstBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: 10,
      label: '0-10',
      color: '#ff0000',
    });
    const invalidSecondBin = AdvancedMapAnalyticsBinSchema.parse({
      min: 9,
      max: null,
      label: '>=9',
      color: '#00ff00',
    });
    invalidPreset.config.bins = [
      invalidFirstBin,
      invalidSecondBin,
    ];

    const result = deriveAdvancedMapAnalyticsTableBinsFilter({
      rows: baseRows,
      binsPresets: [invalidPreset],
      activeValues: new Map([
        ['1001', 5],
        ['1002', 15],
      ]),
      tableBinFiltersByPresetId: {
        [invalidPreset.id]: [invalidFirstBin.id],
      },
    });

    expect(result.filteredRows).toHaveLength(baseRows.length);
    expect(result.binsFilterSections[0]?.disabledReason).toBe('Invalid bins config');
  });
});
