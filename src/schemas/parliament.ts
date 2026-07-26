import { z } from "zod";

export const ParliamentChamberSchema = z.enum(["camera", "senat"]);
export type ParliamentChamber = z.infer<typeof ParliamentChamberSchema>;

export const VoteTypeSchema = z.enum(["deschis", "secret"]);
export type VoteType = z.infer<typeof VoteTypeSchema>;

export const MemberVoteChoiceSchema = z.enum([
  "pentru",
  "impotriva",
  "abtinere",
  "nu_a_votat",
]);
export type MemberVoteChoice = z.infer<typeof MemberVoteChoiceSchema>;

export const VoteOutcomeSchema = z.enum(["adoptat", "respins", "amânat"]);
export type VoteOutcome = z.infer<typeof VoteOutcomeSchema>;

export const ParliamentLegislatureSchema = z.object({
  id: z.string(),
  label: z.string(),
  startYear: z.number().int(),
  endYear: z.number().int(),
});
export type ParliamentLegislature = z.infer<typeof ParliamentLegislatureSchema>;

export const ParliamentGroupSchema = z.object({
  groupId: z.string(),
  name: z.string(),
  shortName: z.string().optional(),
  chamber: ParliamentChamberSchema,
  memberCount: z.number().int().nonnegative(),
  color: z.string().optional(),
});
export type ParliamentGroup = z.infer<typeof ParliamentGroupSchema>;

export const ParliamentMemberContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional(),
  /** Official CV document (PDF) published on cdep.ro / senat.ro, when present. */
  cvUrl: z.string().url().optional(),
});
export type ParliamentMemberContact = z.infer<
  typeof ParliamentMemberContactSchema
>;

// ── committees ───────────────────────────────────────────────────────────────

/** A parliamentary committee (comisie) the member belongs to, or a browse row. */
export const ParliamentCommitteeSchema = z.object({
  committeeKey: z.string(),
  /** GraphQL chamber token: 'camera_deputatilor' | 'senat'. */
  chamber: z.string(),
  name: z.string(),
  legislature: z.string().optional(),
  committeeType: z.string().optional(),
  /** cdep.ro / senat.ro committee page — the source-traceability terminator. */
  sourceUrl: z.string(),
});
export type ParliamentCommittee = z.infer<typeof ParliamentCommitteeSchema>;

/** A slim member reference on a committee roster row (committee-detail view). */
export const ParliamentCommitteeMemberRefSchema = z.object({
  /** mandateKey — deep-links to /parlament/membri/$memberId when present. */
  mandateKey: z.string().optional(),
  fullName: z.string().optional(),
  chamber: z.string().optional(),
  groupName: z.string().optional(),
});
export type ParliamentCommitteeMemberRef = z.infer<
  typeof ParliamentCommitteeMemberRefSchema
>;

/** A slim committee reference on a membership row (member-overview view). */
export const ParliamentCommitteeRefSchema = z.object({
  committeeKey: z.string(),
  name: z.string(),
  chamber: z.string().optional(),
  sourceUrl: z.string().optional(),
});
export type ParliamentCommitteeRef = z.infer<
  typeof ParliamentCommitteeRefSchema
>;

/**
 * One committee↔member link. Populated from EITHER side: the member overview
 * carries `committee`; the committee detail roster carries `member`. Keys are
 * OPAQUE (contain ':' / '|') — never parse them, only URL-encode in route params.
 */
export const ParliamentCommitteeMembershipSchema = z.object({
  membershipKey: z.string(),
  committee: ParliamentCommitteeRefSchema.optional(),
  member: ParliamentCommitteeMemberRefSchema.optional(),
  role: z.string().optional(),
  joinedDate: z.string().optional(),
  leftDate: z.string().optional(),
  isBureau: z.boolean().optional(),
  sourceUrl: z.string(),
});
export type ParliamentCommitteeMembership = z.infer<
  typeof ParliamentCommitteeMembershipSchema
>;

export const ParliamentMemberSchema = z.object({
  memberId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  chamber: z.enum(["camera", "senat"]),
  groupId: z.string(),
  groupName: z.string(),
  judetSlug: z.string(),
  judetName: z.string(),
  mandateStart: z.string().optional(),
  mandateEnd: z.string().optional(),
  /**
   * SC-1 seat lifecycle. `parliament.members` keeps one row per MANDATE, so a
   * replaced/deceased member's mandate row survives (it must — every vote,
   * initiative and question stays attributed to it). `isCurrent: false` means the
   * seat has ended; `mandateEndDate` / `mandateEndReason` say when and why.
   * Undefined = the surface did not request the lifecycle fields.
   */
  isCurrent: z.boolean().optional(),
  mandateEndDate: z.string().optional(),
  mandateEndReason: z.string().optional(),
  role: z.string().optional(),
  photoUrl: z.string().url().optional(),
  contact: ParliamentMemberContactSchema.optional(),
  /**
   * Committee memberships (each carries the `committee` ref). Only the single
   * member query requests these; the list/roster shapes leave it undefined.
   */
  committees: z.array(ParliamentCommitteeMembershipSchema).optional(),
});
export type ParliamentMember = z.infer<typeof ParliamentMemberSchema>;

// ── committee browse / detail ────────────────────────────────────────────────

export const ParliamentCommitteeDetailSchema = ParliamentCommitteeSchema.extend(
  {
    /** Roster rows (each carries the `member` ref). */
    members: z.array(ParliamentCommitteeMembershipSchema),
    linkedBills: z.array(z.lazy(() => ParliamentBillSummarySchema)),
    linkedBillsTotal: z.number().int().nonnegative(),
    meetingsCount: z.number().int().nonnegative(),
  },
);
export type ParliamentCommitteeDetail = z.infer<
  typeof ParliamentCommitteeDetailSchema
>;

export const ParliamentCommitteeListSchema = z.object({
  committees: z.array(ParliamentCommitteeSchema),
  hasNextPage: z.boolean(),
  endCursor: z.string().optional(),
});
export type ParliamentCommitteeList = z.infer<
  typeof ParliamentCommitteeListSchema
>;

// ── data freshness ───────────────────────────────────────────────────────────

export const ParliamentDataFreshnessSchema = z.object({
  latestVoteDate: z.string().optional(),
  lastLoadedAt: z.string().optional(),
});
export type ParliamentDataFreshness = z.infer<
  typeof ParliamentDataFreshnessSchema
>;

// ── AI-generated metadata (summaries + classification) ───────────────────────

/**
 * AI-derived metadata for a bill. Rendered as clearly-labelled generated content
 * (never as authoritative fact); `disclaimer` is shown verbatim. `valueClass`
 * gates whether the summary card is shown ('standard' vs 'low_value').
 */
