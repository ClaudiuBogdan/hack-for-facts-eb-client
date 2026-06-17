/**
 * Map raw GraphQL parliament responses onto the UI's `Parliament*` schema types.
 *
 * The GraphQL surface is DB-native and narrower than the mock fixtures: it has
 * no group colour, no member contact/photo, no bill `billType`/`currentLocation`
 * column, and no per-bill passage timeline. Where the UI needs those, we derive
 * them deterministically (title heuristics, event timelines, the static colour
 * map) and default the rest. We never fabricate data that would mislead — a
 * defaulted field is either UI decoration (colour) or a clearly-empty list.
 */
import {
  ParliamentBillDetailSchema,
  ParliamentBillSummarySchema,
  ParliamentChamberSchema,
  ParliamentGroupSchema,
  ParliamentMemberSchema,
  ParliamentMemberProfileSchema,
  ParliamentMemberVotingHistorySchema,
  ParliamentVoteDetailSchema,
  ParliamentVoteSummarySchema,
  type BillCurrentLocation,
  type BillType,
  type MemberVoteChoice,
  type ParliamentBillDetail,
  type ParliamentBillRelatedVote,
  type ParliamentBillSummary,
  type ParliamentChamber,
  type ParliamentGroup,
  type ParliamentMember,
  type ParliamentMemberProfile,
  type ParliamentMemberVotingHistory,
  type ParliamentVoteDetail,
  type ParliamentVoteSummary,
  type VoteOutcome,
} from '@/schemas/parliament'
import {
  colorForGroupName,
  deriveGroupId,
  foldSlug,
  fromGraphqlChamber,
  type GraphqlChamber,
} from './parliament-translate'
import type {
  RawParliamentBallot,
  RawParliamentBillDetail,
  RawParliamentBillEvent,
  RawParliamentBillSummary,
  RawParliamentGroup,
  RawParliamentMember,
  RawParliamentMemberVote,
  RawParliamentTally,
  RawParliamentVoteDetail,
  RawParliamentVoteListNode,
} from './parliament-queries'
import { primeMemberJudet, primeVoteSummary } from './vote-summary-cache'

// ── primitives ────────────────────────────────────────────────────────────

