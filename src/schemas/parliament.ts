import { z } from 'zod'

export const ParliamentChamberSchema = z.enum(['camera', 'senat'])
export type ParliamentChamber = z.infer<typeof ParliamentChamberSchema>

export const VoteTypeSchema = z.enum(['deschis', 'secret'])
export type VoteType = z.infer<typeof VoteTypeSchema>

export const MemberVoteChoiceSchema = z.enum([
  'pentru',
  'impotriva',
  'abtinere',
  'nu_a_votat',
])
export type MemberVoteChoice = z.infer<typeof MemberVoteChoiceSchema>

export const VoteOutcomeSchema = z.enum(['adoptat', 'respins', 'amânat'])
export type VoteOutcome = z.infer<typeof VoteOutcomeSchema>

export const ParliamentLegislatureSchema = z.object({
  id: z.string(),
  label: z.string(),
  startYear: z.number().int(),
  endYear: z.number().int(),
})
export type ParliamentLegislature = z.infer<typeof ParliamentLegislatureSchema>

export const ParliamentGroupSchema = z.object({
  groupId: z.string(),
  name: z.string(),
  shortName: z.string().optional(),
  chamber: ParliamentChamberSchema,
  memberCount: z.number().int().nonnegative(),
  color: z.string().optional(),
})
export type ParliamentGroup = z.infer<typeof ParliamentGroupSchema>

export const ParliamentMemberContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional(),
  /** Official CV document (PDF) published on cdep.ro / senat.ro, when present. */
  cvUrl: z.string().url().optional(),
})
export type ParliamentMemberContact = z.infer<typeof ParliamentMemberContactSchema>

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
})
export type ParliamentCommittee = z.infer<typeof ParliamentCommitteeSchema>

/** A slim member reference on a committee roster row (committee-detail view). */
export const ParliamentCommitteeMemberRefSchema = z.object({
  /** mandateKey — deep-links to /parlament/membri/$memberId when present. */
  mandateKey: z.string().optional(),
  fullName: z.string().optional(),
  chamber: z.string().optional(),
  groupName: z.string().optional(),
})
export type ParliamentCommitteeMemberRef = z.infer<
  typeof ParliamentCommitteeMemberRefSchema
>

/** A slim committee reference on a membership row (member-overview view). */
export const ParliamentCommitteeRefSchema = z.object({
  committeeKey: z.string(),
  name: z.string(),
  chamber: z.string().optional(),
  sourceUrl: z.string().optional(),
})
export type ParliamentCommitteeRef = z.infer<typeof ParliamentCommitteeRefSchema>

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
})
export type ParliamentCommitteeMembership = z.infer<
  typeof ParliamentCommitteeMembershipSchema
>

export const ParliamentMemberSchema = z.object({
  memberId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  chamber: z.enum(['camera', 'senat']),
  groupId: z.string(),
  groupName: z.string(),
  judetSlug: z.string(),
  judetName: z.string(),
  mandateStart: z.string().optional(),
  mandateEnd: z.string().optional(),
  role: z.string().optional(),
  photoUrl: z.string().url().optional(),
  contact: ParliamentMemberContactSchema.optional(),
  /**
   * Committee memberships (each carries the `committee` ref). Only the single
   * member query requests these; the list/roster shapes leave it undefined.
   */
  committees: z.array(ParliamentCommitteeMembershipSchema).optional(),
})
export type ParliamentMember = z.infer<typeof ParliamentMemberSchema>

// ── committee browse / detail ────────────────────────────────────────────────

export const ParliamentCommitteeDetailSchema = ParliamentCommitteeSchema.extend({
  /** Roster rows (each carries the `member` ref). */
  members: z.array(ParliamentCommitteeMembershipSchema),
  linkedBills: z.array(z.lazy(() => ParliamentBillSummarySchema)),
  linkedBillsTotal: z.number().int().nonnegative(),
  meetingsCount: z.number().int().nonnegative(),
})
export type ParliamentCommitteeDetail = z.infer<
  typeof ParliamentCommitteeDetailSchema
>

export const ParliamentCommitteeListSchema = z.object({
  committees: z.array(ParliamentCommitteeSchema),
  hasNextPage: z.boolean(),
  endCursor: z.string().optional(),
})
export type ParliamentCommitteeList = z.infer<typeof ParliamentCommitteeListSchema>

