import { describe, expect, it } from 'vitest';
import { createDefaultExperimentalMapSeries, ExperimentalMapUrlStateSchema } from '@/schemas/experimental-map';
import {
  applySetActiveSeries,
  applyToggleSeriesEnabled,
  reorderSeriesByIds,
} from './experimental-map-series-utils';

describe('experimental-map-series-utils', () => {
  it('reorders series deterministically by drag ids', () => {
    const first = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    const second = createDefaultExperimentalMapSeries('commitments-analytics');
    const third = createDefaultExperimentalMapSeries('ins-series');

    const reordered = reorderSeriesByIds([first, second, third], first.id, third.id);

    expect(reordered.map((series) => series.id)).toEqual([second.id, third.id, first.id]);
  });

  it('sets active series and enables it if disabled', () => {
    const base = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    base.enabled = false;

    const initialState = ExperimentalMapUrlStateSchema.parse({
      series: [base],
      activeSeriesId: undefined,
    });

    const nextState = applySetActiveSeries(initialState, base.id);

    expect(nextState.activeSeriesId).toBe(base.id);
    expect(nextState.series[0]?.enabled).toBe(true);
  });

  it('clears activeSeriesId when disabling active series', () => {
    const base = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');

    const initialState = ExperimentalMapUrlStateSchema.parse({
      series: [base],
      activeSeriesId: base.id,
    });

    const nextState = applyToggleSeriesEnabled(initialState, base.id, false);

    expect(nextState.activeSeriesId).toBeUndefined();
    expect(nextState.series[0]?.enabled).toBe(false);
  });
});