export const ParliamentAiBillMetadataSchema = z.object({
  summary: z.string().optional(),
  topic: z.string().optional(),
  domains: z.array(z.string()),
  keywords: z.array(z.string()),
  valueClass: z.string(),
  model: z.string(),
  loadedAt: z.string().optional(),
  disclaimer: z.string(),
  trustClass: z.string(),
  privacyClass: z.string(),
});
export type ParliamentAiBillMetadata = z.infer<
  typeof ParliamentAiBillMetadataSchema
>;

/** AI-derived metadata for a control item (question/interpellation). */
export const ParliamentAiControlItemMetadataSchema = z.object({
  summary: z.string().optional(),
  policyDomains: z.array(z.string()),
  issueTypes: z.array(z.string()),
  urgency: z.string().optional(),
  keywords: z.array(z.string()),
  model: z.string(),
  loadedAt: z.string().optional(),
  disclaimer: z.string(),
  trustClass: z.string(),
  privacyClass: z.string(),
});
export type ParliamentAiControlItemMetadata = z.infer<
  typeof ParliamentAiControlItemMetadataSchema
>;

export const ParliamentVoteTallySchema = z.object({
  pentru: z.number().int().nonnegative(),
  impotriva: z.number().int().nonnegative(),
  abtinere: z.number().int().nonnegative().optional(),
  nuAVotat: z.number().int().nonnegative().optional(),
});
export type ParliamentVoteTally = z.infer<typeof ParliamentVoteTallySchema>;

export const ParliamentGroupVoteBreakdownSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  pentru: z.number().int().nonnegative(),
  impotriva: z.number().int().nonnegative(),
  abtinere: z.number().int().nonnegative().optional(),
  nuAVotat: z.number().int().nonnegative().optional(),
});
export type ParliamentGroupVoteBreakdown = z.infer<
  typeof ParliamentGroupVoteBreakdownSchema
>;

export const ParliamentMemberVoteRecordSchema = z.object({
  /**
   * Stable per-vote row key (`<voteId>#<rowIndex>`). A RENDER key only — never a
   * member identity and never a route param.
   */
  ballotKey: z.string(),
  /**
   * The resolved mandate key, or ABSENT when the source ballot could not be
   * matched to a member (name collisions are deliberately left unresolved rather
   * than mis-assigned). Absent → render the name as text, not as a profile link.
   * This used to be filled with a fabricated `row-<n>` id, which produced links to
   * member pages that cannot exist.
   */
  memberId: z.string().optional(),
  memberName: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  choice: MemberVoteChoiceSchema,
});
export type ParliamentMemberVoteRecord = z.infer<
  typeof ParliamentMemberVoteRecordSchema
>;

export const ParliamentVoteSummarySchema = z.object({
  voteId: z.string(),
  chamber: z.enum(["camera", "senat"]),
  title: z.string(),
  heldAt: z.string(),
  voteType: VoteTypeSchema,
  outcome: VoteOutcomeSchema,
  outcomeLabel: z.string(),
  tally: ParliamentVoteTallySchema,
  relatedBillId: z.string().optional(),
  /** Exact official cdep.ro / senat.ro vote page, when the source provides one. */
  sourceUrl: z.string().url().optional(),
  /**
   * The OFFICIAL division number (`votes.division_number`), when the source
   * recorded one. Optional and never synthesised: it is a checkable fact in the
   * cdep.ro / senat.ro record, so a positional stand-in would be a false claim.
   * Absent → the UI shows the date without a division label.
   */
  divisionNumber: z.number().int().positive().optional(),
});
export type ParliamentVoteSummary = z.infer<typeof ParliamentVoteSummarySchema>;

/**
 * A vote as rendered in a browse list. Identical to the summary — `divisionNumber`
 * lives on the summary now, and stays OPTIONAL here: the list used to force a
 * value (`?? 1`), which labelled every division-less Senate vote "Divizare 1".
 */
export const ParliamentVoteListItemSchema = ParliamentVoteSummarySchema;
export type ParliamentVoteListItem = z.infer<
  typeof ParliamentVoteListItemSchema
>;

/**
 * One CURSOR page of votes, newest first.
 *
 * `parliamentVotes` is a keyset connection: it has no exact total and no page
 * numbers. This used to be modelled as an offset page and the adapter reported
 * `page: 1, totalPages: 1, total: <length of the single page fetched>` — so the
 * UI showed "10 rezultate" for a 20,672-row corpus and offered numbered
 * pagination that could never move. The honest shape is what the API gives:
 * a page of rows plus "is there more".
 */
export const ParliamentVotesListSchema = z.object({
  votes: z.array(ParliamentVoteListItemSchema),
  pageSize: z.number().int().positive(),
  hasNextPage: z.boolean(),
  endCursor: z.string().optional(),
});
export type ParliamentVotesList = z.infer<typeof ParliamentVotesListSchema>;

export const ParliamentVoteDetailSchema = ParliamentVoteSummarySchema.extend({
  description: z.string().optional(),
  groupBreakdown: z.array(ParliamentGroupVoteBreakdownSchema),
  memberVotes: z.array(ParliamentMemberVoteRecordSchema),
});
export type ParliamentVoteDetail = z.infer<typeof ParliamentVoteDetailSchema>;

export const ParliamentHubDataSchema = z.object({
  legislature: ParliamentLegislatureSchema,
  /**
   * When the DATA was last loaded (`parliamentDataFreshness.lastLoadedAt`) — NOT
   * when this request ran. Optional on purpose: the API can legitimately have no
   * freshness signal, and the UI must then omit the line rather than stamp
   * `Date.now()` and present request time as sync time.
   */
  lastSyncedAt: z.string().optional(),
  sources: z.array(z.string()),
  groups: z.array(ParliamentGroupSchema),
  recentVotes: z.array(ParliamentVoteSummarySchema),
  // Headline = CURRENT seats (SC-1: superseded/deceased members excluded; e.g.
  // camera 330 / senat 134).
  memberCountByChamber: z.object({
    camera: z.number().int().nonnegative(),
    senat: z.number().int().nonnegative(),
  }),
  // Secondary (optional) = ALL mandate rows incl. superseded (e.g. 335 / 137),
  // for a tooltip/detail next to the current headline.
  memberCountByChamberAllMandates: z
    .object({
      camera: z.number().int().nonnegative(),
      senat: z.number().int().nonnegative(),
    })
    .optional(),
  budgetInstitutionSlugs: z.object({
    camera: z.string(),
    senat: z.string(),
  }),
});
export type ParliamentHubData = z.infer<typeof ParliamentHubDataSchema>;

