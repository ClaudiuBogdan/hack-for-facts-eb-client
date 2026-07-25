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
  ParliamentCommitteeDetailSchema,
  ParliamentCommitteeSchema,
  ParliamentDataFreshnessSchema,
  ParliamentGroupSchema,
  ParliamentMemberSchema,
  ParliamentMemberProfileSchema,
  ParliamentMemberInitiativesListSchema,
  ParliamentMemberVoteActivitySchema,
  ParliamentMemberVotingHistorySchema,
  ParliamentMemberSpeechesHistorySchema,
  ParliamentMemberSpeechActivitySchema,
  ParliamentVoteDetailSchema,
  ParliamentVoteSummarySchema,
  type BillCurrentLocation,
  type BillType,
  type MemberVoteChoice,
  type ParliamentAiBillMetadata,
  type ParliamentAiControlItemMetadata,
  type ParliamentBillDetail,
  type ParliamentBillRelatedVote,
  type ParliamentBillSummary,
  type ParliamentBillTimelineStep,
  type ParliamentChamber,
  type ParliamentCommittee,
  type ParliamentCommitteeDetail,
  type ParliamentCommitteeMembership,
  type ParliamentDataFreshness,
  type ParliamentGroup,
  type ParliamentMember,
  type ParliamentMemberProfile,
  type ParliamentMemberInitiativesList,
  type ParliamentMemberVoteActivity,
  type ParliamentMemberVotingHistory,
  type ParliamentMemberSpeechesHistory,
  type ParliamentMemberSpeechActivity,
  type ParliamentVoteDetail,
  type ParliamentVoteSummary,
  type VoteOutcome,
} from "@/schemas/parliament";
import {
  deriveGroupId,
  foldSlug,
  fromGraphqlChamber,
  type GraphqlChamber,
} from "./parliament-translate";
import { resolveGroupColor } from "../../lib/group-colors";
import type {
  RawParliamentAiBillMetadata,
  RawParliamentAiControlItemMetadata,
  RawParliamentBallot,
  RawParliamentBillDetail,
  RawParliamentBillEvent,
  RawParliamentBillSummary,
  RawParliamentCommittee,
  RawParliamentCommitteeDetail,
  RawParliamentCommitteeMembership,
  RawParliamentGroup,
  RawParliamentInitiative,
  RawParliamentMember,
  RawParliamentMemberVote,
  RawParliamentMemberVoteActivity,
  RawParliamentMemberSpeech,
  RawParliamentMemberSpeechActivity,
  RawParliamentTally,
  RawParliamentVoteDetail,
  RawParliamentVoteListNode,
} from "./parliament-queries";
import { primeMemberJudet, primeVoteSummary } from "./vote-summary-cache";

