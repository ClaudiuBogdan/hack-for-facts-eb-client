import { describe, expect, it } from 'vitest'
import {
  legalChangesSearchSchema,
  legalFinderSearchSchema,
  legalReaderSearchSchema,
} from './legal'

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

  it('parses an old view combined with a window — the route forwards it', () => {
    // An old link can carry both; the SCHEMA keeps them (each is valid alone)
    // and the route forwards them to the new keys, the undated tab without
    // its window — pinned in legal-changes-address.test.ts, not here.
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

  it('drops a null q as junk, never as the literal text "null"', () => {
    expect(legalFinderSearchSchema.parse({ q: null }).q).toBeUndefined()
    expect(legalFinderSearchSchema.parse({ q: '' }).q).toBeUndefined()
  })

  it('keeps a boolean q as the word typed: only a native form sends it bare (astra-client-11)', () => {
    expect(legalFinderSearchSchema.parse({ q: true }).q).toBe('true')
    expect(legalFinderSearchSchema.parse({ q: false }).q).toBe('false')
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

/**
 * `/legislation/acts/$actId?doc=` — the router JSON-parses the value, so a bare
 * `?doc=54260` arrives as a NUMBER and failed the string schema, erroring the
 * route (I-17); the quoted form arrived as a string. Both name the same id.
 */
describe('legalReaderSearchSchema', () => {
  it('reads a numeric and a quoted document id as the same string', () => {
    expect(legalReaderSearchSchema.parse({ doc: 54260 })).toEqual({ doc: '54260' })
    expect(legalReaderSearchSchema.parse({ doc: '54260' })).toEqual({ doc: '54260' })
  })

  it('degrades a junk document id to the canonical text instead of erroring', () => {
    expect(legalReaderSearchSchema.parse({ doc: true }).doc).toBeUndefined()
    expect(legalReaderSearchSchema.parse({ doc: -1 }).doc).toBeUndefined()
    expect(legalReaderSearchSchema.parse({}).doc).toBeUndefined()
  })
})
