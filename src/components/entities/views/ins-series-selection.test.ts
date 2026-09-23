import { describe, expect, it } from 'vitest';

import type { InsDatasetDimension, InsObservation } from '@/schemas/ins';
import {
  buildDefaultSeriesSelection,
  buildSeriesGroups,
  buildStableSeries,
  filterObservationsBySeriesSelection,
  isTotalLikeSeriesLabel,
  mergeSeriesSelection,
} from './ins-series-selection';

function buildObservation(params: {
  year: number;
  value: string;
  classifications: Array<{
    id?: string;
    typeCode: string;
    typeName: string;
    code: string;
    name: string;
    sortOrder?: number;
  }>;
}): InsObservation {
  return {
    dataset_code: 'SAN104B',
    value: params.value,
    value_status: null,
    time_period: {
      iso_period: String(params.year),
      year: params.year,
      quarter: null,
      month: null,
      periodicity: 'ANNUAL',
    },
    territory: null,
    unit: { code: 'PERS', symbol: 'pers.', name_ro: 'persoane' },
    classifications: params.classifications.map((entry) => ({
      id: entry.id ?? null,
      type_code: entry.typeCode,
      type_name_ro: entry.typeName,
      type_name_en: null,
      code: entry.code,
      name_ro: entry.name,
      name_en: null,
      sort_order: entry.sortOrder ?? null,
    })),
  };
}

