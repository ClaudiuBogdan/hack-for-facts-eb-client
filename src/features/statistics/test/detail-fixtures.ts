import type { InsDatasetDetails, NativeInsObservation } from '@/schemas/ins'
import type {
  StatisticsDatasetTier0,
  StatisticsLatestValue,
} from '@/schemas/statistics'

/**
 * A synthetic POP107D in the native contract: a territorial axis, a
 * classification axis, time and unit — the smallest matrix that exercises
 * every path of the detail page's selection and resolution.
 */
export function detailDataset(
  overrides: Partial<InsDatasetDetails> = {},
): InsDatasetDetails {
  return {
    id: 'dataset:POP107D',
    code: 'POP107D',
    name_ro: 'Populația după domiciliu',
    name_en: null,
    definition_ro: null,
    definition_en: null,
    periodicity: ['ANNUAL'],
    year_range: [1992, 2025],
    has_uat_data: true,
    has_county_data: true,
    has_siruta: true,
    sync_status: 'SYNCED',
    data_status: 'AVAILABLE',
    context_code: '1012',
    context_name_ro: null,
    context_name_en: null,
    context_path: null,
    metadata: { revision_id: '1', transform_contract_sha256: 'a'.repeat(64) },
    dimension_count: 4,
    dimensions: [
      {
        index: 0,
        type: 'TERRITORIAL',
        label_ro: 'Județe',
        option_count: 42,
        classification_type: { code: 'D0' },
      },
      {
        index: 1,
        type: 'CLASSIFICATION',
        label_ro: 'Sexe',
        option_count: 3,
        classification_type: { code: 'D1', name_ro: 'Sexe' },
      },
      { index: 2, type: 'TEMPORAL', classification_type: null },
      { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
    ],
    ...overrides,
  }
}

/** The server-resolved national total for 2025. */
export function detailLatest(
  overrides: Partial<StatisticsLatestValue> = {},
): StatisticsLatestValue {
  return {
    datasetCode: 'POP107D',
    datasetNameRo: 'Populația după domiciliu',
    datasetNameEn: null,
    periodicity: ['ANNUAL'],
    matchStrategy: 'TOTAL_FALLBACK',
    hasData: true,
    value: '21739373',
    valueStatus: null,
    unitCode: '0',
    unitSymbol: 'pers.',
    unitNameRo: 'Numar persoane',
    period: '2025',
    resolvedPeriodicity: 'ANNUAL',
    resolvedClassifications: [
      { typeCode: 'D0', code: '931', nameRo: 'România' },
      { typeCode: 'D1', code: '105', nameRo: 'Total' },
    ],
    ...overrides,
  }
}

export function detailTier0(
  overrides: Partial<StatisticsDatasetTier0> = {},
): StatisticsDatasetTier0 {
  return {
    nativeContract: 'native-v1',
    dataset: detailDataset(),
    latest: detailLatest(),
    ...overrides,
  }
}

/** One annual cell of the national total, with a complete source coordinate. */
export function detailObservation(
  year: number,
  overrides: Partial<NativeInsObservation> = {},
): NativeInsObservation {
  return {
    id: `source-${year}`,
    dataset_code: 'POP107D',
    value: String(21_000_000 + year),
    value_status: null,
    time_period: {
      iso_period: String(year),
      year,
      quarter: null,
      month: null,
      periodicity: 'ANNUAL',
    },
    territory: {
      code: 'RO',
      siruta_code: null,
      level: 'NATIONAL',
      name_ro: 'TOTAL',
    },
    unit: { code: '0', symbol: 'pers.', name_ro: 'Numar persoane' },
    classifications: [
      { type_code: 'D0', code: '931', name_ro: 'România' },
      { type_code: 'D1', code: '105', name_ro: 'Total' },
    ],
    dimensions: {
      geography: {
        pairs: [[0, 931]],
        resolution: 'EXACT',
        flags: [],
        resolvedTerritory: { code: 'RO', level: 'NATIONAL' },
        contextTerritory: null,
        applicableRules: [],
        qualified: false,
      },
    },
    ...overrides,
  }
}
