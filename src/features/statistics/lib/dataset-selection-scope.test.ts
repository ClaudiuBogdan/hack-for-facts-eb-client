import { describe, expect, it } from 'vitest'
import type { InsObservation } from '@/schemas/ins'
import {
  parseComparisonToken,
  parseComparisonTokens,
  buildSeriesFilter,
  detailScopeKey,
  filterExactCell,
  inferCodTerritoryLevel,
  NATIONAL_ENTITY,
  observedYearSpan,
  parseTerritoryPin,
  territoryPinToEntity,
  type EffectiveScope,
} from './dataset-selection'

const observation = (params: {
  readonly year: number
  readonly value: string | null
  readonly classifications?: readonly { type: string; code: string }[]
}): InsObservation =>
  ({
    dataset_code: 'POP107D',
    value: params.value,
    value_status: null,
    territory: null,
    unit: null,
    dimensions: null,
    classifications: (params.classifications ?? []).map((c) => ({
      type_code: c.type,
      code: c.code,
    })),
    time_period: {
      iso_period: String(params.year),
      year: params.year,
      quarter: null,
      month: null,
      periodicity: 'ANNUAL',
    },
  }) as InsObservation

describe('territory entity mapping', () => {
  it('maps cod:RO to the national entity, cod:CJ to NUTS3, digits to siruta', () => {
    expect(inferCodTerritoryLevel('RO')).toBe('NATIONAL')
    expect(inferCodTerritoryLevel('CJ')).toBe('NUTS3')
    expect(inferCodTerritoryLevel('54975')).toBe('LAU')
    // Explicit fallthrough: unknown shapes are rejected, never guessed.
    expect(inferCodTerritoryLevel('RO5')).toBeNull()
    expect(inferCodTerritoryLevel('RO99')).toBeNull()
    expect(inferCodTerritoryLevel('RO1')).toBe('NUTS1')
    expect(inferCodTerritoryLevel('RO11')).toBe('NUTS2')

    expect(territoryPinToEntity(parseTerritoryPin('cod:RO'))).toEqual({
      territoryCode: 'RO',
      territoryLevel: 'NATIONAL',
    })
    expect(territoryPinToEntity(parseTerritoryPin('cod:CJ'))).toEqual({
      territoryCode: 'CJ',
      territoryLevel: 'NUTS3',
    })
    expect(territoryPinToEntity(parseTerritoryPin('siruta:54975'))).toEqual({
      sirutaCode: '54975',
    })
    expect(territoryPinToEntity(null)).toBeNull()
    expect(NATIONAL_ENTITY.territoryLevel).toBe('NATIONAL')
  })
})

describe('buildSeriesFilter', () => {
  const scope = (overrides: Partial<EffectiveScope> = {}): EffectiveScope => ({
    territory: null,
    territoryDefaulted: true,
    classifications: new Map([
      ['SEX', 'TOTAL'],
      ['AGE_GROUP', 'TOTAL'],
    ]),
    defaultedTypes: new Set(['SEX', 'AGE_GROUP']),
    unitCode: 'PERS',
    unitDefaulted: true,
    periodicity: 'ANNUAL',
    ...overrides,
  })

  it('is ALWAYS territory-scoped: the national default sends territoryLevels', () => {
    const filter = buildSeriesFilter(scope())
    expect(filter.territoryLevels).toEqual(['NATIONAL'])
    expect(filter.classificationValueCodes).toEqual(['TOTAL'])
    expect(filter.classificationTypeCodes).toEqual(['SEX', 'AGE_GROUP'])
    expect(filter.unitCodes).toEqual(['PERS'])
  })

  it('maps cod:RO pins to the national level, never NUTS3', () => {
    const filter = buildSeriesFilter(scope({ territory: parseTerritoryPin('cod:RO'), territoryDefaulted: false }))
    expect(filter.territoryCodes).toEqual(['RO'])
    expect(filter.territoryLevels).toEqual(['NATIONAL'])
  })

  it('omits typeCodes when a fallback DIM key is present', () => {
    const filter = buildSeriesFilter(scope({ classifications: new Map([['DIM3', 'X']]), defaultedTypes: new Set() }))
    expect(filter.classificationValueCodes).toEqual(['X'])
    expect(filter.classificationTypeCodes).toBeUndefined()
  })
})