// ── primitives ────────────────────────────────────────────────────────────

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** GraphQL `Date` (`YYYY-MM-DD`) → an ISO timestamp the UI date formatters use. */
function toIsoDate(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  // Already a full timestamp.
  if (trimmed.includes("T")) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00+03:00`;
  return trimmed;
}

const VOTE_CHOICE_MAP: Record<string, MemberVoteChoice> = {
  pentru: "pentru",
  impotriva: "impotriva",
  abtinere: "abtinere",
  nu_a_votat: "nu_a_votat",
};
function toVoteChoice(value: string | null | undefined): MemberVoteChoice {
  return (value && VOTE_CHOICE_MAP[value]) || "nu_a_votat";
}

function toOutcome(value: string | null | undefined): VoteOutcome {
  // GraphQL only ever returns `adoptat | respins`; `amânat` is a UI-only state.
  return value === "respins" ? "respins" : "adoptat";
}

const OUTCOME_LABEL: Record<VoteOutcome, string> = {
  adoptat: "Proiectul a fost adoptat",
  respins: "Proiectul a fost respins",
  amânat: "Votul a fost amânat",
};

// ── groups ──────────────────────────────────────────────────────────────────

export function mapGroup(raw: RawParliamentGroup): ParliamentGroup {
  const chamber = fromGraphqlChamber(raw.chamber) ?? "camera";
  return ParliamentGroupSchema.parse({
    groupId: raw.groupId,
    name: raw.name,
    shortName: raw.name,
    chamber,
    memberCount: num(raw.memberCount),
    color: resolveGroupColor({ groupId: raw.groupId, name: raw.name }),
  });
}

// ── members ───────────────────────────────────────────────────────────────

/**
 * Split `fullName` ("Abrudean Mircea") into last/first. Romanian parliamentary
 * listings put the family name first; we treat the first token as the surname
 * and the remainder as given names. Good enough for display; the UI mostly uses
 * the recombined `formatMemberName`.
 */
function splitFullName(fullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const name = fullName?.trim() ?? "";
  if (!name) return { firstName: "", lastName: "" };
  const tokens = name.split(/\s+/);
  if (tokens.length === 1) return { firstName: "", lastName: tokens[0]! };
  return { lastName: tokens[0]!, firstName: tokens.slice(1).join(" ") };
}

export function mapMember(raw: RawParliamentMember): ParliamentMember {
  const gqlChamber = (raw.chamber ?? "camera_deputatilor") as GraphqlChamber;
  const chamber: ParliamentChamber =
    fromGraphqlChamber(raw.chamber) ?? "camera";
  const { firstName, lastName } = splitFullName(raw.fullName);
  const constituency = raw.constituencyName?.trim() ?? "";

  // The official cdep/senat profile page (`profileUrl`) → `contact.website`, and
  // the official CV PDF (`cvPdfUrl`) → `contact.cvUrl`, so the contact tab
  // renders them. Only valid http(s) URLs are kept (the schema requires `.url()`).
  const contact = buildMemberContact(raw);

  // Committee memberships are requested only by the single-member query; the
  // list/roster shapes leave them undefined → an empty (omitted) committees list.
  const committees = raw.committeeMemberships?.map(mapCommitteeMembership);

  return ParliamentMemberSchema.parse({
    memberId: raw.mandateKey,
    firstName,
    lastName,
    chamber,
    groupId: deriveGroupId(raw.groupName, gqlChamber),
    groupName: raw.groupName ?? "",
    judetSlug: constituency ? foldSlug(constituency) : "",
    judetName: constituency,
    ...(contact ? { contact } : {}),
    ...(committees && committees.length > 0 ? { committees } : {}),
    // SC-1 seat lifecycle — carried through so the UI can tell a SITTING member
    // apart from a historical mandate row instead of presenting both as
    // "reprezentantul tău".
    ...(raw.isCurrent === undefined ? {} : { isCurrent: raw.isCurrent }),
    ...(raw.mandateEndDate ? { mandateEndDate: raw.mandateEndDate } : {}),
    ...(raw.mandateEndReason ? { mandateEndReason: raw.mandateEndReason } : {}),
    // mandate dates / role / photo are not on the live surface.
  });
}

function httpUrl(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}

function buildMemberContact(
  raw: RawParliamentMember,
): { website?: string; cvUrl?: string } | undefined {
  const website = httpUrl(raw.profileUrl);
  const cvUrl = httpUrl(raw.cvPdfUrl);
  if (!website && !cvUrl) return undefined;
  return {
    ...(website ? { website } : {}),
    ...(cvUrl ? { cvUrl } : {}),
  };
}

// ── committees ────────────────────────────────────────────────────────────

/** Map one committee↔member link (populated from either the member or the
 * committee side; keys are opaque and pass through untouched). */
export function mapCommitteeMembership(
  raw: RawParliamentCommitteeMembership,
): ParliamentCommitteeMembership {
  return {
    membershipKey: raw.membershipKey,
    ...(raw.committee
      ? {
          committee: {
            committeeKey: raw.committee.committeeKey,
            name: raw.committee.name,
            ...(raw.committee.chamber
              ? { chamber: raw.committee.chamber }
              : {}),
            ...(raw.committee.sourceUrl
              ? { sourceUrl: raw.committee.sourceUrl }
              : {}),
          },
        }
      : {}),
    ...(raw.member
      ? {
          member: {
            ...(raw.member.mandateKey
              ? { mandateKey: raw.member.mandateKey }
              : {}),
            ...(raw.member.fullName ? { fullName: raw.member.fullName } : {}),
            ...(raw.member.chamber ? { chamber: raw.member.chamber } : {}),
            ...(raw.member.groupName
              ? { groupName: raw.member.groupName }
              : {}),
          },
        }
      : {}),
    ...(raw.role ? { role: raw.role } : {}),
    ...(raw.joinedDate ? { joinedDate: raw.joinedDate } : {}),
    ...(raw.leftDate ? { leftDate: raw.leftDate } : {}),
    ...(raw.isBureau != null ? { isBureau: raw.isBureau } : {}),
    sourceUrl: raw.sourceUrl,
  };
}

export function mapCommittee(raw: RawParliamentCommittee): ParliamentCommittee {
  return ParliamentCommitteeSchema.parse({
    committeeKey: raw.committeeKey,
    chamber: raw.chamber,
    name: raw.name,
    ...(raw.legislature ? { legislature: raw.legislature } : {}),
    ...(raw.committeeType ? { committeeType: raw.committeeType } : {}),
    sourceUrl: raw.sourceUrl,
  });
}

export function mapCommitteeDetail(
  raw: RawParliamentCommitteeDetail,
): ParliamentCommitteeDetail {
  return ParliamentCommitteeDetailSchema.parse({
    committeeKey: raw.committeeKey,
    chamber: raw.chamber,
    name: raw.name,
    ...(raw.legislature ? { legislature: raw.legislature } : {}),
    ...(raw.committeeType ? { committeeType: raw.committeeType } : {}),
    sourceUrl: raw.sourceUrl,
    members: raw.members.map(mapCommitteeMembership),
    linkedBills: raw.linkedBills.map((b) => mapBillSummary(b)),
    linkedBillsTotal: num(raw.linkedBillsTotal),
    meetingsCount: num(raw.meetingsCount),
  });
}

// ── data freshness ──────────────────────────────────────────────────────────

export function mapDataFreshness(raw: {
  latestVoteDate: string | null;
  lastLoadedAt: string | null;
}): ParliamentDataFreshness {
  return ParliamentDataFreshnessSchema.parse({
    ...(raw.latestVoteDate ? { latestVoteDate: raw.latestVoteDate } : {}),
    ...(raw.lastLoadedAt ? { lastLoadedAt: raw.lastLoadedAt } : {}),
  });
}

// ── AI metadata ─────────────────────────────────────────────────────────────

export function mapBillAiMetadata(
  raw: RawParliamentAiBillMetadata,
): ParliamentAiBillMetadata {
  return {
    ...(raw.summary ? { summary: raw.summary } : {}),
    ...(raw.topic ? { topic: raw.topic } : {}),
    domains: raw.domains,
    keywords: raw.keywords,
    valueClass: raw.valueClass,
    model: raw.model,
    ...(raw.loadedAt ? { loadedAt: raw.loadedAt } : {}),
    disclaimer: raw.disclaimer,
    trustClass: raw.trustClass,
    privacyClass: raw.privacyClass,
  };
}

export function mapControlItemAiMetadata(
  raw: RawParliamentAiControlItemMetadata,
): ParliamentAiControlItemMetadata {
  return {
    ...(raw.summary ? { summary: raw.summary } : {}),
    policyDomains: raw.policyDomains,
    issueTypes: raw.issueTypes,
    ...(raw.urgency ? { urgency: raw.urgency } : {}),
    keywords: raw.keywords,
    model: raw.model,
    ...(raw.loadedAt ? { loadedAt: raw.loadedAt } : {}),
    disclaimer: raw.disclaimer,
    trustClass: raw.trustClass,
    privacyClass: raw.privacyClass,
  };
}

// ── votes ───────────────────────────────────────────────────────────────────

function mapVoteSummaryCommon(
  raw: RawParliamentVoteListNode | RawParliamentVoteDetail,
): ParliamentVoteSummary {
  const chamber = fromGraphqlChamber(raw.chamber) ?? "camera";
  const outcome = toOutcome(raw.outcome);
  return ParliamentVoteSummarySchema.parse({
    voteId: raw.voteKey,
    chamber,
    title: raw.title ?? "(fără titlu)",
    heldAt: toIsoDate(raw.voteDate, new Date(0).toISOString()),
    voteType: "deschis",
    outcome,
    outcomeLabel: OUTCOME_LABEL[outcome],
    tally: {
      pentru: num(raw.tally.pentru),
      impotriva: num(raw.tally.impotriva),
      abtinere: num(raw.tally.abtinere),
      nuAVotat: num(raw.tally.nuAVotat),
    },
    relatedBillId: raw.billKey ?? undefined,
    ...(httpUrl(raw.sourceUrl) ? { sourceUrl: httpUrl(raw.sourceUrl) } : {}),
    // The SOURCE division number, or nothing. Never a positional stand-in.
    ...(num(raw.divisionNumber) > 0 && {
      divisionNumber: num(raw.divisionNumber),
    }),
  });
}

/** Map a vote list node to the UI list-item shape. */
export function mapVoteListItem(
  raw: RawParliamentVoteListNode,
): ParliamentVoteSummary {
  const summary = mapVoteSummaryCommon(raw);
  primeVoteSummary(summary, summary.divisionNumber);
  return summary;
}

export function mapVoteDetail(
  raw: RawParliamentVoteDetail,
): ParliamentVoteDetail {
  const summary = mapVoteSummaryCommon(raw);
  primeVoteSummary(summary, summary.divisionNumber);
  const gqlChamber = (raw.chamber ?? "camera_deputatilor") as GraphqlChamber;

  const groupBreakdown = raw.groupBreakdown.map((g) => ({
    groupId: deriveGroupId(g.groupName, gqlChamber),
    groupName: g.groupName ?? "Necunoscut",
    pentru: num(g.pentru),
    impotriva: num(g.impotriva),
    abtinere: num(g.abtinere),
    nuAVotat: num(g.nuAVotat),
  }));

  const memberVotes = raw.ballots.edges.map(({ node }) =>
    mapBallot(node, gqlChamber, raw.voteKey),
  );

  return ParliamentVoteDetailSchema.parse({
    ...summary,
    groupBreakdown,
    memberVotes,
  });
}

/**
 * Map one source ballot row.
 *
 * `mandateKey` is nullable BY DESIGN: the resolver leaves a ballot unmatched
 * (rather than mis-assigning it) when the raw member name is ambiguous. The old
 * code substituted `row-<rowIndex>` so every ballot looked resolved, and the UI
 * then linked those rows to `/parlament/membri/row-12` — a page that cannot
 * exist. We now leave `memberId` absent and carry a render-only `ballotKey`.
 */
function mapBallot(
  raw: RawParliamentBallot,
  chamber: GraphqlChamber,
  voteKey: string,
) {
  // Prime the member→județ cache from the resolved member's constituency so the
  // vote-detail județ column (sync `getMemberJudetMap()`) is populated.
  if (raw.mandateKey) primeMemberJudet(raw.mandateKey, raw.constituencyName);
  return {
    ballotKey: `${voteKey}#${String(raw.rowIndex)}`,
    ...(raw.mandateKey ? { memberId: raw.mandateKey } : {}),
    memberName: raw.memberName ?? "Necunoscut",
    groupId: deriveGroupId(raw.groupName, chamber),
    groupName: raw.groupName ?? "Necunoscut",
    choice: toVoteChoice(raw.choice),
  };
}

