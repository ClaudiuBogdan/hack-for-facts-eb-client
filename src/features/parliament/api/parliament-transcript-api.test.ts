import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  classifyStenogramFailure,
  classifyTranscriptEnvelope,
} from '../lib/parliament-stenogram-error'
import {
  fetchParliamentTranscriptLive,
  transcriptUrl,
} from './parliament-transcript-api.live'

vi.mock('@/config/env', () => ({
  env: {
    VITE_APP_ENVIRONMENT: 'test',
  },
  getApiBaseUrl: () => 'https://api.example.com',
}))

const SESSION = {
  sessionKey: 'canon:cdep:9043',
  chamber: 'camera_deputatilor',
  sessionDate: '2019-06-18',
  sessionDateSource: 'stenogram_title',
  title: 'Ședința Camerei Deputaților',
  sourceSystem: 'cdep_stenogram',
  availability: 'COMPLETE',
  sourceUrl: 'https://cdep.ro/steno/9043',
  sourceUrlKind: 'exact',
  sittingKey: null,
  presidingText: null,
  startTimeText: null,
  endTimeText: null,
  segmentCount: 2,
  speechCount: 1,
  speakerCount: 1,
  captureDigest: 'cap-1',
  canonicalDigest: 'canon-1',
  sourceUpdatedAt: '2019-06-19T10:00:00.000Z',
}

const SEGMENTS = [
  {
    segmentKey: 'canon:cdep:9043#0',
    sessionKey: 'canon:cdep:9043',
    position: 0,
    kind: 'AGENDA_HEADING',
    text: 'Punctul 1',
    textChars: 9,
    speakerName: null,
    speakerRef: null,
    mandateKey: null,
    speechKey: null,
    agendaRef: null,
    sourceUrl: 'https://cdep.ro/steno/9043',
    sourceUrlKind: 'exact',
  },
  {
    segmentKey: 'canon:cdep:9043#1',
    sessionKey: 'canon:cdep:9043',
    position: 1,
    kind: 'SPEECH',
    text: '  Susțin proiectul.  ',
    textChars: 21,
    speakerName: ' Ion Popescu ',
    speakerRef: null,
    mandateKey: 'm-1',
    speechKey: 'canon:cdep:9043:718',
    agendaRef: null,
    sourceUrl: 'https://cdep.ro/steno/9043#718',
    sourceUrlKind: 'exact',
  },
]

function okEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    data: {
      session: SESSION,
      segments: SEGMENTS,
      navigation: {
        previous: {
          sessionKey: 'canon:cdep:9042',
          chamber: 'camera_deputatilor',
          sessionDate: '2019-06-17',
          title: 'Ședința anterioară',
          availability: 'COMPLETE',
          sourceUrl: 'https://cdep.ro/steno/9042',
          sourceUrlKind: 'exact',
        },
        next: null,
      },
    },
    meta: {
      requestId: 'r-1',
      totalSegments: 2,
      complete: true,
      asOf: '2019-06-19T10:00:00.000Z',
      canonicalDigest: 'canon-1',
    },
    ...overrides,
  }
}

