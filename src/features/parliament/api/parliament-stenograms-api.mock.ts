/**
 * Mock adapter for the canonical stenogram surface.
 *
 * The sittings are DERIVED from the same mock turns the interventions views
 * serve (`allGlobalMockSpeeches`), grouped one sitting per (chamber, day) with
 * the positions those turns are already stamped with. So a mock card links to a
 * mock sitting that really does contain it, and the reader's highlight lands on
 * the right block — the cross-navigation contract is exercised in mock mode
 * instead of only in production.
 *
 * Two states are deliberately synthesized because they are the ones the UI must
 * get right and would otherwise never be seen in development:
 *   - a SOURCE_ONLY sitting (held with its official URL, no reading served);
 *   - a dateless capture (`sessionDateSource: 'none'`).
 */
import type {
  ParliamentSpeech,
  ParliamentSpeechContext,
  ParliamentStenogramSegment,
  ParliamentStenogramSession,
  ParliamentStenogramSessionsList,
  ParliamentStenogramTranscript,
} from '@/schemas/parliament'
import {
  ParliamentSpeechContextSchema,
  ParliamentStenogramSegmentSchema,
  ParliamentStenogramSessionSchema,
  ParliamentStenogramSessionsListSchema,
  ParliamentStenogramTranscriptSchema,
} from '@/schemas/parliament'
import {
  ParliamentStenogramFailureError,
  ParliamentStenogramNotFoundError,
} from '../lib/parliament-stenogram-error'
import type { ParliamentStenogramSessionsFilterInput } from '../lib/parliament-stenogram-filter'
import {
  allGlobalMockSpeeches,
  MOCK_SESSION_FIRST_SPEECH_POSITION,
} from './parliament-speeches-api.mock'
import { TRANSCRIPT_SLICE_SIZE } from './parliament-stenograms-api.live'

const MOCK_SESSIONS_PAGE_SIZE = 20
const MOCK_TOTAL_CAP = 10_000

/** The one mock capture that yields no reading — exercises the honest state. */
const MOCK_SOURCE_ONLY_SESSION_KEY = 'canon:mock:senat:2025-06-15'
/** The one mock capture whose source carries no trustworthy date. */
const MOCK_DATELESS_SESSION_KEY = 'canon:mock:camera_deputatilor:0000-00-00'

function chamberLabel(chamber: string): string {
  if (chamber === 'comun') return 'ședinței comune'
  if (chamber === 'senat') return 'Senatului'
  return 'Camerei Deputaților'
}

function sessionSourceUrl(chamber: string, day: string): string {
  return chamber === 'senat'
    ? 'https://www.senat.ro/Legis/lista.aspx'
    : `https://www.cdep.ro/pls/steno/steno2015.stenograma?ids=${day.split('-').join('')}`
}

interface MockSitting {
  readonly session: ParliamentStenogramSession
  readonly segments: readonly ParliamentStenogramSegment[]
}

function buildSegment(
  sessionKey: string,
  chamber: string,
  day: string,
  fields: Partial<ParliamentStenogramSegment> & {
    position: number
    kind: ParliamentStenogramSegment['kind']
    text: string
  },
): ParliamentStenogramSegment {
  const lossy = chamber === 'senat'
  return ParliamentStenogramSegmentSchema.parse({
    segmentKey: `${sessionKey}#${String(fields.position)}`,
    sessionKey,
    textChars: fields.text.length,
    sourceUrl: sessionSourceUrl(chamber, day),
    sourceUrlKind: lossy ? 'lossy_root' : 'exact',
    ...fields,
  })
}

