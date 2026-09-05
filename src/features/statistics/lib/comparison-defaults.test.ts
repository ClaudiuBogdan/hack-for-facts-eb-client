import { describe, expect, it } from 'vitest'
import type { InsDatasetDetails, NativeInsObservation } from '@/schemas/ins'
import type { StatisticsLatestValue } from '@/schemas/statistics'
import { insSourceDescriptorSchema } from '@/lib/ins/source-contract'
import { resolveComparisonDefaults } from './comparison-defaults'

const dataset: InsDatasetDetails = {
  id: 'TEST',
  code: 'TEST',
  periodicity: ['ANNUAL'],
  dimension_count: 5,
  has_uat_data: true,
  has_county_data: true,
  has_siruta: true,
  dimensions: [
    { index: 0, type: 'CLASSIFICATION', classification_type: { code: 'D0' } },
    { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' } },
    { index: 2, type: 'TERRITORIAL', classification_type: { code: 'D2' } },
    { index: 3, type: 'TEMPORAL', classification_type: null },
    { index: 4, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
}
const base: StatisticsLatestValue = {
  datasetCode: 'TEST',
  datasetNameRo: null,
  datasetNameEn: null,
  periodicity: ['ANNUAL'],
  matchStrategy: 'PREFERRED_CLASSIFICATION',
  hasData: true,
  value: '12.340',
  valueStatus: null,
  unitCode: '0',
  unitSymbol: null,
  unitNameRo: null,
  period: '2025',
  resolvedPeriodicity: 'ANNUAL',
  resolvedClassifications: [
    { typeCode: 'D0', code: '100', nameRo: 'Category' },
    { typeCode: 'D1', code: '931', nameRo: 'National source axis 1' },
    { typeCode: 'D2', code: '932', nameRo: 'National source axis 2' },
  ],
}

const descriptor = insSourceDescriptorSchema.parse({
  ...dataset,
  metadata: {
    revision_id: '1',
    custody_sha256: 'a'.repeat(64),
    transform_contract_sha256: 'b'.repeat(64),
  },
})
const observation: NativeInsObservation = {
  id: 'synthetic',
  dataset_code: 'TEST',
  value: '12.340',
  time_period: { iso_period: '2025', year: 2025, periodicity: 'ANNUAL' },
  unit: { code: '0' },
  classifications: base.resolvedClassifications.map((c) => ({
    type_code: c.typeCode,
    code: c.code,
  })),
  dimensions: {
    geography: {
      pairs: [
        [1, 931],
        [2, 932],
      ],
      resolution: 'EXACT',
      flags: [],
      applicableRules: [],
      qualified: false,
      resolvedTerritory: { code: 'RO', level: 'NATIONAL' },
      contextTerritory: null,
    },
  },
}
const latest: StatisticsLatestValue = {
  ...base,
  source: { descriptor, observation, geographicWitnesses: [] },
}
const noData: StatisticsLatestValue = {
  ...latest,
  hasData: false,
  matchStrategy: 'NO_DATA',
  resolvedClassifications: [],
  unitCode: null,
  resolvedPeriodicity: null,
  source: { descriptor, observation: null, geographicWitnesses: [] },
}
function resolve(
  values: readonly StatisticsLatestValue[],
  extra: Partial<Parameters<typeof resolveComparisonDefaults>[0]> = {},
) {
  return resolveComparisonDefaults({ dataset, latest: values, ...extra })
}
describe('native comparison defaults', () => {
  it('uses agreeing source defaults and keeps geographic axes out of shared pins', () => {
    const result = resolve([latest, latest])
    expect([...result.pins]).toEqual([['D0', '100']])
    expect(result).toMatchObject({ ready: true, unit: '0', cadence: 'ANNUAL' })
  })
  it('accepts one certified candidate while no-data territories contribute no invented defaults', () => {
    expect(resolve([latest, noData]).ready).toBe(true)
    expect(resolve([noData])).toMatchObject({
      ready: false,
      unit: null,
      cadence: null,
      unresolvedAxes: ['D0'],
    })
    expect(resolve([]).ready).toBe(false)
  })
  it('requires agreement for every omitted field', () => {
    const differing: StatisticsLatestValue = {
      ...latest,
      source: {
        descriptor,
        geographicWitnesses: [],
        observation: {
          ...observation,
          id: 'different-source',
          unit: { code: '9' },
          time_period: {
            iso_period: '2025-01',
            year: 2025,
            month: 1,
            periodicity: 'MONTHLY',
          },
          classifications: observation.classifications.map((c) =>
            c.type_code === 'D0' ? { ...c, code: '101' } : c,
          ),
        },
      },
      unitCode: '9',
      resolvedPeriodicity: 'MONTHLY' as const,
      resolvedClassifications: latest.resolvedClassifications.map((c) =>
        c.typeCode === 'D0' ? { ...c, code: '101' } : c,
      ),
    }
    expect(resolve([latest, differing])).toMatchObject({
      ready: false,
      unit: null,
      cadence: null,
      unresolvedAxes: ['D0'],
    })
  })
  it('never guesses defaults from a partial explicit selection', () => {
    expect(resolve([latest], { classifications: ['D0:100'] })).toMatchObject({
      ready: false,
      unit: null,
      cadence: null,
    })
    expect(
      resolve([latest], {
        classifications: ['D0:100'],
        unit: 0,
        cadence: 'ANNUAL',
      }).ready,
    ).toBe(true)
  })
  it('ambiguous bootstrap outcomes do not certify rows or prevent a complete explicit selection', () => {
    const ambiguous = {
      ...noData,
      matchStrategy: 'AMBIGUOUS_GEOGRAPHY' as const,
    }
    expect(resolve([ambiguous]).ready).toBe(false)
    expect(
      resolve([ambiguous], {
        classifications: ['D0:100'],
        unit: '0',
        cadence: 'ANNUAL',
      }).ready,
    ).toBe(true)
  })
  it.each([
    { classifications: ['D1:931'] },
    { classifications: ['D0:100', 'D0:100'] },
    { classifications: ['SEX:TOTAL'] },
    { unit: '00' },
    { cadence: 'RANGE' },
  ])('preserves invalid explicit choices as issues: %j', (extra) => {
    const result = resolve([latest], extra)
    expect(result.ready).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
  })
  it('rejects an uncertified data-bearing default instead of treating it as no data', () => {
    expect(() => resolve([{ ...latest, source: undefined }])).toThrow(
      'Invalid native',
    )
  })
})
