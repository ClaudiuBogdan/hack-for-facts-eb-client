import { describe, expect, it } from 'vitest'
import type { InsDatasetDetails } from '@/schemas/ins'
import {
  statisticsDatasetDetailSearchSchema,
  type StatisticsDatasetDetailSearch,
  type StatisticsLatestValue,
} from '@/schemas/statistics'
import {
  detailBootstrapEntity,
  editSourcePin,
  resolveDetailSelection,
} from './source-selection'
import { detailScopeKey, NATIONAL_ENTITY } from './dataset-selection'

// Synthetic two-axis geography, including source members with no canonical mapping.
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
const latest: StatisticsLatestValue = {
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
function resolve(
  search: StatisticsDatasetDetailSearch,
  defaults: StatisticsLatestValue | null = null,
) {
  return resolveDetailSelection({ search, dataset, latest: defaults })
}

describe('detail source selection', () => {
  it('uses the national default only when no explicit source selection needs interpretation', () => {
    expect(detailBootstrapEntity({})).toEqual(NATIONAL_ENTITY)
    expect(detailBootstrapEntity({ teritoriu: 'siruta:179132' })).toEqual({
      sirutaCode: '179132',
    })
    expect(detailBootstrapEntity({ teritoriu: 'cod:B' })).toEqual({
      territoryCode: 'B',
      territoryLevel: 'NUTS3',
    })
    expect(detailBootstrapEntity({ clasificari: ['D0:100'] })).toBeNull()
    expect(detailBootstrapEntity({ unitate: 0 })).toBeNull()
    expect(resolve({}, latest).canDerive).toBe(true)
  })
  it.each([
    null,
    '',
    0,
    ['cod:RO'],
    {},
    'cod:RO1',
    'siruta:0',
    'cod:0',
    'cod:01',
    'siruta:01',
    'siruta:-1',
    'siruta:1e3',
    'siruta:siruta:179132',
  ])(
    'never falls back to national facts for an invalid explicit territory %#',
    (teritoriu) => {
      const search = statisticsDatasetDetailSearchSchema.parse({ teritoriu })
      expect(search.teritoriu).toEqual(teritoriu)
      expect(detailBootstrapEntity(search)).toBeNull()
      expect(resolve(search, latest).filter).toBeNull()
      expect(resolve(search, latest).issues).toContain('territory')
    },
  )
  it.each([
    null,
    'D0:100',
    [],
    {},
    [null],
    ['D0:100', 'D0:100'],
    ['D0:100', 'D0:101'],
    ['D3:1'],
    ['D6:1'],
    ['D7:1'],
    ['D0:01'],
    ['D0:-0'],
    ['D0:1e2'],
    ['D0:2147483648'],
    ['D0:-2147483649'],
    ['D0:1:2'],
    ['SEX:TOTAL'],
  ])('preserves and rejects invalid source pins %#', (clasificari) => {
    const search = statisticsDatasetDetailSearchSchema.parse({ clasificari })
    expect(search.clasificari).toEqual(clasificari)
    const selected = resolve(search, latest)
    expect(selected.filter).toBeNull()
    expect(selected.canDerive).toBe(false)
    expect(selected.issues).toContain('classifications')
  })
  it.each(['-2147483648', '0', '2147483647'])(
    'accepts canonical source integer %s without assuming member existence',
    (code) => {
      expect(
        resolve({ clasificari: [`D0:${code}`, 'D1:0', 'D2:1'], unitate: code })
          .canDerive,
      ).toBe(true)
    },
  )
  it.each([
    null,
    '',
    '-0',
    '01',
    '2147483648',
    -2147483649,
    1.5,
    '1e3',
    {},
    ['0'],
  ])('rejects invalid unit %# without fallback', (unitate) => {
    expect(resolve({ unitate }, latest).filter).toBeNull()
    expect(resolve({ unitate }, latest).issues).toContain('unit')
  })
  it('retains numeric unit zero after URL decoding', () => {
    expect(resolve({ unitate: 0 }, latest).filter?.unitCodes).toEqual(['0'])
  })
  it('suppresses national scope and every inherited geographic pin for explicit source geography', () => {
    const result = resolve({ clasificari: ['D1:0', 'D2:-1'] }, latest)
    expect(result.scope.territoryMode).toBe('source-coordinates')
    expect(result.filter).toEqual({
      sourcePins: [
        { dimensionIndex: 0, memberCode: '100' },
        { dimensionIndex: 1, memberCode: '0' },
        { dimensionIndex: 2, memberCode: '-1' },
      ],
      unitCodes: ['0'],
    })
    expect(result.scope.defaultedTypes).toEqual(new Set(['D0']))
  })
  it('requires every geographic axis to be explicit, even with canonical territory', () => {
    for (const teritoriu of [undefined, 'siruta:179132']) {
      const result = resolve({ clasificari: ['D1:0'], teritoriu }, latest)
      expect(result.filter).toBeNull()
      expect(result.scope.classifications.has('D2')).toBe(false)
      expect(result.unresolvedDimensions.map((d) => d.index)).toEqual([2])
    }
  })
  it('keeps canonical territory as an intersection with complete source geography', () => {
    const result = resolve(
      { clasificari: ['D1:0', 'D2:-1'], teritoriu: 'siruta:179132' },
      latest,
    )
    expect(result.filter?.sirutaCodes).toEqual(['179132'])
    expect(result.filter?.sourcePins).toEqual([
      { dimensionIndex: 0, memberCode: '100' },
      { dimensionIndex: 1, memberCode: '0' },
      { dimensionIndex: 2, memberCode: '-1' },
    ])
  })
  it('allows source row inspection before all non-geographic pins and unit are selected', () => {
    const result = resolve({ clasificari: ['D1:0', 'D2:-1'] })
    expect(result.filter).not.toBeNull()
    expect(result.canDerive).toBe(false)
    expect(result.unresolvedDimensions.map((d) => d.index)).toEqual([0])
    expect(result.scope.unitCode).toBeNull()
  })
  it('does not inherit ambiguous or absent-data defaults', () => {
    for (const outcome of [
      { ...latest, matchStrategy: 'AMBIGUOUS_GEOGRAPHY' as const },
      { ...latest, hasData: false },
    ]) {
      expect(resolve({}, outcome).scope.classifications.size).toBe(0)
      expect(resolve({}, outcome).canDerive).toBe(false)
    }
  })
  it('rejects incomplete descriptor layouts before fact requests', () => {
    expect(
      resolveDetailSelection({
        search: {},
        latest,
        dataset: { ...dataset, dimensions: dataset.dimensions.slice(1) },
      }).filter,
    ).toBeNull()
  })
  it('keeps unsupported or mixed cadence from becoming a monthly default', () => {
    const selected = resolveDetailSelection({
      search: {},
      latest: null,
      dataset: { ...dataset, periodicity: ['ANNUAL', 'MONTHLY'] },
    })
    expect(selected.scope.periodicity).toBeNull()
  })
})

describe('raw selection recovery and cache identity', () => {
  it('edits only the requested axis, preserving unrelated malformed entries', () => {
    const input = ['D0:1', 'bad', null, 'D1:01', 'D0:2']
    expect(editSourcePin(input, 'D0', '0')).toEqual([
      'bad',
      null,
      'D1:01',
      'D0:0',
    ])
    expect(editSourcePin(input, 'D0', null)).toEqual(['bad', null, 'D1:01'])
    expect(editSourcePin(null, 'D0', '0')).toBeNull()
    expect(editSourcePin('invalid', 'D0', '0')).toBe('invalid')
    expect(editSourcePin(undefined, 'D0', '0')).toEqual(['D0:0'])
  })
  it.each(['teritoriu', 'clasificari', 'unitate'] as const)(
    'never aliases absent and invalid explicit %s',
    (key) => {
      expect(detailScopeKey({ [key]: null })).not.toBe(detailScopeKey({}))
      expect(detailScopeKey({ [key]: false })).not.toBe(detailScopeKey({}))
      expect(detailScopeKey({ [key]: [] })).not.toBe(detailScopeKey({}))
    },
  )
})
