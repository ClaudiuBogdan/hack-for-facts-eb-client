import { describe, expect, it } from 'vitest'
import {
  ParliamentStenogramSegmentSchema,
  type ParliamentStenogramSegment,
} from '@/schemas/parliament'
import {
  buildStenogramSpeakerFacets,
  compareRomanianNames,
  countStenogramContributions,
  filterSegmentsBySpeakers,
  isSegmentVisibleForSpeakers,
  normalizeSpeakerSelection,
} from './stenogram-speaker-filter'

function segment(
  position: number,
  kind: ParliamentStenogramSegment['kind'],
  text: string,
  extra: Partial<ParliamentStenogramSegment> = {},
): ParliamentStenogramSegment {
  return ParliamentStenogramSegmentSchema.parse({
    segmentKey: `canon:s1#${String(position)}`,
    sessionKey: 'canon:s1',
    position,
    kind,
    text,
    textChars: text.length,
    sourceUrl: 'https://cdep.ro/steno/1',
    sourceUrlKind: 'exact',
    ...extra,
  })
}

const SEGMENTS: ParliamentStenogramSegment[] = [
  segment(0, 'AGENDA_HEADING', 'Punctul 1'),
  segment(1, 'SPEECH', 'Prima intervenție.', {
    speakerName: 'Ion Popescu',
    speechKey: 'canon:sp:1',
  }),
  segment(2, 'CONTEXT', '(rumoare în sală)'),
  segment(3, 'SPEECH', 'A doua intervenție.', {
    speakerName: 'Maria Ionescu',
    speechKey: 'canon:sp:3',
  }),
  segment(4, 'SPEECH', 'A treia intervenție.', {
    speakerName: 'Ion Popescu',
    speechKey: 'canon:sp:4',
  }),
  // Printed with no name at all — a real, honest state in a PARTIAL capture.
  segment(5, 'SPEECH', 'Vă mulțumesc.', { speechKey: 'canon:sp:5' }),
]

describe('buildStenogramSpeakerFacets', () => {
  it('offers the names THIS sitting printed, counted', () => {
    expect(buildStenogramSpeakerFacets(SEGMENTS)).toEqual([
      { speakerName: 'Ion Popescu', interventionCount: 2 },
      { speakerName: 'Maria Ionescu', interventionCount: 1 },
    ])
  })

  it('offers no option for a contribution the source printed no name on', () => {
    // There is nothing to select it BY, and a synthetic bucket would imply the
    // source grouped those turns together.
    const names = buildStenogramSpeakerFacets(SEGMENTS).map(
      (facet) => facet.speakerName,
    )
    expect(names).not.toContain('')
    expect(names).toHaveLength(2)
  })

  it('keeps an UNRESOLVED but printed speaker selectable', () => {
    // No mandateKey — a guest or a minister. The printed name is the value, so
    // the filter reaches them exactly like a roster-resolved member.
    const facets = buildStenogramSpeakerFacets([
      segment(0, 'SPEECH', 'Ca invitat…', {
        speakerName: 'Invitat Guvern',
        speechKey: 'canon:sp:0',
      }),
    ])
    expect(facets).toEqual([
      { speakerName: 'Invitat Guvern', interventionCount: 1 },
    ])
  })

  it('ignores headings and narration when counting', () => {
    expect(countStenogramContributions(SEGMENTS)).toBe(4)
  })

  it('sorts Romanian names deterministically, diacritics in place', () => {
    const facets = buildStenogramSpeakerFacets([
      segment(0, 'SPEECH', 'a', { speakerName: 'Ștefan Vlad', speechKey: 'k0' }),
      segment(1, 'SPEECH', 'b', { speakerName: 'Sorin Ababei', speechKey: 'k1' }),
      segment(2, 'SPEECH', 'c', { speakerName: 'Ana Țîrlea', speechKey: 'k2' }),
      segment(3, 'SPEECH', 'd', { speakerName: 'Ana Tudor', speechKey: 'k3' }),
    ])
    expect(facets.map((facet) => facet.speakerName)).toEqual([
      'Ana Tudor',
      'Ana Țîrlea',
      'Sorin Ababei',
      'Ștefan Vlad',
    ])
  })

  it('breaks collator ties so the order cannot drift between engines', () => {
    expect(compareRomanianNames('Ion', 'Ion')).toBe(0)
    expect(compareRomanianNames('Ion Popa', 'Ion popa')).not.toBe(0)
  })
})

