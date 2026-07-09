/**
 * Mock adapter for the GLOBAL stenograme surface. Deterministic: a fixed
 * subset of the mock roster gets the shared `MOCK_SPEECH_TEMPLATES` turns,
 * with the SAME speech keys as the member interventii tab, so cross-navigation
 * (global card → member tab, member tab → global page) stays coherent in mock
 * mode.
 *
 * Mirrors the server contract the live adapter targets:
 *  - hybrid search depth: `q` matches title+summary always; `fullText` only
 *    when the query is bounded (mandateKey, or a window ≤ 92 days) — reported
 *    back via `searchDepth` so the depth notice is honest in mock mode too;
 *  - keyset order spokenAt desc; offset cursor (same scheme as the member
 *    mock); `total` capped at 10 000 with `totalEstimated`.
 */
import type {
  ParliamentSpeech,
  ParliamentSpeechActivity,
  ParliamentSpeechesList,
  ParliamentSpeechSearchDepth,
} from '@/schemas/parliament'
import {
  ParliamentSpeechActivitySchema,
  ParliamentSpeechesListSchema,
  ParliamentSpeechSchema,
} from '@/schemas/parliament'
import { formatMemberName } from '../lib/formatting'
import {
  SPEECHES_FULLTEXT_WINDOW_MAX_DAYS,
  speechWindowDays,
  type ParliamentSpeechesFilterInput,
} from '../lib/parliament-speeches-filter'
import {
  MOCK_PARLIAMENT_MEMBERS,
  MOCK_SPEECH_TEMPLATES,
  mockOwnChamberToken,
} from './parliament-api.mock'

const MOCK_SPEECHES_PAGE_SIZE = 20
const MOCK_TOTAL_CAP = 10_000
/** Deterministic speaker subset: enough for a busy heatmap + speaker filter. */
const MOCK_SPEAKERS_PER_CHAMBER = 10

function mockSpeakers() {
  const byChamber = (chamber: 'camera' | 'senat') =>
    MOCK_PARLIAMENT_MEMBERS.filter((m) => m.chamber === chamber)
      .slice()
      .sort((a, b) => a.memberId.localeCompare(b.memberId))
      .slice(0, MOCK_SPEAKERS_PER_CHAMBER)
  return [...byChamber('camera'), ...byChamber('senat')]
}

/** Every global mock speech turn (built once, module-scoped, deterministic). */
function buildGlobalSpeeches(): ParliamentSpeech[] {
  const speeches: ParliamentSpeech[] = []
  for (const member of mockSpeakers()) {
    const own = mockOwnChamberToken(member.chamber)
    MOCK_SPEECH_TEMPLATES.forEach((tpl, index) => {
      const chamber = tpl.sitting === 'own' ? own : 'comun'
      const lossy = chamber === 'senat'
      speeches.push(
        ParliamentSpeechSchema.parse({
          // SAME key scheme as the member mock — detail/deep-links line up.
          speechKey: `${member.memberId}:sp:${index}`,
          spokenAt: tpl.date,
          title: tpl.title,
          summary: tpl.summary,
          chamber,
          sourceUrl: lossy
            ? 'https://www.senat.ro/Legis/lista.aspx'
            : `https://www.cdep.ro/pls/steno/steno2015.stenograma?ids=${9000 + index}`,
          sourceUrlKind: lossy ? 'lossy_root' : 'exact',
          fullText: tpl.fullText,
          speakerName: formatMemberName(member.firstName, member.lastName),
          speaker: {
            mandateKey: member.memberId,
            fullName: formatMemberName(member.firstName, member.lastName),
            chamber,
            groupName: member.groupName,
          },
        }),
      )
    })
  }
  // Keyset order = spokenAt desc, then key for a stable same-day order.
  return speeches.sort(
    (a, b) =>
      b.spokenAt.localeCompare(a.spokenAt) ||
      a.speechKey.localeCompare(b.speechKey),
  )
}

let cache: ParliamentSpeech[] | null = null
function allGlobalSpeeches(): ParliamentSpeech[] {
  cache ??= buildGlobalSpeeches()
  return cache
}

