/**
 * Raw GraphQL → domain mapping for the canonical stenogram surface.
 *
 * Same null-collapsing discipline as the speech mappers (`optText`, `YYYY-MM-DD`
 * truncation) with two deliberate exceptions:
 *
 *  - `segment.text` keeps its whitespace VERBATIM and is never trimmed to
 *    undefined. It is the printed reading block, and a block that is blank in
 *    the source must render as a blank block, not vanish from the document —
 *    positions are the document's identity.
 *  - `sessionDate` collapses to undefined when null, but `sessionDateSource` is
 *    always carried through, so the UI can say WHY a sitting has no date
 *    instead of showing an empty slot.
 */
import {
  ParliamentSpeechContextSchema,
  ParliamentStenogramSegmentSchema,
  ParliamentStenogramSessionRefSchema,
  ParliamentStenogramSessionSchema,
  ParliamentStenogramSessionsListSchema,
  ParliamentStenogramTranscriptSchema,
  type ParliamentSpeechContext,
  type ParliamentStenogramSegment,
  type ParliamentStenogramSession,
  type ParliamentStenogramSessionRef,
  type ParliamentStenogramSessionsList,
  type ParliamentStenogramTranscript,
} from '@/schemas/parliament'
import type {
  RawSpeechContext,
  RawStenogramSegment,
  RawStenogramSession,
} from './parliament-stenograms-queries'

