import { beforeEach, describe, expect, it } from 'vitest'
import {
  ParliamentBillDetailSchema,
  ParliamentGroupSchema,
  ParliamentMemberSchema,
  ParliamentVoteDetailSchema,
} from '@/schemas/parliament'
import {
  mapBillDetail,
  mapBillSummary,
  mapGroup,
  mapMember,
  mapMemberInitiatives,
  mapMemberProfile,
  mapMemberVotingHistory,
  mapVoteDetail,
  mapVoteListItem,
} from './parliament-mappers'
import type {
  RawParliamentBillDetail,
  RawParliamentBillSummary,
  RawParliamentGroup,
  RawParliamentMember,
  RawParliamentVoteDetail,
  RawParliamentVoteListNode,
} from './parliament-queries'
import {
  __resetVoteSummaryCache,
  getMemberJudetCache,
  lookupDivisionNumber,
  lookupVoteSummary,
} from './vote-summary-cache'

beforeEach(() => __resetVoteSummaryCache())

const udmrSenat: RawParliamentGroup = {
  groupId: 'udmr-senat',
  chamber: 'senat',
  name: 'UDMR',
  memberCount: 10,
}

const abrudean: RawParliamentMember = {
  mandateKey: '1:2024:1',
  chamber: 'senat',
  legislature: '2024',
  fullName: 'Abrudean Mircea',
  groupName: 'PNL',
  constituencyName: 'CLUJ',
  birthDate: '1984-07-23',
}

describe('mapGroup', () => {
  it('maps a UDMR Senate group with derived colour (golden: 10 members)', () => {
    const group = mapGroup(udmrSenat)
    expect(() => ParliamentGroupSchema.parse(group)).not.toThrow()
    expect(group).toMatchObject({
      groupId: 'udmr-senat',
      name: 'UDMR',
      chamber: 'senat',
      memberCount: 10,
      color: '#00843D', // UDMR brand green (user-authoritative, from the resolver)
    })
  })
})

describe('mapMember', () => {
  it('splits the name, folds the county, and derives groupId', () => {
    const member = mapMember(abrudean)
    expect(() => ParliamentMemberSchema.parse(member)).not.toThrow()
    expect(member).toMatchObject({
      memberId: '1:2024:1',
      lastName: 'Abrudean',
      firstName: 'Mircea',
      chamber: 'senat',
      groupId: 'pnl-senat',
      groupName: 'PNL',
      judetSlug: 'cluj',
      judetName: 'CLUJ',
    })
  })

  it('surfaces the server profileUrl as contact.website (Gap 4)', () => {
    const member = mapMember({
      ...abrudean,
      profileUrl: 'https://www.cdep.ro/ords/pls/parlam/structura2015.mp?idm=1&cam=1&leg=2024',
    })
    expect(member.contact?.website).toBe(
      'https://www.cdep.ro/ords/pls/parlam/structura2015.mp?idm=1&cam=1&leg=2024',
    )
  })

  it('omits contact when profileUrl is absent or not an http(s) URL', () => {
    expect(mapMember(abrudean).contact).toBeUndefined()
    expect(mapMember({ ...abrudean, profileUrl: 'not-a-url' }).contact).toBeUndefined()
  })
})

// ── golden anchor: Legea 423/2023 ↔ vote cdep:29892, 275/277 ────────────────

const goldenVoteDetail: RawParliamentVoteDetail = {
  voteKey: 'cdep:29892',
  chamber: 'camera_deputatilor',
  voteDate: '2022-05-04',
  title:
    'Proiect de Lege pentru aprobarea Ordonanţei de urgenţă a Guvernului nr.21/2012',
  outcome: 'adoptat',
  divisionNumber: 3629,
  billKey: '12760',
  tally: { pentru: 275, impotriva: 0, abtinere: 1, nuAVotat: 1, present: 277 },
  groupBreakdown: [
    { groupName: 'PNL', pentru: 100, impotriva: 0, abtinere: 0, nuAVotat: 0 },
    { groupName: 'UDMR', pentru: 20, impotriva: 0, abtinere: 1, nuAVotat: 0 },
  ],
  ballots: {
    edges: [
      {
        node: {
          rowIndex: 0,
          memberName: 'Gabriel Andronache',
          groupName: 'PNL',
          choice: 'pentru',
          mandateKey: '2:2020:12',
          matchMethod: 'exact_token_set',
          constituencyName: 'BRAŞOV',
        },
      },
    ],
    pageInfo: { hasNextPage: true, endCursor: 'x' },
  },
}

