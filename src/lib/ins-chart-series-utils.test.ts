import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { InsObservation } from '@/schemas/ins';
import type { InsSeriesConfiguration } from '@/schemas/charts';
import { mapInsSeriesToAnalyticsSeries } from './ins-chart-series-utils';
import { getAllInsObservations } from '@/features/statistics/api/graphql/ins-fetchers';

vi.mock('@/features/statistics/api/graphql/ins-fetchers', () => ({
  getAllInsObservations: vi.fn(),
}));

const mockedGetAllInsObservations = vi.mocked(getAllInsObservations);

function createSeries(overrides: Partial<InsSeriesConfiguration> = {}): InsSeriesConfiguration {
  return {
    id: 'ins-series-1',
    type: 'ins-series',
    enabled: true,
    label: 'INS Test',
    unit: '',
    config: { showDataLabels: false, color: '#0000ff' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    datasetCode: 'POP107D',
    aggregation: 'sum',
    hasValue: true,
    ...overrides,
  };
}

function observation(params: Partial<InsObservation>): InsObservation {
  return {
    dataset_code: 'POP107D',
    value: '0',
    value_status: null,
    time_period: {
      iso_period: '2023',
      year: 2023,
      quarter: null,
      month: null,
      periodicity: 'ANNUAL',
    },
    territory: { code: 'RO', level: 'NATIONAL', name_ro: 'Romania' },
    unit: { code: 'PERS', symbol: 'pers.' },
    classifications: [],
    dimensions: {},
    ...params,
  };
}

describe('ins-chart-series-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies sum reducer per period', async () => {
    mockedGetAllInsObservations.mockResolvedValue([
      observation({ value: '10', time_period: { iso_period: '2023', year: 2023, quarter: null, month: null, periodicity: 'ANNUAL' } }),
      observation({ value: '15', time_period: { iso_period: '2023', year: 2023, quarter: null, month: null, periodicity: 'ANNUAL' } }),
      observation({ value: '8', time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' } }),
    ]);

    const result = await mapInsSeriesToAnalyticsSeries(createSeries({ aggregation: 'sum' }));

    expect(result.series?.data).toEqual([
      { x: '2023', y: 25 },
      { x: '2024', y: 8 },
    ]);
  });

  it('applies average reducer per period', async () => {
    mockedGetAllInsObservations.mockResolvedValue([
      observation({ value: '2', time_period: { iso_period: '2022', year: 2022, quarter: null, month: null, periodicity: 'ANNUAL' } }),
      observation({ value: '4', time_period: { iso_period: '2022', year: 2022, quarter: null, month: null, periodicity: 'ANNUAL' } }),
    ]);

    const result = await mapInsSeriesToAnalyticsSeries(createSeries({ aggregation: 'average' }));

    expect(result.series?.data).toEqual([{ x: '2022', y: 3 }]);
  });

  it('applies first reducer per period', async () => {
    mockedGetAllInsObservations.mockResolvedValue([
      observation({ value: '11', time_period: { iso_period: '2020', year: 2020, quarter: null, month: null, periodicity: 'ANNUAL' } }),
      observation({ value: '33', time_period: { iso_period: '2020', year: 2020, quarter: null, month: null, periodicity: 'ANNUAL' } }),
    ]);

    const result = await mapInsSeriesToAnalyticsSeries(createSeries({ aggregation: 'first' }));

    expect(result.series?.data).toEqual([{ x: '2020', y: 11 }]);
  });

  it('enforces classification AND semantics by type', async () => {
    mockedGetAllInsObservations.mockResolvedValue([
      observation({
        value: '100',
        classifications: [
          { type_code: 'SEXE', code: 'M', name_ro: 'Masculin' },
          { type_code: 'MEDIU', code: 'TOTAL', name_ro: 'Total' },
        ],
      }),
      observation({
        value: '150',
        classifications: [{ type_code: 'SEXE', code: 'M', name_ro: 'Masculin' }],
      }),
    ]);

    const result = await mapInsSeriesToAnalyticsSeries(
      createSeries({
        classificationSelections: {
          SEXE: ['M'],
          MEDIU: ['TOTAL'],
        },
      })
    );

    expect(result.series?.data).toEqual([{ x: '2023', y: 100 }]);
  });

  it('returns empty series with warning for mixed units', async () => {
    mockedGetAllInsObservations.mockResolvedValue([
      observation({ value: '10', unit: { code: 'PERS', symbol: 'pers.' } }),
      observation({ value: '7', unit: { code: 'PROC', symbol: '%' } }),
    ]);

    const result = await mapInsSeriesToAnalyticsSeries(createSeries());

    expect(result.series?.data).toEqual([]);
    expect(result.warnings.some((warning) => warning.message.includes('mixed units'))).toBe(true);
  });

  it('builds observation filter with period object only', async () => {
    mockedGetAllInsObservations.mockResolvedValue([
      observation({ value: '10' }),
    ]);

    await mapInsSeriesToAnalyticsSeries(
      createSeries({
        period: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2023',
              end: '2024',
            },
          },
        },
      })
    );

    expect(mockedGetAllInsObservations).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          period: {
            type: 'YEAR',
            selection: {
              interval: {
                start: '2023',
                end: '2024',
              },
            },
          },
        }),
      })
    );
  });
});
