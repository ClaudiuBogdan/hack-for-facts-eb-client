import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAdvancedMapAnalyticsBins } from '@/hooks/useAdvancedMapAnalyticsBins';
import {
  AdvancedMapAnalyticsBinSchema,
  createDefaultAdvancedMapAnalyticsBinsPreset,
  createDefaultAdvancedMapAnalyticsSeries,
  AdvancedMapAnalyticsUrlStateSchema,
} from '@/schemas/advanced-map-analytics';

describe('useAdvancedMapAnalyticsBins', () => {
  it('does not overwrite preset bins when regenerate has no finite active values', () => {
    const series = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const preset = createDefaultAdvancedMapAnalyticsBinsPreset('Preset 1');
    preset.config.bins = [AdvancedMapAnalyticsBinSchema.parse({
      min: 0,
      max: null,
      label: '>=0',
      color: '#ff0000',
    })];

    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      series: [series],
      activeSeriesId: series.id,
      binsPresets: [preset],
      activeBinPresetId: preset.id,
    });

    const updateState = vi.fn();

    const { result } = renderHook(() =>
      useAdvancedMapAnalyticsBins({
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
