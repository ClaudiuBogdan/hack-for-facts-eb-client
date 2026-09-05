import { describe, expect, it } from 'vitest'
import type { NativeInsObservation } from '@/schemas/ins'
import {
  comparisonPublicationKey,
  projectNativeComparison,
} from './native-comparison'

// Explicit synthetic native publication, never an adapter certification of old mocks.
const descriptor = {
  code: 'TEST',
  dimension_count: 5,
  metadata: {
    revision_id: '1',
    custody_sha256: 'a'.repeat(64),
    transform_contract_sha256: 'b'.repeat(64),
  },
  dimensions: [
    { index: 0, type: 'CLASSIFICATION', classification_type: { code: 'D0' } },
    { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' } },
    { index: 2, type: 'TERRITORIAL', classification_type: { code: 'D2' } },
    { index: 3, type: 'TEMPORAL', classification_type: null },
    { index: 4, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
}
const territories = [
  { code: 'B', level: 'NUTS3' },
  { code: '179132', level: 'LAU' },
  { code: '179141', level: 'LAU' },
]
function row(
  code = 'B',
  year = 2024,
  member = 10,
  value: string | null = '12.340',
): NativeInsObservation {
  const level = code === 'B' ? 'NUTS3' : 'LAU'
  return {
    id: `${code}:${member}:${year}`,
    dataset_code: 'TEST',
    value,
    value_status: value === null ? 'c' : null,
    unit: { code: '0', name_ro: 'Persoane' },
    time_period: { iso_period: String(year), year, periodicity: 'ANNUAL' },
    classifications: [
      { type_code: 'D0', code: '0' },
      { type_code: 'D1', code: '1' },
      { type_code: 'D2', code: String(member) },
    ],
    territory: { code, level, name_ro: code },
    dimensions: {
      geography: {
        pairs: [
          [1, 1],
          [2, member],
        ],
        resolution: 'EXACT',
        resolvedTerritory: { code, level },
        contextTerritory: null,
        flags: [],
        applicableRules: [],
        qualified: false,
      },
    },
  }
}
const project = (
  observations: readonly NativeInsObservation[],
  extra: Partial<Parameters<typeof projectNativeComparison>[0]> = {},
) =>
  projectNativeComparison({
    descriptor,
    observations,
    territories,
    classificationPins: ['D0:0'],
    unitCode: 0,
    cadence: 'ANNUAL',
    ...extra,
  })

describe('native comparison projection', () => {
  it('compares physical layout rather than mapped null versus absent display labels', () => {
    const raw = project([row()]).descriptor
    const mapped = {
      ...raw,
      dimensions: raw.dimensions.map((d) => ({
        ...d,
        label_ro: d.label_ro ?? null,
        label_en: d.label_en ?? null,
      })),
    }
    expect(comparisonPublicationKey(raw)).toBe(comparisonPublicationKey(mapped))
    expect(
      project([row()], { expectedDescriptor: mapped }).rows[0].availability,
    ).toBe('SERIES')
  })

  it('fails malformed periods even in an ambiguous territory or unselected cadence', () => {
    const malformed = row('B', 2025, 11)
    malformed.time_period.year = 2023
    expect(() => project([row(), malformed])).toThrow('period fields')
    malformed.time_period = {
      iso_period: '2025-00',
      year: 2025,
      month: 0,
      periodicity: 'MONTHLY',
    }
    expect(() => project([row(), malformed])).toThrow(
      'Invalid INS comparison source period',
    )
  })

  it('keeps county, city and sector source identities separate in selection order', () => {
    const matrix = project([
      row('179132', 2024, 20),
      row('B'),
      row('179141', 2024, 30),
    ])
    expect(matrix.rows.map((r) => r.code)).toEqual(['B', '179132', '179141'])
    expect(matrix.rows.map((r) => r.sourceSelection?.clasificari)).toEqual([
      ['D0:0', 'D1:1', 'D2:10'],
      ['D0:0', 'D1:1', 'D2:20'],
      ['D0:0', 'D1:1', 'D2:30'],
    ])
    expect(matrix.rows.every((r) => r.availability === 'SERIES')).toBe(true)
    expect(matrix.rows[0].cells['2024'].value).toBe('12.340')
  })
  it('keeps absent territories, null statuses, zero values and calendar gaps distinct', () => {
    const matrix = project([row('B', 2022, 10, '0'), row('B', 2024, 10, null)])
    expect(matrix.periods.map((p) => p.isoPeriod)).toEqual([
      '2022',
      '2023',
      '2024',
    ])
    expect(matrix.rows[0].cells['2022'].value).toBe('0')
    expect(matrix.rows[0].cells['2023']).toBeUndefined()
    expect(matrix.rows[0].cells['2024']).toMatchObject({
      value: null,
      valueStatus: 'c',
    })
    expect(matrix.rows[1]).toMatchObject({ availability: 'EMPTY', cells: {} })
  })
  it.each([2024, 2025])(
    'does not merge equal-valued source alternatives even in disjoint years %s',
    (year) => {
      const matrix = project([
        row('B'),
        row('B', year, 11),
        row('179132', 2024, 20),
      ])
      expect(matrix.rows[0]).toMatchObject({
        availability: 'AMBIGUOUS',
        cells: {},
        sourceSelection: null,
      })
      expect(matrix.rows[0].observations).toHaveLength(2)
      expect(matrix.rows[1].availability).toBe('SERIES')
    },
  )
  it('retains qualified rows with no legacy territory without treating them as missing', () => {
    const qualified = row()
    qualified.territory = null
    qualified.dimensions.geography!.qualified = true
    qualified.dimensions.geography!.flags = ['historical-coverage']
    const matrix = project([qualified])
    expect(matrix.rows[0]).toMatchObject({
      availability: 'QUALIFIED',
      cells: {},
    })
    expect(matrix.rows[0].observations).toEqual([qualified])
  })
  it('rejects duplicate source cells even when their opaque IDs differ', () => {
    const duplicate = { ...row(), id: 'other-id' }
    expect(() => project([row(), duplicate])).toThrow('DUPLICATE_CELL')
  })
  it('rejects duplicate opaque IDs across otherwise distinct source cells', () => {
    expect(() => project([row(), { ...row('B', 2025), id: row().id }])).toThrow(
      'DUPLICATE_CELL',
    )
  })
  it.each(['unit', 'classification', 'territory', 'level', 'decimal'])(
    'rejects mis-scoped or malformed %s responses',
    (field) => {
      const value = row()
      if (field === 'unit') value.unit.code = '1'
      if (field === 'classification') value.classifications[0].code = '1'
      if (field === 'territory')
        value.dimensions.geography!.resolvedTerritory!.code = 'CJ'
      if (field === 'level')
        value.dimensions.geography!.resolvedTerritory!.level = 'LAU'
      if (field === 'decimal') value.value = '12garbage'
      expect(() => project([value])).toThrow()
    },
  )
  it('fails a changed descriptor before deriving values', () => {
    const first = project([row()]).descriptor
    expect(() =>
      project([row()], {
        expectedDescriptor: {
          ...first,
          metadata: { ...first.metadata, custody_sha256: 'c'.repeat(64) },
        },
      }),
    ).toThrow('publication changed')
  })
  it('retains an explicitly absent period and rejects an invalid one', () => {
    expect(
      project([row()], { requestedPeriod: '2020' }).periods.map(
        (p) => p.isoPeriod,
      ),
    ).toEqual(['2020', '2024'])
    expect(
      project([], { requestedPeriod: '2020' }).periods.map((p) => p.isoPeriod),
    ).toEqual(['2020'])
    expect(() => project([row()], { requestedPeriod: '2020-Q1' })).toThrow(
      'Invalid requested',
    )
  })
  it('fills missing monthly buckets without adding periods outside observed endpoints', () => {
    const a = row()
    const b = row('B', 2024)
    a.time_period = {
      iso_period: '2024-01',
      year: 2024,
      month: 1,
      periodicity: 'MONTHLY',
    }
    b.id = 'february'
    b.time_period = {
      iso_period: '2024-03',
      year: 2024,
      month: 3,
      periodicity: 'MONTHLY',
    }
    const matrix = project([a, b], { cadence: 'MONTHLY' })
    expect(matrix.periods.map((p) => p.isoPeriod)).toEqual([
      '2024-01',
      '2024-02',
      '2024-03',
    ])
    expect(matrix.rows[0].cells['2024-02']).toBeUndefined()
  })
  it('inspects source identity before selecting cadence', () => {
    const monthly = row('B', 2025, 11)
    monthly.time_period = {
      iso_period: '2025-01',
      year: 2025,
      month: 1,
      periodicity: 'MONTHLY',
    }
    expect(project([row(), monthly]).rows[0].availability).toBe('AMBIGUOUS')
  })
  it('rejects inconsistent period fields and unsupported cadence', () => {
    const invalid = row()
    invalid.time_period.year = 2023
    expect(() => project([invalid])).toThrow('period fields')
    expect(() => project([row()], { cadence: 'RANGE' })).toThrow('supported')
  })
  it.each([['D1:1'], ['D0:00'], ['D0:0', 'D0:0'], ['SEX:TOTAL'], []])(
    'rejects invalid shared pins %j',
    (...pins) => {
      expect(() => project([row()], { classificationPins: pins })).toThrow(
        'selection',
      )
    },
  )
})
