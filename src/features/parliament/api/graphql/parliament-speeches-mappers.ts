/**
 * Raw GraphQL → domain mapping for the global stenograme surface. Mirrors the
 * member-speech mappers in `parliament-mappers.ts` (null-collapsing via
 * `optText`, `YYYY-MM-DD` date truncation, whitespace-preserving `fullText`),
 * plus speaker normalization: a `member` object with a blank `fullName` falls
 * back to the printed `speakerName`, and a fully-empty member collapses to
 * `speaker: null` (unmatched speakers are real data, rendered without a link).
 */
import {
  ParliamentSpeechActivitySchema,
  ParliamentSpeechesListSchema,
  ParliamentSpeechSchema,
  type ParliamentSpeech,
  type ParliamentSpeechActivity,
  type ParliamentSpeechesList,
} from '@/schemas/parliament'
import type {
  RawParliamentSpeech,
  RawParliamentSpeechActivity,
} from './parliament-speeches-queries'

/** Null → undefined; whitespace-only collapses so `.optional()` drops cleanly. */
function optText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function toFinite(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function mapSpeechNode(node: RawParliamentSpeech): ParliamentSpeech {
  const speakerName = optText(node.speakerName)
  const memberName = optText(node.member?.fullName)
  const speaker = node.member
    ? {
        mandateKey: node.member.mandateKey,
        fullName: memberName ?? speakerName ?? node.member.mandateKey,
        chamber: optText(node.member.chamber),
        groupName: optText(node.member.groupName),
      }
    : null

  return ParliamentSpeechSchema.parse({
    speechKey: node.speechKey,
    // Date-only source value; empty when the source row carries no date.
    spokenAt: node.spokenAt ? node.spokenAt.slice(0, 10) : '',
    title: optText(node.title),
    summary: optText(node.summary),
    chamber: optText(node.chamber),
    sourceUrl: optText(node.sourceUrl),
    sourceUrlKind: optText(node.sourceUrlKind),
    // Keep the transcript's internal whitespace; only null → undefined.
    fullText: node.fullText ?? undefined,
    ...canonicalPointers(node),
    speakerName,
    speaker,
  })
}

/**
 * The canonical pointers, collapsed to a shape the UI can trust blindly.
 *
 * A sitting link is only offered when the row is canonical AND names its
 * sitting — a `sessionKey` without `isCanonical`, or the reverse, is a
 * half-mapped row, and linking on it would produce a reader page that cannot
 * highlight anything. `position` keeps 0 (the first block is a real position;
 * only null means "no position").
 */
export function canonicalPointers(node: {
  isCanonical?: boolean | null
  sessionKey?: string | null
  position?: number | null
}): { isCanonical: boolean; sessionKey?: string; position?: number } {
  const isCanonical = node.isCanonical === true
  const sessionKey = node.sessionKey?.trim()
  if (!isCanonical || !sessionKey) return { isCanonical: false }
  return {
    isCanonical: true,
    sessionKey,
    ...(typeof node.position === 'number' &&
      Number.isFinite(node.position) && { position: node.position }),
  }
}

export function mapParliamentSpeeches(
  connection: {
    total: number
    totalEstimated: boolean
    searchDepth: 'TITLE_SUMMARY' | 'FULL_TEXT' | null
    edges: { cursor: string; node: RawParliamentSpeech }[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  },
): ParliamentSpeechesList {
  return ParliamentSpeechesListSchema.parse({
    total: toFinite(connection.total),
    totalEstimated: connection.totalEstimated,
    searchDepth: connection.searchDepth,
    hasNextPage: connection.pageInfo.hasNextPage,
    endCursor: connection.pageInfo.endCursor,
    speeches: connection.edges.map(({ node }) => mapSpeechNode(node)),
  })
}

export function mapParliamentSpeech(
  node: RawParliamentSpeech,
): ParliamentSpeech {
  return mapSpeechNode(node)
}

export function mapParliamentSpeechActivity(
  raw: RawParliamentSpeechActivity,
): ParliamentSpeechActivity {
  return ParliamentSpeechActivitySchema.parse({
    year: raw.year,
    availableYears: raw.availableYears,
    searchDepth: raw.searchDepth,
    days: raw.days.map((d) => ({
      date: d.date,
      total: toFinite(d.total),
      proprie: toFinite(d.proprie),
      comun: toFinite(d.comun),
    })),
  })
}