// ── member voting history ─────────────────────────────────────────────────

export function mapMemberVotingHistory(
  memberId: string,
  votes: RawParliamentMemberVote[],
  total: number,
  pageInfo: { hasNextPage: boolean; endCursor: string | null },
): ParliamentMemberVotingHistory {
  return ParliamentMemberVotingHistorySchema.parse({
    memberId,
    total,
    hasNextPage: pageInfo.hasNextPage,
    endCursor: pageInfo.endCursor,
    votes: votes.map((v) => ({
      voteId: v.voteKey,
      chamber: fromGraphqlChamber(v.chamber) ?? "camera",
      title: v.title ?? "(fără titlu)",
      heldAt: toIsoDate(v.voteDate, new Date(0).toISOString()),
      choice: toVoteChoice(v.choice),
      outcome: toOutcome(v.outcome),
    })),
  });
}

// ── member vote activity (heatmap) ──────────────────────────────────────────

export function mapMemberVoteActivity(
  raw: RawParliamentMemberVoteActivity,
): ParliamentMemberVoteActivity {
  return ParliamentMemberVoteActivitySchema.parse({
    year: raw.year,
    availableYears: raw.availableYears,
    days: raw.days.map((d) => ({
      date: d.date,
      total: num(d.total),
      pentru: num(d.pentru),
      impotriva: num(d.impotriva),
      abtinere: num(d.abtinere),
      nuAVotat: num(d.nuAVotat),
    })),
  });
}

