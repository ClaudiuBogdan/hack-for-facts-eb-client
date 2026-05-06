import { describe, expect, it } from 'vitest';
import { calculateMapSeriesValues } from '@/lib/map-series/calculation';
import {
  MapGroupedValueSeriesConfigurationSchema,
  createDefaultAdvancedMapAnalyticsSeries,
} from '@/schemas/advanced-map-analytics';
import type { MapGroupWorkspace, MapSupportedSeries } from '@/schemas/advanced-map-analytics';
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
  it('defaults grouped value series aggregation to sum', () => {
    const groupedSeries = createDefaultAdvancedMapAnalyticsSeries('map-grouped-value-series');
    if (groupedSeries.type !== 'map-grouped-value-series') {
      throw new Error('Expected grouped value series');
    }

    expect(groupedSeries.aggregation).toBe('sum');
  });

  it('aggregates UAT values into grouped value series', () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const groupedSeries = MapGroupedValueSeriesConfigurationSchema.parse({
      id: 'grouped',
      type: 'map-grouped-value-series',
      sourceSeriesId: baseSeries.id,
      groupWorkspaceId: 'county',
      aggregation: 'sum',
    });
    const groupWorkspaces: MapGroupWorkspace[] = [
      {
        id: 'county',
        key: 'county',
        label: 'County',
        groups: [
          {
            id: 'county:CJ',
            memberSirutaCodes: ['1001', '1002'],
          },
          {
            id: 'county:B',
            memberSirutaCodes: ['2001'],
          },
        ],
      },
    ];

    const result = calculateMapSeriesValues({
      series: [baseSeries, groupedSeries],
      groupWorkspaces,
      baseValuesBySeriesId: new Map([
        [
          baseSeries.id,
          new Map([
            ['1001', 10],
            ['1002', 15],
            ['2001', 40],
          ]),
        ],
      ]),
    });

    expect(result.valuesBySeriesId.get(groupedSeries.id)?.get('county:CJ')).toBe(25);
    expect(result.valuesBySeriesId.get(groupedSeries.id)?.get('county:B')).toBe(40);
    expect(result.domainsBySeriesId.get(groupedSeries.id)).toEqual({
      type: 'group',
      groupWorkspaceId: 'county',
    });
  });

  it('uses memberOrder only for order and keeps full group membership', () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const groupedSeries = MapGroupedValueSeriesConfigurationSchema.parse({
      id: 'grouped',
      type: 'map-grouped-value-series',
      sourceSeriesId: baseSeries.id,
      groupWorkspaceId: 'county',
      aggregation: 'sum',
    });

    const result = calculateMapSeriesValues({
      series: [baseSeries, groupedSeries],
      groupWorkspaces: [
        {
          id: 'county',
          key: 'county',
          label: 'County',
          groups: [
            {
              id: 'county:CJ',
              memberSirutaCodes: ['1001', '1002'],
              memberOrder: ['1002'],
            },
          ],
        },
      ],
      baseValuesBySeriesId: new Map([
        [baseSeries.id, new Map([['1001', 10], ['1002', 15]])],
      ]),
    });

    expect(result.valuesBySeriesId.get(groupedSeries.id)?.get('county:CJ')).toBe(25);
  });

  it('guards malformed grouped series dependency cycles', () => {
    const groupedSeries = MapGroupedValueSeriesConfigurationSchema.parse({
      id: 'grouped',
      type: 'map-grouped-value-series',
      sourceSeriesId: 'grouped',
      groupWorkspaceId: 'county',
      aggregation: 'sum',
    });

    const result = calculateMapSeriesValues({
      series: [groupedSeries],
      groupWorkspaces: [
        {
          id: 'county',
          key: 'county',
          label: 'County',
          groups: [{ id: 'county:CJ', memberSirutaCodes: ['1001'] }],
        },
      ],
      baseValuesBySeriesId: new Map(),
    });

    expect(result.valuesBySeriesId.get(groupedSeries.id)?.size).toBe(0);
    expect(
      result.warnings.some(
        (warning) =>
          warning.type === 'missing_dependency' &&
          warning.seriesId === groupedSeries.id &&
          warning.message.includes('recursive')
      )
    ).toBe(true);
  });

  it('allows calculations across grouped series with matching domains', () => {
    const spendingSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const populationSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    const spendingGrouped = MapGroupedValueSeriesConfigurationSchema.parse({
      id: 'spending-grouped',
      type: 'map-grouped-value-series',
      sourceSeriesId: spendingSeries.id,
      groupWorkspaceId: 'county',
      aggregation: 'sum',
    });
    const populationGrouped = MapGroupedValueSeriesConfigurationSchema.parse({
      id: 'population-grouped',
      type: 'map-grouped-value-series',
      sourceSeriesId: populationSeries.id,
      groupWorkspaceId: 'county',
      aggregation: 'sum',
    });
    const perCapitaSeries = withCalculation(
      createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation'),
      {
        op: 'divide',
        args: [spendingGrouped.id, populationGrouped.id],
      }
    );
    const groupWorkspaces: MapGroupWorkspace[] = [
      {
        id: 'county',
        key: 'county',
        label: 'County',
        groups: [
          {
            id: 'county:CJ',
            memberSirutaCodes: ['1001', '1002'],
          },
        ],
      },
    ];

    const result = calculateMapSeriesValues({
      series: [spendingSeries, populationSeries, spendingGrouped, populationGrouped, perCapitaSeries],
      groupWorkspaces,
      baseValuesBySeriesId: new Map([
        [spendingSeries.id, new Map([['1001', 10], ['1002', 20]])],
        [populationSeries.id, new Map([['1001', 2], ['1002', 4]])],
      ]),
    });

    expect(result.valuesBySeriesId.get(perCapitaSeries.id)?.get('county:CJ')).toBe(5);
    expect(result.domainsBySeriesId.get(perCapitaSeries.id)).toEqual({
      type: 'group',
      groupWorkspaceId: 'county',
    });
  });

  it('rejects calculations across incompatible domains', () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const countyGrouped = MapGroupedValueSeriesConfigurationSchema.parse({
      id: 'county-grouped',
      type: 'map-grouped-value-series',
      sourceSeriesId: baseSeries.id,
      groupWorkspaceId: 'county',
      aggregation: 'sum',
    });
    const regionGrouped = MapGroupedValueSeriesConfigurationSchema.parse({
      id: 'region-grouped',
      type: 'map-grouped-value-series',
      sourceSeriesId: baseSeries.id,
      groupWorkspaceId: 'region',
      aggregation: 'sum',
    });
    const calcSeries = withCalculation(
      createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation'),
      {
        op: 'divide',
        args: [countyGrouped.id, regionGrouped.id],
      }
    );

    const result = calculateMapSeriesValues({
      series: [baseSeries, countyGrouped, regionGrouped, calcSeries],
      groupWorkspaces: [
        {
          id: 'county',
          key: 'county',
          label: 'County',
          groups: [{ id: 'county:CJ', memberSirutaCodes: ['1001'] }],
        },
        {
          id: 'region',
          key: 'region',
          label: 'Region',
          groups: [{ id: 'region:NW', memberSirutaCodes: ['1001'] }],
        },
      ],
      baseValuesBySeriesId: new Map([
        [baseSeries.id, new Map([['1001', 10]])],
      ]),
    });

    expect(result.valuesBySeriesId.get(calcSeries.id)?.size).toBe(0);
    expect(
      result.warnings.some(
        (warning) => warning.type === 'domain_mismatch' && warning.seriesId === calcSeries.id
      )
    ).toBe(true);
  });

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
