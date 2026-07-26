import { describe, expect, it } from 'vitest'
import {
  ParliamentStenogramSegmentSchema,
  type ParliamentStenogramSegment,
} from '@/schemas/parliament'
import { filterSegmentsBySpeakers } from './stenogram-speaker-filter'
import {
  buildFilteredStenogramToc,
  buildStenogramInterventions,
  buildStenogramToc,
  clusterInterventionRail,
  fanOutCluster,
  readingProgressFraction,
  segmentDomId,
  stenogramExcerpt,
} from './stenogram-toc'

function segment(
  position: number,
  kind: ParliamentStenogramSegment['kind'],
  text: string,
  extra: Partial<ParliamentStenogramSegment> = {},
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
    ...extra,
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

describe('buildFilteredStenogramToc', () => {
  /** One sitting, two agenda points, two speakers, narration between. */
  const turn = (position: number, text: string, speakerName: string) =>
    segment(position, 'SPEECH', text, {
      speakerName,
      speechKey: `canon:sp:${String(position)}`,
    })

  const SITTING = [
    turn(0, 'deschiderea', 'Ion Popescu'),
    segment(1, 'AGENDA_HEADING', 'Punctul 1 — educație'),
    turn(2, 'a', 'Maria Ionescu'),
    segment(3, 'CONTEXT', '(rumoare)'),
    turn(4, 'b', 'Ion Popescu'),
    turn(5, 'c', 'Ion Popescu'),
    segment(6, 'AGENDA_HEADING', 'Punctul 2 — sănătate'),
    turn(7, 'd', 'Maria Ionescu'),
  ]

  it('is the FULL agenda when nothing is selected', () => {
    expect(
      buildFilteredStenogramToc({ segments: SITTING, speakerNames: [] }),
    ).toEqual(buildStenogramToc(SITTING))
  })

  it('keeps only the sections that still hold a selected speaker', () => {
    const toc = buildFilteredStenogramToc({
      segments: SITTING,
      speakerNames: ['Ion Popescu'],
    })
    expect(toc.map((entry) => entry.label)).toEqual(['Punctul 1 — educație'])
  })

  it('anchors each entry at the FIRST VISIBLE turn, never at the heading', () => {
    // The heading itself is not rendered in a filtered reading, so an anchor on
    // its position would scroll to a block that does not exist.
    const [entry] = buildFilteredStenogramToc({
      segments: SITTING,
      speakerNames: ['Ion Popescu'],
    })
    expect(entry?.position).toBe(4)
  })

  it('counts the VISIBLE speeches, not the section real size', () => {
    // Claiming the section's true size would describe debate the excerpt omits.
    const [entry] = buildFilteredStenogramToc({
      segments: SITTING,
      speakerNames: ['Ion Popescu'],
    })
    expect(entry?.speechCount).toBe(2)
  })

  it('never points at a block the excerpt does not render', () => {
    const visible = new Set(
      filterSegmentsBySpeakers({
        segments: SITTING,
        speakerNames: ['Ion Popescu', 'Maria Ionescu'],
      }).map((s) => s.position),
    )
    const toc = buildFilteredStenogramToc({
      segments: SITTING,
      speakerNames: ['Ion Popescu', 'Maria Ionescu'],
    })
    expect(toc).toHaveLength(2)
    for (const entry of toc) expect(visible.has(entry.position)).toBe(true)
  })

  it('gives no entry to turns printed BEFORE the first heading', () => {
    // Same rule as the full agenda: there is no heading to name them by.
    const toc = buildFilteredStenogramToc({
      segments: SITTING,
      speakerNames: ['Ion Popescu'],
    })
    expect(toc.some((entry) => entry.position === 0)).toBe(false)
  })

  it('is EMPTY when the excerpt lands under no heading at all', () => {
    // The reader renders no navigation for this — an honest gap beats a map of
    // a document that is not on screen.
    expect(
      buildFilteredStenogramToc({
        segments: [turn(0, 'a', 'Ion Popescu'), turn(1, 'b', 'Maria Ionescu')],
        speakerNames: ['Ion Popescu'],
      }),
    ).toEqual([])
  })

  it('is EMPTY when the selection matches nothing this sitting printed', () => {
    expect(
      buildFilteredStenogramToc({
        segments: SITTING,
        speakerNames: ['Cineva Absent'],
      }),
    ).toEqual([])
  })
})

describe('stenogramExcerpt', () => {
  it('normalises the hard wraps and runs of spaces the source printed', () => {
    expect(stenogramExcerpt('  Domnule\n  președinte,\tvă rog.  ')).toBe(
      'Domnule președinte, vă rog.',
    )
  })

  it('cuts at a word boundary and MARKS that the block continues', () => {
    const excerpt = stenogramExcerpt('alfa beta gamma delta', 12)
    expect(excerpt).toBe('alfa beta…')
    expect(excerpt.endsWith('…')).toBe(true)
  })

  it('never appends an ellipsis to a block it did not cut', () => {
    expect(stenogramExcerpt('scurt', 12)).toBe('scurt')
  })

  it('hard-cuts a single word too long to break', () => {
    expect(stenogramExcerpt('abcdefghijklmnopqrstuvwxyz', 10)).toBe(
      'abcdefghij…',
    )
  })
})

describe('buildStenogramInterventions', () => {
  it('markers are CONTRIBUTIONS only — never headings or narration', () => {
    const markers = buildStenogramInterventions([
      segment(0, 'AGENDA_HEADING', 'Punctul 1'),
      segment(1, 'SPEECH', 'Susțin proiectul.', {
        speakerName: 'Ion Popescu',
        speechKey: 'canon:sp:1',
      }),
      segment(2, 'CONTEXT', '(rumoare în sală)'),
      segment(3, 'VOTE_RESULT', 'Adoptat cu 200 de voturi.'),
      segment(4, 'SPEECH', 'Nu sunt de acord.', {
        speakerName: 'Maria Ionescu',
        speechKey: 'canon:sp:4',
      }),
    ])

    expect(markers.map((marker) => marker.position)).toEqual([1, 4])
    expect(markers.map((marker) => marker.ordinal)).toEqual([1, 2])
    expect(markers.map((marker) => marker.speechKey)).toEqual([
      'canon:sp:1',
      'canon:sp:4',
    ])
  })

  it('drops a SPEECH the server cannot name — nothing can select it', () => {
    // Without a `speechKey` there is no `?interventie=` to write, so a tick
    // for it would be a control that cannot do anything.
    expect(
      buildStenogramInterventions([segment(0, 'SPEECH', 'fără cheie')]),
    ).toEqual([])
  })

  it('keeps the PRINTED name, and keeps its absence as an absence', () => {
    const markers = buildStenogramInterventions([
      segment(0, 'SPEECH', 'a', { speakerName: 'Ion Popescu', speechKey: 'k0' }),
      segment(1, 'SPEECH', 'b', { speechKey: 'k1' }),
    ])
    expect(markers[0]?.speakerName).toBe('Ion Popescu')
    // Never backfilled from the neighbouring turn, and never invented.
    expect(markers[1]?.speakerName).toBeUndefined()
  })

  it('positions each marker by where its block sits in the WHOLE document', () => {
    const long = 'x'.repeat(7000)
    const markers = buildStenogramInterventions([
      segment(0, 'SPEECH', 'prima', { speechKey: 'k0' }),
      segment(1, 'CONTEXT', long),
      segment(2, 'SPEECH', 'ultima', { speechKey: 'k2' }),
    ])

    expect(markers[0]?.fraction).toBe(0)
    // The narration between them is part of the reading distance, so the
    // second contribution sits near the bottom of the rail, not halfway.
    expect(markers[1]?.fraction).toBeGreaterThan(0.9)
  })

  it('is empty for a sitting with no contributions at all', () => {
    expect(
      buildStenogramInterventions([segment(0, 'CONTEXT', '(pauză)')]),
    ).toEqual([])
  })
})

describe('readingProgressFraction', () => {
  it('is 0 before the reading line reaches the transcript', () => {
    expect(
      readingProgressFraction({
        regionTop: 900,
        regionHeight: 4000,
        viewportHeight: 1000,
      }),
    ).toBe(0)
  })

  it('measures the transcript ITSELF, not the whole page', () => {
    // The reading line sits at 40% of the viewport (400px). The transcript
    // starts 400px above it, so exactly a tenth of it is behind the reader —
    // the page heading and the footers above it count for nothing.
    expect(
      readingProgressFraction({
        regionTop: -400,
        regionHeight: 8000,
        viewportHeight: 1000,
      }),
    ).toBeCloseTo(0.1)
  })

  it('never exceeds the document at either end', () => {
    expect(
      readingProgressFraction({
        regionTop: -99999,
        regionHeight: 4000,
        viewportHeight: 1000,
      }),
    ).toBe(1)
    // A region with no height yet (first paint, print, jsdom) reports nothing
    // rather than dividing by zero.
    expect(
      readingProgressFraction({
        regionTop: 0,
        regionHeight: 0,
        viewportHeight: 1000,
      }),
    ).toBe(0)
  })
})

describe('clusterInterventionRail', () => {
  const layout = (fractions: readonly number[], trackHeight = 600) =>
    clusterInterventionRail({ fractions, trackHeight, slotHeight: 8 })

  it('keeps the track exactly one viewport tall, quantised to whole slots', () => {
    // The rail is a scrollbar: it must never grow past the viewport and scroll
    // inside itself, or a point on it would stop meaning a point in the text.
    const { trackHeight, slotHeight } = layout([0, 0.5, 1], 604)
    expect(slotHeight).toBe(8)
    expect(trackHeight).toBe(600)
    expect(layout(Array.from({ length: 900 }, () => 0.5)).trackHeight).toBe(600)
  })

  it('places a sparse sitting proportionally, one tick per contribution', () => {
    const { clusters, clusterOfIndex } = layout([0, 0.5, 1])
    expect(clusters.map((cluster) => cluster.top)).toEqual([0, 296, 592])
    expect(clusters.map((cluster) => cluster.indices)).toEqual([[0], [1], [2]])
    expect(clusterOfIndex).toEqual([0, 1, 2])
  })

  it('is deterministic — the same fractions always quantise the same way', () => {
    const fractions = [0.01, 0.011, 0.4, 0.87]
    expect(layout(fractions)).toEqual(layout(fractions))
  })

  it('collapses a dense sitting into non-overlapping, weighted ticks', () => {
    // 400 contributions placed proportionally on a 600px rail would land 1.5px
    // apart: a grey smear with no hit targets. Quantised onto 8px slots there
    // is at most ONE tick per slot, by construction, and the count each tick
    // stands for is what the rail draws instead.
    const fractions = Array.from({ length: 400 }, (_, index) => index / 399)
    const { clusters, clusterOfIndex } = layout(fractions)

    expect(clusters.length).toBeLessThanOrEqual(600 / 8)
    for (let index = 1; index < clusters.length; index += 1) {
      const gap = (clusters[index]?.top ?? 0) - (clusters[index - 1]?.top ?? 0)
      expect(gap).toBeGreaterThanOrEqual(8)
    }
    // Nothing is dropped: every contribution still belongs to a cluster, and
    // every cluster's members are the ones that mapped to it.
    expect(clusterOfIndex).toHaveLength(400)
    expect(clusters.flatMap((cluster) => [...cluster.indices])).toEqual(
      fractions.map((_, index) => index),
    )
  })

  it('groups contributions the source printed at the same point', () => {
    const { clusters } = layout([0.98, 0.999, 1, 1, 1])
    const last = clusters[clusters.length - 1]
    expect(last?.indices).toEqual([1, 2, 3, 4])
    // The last slot is still inside the track — `fraction === 1` never spills
    // past the end of the rail.
    expect(last?.top).toBe(592)
  })

  it('survives a track too short to hold a single slot', () => {
    const { clusters, trackHeight } = clusterInterventionRail({
      fractions: [0, 1],
      trackHeight: 3,
      slotHeight: 8,
    })
    expect(trackHeight).toBe(8)
    expect(clusters).toHaveLength(1)
    expect(clusters[0]?.indices).toEqual([0, 1])
  })

  it('is a no-op for a sitting with no contributions', () => {
    const { clusters, clusterOfIndex } = layout([])
    expect(clusters).toEqual([])
    expect(clusterOfIndex).toEqual([])
  })
})

describe('fanOutCluster', () => {
  const fan = (size: number, slotTop = 300) =>
    fanOutCluster({
      size,
      slotTop,
      slotHeight: 8,
      trackHeight: 600,
      pitch: 12,
    })

  it('centres the expansion on the slot it opened from', () => {
    const { tops, pitch } = fan(4)
    expect(pitch).toBe(12)
    // 4 × 12 = 48px, centred on the slot's middle (304).
    expect(tops).toEqual([280, 292, 304, 316])
  })

  it('never opens off the top or the bottom of the track', () => {
    expect(fan(4, 0).tops[0]).toBe(0)
    const bottom = fan(4, 592)
    expect((bottom.tops[3] ?? 0) + bottom.pitch).toBeLessThanOrEqual(600)
  })

  it('shrinks the pitch rather than dropping members of a crowded slot', () => {
    // A sitting that prints 100 turns inside one screen-slot cannot give each
    // of them a 12px step. Every one still gets a step, and the document stays
    // the fallback for reading them apart.
    const { tops, pitch } = fan(100)
    expect(tops).toHaveLength(100)
    expect(pitch).toBe(6)
    expect(tops[0]).toBe(0)
    expect(tops[99]).toBe(594)
  })

  it('is a no-op for an empty cluster', () => {
    expect(fan(0).tops).toEqual([])
  })
})
