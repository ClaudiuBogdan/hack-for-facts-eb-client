import { describe, expect, it } from 'vitest'
import { detailDataset, detailObservation } from '../test/detail-fixtures'
import type { EffectiveScope } from './dataset-selection'
import { buildCompareSearch, rowTerritoryPin } from './detail-compare-link'

const dataset = detailDataset()

function scope(overrides: Partial<EffectiveScope> = {}): EffectiveScope {
  return {
    territory: null,
    territoryMode: 'national-default',
    territoryDefaulted: true,
    classifications: new Map([
      ['D0', '931'],
      ['D1', '107'],
    ]),
    defaultedTypes: new Set(['D0']),
    unitCode: '0',
    unitDefaulted: true,
    periodicity: 'ANNUAL',
    ...overrides,
  }
}

describe('buildCompareSearch', () => {
  it('carries the series on screen — its non-geographic members, unit and cadence', () => {
    const search = buildCompareSearch({
      dataset,
      scope: scope(),
      sampleRow: detailObservation(2025),
      periodicity: 'ANNUAL',
      complete: true,
    })
    expect(search).toEqual({
      cod: 'POP107D',
      teritorii: ['cod:RO'],
      clasificari: ['D1:107'],
      unitate: '0',
      frecventa: 'ANNUAL',
    })
  })

  it('compares from the territory the scope applies when the comparison can hold it', () => {
    const search = buildCompareSearch({
      dataset,
      scope: scope({ territory: { kind: 'cod', value: 'TR' }, territoryMode: 'explicit' }),
      sampleRow: null,
      periodicity: 'ANNUAL',
      complete: true,
    })
    expect(search.teritorii).toEqual(['cod:TR'])
  })

  it('does not forward a region the comparison would drop; the row’s own place stands in', () => {
    const county = detailObservation(2025, {
      territory: { code: 'CJ', siruta_code: null, level: 'NUTS3', name_ro: 'Cluj' },
    })
    const search = buildCompareSearch({
      dataset,
      scope: scope({ territory: { kind: 'cod', value: 'RO11' }, territoryMode: 'explicit' }),
      sampleRow: county,
      periodicity: 'ANNUAL',
      complete: true,
    })
    expect(search.teritorii).toEqual(['cod:CJ'])
  })

  it('sends the dataset and the place alone for a partial selection or an uncharted cadence', () => {
    const partial = buildCompareSearch({
      dataset,
      scope: scope(),
      sampleRow: detailObservation(2025),
      periodicity: 'ANNUAL',
      complete: false,
    })
    expect(partial).toEqual({ cod: 'POP107D', teritorii: ['cod:RO'] })
    const semestrial = buildCompareSearch({
      dataset,
      scope: scope({ periodicity: 'SEMESTRIAL' }),
      sampleRow: detailObservation(2025),
      periodicity: 'SEMESTRIAL',
      complete: true,
    })
    expect(semestrial).toEqual({ cod: 'POP107D', teritorii: ['cod:RO'] })
  })
})

describe('rowTerritoryPin', () => {
  it('names a locality by SIRUTA, a county by code, the country as RO, and a region not at all', () => {
    expect(
      rowTerritoryPin(
        detailObservation(2025, { territory: { code: '54975', siruta_code: '54975', level: 'LAU', name_ro: 'Cluj-Napoca' } }),
      ),
    ).toBe('siruta:54975')
    expect(
      rowTerritoryPin(detailObservation(2025, { territory: { code: 'CJ', siruta_code: null, level: 'NUTS3', name_ro: 'Cluj' } })),
    ).toBe('cod:CJ')
    expect(rowTerritoryPin(detailObservation(2025))).toBe('cod:RO')
    expect(
      rowTerritoryPin(
        detailObservation(2025, { territory: { code: 'RO11', siruta_code: null, level: 'NUTS2', name_ro: 'Nord-Vest' } }),
      ),
    ).toBeNull()
    expect(rowTerritoryPin(null)).toBeNull()
  })
})
