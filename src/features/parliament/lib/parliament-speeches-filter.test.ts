import { describe, expect, it } from 'vitest'
import type { ParliamentSpeechesSearch } from '@/schemas/parliament'
import {
  buildParliamentSpeechesFilter,
  countActiveParliamentSpeechFilters,
  expectedSearchDepth,
  getParliamentSpeechQ,
  isSpeechSearchBounded,
  speechWindowDays,
} from './parliament-speeches-filter'

const YEAR = { year: 2026 }

describe('buildParliamentSpeechesFilter (list shape — always bounded)', () => {
  it('injects the selected year window when no explicit bound is active', () => {
    expect(buildParliamentSpeechesFilter({}, YEAR)).toEqual({
      spokenAt: { gte: '2026-01-01', lte: '2026-12-31' },
    })
    // q travels separately; an is carried via options.year — neither adds facets.
    expect(buildParliamentSpeechesFilter({ q: 'buget' }, YEAR)).toEqual({
      spokenAt: { gte: '2026-01-01', lte: '2026-12-31' },
    })
  })

  it('a speaker bound suppresses the injected year window', () => {
    expect(
      buildParliamentSpeechesFilter({ vorbitor: '2:2020:12' }, YEAR),
    ).toEqual({ mandateKey: { eq: '2:2020:12' } })
  })

  it('an explicit full range is passed through (day-truncated)', () => {
    expect(
      buildParliamentSpeechesFilter(
        { from: '2026-02-01', to: '2026-03-15T00:00:00Z' },
        YEAR,
      ),
    ).toEqual({ spokenAt: { gte: '2026-02-01', lte: '2026-03-15' } })
  })

  it('a half-open range is closed with the year edge (stays server-valid)', () => {
    expect(buildParliamentSpeechesFilter({ from: '2026-06-01' }, YEAR)).toEqual({
      spokenAt: { gte: '2026-06-01', lte: '2026-12-31' },
    })
    expect(buildParliamentSpeechesFilter({ to: '2026-06-30' }, YEAR)).toEqual({
      spokenAt: { gte: '2026-01-01', lte: '2026-06-30' },
    })
  })

  it('maps the camera facet to GraphQL chamber tokens', () => {
    expect(
      buildParliamentSpeechesFilter({ camera: 'camera' }, YEAR)?.chamber,
    ).toEqual({ eq: 'camera_deputatilor' })
    expect(
      buildParliamentSpeechesFilter({ camera: 'senat' }, YEAR)?.chamber,
    ).toEqual({ eq: 'senat' })
    expect(
      buildParliamentSpeechesFilter({ camera: 'comun' }, YEAR)?.chamber,
    ).toEqual({ eq: 'comun' })
  })

  it('composes speaker + chamber + explicit range', () => {
    const search: ParliamentSpeechesSearch = {
      vorbitor: '2:2020:12',
      camera: 'comun',
      from: '2026-01-01',
      to: '2026-01-31',
    }
    expect(buildParliamentSpeechesFilter(search, YEAR)).toEqual({
      mandateKey: { eq: '2:2020:12' },
      chamber: { eq: 'comun' },
      spokenAt: { gte: '2026-01-01', lte: '2026-01-31' },
    })
  })
})

describe('buildParliamentSpeechesFilter (stripDate — activity shape)', () => {
  it('drops all dates, including the injected year window', () => {
    expect(
      buildParliamentSpeechesFilter(
        { from: '2026-01-01', to: '2026-03-31' },
        { ...YEAR, stripDate: true },
      ),
    ).toBeUndefined()
    expect(
      buildParliamentSpeechesFilter({}, { ...YEAR, stripDate: true }),
    ).toBeUndefined()
  })

  it('keeps speaker and chamber facets', () => {
    expect(
      buildParliamentSpeechesFilter(
        { vorbitor: '2:2020:12', camera: 'senat', from: '2026-01-01' },
        { ...YEAR, stripDate: true },
      ),
    ).toEqual({ mandateKey: { eq: '2:2020:12' }, chamber: { eq: 'senat' } })
  })
})

describe('speechWindowDays', () => {
  it('computes an inclusive day span', () => {
    expect(speechWindowDays('2026-01-01', '2026-01-01')).toBe(1)
    expect(speechWindowDays('2026-01-01', '2026-04-02')).toBe(92)
    // Leap year: 2024 has 366 days.
    expect(speechWindowDays('2024-01-01', '2024-12-31')).toBe(366)
  })

  it('rejects half-open, inverted, and malformed windows', () => {
    expect(speechWindowDays('2026-01-01', undefined)).toBeNull()
    expect(speechWindowDays(undefined, '2026-01-01')).toBeNull()
    expect(speechWindowDays('2026-02-01', '2026-01-01')).toBeNull()
    expect(speechWindowDays('junk', '2026-01-01')).toBeNull()
  })
})

describe('isSpeechSearchBounded / expectedSearchDepth (pre-fetch hint)', () => {
  it('a speaker bound always qualifies for full-text depth', () => {
    expect(isSpeechSearchBounded({ vorbitor: '2:2020:12' })).toBe(true)
    expect(expectedSearchDepth({ vorbitor: '2:2020:12' })).toBe('FULL_TEXT')
  })

  it('a window of at most 92 days qualifies; 93 does not', () => {
    expect(
      isSpeechSearchBounded({ from: '2026-01-01', to: '2026-04-02' }),
    ).toBe(true)
    expect(
      isSpeechSearchBounded({ from: '2026-01-01', to: '2026-04-03' }),
    ).toBe(false)
  })

  it('no bound (the default year window) is title/summary depth', () => {
    expect(isSpeechSearchBounded({})).toBe(false)
    expect(expectedSearchDepth({ q: 'buget' })).toBe('TITLE_SUMMARY')
  })
})

describe('getParliamentSpeechQ / countActiveParliamentSpeechFilters', () => {
  it('normalizes q and counts facets (an never counts)', () => {
    expect(getParliamentSpeechQ({ q: '  buget  ' })).toBe('buget')
    expect(getParliamentSpeechQ({})).toBeUndefined()
    expect(countActiveParliamentSpeechFilters({})).toBe(0)
    expect(countActiveParliamentSpeechFilters({ an: 2026 })).toBe(0)
    expect(
      countActiveParliamentSpeechFilters({
        vorbitor: 'x',
        camera: 'senat',
        from: '2026-01-01',
        q: 'buget',
      }),
    ).toBe(4)
  })
})
