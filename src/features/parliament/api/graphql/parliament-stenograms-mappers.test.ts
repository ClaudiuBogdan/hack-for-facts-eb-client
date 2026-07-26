import { describe, expect, it } from 'vitest'
import {
  mapSpeechContext,
  mapStenogramSegment,
  mapStenogramSession,
  mapStenogramSessions,
} from './parliament-stenograms-mappers'
import { canonicalPointers } from './parliament-speeches-mappers'
import type {
  RawStenogramSegment,
  RawStenogramSession,
} from './parliament-stenograms-queries'

const rawSession: RawStenogramSession = {
  sessionKey: 'canon:s1',
  chamber: 'senat',
  sessionDate: '2026-05-13T00:00:00.000Z',
  sessionDateSource: 'session_date',
  title: '  Ședința Senatului  ',
  sourceSystem: 'senat_stenogram',
  availability: 'PARTIAL',
  sourceUrl: 'https://senat.ro/x',
  sourceUrlKind: 'lossy_root',
  sittingKey: null,
  presidingText: '   ',
  startTimeText: '09:00',
  endTimeText: null,
  segmentCount: 12,
  speechCount: 8,
  speakerCount: 5,
  sourceUpdatedAt: '2026-05-14T10:00:00.000Z',
}

const rawSegment: RawStenogramSegment = {
  segmentKey: 'canon:s1#3',
  sessionKey: 'canon:s1',
  position: 3,
  kind: 'SPEECH',
  text: '  Domnul senator:\n\n  Susțin proiectul.  ',
  textChars: 39,
  speakerName: '  Ion Popescu  ',
  speakerRef: null,
  mandateKey: null,
  speechKey: 'canon:sp:3',
  agendaRef: null,
  sourceUrl: 'https://senat.ro/x',
  sourceUrlKind: 'lossy_root',
}

describe('mapStenogramSession', () => {
  it('truncates the date and keeps its provenance', () => {
    const session = mapStenogramSession(rawSession)
    expect(session.sessionDate).toBe('2026-05-13')
    expect(session.sessionDateSource).toBe('session_date')
  })

  it('drops a null date but STILL carries why it is missing', () => {
    const session = mapStenogramSession({
      ...rawSession,
      sessionDate: null,
      sessionDateSource: 'none',
    })
    expect(session.sessionDate).toBeUndefined()
    expect(session.sessionDateSource).toBe('none')
  })

  it('collapses whitespace-only optionals but never the source URL', () => {
    const session = mapStenogramSession(rawSession)
    expect(session.title).toBe('Ședința Senatului')
    expect(session.presidingText).toBeUndefined()
    expect(session.sittingKey).toBeUndefined()
    expect(session.sourceUrl).toBe('https://senat.ro/x')
    expect(session.sourceUrlKind).toBe('lossy_root')
  })
})

describe('mapStenogramSegment', () => {
  it('keeps the block text VERBATIM — a printed block is the record', () => {
    const segment = mapStenogramSegment(rawSegment)
    expect(segment.text).toBe('  Domnul senator:\n\n  Susțin proiectul.  ')
  })

  it('trims the speaker name and collapses an unresolved mandate', () => {
    const segment = mapStenogramSegment(rawSegment)
    expect(segment.speakerName).toBe('Ion Popescu')
    // A guest/minister with no roster id is the EXPECTED value, not a gap.
    expect(segment.mandateKey).toBeUndefined()
  })

  it('keeps position 0 — the first block is a real position', () => {
    expect(mapStenogramSegment({ ...rawSegment, position: 0 }).position).toBe(0)
  })

  it('preserves an explicitly resolved member for the profile link', () => {
    const segment = mapStenogramSegment({
      ...rawSegment,
      member: {
        mandateKey: 'senat:mandate:42',
        fullName: 'Ion Popescu',
        chamber: 'senat',
        groupName: null,
      },
    })

    expect(segment.member).toEqual({
      mandateKey: 'senat:mandate:42',
      fullName: 'Ion Popescu',
      chamber: 'senat',
    })
  })
})