// ── member speeches (interventii) ───────────────────────────────────────────

/** Null → undefined; also collapses whitespace-only strings so `.optional()`
 * fields drop cleanly (a Senate summary is sometimes just a stray space). */
function optText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function mapMemberSpeeches(
  memberId: string,
  edges: { cursor: string; node: RawParliamentMemberSpeech }[],
  total: number,
  pageInfo: { hasNextPage: boolean; endCursor: string | null },
): ParliamentMemberSpeechesHistory {
  return ParliamentMemberSpeechesHistorySchema.parse({
    memberId,
    total: num(total),
    hasNextPage: pageInfo.hasNextPage,
    endCursor: pageInfo.endCursor,
    speeches: edges.map(({ node }) => ({
      speechKey: node.speechKey,
      // A date-only source value; keep as `YYYY-MM-DD`. Empty when the source
      // row has no date (rare — the mandate index carries spoken_at).
      spokenAt: node.spokenAt ? node.spokenAt.slice(0, 10) : "",
      title: optText(node.title),
      summary: optText(node.summary),
      chamber: optText(node.chamber),
      sourceUrl: optText(node.sourceUrl),
      sourceUrlKind: optText(node.sourceUrlKind),
      // Keep the transcript's internal whitespace; only null → undefined.
      fullText: node.fullText ?? undefined,
    })),
  });
}

