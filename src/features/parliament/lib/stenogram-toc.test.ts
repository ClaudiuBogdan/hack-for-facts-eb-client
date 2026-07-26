import { describe, expect, it } from 'vitest'
import {
  ParliamentStenogramSegmentSchema,
  type ParliamentStenogramSegment,
} from '@/schemas/parliament'
import { buildStenogramToc, segmentDomId } from './stenogram-toc'

function segment(
  position: number,
  kind: ParliamentStenogramSegment['kind'],
  text: string,
): ParliamentStenogramSegment {
  return ParliamentStenogramSegmentSchema.parse({
    segmentKey: `canon:s#${String(position)}`,
    sessionKey: 'canon:s',
    position,
    kind,
    text,
    textChars: text.length,
    sourceUrl: 'https://cdep.ro/x',
    sourceUrlKind: 'exact',
  })
}

describe('segmentDomId', () => {
  it('keys the anchor on POSITION, the document identity', () => {
    expect(segmentDomId(0)).toBe('stenogram-block-0')
    expect(segmentDomId(42)).toBe('stenogram-block-42')
  })
})

describe('buildStenogramToc', () => {
  it('is empty when the capture printed no agenda headings', () => {
    // No agenda is a real state — it must not be papered over with speaker
    // names, which would present our structure as the institution's.
    expect(
      buildStenogramToc([
        segment(0, 'SPEECH', 'Domnul deputat: ...'),
        segment(1, 'CONTEXT', '(rumoare în sală)'),
      ]),
    ).toEqual([])
  })

  it('lists the headings in printed order with their speech counts', () => {
    const toc = buildStenogramToc([
      segment(0, 'AGENDA_HEADING', 'Punctul 1 — bugetul educației'),
      segment(1, 'SPEECH', 'a'),
      segment(2, 'CONTEXT', '(rumoare)'),
      segment(3, 'SPEECH', 'b'),
      segment(4, 'AGENDA_HEADING', 'Punctul 2 — sănătate'),
      segment(5, 'SPEECH', 'c'),
    ])

    expect(toc).toEqual([
      {
        segmentKey: 'canon:s#0',
        position: 0,
        label: 'Punctul 1 — bugetul educației',
        speechCount: 2,
      },
      {
        segmentKey: 'canon:s#4',
        position: 4,
        label: 'Punctul 2 — sănătate',
        speechCount: 1,
      },
    ])
  })

  it('uses only the first line of a multi-line heading as the label', () => {
    const [entry] = buildStenogramToc([
      segment(0, 'AGENDA_HEADING', 'Punctul 1\ndetalii suplimentare'),
    ])
    expect(entry?.label).toBe('Punctul 1')
  })

  it('ignores speeches printed BEFORE the first heading', () => {
    const toc = buildStenogramToc([
      segment(0, 'SPEECH', 'deschiderea ședinței'),
      segment(1, 'AGENDA_HEADING', 'Punctul 1'),
      segment(2, 'SPEECH', 'a'),
    ])
    expect(toc).toHaveLength(1)
    expect(toc[0]?.speechCount).toBe(1)
  })

  it('keeps a trailing heading with no speeches under it', () => {
    const toc = buildStenogramToc([
      segment(0, 'AGENDA_HEADING', 'Punctul 1'),
      segment(1, 'SPEECH', 'a'),
      segment(2, 'AGENDA_HEADING', 'Punctul 2 — amânat'),
    ])
    expect(toc).toHaveLength(2)
    expect(toc[1]?.speechCount).toBe(0)
  })
})