// ── data freshness ───────────────────────────────────────────────────────────

export const ParliamentDataFreshnessSchema = z.object({
  latestVoteDate: z.string().optional(),
  lastLoadedAt: z.string().optional(),
})
export type ParliamentDataFreshness = z.infer<typeof ParliamentDataFreshnessSchema>

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
})
export type ParliamentAiBillMetadata = z.infer<
  typeof ParliamentAiBillMetadataSchema
>

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
})
export type ParliamentAiControlItemMetadata = z.infer<
  typeof ParliamentAiControlItemMetadataSchema
>

export const ParliamentVoteTallySchema = z.object({
  pentru: z.number().int().nonnegative(),
  impotriva: z.number().int().nonnegative(),
  abtinere: z.number().int().nonnegative().optional(),
  nuAVotat: z.number().int().nonnegative().optional(),
})
export type ParliamentVoteTally = z.infer<typeof ParliamentVoteTallySchema>

export const ParliamentGroupVoteBreakdownSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  pentru: z.number().int().nonnegative(),
  impotriva: z.number().int().nonnegative(),
  abtinere: z.number().int().nonnegative().optional(),
  nuAVotat: z.number().int().nonnegative().optional(),
})
export type ParliamentGroupVoteBreakdown = z.infer<
  typeof ParliamentGroupVoteBreakdownSchema
>

export const ParliamentMemberVoteRecordSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  choice: MemberVoteChoiceSchema,
})
export type ParliamentMemberVoteRecord = z.infer<
  typeof ParliamentMemberVoteRecordSchema
>

export const ParliamentVoteSummarySchema = z.object({
  voteId: z.string(),
  chamber: z.enum(['camera', 'senat']),
  title: z.string(),
  heldAt: z.string(),
  voteType: VoteTypeSchema,
  outcome: VoteOutcomeSchema,
  outcomeLabel: z.string(),
  tally: ParliamentVoteTallySchema,
  relatedBillId: z.string().optional(),
})
export type ParliamentVoteSummary = z.infer<typeof ParliamentVoteSummarySchema>

export const ParliamentVoteListItemSchema = ParliamentVoteSummarySchema.extend({
  divisionNumber: z.number().int().positive(),
})
export type ParliamentVoteListItem = z.infer<typeof ParliamentVoteListItemSchema>

export const ParliamentVotesListSchema = z.object({
  votes: z.array(ParliamentVoteListItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().positive(),
})
export type ParliamentVotesList = z.infer<typeof ParliamentVotesListSchema>

export const ParliamentVoteDetailSchema = ParliamentVoteSummarySchema.extend({
  description: z.string().optional(),
  groupBreakdown: z.array(ParliamentGroupVoteBreakdownSchema),
  memberVotes: z.array(ParliamentMemberVoteRecordSchema),
})
export type ParliamentVoteDetail = z.infer<typeof ParliamentVoteDetailSchema>

export const ParliamentHubDataSchema = z.object({
  legislature: ParliamentLegislatureSchema,
  lastSyncedAt: z.string(),
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
})
export type ParliamentHubData = z.infer<typeof ParliamentHubDataSchema>

export const ParliamentMembersListSchema = z.object({
  members: z.array(ParliamentMemberSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().positive(),
})
export type ParliamentMembersList = z.infer<typeof ParliamentMembersListSchema>

export const ParliamentSeatSchema = z.object({
  seatIndex: z.number().int().nonnegative(),
  memberId: z.string(),
  memberName: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  color: z.string(),
  x: z.number(),
  y: z.number(),
  isActive: z.boolean(),
})
export type ParliamentSeat = z.infer<typeof ParliamentSeatSchema>

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
})
export type ParliamentChamberComposition = z.infer<
  typeof ParliamentChamberCompositionSchema
>

