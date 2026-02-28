import { describe, expect, it } from 'vitest';
import { createDefaultExperimentalMapBinsPreset } from '@/schemas/experimental-map';
import {
  getNextBinsPresetLabel,
  reorderBinsPresetsByIds,
} from './experimental-map-bins-presets-utils';

describe('experimental-map-bins-presets-utils', () => {
  it('reorders presets by ids', () => {
    const first = createDefaultExperimentalMapBinsPreset('First');
    const second = createDefaultExperimentalMapBinsPreset('Second');
    const third = createDefaultExperimentalMapBinsPreset('Third');

    const reordered = reorderBinsPresetsByIds([first, second, third], first.id, third.id);

    expect(reordered.map((preset) => preset.id)).toEqual([second.id, third.id, first.id]);
  });

  it('builds next default preset label from list length', () => {
    const first = createDefaultExperimentalMapBinsPreset('First');
    const second = createDefaultExperimentalMapBinsPreset('Second');

    expect(getNextBinsPresetLabel([first, second])).toBe('Bins preset 3');
  });
});
