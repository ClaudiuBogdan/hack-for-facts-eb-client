import { describe, expect, it } from 'vitest'
import { inspectSourceSeries, sourceRowSelection } from './source-series'
import {
  insSourceGeoPairsSchema,
  insSourceMemberCodeSchema,
  insSourceGeographySchema,
  validInsSourceWitnesses,
  type InsSourceDescriptor,
  type InsSourceObservation,
} from './source-contract'

const descriptor: InsSourceDescriptor = {
  code: 'POPTEST',
  dimension_count: 4,
  dimensions: [
    { index: 0, type: 'CLASSIFICATION', classification_type: { code: 'D0' } },
    { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' } },
    { index: 2, type: 'TEMPORAL', classification_type: null },
    { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
  metadata: {
    revision_id: '9007199254740993',
    transform_contract_sha256: 'b'.repeat(64),
  },
}
const observation = (
  fields: Partial<InsSourceObservation> = {},
): InsSourceObservation => ({
  id: 'opaque-cell-2024',
  dataset_code: 'POPTEST',
  unit: { code: '9685' },
  classifications: [
    { type_code: 'D0', code: '105' },
    { type_code: 'D1', code: '931' },
  ],
  time_period: { iso_period: '2024', periodicity: 'ANNUAL' },
  dimensions: {
    geography: {
      pairs: [[1, 931]],
      resolution: 'EXACT',
      flags: [],
      resolvedTerritory: { code: '54975', level: 'LAU' },
      contextTerritory: null,
      applicableRules: [],
      qualified: false,
    },
  },
  ...fields,
})
const inspect = (observations: readonly unknown[]) =>
  inspectSourceSeries({ descriptor, observations })

describe('INS source identity inspection', () => {
  it('keeps identity stable across row order, dimension order, values, labels and dates', () => {
    const current = { ...observation(), value: '7.2', label: 'Current name' }
    const old = {
      ...observation({
        id: 'old',
        time_period: { iso_period: '2023', periodicity: 'ANNUAL' },
      }),
      value: '3.1',
      label: 'Older name',
    }
    const result = inspect([current, old])
    expect(result.status).toBe('SERIES')
    expect(result).toEqual(
      inspectSourceSeries({
        descriptor: {
          ...descriptor,
          dimensions: [...descriptor.dimensions].reverse(),
        },
        observations: [
          old,
          {
            ...current,
            classifications: [...current.classifications].reverse(),
          },
        ],
      }),
    )
    if (result.status === 'SERIES')
      expect(result.selection).toEqual({
        clasificari: ['D0:105', 'D1:931'],
        unitate: '9685',
      })
  })
  it('detects disjoint-date source alternatives even when values agree', () => {
    const alternate = observation({
      id: 'other',
      time_period: { iso_period: '2023', periodicity: 'ANNUAL' },
      classifications: [
        { type_code: 'D0', code: '106' },
        { type_code: 'D1', code: '931' },
      ],
    })
    expect(inspect([observation(), alternate])).toEqual({ status: 'AMBIGUOUS' })
    expect(inspect([alternate, observation()])).toEqual({ status: 'AMBIGUOUS' })
  })
  it('does not collapse distinct geography that resolves to the same territory', () => {
    const row = observation()
    const alternate = observation({
      id: 'alternate',
      classifications: [
        { type_code: 'D0', code: '105' },
        { type_code: 'D1', code: '932' },
      ],
      dimensions: {
        geography: {
          ...row.dimensions.geography!,
          pairs: [[1, 932]],
          flags: ['spelling_variant'],
        },
      },
    })
    expect(inspect([row, alternate])).toEqual({ status: 'AMBIGUOUS' })
  })
  it('does not equate different units or datasets', () => {
    expect(
      inspect([
        observation(),
        observation({ id: 'other', unit: { code: '9507' } }),
      ]),
    ).toEqual({ status: 'AMBIGUOUS' })
    expect(inspect([observation({ dataset_code: 'OTHER' })])).toEqual({
      status: 'INVALID',
      reason: 'SOURCE_COORDINATES',
    })
  })
  it('requires exactly one cell per identity, cadence and period, including missing-value cells', () => {
    expect(
      inspect([
        observation(),
        { ...observation({ id: 'another' }), value: null },
      ]),
    ).toEqual({ status: 'INVALID', reason: 'DUPLICATE_CELL' })
    expect(
      inspect([
        observation(),
        observation({
          time_period: { iso_period: '2023', periodicity: 'ANNUAL' },
        }),
      ]),
    ).toEqual({ status: 'INVALID', reason: 'DUPLICATE_CELL' })
    expect(
      inspect([
        observation(),
        observation({
          id: 'quarter',
          time_period: { iso_period: '2024', periodicity: 'OTHER' },
        }),
      ]).status,
    ).toBe('SERIES')
  })
  it('retains qualified geographic cells without claiming modern comparability', () => {
    const row = observation()
    const qualified = {
      ...row,
      dimensions: {
        geography: {
          ...row.dimensions.geography!,
          qualified: true,
          flags: ['includes_sai'],
          resolution: 'CONTEXTUAL',
          resolvedTerritory: null,
          contextTerritory: { code: 'CJ', level: 'NUTS3' },
        },
      },
    }
    const before = structuredClone(qualified)
    expect(inspect([qualified])).toMatchObject({
      status: 'SERIES',
      anyQualified: true,
    })
    expect(qualified).toEqual(before)
  })
  it.each(
    [
      [{ type_code: 'D0', code: '105' }],
      [
        { type_code: 'D0', code: '105' },
        { type_code: 'D0', code: '105' },
      ],
      [
        { type_code: 'D0', code: '105' },
        { type_code: 'D1', code: '931' },
        { type_code: 'D2', code: '1' },
      ],
    ].map((classifications) => ({ classifications })),
  )(
    'rejects incomplete, duplicate and extra source coordinates %j',
    ({ classifications }) => {
      expect(inspect([{ ...observation(), classifications }])).toEqual({
        status: 'INVALID',
        reason: 'SOURCE_COORDINATES',
      })
    },
  )
  it('rejects geography that disagrees with the complete source classifications', () => {
    const row = observation()
    expect(
      inspect([
        {
          ...row,
          dimensions: {
            geography: { ...row.dimensions.geography!, pairs: [[1, 932]] },
          },
        },
      ]),
    ).toEqual({ status: 'INVALID', reason: 'SOURCE_COORDINATES' })
    expect(inspect([{ ...row, dimensions: { geography: null } }])).toEqual({
      status: 'INVALID',
      reason: 'SOURCE_COORDINATES',
    })
  })
  it('validates every row even after an ambiguous pair is found', () => {
    const rows = [
      observation(),
      observation({ id: 'unit2', unit: { code: '9507' } }),
      { id: 'broken' },
    ]
    expect(inspect(rows)).toEqual({ status: 'INVALID', reason: 'OBSERVATION' })
    expect(inspect([...rows].reverse())).toEqual({
      status: 'INVALID',
      reason: 'OBSERVATION',
    })
  })
  it('distinguishes absent cells from missing or partial metadata', () => {
    expect(inspect([])).toEqual({ status: 'EMPTY' })
    expect(
      inspectSourceSeries({
        descriptor: {
          ...descriptor,
          dimensions: descriptor.dimensions.map((d) =>
            d.index === 2
              ? { ...d, type: 'UNIT_OF_MEASURE' }
              : d.index === 3
                ? { ...d, type: 'TEMPORAL' }
                : d,
          ),
        },
        observations: [],
      }),
    ).toEqual({ status: 'INVALID', reason: 'DESCRIPTOR' })
    expect(inspectSourceSeries({ descriptor: null, observations: [] })).toEqual(
      { status: 'INVALID', reason: 'DESCRIPTOR' },
    )
    expect(
      inspectSourceSeries({
        descriptor: {
          ...descriptor,
          dimensions: descriptor.dimensions.slice(1),
        },
        observations: [observation()],
      }),
    ).toEqual({ status: 'INVALID', reason: 'DESCRIPTOR' })
    expect(
      inspectSourceSeries({
        descriptor: { ...descriptor, metadata: { revision_id: '1' } },
        observations: [],
      }),
    ).toEqual({ status: 'INVALID', reason: 'DESCRIPTOR' })
  })
  it('supports source datasets with no geographic dimension or classifications', () => {
    const nonGeo = {
      ...descriptor,
      dimension_count: 2,
      dimensions: [
        { index: 0, type: 'TEMPORAL', classification_type: null },
        { index: 1, type: 'UNIT_OF_MEASURE', classification_type: null },
      ],
    }
    expect(
      inspectSourceSeries({
        descriptor: nonGeo,
        observations: [
          observation({ classifications: [], dimensions: { geography: null } }),
        ],
      }).status,
    ).toBe('SERIES')
  })
  it('validates a complete row selection independently of ambiguous neighboring rows', () => {
    expect(sourceRowSelection(descriptor, observation())).toEqual({
      clasificari: ['D0:105', 'D1:931'],
      unitate: '9685',
    })
    expect(
      sourceRowSelection(descriptor, { ...observation(), classifications: [] }),
    ).toBeNull()
  })
  it('requires two distinct complete geographic witnesses only for ambiguity', () => {
    const valid = (witnesses: unknown, ambiguous = true) =>
      validInsSourceWitnesses({ descriptor, witnesses, ambiguous })
    expect(valid([[[1, 931]], [[1, 932]]])).toBe(true)
    expect(valid([[[1, 931]], [[1, 931]]])).toBe(false)
    expect(valid([[[1, 931]]])).toBe(false)
    expect(valid([[[1, 931]], [[0, 932]]])).toBe(false)
    expect(valid([], false)).toBe(true)
    expect(valid([[[1, 931]]], false)).toBe(false)
  })
  it.each(['0', '-1', '-2147483648', '1000000000', '2147483647'])(
    'retains PostgreSQL source integer %s',
    (code) => {
      expect(insSourceMemberCodeSchema.safeParse(code).success).toBe(true)
      expect(
        insSourceGeoPairsSchema.safeParse([[1, Number(code)]]).success,
      ).toBe(true)
    },
  )
  it.each(['2147483648', '-2147483649', '1.5', '01', '-0', '1e3'])(
    'rejects out-of-range and noncanonical source member %s',
    (code) => {
      expect(insSourceMemberCodeSchema.safeParse(code).success).toBe(false)
    },
  )
  it('rejects inconsistent geographic qualification without treating every flag as coverage', () => {
    const geography = observation().dimensions.geography!
    expect(
      insSourceGeographySchema.safeParse({
        ...geography,
        resolution: 'CONTEXTUAL',
      }).success,
    ).toBe(false)
    expect(
      insSourceGeographySchema.safeParse({
        ...geography,
        resolvedTerritory: null,
      }).success,
    ).toBe(false)
    expect(
      insSourceGeographySchema.safeParse({
        ...geography,
        applicableRules: [
          {
            ruleId: 'old',
            appliesFrom: '1990-01-01',
            appliesTo: '1999-12-31',
            flag: 'includes_ilfov_historical',
            kind: 'coverage',
            evidenceUrl: 'https://insse.ro',
            rationale: 'Source note',
          },
        ],
      }).success,
    ).toBe(false)
    expect(
      insSourceGeographySchema.safeParse({
        ...geography,
        flags: ['spelling_variant'],
      }).success,
    ).toBe(true)
    expect(
      insSourceGeographySchema.safeParse({ ...geography, qualified: true })
        .success,
    ).toBe(true)
  })
  it.each(
    [
      [],
      [
        [1, 931],
        [1, 932],
      ],
      [
        [2, 931],
        [1, 932],
      ],
      [[7, 931]],
      [[1, 1.5]],
    ].map((pairs) => ({ pairs })),
  )('rejects malformed geographic witnesses %j', ({ pairs }) => {
    expect(insSourceGeoPairsSchema.safeParse(pairs).success).toBe(false)
  })
})