/** The applied search depth — the mock mirror of the server's hybrid rule. */
function appliedSearchDepth(
  filter: ParliamentSpeechesFilterInput | undefined,
  q: string | undefined,
): ParliamentSpeechSearchDepth | null {
  if (!q?.trim()) return null
  if (filter?.mandateKey?.eq) return 'FULL_TEXT'
  const days = speechWindowDays(filter?.spokenAt?.gte, filter?.spokenAt?.lte)
  return days !== null && days <= SPEECHES_FULLTEXT_WINDOW_MAX_DAYS
    ? 'FULL_TEXT'
    : 'TITLE_SUMMARY'
}

function applyGlobalFilter(
  speeches: readonly ParliamentSpeech[],
  filter: ParliamentSpeechesFilterInput | undefined,
  q: string | undefined,
  depth: ParliamentSpeechSearchDepth | null,
): ParliamentSpeech[] {
  const from = filter?.spokenAt?.gte
  const to = filter?.spokenAt?.lte
  const chamber = filter?.chamber?.eq
  const mandateKey = filter?.mandateKey?.eq
  const needle = q?.trim().toLowerCase()
  return speeches.filter((speech) => {
    if (mandateKey && speech.speaker?.mandateKey !== mandateKey) return false
    if (chamber && speech.chamber !== chamber) return false
    const day = speech.spokenAt.slice(0, 10)
    if (from && day < from) return false
    if (to && day > to) return false
    if (needle) {
      // Depth-honest haystack: transcripts join only at FULL_TEXT depth.
      const haystack = [
        speech.title,
        speech.summary,
        depth === 'FULL_TEXT' ? speech.fullText : undefined,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}

export async function fetchParliamentSpeechesMock(
  after?: string,
  filter?: ParliamentSpeechesFilterInput,
  q?: string,
): Promise<ParliamentSpeechesList> {
  const depth = appliedSearchDepth(filter, q)
  const filtered = applyGlobalFilter(allGlobalSpeeches(), filter, q, depth)
  const start = after ? Math.max(0, Number.parseInt(after, 10) || 0) : 0
  const speeches = filtered.slice(start, start + MOCK_SPEECHES_PAGE_SIZE)
  const end = start + speeches.length
  const hasNextPage = end < filtered.length
  return ParliamentSpeechesListSchema.parse({
    speeches,
    total: Math.min(filtered.length, MOCK_TOTAL_CAP),
    totalEstimated: filtered.length > MOCK_TOTAL_CAP,
    searchDepth: depth,
    hasNextPage,
    endCursor: hasNextPage ? String(end) : null,
  })
}

export async function fetchParliamentSpeechActivityMock(
  year: number,
  filter?: ParliamentSpeechesFilterInput,
  q?: string,
): Promise<ParliamentSpeechActivity> {
  // The aggregate is bounded by `year`; a date filter is never sent here.
  const dateStripped: ParliamentSpeechesFilterInput | undefined = filter
    ? { ...filter, spokenAt: undefined }
    : undefined
  const depth = appliedSearchDepth(dateStripped, q)
  const filtered = applyGlobalFilter(allGlobalSpeeches(), dateStripped, q, depth)

  const availableYears = Array.from(
    new Set(filtered.map((s) => Number(s.spokenAt.slice(0, 4)))),
  )
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a)

  const dayMap = new Map<string, ParliamentSpeechActivity['days'][number]>()
  for (const speech of filtered) {
    if (Number(speech.spokenAt.slice(0, 4)) !== year) continue
    const date = speech.spokenAt.slice(0, 10)
    const day = dayMap.get(date) ?? { date, total: 0, proprie: 0, comun: 0 }
    day.total += 1
    if (speech.chamber === 'comun') day.comun += 1
    else day.proprie += 1
    dayMap.set(date, day)
  }

  return ParliamentSpeechActivitySchema.parse({
    year,
    availableYears,
    searchDepth: depth,
    days: Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  })
}

export async function fetchParliamentSpeechDetailMock(
  speechKey: string,
): Promise<ParliamentSpeech | null> {
  return (
    allGlobalSpeeches().find((speech) => speech.speechKey === speechKey) ?? null
  )
}