export function mapMemberSpeechActivity(
  raw: RawParliamentMemberSpeechActivity,
): ParliamentMemberSpeechActivity {
  return ParliamentMemberSpeechActivitySchema.parse({
    year: raw.year,
    availableYears: raw.availableYears,
    days: raw.days.map((d) => ({
      date: d.date,
      total: num(d.total),
      proprie: num(d.proprie),
      comun: num(d.comun),
    })),
  });
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
  const t = (serverBillType?.trim() || title || "").toLowerCase();
  if (
    t.startsWith("propunere legislativ") ||
    t.includes("cetăţeni") ||
    t.includes("cetateni")
  ) {
    return "parlamentar";
  }
  if (t.startsWith("proiect de lege")) return "guvern";
  if (
    t.includes("ordonanţ") ||
    t.includes("ordonant") ||
    t.includes("o.u.g") ||
    t.includes("oug")
  ) {
    return "ordonanta";
  }
  return "guvern";
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
  if (raw.finalLawNumber) return "promulgat";
  const latest = lastEventText(events);
  if (latest.includes("respins")) return "respins";
  if (latest.includes("retras") || latest.includes("restituit"))
    return "retras";
  if (
    latest.includes("clasat") ||
    latest.includes("încetat") ||
    latest.includes("incetat")
  ) {
    return "clasat";
  }
  if (latest.includes("mediere")) return "mediere";
  if (
    latest.includes("promulgare") ||
    latest.includes("preşedinte") ||
    latest.includes("presedinte")
  ) {
    return "presedinte";
  }
  if (latest.includes("senat")) return "senat";
  if (latest.includes("camera")) return "camera";
  return originating;
}

function lastEventText(
  events: readonly RawParliamentBillEvent[] | undefined,
): string {
  if (!events || events.length === 0) return "";
  const dated = [...events].sort((a, b) => {
    const da = a.eventDate ?? "";
    const db = b.eventDate ?? "";
    return da < db ? 1 : da > db ? -1 : b.position - a.position;
  });
  return (dated[0]?.description ?? "").toLowerCase();
}

/**
 * Originating chamber: a bill with only a senate number originates in the
 * Senate; otherwise (plx present) the Chamber of Deputies. Diaspora/edge cases
 * default to camera.
 */
function deriveOriginatingChamber(
  raw: RawParliamentBillSummary,
): ParliamentChamber {
  if (raw.senateNumber && !raw.plxNumber) return "senat";
  return "camera";
}

const LOCATION_LABEL: Record<BillCurrentLocation, string> = {
  camera: "La Camera Deputaților",
  senat: "La Senat",
  mediere: "Comisie de mediere",
  presedinte: "La promulgare",
  promulgat: "Promulgat",
  respins: "Respins",
  retras: "Retras",
  clasat: "Clasat",
};

function billNumber(raw: RawParliamentBillSummary): string {
  if (raw.plxNumber) return `PL-x ${raw.plxNumber}/${raw.plxYear ?? ""}`.trim();
  if (raw.senateNumber)
    return `L ${raw.senateNumber}/${raw.senateYear ?? ""}`.trim();
  return raw.billKey;
}

function billYear(raw: RawParliamentBillSummary): number {
  return raw.plxYear ?? raw.senateYear ?? new Date().getFullYear();
}

export function mapBillSummary(
  raw: RawParliamentBillSummary,
  events?: readonly RawParliamentBillEvent[],
): ParliamentBillSummary {
  const originatingChamber = deriveOriginatingChamber(raw);
  const currentLocation = deriveCurrentLocation(
    raw,
    events,
    originatingChamber,
  );

  // Prefer the server's source-stored status string for the current-stage label;
  // fall back to the derived-location label when the source carries none.
  const stageLabel = raw.statusText?.trim()
    ? raw.statusText.trim()
    : LOCATION_LABEL[currentLocation];

  // "Actualizat" = the real last-event date. The bills LIST carries no events, so
  // we use the server-exposed `lastEventDate` (which also drives the default
  // last_event_date-desc sort — without it the list LOOKED arbitrary because
  // every card fell back to "1 ian. <year>"). Detail pages also have the events
  // array; either source works. Only a genuinely date-less bill falls back to
  // Jan-1 of its year.
  const lastUpdatedAt =
    toIsoDate(raw.lastEventDate, "") ||
    (events && events.length > 0 ? latestEventDate(events) : null) ||
    `${billYear(raw)}-01-01T00:00:00+03:00`;

  return ParliamentBillSummarySchema.parse({
    billId: raw.billKey,
    number: billNumber(raw),
    title: raw.title ?? "(fără titlu)",
    billType: classifyBillType(raw.billType, raw.title),
    originatingChamber,
    currentLocation,
    currentStageLabel: stageLabel,
    lastUpdatedAt,
    legislatureId: String(billYear(raw)),
  });
}

function latestEventDate(
  events: readonly RawParliamentBillEvent[],
): string | null {
  let max: string | null = null;
  for (const e of events) {
    if (e.eventDate && (!max || e.eventDate > max)) max = e.eventDate;
  }
  return max
    ? toIsoDate(max, `${new Date().getFullYear()}-01-01T00:00:00+03:00`)
    : null;
}