describe('filterExactCell', () => {
  it('drops sibling cells the shared-value-set server filter lets through', () => {
    const scope = new Map([
      ['SEX', 'FEMININ'],
      ['AGE_GROUP', 'TOTAL'],
    ])
    const exact = observation({
      year: 2024,
      value: '1',
      classifications: [
        { type: 'SEX', code: 'FEMININ' },
        { type: 'AGE_GROUP', code: 'TOTAL' },
      ],
    })
    // The all-TOTAL sibling ALSO matches the server's shared value set.
    const sibling = observation({
      year: 2024,
      value: '2',
      classifications: [
        { type: 'SEX', code: 'TOTAL' },
        { type: 'AGE_GROUP', code: 'TOTAL' },
      ],
    })
    const rows = filterExactCell([exact, sibling], scope)
    expect(rows).toEqual([exact])
  })

  it('passes everything through when no classifications are scoped', () => {
    const row = observation({ year: 2024, value: '1' })
    expect(filterExactCell([row], new Map())).toEqual([row])
  })
})

describe('detailScopeKey', () => {
  it('preserves raw pins and ignores paging/window params', () => {
    const a = detailScopeKey({
      clasificari: ['SEX:F', 'AGE_GROUP:TOTAL'],
      pagina: 3,
      din: 2018,
    })
    const b = detailScopeKey({
      clasificari: ['SEX:F', 'AGE_GROUP:TOTAL'],
      pana: 2022,
    })
    expect(a).toBe(b)
  })

  it('changes when the scope actually changes', () => {
    expect(detailScopeKey({ teritoriu: 'cod:CJ' })).not.toBe(
      detailScopeKey({ teritoriu: 'cod:TR' }),
    )
  })
})

describe('observedYearSpan', () => {
  it('derives the span from rows, never metadata', () => {
    expect(
      observedYearSpan([
        observation({ year: 2016, value: '1' }),
        observation({ year: 2025, value: '2' }),
      ]),
    ).toEqual({ from: 2016, to: 2025 })
    expect(observedYearSpan([])).toBeNull()
  })
})

describe('partial-pin sibling leak (why the series gates on FULL resolution)', () => {
  it('filterExactCell keeps BOTH siblings of an uncovered type — the leak', () => {
    const pinnedOnly = new Map([['SEX', 'FEMININ']])
    const rows = [
      observation({
        year: 2024,
        value: '1',
        classifications: [
          { type: 'SEX', code: 'FEMININ' },
          { type: 'AGE_GROUP', code: 'TOTAL' },
        ],
      }),
      observation({
        year: 2024,
        value: '2',
        classifications: [
          { type: 'SEX', code: 'FEMININ' },
          { type: 'AGE_GROUP', code: '0-14' },
        ],
      }),
      observation({
        year: 2024,
        value: '3',
        classifications: [
          { type: 'SEX', code: 'TOTAL' },
          { type: 'AGE_GROUP', code: 'TOTAL' },
        ],
      }),
    ]
    const kept = filterExactCell(rows, pinnedOnly)
    // The SEX filter holds, but BOTH AGE_GROUP siblings survive: a partial
    // scope cannot yield "one series" — hence seriesEnabled requires every
    // classification dimension covered.
    expect(kept).toHaveLength(2)
  })
})

describe('B12 merge-leak coercions', () => {
  it('siruta:siruta:X parses to null, numeric entries coerce, lone string is a list', () => {
    expect(parseComparisonToken('siruta:siruta:54975')).toBeNull()
    expect(parseComparisonToken(54975)).toEqual({
      token: 'siruta:54975',
      code: '54975',
      level: 'LAU',
    })
    expect(parseComparisonTokens('siruta:54975')).toEqual([
      { token: 'siruta:54975', code: '54975', level: 'LAU' },
    ])
    expect(parseComparisonTokens([54975, 'cod:CJ'])).toEqual([
      { token: 'siruta:54975', code: '54975', level: 'LAU' },
      { token: 'cod:CJ', code: 'CJ', level: 'NUTS3' },
    ])
  })
})
