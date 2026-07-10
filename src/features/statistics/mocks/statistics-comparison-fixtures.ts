import type { InsObservation, InsTimePeriod } from '@/schemas/ins'
import type { ComparisonDatasetMeta } from '../api/comparisons-api'

/**
 * Mock fixtures for the local comparisons page.
 *
 * These are EXAMPLES shaped like the live INS serving contract, not claimed
 * real facts. They deliberately cover:
 * - a classification dimension with a `Total` option (exercises auto-pinning)
 *   and one without (exercises "we will not guess");
 * - a unit dimension, so the unit pin renders;
 * - values as Decimal STRINGS, as the wire sends them;
 * - a territory (Dej) that genuinely lacks the latest year, so the missing-cell
 *   path is always on screen in mock mode;
 * - a territory (Turda) with a `value: null` cell, so "present but suppressed"
 *   is distinguishable from "absent".
 */

const MOCK_PERIOD_YEARS = [2020, 2021, 2022, 2023, 2024] as const

/** The year Dej has no observation for. */
export const MOCK_MISSING_LATEST_SIRUTA = '54993'

export const MOCK_COMPARISON_DATASET: ComparisonDatasetMeta = {
  code: 'POP107D',
  nameRo: 'Populația după domiciliu pe sexe și grupe de vârstă',
  nameEn: 'Resident population by sex and age group',
  classifications: [
    {
      index: 2,
      typeCode: 'SEX',
      label: 'Sexe',
      options: [
        { code: 'SEX_T', label: 'Total' },
        { code: 'SEX_M', label: 'Masculin' },
        { code: 'SEX_F', label: 'Feminin' },
      ],
    },
    {
      index: 3,
      typeCode: 'VARSTA',
      label: 'Grupe de vârstă',
      options: [
        { code: 'AGE_T', label: 'Total' },
        { code: 'AGE_0_14', label: '0-14 ani' },
        { code: 'AGE_15_64', label: '15-64 ani' },
      ],
    },
  ],
  units: [
    { code: 'NR_PERS', label: 'Număr persoane' },
    { code: 'MII_PERS', label: 'Mii persoane' },
  ],
}

/** A second dataset with no `Total` classification option, to exercise the unpinned path. */
export const MOCK_COMPARISON_DATASET_NO_TOTAL: ComparisonDatasetMeta = {
  code: 'FOM104D',
  nameRo: 'Numărul mediu al salariaților pe activități economice',
  nameEn: 'Average number of employees by economic activity',
  classifications: [
    {
      index: 2,
      typeCode: 'CAEN',
      label: 'Activități economice',
      options: [
        { code: 'CAEN_A', label: 'Agricultură' },
        { code: 'CAEN_C', label: 'Industrie prelucrătoare' },
      ],
    },
  ],
  units: [{ code: 'NR_PERS', label: 'Număr persoane' }],
}

export const MOCK_COMPARISON_DATASETS: readonly ComparisonDatasetMeta[] = [
  MOCK_COMPARISON_DATASET,
  MOCK_COMPARISON_DATASET_NO_TOTAL,
]

type TerritorySeed = {
  readonly siruta: string
  readonly name: string
  /** Base population in 2020; later years drift from it. */
  readonly base: number
  /** Years this territory has NO observation for. */
  readonly missingYears?: readonly number[]
  /** Years this territory reports a suppressed (null) value for. */
  readonly suppressedYears?: readonly number[]
}

const TERRITORY_SEEDS: readonly TerritorySeed[] = [
  { siruta: '54975', name: 'Municipiul Cluj-Napoca', base: 286598 },
  { siruta: '54984', name: 'Municipiul Turda', base: 43302, suppressedYears: [2021] },
  // Dej lacks the latest year — the missing-cell case the table renders as "—".
  { siruta: '54993', name: 'Municipiul Dej', base: 32118, missingYears: [2024] },
  { siruta: '114523', name: 'Municipiul Târgu Mureș', base: 134290 },
  { siruta: '38357', name: 'Municipiul Timișoara', base: 250849 },
  { siruta: '26564', name: 'Municipiul Iași', base: 271692 },
]

function annualPeriod(year: number): InsTimePeriod {
  return { iso_period: String(year), year, periodicity: 'ANNUAL' }
}

/**
 * Deterministic drift so charts show non-flat lines without a random seed.
 * `year - 2020` steps of ±0.4% keep the numbers plausible and stable.
 */
function seededValue(base: number, year: number, index: number): string {
  const step = year - MOCK_PERIOD_YEARS[0]
  const direction = index % 2 === 0 ? 1 : -1
  const drift = 1 + direction * 0.004 * step
  return String(Math.round(base * drift))
}

function buildObservations(): readonly InsObservation[] {
  const observations: InsObservation[] = []

  TERRITORY_SEEDS.forEach((seed, index) => {
    for (const year of MOCK_PERIOD_YEARS) {
      if (seed.missingYears?.includes(year)) continue

      const suppressed = seed.suppressedYears?.includes(year) ?? false

      observations.push({
        dataset_code: MOCK_COMPARISON_DATASET.code,
        value: suppressed ? null : seededValue(seed.base, year, index),
        value_status: suppressed ? 'CONFIDENTIAL' : null,
        time_period: annualPeriod(year),
        territory: {
          code: seed.siruta,
          siruta_code: seed.siruta,
          level: 'LAU',
          name_ro: seed.name,
        },
        unit: { code: 'NR_PERS', symbol: 'Nr', name_ro: 'Număr persoane' },
        classifications: [
          { type_code: 'SEX', code: 'SEX_T', name_ro: 'Total' },
          { type_code: 'VARSTA', code: 'AGE_T', name_ro: 'Total' },
        ],
      })
    }
  })

  return observations
}

/** Every mock observation, across all six territories and five years. */
export const MOCK_COMPARISON_OBSERVATIONS: readonly InsObservation[] = buildObservations()