export function mapBillRelatedVotes(
  raw: RawParliamentBillDetail,
): ParliamentBillRelatedVote[] {
  // Prime the vote-summary cache from the full related-vote payload so the bill
  // tabs' sync `getParliamentVoteSummary` / `getVoteDivisionNumber` getters
  // resolve (the related votes carry tally + division on the live surface).
  for (const v of raw.relatedVotes) {
    primeRelatedVoteSummary(v);
  }
  // `voteLinks` carries the ROLE of each bill↔vote edge (`final_adoption`, …).
  // Only a `linked` edge is trustworthy — an unresolved one is a candidate, not
  // a fact — so unresolved roles are dropped rather than surfaced.
  const roleByVoteKey = new Map(
    (raw.voteLinks ?? [])
      .filter((l) => l.resolutionStatus === "linked")
      .map((l) => [l.voteKey, l.role]),
  );
  return raw.relatedVotes
    .map((v) => {
      const linkRole = roleByVoteKey.get(v.voteKey);
      return {
        voteId: v.voteKey,
        chamber: fromGraphqlChamber(v.chamber) ?? "camera",
        title: v.title ?? "(fără titlu)",
        heldAt: toIsoDate(v.voteDate, new Date(0).toISOString()),
        ...(linkRole ? { linkRole } : {}),
      };
    })
    .sort(
      (a, b) => new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime(),
    );
}

/** Roles that actually establish a vote as the bill's FINAL vote. */
const FINAL_VOTE_ROLES: ReadonlySet<string> = new Set([
  "final_adoption",
  "final_rejection",
]);

export function isFinalBillVote(vote: { readonly linkRole?: string }): boolean {
  return vote.linkRole !== undefined && FINAL_VOTE_ROLES.has(vote.linkRole);
}

function primeRelatedVoteSummary(v: {
  voteKey: string;
  chamber: string;
  voteDate: string | null;
  title: string | null;
  outcome: string | null;
  divisionNumber: number | null;
  sourceUrl?: string | null;
  tally: RawParliamentTally;
}): void {
  const chamber = fromGraphqlChamber(v.chamber) ?? "camera";
  const outcome = toOutcome(v.outcome);
  const summary = ParliamentVoteSummarySchema.parse({
    voteId: v.voteKey,
    chamber,
    title: v.title ?? "(fără titlu)",
    heldAt: toIsoDate(v.voteDate, new Date(0).toISOString()),
    voteType: "deschis",
    outcome,
    outcomeLabel: OUTCOME_LABEL[outcome],
    tally: {
      pentru: num(v.tally.pentru),
      impotriva: num(v.tally.impotriva),
      abtinere: num(v.tally.abtinere),
      nuAVotat: num(v.tally.nuAVotat),
    },
    ...(httpUrl(v.sourceUrl) ? { sourceUrl: httpUrl(v.sourceUrl) } : {}),
  });
  primeVoteSummary(
    summary,
    num(v.divisionNumber) > 0 ? num(v.divisionNumber) : undefined,
  );
}

/**
 * Map a full bill detail. Real `documents`, `relatedVotes`, `initiators`, and
 * `summary` (from the final-law act link) come from GraphQL; the chronological
 * `passage` timeline is built from real events grouped into Camera / Senat /
 * final buckets. The summary's `longTitle` reuses the title (no separate field).
 */