describe('mapVoteDetail (golden anchor)', () => {
  it('maps tally 275/277 and the ballot/breakdown shape', () => {
    const detail = mapVoteDetail(goldenVoteDetail)
    expect(() => ParliamentVoteDetailSchema.parse(detail)).not.toThrow()
    expect(detail.voteId).toBe('cdep:29892')
    expect(detail.chamber).toBe('camera')
    expect(detail.outcome).toBe('adoptat')
    expect(detail.tally).toEqual({ pentru: 275, impotriva: 0, abtinere: 1, nuAVotat: 1 })
    expect(detail.groupBreakdown[0]).toMatchObject({ groupId: 'pnl-camera_deputatilor', pentru: 100 })
    expect(detail.memberVotes[0]).toMatchObject({
      memberId: '2:2020:12',
      memberName: 'Gabriel Andronache',
      choice: 'pentru',
    })
  })

  it('primes the vote-summary cache so sync getters resolve', () => {
    mapVoteDetail(goldenVoteDetail)
    expect(lookupVoteSummary('camera', 'cdep:29892')?.tally.pentru).toBe(275)
    expect(lookupDivisionNumber('cdep:29892')).toBe(3629)
  })

  it('primes the member→județ cache from ballot constituencyName (vote-detail județ column)', () => {
    mapVoteDetail(goldenVoteDetail)
    expect(getMemberJudetCache()['2:2020:12']).toBe('BRAŞOV')
  })

  // D2: the live module pages the ballots connection (server caps at 200/page)
  // and hands mapVoteDetail the FULL assembled edge set — verify the mapper
  // emits one memberVote per ballot (no truncation in the mapping itself).
  it('maps every assembled ballot to a memberVote (>200, no truncation)', () => {
    const edges = Array.from({ length: 277 }, (_, i) => ({
      node: {
        rowIndex: i,
        memberName: `Member ${i}`,
        groupName: 'PNL',
        choice: 'pentru' as const,
        mandateKey: `2:2024:${i}`,
        matchMethod: 'exact_token_set',
        constituencyName: 'CLUJ',
      },
    }))
    const detail = mapVoteDetail({ ...goldenVoteDetail, ballots: { edges, pageInfo: { hasNextPage: false, endCursor: null } } })
    expect(detail.memberVotes).toHaveLength(277)
    expect(detail.memberVotes[276]).toMatchObject({ memberId: '2:2024:276' })
  })
})

describe('mapVoteListItem', () => {
  it('adds a positive divisionNumber and falls back to 1', () => {
    const node: RawParliamentVoteListNode = {
      voteKey: 'cdep:1',
      chamber: 'camera_deputatilor',
      voteDate: '2026-06-10',
      title: 'X',
      outcome: 'respins',
      divisionNumber: null,
      billKey: null,
      tally: { pentru: 1, impotriva: 2, abtinere: 0, nuAVotat: 0, present: 3 },
    }
    expect(mapVoteListItem(node).divisionNumber).toBe(1)
    expect(mapVoteListItem({ ...node, divisionNumber: 7 }).divisionNumber).toBe(7)
  })
})

// ── golden bill: 12760 → Legea 423/2023 → vote cdep:29892 ──────────────────

