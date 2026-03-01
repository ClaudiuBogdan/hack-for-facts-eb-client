import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useExperimentalMapBins } from '@/hooks/useExperimentalMapBins';
import {
  ExperimentalMapBinSchema,
  createDefaultExperimentalMapBinsPreset,
  createDefaultExperimentalMapSeries,
  ExperimentalMapUrlStateSchema,
} from '@/schemas/experimental-map';

describe('useExperimentalMapBins', () => {
  it('does not overwrite preset bins when regenerate has no finite active values', () => {
    const series = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    const preset = createDefaultExperimentalMapBinsPreset('Preset 1');
    preset.config.bins = [ExperimentalMapBinSchema.parse({
      min: 0,
      max: null,
      label: '>=0',
      color: '#ff0000',
    })];

    const mapState = ExperimentalMapUrlStateSchema.parse({
      series: [series],
      activeSeriesId: series.id,
      binsPresets: [preset],
      activeBinPresetId: preset.id,
    });

    const updateState = vi.fn();

    const { result } = renderHook(() =>
      useExperimentalMapBins({
        mapState,
        updateState,
        activeSeries: series,
        activeSeriesId: series.id,
        activeValues: undefined,
        seriesWarnings: [],
      })
    );

    let didRegenerate = true;
    act(() => {
      didRegenerate = result.current.regenerateBinsPreset(preset.id);
    });

    expect(didRegenerate).toBe(false);
    expect(updateState).not.toHaveBeenCalled();
  });
});