/** Null → undefined; whitespace-only collapses so `.optional()` drops cleanly. */
function optText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function toFinite(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function mapStenogramSession(
  raw: RawStenogramSession,
): ParliamentStenogramSession {
  return ParliamentStenogramSessionSchema.parse({
    sessionKey: raw.sessionKey,
    chamber: raw.chamber,
    // Date-only source value; absent when the source carries no trustworthy date.
    sessionDate: raw.sessionDate ? raw.sessionDate.slice(0, 10) : undefined,
    sessionDateSource: raw.sessionDateSource,
    title: optText(raw.title),
    sourceSystem: raw.sourceSystem,
    availability: raw.availability,
    sourceUrl: raw.sourceUrl,
    sourceUrlKind: raw.sourceUrlKind,
    sittingKey: optText(raw.sittingKey),
    presidingText: optText(raw.presidingText),
    startTimeText: optText(raw.startTimeText),
    endTimeText: optText(raw.endTimeText),
    segmentCount: toFinite(raw.segmentCount),
    speechCount: toFinite(raw.speechCount),
    speakerCount: toFinite(raw.speakerCount),
    sourceUpdatedAt: optText(raw.sourceUpdatedAt),
    canonicalDigest: optText(raw.canonicalDigest),
    captureDigest: optText(raw.captureDigest),
  })
}

export function mapStenogramSegment(
  raw: RawStenogramSegment,
): ParliamentStenogramSegment {
  return ParliamentStenogramSegmentSchema.parse({
    segmentKey: raw.segmentKey,
    sessionKey: raw.sessionKey,
    position: toFinite(raw.position),
    kind: raw.kind,
    // Verbatim: internal whitespace is part of the printed record.
    text: raw.text,
    textChars: toFinite(raw.textChars),
    speakerName: optText(raw.speakerName),
    speakerRef: optText(raw.speakerRef),
    mandateKey: optText(raw.mandateKey),
    speechKey: optText(raw.speechKey),
    agendaRef: optText(raw.agendaRef),
    sourceUrl: raw.sourceUrl,
    sourceUrlKind: raw.sourceUrlKind,
  })
}

export function mapStenogramSessions(connection: {
  total: number
  totalEstimated: boolean
  edges: { cursor: string; node: RawStenogramSession }[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
}): ParliamentStenogramSessionsList {
  return ParliamentStenogramSessionsListSchema.parse({
    total: toFinite(connection.total),
    totalEstimated: connection.totalEstimated,
    hasNextPage: connection.pageInfo.hasNextPage,
    endCursor: connection.pageInfo.endCursor,
    sessions: connection.edges.map(({ node }) => mapStenogramSession(node)),
  })
}

/** A sitting NAVIGATION REF — the minimal shape, nulls collapsed. */
export function mapStenogramSessionRef(
  raw: unknown,
): ParliamentStenogramSessionRef | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const value = raw as Record<string, unknown>
  const parsed = ParliamentStenogramSessionRefSchema.safeParse({
    sessionKey: value['sessionKey'],
    chamber: value['chamber'],
    sessionDate:
      typeof value['sessionDate'] === 'string'
        ? value['sessionDate'].slice(0, 10)
        : undefined,
    title: optText(value['title'] as string | null | undefined),
    availability: value['availability'],
    sourceUrl: value['sourceUrl'],
    sourceUrlKind: value['sourceUrlKind'],
  })
  return parsed.success ? parsed.data : undefined
}

function mapNavigation(raw: unknown): {
  previous?: ParliamentStenogramSessionRef
  next?: ParliamentStenogramSessionRef
} {
  if (typeof raw !== 'object' || raw === null) return {}
  const value = raw as Record<string, unknown>
  const previous = mapStenogramSessionRef(value['previous'])
  const next = mapStenogramSessionRef(value['next'])
  return { ...(previous && { previous }), ...(next && { next }) }
}

/**
 * The GraphQL `parliamentStenogramSession` root — a bounded SLICE.
 *
 * `complete` is derived, not assumed: this root serves `segments` as a page of
 * `totalSegments`, so it only counts as complete when the page happens to be
 * the whole sitting. The reader gates find-in-document and print on that flag,
 * so getting it wrong here would let those operations quietly run on a prefix.
 */
export function mapStenogramTranscript(raw: {
  totalSegments: number
  session: RawStenogramSession
  segments: RawStenogramSegment[]
  navigation?: unknown
}): ParliamentStenogramTranscript {
  const totalSegments = toFinite(raw.totalSegments)
  return ParliamentStenogramTranscriptSchema.parse({
    session: mapStenogramSession(raw.session),
    segments: raw.segments.map(mapStenogramSegment),
    totalSegments,
    navigation: mapNavigation(raw.navigation),
    complete: raw.segments.length >= totalSegments,
  })
}

/**
 * The REST transcript envelope: `{ ok, data: { session, segments, navigation },
 * meta: { totalSegments, complete, … } }`.
 *
 * `complete` is read from `meta` rather than inferred — the endpoint serves one
 * whole sitting per response and says so, and taking it at its word (instead of
 * re-deriving it from array lengths) means a future short read shows up as a
 * refused promise rather than a silently-trusted prefix.
 */
export function mapTranscriptEnvelope(
  envelope: Record<string, unknown>,
): unknown {
  const data = (envelope['data'] ?? {}) as Record<string, unknown>
  const meta = (envelope['meta'] ?? {}) as Record<string, unknown>
  const segments = Array.isArray(data['segments'])
    ? (data['segments'] as RawStenogramSegment[])
    : []

  return {
    session: mapStenogramSession(data['session'] as RawStenogramSession),
    segments: segments.map(mapStenogramSegment),
    totalSegments:
      typeof meta['totalSegments'] === 'number'
        ? toFinite(meta['totalSegments'])
        : segments.length,
    navigation: mapNavigation(data['navigation']),
    complete: meta['complete'] === true,
  }
}

export function mapSpeechContext(
  raw: RawSpeechContext,
): ParliamentSpeechContext {
  return ParliamentSpeechContextSchema.parse({
    speechKey: raw.speechKey,
    session: mapStenogramSession(raw.session),
    segment: raw.segment ? mapStenogramSegment(raw.segment) : null,
    previousContribution: raw.previousContribution
      ? mapStenogramSegment(raw.previousContribution)
      : null,
    nextContribution: raw.nextContribution
      ? mapStenogramSegment(raw.nextContribution)
      : null,
    redirect: raw.redirect
      ? {
          legacySpeechKey: raw.redirect.legacySpeechKey,
          sessionKey: raw.redirect.sessionKey,
          canonicalSpeechKey: optText(raw.redirect.canonicalSpeechKey),
          canonicalSegmentKey: optText(raw.redirect.canonicalSegmentKey),
          // 0 is a REAL position (the first block); only null collapses.
          canonicalPosition:
            raw.redirect.canonicalPosition === null
              ? undefined
              : toFinite(raw.redirect.canonicalPosition),
          mappingKind: raw.redirect.mappingKind,
          matchMethod: raw.redirect.matchMethod,
        }
      : null,
  })
}
