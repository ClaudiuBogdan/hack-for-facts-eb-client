/**
 * GraphQL query documents + raw-response Zod schemas for the redesign
 * parliament surface. The raw shapes here mirror the server SDL
 * (Parliament* types); the mappers in `parliament-mappers.ts` translate them
 * into the UI's `Parliament*` schema types.
 *
 * Server typedefs (read-only reference):
 *   hack-for-facts-eb-server/src/modules/parliament/shell/graphql/typedefs.ts
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared raw fragments
// ---------------------------------------------------------------------------

const rawTallySchema = z.object({
  pentru: z.number().nullable(),
  impotriva: z.number().nullable(),
  abtinere: z.number().nullable(),
  nuAVotat: z.number().nullable(),
  present: z.number().nullable(),
})
export type RawParliamentTally = z.infer<typeof rawTallySchema>

const rawGroupBreakdownSchema = z.object({
  groupName: z.string().nullable(),
  pentru: z.number(),
  impotriva: z.number(),
  abtinere: z.number(),
  nuAVotat: z.number(),
})

const rawVoteCoreSchema = z.object({
  voteKey: z.string(),
  chamber: z.string(),
  voteDate: z.string().nullable(),
  title: z.string().nullable(),
  outcome: z.string().nullable(),
  divisionNumber: z.number().nullable(),
  billKey: z.string().nullable(),
})

// ---------------------------------------------------------------------------
// Groups — parliamentGroups(legislature, chamber)
// ---------------------------------------------------------------------------

export const PARLIAMENT_GROUPS_QUERY = /* GraphQL */ `
  query ParliamentGroups($legislature: String, $chamber: String, $current: Boolean) {
    parliamentGroups(legislature: $legislature, chamber: $chamber, current: $current) {
      groupId
      chamber
      name
      memberCount
    }
  }
`

const rawGroupSchema = z.object({
  groupId: z.string(),
  chamber: z.string(),
  name: z.string(),
  memberCount: z.number().nullable(),
})
export type RawParliamentGroup = z.infer<typeof rawGroupSchema>

export const parliamentGroupsResponseSchema = z.object({
  parliamentGroups: z.array(rawGroupSchema),
})

// ---------------------------------------------------------------------------
// Members list — parliamentMembers(filter, page, pageSize)
// ---------------------------------------------------------------------------

export const PARLIAMENT_MEMBERS_QUERY = /* GraphQL */ `
  query ParliamentMembers($filter: ParliamentMembersFilter, $page: Int, $pageSize: Int) {
    parliamentMembers(filter: $filter, page: $page, pageSize: $pageSize) {
      total
      totalEstimated
      members {
        mandateKey
        chamber
        legislature
        fullName
        groupName
        constituencyName
        birthDate
      }
    }
  }
`

const rawMemberSchema = z.object({
  mandateKey: z.string(),
  chamber: z.string().nullable(),
  legislature: z.string().nullable(),
  fullName: z.string().nullable(),
  groupName: z.string().nullable(),
  constituencyName: z.string().nullable(),
  birthDate: z.string().nullable(),
  // profileUrl is only requested by the single-member query (contact tab); the
  // list query omits it, so it defaults to null/undefined there.
  profileUrl: z.string().nullable().optional(),
  // SC-1 current-seat fields (optional — requested only where the UI needs the
  // active/superseded distinction; absent → undefined elsewhere).
  isCurrent: z.boolean().optional(),
  mandateEndDate: z.string().nullable().optional(),
  mandateEndReason: z.string().nullable().optional(),
})
export type RawParliamentMember = z.infer<typeof rawMemberSchema>

export const parliamentMembersResponseSchema = z.object({
  parliamentMembers: z.object({
    total: z.number(),
    totalEstimated: z.boolean(),
    members: z.array(rawMemberSchema),
  }),
})

// ---------------------------------------------------------------------------
// Single member — parliamentMember(mandateKey)
// ---------------------------------------------------------------------------