function respond(status: number, body: unknown, ok = status < 400) {
  return {
    ok,
    status,
    statusText: '',
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('transcriptUrl', () => {
  it('encodes the session key as ONE path segment', () => {
    // Keys carry `:` separators; leaving them raw would split the path.
    expect(transcriptUrl('canon:cdep:9043')).toBe(
      'https://api.example.com/api/v1/parliament/stenograms/canon%3Acdep%3A9043/transcript',
    )
  })

  it('encodes a key containing a slash without escaping the route', () => {
    expect(transcriptUrl('senat:a/b')).toContain('senat%3Aa%2Fb/transcript')
  })
})

describe('fetchParliamentTranscriptLive — the happy path', () => {
  it('returns ONE complete transcript, mapped and marked complete', async () => {
    fetchMock.mockResolvedValue(respond(200, okEnvelope()))

    const transcript = await fetchParliamentTranscriptLive('canon:cdep:9043')

    expect(transcript.complete).toBe(true)
    expect(transcript.totalSegments).toBe(2)
    expect(transcript.segments).toHaveLength(2)
    expect(transcript.session.sessionKey).toBe('canon:cdep:9043')
    expect(transcript.session.canonicalDigest).toBe('canon-1')
  })

  it('keeps block text VERBATIM but trims the speaker name', async () => {
    fetchMock.mockResolvedValue(respond(200, okEnvelope()))
    const transcript = await fetchParliamentTranscriptLive('canon:cdep:9043')
    expect(transcript.segments[1]?.text).toBe('  Susțin proiectul.  ')
    expect(transcript.segments[1]?.speakerName).toBe('Ion Popescu')
  })

  it('maps served navigation and collapses a null side', async () => {
    fetchMock.mockResolvedValue(respond(200, okEnvelope()))
    const transcript = await fetchParliamentTranscriptLive('canon:cdep:9043')
    expect(transcript.navigation.previous?.sessionKey).toBe('canon:cdep:9042')
    expect(transcript.navigation.next).toBeUndefined()
  })

  it('sends no pagination parameters at all', async () => {
    fetchMock.mockResolvedValue(respond(200, okEnvelope()))
    await fetchParliamentTranscriptLive('canon:cdep:9043')
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).not.toMatch(/offset|limit|page/)
  })

  it('refuses to claim completeness the envelope did not', async () => {
    // If a future response ever reports a short read, the flag must follow it
    // rather than being re-derived from array lengths.
    fetchMock.mockResolvedValue(
      respond(200, okEnvelope({ meta: { totalSegments: 900, complete: false } })),
    )
    const transcript = await fetchParliamentTranscriptLive('canon:cdep:9043')
    expect(transcript.complete).toBe(false)
    expect(transcript.totalSegments).toBe(900)
  })
})

describe('fetchParliamentTranscriptLive — typed failures', () => {
  it('a network failure is TRANSPORT, never not-found', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const failure = await fetchParliamentTranscriptLive('canon:x').then(
      () => null,
      (error: unknown) => classifyStenogramFailure(error),
    )
    expect(failure?.kind).toBe('transport')
    expect(failure?.retryable).toBe(true)
  })

  it('404 NOT_FOUND is terminal', async () => {
    fetchMock.mockResolvedValue(
      respond(404, {
        ok: false,
        error: 'NOT_FOUND',
        message: 'no such sitting',
        meta: { requestId: 'r' },
      }),
    )
    const failure = await fetchParliamentTranscriptLive('canon:x').then(
      () => null,
      (error: unknown) => classifyStenogramFailure(error),
    )
    expect(failure).toMatchObject({ kind: 'not_found', retryable: false })
  })

  it('409 SOURCE_ONLY carries the sitting so the reader can still name it', async () => {
    fetchMock.mockResolvedValue(
      respond(409, {
        ok: false,
        error: 'TRANSCRIPT_UNAVAILABLE',
        reason: 'source_only',
        sessionKey: 'canon:senat:5',
        session: {
          sessionKey: 'canon:senat:5',
          chamber: 'senat',
          sessionDate: '2026-05-13',
          title: 'Ședința Senatului',
          availability: 'SOURCE_ONLY',
          sourceUrl: 'https://senat.ro/lista',
          sourceUrlKind: 'lossy_root',
        },
        message: 'blank capture',
        meta: { requestId: 'r' },
      }),
    )

    const failure = await fetchParliamentTranscriptLive('canon:senat:5').then(
      () => null,
      (error: unknown) => classifyStenogramFailure(error),
    )
    expect(failure?.kind).toBe('transcript_unavailable')
    expect(failure?.reason).toBe('source_only')
    expect(failure?.retryable).toBe(false)
    expect(failure?.session?.title).toBe('Ședința Senatului')
    expect(failure?.session?.sourceUrlKind).toBe('lossy_root')
  })

  it('503 projection_unavailable is retryable', async () => {
    fetchMock.mockResolvedValue(
      respond(503, {
        ok: false,
        error: 'TRANSCRIPT_UNAVAILABLE',
        reason: 'projection_unavailable',
        message: 'not deployed here',
        meta: { requestId: 'r' },
      }),
    )
    const failure = await fetchParliamentTranscriptLive('canon:x').then(
      () => null,
      (error: unknown) => classifyStenogramFailure(error),
    )
    expect(failure).toMatchObject({
      kind: 'transcript_unavailable',
      reason: 'projection_unavailable',
      retryable: true,
    })
  })

  it('a proxy HTML error page is TRANSPORT — the API never answered', async () => {
    fetchMock.mockResolvedValue(respond(502, '<html>Bad Gateway</html>'))
    const failure = await fetchParliamentTranscriptLive('canon:x').then(
      () => null,
      (error: unknown) => classifyStenogramFailure(error),
    )
    expect(failure).toMatchObject({ kind: 'transport', status: 502 })
  })

  it('a 200 that is not JSON is TRANSPORT, not an empty sitting', async () => {
    fetchMock.mockResolvedValue(respond(200, 'not json at all'))
    const failure = await fetchParliamentTranscriptLive('canon:x').then(
      () => null,
      (error: unknown) => classifyStenogramFailure(error),
    )
    expect(failure?.kind).toBe('transport')
  })
})

