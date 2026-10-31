import { describe, expect, it } from 'vitest'
import {
  ELECTIONS_MAX_PAGE,
  electionContestSchema,
  electionEventPageSchema,
  electionResultSchema,
  isElectionOffice,
  isElectionRecordKey,
  parseElectionContestsSearch,
  parseElectionsCatalogSearch,
} from './elections-catalog'

/** As the API serves them on 2026-10-28 (dev), names of places and parties only. */
const EVENT = {
  eventKey: 'ro:presidential:2025',
  family: 'presidential',
  year: 2025,
  publication: { activatedAt: '2026-10-21T18:54:03.325Z' },
  occurrences: [
    {
      occurrenceKey: 'ro:presidential:2025:2025-05-04',
      eventKey: 'ro:presidential:2025',
      ballotDate: '2025-05-04',
      round: 'r1',
      kind: 'general',
      status: 'held',
      offices: [{ office: 'president', contests: 1 }],
    },
  ],
}

const INDEPENDENT = { kind: 'independent', label: 'A PERSON’S BALLOT NAME' }
const PARTY = { kind: 'party', label: 'ALIANȚA PENTRU UNIREA ROMÂNILOR' }

const CONTEST = {
  contestKey: 'ro:presidential:2025:2025-05-18:president:national',
  occurrenceKey: 'ro:presidential:2025:2025-05-18',
  eventKey: 'ro:presidential:2025',
  office: 'president',
  jurisdiction: { placeKey: 'national', placeType: 'national', sirutaCode: null, countyCode: null, name: null, countyName: null },
  status: 'held',
  replacedBy: null,
  race: {
    competitorCount: 2,
    status: 'VERIFIED',
    geographicCompleteness: 'complete',
    finality: 'final',
    issues: [],
    tied: false,
    marginVotes: '829589',
    marginPoints: '7.21',
    leader: { votes: '6168642', share: { percent: '53.60' }, competitor: INDEPENDENT },
    runnerUp: { votes: '5339053', share: { percent: '46.40' }, competitor: PARTY },
  },
}

const quality = { finality: 'final', geographicCompleteness: 'complete', includesDiaspora: true, status: 'VERIFIED', issues: [] }

describe('the elections schema', () => {
  it('parses an event page with its ballot days', () => {
    const page = electionEventPageSchema.parse({ items: [EVENT], page: 1, pageSize: 20, total: 1, hasMore: false })
    expect(page.items[0]?.occurrences[0]?.ballotDate).toBe('2025-05-04')
  })

  it('keeps every competitor’s label as the API serves it, an independent’s ballot name included', () => {
    const contest = electionContestSchema.parse(CONTEST)
    expect(contest.race?.leader.competitor).toEqual(INDEPENDENT)
    expect(contest.race?.runnerUp?.competitor).toEqual(PARTY)
  })

  it('keeps the competitors’ labels in a result’s tallies', () => {
    const result = electionResultSchema.parse({
      tallies: [
        { ...quality, measure: 'votes', allocationPhase: 'none', countedPopulation: 'all', value: '6168642', share: { percent: '53.60' }, competitor: INDEPENDENT },
        { ...quality, measure: 'votes', allocationPhase: 'none', countedPopulation: 'all', value: '5339053', share: { percent: '46.40' }, competitor: PARTY },
      ],
      turnout: [{ ...quality, measure: 'voted', value: '11641999', issues: ['POSTAL_VOTED_ENVELOPES'] }],
      participation: null,
      race: { tied: false, marginVotes: '829589', marginPoints: '7.21', issues: [] },
      coverage: [{ measure: 'mandates', allocationPhase: 'final', placeSpecific: false, state: 'absent', issues: ['NOT_IN_SOURCE'] }],
    })
    expect(result.tallies.map((tally) => tally.competitor)).toEqual([INDEPENDENT, PARTY])
  })

  it('refuses a count that is not a decimal string, rather than reading it as a number', () => {
    expect(() => electionContestSchema.parse({ ...CONTEST, race: { ...CONTEST.race, marginVotes: 829589 } })).toThrow()
    expect(() => electionContestSchema.parse({ ...CONTEST, race: { ...CONTEST.race, marginVotes: '-1' } })).toThrow()
  })

  it('refuses a value outside the API’s vocabularies', () => {
    expect(() => electionContestSchema.parse({ ...CONTEST, status: 'cancelled' })).toThrow()
    expect(() => electionEventPageSchema.parse({ items: [{ ...EVENT, family: 'presidentiale' }], page: 1, pageSize: 20, total: 1, hasMore: false })).toThrow()
  })
})

describe('the keys and offices', () => {
  it('takes any bounded key without control characters', () => {
    expect(isElectionRecordKey('ro:local:2024:2024-06-09:mayor:uat:116046')).toBe(true)
    expect(isElectionRecordKey('')).toBe(false)
    expect(isElectionRecordKey('a\nb')).toBe(false)
    expect(isElectionRecordKey('x'.repeat(513))).toBe(false)
  })

  it('takes an office only in the API’s grammar', () => {
    expect(isElectionOffice('county_council_president')).toBe(true)
    expect(isElectionOffice('chamber:diaspora')).toBe(true)
    expect(isElectionOffice('Mayor')).toBe(false)
    expect(isElectionOffice('mayor;drop')).toBe(false)
  })
})

describe('the addresses', () => {
  it('/alegeri keeps only a valid page', () => {
    expect(parseElectionsCatalogSearch(undefined)).toEqual({})
    expect(parseElectionsCatalogSearch({ pagina: 2, an: 2024, tip: 'local' })).toEqual({ pagina: 2 })
    expect(parseElectionsCatalogSearch({ pagina: 0 })).toEqual({})
    expect(parseElectionsCatalogSearch({ pagina: ELECTIONS_MAX_PAGE + 1 })).toEqual({})
  })

  it('an event keeps a ballot date, an office, a place type, a county and a page the API accepts, each on its own', () => {
    expect(parseElectionContestsSearch({ data: '2024-06-23', functie: 'mayor', arie: 'uat', judet: 'CJ', pagina: 3 })).toEqual({
      data: '2024-06-23',
      functie: 'mayor',
      arie: 'uat',
      judet: 'CJ',
      pagina: 3,
    })
    expect(parseElectionContestsSearch({ data: '23.06.2024', functie: 'Primar', arie: 'siruta', judet: 'cj', tur: 'tur1' })).toEqual({})
    expect(parseElectionContestsSearch({ data: '2024-06-23', judet: 'Cluj' })).toEqual({ data: '2024-06-23' })
  })
})
