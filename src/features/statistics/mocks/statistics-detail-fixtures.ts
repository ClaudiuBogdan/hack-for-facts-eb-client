import type {
  InsDatasetDetails,
  InsDimensionValue,
  InsObservation,
  InsPeriodicity,
  InsTimePeriod,
} from '@/schemas/ins'

/**
 * Mock fixtures for the dataset detail page.
 *
 * Examples shaped like the live INS serving contract — not claimed real facts.
 * They exist so the page is fully operable under
 * `VITE_MOCK_DATASETS=ins-indicators` and so the states that are easy to get
 * wrong are always on screen during development:
 *
 * - `POP107D` — four dimensions (time, territory, one classification, one
 *   unit), a **deliberate 2019 gap** so the chart must draw a break, and a
 *   2023 row flagged `value_status: 'e'` (estimated).
 * - `SOM101F` — quarterly, to exercise period enumeration below the year.
 * - `TUR101C` — catalog-only: metadata and dimensions, zero observations.
 */

const CLUJ_NAPOCA = {
  code: '54975',
  siruta_code: '54975',
  level: 'LAU' as const,
  name_ro: 'Municipiul Cluj-Napoca',
}

const TURDA = {
  code: '54984',
  siruta_code: '54984',
  level: 'LAU' as const,
  name_ro: 'Municipiul Turda',
}

const CLUJ_COUNTY = {
  code: 'CJ',
  siruta_code: null,
  level: 'NUTS3' as const,
  name_ro: 'Cluj',
}

const UNIT_PERSOANE = {
  code: 'PERS',
  symbol: 'pers.',
  name_ro: 'Număr persoane',
}

const SEXE_VALUES = [
  { code: 'total', name_ro: 'Total' },
  { code: 'masculin', name_ro: 'Masculin' },
  { code: 'feminin', name_ro: 'Feminin' },
] as const

/**
 * Age groups carry no "Total" option, mirroring INS. That is load-bearing for
 * more than realism: a dataset whose every classification auto-pins would
 * satisfy the observations guard on first paint, and the scope prompt — the
 * thing standing between the user and a 23.6M-row scan — would never appear.
 */
const VARSTA_VALUES = [
  { code: '0-14', name_ro: '0-14 ani' },
  { code: '15-64', name_ro: '15-64 ani' },
  { code: '65+', name_ro: '65 ani și peste' },
] as const

function annualPeriod(year: number): InsTimePeriod {
  return { iso_period: `${year}`, year, periodicity: 'ANNUAL' }
}

function quarterlyPeriod(year: number, quarter: number): InsTimePeriod {
  return {
    iso_period: `${year}-Q${quarter}`,
    year,
    quarter,
    periodicity: 'QUARTERLY',
  }
}

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

function baseDataset(params: {
  readonly id: string
  readonly code: string
  readonly nameRo: string
  readonly periodicity: readonly InsPeriodicity[]
  readonly yearRange: readonly [number, number]
  readonly syncStatus: string
}): Omit<InsDatasetDetails, 'dimensions'> {
  return {
    id: params.id,
    code: params.code,
    name_ro: params.nameRo,
    name_en: null,
    definition_ro: null,
    definition_en: null,
    periodicity: [...params.periodicity],
    year_range: [...params.yearRange],
    has_uat_data: true,
    has_county_data: true,
    has_siruta: true,
    sync_status: params.syncStatus,
    context_code: '2',
    context_name_ro: 'Populație și structură demografică',
    context_path: '2',
  }
}

export const MOCK_POP107D: InsDatasetDetails = {
  ...baseDataset({
    id: '1',
    code: 'POP107D',
    nameRo: 'Populația după domiciliu pe sexe și grupe de vârstă',
    periodicity: ['ANNUAL'],
    yearRange: [2015, 2024],
    syncStatus: 'SYNCED',
  }),
  dimension_count: 4,
  dimensions: [
    { index: 0, type: 'TEMPORAL', label_ro: 'Ani' },
    { index: 1, type: 'TERRITORIAL', label_ro: 'Localități' },
    {
      index: 2,
      type: 'CLASSIFICATION',
      label_ro: 'Sexe',
      classification_type: { code: 'SEXE', name_ro: 'Sexe', is_hierarchical: false },
      option_count: SEXE_VALUES.length,
    },
    {
      index: 3,
      type: 'CLASSIFICATION',
      label_ro: 'Grupe de vârstă',
      classification_type: { code: 'VARSTA', name_ro: 'Grupe de vârstă' },
      option_count: VARSTA_VALUES.length,
    },
  ],
}

