import { describe, expect, it } from 'vitest'
import {
  classifyStenogramFailure,
  ParliamentStenogramNotFoundError,
} from '../lib/parliament-stenogram-error'
import { allGlobalMockSpeeches } from './parliament-speeches-api.mock'
import {
  fetchParliamentSpeechContextMock,
  fetchParliamentStenogramSessionsMock,
  fetchParliamentTranscriptMock,
} from './parliament-stenograms-api.mock'

describe('mock stenogram sittings', () => {
  it('lists sittings newest first, with a dateless capture LAST', () => {
    return fetchParliamentStenogramSessionsMock().then((list) => {
      const dated = list.sessions.filter((s) => s.sessionDate)
      const dateless = list.sessions.filter((s) => !s.sessionDate)
      expect(dated.length).toBeGreaterThan(0)

      const dates = dated.map((s) => s.sessionDate!)
      expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates)

      if (dateless.length > 0) {
        // A capture with no trustworthy date sorts after every dated one.
        const lastDatedIndex = list.sessions.findIndex(
          (s) => s.sessionKey === dated[dated.length - 1]!.sessionKey,
        )
        const firstDatelessIndex = list.sessions.findIndex(
          (s) => !s.sessionDate,
        )
        expect(firstDatelessIndex).toBeGreaterThan(lastDatedIndex)
      }
    })
  })

  it('every sitting a mock turn points at really exists', async () => {
    const list = await fetchParliamentStenogramSessionsMock()
    // The mock list is one page; walk it all so the assertion is real.
    const keys = new Set(list.sessions.map((s) => s.sessionKey))
    let cursor = list.endCursor
    while (cursor) {
      const page = await fetchParliamentStenogramSessionsMock(cursor)
      page.sessions.forEach((s) => keys.add(s.sessionKey))
      cursor = page.endCursor
    }

    for (const speech of allGlobalMockSpeeches()) {
      if (!speech.sessionKey) continue
      expect(keys.has(speech.sessionKey)).toBe(true)
    }
  })

  it('a dateless capture matches NO date filter — it is never inferred', async () => {
    const byYear = await fetchParliamentStenogramSessionsMock(undefined, {
      year: { eq: 2026 },
    })
    expect(byYear.sessions.every((s) => s.sessionDate?.startsWith('2026'))).toBe(
      true,
    )

    const byRange = await fetchParliamentStenogramSessionsMock(undefined, {
      sessionDate: { gte: '2020-01-01', lte: '2030-01-01' },
    })
    expect(byRange.sessions.every((s) => Boolean(s.sessionDate))).toBe(true)
  })

  it('filters by chamber and availability', async () => {
    const senate = await fetchParliamentStenogramSessionsMock(undefined, {
      chamber: { eq: 'senat' },
    })
    expect(senate.sessions.every((s) => s.chamber === 'senat')).toBe(true)

    const sourceOnly = await fetchParliamentStenogramSessionsMock(undefined, {
      availability: { eq: 'SOURCE_ONLY' },
    })
    expect(sourceOnly.sessions.length).toBeGreaterThan(0)
    expect(
      sourceOnly.sessions.every((s) => s.availability === 'SOURCE_ONLY'),
    ).toBe(true)
  })

  it('a SOURCE_ONLY capture is REFUSED with the sitting attached, not served empty', async () => {
    const list = await fetchParliamentStenogramSessionsMock(undefined, {
      availability: { eq: 'SOURCE_ONLY' },
    })
    const session = list.sessions[0]!
    expect(session.sourceUrl).toBeTruthy()

    // An empty 200 would let the reader render a silent sitting. The server
    // 409s instead, carrying the sitting ref so the client can still name it
    // and link its official source without a second request.
    const failure = await fetchParliamentTranscriptMock(session.sessionKey).then(
      () => null,
      (error: unknown) => classifyStenogramFailure(error),
    )

    expect(failure?.kind).toBe('transcript_unavailable')
    expect(failure?.reason).toBe('source_only')
    expect(failure?.retryable).toBe(false)
    expect(failure?.session?.sessionKey).toBe(session.sessionKey)
    expect(failure?.session?.sourceUrl).toBe(session.sourceUrl)
    expect(failure?.session?.availability).toBe('SOURCE_ONLY')
  })

  it('searches the whole reading, not just titles', async () => {
    const hit = await fetchParliamentStenogramSessionsMock(
      undefined,
      undefined,
      'fondurile europene',
    )
    expect(hit.sessions.length).toBeGreaterThan(0)

    const miss = await fetchParliamentStenogramSessionsMock(
      undefined,
      undefined,
      'zzz-nu-exista-nicaieri',
    )
    expect(miss.sessions).toEqual([])
  })
})

