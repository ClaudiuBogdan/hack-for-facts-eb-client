import { describe, expect, it } from 'vitest';
import { createDefaultAdvancedMapAnalyticsSeries, AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { CustomSeriesConfigurationSchema } from '@/schemas/charts';
import {
  applySetActiveSeries,
  applyToggleSeriesEnabled,
  convertSeriesToType,
  duplicateSeriesAfterSource,
  normalizePastedMapSeries,
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

  it('promotes the first enabled series when disabling the active series', () => {
    const base = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const fallback = createDefaultAdvancedMapAnalyticsSeries('commitments-analytics');

    const initialState = AdvancedMapAnalyticsUrlStateSchema.parse({
      series: [base, fallback],
      activeSeriesId: base.id,
    });

    const nextState = applyToggleSeriesEnabled(initialState, base.id, false);

    expect(nextState.activeSeriesId).toBe(fallback.id);
    expect(nextState.series[0]?.enabled).toBe(false);
  });

  it('enables first series when disabling active series leaves no enabled series', () => {
    const firstSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const secondSeries = createDefaultAdvancedMapAnalyticsSeries('commitments-analytics');
    secondSeries.enabled = false;

    const initialState = AdvancedMapAnalyticsUrlStateSchema.parse({
      series: [firstSeries, secondSeries],
      activeSeriesId: firstSeries.id,
    });

    const nextState = applyToggleSeriesEnabled(initialState, firstSeries.id, false);

    expect(nextState.activeSeriesId).toBe(firstSeries.id);
    expect(nextState.series[0]?.enabled).toBe(true);
    expect(nextState.series[1]?.enabled).toBe(false);
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

  it('duplicates a series directly after source with a fresh id', () => {
    const first = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const second = createDefaultAdvancedMapAnalyticsSeries('commitments-analytics');

    const duplicateResult = duplicateSeriesAfterSource([first, second], first.id);

    expect(duplicateResult.series).toHaveLength(3);
    expect(duplicateResult.series[0]?.id).toBe(first.id);
    expect(duplicateResult.series[1]?.id).not.toBe(first.id);
    expect(duplicateResult.series[1]?.label).toContain('(copy)');
    expect(duplicateResult.series[2]?.id).toBe(second.id);
    expect(duplicateResult.duplicatedSeries?.id).toBe(duplicateResult.series[1]?.id);
  });

  it('uses preferred duplicate id when available', () => {
    const sourceSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const preferredDuplicateId = 'preferred';

    const duplicateResult = duplicateSeriesAfterSource(
      [sourceSeries],
      sourceSeries.id,
      preferredDuplicateId
    );

    expect(duplicateResult.series).toHaveLength(2);
    expect(duplicateResult.series[1]?.id).toBe(preferredDuplicateId);
    expect(duplicateResult.duplicatedSeries?.id).toBe(preferredDuplicateId);
  });

  it('falls back to a generated id when preferred duplicate id is occupied', () => {
    const sourceSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    const duplicateResult = duplicateSeriesAfterSource(
      [sourceSeries],
      sourceSeries.id,
      sourceSeries.id
    );

    expect(duplicateResult.series).toHaveLength(2);
    expect(duplicateResult.series[1]?.id).not.toBe(sourceSeries.id);
    expect(duplicateResult.duplicatedSeries?.id).toBe(duplicateResult.series[1]?.id);
  });

  it('remaps pasted series ids and rewrites internal calculation references', () => {
    const existingSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    existingSeries.id = 'existing';

    const dependencySeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    dependencySeries.id = 'dep-1';
    dependencySeries.label = 'Dependency';

    const calculationSeries = createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation');
    if (calculationSeries.type !== 'aggregated-series-calculation') {
      throw new Error('Expected calculation series');
    }
    calculationSeries.id = 'calc-1';
    calculationSeries.label = 'Calculation';
    calculationSeries.calculation = {
      op: 'sum',
      args: ['dep-1', 'existing'],
    };

    const clipboardText = JSON.stringify({
      type: 'advanced-map-series-copy',
      payload: [calculationSeries, dependencySeries],
    });

    const normalizedPasteResult = normalizePastedMapSeries(clipboardText, [existingSeries]);
    expect(normalizedPasteResult).not.toBeNull();
    expect(normalizedPasteResult?.seriesToInsert).toHaveLength(2);

    const pastedSeriesByLabel = new Map(
      normalizedPasteResult?.seriesToInsert.map((series) => [series.label, series]) ?? []
    );
    const pastedDependencySeries = pastedSeriesByLabel.get('Dependency');
    const pastedCalculationSeries = pastedSeriesByLabel.get('Calculation');
    if (!pastedDependencySeries || !pastedCalculationSeries) {
      throw new Error('Expected pasted dependency and calculation series');
    }

    expect(pastedDependencySeries.id).not.toBe('dep-1');
    expect(pastedCalculationSeries.id).not.toBe('calc-1');
    expect(pastedCalculationSeries.type).toBe('aggregated-series-calculation');
    if (pastedCalculationSeries.type !== 'aggregated-series-calculation') {
      throw new Error('Expected pasted calculation series');
    }

    expect(pastedCalculationSeries.calculation.args).toContain(pastedDependencySeries.id);
    expect(pastedCalculationSeries.calculation.args).toContain('existing');
    expect(pastedCalculationSeries.calculation.args).not.toContain('dep-1');
  });

  it('accepts chart clipboard payload and skips unsupported series types', () => {
    const compatibleSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const unsupportedSeries = CustomSeriesConfigurationSchema.parse({
      type: 'custom-series',
      id: 'custom-series',
      label: 'Unsupported custom series',
    });

    const chartClipboardText = JSON.stringify({
      type: 'chart-series-copy',
      payload: [compatibleSeries, unsupportedSeries],
    });

    const normalizedPasteResult = normalizePastedMapSeries(chartClipboardText, []);
    expect(normalizedPasteResult).not.toBeNull();
    expect(normalizedPasteResult?.sourceType).toBe('chart-series-copy');
    expect(normalizedPasteResult?.seriesToInsert).toHaveLength(1);
    expect(normalizedPasteResult?.seriesToInsert[0]?.type).toBe('line-items-aggregated-yearly');
    expect(normalizedPasteResult?.skippedUnsupportedCount).toBe(1);
  });

  it('skips chart calculation series when dependencies are removed as incompatible', () => {
    const dependencySeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    dependencySeries.id = 'dep-1';

    const calculationSeries = createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation');
    if (calculationSeries.type !== 'aggregated-series-calculation') {
      throw new Error('Expected calculation series');
    }
    calculationSeries.id = 'calc-1';
    calculationSeries.calculation = {
      op: 'sum',
      args: ['dep-1', 'unsupported-dependency'],
    };

    const unsupportedSeries = CustomSeriesConfigurationSchema.parse({
      type: 'custom-series',
      id: 'unsupported-dependency',
      label: 'Unsupported custom series',
    });

    const chartClipboardText = JSON.stringify({
      type: 'chart-series-copy',
      payload: [dependencySeries, calculationSeries, unsupportedSeries],
    });

    const normalizedPasteResult = normalizePastedMapSeries(chartClipboardText, []);
    expect(normalizedPasteResult).not.toBeNull();
    expect(normalizedPasteResult?.sourceType).toBe('chart-series-copy');
    expect(normalizedPasteResult?.seriesToInsert).toHaveLength(1);
    expect(normalizedPasteResult?.seriesToInsert[0]?.id).not.toBe('dep-1');
    expect(normalizedPasteResult?.seriesToInsert[0]?.type).toBe('line-items-aggregated-yearly');
    expect(normalizedPasteResult?.skippedUnsupportedCount).toBe(2);
  });
});
