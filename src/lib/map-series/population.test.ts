import { describe, expect, it } from 'vitest';
import {
  GeoJsonDatasetSeriesConfigurationSchema,
  createDefaultAdvancedMapAnalyticsSeries,
} from '@/schemas/advanced-map-analytics';
import type { UatFeature } from '@/components/maps/interfaces';
import { buildPopulationVectors, populationSeriesInUse } from './population';
import { mapPopulationYear } from './population-year';

const sector = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [0, 0] },
  properties: {
    natcode: '179141',
    name: 'Sector 1',
    county: 'Bucuresti',
    countyId: 40,
    regionId: 8,
    insPop2021: 224764,
  },
} satisfies UatFeature;
const annual = GeoJsonDatasetSeriesConfigurationSchema.parse({
  type: 'geojson-dataset-series',
  id: 'population',
  datasetKey: 'annualPopulation',
  year: 2025,
});
describe('population map source', () => {
  it('creates annual series, but preserves saved legacy configurations and requires a saved year', () => {
    expect(
      createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series'),
    ).toMatchObject({
      datasetKey: 'annualPopulation',
      year: new Date().getFullYear(),
    });
    expect(
      GeoJsonDatasetSeriesConfigurationSchema.parse({
        type: 'geojson-dataset-series',
      }),
    ).toMatchObject({ datasetKey: 'insPop2021' });
    expect(
      GeoJsonDatasetSeriesConfigurationSchema.safeParse({
        type: 'geojson-dataset-series',
        datasetKey: 'annualPopulation',
      }).success,
    ).toBe(false);
    expect(
      GeoJsonDatasetSeriesConfigurationSchema.parse(
        JSON.parse(JSON.stringify(annual)),
      ),
    ).toEqual(annual);
  });
  it('uses the annual sector value, preserves a missing cell, and reports carry age', () => {
    const missing = {
      ...sector,
      properties: { ...sector.properties, natcode: '179150' },
    };
    const output = buildPopulationVectors(
      [annual],
      [sector, missing],
      'UAT',
      new Map([
        [
          2025,
          [
            {
              territoryCode: '179141',
              territoryId: 1,
              year: 2025,
              population: 264698,
              metadata: {
                sourceYearMin: 2023,
                sourceYearMax: 2023,
                maxCarryAge: 2,
                carriedCount: 1,
                provisionalCount: 0,
                sourceUrl: 'https://insse.ro',
              },
            },
          ],
        ],
      ]),
    );
    expect([...output.values.get('population')!]).toEqual([
      ['179141', '264698'],
      ['179150', undefined],
    ]);
    expect(output.warnings[0].details).toMatchObject({
      year: 2025,
      carried: 1,
      maxAge: 2,
      oldestSourceYear: 2023,
      missing: 1,
    });
    expect(
      buildPopulationVectors([annual], [sector], 'UAT', new Map())
        .values.get('population')
        ?.get('179141'),
    ).toBeUndefined();
  });
  it('keeps the explicitly selected census value', () => {
    const legacy = GeoJsonDatasetSeriesConfigurationSchema.parse({
      type: 'geojson-dataset-series',
      id: 'census',
    });
    expect(
      buildPopulationVectors([legacy], [sector], 'UAT', new Map())
        .values.get('census')
        ?.get('179141'),
    ).toBe('224764');
  });
  it('uses curated county values directly and intersects geographic filters', () => {
    const county = {
      ...sector,
      properties: { ...sector.properties, mnemonic: 'B' },
    };
    const cells = new Map([
      [
        2025,
        [
          {
            territoryCode: 'B',
            territoryId: 2,
            year: 2025,
            population: 2000000,
            metadata: null,
          },
        ],
      ],
    ]);
    expect(
      buildPopulationVectors(
        [{ ...annual, countyFilterIds: [40], regionFilterIds: [8] }],
        [county],
        'County',
        cells,
      )
        .values.get('population')
        ?.get('B'),
    ).toBe('2000000');
    expect(
      buildPopulationVectors(
        [{ ...annual, regionFilterIds: [7] }],
        [county],
        'County',
        cells,
      ).values.get('population')?.size,
    ).toBe(0);
  });
  it('uses the latest selected year for dates, intervals and subannual selections', () => {
    expect(
      mapPopulationYear({
        type: 'YEAR',
        selection: { dates: ['2025', '2021'] },
      }),
    ).toBe(2025);
    expect(
      mapPopulationYear({
        type: 'MONTH',
        selection: { interval: { start: '2020-12', end: '2024-02' } },
      }),
    ).toBe(2024);
    expect(mapPopulationYear(undefined)).toBeUndefined();
  });
});

describe('population series dependencies', () => {
  it('loads disabled population inputs used by a calculation and terminates cycles', () => {
    const calculation = createDefaultAdvancedMapAnalyticsSeries(
      'aggregated-series-calculation',
    );
    if (calculation.type !== 'aggregated-series-calculation')
      throw new Error('Expected calculation');
    const input = { ...annual, enabled: false };
    const used = {
      ...calculation,
      id: 'calculation',
      calculation: { op: 'sum' as const, args: ['population', 'calculation'] },
    };
    expect(populationSeriesInUse([input, used])).toEqual([input]);
    expect(populationSeriesInUse([input, { ...used, enabled: false }])).toEqual(
      [],
    );
  });
  it('keeps disabled population used only by an active filter', () => {
    const input = { ...annual, enabled: false };
    expect(populationSeriesInUse([input], new Set(['population']))).toEqual([
      input,
    ]);
    expect(populationSeriesInUse([input], new Set())).toEqual([]);
  });
});
