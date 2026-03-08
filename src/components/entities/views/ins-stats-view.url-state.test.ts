import { describe, expect, it } from 'vitest'

import {
  normalizeSeriesSelectionForUrl,
  parseInsUrlState,
  parseSeriesSelection,
  serializeSeriesSelection,
  writeInsUrlState,
} from './ins-stats-view.url-state'

describe('ins-stats-view url state helpers', () => {
  it('parses and serializes series selection deterministically', () => {
    const parsed = parseSeriesSelection('SEX:TOTAL,F;PROD:A')
    expect(parsed).toEqual({
      SEX: ['TOTAL', 'F'],
      PROD: ['A'],
    })

    const serialized = serializeSeriesSelection(parsed)
    expect(serialized).toBe('PROD:A;SEX:TOTAL,F')
  })

  it('ignores invalid series segments', () => {
    const parsed = parseSeriesSelection('  ;bad key:A;GOOD:1,2;;MAL: ')
    expect(parsed).toEqual({
      GOOD: ['1', '2'],
    })
  })

  it('normalizes fallback/id selection codes for URL', () => {
    const normalized = normalizeSeriesSelectionForUrl({
      PROD: ['fallback:AB|1|label', ' id:42 ', 'AB'],
    })

    expect(normalized).toEqual({
      PROD: ['AB', 'id:42'],
    })
  })

  it('parses URL state with safe defaults', () => {
    const state = parseInsUrlState(
      new URLSearchParams(
        'insDataset=pop107d&insSearch=abc&insRoot=999&insTemporal=bad&insExplorer=bad&insSeries=SEX:TOTAL&insUnit=PERS'
      )
    )

    expect(state).toEqual({
      datasetCode: 'POP107D',
      search: 'abc',
      rootCode: '',
      temporalSplit: 'all',
      explorerMode: 'collapsed',
      seriesSelection: { SEX: ['TOTAL'] },
      unitKey: 'PERS',
    })
  })

  it('writes URL state while preserving unrelated query params', () => {
    window.history.replaceState({}, '', '/entities/1?foo=bar')

    writeInsUrlState({
      datasetCode: 'POP107D',
      search: 'domiciliu',
      rootCode: '1',
      temporalSplit: 'year',
      explorerMode: 'expanded',
      seriesSelection: { PROD: ['A'] },
      unitKey: 'PERS',
    })

    const params = new URLSearchParams(window.location.search)
    expect(params.get('foo')).toBe('bar')
    expect(params.get('insDataset')).toBe('POP107D')
    expect(params.get('insSearch')).toBe('domiciliu')
    expect(params.get('insRoot')).toBe('1')
    expect(params.get('insTemporal')).toBe('year')
    expect(params.get('insExplorer')).toBe('expanded')
    expect(params.get('insSeries')).toBe('PROD:A')
    expect(params.get('insUnit')).toBe('PERS')
  })
})