export function mapBillDetail(
  raw: RawParliamentBillDetail,
): ParliamentBillDetail {
  const summary = mapBillSummary(raw, raw.events);
  const dossierBillIds = raw.dossierBillKeys ?? [raw.billKey];
  const timeline = buildBillTimeline(raw.events, dossierBillIds, raw.billKey);

  const initiator = raw.initiators[0];
  const billInitiator =
    summary.billType === "parlamentar" && initiator
      ? {
          type: "parlamentar" as const,
          memberId: initiator.mandateKey,
          memberName: initiator.fullName ?? undefined,
        }
      : summary.billType === "cetateni"
        ? {
            type: "cetateni" as const,
            departmentName: "Inițiativă legislativă a cetățenilor",
          }
        : {
            type: "guvern" as const,
            departmentName: "Guvernul României",
          };

  const lawLink = raw.actLinks.find(
    (l) =>
      l.relationshipKind === "becomes_law" && l.resolutionStatus === "linked",
  );
  const lawMilestone = raw.finalLawNumber
    ? {
        lawNumber: raw.finalLawNumber,
        ...(raw.finalLawYear != null ? { lawYear: raw.finalLawYear } : {}),
        ...(lawLink?.legalAct?.actId ? { actId: lawLink.legalAct.actId } : {}),
        ...(lawLink?.legalAct?.title
          ? { actTitle: lawLink.legalAct.title }
          : {}),
      }
    : undefined;
  const summaryText = lawMilestone
    ? `Devenit ${lawMilestone.actTitle ?? `Legea nr. ${lawMilestone.lawNumber}/${lawMilestone.lawYear ?? ""}`}.`
    : undefined;

  // AI-generated metadata; `valueClass` is lifted out for the summary-card gate.
  const aiMetadata = raw.aiMetadata
    ? mapBillAiMetadata(raw.aiMetadata)
    : undefined;

  return ParliamentBillDetailSchema.parse({
    ...summary,
    longTitle: raw.title ?? summary.title,
    summary: summaryText,
    initiator: billInitiator,
    ...(aiMetadata ? { aiMetadata, valueClass: aiMetadata.valueClass } : {}),
    // Drop any document without an absolute URL — the UI schema requires
    // `.url()`, and one malformed link must not fail the whole bill page.
    //
    // NO publishedAt: `bill_documents` carries no date. Every document used to
    // be stamped with the bill's LATEST EVENT date, so a 2012 first-reading PDF
    // and a 2023 promulgation text both claimed the same 2023 publication date.
    // The date is optional now and the UI omits it.
    documents: raw.documents
      .filter((d) => /^https?:\/\//i.test(d.url))
      .map((d, i) => ({
        documentId: `${d.sourceBillKey ?? raw.billKey}-doc-${d.position ?? i}`,
        label: d.label ?? d.kind?.toUpperCase() ?? "Document",
        url: d.url,
      })),
    timeline,
    ...(lawMilestone ? { lawMilestone } : {}),
    relatedVotes: mapBillRelatedVotes(raw),
    // Server-merged twin-pair dossier keys (requested view first); falls back
    // to the single requested key on servers without the field yet.
    dossierBillIds,
  });
}

/** Milestone keywords (RO, diacritic-insensitive) — highlighted timeline rows. */
const MILESTONE_PATTERNS = [
  "adoptat",
  "adoptata",
  "respins",
  "promulg",
  "lege ",
  "reexaminare",
  "inaintat la senat",
  "trimitere la pre", // trimitere la Preşedinte
  "monitorul oficial",
];

function isMilestoneDescription(description: string): boolean {
  const folded = foldSlug(description).replace(/-/g, " ");
  return MILESTONE_PATTERNS.some((p) =>
    folded.includes(foldSlug(p).replace(/-/g, " ")),
  );
}

/** Extract absolute doc URLs from the per-event `docs` JSON blob (often empty). */
function extractEventDocUrls(docs: unknown): string[] {
  const urls: string[] = [];
  const visit = (v: unknown): void => {
    if (typeof v === "string") {
      if (/^https?:\/\//i.test(v)) urls.push(v);
    } else if (Array.isArray(v)) {
      v.forEach(visit);
    } else if (v && typeof v === "object") {
      Object.values(v as Record<string, unknown>).forEach(visit);
    }
  };
  visit(docs);
  return Array.from(new Set(urls));
}

/**
 * Light defensive cleanup of an event description. The scrapper reparse cleans
 * descriptions at SOURCE (glued tokens + a redundant leading date), so this only
 * strips a leading `dd.mm.yyyy |` / `dd.mm.yyyy` prefix + a leading bare `- ` and
 * collapses whitespace — no heavy client regex, and it NEVER drops post-content
 * (it must not split on `|` and discard the meaningful tail, e.g. the promulgare
 * text that follows a leading date).
 */
function cleanEventDescription(description: string | null | undefined): string {
  if (!description) return "Etapă procedurală";
  const cleaned = description
    .replace(/^\s*\d{1,2}\.\d{1,2}\.\d{4}\s*\|?\s*/, "") // leading "dd.mm.yyyy |"
    .replace(/^\s*-\s*/, "") // leading bullet
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Etapă procedurală";
}

/**
 * Build the chronological timeline in raw `position` order (NOT date-sorted — a
 * "Termen adoptare" deadline date would otherwise jumble the procedural order).
 * Each event becomes a step with its resolved vote (cdep:${voteIdv}), per-event
 * doc URLs, the real chamberCode (null today → no fabricated phase), and a
 * milestone flag. No `passage`-style chamber invention.
 */
function buildBillTimeline(
  events: readonly RawParliamentBillEvent[],
  dossierBillIds: readonly string[],
  fallbackBillId: string,
): ParliamentBillTimelineStep[] {
  const viewOrder = new Map(
    dossierBillIds.map((billId, index) => [billId, index]),
  );
  return [...events]
    .sort((a, b) => {
      const aView =
        viewOrder.get(a.sourceBillKey ?? fallbackBillId) ??
        dossierBillIds.length;
      const bView =
        viewOrder.get(b.sourceBillKey ?? fallbackBillId) ??
        dossierBillIds.length;
      return aView - bView || a.position - b.position;
    })
    .map((e) => {
      const description = cleanEventDescription(e.description);
      const sourceBillKey = e.sourceBillKey ?? fallbackBillId;
      return {
        stepId: `ev-${sourceBillKey}-${e.position}`,
        position: e.position,
        description,
        ...(e.eventDate
          ? { date: toIsoDate(e.eventDate, "") || undefined }
          : {}),
        ...(e.eventDateText ? { dateText: e.eventDateText } : {}),
        ...(e.chamberCode ? { chamberCode: e.chamberCode } : {}),
        ...(e.committee && e.committee.length > 0
          ? { committee: e.committee }
          : {}),
        ...(e.voteIdv ? { voteId: `cdep:${e.voteIdv}` } : {}),
        docUrls: extractEventDocUrls(e.docs),
        isMilestone: isMilestoneDescription(description),
      };
    });
}

// ── member profile (speeches / questions / initiatives → UI shape) ──────────

export function mapMemberProfile(raw: {
  mandateKey: string;
  fullName: string | null;
  constituencyName: string | null;
  legislature: string | null;
  controlItems: {
    total: number;
    items: Array<{
      itemKey: string;
      title: string | null;
      itemDate: string | null;
      responseStatus: string | null;
      sourceUrl?: string | null;
      aiMetadata?: RawParliamentAiControlItemMetadata | null;
    }>;
  };
  declarations: Array<{
    declarationType: string;
    declarationDate: string | null;
    label: string | null;
    fileUrl: string;
  }>;
}): ParliamentMemberProfile {
  // Control items (questions/interpellations) map to the "written questions"
  // surface. `responseStatus` is the RAW source response string — non-null
  // means a response is recorded; null only means none is RECORDED, which must
  // not be shown as a verified "waiting" state. aiMetadata (when present)
  // carries the AI summary shown in a collapsed <details> per item.
  const writtenQuestions = raw.controlItems.items.map((c) => ({
    questionId: c.itemKey,
    ...(c.itemDate ? { submittedAt: toIsoDate(c.itemDate, c.itemDate) } : {}),
    title: c.title ?? "(fără titlu)",
    status: c.responseStatus
      ? ("raspuns" as const)
      : ("fara_raspuns_inregistrat" as const),
    ...(httpUrl(c.sourceUrl) ? { sourceUrl: httpUrl(c.sourceUrl) } : {}),
    ...(c.aiMetadata
      ? { aiMetadata: mapControlItemAiMetadata(c.aiMetadata) }
      : {}),
  }));

  // `fileUrl` is the declaration — prod stores only the link to the state's
  // public-by-law PDF (contract §6), so dropping it left an unverifiable row.
  const interestDeclarations = raw.declarations.map((d, i) => ({
    declarationId: `${raw.mandateKey}-decl-${i}`,
    category: d.label ?? d.declarationType,
    description: d.declarationType,
    ...(d.declarationDate
      ? { registeredAt: toIsoDate(d.declarationDate, d.declarationDate) }
      : {}),
    ...(httpUrl(d.fileUrl) ? { fileUrl: httpUrl(d.fileUrl) } : {}),
  }));

  return ParliamentMemberProfileSchema.parse({
    memberId: raw.mandateKey,
    writtenQuestions,
    // The EXACT control-item count, so the tab can say how much it is showing.
    writtenQuestionsTotal: raw.controlItems.total,
    interestDeclarations,
    // electionResult / portrait are not on the live surface (server gap).
  });
}

// ── member initiatives (paginated; server-ordered registration-date DESC) ────

/**
 * Map a paginated member-initiatives page. Preserves the SERVER order (no
 * client sort — the server returns these registration-date DESC, latest-first).
 */
export function mapMemberInitiatives(
  memberId: string,
  raw: { total: number; initiatives: readonly RawParliamentInitiative[] },
  page: number,
  pageSize: number,
): ParliamentMemberInitiativesList {
  const total = raw.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return ParliamentMemberInitiativesListSchema.parse({
    memberId,
    initiatives: raw.initiatives.map((i) => ({
      initiativeId: i.initiativeKey,
      title: i.title ?? "(fără titlu)",
      registeredAt: i.registrationDate
        ? toIsoDate(i.registrationDate, "")
        : undefined,
      status: i.status ?? undefined,
      billId: i.billKey ?? undefined,
      promulgatedLawNumber: i.promulgatedLawNumber ?? undefined,
      promulgatedLawYear: i.promulgatedLawYear ?? undefined,
    })),
    total,
    page: Math.min(Math.max(1, page), totalPages),
    pageSize,
    totalPages,
  });
}

export { ParliamentChamberSchema };