function buildSittings(): readonly MockSitting[] {
  const bySession = new Map<string, ParliamentSpeech[]>()
  for (const speech of allGlobalMockSpeeches()) {
    if (!speech.sessionKey) continue
    const bucket = bySession.get(speech.sessionKey) ?? []
    bucket.push(speech)
    bySession.set(speech.sessionKey, bucket)
  }

  const sittings: MockSitting[] = []

  for (const [sessionKey, speeches] of bySession) {
    const ordered = speeches
      .slice()
      .sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          a.speechKey.localeCompare(b.speechKey),
      )
    const first = ordered[0]
    if (!first) continue
    const chamber = first.chamber ?? 'camera_deputatilor'
    const day = first.spokenAt.slice(0, 10)
    const sourceOnly = sessionKey === MOCK_SOURCE_ONLY_SESSION_KEY

    const segments: ParliamentStenogramSegment[] = sourceOnly
      ? []
      : [
          buildSegment(sessionKey, chamber, day, {
            position: 0,
            kind: 'AGENDA_HEADING',
            text: `Ordinea de zi a ${chamberLabel(chamber)} din ${day}`,
            agendaRef: `mock-agenda-${day}`,
          }),
          ...ordered.map((speech) =>
            buildSegment(sessionKey, chamber, day, {
              position: speech.position ?? MOCK_SESSION_FIRST_SPEECH_POSITION,
              kind: 'SPEECH',
              text:
                speech.fullText ??
                speech.summary ??
                speech.title ??
                '(bloc fără text în captura mock)',
              ...(speech.speakerName && { speakerName: speech.speakerName }),
              ...(speech.speaker?.mandateKey && {
                mandateKey: speech.speaker.mandateKey,
              }),
              speechKey: speech.speechKey,
            }),
          ),
        ]

    sittings.push({
      session: ParliamentStenogramSessionSchema.parse({
        sessionKey,
        chamber,
        sessionDate: day,
        sessionDateSource:
          chamber === 'senat' ? 'session_date' : 'stenogram_title',
        title: `Stenograma ${chamberLabel(chamber)} din ${day}`,
        sourceSystem: chamber === 'senat' ? 'senat_stenogram' : 'cdep_stenogram',
        availability: sourceOnly
          ? 'SOURCE_ONLY'
          : ordered.some((s) => s.fullText)
            ? 'COMPLETE'
            : 'PARTIAL',
        sourceUrl: sessionSourceUrl(chamber, day),
        sourceUrlKind: chamber === 'senat' ? 'lossy_root' : 'exact',
        presidingText: 'Domnul președinte de ședință',
        startTimeText: '09:00',
        endTimeText: '13:30',
        segmentCount: segments.length,
        speechCount: segments.filter((s) => s.kind === 'SPEECH').length,
        speakerCount: new Set(
          segments.map((s) => s.mandateKey).filter(Boolean),
        ).size,
        sourceUpdatedAt: `${day}T18:00:00.000Z`,
      }),
      segments,
    })
  }

  // A capture whose source carries no trustworthy date. It sorts LAST (the
  // server's keyset puts a dateless capture at the end) and must never be
  // dated by inference anywhere in the UI.
  sittings.push({
    session: ParliamentStenogramSessionSchema.parse({
      sessionKey: MOCK_DATELESS_SESSION_KEY,
      chamber: 'camera_deputatilor',
      sessionDateSource: 'none',
      title: 'Stenogramă fără dată în sursă',
      sourceSystem: 'cdep_stenogram',
      availability: 'PARTIAL',
      sourceUrl: 'https://www.cdep.ro/pls/steno/steno2015.data',
      sourceUrlKind: 'raw_response',
      segmentCount: 1,
      speechCount: 0,
      speakerCount: 0,
    }),
    segments: [
      buildSegment(
        MOCK_DATELESS_SESSION_KEY,
        'camera_deputatilor',
        '2026-01-01',
        {
          position: 0,
          kind: 'CONTEXT',
          text: 'Captura nu conține o dată de ședință în care să avem încredere.',
        },
      ),
    ],
  })

  // Keyset order: sessionDate desc, dateless LAST.
  return sittings.sort((a, b) => {
    const aDate = a.session.sessionDate ?? ''
    const bDate = b.session.sessionDate ?? ''
    if (aDate && bDate) {
      return (
        bDate.localeCompare(aDate) ||
        b.session.sessionKey.localeCompare(a.session.sessionKey)
      )
    }
    if (aDate) return -1
    if (bDate) return 1
    return 0
  })
}

let cache: readonly MockSitting[] | null = null
function allSittings(): readonly MockSitting[] {
  cache ??= buildSittings()
  return cache
}

function matchesFilter(
  sitting: MockSitting,
  filter: ParliamentStenogramSessionsFilterInput | undefined,
): boolean {
  if (!filter) return true
  const { session, segments } = sitting

  if (filter.chamber?.eq && session.chamber !== filter.chamber.eq) return false
  if (filter.availability?.eq && session.availability !== filter.availability.eq)
    return false

  if (filter.mandateKey?.eq) {
    const holds = segments.some(
      (s) => s.kind === 'SPEECH' && s.mandateKey === filter.mandateKey?.eq,
    )
    if (!holds) return false
  }

  // A dateless capture matches NO date filter — it is never dated by inference.
  if (filter.year?.eq !== undefined) {
    if (!session.sessionDate) return false
    if (Number(session.sessionDate.slice(0, 4)) !== filter.year.eq) return false
  }
  if (filter.sessionDate) {
    if (!session.sessionDate) return false
    const { gte, lte } = filter.sessionDate
    if (gte && session.sessionDate < gte) return false
    if (lte && session.sessionDate > lte) return false
  }

  return true
}

