import { describe, expect, it } from 'vitest';
import { createDefaultAdvancedMapAnalyticsSeries, AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import {
  applySetActiveSeries,
  applyToggleSeriesEnabled,
  convertSeriesToType,
  reorderSeriesByIds,
} from './advanced-map-analytics-series-utils';

describe('advanced-map-analytics-series-utils', () => {
  it('reorders series deterministically by drag ids', () => {
    const first = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const second = createDefaultAdvancedMapAnalyticsSeries('commitments-analytics');
    const third = createDefaultAdvancedMapAnalyticsSeries('ins-series');

    const reordered = reorderSeriesByIds([first, second, third], first.id, third.id);

    expect(reordered.map((series) => series.id)).toEqual([second.id, third.id, first.id]);
  });

  it('sets active series and enables it if disabled', () => {
    const base = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    base.enabled = false;

    const initialState = AdvancedMapAnalyticsUrlStateSchema.parse({
      series: [base],
      activeSeriesId: undefined,
    });

    const nextState = applySetActiveSeries(initialState, base.id);

    expect(nextState.activeSeriesId).toBe(base.id);
    expect(nextState.series[0]?.enabled).toBe(true);
  });

  it('clears activeSeriesId when disabling active series', () => {
    const base = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    const initialState = AdvancedMapAnalyticsUrlStateSchema.parse({
      series: [base],
      activeSeriesId: base.id,
    });

    const nextState = applyToggleSeriesEnabled(initialState, base.id, false);

    expect(nextState.activeSeriesId).toBeUndefined();
    expect(nextState.series[0]?.enabled).toBe(false);
  });

  it('does not preserve geojson default units when changing series type', () => {
    const geojsonSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    if (geojsonSeries.type !== 'geojson-dataset-series') {
      throw new Error('Expected geojson series');
    }

    geojsonSeries.unit = 'inhabitants';
    const converted = convertSeriesToType(geojsonSeries, 'line-items-aggregated-yearly');

    expect((converted.unit ?? '').trim()).toBe('');
  });
});
