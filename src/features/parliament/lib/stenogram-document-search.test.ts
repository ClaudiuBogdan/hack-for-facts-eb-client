import { describe, expect, it } from 'vitest'
import {
  DOCUMENT_SEARCH_MIN_LENGTH,
  findDocumentMatches,
  foldForSearch,
  groupMatchesBySegment,
  splitByMatches,
  stepMatch,
} from './stenogram-document-search'

const segments = [
  { segmentKey: 's#0', position: 0, text: 'Ordinea de zi: sănătate publică' },
  {
    segmentKey: 's#1',
    position: 1,
    text: 'Domnul deputat:\nSusțin proiectul privind sănătatea și șansele egale.',
  },
  { segmentKey: 's#2', position: 2, text: 'Nimic relevant aici.' },
]

describe('foldForSearch', () => {
  it('folds Romanian diacritics WITHOUT changing the length', () => {
    // A length change here would slide every match offset after the first
    // diacritic and highlight the wrong characters.
    const source = 'ĂÂÎȘȚăâîșț'
    expect(foldForSearch(source)).toBe('aaistaaist')
    expect(foldForSearch(source)).toHaveLength(source.length)
  })

  it('folds both the comma-below and cedilla forms of ș/ț', () => {
    expect(foldForSearch('şţ')).toBe('st')
    expect(foldForSearch('șț')).toBe('st')
  })

  it('lowercases so search is case-insensitive', () => {
    expect(foldForSearch('SĂNĂTATE')).toBe('sanatate')
  })
})

describe('findDocumentMatches', () => {
  it('finds diacritic-free typing inside diacritic text', () => {
    const matches = findDocumentMatches(segments, 'sanatate')
    expect(matches).toHaveLength(2)
    expect(matches.map((m) => m.segmentKey)).toEqual(['s#0', 's#1'])
  })

  it('offsets point at the ORIGINAL text, so highlights land exactly', () => {
    const [match] = findDocumentMatches(segments, 'sanatate')
    const text = segments[0]!.text
    expect(text.slice(match!.start, match!.end)).toBe('sănătate')
  })

  it('returns matches in document order', () => {
    const matches = findDocumentMatches(segments, 'e')
    expect(matches.map((m) => m.position)).toEqual(
      [...matches].map((m) => m.position).sort((a, b) => a - b),
    )
  })

  it('finds every occurrence within one block', () => {
    const matches = findDocumentMatches(
      [{ segmentKey: 'a', position: 0, text: 'ab ab ab' }],
      'ab',
    )
    expect(matches).toHaveLength(3)
  })

  it('does not produce overlapping matches', () => {
    const matches = findDocumentMatches(
      [{ segmentKey: 'a', position: 0, text: 'aaa' }],
      'aa',
    )
    expect(matches).toHaveLength(1)
  })

  it('ignores a query shorter than the minimum', () => {
    expect(findDocumentMatches(segments, 'a')).toEqual([])
    expect('a'.length).toBeLessThan(DOCUMENT_SEARCH_MIN_LENGTH)
  })

  it('ignores a blank query', () => {
    expect(findDocumentMatches(segments, '   ')).toEqual([])
  })
})

describe('splitByMatches', () => {
  it('returns the whole text as one plain run when nothing matched', () => {
    expect(splitByMatches('abc', [], 0)).toEqual([
      { text: 'abc', isMatch: false },
    ])
  })

  it('alternates plain and matched runs and numbers hits globally', () => {
    const matches = findDocumentMatches(
      [{ segmentKey: 'a', position: 0, text: 'xx ab yy' }],
      'ab',
    )
    // `offset: 4` — this block's first hit is the fifth in the document.
    expect(splitByMatches('xx ab yy', [...matches], 4)).toEqual([
      { text: 'xx ', isMatch: false },
      { text: 'ab', isMatch: true, matchIndex: 4 },
      { text: ' yy', isMatch: false },
    ])
  })

  it('handles a match at the very start and end', () => {
    const matches = findDocumentMatches(
      [{ segmentKey: 'a', position: 0, text: 'ab' }],
      'ab',
    )
    expect(splitByMatches('ab', [...matches], 0)).toEqual([
      { text: 'ab', isMatch: true, matchIndex: 0 },
    ])
  })
})

describe('groupMatchesBySegment', () => {
  it('groups by block and records each group global offset', () => {
    const matches = findDocumentMatches(segments, 'sanatat')
    const grouped = groupMatchesBySegment(matches)
    expect(grouped.get('s#0')?.offset).toBe(0)
    expect(grouped.get('s#1')?.offset).toBe(1)
    expect(grouped.get('s#2')).toBeUndefined()
  })
})

describe('stepMatch', () => {
  it('wraps forward past the last hit', () => {
    expect(stepMatch(2, 3, 1)).toBe(0)
  })

  it('wraps backward past the first hit', () => {
    expect(stepMatch(0, 3, -1)).toBe(2)
  })

  it('steps normally in the middle', () => {
    expect(stepMatch(1, 3, 1)).toBe(2)
    expect(stepMatch(1, 3, -1)).toBe(0)
  })

  it('is a no-op with no hits', () => {
    expect(stepMatch(0, 0, 1)).toBe(0)
  })
})
