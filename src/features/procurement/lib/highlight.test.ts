/**
 * Emphasis is applied to the DATABASE value, never substituted for it.
 *
 * The engine's fragment is a 200-character window of the indexed text as of the
 * last build. Rendering it as the record would truncate long titles and show
 * text the database may no longer hold — so it is used only to learn which
 * substrings matched.
 */

import { describe, expect, it } from 'vitest'

import {
  highlightsById,
  markFromFragment,
  markedTerms,
  markLiteral,
  markTerms,
  stripHighlight,
} from './highlight'

const plain = (segments: readonly { text: string; marked: boolean }[]) =>
  segments.map((s) => s.text).join('')

describe('markedTerms', () => {
  it('reads the marked substrings, longest first', () => {
    expect(markedTerms('lUCRARI DE ⟦REPARATII⟧ pe ⟦DRUM⟧')).toEqual([
      'REPARATII',
      'DRUM',
    ])
  })

  it('ignores a marker the highlighter trimmed at a fragment boundary', () => {
    expect(markedTerms('Reparatii⟧ sisteme la ⟦drumuri⟧')).toEqual(['drumuri'])
    expect(markedTerms('la ⟦COMUNALE')).toEqual([])
  })

  it('returns nothing for an unmarked fragment', () => {
    expect(markedTerms('Servicii de paza')).toEqual([])
  })
})

describe('markTerms', () => {
  it('marks the terms inside the database text and emits ITS casing', () => {
    const segments = markTerms('Lucrări de REPARAȚII curente', ['reparații'])
    expect(plain(segments)).toBe('Lucrări de REPARAȚII curente')
    expect(segments.filter((s) => s.marked).map((s) => s.text)).toEqual([
      'REPARAȚII',
    ])
  })

  it('marks every occurrence, preferring the longer of two overlapping terms', () => {
    const segments = markTerms('drumuri si drumuri comunale', [
      'drumuri comunale',
      'drumuri',
    ])
    expect(plain(segments)).toBe('drumuri si drumuri comunale')
    expect(segments.filter((s) => s.marked).map((s) => s.text)).toEqual([
      'drumuri',
      'drumuri comunale',
    ])
  })

  it('matches case-insensitively — the index may hold an older casing', () => {
    const segments = markTerms('Reparatii DRUMURI comunale', ['drumuri'])
    expect(segments.filter((s) => s.marked).map((s) => s.text)).toEqual(['DRUMURI'])
  })

  it('only marks a term that STARTS a word', () => {
    // `de` inside `modernizare` is not a match a reader would accept.
    const segments = markTerms('Lucrari de modernizare', ['de'])
    expect(segments.filter((s) => s.marked).map((s) => s.text)).toEqual(['de'])
    expect(plain(segments)).toBe('Lucrari de modernizare')
  })

  it('marks the WHOLE word the engine matched, and nothing that merely starts with it', () => {
    // The engine highlights whole tokens: a query of `drum` marks `⟦drumuri⟧`,
    // so the term IS the whole word and marking it whole-word is exact.
    expect(
      markTerms('reparatii drumuri comunale', ['drumuri']).filter((s) => s.marked),
    ).toEqual([{ text: 'drumuri', marked: true }])

    // And a term must not mark the head of an unrelated word.
    const segments = markTerms('Servicii de paza si demolare', ['de'])
    expect(segments.filter((s) => s.marked).map((s) => s.text)).toEqual(['de'])
  })

  it('marks a one-character term — `q="lot x"` matches both words', () => {
    const segments = markTerms('Contract LOT X furnizare', ['LOT', 'X'])
    expect(segments.filter((s) => s.marked).map((s) => s.text)).toEqual(['LOT', 'X'])
  })

  it('keeps offsets correct where lower-casing would change the length', () => {
    // `İ`.toLowerCase() is TWO characters. Matching against a lower-cased copy
    // drifts every later offset and marks the wrong span.
    const text = 'NOKSEL ÇELİK BORU SANAYİ A.Ş.'
    const segments = markTerms(text, ['SANAYİ'])
    expect(plain(segments)).toBe(text)
    expect(segments.filter((s) => s.marked).map((s) => s.text)).toEqual(['SANAYİ'])
  })

  it('treats a term with regex metacharacters as literal text', () => {
    const segments = markTerms('Lot A.Ş. si altele', ['A.Ş.'])
    expect(segments.filter((s) => s.marked).map((s) => s.text)).toEqual(['A.Ş.'])
    expect(markTerms('Lot AXŞY si altele', ['A.Ş.'])).toEqual([
      { text: 'Lot AXŞY si altele', marked: false },
    ])
  })

  it('leaves the text whole when a term is not in it', () => {
    // A stale index fragment naming text the database no longer holds.
    expect(markTerms('Servicii de catering', ['manusi'])).toEqual([
      { text: 'Servicii de catering', marked: false },
    ])
  })
})