export const PARLIAMENT_MEMBER_QUERY = /* GraphQL */ `
  query ParliamentMember($mandateKey: ID!) {
    parliamentMember(mandateKey: $mandateKey) {
      mandateKey
      chamber
      legislature
      fullName
      groupName
      constituencyName
      birthDate
      profileUrl
      activityCounts { votes controlItems speeches initiatives declarations }
    }
  }
`

const rawMemberDetailSchema = rawMemberSchema.extend({
  activityCounts: z
    .object({
      votes: z.number(),
      controlItems: z.number(),
      speeches: z.number(),
      initiatives: z.number(),
      declarations: z.number(),
    })
    .nullable(),
})
export type RawParliamentMemberDetail = z.infer<typeof rawMemberDetailSchema>

export const parliamentMemberResponseSchema = z.object({
  parliamentMember: rawMemberDetailSchema.nullable(),
})

// ---------------------------------------------------------------------------
// Group members — parliamentGroupMembers(groupId, legislature)
// ---------------------------------------------------------------------------

export const PARLIAMENT_GROUP_MEMBERS_QUERY = /* GraphQL */ `
  query ParliamentGroupMembers($groupId: ID!, $legislature: String, $current: Boolean) {
    parliamentGroupMembers(groupId: $groupId, legislature: $legislature, current: $current) {
      mandateKey
      chamber
      legislature
      fullName
      groupName
      constituencyName
      birthDate
    }
  }
`

export const parliamentGroupMembersResponseSchema = z.object({
  parliamentGroupMembers: z.array(rawMemberSchema),
})

// ---------------------------------------------------------------------------
// Votes (cursor) — parliamentVotes(filter, sort, first, after)
// ---------------------------------------------------------------------------