/** A dataset with a single unit, to exercise the unit auto-pin. */
export const MOCK_POP108D: InsDatasetDetails = {
  ...baseDataset({
    id: '2',
    code: 'POP108D',
    nameRo: 'Populația rezidentă pe medii de rezidență',
    periodicity: ['ANNUAL'],
    yearRange: [2012, 2024],
    syncStatus: 'SYNCED',
  }),
  dimension_count: 4,
  dimensions: [
    { index: 0, type: 'TEMPORAL', label_ro: 'Ani' },
    { index: 1, type: 'TERRITORIAL', label_ro: 'Localități' },
    {
      index: 2,
      type: 'CLASSIFICATION',
      label_ro: 'Sexe',
      classification_type: { code: 'SEXE', name_ro: 'Sexe' },
    },
    { index: 3, type: 'UNIT_OF_MEASURE', label_ro: 'Unitatea de măsură' },
  ],
}

export const MOCK_SOM101F: InsDatasetDetails = {
  ...baseDataset({
    id: '3',
    code: 'SOM101F',
    nameRo: 'Șomerii înregistrați pe sexe',
    periodicity: ['QUARTERLY', 'MONTHLY'],
    yearRange: [2022, 2023],
    syncStatus: 'SYNCED',
  }),
  dimension_count: 4,
  dimensions: [
    { index: 0, type: 'TEMPORAL', label_ro: 'Trimestre' },
    { index: 1, type: 'TERRITORIAL', label_ro: 'Localități' },
    {
      index: 2,
      type: 'CLASSIFICATION',
      label_ro: 'Sexe',
      classification_type: { code: 'SEXE', name_ro: 'Sexe' },
    },
    { index: 3, type: 'UNIT_OF_MEASURE', label_ro: 'Unitatea de măsură' },
  ],
}

export const MOCK_TUR101C: InsDatasetDetails = {
  ...baseDataset({
    id: '4',
    code: 'TUR101C',
    nameRo: 'Structuri de primire turistică cu funcțiuni de cazare',
    periodicity: ['ANNUAL'],
    yearRange: [1990, 2023],
    syncStatus: 'PENDING',
  }),
  dimension_count: 3,
  dimensions: [
    { index: 0, type: 'TEMPORAL', label_ro: 'Ani' },
    { index: 1, type: 'TERRITORIAL', label_ro: 'Localități' },
    {
      index: 2,
      type: 'CLASSIFICATION',
      label_ro: 'Tipuri de structuri',
      classification_type: { code: 'TIP_STRUCTURA', name_ro: 'Tipuri de structuri' },
    },
  ],
}

export const MOCK_DETAIL_DATASETS: ReadonlyMap<string, InsDatasetDetails> = new Map(
  [MOCK_POP107D, MOCK_POP108D, MOCK_SOM101F, MOCK_TUR101C].map((dataset) => [
    dataset.code,
    dataset,
  ]),
)

// ---------------------------------------------------------------------------
// Dimension values
// ---------------------------------------------------------------------------

const TERRITORY_VALUES: readonly InsDimensionValue[] = [
  CLUJ_NAPOCA,
  TURDA,
  CLUJ_COUNTY,
].map((territory, index) => ({
  nom_item_id: 100 + index,
  dimension_type: 'TERRITORIAL',
  label_ro: territory.name_ro,
  territory,
}))

function classificationValues(
  typeCode: string,
  values: readonly { readonly code: string; readonly name_ro: string }[],
): readonly InsDimensionValue[] {
  return values.map((value, index) => ({
    nom_item_id: 200 + index,
    dimension_type: 'CLASSIFICATION',
    label_ro: value.name_ro,
    sort_order: index,
    classification_value: {
      type_code: typeCode,
      code: value.code,
      name_ro: value.name_ro,
    },
  }))
}

const UNIT_VALUES: readonly InsDimensionValue[] = [
  {
    nom_item_id: 300,
    dimension_type: 'UNIT_OF_MEASURE',
    label_ro: UNIT_PERSOANE.name_ro,
    unit: UNIT_PERSOANE,
  },
]

/** `datasetCode` → `dimensionIndex` → the dimension's option list. */
export const MOCK_DIMENSION_VALUES: ReadonlyMap<
  string,
  ReadonlyMap<number, readonly InsDimensionValue[]>
