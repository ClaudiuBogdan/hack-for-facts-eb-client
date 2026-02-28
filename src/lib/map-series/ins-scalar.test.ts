import { describe, expect, it } from 'vitest';

import type { InsSeriesConfiguration } from '@/schemas/charts';
import type { InsObservation } from '@/schemas/ins';
import { evaluateInsSeriesToMapVector } from '@/lib/map-series/ins-scalar';

function createSeries(overrides: Partial<InsSeriesConfiguration> = {}): InsSeriesConfiguration {
  return {
    id: 'ins-map-series-1',
    type: 'ins-series',
    enabled: true,
    label: 'INS map series',
    unit: '',
    config: {
      showDataLabels: false,
      color: '#0000ff',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    datasetCode: 'POP107D',
    aggregation: 'sum',
    hasValue: true,
    ...overrides,
  };
}

function createObservation(overrides: Partial<InsObservation>): InsObservation {
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
    territory: {
      code: 'CJ',
      siruta_code: '12345',
      level: 'LAU',
      name_ro: 'Localitate',
    },
    unit: {
      code: 'PERS',
      symbol: 'pers.',
    },
    classifications: [],
    dimensions: {},
    ...overrides,
  };
}

describe('evaluateInsSeriesToMapVector', () => {
  it('aggregates selected periods per siruta with series reducer', () => {
    const series = createSeries({
      aggregation: 'sum',
      period: {
        type: 'YEAR',
        selection: {
          interval: {
            start: '2022',
            end: '2023',
          },
        },
      },
    });

    const result = evaluateInsSeriesToMapVector({
      series,
      observations: [
        createObservation({
          value: '10',
          time_period: {
            iso_period: '2022',
            year: 2022,
            quarter: null,
            month: null,
            periodicity: 'ANNUAL',
          },
        }),
        createObservation({
          value: '15',
          time_period: {
            iso_period: '2023',
            year: 2023,
            quarter: null,
            month: null,
            periodicity: 'ANNUAL',
          },
        }),
      ],
    });

    expect(result.valuesBySiruta.get('12345')).toBe(25);
    expect(result.warnings).toEqual([]);
  });

  it('supports average and first reducers over periods', () => {
    const averageResult = evaluateInsSeriesToMapVector({
      series: createSeries({
        aggregation: 'average',
        period: {
          type: 'YEAR',
          selection: {
            dates: ['2022', '2023'],
          },
        },
      }),
      observations: [
        createObservation({
          value: '4',
          time_period: {
            iso_period: '2022',
            year: 2022,
            quarter: null,
            month: null,
            periodicity: 'ANNUAL',
          },
        }),
        createObservation({
          value: '8',
          time_period: {
            iso_period: '2023',
            year: 2023,
            quarter: null,
            month: null,
            periodicity: 'ANNUAL',
          },
        }),
      ],
    });
    expect(averageResult.valuesBySiruta.get('12345')).toBe(6);

    const firstResult = evaluateInsSeriesToMapVector({
      series: createSeries({
        aggregation: 'first',
        period: {
          type: 'YEAR',
          selection: {
            dates: ['2022', '2023'],
          },
        },
      }),
      observations: [
        createObservation({
          value: '4',
          time_period: {
            iso_period: '2022',
            year: 2022,
            quarter: null,
            month: null,
            periodicity: 'ANNUAL',
          },
        }),
        createObservation({
          value: '8',
          time_period: {
            iso_period: '2023',
            year: 2023,
            quarter: null,
            month: null,
            periodicity: 'ANNUAL',
          },
        }),
      ],
    });
    expect(firstResult.valuesBySiruta.get('12345')).toBe(4);
  });

  it('warns when non-numeric observations remove all values', () => {
    const result = evaluateInsSeriesToMapVector({
      series: createSeries(),
      observations: [
        createObservation({ value: 'NaN' }),
        createObservation({ value: null }),
      ],
    });

    expect(result.valuesBySiruta.size).toBe(0);
    expect(result.warnings.some((warning) => warning.type === 'ins_no_observations')).toBe(true);
  });

  it('warns on mixed units and uses deterministic inferred unit', () => {
    const result = evaluateInsSeriesToMapVector({
      series: createSeries(),
      observations: [
        createObservation({
          value: '10',
          unit: { code: 'PERS', symbol: 'pers.' },
        }),
        createObservation({
          value: '4',
          unit: { code: 'PROC', symbol: '%' },
        }),
      ],
    });

    expect(result.warnings.some((warning) => warning.type === 'ins_mixed_units')).toBe(true);
    expect(result.unit).toBe('%');
  });

  it('warns when observations have no siruta coverage', () => {
    const result = evaluateInsSeriesToMapVector({
      series: createSeries(),
      observations: [
        createObservation({
          value: '10',
          territory: { code: 'CJ', level: 'NUTS3' },
        }),
      ],
    });

    expect(result.valuesBySiruta.size).toBe(0);
    expect(result.warnings.some((warning) => warning.type === 'ins_no_siruta_values')).toBe(true);
  });
});
