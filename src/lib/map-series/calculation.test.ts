import { describe, expect, it } from 'vitest';
import { calculateMapSeriesValues } from '@/lib/map-series/calculation';
import { createDefaultAdvancedMapAnalyticsSeries } from '@/schemas/advanced-map-analytics';
import type { MapSupportedSeries } from '@/schemas/advanced-map-analytics';
import type { MapSeriesVectorCache } from '@/lib/map-series/interfaces';

function withCalculation(
  series: MapSupportedSeries,
  calculation: { op: 'sum' | 'subtract' | 'multiply' | 'divide'; args: any[] }
): MapSupportedSeries {
  if (series.type !== 'aggregated-series-calculation') {
    throw new Error('Expected aggregated-series-calculation series');
  }

  return {
    ...series,
    calculation,
  };
}

describe('calculateMapSeriesValues', () => {
  it('propagates undefined values in arithmetic merges', () => {
    const baseSeriesA = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const baseSeriesB = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const calcSeries = withCalculation(
      createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation'),
      {
        op: 'subtract',
        args: [baseSeriesA.id, baseSeriesB.id],
      }
    );

    const baseValuesBySeriesId: MapSeriesVectorCache = new Map([
      [
        baseSeriesA.id,
        new Map([
          ['1001', 10],
          ['1002', undefined],
        ]),
      ],
      [
        baseSeriesB.id,
        new Map([
          ['1001', 2],
          ['1002', 1],
        ]),
      ],
    ]);

    const result = calculateMapSeriesValues({
      series: [baseSeriesA, baseSeriesB, calcSeries],
      baseValuesBySeriesId,
    });

    expect(result.valuesBySeriesId.get(calcSeries.id)?.get('1001')).toBe(8);
    expect(result.valuesBySeriesId.get(calcSeries.id)?.get('1002')).toBeUndefined();
    expect(
      result.warnings.some(
        (warning) => warning.type === 'undefined_merge_result' && warning.seriesId === calcSeries.id
      )
    ).toBe(true);
  });

  it('marks divide-by-zero values as undefined and emits warnings', () => {
    const baseSeriesA = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const baseSeriesB = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const calcSeries = withCalculation(
      createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation'),
      {
        op: 'divide',
        args: [baseSeriesA.id, baseSeriesB.id],
      }
    );

    const baseValuesBySeriesId: MapSeriesVectorCache = new Map([
      [baseSeriesA.id, new Map([['1001', 12]])],
      [baseSeriesB.id, new Map([['1001', 0]])],
    ]);

    const result = calculateMapSeriesValues({
      series: [baseSeriesA, baseSeriesB, calcSeries],
      baseValuesBySeriesId,
    });

    expect(result.valuesBySeriesId.get(calcSeries.id)?.get('1001')).toBeUndefined();
    expect(
      result.warnings.some(
        (warning) => warning.type === 'divide_by_zero' && warning.seriesId === calcSeries.id
      )
    ).toBe(true);
  });

  it('warns when calculation dependencies are missing', () => {
    const calcSeries = withCalculation(
      createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation'),
      {
        op: 'sum',
        args: ['missing-series'],
      }
    );

    const result = calculateMapSeriesValues({
      series: [calcSeries],
      baseValuesBySeriesId: new Map(),
    });

    expect(
      result.warnings.some(
        (warning) => warning.type === 'missing_dependency' && warning.dependencySeriesId === 'missing-series'
      )
    ).toBe(true);
  });

  it('supports nested calculations', () => {
    const baseSeriesA = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const baseSeriesB = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const calcSeries = withCalculation(
      createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation'),
      {
        op: 'divide',
        args: [
          {
            op: 'sum',
            args: [baseSeriesA.id, baseSeriesB.id],
          },
          2,
        ],
      }
    );

    const baseValuesBySeriesId: MapSeriesVectorCache = new Map([
      [baseSeriesA.id, new Map([['1001', 8]])],
      [baseSeriesB.id, new Map([['1001', 4]])],
    ]);

    const result = calculateMapSeriesValues({
      series: [baseSeriesA, baseSeriesB, calcSeries],
      baseValuesBySeriesId,
    });

    expect(result.valuesBySeriesId.get(calcSeries.id)?.get('1001')).toBe(6);
  });
});