/** Full-history text match over the sitting title + its whole reading. */
function matchesQuery(sitting: MockSitting, q: string | undefined): boolean {
  const needle = q?.trim().toLowerCase()
  if (!needle) return true
  const haystack = [
    sitting.session.title,
    ...sitting.segments.map((s) => s.text),
    ...sitting.segments.map((s) => s.speakerName),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

export async function fetchParliamentStenogramSessionsMock(
  after?: string,
  filter?: ParliamentStenogramSessionsFilterInput,
  q?: string,
): Promise<ParliamentStenogramSessionsList> {
  const matched = allSittings().filter(
    (sitting) => matchesFilter(sitting, filter) && matchesQuery(sitting, q),
  )
  const start = after ? Math.max(0, Number.parseInt(after, 10) || 0) : 0
  const page = matched.slice(start, start + MOCK_SESSIONS_PAGE_SIZE)
  const end = start + page.length
  const hasNextPage = end < matched.length

  return ParliamentStenogramSessionsListSchema.parse({
    sessions: page.map((sitting) => sitting.session),
    total: Math.min(matched.length, MOCK_TOTAL_CAP),
    totalEstimated: matched.length > MOCK_TOTAL_CAP,
    hasNextPage,
    endCursor: hasNextPage ? String(end) : null,
  })
}

/** Chamber-scoped chronological neighbours, mirroring the server's own. */
function mockNavigation(sessionKey: string, chamber: string) {
  const sameChamber = allSittings()
    .map((s) => s.session)
    .filter((s) => s.chamber === chamber && s.sessionDate)
  const index = sameChamber.findIndex((s) => s.sessionKey === sessionKey)
  if (index === -1) return {}
  // Newest first ⇒ the NEXT (later) sitting sits ABOVE, the PREVIOUS below.
  const next = index > 0 ? sameChamber[index - 1] : undefined
  const previous =
    index < sameChamber.length - 1 ? sameChamber[index + 1] : undefined
  const ref = (s: ParliamentStenogramSession | undefined) =>
    s
      ? {
          sessionKey: s.sessionKey,
          chamber: s.chamber,
          ...(s.sessionDate && { sessionDate: s.sessionDate }),
          ...(s.title && { title: s.title }),
          availability: s.availability,
          sourceUrl: s.sourceUrl,
          sourceUrlKind: s.sourceUrlKind,
        }
      : undefined
  return { ...(previous && { previous: ref(previous) }), ...(next && { next: ref(next) }) }
}

/**
 * The COMPLETE transcript — the mock twin of the REST endpoint.
 *
 * It takes no pagination for the same reason the endpoint does not: the reader
 * searches and prints whole documents, and a mock that could hand back a prefix
 * would let a prefix bug pass development unnoticed.
 *
 * A SOURCE_ONLY capture THROWS `TRANSCRIPT_UNAVAILABLE` carrying the sitting
 * ref, exactly as the server 409s — it does NOT return an empty reading. The
 * difference matters: an empty 200 would let the reader render a silent sitting.
 */
export async function fetchParliamentTranscriptMock(
  sessionKey: string,
): Promise<ParliamentStenogramTranscript> {
  const sitting = allSittings().find((s) => s.session.sessionKey === sessionKey)
  if (!sitting) {
    throw new ParliamentStenogramNotFoundError(
      `Nu există o ședință cu cheia ${sessionKey}`,
    )
  }

  const { session } = sitting
  if (session.availability === 'SOURCE_ONLY' || sitting.segments.length === 0) {
    throw new ParliamentStenogramFailureError({
      kind: 'transcript_unavailable',
      reason:
        session.availability === 'SOURCE_ONLY'
          ? 'source_only'
          : 'no_public_segments',
      sessionKey,
      session: {
        sessionKey: session.sessionKey,
        chamber: session.chamber,
        ...(session.sessionDate && { sessionDate: session.sessionDate }),
        ...(session.title && { title: session.title }),
        availability: session.availability,
        sourceUrl: session.sourceUrl,
        sourceUrlKind: session.sourceUrlKind,
      },
      message: `Captura ședinței ${sessionKey} nu conține text servibil`,
      retryable: false,
    })
  }

  return ParliamentStenogramTranscriptSchema.parse({
    session,
    segments: sitting.segments,
    totalSegments: sitting.segments.length,
    navigation: mockNavigation(sessionKey, session.chamber),
    complete: true,
  })
}

/** The GraphQL SLICE twin — kept for callers that want a bounded peek. */
export async function fetchParliamentStenogramTranscriptMock(
  sessionKey: string,
  offset = 0,
  limit = TRANSCRIPT_SLICE_SIZE,
): Promise<ParliamentStenogramTranscript> {
  const sitting = allSittings().find((s) => s.session.sessionKey === sessionKey)
  if (!sitting) {
    throw new ParliamentStenogramNotFoundError(
      `Nu există o ședință cu cheia ${sessionKey}`,
    )
  }
  const segments = sitting.segments.slice(offset, offset + limit)
  return ParliamentStenogramTranscriptSchema.parse({
    session: sitting.session,
    segments,
    totalSegments: sitting.segments.length,
    navigation: mockNavigation(sessionKey, sitting.session.chamber),
    complete: segments.length >= sitting.segments.length,
  })
}

export async function fetchParliamentSpeechContextMock(
  speechKey: string,
): Promise<ParliamentSpeechContext | null> {
  for (const sitting of allSittings()) {
    const index = sitting.segments.findIndex((s) => s.speechKey === speechKey)
    if (index === -1) continue
    const contributions = sitting.segments.filter((s) => s.kind === 'SPEECH')
    const among = contributions.findIndex((s) => s.speechKey === speechKey)
    return ParliamentSpeechContextSchema.parse({
      speechKey,
      session: sitting.session,
      segment: sitting.segments[index],
      previousContribution: among > 0 ? contributions[among - 1] : null,
      nextContribution:
        among >= 0 && among < contributions.length - 1
          ? contributions[among + 1]
          : null,
      redirect: null,
    })
  }
  return null
}