function num(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** GraphQL `Date` (`YYYY-MM-DD`) → an ISO timestamp the UI date formatters use. */
function toIsoDate(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  // Already a full timestamp.
  if (trimmed.includes('T')) return trimmed
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00+03:00`
  return trimmed
}

const VOTE_CHOICE_MAP: Record<string, MemberVoteChoice> = {
  pentru: 'pentru',
  impotriva: 'impotriva',
  abtinere: 'abtinere',
  nu_a_votat: 'nu_a_votat',
}
function toVoteChoice(value: string | null | undefined): MemberVoteChoice {
  return (value && VOTE_CHOICE_MAP[value]) || 'nu_a_votat'
}

function toOutcome(value: string | null | undefined): VoteOutcome {
  // GraphQL only ever returns `adoptat | respins`; `amânat` is a UI-only state.
  return value === 'respins' ? 'respins' : 'adoptat'
}

const OUTCOME_LABEL: Record<VoteOutcome, string> = {
  adoptat: 'Proiectul a fost adoptat',
  respins: 'Proiectul a fost respins',
  amânat: 'Votul a fost amânat',
}

// ── groups ──────────────────────────────────────────────────────────────────

export function mapGroup(raw: RawParliamentGroup): ParliamentGroup {
  const chamber = fromGraphqlChamber(raw.chamber) ?? 'camera'
  return ParliamentGroupSchema.parse({
    groupId: raw.groupId,
    name: raw.name,
    shortName: raw.name,
    chamber,
    memberCount: num(raw.memberCount),
    color: colorForGroupName(raw.name),
  })
}

// ── members ───────────────────────────────────────────────────────────────

/**
 * Split `fullName` ("Abrudean Mircea") into last/first. Romanian parliamentary
 * listings put the family name first; we treat the first token as the surname
 * and the remainder as given names. Good enough for display; the UI mostly uses
 * the recombined `formatMemberName`.
 */
function splitFullName(fullName: string | null | undefined): {
  firstName: string
  lastName: string
} {
  const name = fullName?.trim() ?? ''
  if (!name) return { firstName: '', lastName: '' }
  const tokens = name.split(/\s+/)
  if (tokens.length === 1) return { firstName: '', lastName: tokens[0]! }
  return { lastName: tokens[0]!, firstName: tokens.slice(1).join(' ') }
}

export function mapMember(raw: RawParliamentMember): ParliamentMember {
  const gqlChamber = (raw.chamber ?? 'camera_deputatilor') as GraphqlChamber
  const chamber: ParliamentChamber = fromGraphqlChamber(raw.chamber) ?? 'camera'
  const { firstName, lastName } = splitFullName(raw.fullName)
  const constituency = raw.constituencyName?.trim() ?? ''

  // The official cdep/senat profile page (server `profileUrl`) is surfaced as
  // the member's `contact.website` so the contact tab's "Website" card renders
  // it. Only a valid http(s) URL is accepted (the schema requires `.url()`).
  const profileUrl = raw.profileUrl?.trim()
  const contact =
    profileUrl && /^https?:\/\//i.test(profileUrl)
      ? { website: profileUrl }
      : undefined

  return ParliamentMemberSchema.parse({
    memberId: raw.mandateKey,
    firstName,
    lastName,
    chamber,
    groupId: deriveGroupId(raw.groupName, gqlChamber),
    groupName: raw.groupName ?? '',
    judetSlug: constituency ? foldSlug(constituency) : '',
    judetName: constituency,
    ...(contact ? { contact } : {}),
    // mandate dates / role / photo are not on the live surface.
  })
}

// ── votes ───────────────────────────────────────────────────────────────────

function mapVoteSummaryCommon(
  raw: RawParliamentVoteListNode | RawParliamentVoteDetail,
): ParliamentVoteSummary {
  const chamber = fromGraphqlChamber(raw.chamber) ?? 'camera'
  const outcome = toOutcome(raw.outcome)
  return ParliamentVoteSummarySchema.parse({
    voteId: raw.voteKey,
    chamber,
    title: raw.title ?? '(fără titlu)',
    heldAt: toIsoDate(raw.voteDate, new Date(0).toISOString()),
    voteType: 'deschis',
    outcome,
    outcomeLabel: OUTCOME_LABEL[outcome],
    tally: {
      pentru: num(raw.tally.pentru),
      impotriva: num(raw.tally.impotriva),
      abtinere: num(raw.tally.abtinere),
      nuAVotat: num(raw.tally.nuAVotat),
    },
    relatedBillId: raw.billKey ?? undefined,
  })
}

/** Map a vote list node to the UI list-item shape (adds `divisionNumber`). */
export function mapVoteListItem(raw: RawParliamentVoteListNode) {
  const summary = mapVoteSummaryCommon(raw)
  const divisionNumber = num(raw.divisionNumber) > 0 ? num(raw.divisionNumber) : 1
  primeVoteSummary(summary, num(raw.divisionNumber) > 0 ? num(raw.divisionNumber) : undefined)
  return { ...summary, divisionNumber }
}

export function mapVoteDetail(raw: RawParliamentVoteDetail): ParliamentVoteDetail {
  const summary = mapVoteSummaryCommon(raw)
  primeVoteSummary(summary, num(raw.divisionNumber) > 0 ? num(raw.divisionNumber) : undefined)
  const gqlChamber = (raw.chamber ?? 'camera_deputatilor') as GraphqlChamber

  const groupBreakdown = raw.groupBreakdown.map((g) => ({
    groupId: deriveGroupId(g.groupName, gqlChamber),
    groupName: g.groupName ?? 'Necunoscut',
    pentru: num(g.pentru),
    impotriva: num(g.impotriva),
    abtinere: num(g.abtinere),
    nuAVotat: num(g.nuAVotat),
  }))

  const memberVotes = raw.ballots.edges.map(({ node }) =>
    mapBallot(node, gqlChamber),
  )

  return ParliamentVoteDetailSchema.parse({
    ...summary,
    groupBreakdown,
    memberVotes,
  })
}

function mapBallot(raw: RawParliamentBallot, chamber: GraphqlChamber) {
  const memberId = raw.mandateKey ?? `row-${raw.rowIndex}`
  // Prime the member→județ cache from the resolved member's constituency so the
  // vote-detail județ column (sync `getMemberJudetMap()`) is populated.
  if (raw.mandateKey) primeMemberJudet(raw.mandateKey, raw.constituencyName)
  return {
    memberId,
    memberName: raw.memberName ?? 'Necunoscut',
    groupId: deriveGroupId(raw.groupName, chamber),
    groupName: raw.groupName ?? 'Necunoscut',
    choice: toVoteChoice(raw.choice),
  }
}

// ── member voting history ─────────────────────────────────────────────────

export function mapMemberVotingHistory(
  memberId: string,
  votes: RawParliamentMemberVote[],
  total: number,
): ParliamentMemberVotingHistory {
  return ParliamentMemberVotingHistorySchema.parse({
    memberId,
    total,
    votes: votes.map((v) => ({
      voteId: v.voteKey,
      chamber: fromGraphqlChamber(v.chamber) ?? 'camera',
      title: v.title ?? '(fără titlu)',
      heldAt: toIsoDate(v.voteDate, new Date(0).toISOString()),
      choice: toVoteChoice(v.choice),
      outcome: toOutcome(v.outcome),
    })),
  })
}

// ── bills ─────────────────────────────────────────────────────────────────

/**
 * Classify the UI `billType` from the source `billType` string (the server's
 * `procedure.tip_initiativa`, e.g. "Proiect de Lege pentru aprobarea O.U.G…"),
 * falling back to the title. The INITIATIVE-TYPE PREFIX is what classifies:
 *  - "Propunere legislativă" → MP/citizen initiative (`parlamentar`);
 *  - "Proiect de Lege"       → government project (`guvern`) — even when its
 *    SUBJECT is approving an OUG ("…pentru aprobarea O.U.G…"), the initiative is
 *    still a government project, so the OUG check must NOT win over the prefix;
 *  - a bare "Ordonanţă"/"OUG" initiative → `ordonanta`.
 */
function classifyBillType(
  serverBillType: string | null | undefined,
  title: string | null | undefined,
): BillType {
  const t = (serverBillType?.trim() || title || '').toLowerCase()
  if (t.startsWith('propunere legislativ') || t.includes('cetăţeni') || t.includes('cetateni')) {
    return 'parlamentar'
  }
  if (t.startsWith('proiect de lege')) return 'guvern'
  if (t.includes('ordonanţ') || t.includes('ordonant') || t.includes('o.u.g') || t.includes('oug')) {
    return 'ordonanta'
  }
  return 'guvern'
}

/**
 * Derive `currentLocation` from finalisation + the most recent event text. A
 * bill with a `finalLawNumber` is promulgated; otherwise we scan the latest
 * event for terminal keywords (respins/retras/promulgare), defaulting to the
 * originating chamber. Best-effort — surfaced as derived state, not a column.
 */
function deriveCurrentLocation(
  raw: RawParliamentBillSummary,
  events: readonly RawParliamentBillEvent[] | undefined,
  originating: ParliamentChamber,
): BillCurrentLocation {
  if (raw.finalLawNumber) return 'promulgat'
  const latest = lastEventText(events)
  if (latest.includes('respins')) return 'respins'
  if (latest.includes('retras')) return 'retras'
  if (latest.includes('mediere')) return 'mediere'
  if (latest.includes('promulgare') || latest.includes('preşedinte') || latest.includes('presedinte')) {
    return 'presedinte'
  }
  if (latest.includes('senat')) return 'senat'
  if (latest.includes('camera')) return 'camera'
  return originating
}

function lastEventText(
  events: readonly RawParliamentBillEvent[] | undefined,
): string {
  if (!events || events.length === 0) return ''
  const dated = [...events].sort((a, b) => {
    const da = a.eventDate ?? ''
    const db = b.eventDate ?? ''
    return da < db ? 1 : da > db ? -1 : b.position - a.position
  })
  return (dated[0]?.description ?? '').toLowerCase()
}

/**
 * Originating chamber: a bill with only a senate number originates in the
 * Senate; otherwise (plx present) the Chamber of Deputies. Diaspora/edge cases
 * default to camera.
 */
function deriveOriginatingChamber(
  raw: RawParliamentBillSummary,
): ParliamentChamber {
  if (raw.senateNumber && !raw.plxNumber) return 'senat'
  return 'camera'
}

const LOCATION_LABEL: Record<BillCurrentLocation, string> = {
  camera: 'La Camera Deputaților',
  senat: 'La Senat',
  mediere: 'Comisie de mediere',
  presedinte: 'La promulgare',
  promulgat: 'Promulgat',
  respins: 'Respins',
  retras: 'Retras',
}

function billNumber(raw: RawParliamentBillSummary): string {
  if (raw.plxNumber) return `PL-x ${raw.plxNumber}/${raw.plxYear ?? ''}`.trim()
  if (raw.senateNumber) return `L ${raw.senateNumber}/${raw.senateYear ?? ''}`.trim()
  return raw.billKey
}

function billYear(raw: RawParliamentBillSummary): number {
  return raw.plxYear ?? raw.senateYear ?? new Date().getFullYear()
}

export function mapBillSummary(
  raw: RawParliamentBillSummary,
  events?: readonly RawParliamentBillEvent[],
): ParliamentBillSummary {
  const originatingChamber = deriveOriginatingChamber(raw)
  const currentLocation = deriveCurrentLocation(raw, events, originatingChamber)
  const lastEvent = events && events.length > 0 ? latestEventDate(events) : null

  // Prefer the server's source-stored status string for the current-stage label;
  // fall back to the derived-location label when the source carries none.
  const stageLabel = raw.statusText?.trim()
    ? raw.statusText.trim()
    : LOCATION_LABEL[currentLocation]

  return ParliamentBillSummarySchema.parse({
    billId: raw.billKey,
    number: billNumber(raw),
    title: raw.title ?? '(fără titlu)',
    billType: classifyBillType(raw.billType, raw.title),
    originatingChamber,
    currentLocation,
    currentStageLabel: stageLabel,
    lastUpdatedAt: lastEvent ?? `${billYear(raw)}-01-01T00:00:00+03:00`,
    legislatureId: String(billYear(raw)),
  })
}

function latestEventDate(
  events: readonly RawParliamentBillEvent[],
): string | null {
  let max: string | null = null
  for (const e of events) {
    if (e.eventDate && (!max || e.eventDate > max)) max = e.eventDate
  }
  return max ? toIsoDate(max, `${new Date().getFullYear()}-01-01T00:00:00+03:00`) : null
}

export function mapBillRelatedVotes(
  raw: RawParliamentBillDetail,
): ParliamentBillRelatedVote[] {
  // Prime the vote-summary cache from the full related-vote payload so the bill
  // tabs' sync `getParliamentVoteSummary` / `getVoteDivisionNumber` getters
  // resolve (the related votes carry tally + division on the live surface).
  for (const v of raw.relatedVotes) {
    primeRelatedVoteSummary(v)
  }
  return raw.relatedVotes
    .map((v) => ({
      voteId: v.voteKey,
      chamber: fromGraphqlChamber(v.chamber) ?? 'camera',
      title: v.title ?? '(fără titlu)',
      heldAt: toIsoDate(v.voteDate, new Date(0).toISOString()),
    }))
    .sort((a, b) => new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime())
}

function primeRelatedVoteSummary(v: {
  voteKey: string
  chamber: string
  voteDate: string | null
  title: string | null
  outcome: string | null
  divisionNumber: number | null
  tally: RawParliamentTally
}): void {
  const chamber = fromGraphqlChamber(v.chamber) ?? 'camera'
  const outcome = toOutcome(v.outcome)
  const summary = ParliamentVoteSummarySchema.parse({
    voteId: v.voteKey,
    chamber,
    title: v.title ?? '(fără titlu)',
    heldAt: toIsoDate(v.voteDate, new Date(0).toISOString()),
    voteType: 'deschis',
    outcome,
    outcomeLabel: OUTCOME_LABEL[outcome],
    tally: {
      pentru: num(v.tally.pentru),
      impotriva: num(v.tally.impotriva),
      abtinere: num(v.tally.abtinere),
      nuAVotat: num(v.tally.nuAVotat),
    },
  })
  primeVoteSummary(summary, num(v.divisionNumber) > 0 ? num(v.divisionNumber) : undefined)
}

/**
 * Map a full bill detail. Real `documents`, `relatedVotes`, `initiators`, and
 * `summary` (from the final-law act link) come from GraphQL; the chronological
 * `passage` timeline is built from real events grouped into Camera / Senat /
 * final buckets. The summary's `longTitle` reuses the title (no separate field).
 */
export function mapBillDetail(raw: RawParliamentBillDetail): ParliamentBillDetail {
  const summary = mapBillSummary(raw, raw.events)
  const passage = buildPassageFromEvents(raw.events)

  const initiator = raw.initiators[0]
  const billInitiator =
    summary.billType === 'parlamentar' && initiator
      ? {
          type: 'parlamentar' as const,
          memberId: initiator.mandateKey,
          memberName: initiator.fullName ?? undefined,
        }
      : summary.billType === 'cetateni'
        ? {
            type: 'cetateni' as const,
            departmentName: 'Inițiativă legislativă a cetățenilor',
          }
        : {
            type: 'guvern' as const,
            departmentName: 'Guvernul României',
          }

  const lawLink = raw.actLinks.find((l) => l.legalAct?.title)
  const summaryText = raw.finalLawNumber
    ? `Devenit ${lawLink?.legalAct?.title ?? `Legea nr. ${raw.finalLawNumber}/${raw.finalLawYear ?? ''}`}.`
    : undefined

  return ParliamentBillDetailSchema.parse({
    ...summary,
    longTitle: raw.title ?? summary.title,
    summary: summaryText,
    initiator: billInitiator,
    // Drop any document without an absolute URL — the UI schema requires
    // `.url()`, and one malformed link must not fail the whole bill page.
    documents: raw.documents
      .filter((d) => /^https?:\/\//i.test(d.url))
      .map((d, i) => ({
        documentId: `${raw.billKey}-doc-${d.position ?? i}`,
        label: d.label ?? d.kind?.toUpperCase() ?? 'Document',
        url: d.url,
        publishedAt: summary.lastUpdatedAt,
      })),
    passage,
    relatedVotes: mapBillRelatedVotes(raw),
  })
}

/**
 * Group real bill events into the three passage buckets the UI renders. Each
 * event becomes a `complete` stage (events are historical facts); the labels are
 * the trimmed event descriptions. This replaces the mock's synthetic five-stage
 * scaffold with the actual procedural timeline.
 */
function buildPassageFromEvents(events: readonly RawParliamentBillEvent[]) {
  const sorted = [...events].sort((a, b) => {
    const da = a.eventDate ?? ''
    const db = b.eventDate ?? ''
    if (da !== db) return da < db ? -1 : 1
    return a.position - b.position
  })

  const camera: ParliamentBillDetail['passage']['camera'] = []
  const senat: ParliamentBillDetail['passage']['senat'] = []
  const final: ParliamentBillDetail['passage']['final'] = []

  sorted.forEach((e, idx) => {
    const text = (e.description ?? '').toLowerCase()
    const stage = {
      stageId: `ev-${e.position}-${idx}`,
      label: cleanEventLabel(e.description) || 'Etapă procedurală',
      status: 'complete' as const,
      completedAt: e.eventDate
        ? toIsoDate(e.eventDate, `${new Date().getFullYear()}-01-01T00:00:00+03:00`)
        : undefined,
    }
    if (text.includes('promulg') || text.includes('monitorul') || text.includes('preşedinte') || text.includes('presedinte') || text.includes('mediere')) {
      final.push(stage)
    } else if (text.includes('senat')) {
      senat.push(stage)
    } else {
      camera.push(stage)
    }
  })

  return { camera, senat, final }
}

function cleanEventLabel(description: string | null | undefined): string {
  if (!description) return ''
  // Event descriptions embed a leading date + pipe-delimited duplicates; keep the
  // human-readable head segment.
  const head = description.split('|')[0]?.trim() ?? description
  return head.replace(/^\d{1,2}\.\d{1,2}\.\d{4}\s*/, '').trim().slice(0, 160)
}

// ── member profile (speeches / questions / initiatives → UI shape) ──────────

export function mapMemberProfile(raw: {
  mandateKey: string
  fullName: string | null
  constituencyName: string | null
  legislature: string | null
  speeches: {
    total: number
    speeches: Array<{
      speechKey: string
      spokenAt: string | null
      title: string | null
      summary: string | null
    }>
  }
  controlItems: {
    total: number
    items: Array<{
      itemKey: string
      title: string | null
      itemDate: string | null
      responseStatus: string | null
    }>
  }
  initiatives: {
    total: number
    initiatives: Array<{
      initiativeKey: string
      title: string | null
      status: string | null
    }>
  }
  declarations: Array<{
    declarationType: string
    declarationDate: string | null
    label: string | null
  }>
}): ParliamentMemberProfile {
  const fallbackDate = new Date(0).toISOString()

  const spokenContributions = raw.speeches.speeches.map((s) => ({
    contributionId: s.speechKey,
    heldAt: toIsoDate(s.spokenAt, fallbackDate),
    title: s.title ?? '(fără titlu)',
    summary: s.summary ?? undefined,
  }))

  // Control items (questions/interpellations) map to the "written questions"
  // surface — responseStatus drives the answered/pending state.
  const writtenQuestions = raw.controlItems.items.map((c) => ({
    questionId: c.itemKey,
    submittedAt: toIsoDate(c.itemDate, fallbackDate),
    title: c.title ?? '(fără titlu)',
    status: c.responseStatus ? ('raspuns' as const) : ('in_asteptare' as const),
  }))

  const interestDeclarations = raw.declarations.map((d, i) => ({
    declarationId: `${raw.mandateKey}-decl-${i}`,
    category: d.label ?? d.declarationType,
    description: d.declarationType,
    registeredAt: toIsoDate(d.declarationDate, fallbackDate),
  }))

  return ParliamentMemberProfileSchema.parse({
    memberId: raw.mandateKey,
    spokenContributions,
    writtenQuestions,
    interestDeclarations,
    // electionResult / portrait are not on the live surface (server gap).
  })
}

export { ParliamentChamberSchema }