export const ParliamentMemberVotingHistorySchema = z.object({
  memberId: z.string(),
  votes: z.array(
    z.object({
      voteId: z.string(),
      chamber: z.enum(['camera', 'senat']),
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
})
export type ParliamentMemberVotingHistory = z.infer<
  typeof ParliamentMemberVotingHistorySchema
>

/** One day cell of the member vote-activity heatmap (server aggregate). */
export const ParliamentMemberVoteActivityDaySchema = z.object({
  /** ISO date (YYYY-MM-DD) of the sitting day. */
  date: z.string(),
  total: z.number().int().nonnegative(),
  pentru: z.number().int().nonnegative(),
  impotriva: z.number().int().nonnegative(),
  abtinere: z.number().int().nonnegative(),
  nuAVotat: z.number().int().nonnegative(),
})
export type ParliamentMemberVoteActivityDay = z.infer<
  typeof ParliamentMemberVoteActivityDaySchema
>

/**
 * Per-year vote-activity aggregate for a member (heatmap source). `days` carries
 * only days with recorded votes; `availableYears` reflects the NON-date filters
 * (the server bounds the range by `year`, so a date filter is never sent here).
 */
export const ParliamentMemberVoteActivitySchema = z.object({
  year: z.number().int(),
  days: z.array(ParliamentMemberVoteActivityDaySchema),
  availableYears: z.array(z.number().int()),
})
export type ParliamentMemberVoteActivity = z.infer<
  typeof ParliamentMemberVoteActivitySchema
>

export const MemberSpokenContributionSchema = z.object({
  contributionId: z.string(),
  heldAt: z.string(),
  title: z.string(),
  summary: z.string().optional(),
})
export type MemberSpokenContribution = z.infer<typeof MemberSpokenContributionSchema>

export const MemberWrittenQuestionSchema = z.object({
  questionId: z.string(),
  submittedAt: z.string(),
  title: z.string(),
  status: z.enum(['raspuns', 'in_asteptare']),
  answerSummary: z.string().optional(),
  /** AI-generated metadata (summary + classification), when the item has it. */
  aiMetadata: ParliamentAiControlItemMetadataSchema.optional(),
})
export type MemberWrittenQuestion = z.infer<typeof MemberWrittenQuestionSchema>

export const MemberInterestDeclarationSchema = z.object({
  declarationId: z.string(),
  category: z.string(),
  description: z.string(),
  registeredAt: z.string(),
})
export type MemberInterestDeclaration = z.infer<typeof MemberInterestDeclarationSchema>

export const MemberElectionResultSchema = z.object({
  electionDate: z.string(),
  electionName: z.string(),
  votesReceived: z.number().int().nonnegative(),
  votesSharePercent: z.number().nonnegative(),
  elected: z.boolean(),
  constituency: z.string(),
})
export type MemberElectionResult = z.infer<typeof MemberElectionResultSchema>

export const ParliamentMemberProfileSchema = z.object({
  memberId: z.string(),
  spokenContributions: z.array(MemberSpokenContributionSchema),
  writtenQuestions: z.array(MemberWrittenQuestionSchema),
  interestDeclarations: z.array(MemberInterestDeclarationSchema),
  electionResult: MemberElectionResultSchema.optional(),
  officialPortraitUrl: z.string().url().optional(),
  officialPortraitCaption: z.string().optional(),
})
export type ParliamentMemberProfile = z.infer<typeof ParliamentMemberProfileSchema>

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
})
export type MemberInitiative = z.infer<typeof MemberInitiativeSchema>

export const ParliamentMemberInitiativesListSchema = z.object({
  memberId: z.string(),
  initiatives: z.array(MemberInitiativeSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().positive(),
})
export type ParliamentMemberInitiativesList = z.infer<
  typeof ParliamentMemberInitiativesListSchema
>

export const BillTypeSchema = z.enum([
  'guvern',
  'parlamentar',
  'cetateni',
  'ordonanta',
])
export type BillType = z.infer<typeof BillTypeSchema>

export const BillCurrentLocationSchema = z.enum([
  'camera',
  'senat',
  'mediere',
  'presedinte',
  'promulgat',
  'respins',
  'retras',
])
export type BillCurrentLocation = z.infer<typeof BillCurrentLocationSchema>

export const BillStageStatusSchema = z.enum([
  'complete',
  'in_progress',
  'not_reached',
  'not_applicable',
])
export type BillStageStatus = z.infer<typeof BillStageStatusSchema>

export const BillSortBySchema = z.enum([
  'title_asc',
  'title_desc',
  'updated_desc',
  'updated_asc',
])
export type BillSortBy = z.infer<typeof BillSortBySchema>

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
})
export type ParliamentBillSummary = z.infer<typeof ParliamentBillSummarySchema>

