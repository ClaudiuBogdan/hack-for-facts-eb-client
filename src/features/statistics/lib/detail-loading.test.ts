import { describe, expect, it, vi } from 'vitest'
import { detailLatest } from '../test/detail-fixtures'
import { knownLatestFigure } from './detail-loading'

vi.mock('./format', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./format')>()),
  activeNumberLocale: () => 'ro-RO',
}))

const known = (overrides: Partial<Parameters<typeof knownLatestFigure>[0]> = {}) =>
  knownLatestFigure({ latest: detailLatest(), canDerive: true, periodicity: 'ANNUAL', search: {}, ...overrides })

describe('knownLatestFigure', () => {
  it('shows the figure the first read resolved, grouped and unrounded, with its unit word and period', () => {
    expect(known()).toEqual({ value: '21.739.373', unit: 'persoane', period: '2025' })
  })

  it('words a bare count as the summary does, so the unit never changes on arrival', () => {
    expect(known({ latest: detailLatest({ unitSymbol: 'count', unitNameRo: 'Numar' }) })?.unit).toBe('număr')
  })

  it('shows nothing that is not exactly the figure the band will show', () => {
    // Another cell, or no cell.
    expect(known({ canDerive: false })).toBeNull()
    expect(known({ latest: null })).toBeNull()
    expect(known({ latest: detailLatest({ hasData: false }) })).toBeNull()
    expect(known({ latest: detailLatest({ matchStrategy: 'AMBIGUOUS_GEOGRAPHY' }) })).toBeNull()
    // Another cadence than the band shows, or none resolved yet.
    expect(known({ periodicity: 'MONTHLY' })).toBeNull()
    expect(known({ periodicity: null })).toBeNull()
    // No readable value — the summary says it is absent — or a flag the loading state would drop.
    expect(known({ latest: detailLatest({ value: null }) })).toBeNull()
    expect(known({ latest: detailLatest({ value: ':' }) })).toBeNull()
    expect(known({ latest: detailLatest({ valueStatus: 'p' }) })).toBeNull()
    // A unit it cannot name, which the loaded page names from the rows.
    expect(known({ latest: detailLatest({ unitNameRo: null, unitSymbol: null }) })).toBeNull()
    // A window shows its own last year, which is not the series' latest.
    expect(known({ search: { pana: 2010 } })).toBeNull()
    expect(known({ search: { din: 2010 } })).toBeNull()
  })
})