describe('markFromFragment', () => {
  it('NEVER shortens a title the fragment truncated', () => {
    // Real case: a 322-character title, highlighted with fragment_size 200.
    const title = `Acord cadru ${'x'.repeat(300)} paza`
    const fragment = `Acord cadru ${'x'.repeat(150)}`
    const segments = markFromFragment(title, fragment)
    expect(plain(segments)).toBe(title)
    expect(plain(segments)).toHaveLength(title.length)
  })

  it('renders the plain database text when there is no fragment', () => {
    expect(markFromFragment('Servicii de paza', null)).toEqual([
      { text: 'Servicii de paza', marked: false },
    ])
    expect(markFromFragment('Servicii de paza', undefined)).toEqual([
      { text: 'Servicii de paza', marked: false },
    ])
  })

  it('never treats either side as markup', () => {
    const title = '<script>alert(1)</script> paza'
    const segments = markFromFragment(title, '<script>alert(1)</script> ⟦paza⟧')
    expect(plain(segments)).toBe(title)
    expect(segments.filter((s) => s.marked).map((s) => s.text)).toEqual(['paza'])
  })
})

describe('markLiteral — the database-served path', () => {
  it('marks the whole query, because that is exactly what ILIKE matched', () => {
    // Direct acquisitions are answered from the database: no fragments exist,
    // and `q` is one `ILIKE '%q%'`. Without this the reader saw results with
    // nothing marked at all.
    const segments = markLiteral(
      'MODERNIZARE DRUMURI COMUNALE IN COMUNA STANESTI',
      'drumuri comunale',
    )
    expect(segments.filter((s) => s.marked).map((s) => s.text)).toEqual([
      'DRUMURI COMUNALE',
    ])
  })

  it('marks mid-word too — a substring match is not word-bounded', () => {
    const segments = markLiteral('Servicii hoteliere baschet sibiu', 'sibiu')
    expect(segments.filter((s) => s.marked).map((s) => s.text)).toEqual(['sibiu'])
    // The database really does match inside a word, so the mark must follow it.
    expect(markLiteral('Autostrada A1 Sibiu-Holdea', 'sibiu').filter((s) => s.marked))
      .toHaveLength(1)
  })

  it('does nothing for a query the server never received', () => {
    expect(markLiteral('Servicii de paza', 'ab')).toEqual([
      { text: 'Servicii de paza', marked: false },
    ])
    expect(markLiteral('Servicii de paza', undefined)).toEqual([
      { text: 'Servicii de paza', marked: false },
    ])
  })
})

describe('stripHighlight', () => {
  it('reads the fragment as its original text', () => {
    expect(stripHighlight('⟦Reparatii⟧ la ⟦drumuri⟧')).toBe('Reparatii la drumuri')
  })
})

describe('highlightsById', () => {
  it('indexes by record id and tolerates an absent list', () => {
    const map = highlightsById([{ id: '42', title: '⟦spital⟧' }])
    expect(map.get('42')?.title).toBe('⟦spital⟧')
    expect(highlightsById(undefined).size).toBe(0)
  })
})