export const ParliamentBillListSchema = z.object({
  bills: z.array(ParliamentBillSummarySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().positive(),
})
export type ParliamentBillList = z.infer<typeof ParliamentBillListSchema>

export const ParliamentBillDocumentSchema = z.object({
  documentId: z.string(),
  label: z.string(),
  url: z.string().url(),
  publishedAt: z.string(),
  chamber: ParliamentChamberSchema.optional(),
  versionLabel: z.string().optional(),
})
export type ParliamentBillDocument = z.infer<typeof ParliamentBillDocumentSchema>

export const ParliamentBillPassageStageSchema = z.object({
  stageId: z.string(),
  label: z.string(),
  status: BillStageStatusSchema,
  completedAt: z.string().optional(),
})
export type ParliamentBillPassageStage = z.infer<
  typeof ParliamentBillPassageStageSchema
>

export const ParliamentBillPassageSchema = z.object({
  camera: z.array(ParliamentBillPassageStageSchema),
  senat: z.array(ParliamentBillPassageStageSchema),
  final: z.array(ParliamentBillPassageStageSchema),
})
export type ParliamentBillPassage = z.infer<typeof ParliamentBillPassageSchema>

export const ParliamentBillInitiatorSchema = z.object({
  type: z.enum(['guvern', 'parlamentar', 'cetateni']),
  departmentName: z.string().optional(),
  memberId: z.string().optional(),
  memberName: z.string().optional(),
})
export type ParliamentBillInitiator = z.infer<typeof ParliamentBillInitiatorSchema>

export const ParliamentBillRelatedVoteSchema = z.object({
  voteId: z.string(),
  chamber: ParliamentChamberSchema,
  title: z.string(),
  heldAt: z.string(),
})
export type ParliamentBillRelatedVote = z.infer<
  typeof ParliamentBillRelatedVoteSchema
>

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
})
export type ParliamentBillTimelineStep = z.infer<
  typeof ParliamentBillTimelineStepSchema
>

/** The bill's becomes-law milestone (resolved legal act), when present. */
export const ParliamentBillLawMilestoneSchema = z.object({
  lawNumber: z.string(),
  lawYear: z.number().int().optional(),
  actId: z.string().optional(),
  actTitle: z.string().optional(),
})
export type ParliamentBillLawMilestone = z.infer<
  typeof ParliamentBillLawMilestoneSchema
>

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
})
export type ParliamentBillDetail = z.infer<typeof ParliamentBillDetailSchema>

export const ParliamentTabSchema = z.enum([
  'prezentare',
  'membri',
  'voturi',
  'grupuri',
  'proiecte',
])
export type ParliamentTabId = z.infer<typeof ParliamentTabSchema>

/** Unified search params for /parlament — tab drives the active section */
export const ParliamentSearchSchema = z.object({
  tab: ParliamentTabSchema.optional().catch(undefined),
  chamber: z.enum(['camera', 'senat', 'all']).optional().catch(undefined),
  judet: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
  grup: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
  q: z.string().optional().catch(undefined),
  find: z.union([z.literal('1'), z.literal(1)]).optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  outcome: VoteOutcomeSchema.optional().catch(undefined),
  billType: BillTypeSchema.optional().catch(undefined),
  billLocation: BillCurrentLocationSchema.optional().catch(undefined),
  sortBy: BillSortBySchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  pageSize: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
})
export type ParliamentSearch = z.infer<typeof ParliamentSearchSchema>

export const ParliamentHubSearchSchema = ParliamentSearchSchema
export type ParliamentHubSearch = ParliamentSearch

export const ParliamentGroupsSearchSchema = ParliamentSearchSchema
export type ParliamentGroupsSearch = ParliamentSearch

export const ParliamentMembersSearchSchema = ParliamentSearchSchema
export type ParliamentMembersSearch = ParliamentSearch

export const ParliamentVotesSearchSchema = ParliamentSearchSchema
export type ParliamentVotesSearch = ParliamentSearch

export const ParliamentBillsSearchSchema = ParliamentSearchSchema
export type ParliamentBillsSearch = ParliamentSearch

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
  // Strict YYYY-MM-DD: a junk date (`?from=abc`) must fall to undefined here,
  // not reach the chip/date formatters (RangeError: Invalid time value).
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  choice: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
  outcome: z.enum(['adoptat', 'respins']).optional().catch(undefined),
  session: z.enum(['proprie', 'comun']).optional().catch(undefined),
  an: z.coerce.number().int().optional().catch(undefined),
})
export type MemberVotesSearch = z.infer<typeof MemberVotesSearchSchema>