describe('mapStenogramSessions', () => {
  it('maps the connection with its capped total', () => {
    const list = mapStenogramSessions({
      total: 10_000,
      totalEstimated: true,
      edges: [{ cursor: 'c1', node: rawSession }],
      pageInfo: { hasNextPage: true, endCursor: 'c1' },
    })
    expect(list.total).toBe(10_000)
    expect(list.totalEstimated).toBe(true)
    expect(list.sessions).toHaveLength(1)
    expect(list.endCursor).toBe('c1')
  })
})

describe('mapSpeechContext', () => {
  it('keeps canonicalPosition 0 and drops only null', () => {
    const withZero = mapSpeechContext({
      speechKey: 'cdep:legacy:1',
      session: rawSession,
      segment: rawSegment,
      previousContribution: null,
      nextContribution: null,
      redirect: {
        legacySpeechKey: 'cdep:legacy:1',
        sessionKey: 'canon:s1',
        canonicalSpeechKey: 'canon:sp:0',
        canonicalSegmentKey: 'canon:s1#0',
        canonicalPosition: 0,
        mappingKind: 'exact_segment',
        matchMethod: 'cdep_sitting_ids',
      },
    })
    expect(withZero.redirect?.canonicalPosition).toBe(0)

    const sessionOnly = mapSpeechContext({
      speechKey: 'cdep:legacy:2',
      session: rawSession,
      segment: null,
      previousContribution: null,
      nextContribution: null,
      redirect: {
        legacySpeechKey: 'cdep:legacy:2',
        sessionKey: 'canon:s1',
        canonicalSpeechKey: null,
        canonicalSegmentKey: null,
        canonicalPosition: null,
        mappingKind: 'session_only',
        matchMethod: 'cdep_sitting_ids',
      },
    })
    // `session_only` proves the sitting and nothing else — no guessed block.
    expect(sessionOnly.segment).toBeNull()
    expect(sessionOnly.redirect?.canonicalSpeechKey).toBeUndefined()
    expect(sessionOnly.redirect?.canonicalPosition).toBeUndefined()
    expect(sessionOnly.redirect?.mappingKind).toBe('session_only')
  })

  it('carries a null redirect for a canonical key', () => {
    const context = mapSpeechContext({
      speechKey: 'canon:sp:3',
      session: rawSession,
      segment: rawSegment,
      previousContribution: rawSegment,
      nextContribution: null,
      redirect: null,
    })
    expect(context.redirect).toBeNull()
    expect(context.previousContribution?.segmentKey).toBe('canon:s1#3')
  })
})

describe('canonicalPointers — the sitting-link guard', () => {
  it('offers a sitting only when the row is canonical AND names one', () => {
    expect(
      canonicalPointers({ isCanonical: true, sessionKey: 'canon:s1', position: 4 }),
    ).toEqual({ isCanonical: true, sessionKey: 'canon:s1', position: 4 })
  })

  it('refuses a half-mapped row from either direction', () => {
    // Linking on these would produce a reader page that cannot highlight
    // anything, which reads as a broken link rather than as missing data.
    expect(canonicalPointers({ isCanonical: true, sessionKey: null })).toEqual({
      isCanonical: false,
    })
    expect(
      canonicalPointers({ isCanonical: false, sessionKey: 'canon:s1' }),
    ).toEqual({ isCanonical: false })
  })

  it('treats an ABSENT isCanonical as legacy, never as canonical', () => {
    // An older deployment may not know the field at all.
    expect(canonicalPointers({ sessionKey: 'canon:s1' })).toEqual({
      isCanonical: false,
    })
  })

  it('keeps position 0 but drops a null position', () => {
    expect(
      canonicalPointers({ isCanonical: true, sessionKey: 'c', position: 0 }),
    ).toEqual({ isCanonical: true, sessionKey: 'c', position: 0 })
    expect(
      canonicalPointers({ isCanonical: true, sessionKey: 'c', position: null }),
    ).toEqual({ isCanonical: true, sessionKey: 'c' })
  })
})