const goldenBill: RawParliamentBillDetail = {
  billKey: '12760',
  plxNumber: '237',
  plxYear: 2012,
  senateNumber: null,
  senateYear: null,
  title: 'Proiect de Lege pentru aprobarea OUG nr.21/2012',
  finalLawNumber: '423',
  finalLawYear: 2023,
  statusText: 'Lege 423/2023 29.12.2023',
  billType: 'Proiect de Lege pentru aprobarea O.U.G. nr. 21/2012',
  lastEventDate: '2023-12-29',
  events: [
    {
      position: 1,
      eventDate: '2012-06-12',
      eventDateText: '12.06.2012',
      description: '- Camera Deputaţilor: | 237/12.06.2012',
      chamberCode: null,
      committee: null,
      voteIdv: null,
      docs: null,
    },
    {
      position: 16,
      eventDate: '2022-05-04',
      eventDateText: '04.05.2022',
      description: 'adoptata de Camera Deputatilor',
      chamberCode: null,
      committee: null,
      voteIdv: '29892',
      docs: null,
    },
    {
      position: 31,
      eventDate: '2023-12-29',
      eventDateText: '29.12.2023',
      description: '29.12.2023 | promulgata prin Decret nr.1721/2023',
      chamberCode: null,
      committee: null,
      voteIdv: null,
      docs: null,
    },
  ],
  documents: [
    { url: 'https://www.cdep.ro/em.pdf', label: 'Expunerea de motive', kind: 'pdf', position: 1 },
  ],
  initiators: [],
  relatedVotes: [
    {
      voteKey: 'cdep:29892',
      chamber: 'camera_deputatilor',
      voteDate: '2022-05-04',
      title: 'Proiect de Lege pentru aprobarea OUG nr.21/2012',
      outcome: 'adoptat',
      divisionNumber: 3629,
      tally: { pentru: 275, impotriva: 0, abtinere: 1, nuAVotat: 1, present: 277 },
    },
  ],
  actLinks: [
    {
      relationshipKind: 'becomes_law',
      resolutionStatus: 'linked',
      confidenceLabel: 'high',
      legalAct: { actId: '145905', title: 'Legea nr. 423/2023', actType: 'lege' },
    },
  ],
}

describe('mapBillSummary lastUpdatedAt (list path = lastEventDate)', () => {
  const base: RawParliamentBillSummary = {
    billKey: 'senat:286-2026',
    plxNumber: null,
    plxYear: null,
    senateNumber: '286',
    senateYear: 2026,
    title: 'Propunere legislativă X',
    finalLawNumber: null,
    finalLawYear: null,
    statusText: null,
    billType: null,
    lastEventDate: '2026-06-15',
  }

  it('uses the server lastEventDate for lastUpdatedAt (no Jan-1 fallback)', () => {
    // The bills LIST carries no events array; lastUpdatedAt must come from
    // lastEventDate so cards show the real (descending) date, not "1 ian.".
    expect(mapBillSummary(base).lastUpdatedAt).toBe('2026-06-15T00:00:00+03:00')
  })

  it('falls back to Jan-1 only when no date is available at all', () => {
    const dateless = mapBillSummary({ ...base, lastEventDate: null })
    expect(dateless.lastUpdatedAt).toBe('2026-01-01T00:00:00+03:00')
  })
})

describe('mapBillDetail (golden anchor)', () => {
  it('derives promulgat location, summary from the law link, and real docs/votes', () => {
    const detail = mapBillDetail(goldenBill)
    expect(() => ParliamentBillDetailSchema.parse(detail)).not.toThrow()
    expect(detail.billId).toBe('12760')
    expect(detail.currentLocation).toBe('promulgat')
    expect(detail.summary).toContain('Legea nr. 423/2023')
    expect(detail.documents).toHaveLength(1)
    expect(detail.relatedVotes[0]?.voteId).toBe('cdep:29892')
  })

  it('builds a chronological timeline in position order with milestones + vote link', () => {
    const detail = mapBillDetail(goldenBill)
    // Steps render in raw position order (NOT date-sorted): 1 → 16 → 31.
    expect(detail.timeline.map((s) => s.position)).toEqual([1, 16, 31])
    // The "adoptata de Camera" step links to its vote (cdep:${voteIdv}).
    const voteStep = detail.timeline.find((s) => s.position === 16)
    expect(voteStep?.voteId).toBe('cdep:29892')
    expect(voteStep?.isMilestone).toBe(true)
    // The promulgare step is a milestone too.
    expect(detail.timeline.find((s) => s.position === 31)?.isMilestone).toBe(true)
    // becomes-law milestone resolved to the legal act.
    expect(detail.lawMilestone).toMatchObject({
      lawNumber: '423',
      lawYear: 2023,
      actId: '145905',
      actTitle: 'Legea nr. 423/2023',
    })
  })

  it('uses the server statusText for the stage label + classifies billType (Gap 2)', () => {
    const detail = mapBillDetail(goldenBill)
    expect(detail.currentStageLabel).toBe('Lege 423/2023 29.12.2023')
    // billType derived from the server tip_initiativa string → guvern (Proiect de Lege).
    expect(detail.billType).toBe('guvern')
  })

  it('primes related-vote summaries (tally 275) for the bill tabs', () => {
    mapBillDetail(goldenBill)
    expect(lookupVoteSummary('camera', 'cdep:29892')?.tally.pentru).toBe(275)
    expect(lookupDivisionNumber('cdep:29892')).toBe(3629)
  })
})

