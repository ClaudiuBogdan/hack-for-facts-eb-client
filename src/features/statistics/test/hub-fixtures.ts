import type {
  StatisticsHubCountyLayer,
  StatisticsHubData,
  StatisticsHubIndicator,
  StatisticsHubUnit,
} from '@/schemas/statistics'
import { hubStaticSeries } from '../lib/hub-national-series'

/**
 * Synthetic hub payloads, shaped like the live serving contract so the same
 * builders feed the fetcher test (wire shape) and the page test (domain
 * shape). The wire builders satisfy the native validators: a descriptor with
 * custody metadata and a legal dimension layout, observations with EXACT
 * geography at RO/NATIONAL — or, for a matrix with no geography axis, none.
 */

type UnitSpec = { readonly code: string; readonly symbol: string; readonly name_ro: string; readonly kind: StatisticsHubUnit }

export const HUB_UNITS = {
  persons: { code: '9685', symbol: 'persons', name_ro: 'Numar persoane', kind: 'persons' },
  count: { code: '9669', symbol: 'count', name_ro: 'Numar', kind: 'count' },
  percent: { code: '10225', symbol: 'percent', name_ro: 'Procente', kind: 'percent' },
  years: { code: '9361', symbol: 'other', name_ro: 'Ani', kind: 'years' },
  lei: { code: '9718', symbol: 'other', name_ro: 'Lei RON', kind: 'other' },
} as const satisfies Record<string, UnitSpec>

export interface HubNationalSpec {
  readonly code: string
  readonly nameRo: string
  readonly value: string | null
  readonly period: string
  readonly periodicity: 'ANNUAL' | 'MONTHLY'
  readonly unit: UnitSpec
  /** Member per classification axis, `D0` first. */
  readonly members: readonly string[]
  /** A matrix with no geography axis: every member axis is a classification, and the cell names no territory. */
  readonly nationalOnly?: boolean
}

/** The national cells the hub reads, at the values measured on 2026-09-22. */
export const HUB_NATIONAL_SPECS: readonly HubNationalSpec[] = [
  { code: 'IPC102E', nameRo: 'Indicii preturilor de consum fata de luna corespunzatoare din anul precedent', value: '110.85', period: '2026-05', periodicity: 'MONTHLY', unit: HUB_UNITS.percent, members: ['12668'], nationalOnly: true },
  { code: 'FOM106D', nameRo: 'Castigul salarial mediu net lunar', value: '5914', period: '2025-12', periodicity: 'MONTHLY', unit: HUB_UNITS.lei, members: ['23415'], nationalOnly: true },
  { code: 'SOM103B', nameRo: 'Rata somajului inregistrat la sfarsitul lunii', value: '3.2', period: '2026-05', periodicity: 'MONTHLY', unit: HUB_UNITS.percent, members: ['105', '112'] },
  { code: 'POP105A', nameRo: 'Populatia rezidenta la 1 ianuarie', value: '19043151', period: '2025', periodicity: 'ANNUAL', unit: HUB_UNITS.persons, members: ['1', '105', '108', '112'] },
  { code: 'FOM104D', nameRo: 'Numarul mediu al salariatilor', value: '5453155', period: '2024', periodicity: 'ANNUAL', unit: HUB_UNITS.persons, members: ['112', '112'] },
  { code: 'POP217A', nameRo: 'Durata medie a vietii', value: '77.45', period: '2025', periodicity: 'ANNUAL', unit: HUB_UNITS.years, members: ['108', '105', '112'] },
  { code: 'LOC101B', nameRo: 'Locuinte existente', value: '10177161', period: '2025', periodicity: 'ANNUAL', unit: HUB_UNITS.count, members: ['7388', '112', '112'] },
  { code: 'TUR104E', nameRo: 'Sosiri ale turistilor', value: '14258382', period: '2025', periodicity: 'ANNUAL', unit: HUB_UNITS.persons, members: ['9148', '112', '112'] },
  { code: 'POP201D', nameRo: 'Nascuti vii', value: '145725', period: '2025', periodicity: 'ANNUAL', unit: HUB_UNITS.persons, members: ['112', '112'] },
  { code: 'POP206D', nameRo: 'Decedati', value: '239691', period: '2025', periodicity: 'ANNUAL', unit: HUB_UNITS.persons, members: ['112', '112'] },
  { code: 'SOM103A', nameRo: 'Rata somajului', value: '3.3', period: '2025', periodicity: 'ANNUAL', unit: HUB_UNITS.percent, members: ['105', '112'] },
]