describe('mock transcript read (COMPLETE, no pagination)', () => {
  it('returns the whole ordered reading and claims completeness', async () => {
    const transcript = await fetchParliamentTranscriptMock(
      'canon:mock:comun:2026-05-11',
    )
    expect(transcript.complete).toBe(true)
    expect(transcript.totalSegments).toBe(transcript.segments.length)
    const positions = transcript.segments.map((s) => s.position)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(transcript.segments[0]?.kind).toBe('AGENDA_HEADING')
  })

  it('takes no offset/limit — one response is one whole sitting', () => {
    // Guards the invariant the reader depends on: there is no argument by which
    // a caller can accidentally receive a prefix that looks like a sitting.
    expect(fetchParliamentTranscriptMock).toHaveLength(1)
  })

  it('carries served navigation instead of a derived window', async () => {
    const transcript = await fetchParliamentTranscriptMock(
      'canon:mock:comun:2026-03-20',
    )
    for (const neighbour of [
      transcript.navigation.previous,
      transcript.navigation.next,
    ]) {
      if (neighbour) {
        expect(neighbour.chamber).toBe('comun')
        expect(neighbour.sourceUrl).toBeTruthy()
      }
    }
  })

  it('orders navigation newest-ABOVE: next is later, previous is earlier', async () => {
    const transcript = await fetchParliamentTranscriptMock(
      'canon:mock:comun:2026-03-20',
    )
    const { previous, next } = transcript.navigation
    if (previous?.sessionDate) {
      expect(previous.sessionDate < '2026-03-20').toBe(true)
    }
    if (next?.sessionDate) {
      expect(next.sessionDate > '2026-03-20').toBe(true)
    }
  })

  it('throws the not-found sentinel for an unknown sitting', async () => {
    await expect(
      fetchParliamentTranscriptMock('canon:mock:nope'),
    ).rejects.toBeInstanceOf(ParliamentStenogramNotFoundError)
  })
})

describe('mock speech context', () => {
  it('resolves a turn to its block, sitting and neighbouring CONTRIBUTIONS', async () => {
    const speech = allGlobalMockSpeeches().find((s) => s.sessionKey)!
    const context = await fetchParliamentSpeechContextMock(speech.speechKey)

    expect(context).not.toBeNull()
    expect(context!.session.sessionKey).toBe(speech.sessionKey)
    expect(context!.segment?.speechKey).toBe(speech.speechKey)
    // Neighbours are SPEECH blocks, never the adjacent narration.
    for (const neighbour of [
      context!.previousContribution,
      context!.nextContribution,
    ]) {
      if (neighbour) expect(neighbour.kind).toBe('SPEECH')
    }
  })

  it('returns null (not an error) for an unmapped key', async () => {
    await expect(
      fetchParliamentSpeechContextMock('cdep:cdep_stenogram:9043:9:718'),
    ).resolves.toBeNull()
  })
})

describe('a dateless capture', () => {
  it('has no calendar neighbours', async () => {
    const transcript = await fetchParliamentTranscriptMock(
      'canon:mock:camera_deputatilor:0000-00-00',
    )
    expect(transcript.session.sessionDate).toBeUndefined()
    expect(transcript.navigation.previous).toBeUndefined()
    expect(transcript.navigation.next).toBeUndefined()
  })
})