describe('series selection helpers', () => {
  it('matches total-like labels used by INS matrices', () => {
    expect(isTotalLikeSeriesLabel('Total')).toBe(true);
    expect(isTotalLikeSeriesLabel('TOTAL GENERAL')).toBe(true);
    expect(isTotalLikeSeriesLabel('Ambele sexe')).toBe(true);
    expect(isTotalLikeSeriesLabel('din total medici')).toBe(true);
    expect(isTotalLikeSeriesLabel('Stomatologi')).toBe(false);
  });

  it('chooses total by default for the first classification group', () => {
    const dimensions: InsDatasetDimension[] = [
      {
        index: 0,
        type: 'CLASSIFICATION',
        label_ro: 'Categoria',
        label_en: null,
        classification_type: { code: 'CAT', name_ro: 'Categoria', name_en: null },
      },
      {
        index: 1,
        type: 'CLASSIFICATION',
        label_ro: 'Proprietate',
        label_en: null,
        classification_type: { code: 'OWN', name_ro: 'Proprietate', name_en: null },
      },
    ];

    const observations: InsObservation[] = [
      buildObservation({
        year: 2024,
        value: '480',
        classifications: [
          { typeCode: 'CAT', typeName: 'Categoria', code: 'TOT', name: 'Total', sortOrder: 1 },
          { typeCode: 'OWN', typeName: 'Proprietate', code: 'TOTAL', name: 'Total', sortOrder: 1 },
        ],
      }),
      buildObservation({
        year: 2024,
        value: '220',
        classifications: [
          { typeCode: 'CAT', typeName: 'Categoria', code: 'MED', name: 'Medici', sortOrder: 2 },
          { typeCode: 'OWN', typeName: 'Proprietate', code: 'PUB', name: 'Proprietate publica', sortOrder: 2 },
        ],
      }),
    ];

    const groups = buildSeriesGroups(observations, dimensions);
    const defaultSelection = buildDefaultSeriesSelection(groups);
    const catTotalOption = groups
      .find((group) => group.typeCode === 'CAT')
      ?.options.find((option) => option.label === 'Total');
    const ownTotalOption = groups
      .find((group) => group.typeCode === 'OWN')
      ?.options.find((option) => option.label === 'Total');
    expect(catTotalOption).toBeTruthy();
    expect(ownTotalOption).toBeTruthy();
    expect(defaultSelection).toEqual({
      CAT: [catTotalOption!.code],
      OWN: [ownTotalOption!.code],
    });
  });

  it('builds a stable, non-mixed series across periods', () => {
    const dimensions: InsDatasetDimension[] = [
      {
        index: 0,
        type: 'CLASSIFICATION',
        label_ro: 'Categoria',
        label_en: null,
        classification_type: { code: 'CAT', name_ro: 'Categoria', name_en: null },
      },
      {
        index: 1,
        type: 'CLASSIFICATION',
        label_ro: 'Proprietate',
        label_en: null,
        classification_type: { code: 'OWN', name_ro: 'Proprietate', name_en: null },
      },
    ];

    const observations: InsObservation[] = [
      buildObservation({
        year: 2024,
        value: '86',
        classifications: [
          { typeCode: 'CAT', typeName: 'Categoria', code: 'FAM', name: 'Din total medici: medici de familie', sortOrder: 3 },
          { typeCode: 'OWN', typeName: 'Proprietate', code: 'PUB', name: 'Proprietate publica', sortOrder: 2 },
        ],
      }),
      buildObservation({
        year: 2024,
        value: '395',
        classifications: [
          { typeCode: 'CAT', typeName: 'Categoria', code: 'STOM', name: 'Stomatologi', sortOrder: 4 },
          { typeCode: 'OWN', typeName: 'Proprietate', code: 'PRI', name: 'Proprietate privata', sortOrder: 3 },
        ],
      }),
      buildObservation({
        year: 2024,
        value: '480',
        classifications: [
          { typeCode: 'CAT', typeName: 'Categoria', code: 'TOT', name: 'Total', sortOrder: 1 },
          { typeCode: 'OWN', typeName: 'Proprietate', code: 'TOTAL', name: 'Total', sortOrder: 1 },
        ],
      }),
      buildObservation({
        year: 2023,
        value: '232',
        classifications: [
          { typeCode: 'CAT', typeName: 'Categoria', code: 'FAM', name: 'Din total medici: medici de familie', sortOrder: 3 },
          { typeCode: 'OWN', typeName: 'Proprietate', code: 'PRI', name: 'Proprietate privata', sortOrder: 3 },
        ],
      }),
      buildObservation({
        year: 2023,
        value: '500',
        classifications: [
          { typeCode: 'CAT', typeName: 'Categoria', code: 'TOT', name: 'Total', sortOrder: 1 },
          { typeCode: 'OWN', typeName: 'Proprietate', code: 'TOTAL', name: 'Total', sortOrder: 1 },
        ],
      }),
    ];

    const groups = buildSeriesGroups(observations, dimensions);
    const defaultSelection = buildDefaultSeriesSelection(groups);
    const filtered = filterObservationsBySeriesSelection(observations, defaultSelection, 'PERS');
    const series = buildStableSeries(filtered);

    expect(series).toHaveLength(2);
    expect(series.map((entry) => [entry.time_period.year, entry.value])).toEqual([
      [2024, '480'],
      [2023, '500'],
    ]);
    expect(series.every((entry) => {
      const details = (entry.classifications ?? []).map((item) => item.code);
      return details.includes('TOT') && details.includes('TOTAL');
    })).toBe(true);
  });

  it('does not mix rows when labels share the same code but different ids', () => {
    const dimensions: InsDatasetDimension[] = [
      {
        index: 0,
        type: 'CLASSIFICATION',
        label_ro: 'Niveluri de educatie',
        label_en: null,
        classification_type: { code: 'SCL109D_DIM0', name_ro: 'Niveluri de educatie', name_en: null },
      },
      {
        index: 1,
        type: 'CLASSIFICATION',
        label_ro: 'Unitati de masura',
        label_en: null,
        classification_type: { code: 'SCL109D_DIM4', name_ro: 'Unitati de masura', name_en: null },
      },
    ];

    const observations: InsObservation[] = [
      buildObservation({
        year: 2023,
        value: '2432',
        classifications: [
          {
            id: '5530',
            typeCode: 'SCL109D_DIM0',
            typeName: 'Niveluri de educatie',
            code: 'UNIVERSITAR_DE_LICENTA__ABSOLVENTI_CU_DIPLOMA__INV',
            name: 'Universitar de licenta - absolventi cu diploma - invatamant public',
            sortOrder: 16,
          },
          {
            id: '9001',
            typeCode: 'SCL109D_DIM4',
            typeName: 'Unitati de masura',
            code: 'NUMAR_PERSOANE',
            name: 'Numar persoane',
            sortOrder: 1,
          },
        ],
      }),
      buildObservation({
        year: 2023,
        value: '52',
        classifications: [
          {
            id: '5531',
            typeCode: 'SCL109D_DIM0',
            typeName: 'Niveluri de educatie',
            code: 'UNIVERSITAR_DE_LICENTA__ABSOLVENTI_CU_DIPLOMA__INV',
            name: 'Universitar de licenta - absolventi cu diploma - invatamant privat',
            sortOrder: 17,
          },
          {
            id: '9001',
            typeCode: 'SCL109D_DIM4',
            typeName: 'Unitati de masura',
            code: 'NUMAR_PERSOANE',
            name: 'Numar persoane',
            sortOrder: 1,
          },
        ],
      }),
      buildObservation({
        year: 2022,
        value: '2549',
        classifications: [
          {
            id: '5530',
            typeCode: 'SCL109D_DIM0',
            typeName: 'Niveluri de educatie',
            code: 'UNIVERSITAR_DE_LICENTA__ABSOLVENTI_CU_DIPLOMA__INV',
            name: 'Universitar de licenta - absolventi cu diploma - invatamant public',
            sortOrder: 16,
          },
          {
            id: '9001',
            typeCode: 'SCL109D_DIM4',
            typeName: 'Unitati de masura',
            code: 'NUMAR_PERSOANE',
            name: 'Numar persoane',
            sortOrder: 1,
          },
        ],
      }),
      buildObservation({
        year: 2022,
        value: '46',
        classifications: [
          {
            id: '5531',
            typeCode: 'SCL109D_DIM0',
            typeName: 'Niveluri de educatie',
            code: 'UNIVERSITAR_DE_LICENTA__ABSOLVENTI_CU_DIPLOMA__INV',
            name: 'Universitar de licenta - absolventi cu diploma - invatamant privat',
            sortOrder: 17,
          },
          {
            id: '9001',
            typeCode: 'SCL109D_DIM4',
            typeName: 'Unitati de masura',
            code: 'NUMAR_PERSOANE',
            name: 'Numar persoane',
            sortOrder: 1,
          },
        ],
      }),
    ];

    const groups = buildSeriesGroups(observations, dimensions);
    const educationGroup = groups.find((group) => group.typeCode === 'SCL109D_DIM0');
    const unitGroup = groups.find((group) => group.typeCode === 'SCL109D_DIM4');
    expect(educationGroup).toBeTruthy();
    expect(unitGroup).toBeTruthy();

    const publicOption = educationGroup?.options.find((option) => option.label.includes('public'));
    const unitOption = unitGroup?.options.find((option) => option.label === 'Numar persoane');
    expect(publicOption).toBeTruthy();
    expect(unitOption).toBeTruthy();

    const filtered = filterObservationsBySeriesSelection(
      observations,
      {
        SCL109D_DIM0: [publicOption!.code],
        SCL109D_DIM4: [unitOption!.code],
      },
      'PERS'
    );
    const series = buildStableSeries(filtered);

    expect(series.map((row) => row.value)).toEqual(['2432', '2549']);
    expect(series.every((row) => row.classifications?.some((entry) => entry.id === '5530'))).toBe(true);
    expect(series.every((row) => row.classifications?.every((entry) => entry.id !== '5531'))).toBe(true);
  });

  it('drops total-like values when mixed with non-total selections in the same group', () => {
    const dimensions: InsDatasetDimension[] = [
      {
        index: 0,
        type: 'CLASSIFICATION',
        label_ro: 'Sex',
        label_en: null,
        classification_type: { code: 'SEX', name_ro: 'Sex', name_en: null },
      },
    ];

    const observations: InsObservation[] = [
      buildObservation({
        year: 2024,
        value: '100',
        classifications: [{ typeCode: 'SEX', typeName: 'Sex', code: 'TOTAL', name: 'Total', sortOrder: 1 }],
      }),
      buildObservation({
        year: 2024,
        value: '51',
        classifications: [{ typeCode: 'SEX', typeName: 'Sex', code: 'M', name: 'Masculin', sortOrder: 2 }],
      }),
      buildObservation({
        year: 2024,
        value: '49',
        classifications: [{ typeCode: 'SEX', typeName: 'Sex', code: 'F', name: 'Feminin', sortOrder: 3 }],
      }),
    ];

    const groups = buildSeriesGroups(observations, dimensions);
    const sexGroup = groups.find((group) => group.typeCode === 'SEX');
    expect(sexGroup).toBeTruthy();

    const totalCode = sexGroup!.options.find((option) => option.label === 'Total')?.code;
    const masculineCode = sexGroup!.options.find((option) => option.label === 'Masculin')?.code;
    const feminineCode = sexGroup!.options.find((option) => option.label === 'Feminin')?.code;

    const merged = mergeSeriesSelection(groups, {
      SEX: [totalCode!, masculineCode!, feminineCode!],
    });

    expect(merged.SEX).toEqual([masculineCode!, feminineCode!]);
  });
});
