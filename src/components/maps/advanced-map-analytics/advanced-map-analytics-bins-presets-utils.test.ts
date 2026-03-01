import { describe, expect, it } from 'vitest';
import { createDefaultAdvancedMapAnalyticsBinsPreset } from '@/schemas/advanced-map-analytics';
import {
  getNextBinsPresetLabel,
  reorderBinsPresetsByIds,
} from './advanced-map-analytics-bins-presets-utils';

describe('advanced-map-analytics-bins-presets-utils', () => {
  it('reorders presets by ids', () => {
    const first = createDefaultAdvancedMapAnalyticsBinsPreset('First');
    const second = createDefaultAdvancedMapAnalyticsBinsPreset('Second');
    const third = createDefaultAdvancedMapAnalyticsBinsPreset('Third');

    const reordered = reorderBinsPresetsByIds([first, second, third], first.id, third.id);

    expect(reordered.map((preset) => preset.id)).toEqual([second.id, third.id, first.id]);
  });

  it('builds next default preset label from list length', () => {
    const first = createDefaultAdvancedMapAnalyticsBinsPreset('First');
    const second = createDefaultAdvancedMapAnalyticsBinsPreset('Second');

    expect(getNextBinsPresetLabel([first, second])).toBe('Bins preset 3');
  });
});