function descriptor(spec: HubNationalSpec) {
  // The last member axis is the territorial one, as on every INS dataset the
  // hub reads that has one: the national total sits on it, and the geography
  // of a cell is the pair of that axis and its member.
  const classificationDimensions = spec.members.map((_, index) => ({
    index,
    type: index === spec.members.length - 1 && !spec.nationalOnly ? 'TERRITORIAL' : 'CLASSIFICATION',
    label_ro: `D${index}`,
    label_en: `D${index}`,
    classification_type: { code: `D${index}` },
  }))
  const dimensions = [
    ...classificationDimensions,
    { index: spec.members.length, type: 'TEMPORAL', label_ro: 'Perioade', label_en: 'Periods', classification_type: null },
    { index: spec.members.length + 1, type: 'UNIT_OF_MEASURE', label_ro: 'UM', label_en: 'UM', classification_type: null },
  ]
  return {
    id: spec.code,
    code: spec.code,
    name_ro: spec.nameRo,
    name_en: spec.nameRo,
    data_status: 'AVAILABLE',
    periodicity: [spec.periodicity],
    dimension_count: dimensions.length,
    has_uat_data: true,
    has_county_data: true,
    has_siruta: true,
    metadata: { revision_id: '1', custody_sha256: 'a'.repeat(64), transform_contract_sha256: 'b'.repeat(64) },
    dimensions,
  }
}

function timePeriod(period: string, periodicity: 'ANNUAL' | 'MONTHLY') {
  const [year, month] = period.split('-')
  return { iso_period: period, year: Number(year), quarter: null, month: month ? Number(month) : null, periodicity }
}

export function nationalObservation(spec: HubNationalSpec) {
  return {
    id: `${spec.code}-RO`,
    dataset_code: spec.code,
    value: spec.value,
    value_status: null,
    time_period: timePeriod(spec.period, spec.periodicity),
    territory: spec.nationalOnly ? null : { code: 'RO', siruta_code: null, level: 'NATIONAL', name_ro: 'Romania' },
    unit: { code: spec.unit.code, symbol: spec.unit.symbol, name_ro: spec.unit.name_ro },
    classifications: spec.members.map((member, index) => ({ id: `${spec.code}-${index}`, type_code: `D${index}`, code: member, name_ro: member })),
    dimensions: {
      geography: spec.nationalOnly ? null : {
        pairs: [[spec.members.length - 1, Number(spec.members[spec.members.length - 1])]],
        resolution: 'EXACT',
        flags: [],
        qualified: false,
        resolvedTerritory: { code: 'RO', level: 'NATIONAL' },
        contextTerritory: null,
        applicableRules: [],
      },
    },
  }
}

/** The `InsLandingTiles` response for the hub's codes. */
export function hubTilesResponse(overrides: Partial<Record<string, Partial<HubNationalSpec>>> = {}) {
  return {
    latest: HUB_NATIONAL_SPECS.map((base) => {
      const spec = { ...base, ...overrides[base.code] }
      return {
        dataset: descriptor(spec),
        observation: nationalObservation(spec),
        latestPeriod: spec.period,
        hasData: true,
        matchStrategy: 'TOTAL_FALLBACK',
        geographicWitnesses: [],
      }
    }),
  }
}

