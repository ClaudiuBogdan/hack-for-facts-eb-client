import { describe, expect, it } from 'vitest'
import {
  gazetteBrowseSearchSchema,
  legalChangesSearchSchema,
  legalFinderSearchSchema,
} from './legal'

/**
 * `/legislation/gazette` URL params run through `validateSearch`: a throwing
 * schema would error the whole route on junk someone pasted into the address
 * bar. `.catch(undefined)` degrades each bad param to its default instead —
 * verified in the browser (`?year=abc&page=0&part=ZZ` renders the default
 * view); pinned here so the behaviour cannot regress silently.
 */
describe('gazetteBrowseSearchSchema', () => {
  it('passes valid filters and page through unchanged', () => {
    expect(
      gazetteBrowseSearchSchema.parse({ year: 2010, part: 'PIM', page: 2 }),
    ).toEqual({ year: 2010, part: 'PIM', page: 2 })
  })

  it('parses an empty search to all-defaults', () => {
    expect(gazetteBrowseSearchSchema.parse({})).toEqual({})
  })

  it('drops junk params to their defaults instead of erroring the route', () => {
    const parsed = gazetteBrowseSearchSchema.parse({
      year: 'abc',
      page: 0,
      part: 'ZZ',
    })
    expect(parsed.year).toBeUndefined()
    expect(parsed.page).toBeUndefined()
    expect(parsed.part).toBeUndefined()
  })

  it('rejects a below-one page and a fractional year without throwing', () => {
    expect(gazetteBrowseSearchSchema.parse({ page: -3 }).page).toBeUndefined()
    expect(
      gazetteBrowseSearchSchema.parse({ year: 2010.5 }).year,
    ).toBeUndefined()
  })

  it('admits only the eight real part codes', () => {
    expect(gazetteBrowseSearchSchema.parse({ part: 'PVII' }).part).toBe('PVII')
    expect(
      gazetteBrowseSearchSchema.parse({ part: 'PVIII' }).part,
    ).toBeUndefined()
  })
})

/**
 * `/legislation/changes` URL params, same contract: junk pasted into the
 * address bar degrades to defaults, never errors the route — and never
 * travels on to a server that would REJECT it (`legalRecentChanges` refuses
 * calendar-invalid dates as invalid input).
 */
describe('legalChangesSearchSchema', () => {
  it('passes a fully valid search through unchanged', () => {
    expect(
      legalChangesSearchSchema.parse({
        view: 'nedatate',
        kind: 'abrogare-totala',
        source: 'monitorul-oficial',
      }),
    ).toEqual({
      view: 'nedatate',
      kind: 'abrogare-totala',
      source: 'monitorul-oficial',
    })
    expect(
      legalChangesSearchSchema.parse({
        since: '2026-01-01',
        until: '2026-08-26',
      }),
    ).toEqual({ since: '2026-01-01', until: '2026-08-26' })
  })

  it('parses an empty search to all-defaults', () => {
    expect(legalChangesSearchSchema.parse({})).toEqual({})
  })

  it('drops junk view/kind/source values instead of erroring the route', () => {
    const parsed = legalChangesSearchSchema.parse({
      view: 'everything',
      kind: 'explozie',
      source: 'facebook',
    })
    expect(parsed.view).toBeUndefined()
    expect(parsed.kind).toBeUndefined()
    expect(parsed.source).toBeUndefined()
  })

  it('drops malformed dates', () => {
    expect(
      legalChangesSearchSchema.parse({ since: 'abc' }).since,
    ).toBeUndefined()
    expect(
      legalChangesSearchSchema.parse({ until: '2026-1-1' }).until,
    ).toBeUndefined()
    expect(legalChangesSearchSchema.parse({ since: 20260101 }).since,
    ).toBeUndefined()
  })

  it('drops calendar-invalid dates that V8 would silently roll over', () => {
    // '2026-02-31' does NOT parse to NaN — Date.parse rolls it to March 3rd —
    // and the server rejects it as invalid input, so the schema must catch it
    // by round-trip, not by Number.isNaN alone.
    expect(
      legalChangesSearchSchema.parse({ since: '2026-02-31' }).since,
    ).toBeUndefined()
    // A real leap day survives.
    expect(legalChangesSearchSchema.parse({ until: '2024-02-29' }).until).toBe(
      '2024-02-29',
    )
  })

  it('parses a view combined with a window — precedence is the component contract', () => {
    // A hand-edited URL can carry both; the SCHEMA keeps them (each is valid
    // alone) and the COMPONENT lets the view win, never sending the server
    // the undatedOnly+window combination it rejects — pinned in
    // legislation-changes-feed.test.tsx, not here.
    expect(
      legalChangesSearchSchema.parse({ view: 'nedatate', since: '2026-01-01' }),
    ).toEqual({ view: 'nedatate', since: '2026-01-01' })
  })
})

describe('legalFinderSearchSchema', () => {
  it('passes a query and the historical widening through unchanged', () => {
    expect(
      legalFinderSearchSchema.parse({ q: 'Legea 53/2003', historical: true }),
    ).toEqual({ q: 'Legea 53/2003', historical: true })
  })

  it('parses an empty search to the landing state', () => {
    expect(legalFinderSearchSchema.parse({})).toEqual({})
  })

  it('coerces a numeric-looking q back to text instead of dropping it', () => {
    // TanStack Router JSON-parses params: `?q=227` arrives as the NUMBER 227.
    // Dropping it would silently blank a legitimate act-number query.
    expect(legalFinderSearchSchema.parse({ q: 227 }).q).toBe('227')
  })

  it('drops null/boolean q as junk, never as the literal text "null"', () => {
    expect(legalFinderSearchSchema.parse({ q: null }).q).toBeUndefined()
    expect(legalFinderSearchSchema.parse({ q: true }).q).toBeUndefined()
    expect(legalFinderSearchSchema.parse({ q: '' }).q).toBeUndefined()
  })

  it('drops an oversized q instead of erroring the route', () => {
    expect(
      legalFinderSearchSchema.parse({ q: 'a'.repeat(401) }).q,
    ).toBeUndefined()
  })

  it('stores only historical=true — false and junk mean URL-absence', () => {
    expect(
      legalFinderSearchSchema.parse({ historical: false }).historical,
    ).toBeUndefined()
    expect(
      legalFinderSearchSchema.parse({ historical: 'da' }).historical,
    ).toBeUndefined()
  })
})