describe('mapMemberVotingHistory', () => {
  it('maps choices and outcomes', () => {
    const history = mapMemberVotingHistory(
      '1:2024:1',
      [
        {
          voteKey: 'senat:abc',
          chamber: 'senat',
          voteDate: '2026-05-20',
          title: 'X',
          outcome: 'respins',
          choice: 'impotriva',
          billKey: null,
        },
      ],
      1084,
    )
    expect(history.total).toBe(1084)
    expect(history.votes[0]).toMatchObject({ choice: 'impotriva', outcome: 'respins', chamber: 'senat' })
  })
})

describe('mapMemberProfile', () => {
  it('maps speeches → contributions and control items → questions', () => {
    const profile = mapMemberProfile({
      mandateKey: '1:2024:1',
      fullName: 'Abrudean Mircea',
      constituencyName: 'CLUJ',
      legislature: '2024',
      speeches: {
        total: 6252,
        speeches: [{ speechKey: 's1', spokenAt: '2026-05-13', title: 'T', summary: 'S' }],
      },
      controlItems: {
        total: 1,
        items: [{ itemKey: 'c1', title: 'Q', itemDate: '2026-04-22', responseStatus: 'answered' }],
      },
      initiatives: { total: 0, initiatives: [] },
      declarations: [],
    })
    expect(profile.spokenContributions[0]).toMatchObject({ contributionId: 's1', title: 'T' })
    expect(profile.writtenQuestions[0]).toMatchObject({ questionId: 'c1', status: 'raspuns' })
    expect(profile.interestDeclarations).toHaveLength(0)
  })
})

describe('mapMemberInitiatives', () => {
  it('maps a paginated page, preserves server order, and computes pagination', () => {
    const list = mapMemberInitiatives(
      '2:2024:235',
      {
        total: 116,
        initiatives: [
          {
            initiativeKey: '2:2024:235:initiative:23301',
            billKey: '23301',
            title: 'Propunere legislativă A',
            status: 'în dezbatere',
            registrationDate: '2026-05-27',
            promulgatedLawNumber: null,
            promulgatedLawYear: null,
          },
          {
            initiativeKey: '2:2024:235:initiative:23292',
            billKey: null,
            title: 'Propunere legislativă B',
            status: 'Lege 100/2025',
            registrationDate: '2026-05-26',
            promulgatedLawNumber: '100',
            promulgatedLawYear: 2025,
          },
        ],
      },
      1,
      10,
    )
    expect(list.total).toBe(116)
    expect(list.totalPages).toBe(12) // ceil(116/10)
    expect(list.page).toBe(1)
    // Server order preserved (2026-05-27 before 2026-05-26 — no client re-sort).
    expect(list.initiatives.map((i) => i.initiativeId)).toEqual([
      '2:2024:235:initiative:23301',
      '2:2024:235:initiative:23292',
    ])
    expect(list.initiatives[0]).toMatchObject({
      title: 'Propunere legislativă A',
      registeredAt: '2026-05-27T00:00:00+03:00',
      billId: '23301',
    })
    expect(list.initiatives[1]).toMatchObject({
      promulgatedLawNumber: '100',
      promulgatedLawYear: 2025,
    })
  })
})