export interface HubCountyRowSpec {
  readonly county: { readonly code: string; readonly name: string }
  readonly value: string
  /** Which classification axis carries the county member; omitted for a territory-dimension dataset. */
  readonly countyAxis?: number
  /** Override a member to make the row a sibling cell (a sex, an age group) rather than the total. */
  readonly memberOverrides?: Readonly<Record<number, string>>
  readonly periodicity?: 'ANNUAL' | 'MONTHLY'
  readonly unit?: UnitSpec
}

/** An `InsObservations` page for one county layer. */
export function hubCountyResponse(spec: HubNationalSpec, rows: readonly HubCountyRowSpec[], hasNextPage = false) {
  const nodes = rows.map((row, index) => {
    const members = spec.members.map((member, axis) => {
      if (row.memberOverrides?.[axis] !== undefined) return row.memberOverrides[axis]
      if (row.countyAxis === axis) return `3${index.toString().padStart(3, '0')}`
      return member
    })
    const unit = row.unit ?? spec.unit
    return {
      id: `${spec.code}-${row.county.code}-${index}`,
      dataset_code: spec.code,
      value: row.value,
      value_status: null,
      time_period: timePeriod(spec.period, row.periodicity ?? 'ANNUAL'),
      territory: { code: row.county.code, siruta_code: null, level: 'NUTS3', name_ro: row.county.name },
      unit: { code: unit.code, symbol: unit.symbol, name_ro: unit.name_ro },
      classifications: members.map((member, axis) => ({ id: `${spec.code}-${row.county.code}-${axis}`, type_code: `D${axis}`, code: member, name_ro: member })),
      dimensions: { geography: null },
    }
  })
  return {
    insObservations: {
      nodes,
      pageInfo: { totalCount: nodes.length, hasNextPage, hasPreviousPage: false },
    },
  }
}

// ---------------------------------------------------------------------------
// Domain shape, for the page
// ---------------------------------------------------------------------------

export function hubIndicator(spec: HubNationalSpec): StatisticsHubIndicator {
  return {
    code: spec.code,
    nameRo: spec.nameRo,
    value: spec.value === null ? null : Number.parseFloat(spec.value),
    rawValue: spec.value,
    valueStatus: null,
    unit: spec.unit.kind,
    unitLabel: spec.unit.name_ro,
    unitCode: spec.unit.code,
    period: spec.period,
    periodicity: spec.periodicity,
    pins: spec.members.map((member, index) => `D${index}:${member}`),
    hasGeography: !spec.nationalOnly,
    series: hubStaticSeries(spec.code)?.points ?? [],
  }
}

export function hubCountyLayer(code: string, unit: StatisticsHubUnit, unitLabel: string, period: string, values: readonly { code: string; name: string; value: number }[]): StatisticsHubCountyLayer {
  return { code, period, unit, unitLabel, values, missingCounties: [] }
}

export function hubData(overrides: Partial<StatisticsHubData> = {}): StatisticsHubData {
  return {
    nativeContract: 'hub-v1',
    indicators: HUB_NATIONAL_SPECS.map(hubIndicator),
    counties: [
      hubCountyLayer('POP217A', 'years', 'Ani', '2025', [
        { code: 'VL', name: 'Vâlcea', value: 82.01 },
        { code: 'B', name: 'București', value: 79.68 },
        { code: 'CL', name: 'Călărași', value: 74.82 },
      ]),
      hubCountyLayer('SOM103A', 'percent', 'Procente', '2025', [
        { code: 'TR', name: 'Teleorman', value: 9.3 },
        { code: 'IF', name: 'Ilfov', value: 0.5 },
      ]),
      hubCountyLayer('FOM104D', 'persons', 'Numar persoane', '2024', [
        { code: 'B', name: 'București', value: 1053348 },
        { code: 'CJ', name: 'Cluj', value: 261239 },
      ]),
    ],
    failures: [],
    ...overrides,
  }
}