describe('classifyTranscriptEnvelope', () => {
  it('reads the CODE, not the HTTP status', () => {
    // The server answers TRANSCRIPT_UNAVAILABLE with 409 or 503 depending on
    // reason; the FACT is what the reader must be told, not the envelope.
    const at409 = classifyTranscriptEnvelope(409, {
      error: 'TRANSCRIPT_UNAVAILABLE',
      reason: 'no_public_segments',
      message: 'x',
    })
    expect(at409.kind).toBe('transcript_unavailable')
    expect(at409.retryable).toBe(false)
  })

  it('maps SEARCH_UNAVAILABLE to its own state', () => {
    expect(
      classifyTranscriptEnvelope(503, {
        error: 'SEARCH_UNAVAILABLE',
        message: 'x',
      }).kind,
    ).toBe('search_unavailable')
  })

  it('an unrecognised module code is a server refusal, not a transport fault', () => {
    expect(
      classifyTranscriptEnvelope(400, {
        error: 'INVALID_INPUT',
        message: 'bad key',
      }),
    ).toMatchObject({ kind: 'graphql', retryable: false })
  })

  it('a 5xx module code stays retryable', () => {
    expect(
      classifyTranscriptEnvelope(500, {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'boom',
      }).retryable,
    ).toBe(true)
  })

  it('an envelope-less body is transport at any status', () => {
    expect(classifyTranscriptEnvelope(504, null).kind).toBe('transport')
    expect(classifyTranscriptEnvelope(500, { nope: 1 }).kind).toBe('transport')
  })

  it('ignores a malformed session ref rather than failing the error path', () => {
    const failure = classifyTranscriptEnvelope(409, {
      error: 'TRANSCRIPT_UNAVAILABLE',
      reason: 'source_only',
      session: { sessionKey: 'only-a-key' },
      message: 'x',
    })
    expect(failure.kind).toBe('transcript_unavailable')
    expect(failure.session).toBeUndefined()
  })

  it('accepts a wire ref whose optional fields are null', () => {
    const failure = classifyTranscriptEnvelope(409, {
      error: 'TRANSCRIPT_UNAVAILABLE',
      reason: 'source_only',
      session: {
        sessionKey: 'canon:s1',
        chamber: 'senat',
        sessionDate: null,
        title: null,
        availability: 'SOURCE_ONLY',
        sourceUrl: 'https://senat.ro/x',
        sourceUrlKind: 'lossy_root',
      },
      message: 'x',
    })
    expect(failure.session?.sessionKey).toBe('canon:s1')
    expect(failure.session?.sessionDate).toBeUndefined()
  })
})