describe('filterSegmentsBySpeakers', () => {
  it('returns the sitting UNTOUCHED when nothing is selected', () => {
    expect(filterSegmentsBySpeakers({ segments: SEGMENTS, speakerNames: [] })).toBe(
      SEGMENTS,
    )
  })

  it('keeps only the selected speakers CONTRIBUTIONS, in source order', () => {
    const filtered = filterSegmentsBySpeakers({
      segments: SEGMENTS,
      speakerNames: ['Ion Popescu'],
    })
    expect(filtered.map((s) => s.position)).toEqual([1, 4])
  })

  it('drops agenda headings and narration — an excerpt is not a document', () => {
    const filtered = filterSegmentsBySpeakers({
      segments: SEGMENTS,
      speakerNames: ['Ion Popescu', 'Maria Ionescu'],
    })
    expect(filtered.every((s) => s.kind === 'SPEECH')).toBe(true)
    expect(filtered).toHaveLength(3)
  })

  it('matches many speakers at once, keeping the printed order', () => {
    const filtered = filterSegmentsBySpeakers({
      segments: SEGMENTS,
      speakerNames: ['Maria Ionescu', 'Ion Popescu'],
    })
    expect(filtered.map((s) => s.position)).toEqual([1, 3, 4])
  })

  it('yields nothing for a name this sitting never printed', () => {
    expect(
      filterSegmentsBySpeakers({
        segments: SEGMENTS,
        speakerNames: ['Cineva Absent'],
      }),
    ).toHaveLength(0)
  })

  it('passes the ORIGINAL blocks through, identity fields intact', () => {
    // The filter narrows a list; it must not rebuild the blocks in it. A copy
    // that dropped `mandateKey`/`member` would silently un-link every resolved
    // speaker in a filtered reading, and one that dropped `speechKey` would
    // break `?interventie=` and the prev/next controls with it.
    const resolved = segment(6, 'SPEECH', 'Ca membru al comisiei…', {
      speakerName: 'Ana Radu',
      speechKey: 'canon:sp:6',
      mandateKey: 'mandate-42',
      member: {
        mandateKey: 'mandate-42',
        fullName: 'Ana Radu',
        groupName: 'Grup parlamentar',
      },
    })
    const [kept] = filterSegmentsBySpeakers({
      segments: [...SEGMENTS, resolved],
      speakerNames: ['Ana Radu'],
    })

    expect(kept).toBe(resolved)
    expect(kept?.mandateKey).toBe('mandate-42')
    expect(kept?.member?.mandateKey).toBe('mandate-42')
    expect(kept?.speechKey).toBe('canon:sp:6')
    expect(kept?.segmentKey).toBe(resolved.segmentKey)
    expect(kept?.sourceUrl).toBe(resolved.sourceUrl)
    expect(kept?.sourceUrlKind).toBe(resolved.sourceUrlKind)
  })

  it('keeps a block whose mandate is carried ONLY on `member`', () => {
    const memberOnly = segment(7, 'SPEECH', 'Vă rog.', {
      speakerName: 'Radu Ana',
      speechKey: 'canon:sp:7',
      member: { mandateKey: 'mandate-7', fullName: 'Radu Ana' },
    })
    const [kept] = filterSegmentsBySpeakers({
      segments: [memberOnly],
      speakerNames: ['Radu Ana'],
    })
    expect(kept?.mandateKey).toBeUndefined()
    expect(kept?.member?.mandateKey).toBe('mandate-7')
  })
})

describe('normalizeSpeakerSelection', () => {
  it('trims, dedupes and drops blanks, keeping the reader order', () => {
    expect(
      normalizeSpeakerSelection([' Ion Popescu ', '', 'Ion Popescu', 'Maria']),
    ).toEqual(['Ion Popescu', 'Maria'])
  })
})

describe('isSegmentVisibleForSpeakers', () => {
  const speech = SEGMENTS[1]!

  it('everything is visible when the filter is off', () => {
    expect(
      isSegmentVisibleForSpeakers({ segment: speech, speakerNames: [] }),
    ).toBe(true)
    expect(
      isSegmentVisibleForSpeakers({ segment: undefined, speakerNames: [] }),
    ).toBe(true)
  })

  it('answers for the deep-linked block under a selection', () => {
    expect(
      isSegmentVisibleForSpeakers({
        segment: speech,
        speakerNames: ['Ion Popescu'],
      }),
    ).toBe(true)
    expect(
      isSegmentVisibleForSpeakers({
        segment: speech,
        speakerNames: ['Maria Ionescu'],
      }),
    ).toBe(false)
  })

  it('a nameless contribution is hidden by any selection', () => {
    expect(
      isSegmentVisibleForSpeakers({
        segment: SEGMENTS[5]!,
        speakerNames: ['Ion Popescu'],
      }),
    ).toBe(false)
  })
})