> = new Map([
  [
    'POP107D',
    new Map([
      [1, TERRITORY_VALUES],
      [2, classificationValues('SEXE', SEXE_VALUES)],
      [3, classificationValues('VARSTA', VARSTA_VALUES)],
    ]),
  ],
  [
    'POP108D',
    new Map([
      [1, TERRITORY_VALUES],
      [2, classificationValues('SEXE', SEXE_VALUES)],
      [3, UNIT_VALUES],
    ]),
  ],
  [
    'SOM101F',
    new Map([
      [1, TERRITORY_VALUES],
      [2, classificationValues('SEXE', SEXE_VALUES)],
      [3, UNIT_VALUES],
    ]),
  ],
  [
    'TUR101C',
    new Map([
      [1, TERRITORY_VALUES],
      [2, classificationValues('TIP_STRUCTURA', [{ code: 'total', name_ro: 'Total' }])],
    ]),
  ],
])

// ---------------------------------------------------------------------------
// Observations
// ---------------------------------------------------------------------------

/** 2015–2024 with 2019 missing entirely — the gap the chart must not bridge. */
const POP107D_YEARS: readonly (readonly [number, string])[] = [
  [2015, '324576'],
  [2016, '324162'],
  [2017, '323114'],
  [2018, '322108'],
  [2020, '320123'],
  [2021, '318602'],
  [2022, '317441'],
  [2023, '316905'],
  [2024, '316248'],
]

function pop107dObservation(params: {
  readonly year: number
  readonly value: string
  readonly sex: (typeof SEXE_VALUES)[number]
  readonly varsta: (typeof VARSTA_VALUES)[number]
  readonly valueStatus?: string
}): InsObservation {
  return {
    dataset_code: 'POP107D',
    value: params.value,
    value_status: params.valueStatus ?? null,
    time_period: annualPeriod(params.year),
    territory: CLUJ_NAPOCA,
    unit: UNIT_PERSOANE,
    classifications: [
      {
        type_code: 'SEXE',
        type_name_ro: 'Sexe',
        code: params.sex.code,
        name_ro: params.sex.name_ro,
      },
      {
        type_code: 'VARSTA',
        type_name_ro: 'Grupe de vârstă',
        code: params.varsta.code,
        name_ro: params.varsta.name_ro,
      },
    ],
  }
}

const POP107D_OBSERVATIONS: readonly InsObservation[] = POP107D_YEARS.flatMap(
  ([year, value]) =>
    VARSTA_VALUES.map((varsta, index) =>
      pop107dObservation({
        year,
        value: index === 0 ? value : `${Math.round(Number(value) * (0.6 - index * 0.2))}`,
        sex: SEXE_VALUES[0],
        varsta,
        // The 2023 figure is an INS estimate, flagged on the wire.
        valueStatus: year === 2023 && index === 0 ? 'e' : undefined,
      }),
    ),
)

const SOM101F_OBSERVATIONS: readonly InsObservation[] = [2022, 2023].flatMap(
  (year) =>
    [1, 2, 3, 4].map((quarter) => ({
      dataset_code: 'SOM101F',
      value: `${4200 + quarter * 37 + (year - 2022) * 115}`,
      value_status: year === 2023 && quarter === 4 ? 'p' : null,
      time_period: quarterlyPeriod(year, quarter),
      territory: CLUJ_NAPOCA,
      unit: UNIT_PERSOANE,
      classifications: [
        { type_code: 'SEXE', type_name_ro: 'Sexe', code: 'total', name_ro: 'Total' },
      ],
    })),
)

const POP108D_OBSERVATIONS: readonly InsObservation[] = [2022, 2023, 2024].map(
  (year) => ({
    dataset_code: 'POP108D',
    value: `${286400 + (year - 2022) * 1150}`,
    value_status: null,
    time_period: annualPeriod(year),
    territory: CLUJ_NAPOCA,
    unit: UNIT_PERSOANE,
    classifications: [
      { type_code: 'SEXE', type_name_ro: 'Sexe', code: 'total', name_ro: 'Total' },
    ],
  }),
)

/** `TUR101C` is absent on purpose: catalog-only datasets have no facts. */
export const MOCK_DETAIL_OBSERVATIONS: ReadonlyMap<
  string,
  readonly InsObservation[]
> = new Map([
  ['POP107D', POP107D_OBSERVATIONS],
  ['POP108D', POP108D_OBSERVATIONS],
  ['SOM101F', SOM101F_OBSERVATIONS],
])
