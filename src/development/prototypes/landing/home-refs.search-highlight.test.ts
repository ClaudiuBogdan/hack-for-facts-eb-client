import { describe, expect, it } from 'vitest'
import { highlightSegments, matchRanges } from './home-refs.search-highlight'

/**
 * The cases here are real place names, not `foo`/`bar`. Every diacritic bug this
 * module exists to prevent is invisible on ASCII fixtures — the ranges come back
 * the right length and land one character to the left, which reads as correct in
 * a unit test and as broken in the dropdown.
 */

/** Reads the marked substrings back out of the original, as the UI would. */
const marked = (text: string, query: string) =>
  matchRanges(text, query).map((range) => text.slice(range.start, range.end))

describe('matchRanges', () => {
  it('matches without diacritics and marks the accented original', () => {
    expect(marked('Municipiul Iași', 'iasi')).toEqual(['Iași'])
    expect(marked('Municipiul Brăila', 'braila')).toEqual(['Brăila'])
    expect(marked('Județul Constanța', 'constanta')).toEqual(['Constanța'])
  })

  it('matches when the reader types the diacritics too', () => {
    expect(marked('Municipiul Iași', 'Iași')).toEqual(['Iași'])
  })

  it('treats the cedilla and comma-below forms of s and t as the same letter', () => {
    // U+0219 (correct Romanian) against U+015F (Turkish, common in older records).
    const commaBelow = 'Iași'
    const cedilla = 'Iaşi'

    expect(marked(commaBelow, cedilla)).toEqual([commaBelow])
    expect(marked(cedilla, commaBelow)).toEqual([cedilla])
  })

  it('keeps the range aligned when the accent is before the match', () => {
    // The failure this guards: folding shortens the string, so a mark computed
    // in folded space and applied to the original slides left by one per accent.
    expect(marked('Județul Brăila și Galați', 'galati')).toEqual(['Galați'])
  })

  it('matches each whitespace-separated token independently', () => {
    expect(marked('Mun. Cluj-Napoca', 'mun cluj')).toEqual(['Mun', 'Cluj'])
  })

  it('joins tokens that end up adjacent into a single range', () => {
    // 'cluj' and 'napoca' touch either side of the hyphen; two marks with a
    // seam through the hyphen would read as a rendering artefact.
    expect(marked('Cluj-Napoca', 'cluj -napoca')).toEqual(['Cluj-Napoca'])
  })

  it('marks every occurrence, not only the first', () => {
    expect(marked('Sectorul 1 București, București', 'bucuresti')).toEqual([
      'București',
      'București',
    ])
  })

  it('finds overlapping occurrences of a repeated token', () => {
    expect(matchRanges('aaa', 'aa')).toEqual([{ start: 0, end: 3 }])
  })

  it('matches digits, so a CUI highlights like a name', () => {
    expect(marked('4305857', '43058')).toEqual(['43058'])
  })

  it('is case insensitive in both directions', () => {
    expect(marked('MUNICIPIUL SIBIU', 'sibiu')).toEqual(['SIBIU'])
    expect(marked('Municipiul Sibiu', 'SIBIU')).toEqual(['Sibiu'])
  })

  it('returns nothing for an empty or whitespace query', () => {
    expect(matchRanges('Municipiul Sibiu', '')).toEqual([])
    expect(matchRanges('Municipiul Sibiu', '   ')).toEqual([])
  })

  it('returns nothing when the query is absent', () => {
    expect(matchRanges('Municipiul Sibiu', 'timisoara')).toEqual([])
  })

  it('returns nothing for empty text', () => {
    expect(matchRanges('', 'sibiu')).toEqual([])
  })

  it('does not merge ranges that are genuinely apart', () => {
    expect(matchRanges('ab cd ab', 'ab')).toEqual([
      { start: 0, end: 2 },
      { start: 6, end: 8 },
    ])
  })
})

describe('highlightSegments', () => {
  it('cuts the string into alternating unmatched and matched pieces', () => {
    expect(highlightSegments('Municipiul Iași', 'iasi')).toEqual([
      { text: 'Municipiul ', match: false },
      { text: 'Iași', match: true },
    ])
  })

  it('keeps a leading match first', () => {
    expect(highlightSegments('Cluj-Napoca', 'cluj')).toEqual([
      { text: 'Cluj', match: true },
      { text: '-Napoca', match: false },
    ])
  })

  it('reassembles into exactly the input, so nothing can be dropped or doubled', () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['Municipiul Iași', 'iasi'],
      ['Sectorul 1 București, București', 'bucuresti'],
      ['Mun. Cluj-Napoca', 'mun cluj'],
      ['Județul Constanța', 'x'],
      ['Brăila', ''],
    ]

    for (const [text, query] of cases) {
      expect(highlightSegments(text, query).map((s) => s.text).join('')).toBe(text)
    }
  })

  it('returns one unmatched segment when nothing matches', () => {
    expect(highlightSegments('Municipiul Sibiu', 'timisoara')).toEqual([
      { text: 'Municipiul Sibiu', match: false },
    ])
  })

  it('returns nothing at all for empty text', () => {
    expect(highlightSegments('', 'sibiu')).toEqual([])
  })
})