export const ParliamentMembersListSchema = z.object({
  members: z.array(ParliamentMemberSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});
export type ParliamentMembersList = z.infer<typeof ParliamentMembersListSchema>;

export const ParliamentSeatSchema = z.object({
  seatIndex: z.number().int().nonnegative(),
  /**
   * ABSENT on a filler seat. The authoritative seat count is the group's
   * `memberCount`; when the roster page we hold is shorter, the remaining seats
   * are anonymous placeholders that keep the hemicycle honest about chamber size.
   * They used to carry a fabricated `"<groupId>-seat-<i>"` id and were rendered
   * as links to member pages that do not exist.
   */
  memberId: z.string().optional(),
  memberName: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  color: z.string(),
  x: z.number(),
  y: z.number(),
  isActive: z.boolean(),
});
export type ParliamentSeat = z.infer<typeof ParliamentSeatSchema>;

export const ParliamentChamberCompositionSchema = z.object({
  chamber: ParliamentChamberSchema,
  totalSeats: z.number().int().nonnegative(),
  majoritySeats: z.number().int().nonnegative(),
  activeSeatCount: z.number().int().nonnegative(),
  hasActiveFilters: z.boolean(),
  groups: z.array(ParliamentGroupSchema),
  seats: z.array(ParliamentSeatSchema),
  viewBox: z.string(),
  seatRadius: z.number().positive(),
});
export type ParliamentChamberComposition = z.infer<
  typeof ParliamentChamberCompositionSchema
>;

export const ParliamentMemberVotingHistorySchema = z.object({
  memberId: z.string(),
  votes: z.array(
    z.object({
      voteId: z.string(),
      chamber: z.enum(["camera", "senat"]),
      title: z.string(),
      heldAt: z.string(),
      choice: MemberVoteChoiceSchema,
      outcome: VoteOutcomeSchema,
      divisionNumber: z.number().int().positive().optional(),
      tally: ParliamentVoteTallySchema.optional(),
    }),
  ),
  total: z.number().int().nonnegative(),
  // Cursor paging over the server votes connection (load-more in the UI).
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
});
export type ParliamentMemberVotingHistory = z.infer<
  typeof ParliamentMemberVotingHistorySchema
>;

/** One day cell of the member vote-activity heatmap (server aggregate). */
export const ParliamentMemberVoteActivityDaySchema = z.object({
  /** ISO date (YYYY-MM-DD) of the sitting day. */
  date: z.string(),
  total: z.number().int().nonnegative(),
  pentru: z.number().int().nonnegative(),
  impotriva: z.number().int().nonnegative(),
  abtinere: z.number().int().nonnegative(),
  nuAVotat: z.number().int().nonnegative(),
});
export type ParliamentMemberVoteActivityDay = z.infer<
  typeof ParliamentMemberVoteActivityDaySchema
>;

/**
 * Per-year vote-activity aggregate for a member (heatmap source). `days` carries
 * only days with recorded votes; `availableYears` reflects the NON-date filters
 * (the server bounds the range by `year`, so a date filter is never sent here).
 */
export const ParliamentMemberVoteActivitySchema = z.object({
  year: z.number().int(),
  days: z.array(ParliamentMemberVoteActivityDaySchema),
  availableYears: z.array(z.number().int()),
});
export type ParliamentMemberVoteActivity = z.infer<
  typeof ParliamentMemberVoteActivitySchema
>;

// ── member speeches (interventii tab: heatmap + filterable list) ─────────────

/**
 * One speech TURN in the member-interventii list. Grain is a single
 * intervention (a chair can have hundreds of turns in one marathon sitting).
 * `title` is NULL for ~80% of rows (CDEP has none; Senate titles are ugly
 * sitting headers), so the card LEADS WITH `summary`, not the title.
 * `sourceUrlKind` gates how the source link is presented: 'exact' → a real
 * deep-link to this turn; 'lossy_root' → only the sitting/list root (Senate).
 * `fullText` is the verbatim transcript, NULL while the backfill is in flight.
 */
export const ParliamentMemberSpeechSchema = z.object({
  speechKey: z.string(),
  /** ISO date (YYYY-MM-DD); may be empty when the source row carries no date. */
  spokenAt: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  /** GraphQL chamber token: 'camera_deputatilor' | 'senat' | 'comun'. */
  chamber: z.string().optional(),
  sourceUrl: z.string().optional(),
  /** 'exact' → deep-link this turn; 'lossy_root' → sitting-list root only. */
  sourceUrlKind: z.string().optional(),
  /** Verbatim transcript; undefined when not yet loaded ("indisponibil"). */
  fullText: z.string().optional(),
  /**
   * CANONICAL POINTERS (`ParliamentSpeech.isCanonical` / `sessionKey` /
   * `position`). A canonical row is a re-derived reading block: it carries the
   * whole turn AND a provable position in its sitting, so — and only so — the
   * card can link to the highlighted location inside the full transcript.
   *
   * `isCanonical` defaults to false because it is also false on any database
   * where the canonical stenogram migration is not applied; treating "absent"
   * as "canonical" would mint sitting links that resolve to nothing.
   * `position` is absent (never 0) on a legacy row — position is only defined
   * for a canonical block.
   */
  isCanonical: z.boolean().default(false),
  sessionKey: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
});
export type ParliamentMemberSpeech = z.infer<
  typeof ParliamentMemberSpeechSchema
>;

export const ParliamentMemberSpeechesHistorySchema = z.object({
  memberId: z.string(),
  speeches: z.array(ParliamentMemberSpeechSchema),
  /** EXACT filtered/searched count (the connection `total`). */
  total: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
});
export type ParliamentMemberSpeechesHistory = z.infer<
  typeof ParliamentMemberSpeechesHistorySchema
>;

/** One day cell of the member speech-activity heatmap (proprie + comun = total). */
export const ParliamentMemberSpeechActivityDaySchema = z.object({
  date: z.string(),
  total: z.number().int().nonnegative(),
  /** Turns in the member's own chamber (total - comun). */
  proprie: z.number().int().nonnegative(),
  /** Turns in a joint sitting (chamber = comun). */
  comun: z.number().int().nonnegative(),
});
export type ParliamentMemberSpeechActivityDay = z.infer<
  typeof ParliamentMemberSpeechActivityDaySchema
>;

/**
 * Per-year speech-activity aggregate (heatmap source). `days` carries only days
 * with recorded turns; `availableYears` reflects the NON-date filter + q (the
 * server bounds the range by `year`, so a date filter is never sent here).
 */
export const ParliamentMemberSpeechActivitySchema = z.object({
  year: z.number().int(),
  days: z.array(ParliamentMemberSpeechActivityDaySchema),
  availableYears: z.array(z.number().int()),
});
export type ParliamentMemberSpeechActivity = z.infer<
  typeof ParliamentMemberSpeechActivitySchema
>;

// ── global stenograme (all-parliament speeches page) ──────────────────────────

/**
 * The speaker of a global-list speech turn. NULL on the wire for turns whose
 * speaker was never matched to a mandate (PM, guests, officials) — those turns
 * are REAL data and stay in the list, rendered without a member link.
 */
export const ParliamentSpeechSpeakerSchema = z.object({
  mandateKey: z.string(),
  fullName: z.string(),
  /** GraphQL chamber token; optional — mirrors the member surface. */
  chamber: z.string().optional(),
  groupName: z.string().optional(),
});
export type ParliamentSpeechSpeaker = z.infer<
  typeof ParliamentSpeechSpeakerSchema
>;

/**
 * How deep the server actually searched when `q` was set (the connection's
 * `searchDepth`): titles+summaries only, or the verbatim transcripts too.
 * `null`/absent when no `q` was sent. The depth notice renders from THIS value
 * (the server is the source of truth), never from a client-side guess.
 */
export const ParliamentSpeechSearchDepthSchema = z.enum([
  "TITLE_SUMMARY",
  "FULL_TEXT",
]);
export type ParliamentSpeechSearchDepth = z.infer<
  typeof ParliamentSpeechSearchDepthSchema
>;

/** A global-list speech turn: the member-speech shape + speaker identity. */
export const ParliamentSpeechSchema = ParliamentMemberSpeechSchema.extend({
  /** Speaker as printed in the stenogram — present even when unmatched. */
  speakerName: z.string().optional(),
  speaker: ParliamentSpeechSpeakerSchema.nullable().optional(),
});
export type ParliamentSpeech = z.infer<typeof ParliamentSpeechSchema>;

/**
 * One page of the global speeches connection. `total` is CAPPED server-side at
 * 10 000 (`totalEstimated: true` → render "peste 10.000"), unlike the member
 * connection whose total is exact.
 */
export const ParliamentSpeechesListSchema = z.object({
  speeches: z.array(ParliamentSpeechSchema),
  total: z.number().int().nonnegative(),
  totalEstimated: z.boolean(),
  searchDepth: ParliamentSpeechSearchDepthSchema.nullable(),
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
});
export type ParliamentSpeechesList = z.infer<
  typeof ParliamentSpeechesListSchema
>;

/**
 * Institution-wide per-year speech activity (the stenograme heatmap). Same day
 * shape as the member aggregate, plus the applied `searchDepth` for honesty.
 */
export const ParliamentSpeechActivitySchema = z.object({
  year: z.number().int(),
  days: z.array(ParliamentMemberSpeechActivityDaySchema),
  availableYears: z.array(z.number().int()),
  searchDepth: ParliamentSpeechSearchDepthSchema.nullable(),
});
export type ParliamentSpeechActivity = z.infer<
  typeof ParliamentSpeechActivitySchema
>;

/* ── canonical stenogram sittings (the sessions-first reading surface) ──────
 *
 * Mirrors the server's `ParliamentStenogramSession` / `…Segment` / `…Transcript`
 * types 1:1. Two contracts drive most of the UI honesty here:
 *
 *  - `availability` is the SERVED-READING promise, not a quality score.
 *    SOURCE_ONLY means the sitting and its official URL are held and NO reading
 *    is served — the surface must say so and hand the reader the official link,
 *    never render an empty transcript as if the sitting were silent.
 *  - `sessionDate` is NULL when the source carries no trustworthy date, and
 *    `sessionDateSource` says why. The date is never inferred, so the UI shows
 *    "dată indisponibilă" rather than guessing from the title.
 */
export const ParliamentStenogramAvailabilitySchema = z.enum([
  "COMPLETE",
  "PARTIAL",
  "SOURCE_ONLY",
]);
export type ParliamentStenogramAvailability = z.infer<
  typeof ParliamentStenogramAvailabilitySchema
>;

/** Reading-block kind, in the official printed order of the transcript. */
export const ParliamentStenogramSegmentKindSchema = z.enum([
  "SPEECH",
  "AGENDA_HEADING",
  "VOTE_RESULT",
  "CONTEXT",
]);
export type ParliamentStenogramSegmentKind = z.infer<
  typeof ParliamentStenogramSegmentKindSchema
>;

/**
 * SOURCE PRECISION of a stenogram URL — the server's `sourceUrlKind` taxonomy:
 *   - `exact`        deep-links this sitting/turn (safe to call authoritative);
 *   - `lossy_root`   resolves only to the sitting/section root (Senate);
 *   - `raw_response` points at the stored capture, not a live page.
 * Kept as a plain string (unknown future kinds must not break a page), with
 * `isExactSource` doing the branch.
 */
export const ParliamentStenogramSessionSchema = z.object({
  sessionKey: z.string(),
  /** 'camera_deputatilor' | 'senat' | 'comun'. */
  chamber: z.string(),
  /** YYYY-MM-DD; absent when the source carries no trustworthy date. */
  sessionDate: z.string().optional(),
  /** 'stenogram_title' | 'session_date' | 'none' — provenance of sessionDate. */
  sessionDateSource: z.string(),
  title: z.string().optional(),
  /** 'cdep_stenogram' | 'senat_stenogram'. */
  sourceSystem: z.string(),
  availability: ParliamentStenogramAvailabilitySchema,
  /** Always present server-side: a sitting with no path back to the source is a defect. */
  sourceUrl: z.string(),
  sourceUrlKind: z.string(),
  /** Agenda-owned sitting spine; absent is NORMAL, not a defect. */
  sittingKey: z.string().optional(),
  presidingText: z.string().optional(),
  startTimeText: z.string().optional(),
  endTimeText: z.string().optional(),
  segmentCount: z.number().int().nonnegative(),
  speechCount: z.number().int().nonnegative(),
  speakerCount: z.number().int().nonnegative(),
  sourceUpdatedAt: z.string().optional(),
  /**
   * Integrity anchors from the loader. `canonicalDigest` fixes the ORDERED
   * reading and `captureDigest` the raw capture, so a client can tell a
   * re-parse from a no-op refresh without diffing every block. Optional here
   * because a NAVIGATION REF carries neither — see
   * `ParliamentStenogramSessionRefSchema`.
   */
  canonicalDigest: z.string().optional(),
  captureDigest: z.string().optional(),
});
export type ParliamentStenogramSession = z.infer<
  typeof ParliamentStenogramSessionSchema
>;

/**
 * A sitting as a NAVIGATION TARGET — enough to label it and open its source,
 * and nothing more.
 *
 * This is the shape the server returns for previous/next sitting AND alongside
 * a `TRANSCRIPT_UNAVAILABLE` error. That second use is the important one: it is
 * exactly what makes "this sitting is real but yields no reading" different
 * from "no such sitting", and it means a SOURCE_ONLY capture can be rendered
 * with its real title, chamber and official link without a second request that
 * would only 409 again.
 */
export const ParliamentStenogramSessionRefSchema = z.object({
  sessionKey: z.string(),
  chamber: z.string(),
  sessionDate: z.string().optional(),
  title: z.string().optional(),
  availability: ParliamentStenogramAvailabilitySchema,
  sourceUrl: z.string(),
  sourceUrlKind: z.string(),
});
export type ParliamentStenogramSessionRef = z.infer<
  typeof ParliamentStenogramSessionRefSchema
>;

/**
 * Chamber-scoped chronological neighbours, SERVED BY THE API.
 *
 * These used to be derived client-side from a ±120-day window over the sittings
 * connection — which could silently miss a neighbour across a long recess and
 * cost an extra round trip. The server now computes them, so the reader states
 * adjacency instead of guessing it. `null` on a side is authoritative: there is
 * no such neighbour, not "we did not look far enough".
 */
export const ParliamentSittingNavigationSchema = z.object({
  previous: ParliamentStenogramSessionRefSchema.nullable().optional(),
  next: ParliamentStenogramSessionRefSchema.nullable().optional(),
});
export type ParliamentSittingNavigation = z.infer<
  typeof ParliamentSittingNavigationSchema
>;

/**
 * One canonical reading block. `(sessionKey, position)` IS the identity — the
 * database enforces it unique, so the reader can anchor on `position` and the
 * two can never disagree. `text` is the WHOLE block (not the card snippet).
 */
export const ParliamentStenogramSegmentSchema = z.object({
  segmentKey: z.string(),
  sessionKey: z.string(),
  /** 0-based position in the official printed order. */
  position: z.number().int().nonnegative(),
  kind: ParliamentStenogramSegmentKindSchema,
  text: z.string(),
  textChars: z.number().int().nonnegative(),
  /** Speaker AS PRINTED; absent for narration. NEVER an identity. */
  speakerName: z.string().optional(),
  /** The source's own speaker locator (CDep idm) — a locator, not an identity. */
  speakerRef: z.string().optional(),
  /** Roster-validated identity; absent is the honest, EXPECTED value for guests. */
  mandateKey: z.string().optional(),
  member: ParliamentSpeechSpeakerSchema.nullable().optional(),
  /** The canonical serving speech row for this block (SPEECH blocks only). */
  speechKey: z.string().optional(),
  agendaRef: z.string().optional(),
  sourceUrl: z.string(),
  sourceUrlKind: z.string(),
});
export type ParliamentStenogramSegment = z.infer<
  typeof ParliamentStenogramSegmentSchema
>;

/**
 * A sitting, its COMPLETE ordered reading, and its sitting navigation.
 *
 * `complete` is not decoration. The reader offers whole-document operations —
 * find-in-document, print, cite — and every one of them is a lie if the reader
 * is holding a prefix. The REST transcript endpoint serves one whole sitting
 * per response (it pages the repository internally and errors rather than
 * truncating), so this flag is `true` there and the UI is allowed to make those
 * promises. Anything that ever loads a slice must set it `false`, and the UI
 * must then refuse to claim completeness.
 */
export const ParliamentStenogramTranscriptSchema = z.object({
  session: ParliamentStenogramSessionSchema,
  segments: z.array(ParliamentStenogramSegmentSchema),
  totalSegments: z.number().int().nonnegative(),
  navigation: ParliamentSittingNavigationSchema.default({}),
  complete: z.boolean(),
});
export type ParliamentStenogramTranscript = z.infer<
  typeof ParliamentStenogramTranscriptSchema
>;

/**
 * One page of the sittings connection. `total` is CAPPED server-side at 10 000
 * (`totalEstimated: true` → render "peste 10.000"), and a full-history `q` that
 * resolved more sittings than it could return also sets it.
 */
export const ParliamentStenogramSessionsListSchema = z.object({
  sessions: z.array(ParliamentStenogramSessionSchema),
  total: z.number().int().nonnegative(),
  totalEstimated: z.boolean(),
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
});
export type ParliamentStenogramSessionsList = z.infer<
  typeof ParliamentStenogramSessionsListSchema
>;

/**
 * How a LEGACY speech key was mapped onto the canonical reading.
 *   - `exact_segment` carries all three canonical pointers — the deep link
 *     reaches the exact contribution;
 *   - `session_only`  resolves the sitting ALONE. That is the honest coarse
 *     answer used when a single block could not be PROVEN — the reader opens
 *     the sitting with no highlight rather than a guessed turn.
 */
export const ParliamentSpeechRedirectSchema = z.object({
  legacySpeechKey: z.string(),
  sessionKey: z.string(),
  canonicalSpeechKey: z.string().optional(),
  canonicalSegmentKey: z.string().optional(),
  canonicalPosition: z.number().int().nonnegative().optional(),
  mappingKind: z.string(),
  matchMethod: z.string(),
});
export type ParliamentSpeechRedirect = z.infer<
  typeof ParliamentSpeechRedirectSchema
>;

/**
 * The canonical context of one contribution: its block, its sitting, and the
 * neighbouring CONTRIBUTIONS (the previous/next SPEECH blocks — not the
 * adjacent printed block, which is usually narration).
 */
export const ParliamentSpeechContextSchema = z.object({
  /** The key that was REQUESTED — echoed so a client can tell a redirect happened. */
  speechKey: z.string(),
  session: ParliamentStenogramSessionSchema,
  segment: ParliamentStenogramSegmentSchema.nullable().optional(),
  previousContribution: ParliamentStenogramSegmentSchema.nullable().optional(),
  nextContribution: ParliamentStenogramSegmentSchema.nullable().optional(),
  /** Set ONLY when the requested key was legacy and resolved through speech_redirects. */
  redirect: ParliamentSpeechRedirectSchema.nullable().optional(),
});
export type ParliamentSpeechContext = z.infer<
  typeof ParliamentSpeechContextSchema
>;

export const MemberSpokenContributionSchema = z.object({
  contributionId: z.string(),
  heldAt: z.string(),
  title: z.string(),
  summary: z.string().optional(),
});
export type MemberSpokenContribution = z.infer<
  typeof MemberSpokenContributionSchema
>;

export const MemberWrittenQuestionSchema = z.object({
  questionId: z.string(),
  submittedAt: z.string().optional(),
  title: z.string(),
  /**
   * Whether a response is RECORDED in the source (cdep/senat). The server's
   * `responseStatus` is a raw source string, not an answered/unanswered fact:
   * a null only means no response document is recorded — it must never be
   * presented as "waiting for an answer" as if that were verified.
   */
  status: z.enum(["raspuns", "fara_raspuns_inregistrat"]),
  answerSummary: z.string().optional(),
  /** Official cdep.ro / senat.ro page for this question (server §6 traceability). */
  sourceUrl: z.string().url().optional(),
  /** AI-generated metadata (summary + classification), when the item has it. */
  aiMetadata: ParliamentAiControlItemMetadataSchema.optional(),
});
export type MemberWrittenQuestion = z.infer<typeof MemberWrittenQuestionSchema>;

export const MemberInterestDeclarationSchema = z.object({
  declarationId: z.string(),
  category: z.string(),
  description: z.string(),
  registeredAt: z.string().optional(),
  /**
   * The published declaration PDF on cdep.ro / senat.ro. This is the whole point
   * of the row — prod stores only the LINK to the state's public-by-law document
   * (contract §6) — and it was being dropped by the mapper, leaving a row the
   * reader could not verify or open.
   */
  fileUrl: z.string().url().optional(),
});
export type MemberInterestDeclaration = z.infer<
  typeof MemberInterestDeclarationSchema
>;

export const MemberElectionResultSchema = z.object({
  electionDate: z.string(),
  electionName: z.string(),
  votesReceived: z.number().int().nonnegative(),
  votesSharePercent: z.number().nonnegative(),
  elected: z.boolean(),
  constituency: z.string(),
});
export type MemberElectionResult = z.infer<typeof MemberElectionResultSchema>;

export const ParliamentMemberProfileSchema = z.object({
  memberId: z.string(),
  /**
   * OPTIONAL — the live profile query no longer fetches speeches. The intervenții
   * tab has its own cursor-paginated, filterable query; this ten-row payload was
   * fetched on every profile tab and rendered nowhere.
   */
  spokenContributions: z.array(MemberSpokenContributionSchema).optional(),
  writtenQuestions: z.array(MemberWrittenQuestionSchema),
  /**
   * The EXACT number of control items this member has, from the server's page
   * `total`. `writtenQuestions` is only the first page; without the total the tab
   * showed ten rows as if that were the complete record.
   */
  writtenQuestionsTotal: z.number().int().nonnegative().optional(),
  interestDeclarations: z.array(MemberInterestDeclarationSchema),
  electionResult: MemberElectionResultSchema.optional(),
  officialPortraitUrl: z.string().url().optional(),
  officialPortraitCaption: z.string().optional(),
});
export type ParliamentMemberProfile = z.infer<
  typeof ParliamentMemberProfileSchema
>;

/** A legislative initiative the member authored/initiated. */
export const MemberInitiativeSchema = z.object({
  initiativeId: z.string(),
  title: z.string(),
  /** Registration date (ISO); server orders these registration-date DESC. */
  registeredAt: z.string().optional(),
  status: z.string().optional(),
  /** The bill this initiative tracks (links to /parlament/proiecte/$billId). */
  billId: z.string().optional(),
  /** Promulgated-law reference, when the initiative became law. */
  promulgatedLawNumber: z.string().optional(),
  promulgatedLawYear: z.number().int().optional(),
});
export type MemberInitiative = z.infer<typeof MemberInitiativeSchema>;

export const ParliamentMemberInitiativesListSchema = z.object({
  memberId: z.string(),
  initiatives: z.array(MemberInitiativeSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});
export type ParliamentMemberInitiativesList = z.infer<
  typeof ParliamentMemberInitiativesListSchema
>;

export const BillTypeSchema = z.enum([
  "guvern",
  "parlamentar",
  "cetateni",
  "ordonanta",
]);
export type BillType = z.infer<typeof BillTypeSchema>;

export const BillCurrentLocationSchema = z.enum([
  "camera",
  "senat",
  "mediere",
  "presedinte",
  "promulgat",
  "respins",
  "retras",
  // Lapsed/terminated procedure ("clasat" / "procedură legislativă încetată") —
  // a terminal outcome distinct from rejection (parliament.bill-lifecycle.v2).
  "clasat",
]);
export type BillCurrentLocation = z.infer<typeof BillCurrentLocationSchema>;

export const BillStageStatusSchema = z.enum([
  "complete",
  "in_progress",
  "not_reached",
  "not_applicable",
]);
export type BillStageStatus = z.infer<typeof BillStageStatusSchema>;

export const BillSortBySchema = z.enum([
  "title_asc",
  "title_desc",
  "updated_desc",
  "updated_asc",
]);
export type BillSortBy = z.infer<typeof BillSortBySchema>;

export const ParliamentBillSummarySchema = z.object({
  billId: z.string(),
  number: z.string(),
  title: z.string(),
  billType: BillTypeSchema,
  originatingChamber: ParliamentChamberSchema,
  currentLocation: BillCurrentLocationSchema,
  currentStageLabel: z.string(),
  nextStageLabel: z.string().optional(),
  lastUpdatedAt: z.string(),
  legislatureId: z.string(),
});
export type ParliamentBillSummary = z.infer<typeof ParliamentBillSummarySchema>;

export const ParliamentBillListSchema = z.object({
  bills: z.array(ParliamentBillSummarySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});
export type ParliamentBillList = z.infer<typeof ParliamentBillListSchema>;

export const ParliamentBillDocumentSchema = z.object({
  documentId: z.string(),
  label: z.string(),
  url: z.string().url(),
  /**
   * OPTIONAL. `parliament.bill_documents` has no date column, so the live path
   * omits it (it used to copy the bill's latest event date onto EVERY document).
   * Only the mock fixtures, which carry per-document dates, populate it.
   */
  publishedAt: z.string().optional(),
  chamber: ParliamentChamberSchema.optional(),
  versionLabel: z.string().optional(),
});
export type ParliamentBillDocument = z.infer<
  typeof ParliamentBillDocumentSchema
>;

export const ParliamentBillPassageStageSchema = z.object({
  stageId: z.string(),
  label: z.string(),
  status: BillStageStatusSchema,
  completedAt: z.string().optional(),
});
export type ParliamentBillPassageStage = z.infer<
  typeof ParliamentBillPassageStageSchema
>;

export const ParliamentBillPassageSchema = z.object({
  camera: z.array(ParliamentBillPassageStageSchema),
  senat: z.array(ParliamentBillPassageStageSchema),
  final: z.array(ParliamentBillPassageStageSchema),
});
export type ParliamentBillPassage = z.infer<typeof ParliamentBillPassageSchema>;

export const ParliamentBillInitiatorSchema = z.object({
  type: z.enum(["guvern", "parlamentar", "cetateni"]),
  departmentName: z.string().optional(),
  memberId: z.string().optional(),
  memberName: z.string().optional(),
});
export type ParliamentBillInitiator = z.infer<
  typeof ParliamentBillInitiatorSchema
>;

export const ParliamentBillRelatedVoteSchema = z.object({
  voteId: z.string(),
  chamber: ParliamentChamberSchema,
  title: z.string(),
  heldAt: z.string(),
  /**
   * `bill_vote_links.role` for this edge, when the server resolved one
   * ('final_adoption' | 'final_rejection' | 'amendment' | 'procedural' | …).
   * The ONLY evidence that a vote was final — being the most recent is not.
   */
  linkRole: z.string().optional(),
});
export type ParliamentBillRelatedVote = z.infer<
  typeof ParliamentBillRelatedVoteSchema
>;

/** A single procedural step on the bill's chronological timeline (etape). */
export const ParliamentBillTimelineStepSchema = z.object({
  /** Stable key (source `position`); steps render in ascending position order. */
  stepId: z.string(),
  position: z.number().int().nonnegative(),
  /** Cleaned event description (rendered as-is; source fix handles glued tokens). */
  description: z.string(),
  /** ISO date when known; `dateText` is the source's display string. */
  date: z.string().optional(),
  dateText: z.string().optional(),
  /** Real chamber code from the source (null today → no fabricated phase). */
  chamberCode: z.string().optional(),
  /** Referral committee(s) for the step, extracted from the description (M5). */
  committee: z.array(z.string()).optional(),
  /** Resolved vote key (`cdep:${voteIdv}`) when the step records a vote. */
  voteId: z.string().optional(),
  /** Per-step document links (usually empty → fall back to the Documente tab). */
  docUrls: z.array(z.string()).default([]),
  /** Highlighted milestone steps (adoptare/promulgare/lege/reexaminare/înaintat). */
  isMilestone: z.boolean(),
});
export type ParliamentBillTimelineStep = z.infer<
  typeof ParliamentBillTimelineStepSchema
>;

/** The bill's becomes-law milestone (resolved legal act), when present. */
export const ParliamentBillLawMilestoneSchema = z.object({
  lawNumber: z.string(),
  lawYear: z.number().int().optional(),
  actId: z.string().optional(),
  actTitle: z.string().optional(),
});
export type ParliamentBillLawMilestone = z.infer<
  typeof ParliamentBillLawMilestoneSchema
>;

export const ParliamentBillDetailSchema = ParliamentBillSummarySchema.extend({
  longTitle: z.string(),
  summary: z.string().optional(),
  initiator: ParliamentBillInitiatorSchema,
  documents: z.array(ParliamentBillDocumentSchema),
  // `passage` (the legacy 3-column tracker) is deprecated + optional; the etape
  // tab now renders `timeline`. Kept optional so the mock detail path still parses.
  passage: ParliamentBillPassageSchema.optional(),
  /** Chronological procedural timeline (position order) — the etape surface. */
  timeline: z.array(ParliamentBillTimelineStepSchema).default([]),
  /** Becomes-law milestone for the hero card (null when the bill isn't a law). */
  lawMilestone: ParliamentBillLawMilestoneSchema.optional(),
  relatedVotes: z.array(ParliamentBillRelatedVoteSchema),
  /**
   * AI-generated bill metadata. `valueClass` is lifted out for the render gate
   * ('standard' → show the AI summary card; 'low_value' → hide it). Both default
   * absent when the bill has no enrichment.
   */
  aiMetadata: ParliamentAiBillMetadataSchema.optional(),
  valueClass: z.string().optional(),
  /**
   * All bill_key views merged into this dossier (requested key first). A CDep
   * and a Senate registration of the same initiative are separate rows in the
   * source; when the server resolves them as a twin pair it merges their
   * children and lists both keys here. Length 1 = single-view dossier.
   */
  dossierBillIds: z.array(z.string()).default([]),
});
export type ParliamentBillDetail = z.infer<typeof ParliamentBillDetailSchema>;

export const ParliamentTabSchema = z.enum([
  "prezentare",
  "membri",
  "voturi",
  "grupuri",
  "proiecte",
]);
export type ParliamentTabId = z.infer<typeof ParliamentTabSchema>;

/** Unified search params for /parlament — tab drives the active section */
export const ParliamentSearchSchema = z.object({
  tab: ParliamentTabSchema.optional().catch(undefined),
  chamber: z.enum(["camera", "senat", "all"]).optional().catch(undefined),
  judet: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
  grup: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
  q: z.string().optional().catch(undefined),
  find: z
    .union([z.literal("1"), z.literal(1)])
    .optional()
    .catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  outcome: VoteOutcomeSchema.optional().catch(undefined),
  billType: BillTypeSchema.optional().catch(undefined),
  billLocation: BillCurrentLocationSchema.optional().catch(undefined),
  sortBy: BillSortBySchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  pageSize: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
});
export type ParliamentSearch = z.infer<typeof ParliamentSearchSchema>;

export const ParliamentHubSearchSchema = ParliamentSearchSchema;
export type ParliamentHubSearch = ParliamentSearch;

export const ParliamentGroupsSearchSchema = ParliamentSearchSchema;
export type ParliamentGroupsSearch = ParliamentSearch;

export const ParliamentMembersSearchSchema = ParliamentSearchSchema;
export type ParliamentMembersSearch = ParliamentSearch;

export const ParliamentVotesSearchSchema = ParliamentSearchSchema;
export type ParliamentVotesSearch = ParliamentSearch;

export const ParliamentBillsSearchSchema = ParliamentSearchSchema;
export type ParliamentBillsSearch = ParliamentSearch;

/**
 * A calendar-REAL `YYYY-MM-DD` day, or `undefined`. The regex alone admits
 * impossible values (`2026-99-99`, `2026-02-30`) that then throw RangeError in
 * the Intl date/chip formatters — so we also round-trip through UTC and require
 * the parsed date to re-serialise to the same string. `.catch(undefined)` keeps
 * the lenient contract: any junk (bad shape OR impossible date) falls to
 * undefined, it never throws.
 */
const strictIsoDateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((day) => {
    const parsed = new Date(`${day}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === day
    );
  })
  .optional()
  .catch(undefined);

/**
 * Search params for the member voting-history tab (heatmap + advanced filters).
 * Lenient like `ParliamentSearchSchema` — every field `.optional().catch(undefined)`
 * so a hand-edited/junk URL never throws, it just drops the bad facet.
 *   - `from`/`to`  — inclusive vote-date range (YYYY-MM-DD).
 *   - `choice`     — one or more of pentru|impotriva|abtinere|nu_a_votat.
 *   - `outcome`    — division outcome (adoptat|respins).
 *   - `session`    — proprie (member's own chamber) | comun (joint sitting).
 *   - `an`         — heatmap year (drives the vote-activity aggregate).
 */
export const MemberVotesSearchSchema = z.object({
  // Strict, calendar-REAL YYYY-MM-DD: a junk or impossible date (`?from=abc`,
  // `?from=2026-99-99`) must fall to undefined here, not reach the chip/date
  // formatters (RangeError: Invalid time value).
  from: strictIsoDateParam,
  to: strictIsoDateParam,
  choice: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
  outcome: z.enum(["adoptat", "respins"]).optional().catch(undefined),
  session: z.enum(["proprie", "comun"]).optional().catch(undefined),
  an: z.coerce.number().int().optional().catch(undefined),
});
export type MemberVotesSearch = z.infer<typeof MemberVotesSearchSchema>;

/**
 * Search params for the member interventii tab (speech heatmap + filters +
 * free-text). Lenient like `MemberVotesSearchSchema` — every field
 * `.optional().catch(undefined)` so a junk/hand-edited URL never throws.
 *   - `from`/`to`  — inclusive spoken-date range (YYYY-MM-DD).
 *   - `session`    — proprie (member's own chamber) | comun (joint sitting).
 *   - `q`          — free-text over title + summary + verbatim transcript.
 *   - `an`         — heatmap year (drives the speech-activity aggregate).
 */
export const MemberSpeechesSearchSchema = z.object({
  from: strictIsoDateParam,
  to: strictIsoDateParam,
  session: z.enum(["proprie", "comun"]).optional().catch(undefined),
  // Trimmed free-text; empty/oversized junk collapses to undefined so it never
  // reaches the query arg or the chip formatter.
  q: z.string().trim().min(1).max(200).optional().catch(undefined),
  an: z.coerce.number().int().optional().catch(undefined),
});
export type MemberSpeechesSearch = z.infer<typeof MemberSpeechesSearchSchema>;

/**
 * Which of the two stenograme views is showing. SITTINGS IS THE DEFAULT and the
 * default renders with NO param: a stenogram is a document, so the primary unit
 * of the surface is the sitting, not the isolated turn. `interventii` is the
 * cross-sitting search over individual contributions.
 */
export const ParliamentStenogrameViewSchema = z.enum(["sedinte", "interventii"]);
export type ParliamentStenogrameView = z.infer<
  typeof ParliamentStenogrameViewSchema
>;

/**
 * Availability facet on the sittings view — the SERVED-READING promise of a
 * capture, surfaced as a filter because "show me only sittings I can actually
 * read" is a real question. Values match the server enum exactly.
 */
export const ParliamentStenogramAvailabilityParamSchema = z
  .enum(["COMPLETE", "PARTIAL", "SOURCE_ONLY"])
  .optional()
  .catch(undefined);

/**
 * Search params for the global stenograme page (/parlament/stenograme).
 * Lenient like the other parliament search schemas — junk never throws.
 *   - `view`     — sedinte (default, omitted from the URL) | interventii.
 *   - `an`       — selected year. On the INTERVENTII view it is load-bearing for
 *                  the list too, not just the heatmap: the server refuses an
 *                  unbounded speeches query, so when neither `vorbitor` nor
 *                  from/to is set the client sends the year window. On the
 *                  SEDINTE view it is a plain facet — the sittings table is one
 *                  row per capture with an indexed date, so it needs no bound
 *                  and the default view is the whole history, newest first.
 *   - `camera`   — camera | senat | comun (joint sittings) — one 3-way facet.
 *   - `vorbitor` — the speaker's mandateKey (picked via the roster combobox).
 *                  On sittings it selects the sittings where that speaker holds
 *                  at least one PUBLIC contribution.
 *   - `from`/`to`— inclusive date range (YYYY-MM-DD).
 *   - `q`        — free-text. The two views search DIFFERENT things and say so:
 *                  sittings run a full-history search over the canonical
 *                  transcript projection; interventions run the depth-reported
 *                  title/summary(+transcript) search.
 *   - `disponibilitate` — sittings-only availability facet.
 */
export const ParliamentSpeechesSearchSchema = z.object({
  view: ParliamentStenogrameViewSchema.optional().catch(undefined),
  an: z.coerce.number().int().optional().catch(undefined),
  camera: z.enum(["camera", "senat", "comun"]).optional().catch(undefined),
  vorbitor: z.string().trim().min(1).optional().catch(undefined),
  from: strictIsoDateParam,
  to: strictIsoDateParam,
  q: z.string().trim().min(1).max(200).optional().catch(undefined),
  disponibilitate: ParliamentStenogramAvailabilityParamSchema,
});
export type ParliamentSpeechesSearch = z.infer<
  typeof ParliamentSpeechesSearchSchema
>;

/**
 * The speaker filter's URL contract: `?vorbitori=`, repeated or single.
 *
 * The VALUES are the names the transcript PRINTED, verbatim — that is the only
 * identity a sitting is guaranteed to carry, and it keeps guests, ministers and
 * anyone the source printed no mandate for just as filterable as resolved
 * members. Names are therefore never comma-split (a printed name may hold one)
 * and never case-folded: a name that does not occur in the sitting simply
 * matches nothing, which the reader states rather than hides.
 *
 * Lenient like every other search param here — non-strings, blanks, duplicates
 * and absurd lengths are dropped, and the param never throws.
 */
const MAX_SPEAKER_NAME_CHARS = 200;

function parseSpeakerFilterParam(value: unknown): string[] | undefined {
  const candidates = Array.isArray(value) ? value : [value];
  const collected: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed || trimmed.length > MAX_SPEAKER_NAME_CHARS) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    collected.push(trimmed);
  }

  return collected.length > 0 ? collected : undefined;
}

/**
 * `.optional()` on the OUTSIDE is load-bearing, not decoration: a preprocessed
 * param takes `unknown` as its input type, and without it the router would
 * infer `vorbitori` as a REQUIRED search key — forcing every existing link into
 * the reader (member records, speech detail, sitting cards) to pass a filter it
 * knows nothing about.
 */
const optionalSpeakerNamesParam = z
  .preprocess(parseSpeakerFilterParam, z.array(z.string()).optional())
  .catch(undefined)
  .optional();

/**
 * Search params for the sitting reader
 * (/parlament/stenograme/sedinte/$sessionKey).
 *   - `interventie` — the contribution to highlight and scroll to. Accepts a
 *     CANONICAL `canon:` key or a LEGACY `cdep:`/`senat:` key: a legacy deep
 *     link resolves through the server's speech_redirects, so old shared URLs
 *     keep landing on the right place in the document.
 *   - `vorbitori` — printed speaker names to narrow the reading to. A filtered
 *     reading is an EXCERPT, not the record, so the state is in the URL: what a
 *     reader shares must be exactly what they were looking at, filter included.
 *
 * There is deliberately NO free-text param: find-in-document was a reading aid
 * over an already-loaded document, and pushing every keystroke through the
 * router would rewrite history while the reader types.
 */
export const ParliamentStenogramReaderSearchSchema = z.object({
  interventie: z.string().trim().min(1).optional().catch(undefined),
  vorbitori: optionalSpeakerNamesParam,
});
export type ParliamentStenogramReaderSearch = z.infer<
  typeof ParliamentStenogramReaderSearchSchema
>;