export const PARLIAMENT_VOTES_QUERY = /* GraphQL */ `
  query ParliamentVotes(
    $filter: ParliamentVotesFilter
    $sort: ParliamentVoteSort
    $first: Int
    $after: String
  ) {
    parliamentVotes(filter: $filter, sort: $sort, first: $first, after: $after) {
      edges {
        cursor
        node {
          voteKey
          chamber
          voteDate
          title
          outcome
          divisionNumber
          billKey
          tally { pentru impotriva abtinere nuAVotat present }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

const rawVoteListNodeSchema = rawVoteCoreSchema.extend({
  tally: rawTallySchema,
})

export const parliamentVotesResponseSchema = z.object({
  parliamentVotes: z.object({
    edges: z.array(
      z.object({ cursor: z.string(), node: rawVoteListNodeSchema }),
    ),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
  }),
})
export type RawParliamentVoteListNode = z.infer<typeof rawVoteListNodeSchema>

// ---------------------------------------------------------------------------
// Single vote (+ ballots) — parliamentVote(voteKey)
// ---------------------------------------------------------------------------

export const PARLIAMENT_VOTE_QUERY = /* GraphQL */ `
  query ParliamentVote($voteKey: ID!, $ballotsFirst: Int, $after: String) {
    parliamentVote(voteKey: $voteKey) {
      voteKey
      chamber
      voteDate
      title
      outcome
      divisionNumber
      billKey
      tally { pentru impotriva abtinere nuAVotat present }
      groupBreakdown { groupName pentru impotriva abtinere nuAVotat }
      ballots(first: $ballotsFirst, after: $after) {
        edges {
          node { rowIndex memberName groupName choice mandateKey matchMethod constituencyName }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`

const rawBallotSchema = z.object({
  rowIndex: z.number(),
  memberName: z.string().nullable(),
  groupName: z.string().nullable(),
  choice: z.string().nullable(),
  mandateKey: z.string().nullable(),
  matchMethod: z.string().nullable(),
  // Constituency (județ) of the resolved member, JOINed server-side; null when
  // the ballot is unresolved or the member has no recorded constituency.
  constituencyName: z.string().nullable(),
})
export type RawParliamentBallot = z.infer<typeof rawBallotSchema>

const rawVoteDetailSchema = rawVoteCoreSchema.extend({
  tally: rawTallySchema,
  groupBreakdown: z.array(rawGroupBreakdownSchema),
  ballots: z.object({
    edges: z.array(z.object({ node: rawBallotSchema })),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
  }),
})
export type RawParliamentVoteDetail = z.infer<typeof rawVoteDetailSchema>

export const parliamentVoteResponseSchema = z.object({
  parliamentVote: rawVoteDetailSchema.nullable(),
})

/**
 * Ballots-only follow-up page. The server caps the ballots connection at 200
 * per page, so votes with >200 ballots need cursor pagination to assemble the
 * full member-level list; this query fetches subsequent pages.
 */
export const PARLIAMENT_VOTE_BALLOTS_QUERY = /* GraphQL */ `
  query ParliamentVoteBallots($voteKey: ID!, $first: Int, $after: String) {
    parliamentVote(voteKey: $voteKey) {
      ballots(first: $first, after: $after) {
        edges {
          node { rowIndex memberName groupName choice mandateKey matchMethod constituencyName }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`

export const parliamentVoteBallotsResponseSchema = z.object({
  parliamentVote: z
    .object({
      ballots: z.object({
        edges: z.array(z.object({ node: rawBallotSchema })),
        pageInfo: z.object({
          hasNextPage: z.boolean(),
          endCursor: z.string().nullable(),
        }),
      }),
    })
    .nullable(),
})

// ---------------------------------------------------------------------------
// Member voting history — parliamentMember(mandateKey).votes(first)
// ---------------------------------------------------------------------------

export const PARLIAMENT_MEMBER_VOTES_QUERY = /* GraphQL */ `
  query ParliamentMemberVotes($mandateKey: ID!, $first: Int, $after: String) {
    parliamentMember(mandateKey: $mandateKey) {
      mandateKey
      votes(first: $first, after: $after) {
        total
        edges {
          node {
            voteKey
            chamber
            voteDate
            title
            outcome
            choice
            billKey
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`

const rawMemberVoteSchema = z.object({
  voteKey: z.string(),
  chamber: z.string(),
  voteDate: z.string().nullable(),
  title: z.string().nullable(),
  outcome: z.string().nullable(),
  choice: z.string().nullable(),
  billKey: z.string().nullable(),
})
export type RawParliamentMemberVote = z.infer<typeof rawMemberVoteSchema>

export const parliamentMemberVotesResponseSchema = z.object({
  parliamentMember: z
    .object({
      mandateKey: z.string(),
      votes: z.object({
        total: z.number(),
        edges: z.array(z.object({ node: rawMemberVoteSchema })),
        pageInfo: z.object({
          hasNextPage: z.boolean(),
          endCursor: z.string().nullable(),
        }),
      }),
    })
    .nullable(),
})

// ---------------------------------------------------------------------------
// Member profile activity — speeches / control items / initiatives / declarations
// ---------------------------------------------------------------------------

export const PARLIAMENT_MEMBER_PROFILE_QUERY = /* GraphQL */ `
  query ParliamentMemberProfile($mandateKey: ID!) {
    parliamentMember(mandateKey: $mandateKey) {
      mandateKey
      fullName
      constituencyName
      legislature
      speeches(page: 1, pageSize: 10) {
        total
        speeches { speechKey spokenAt title summary chamber }
      }
      controlItems(page: 1, pageSize: 10) {
        total
        items { itemKey controlType title recipient itemDate responseStatus }
      }
      initiatives(page: 1, pageSize: 10) {
        total
        initiatives { initiativeKey billKey title status registrationDate promulgatedLawNumber promulgatedLawYear }
      }
      declarations { declarationType declarationDate label fileUrl }
    }
  }
`

const rawSpeechSchema = z.object({
  speechKey: z.string(),
  spokenAt: z.string().nullable(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  chamber: z.string().nullable(),
})
const rawControlItemSchema = z.object({
  itemKey: z.string(),
  controlType: z.string().nullable(),
  title: z.string().nullable(),
  recipient: z.string().nullable(),
  itemDate: z.string().nullable(),
  responseStatus: z.string().nullable(),
})
const rawInitiativeSchema = z.object({
  initiativeKey: z.string(),
  billKey: z.string().nullable(),
  title: z.string().nullable(),
  status: z.string().nullable(),
  // Registration date; the server returns initiatives registration-date DESC.
  registrationDate: z.string().nullable(),
  promulgatedLawNumber: z.string().nullable(),
  promulgatedLawYear: z.number().nullable(),
})
const rawDeclarationSchema = z.object({
  declarationType: z.string(),
  declarationDate: z.string().nullable(),
  label: z.string().nullable(),
  fileUrl: z.string(),
})
export type RawParliamentSpeech = z.infer<typeof rawSpeechSchema>
export type RawParliamentControlItem = z.infer<typeof rawControlItemSchema>
export type RawParliamentInitiative = z.infer<typeof rawInitiativeSchema>
export type RawParliamentDeclaration = z.infer<typeof rawDeclarationSchema>

export const parliamentMemberProfileResponseSchema = z.object({
  parliamentMember: z
    .object({
      mandateKey: z.string(),
      fullName: z.string().nullable(),
      constituencyName: z.string().nullable(),
      legislature: z.string().nullable(),
      speeches: z.object({ total: z.number(), speeches: z.array(rawSpeechSchema) }),
      controlItems: z.object({ total: z.number(), items: z.array(rawControlItemSchema) }),
      initiatives: z.object({
        total: z.number(),
        initiatives: z.array(rawInitiativeSchema),
      }),
      declarations: z.array(rawDeclarationSchema),
    })
    .nullable(),
})

// ---------------------------------------------------------------------------
// Member initiatives (paginated) — parliamentMember(mandateKey).initiatives(page, pageSize)
// Server orders these registration-date DESC (latest-first); do NOT client-sort.
// ---------------------------------------------------------------------------

export const PARLIAMENT_MEMBER_INITIATIVES_QUERY = /* GraphQL */ `
  query ParliamentMemberInitiatives($mandateKey: ID!, $page: Int, $pageSize: Int) {
    parliamentMember(mandateKey: $mandateKey) {
      mandateKey
      initiatives(page: $page, pageSize: $pageSize) {
        total
        initiatives {
          initiativeKey
          billKey
          title
          status
          registrationDate
          promulgatedLawNumber
          promulgatedLawYear
        }
      }
    }
  }
`

export const parliamentMemberInitiativesResponseSchema = z.object({
  parliamentMember: z
    .object({
      mandateKey: z.string(),
      initiatives: z.object({
        total: z.number(),
        initiatives: z.array(rawInitiativeSchema),
      }),
    })
    .nullable(),
})

// ---------------------------------------------------------------------------
// Bills list — parliamentBills(filter, sort, page, pageSize)
// ---------------------------------------------------------------------------

export const PARLIAMENT_BILLS_QUERY = /* GraphQL */ `
  query ParliamentBills(
    $filter: ParliamentBillsFilter
    $sort: ParliamentBillSort
    $page: Int
    $pageSize: Int
  ) {
    parliamentBills(filter: $filter, sort: $sort, page: $page, pageSize: $pageSize) {
      total
      totalEstimated
      bills {
        billKey
        plxNumber
        plxYear
        senateNumber
        senateYear
        title
        finalLawNumber
        finalLawYear
        statusText
        billType
        lastEventDate
      }
    }
  }
`

const rawBillSummarySchema = z.object({
  billKey: z.string(),
  plxNumber: z.string().nullable(),
  plxYear: z.number().nullable(),
  senateNumber: z.string().nullable(),
  senateYear: z.number().nullable(),
  title: z.string().nullable(),
  finalLawNumber: z.string().nullable(),
  finalLawYear: z.number().nullable(),
  // Source-stored classification (Gap 2): the real status string + initiative
  // type, surfaced flat by the server. null when the source carries neither.
  statusText: z.string().nullable(),
  billType: z.string().nullable(),
  // Date of the bill's most recent procedural event; drives the card's
  // "Actualizat" line + the server's default last_event_date-desc sort.
  lastEventDate: z.string().nullable(),
})
export type RawParliamentBillSummary = z.infer<typeof rawBillSummarySchema>

export const parliamentBillsResponseSchema = z.object({
  parliamentBills: z.object({
    total: z.number(),
    totalEstimated: z.boolean(),
    bills: z.array(rawBillSummarySchema),
  }),
})

// ---------------------------------------------------------------------------
// Single bill (events / documents / initiators / related votes / act links)
// ---------------------------------------------------------------------------

export const PARLIAMENT_BILL_QUERY = /* GraphQL */ `
  query ParliamentBill($billKey: ID!) {
    parliamentBill(billKey: $billKey) {
      billKey
      plxNumber
      plxYear
      senateNumber
      senateYear
      title
      finalLawNumber
      finalLawYear
      statusText
      billType
      lastEventDate
      events { position eventDate eventDateText description chamberCode committee voteIdv docs }
      documents { url label kind position }
      initiators { mandateKey fullName groupName }
      relatedVotes {
        voteKey
        chamber
        voteDate
        title
        outcome
        divisionNumber
        tally { pentru impotriva abtinere nuAVotat present }
      }
      actLinks {
        relationshipKind
        resolutionStatus
        confidenceLabel
        legalAct { actId title actType }
      }
    }
  }
`

const rawBillEventSchema = z.object({
  position: z.number(),
  eventDate: z.string().nullable(),
  eventDateText: z.string().nullable(),
  description: z.string().nullable(),
  chamberCode: z.string().nullable(),
  // Referral committee(s), extracted from the description (M5); an event can
  // reference more than one (report + opinion). null when none.
  committee: z.array(z.string()).nullable(),
  // voteIdv → a cdep vote (cdep:${voteIdv}); docs is a JSON blob of per-event
  // document links (often empty — bills carry bill-level documents instead).
  voteIdv: z.string().nullable(),
  docs: z.unknown().nullable(),
})
const rawBillDocumentSchema = z.object({
  url: z.string(),
  label: z.string().nullable(),
  kind: z.string().nullable(),
  position: z.number().nullable(),
})
const rawBillInitiatorSchema = z.object({
  mandateKey: z.string(),
  fullName: z.string().nullable(),
  groupName: z.string().nullable(),
})
const rawBillRelatedVoteSchema = z.object({
  voteKey: z.string(),
  chamber: z.string(),
  voteDate: z.string().nullable(),
  title: z.string().nullable(),
  outcome: z.string().nullable(),
  divisionNumber: z.number().nullable(),
  tally: rawTallySchema,
})
const rawBillActLinkSchema = z.object({
  relationshipKind: z.string(),
  resolutionStatus: z.string(),
  confidenceLabel: z.string(),
  legalAct: z
    .object({
      actId: z.string(),
      title: z.string().nullable(),
      actType: z.string().nullable(),
    })
    .nullable(),
})
export type RawParliamentBillEvent = z.infer<typeof rawBillEventSchema>
export type RawParliamentBillDocument = z.infer<typeof rawBillDocumentSchema>
export type RawParliamentBillRelatedVote = z.infer<typeof rawBillRelatedVoteSchema>

const rawBillDetailSchema = rawBillSummarySchema.extend({
  events: z.array(rawBillEventSchema),
  documents: z.array(rawBillDocumentSchema),
  initiators: z.array(rawBillInitiatorSchema),
  relatedVotes: z.array(rawBillRelatedVoteSchema),
  actLinks: z.array(rawBillActLinkSchema),
})
export type RawParliamentBillDetail = z.infer<typeof rawBillDetailSchema>

export const parliamentBillResponseSchema = z.object({
  parliamentBill: rawBillDetailSchema.nullable(),
})

// ---------------------------------------------------------------------------
// Filter resolution — parliamentResolveFilter(dim, q, legislature)
// ---------------------------------------------------------------------------

export const PARLIAMENT_RESOLVE_QUERY = /* GraphQL */ `
  query ParliamentResolve($dim: ParliamentFilterDim!, $q: String!, $legislature: String) {
    parliamentResolveFilter(dim: $dim, q: $q, legislature: $legislature) {
      dim
      value
      label
      kind
      score
    }
  }
`

const rawResolveHitSchema = z.object({
  dim: z.string(),
  value: z.string(),
  label: z.string(),
  kind: z.string(),
  score: z.number().nullable(),
})
export type RawParliamentResolveHit = z.infer<typeof rawResolveHitSchema>

export const parliamentResolveResponseSchema = z.object({
  parliamentResolveFilter: z.array(rawResolveHitSchema),
})
