import { describe, expect, it } from 'vitest'
import {
  ELECTIONS_MAX_PAGE,
  electionContestSchema,
  electionEditionPageSchema,
  electionEditionSchema,
  isElectionRecordKey,
  parseElectionContestsSearch,
  parseElectionsCatalogSearch,
} from './elections-catalog'

const READINESS = { identity: 'HELD', sourceSelection: 'HELD' }

/** As the API serves an edition today: most reported fields null, the name the key itself. */
const EDITION = {
  electionKey: 'aep-european-2019',
  eventKey: 'ro:european:2019',
  reportedName: 'aep-european-2019',
  reportedYear: 2019,
  reportedFamily: 'parliamentary',
  reportedRound: null,
  reportedDate: null,
  reportedAuthority: 'BEC/AEP/ROAEP',
  readiness: READINESS,
}

const CONTEST = {
  contestKey: 'contest:bec-local-2024:mayor:source_constituency:8-19',
  electionKey: 'bec-local-2024',
  reportedOffice: 'mayor',
  chamber: null,
  reportedRound: 'tur1',
  scopeType: 'source_constituency',
  sourceScopeKey: '8:19',
  scopeLabel: 'CINCU',
  constituencyCode: null,
  constituencyName: null,
  readiness: READINESS,
}

describe('the catalog address', () => {
  it('renders the default view with no params', () => {
    expect(parseElectionsCatalogSearch(undefined)).toEqual({})
    expect(parseElectionsCatalogSearch({})).toEqual({})
    expect(parseElectionsCatalogSearch('garbage')).toEqual({})
  })

  it('takes a reported year within the API’s bounds, as a number or its digits', () => {
    expect(parseElectionsCatalogSearch({ an: 2024 })).toEqual({ an: 2024 })
    expect(parseElectionsCatalogSearch({ an: '1992' })).toEqual({ an: 1992 })
    expect(parseElectionsCatalogSearch({ an: 1800 })).toEqual({ an: 1800 })
    expect(parseElectionsCatalogSearch({ an: 2100 })).toEqual({ an: 2100 })
    for (const an of [1799, 2101, 2024.5, -2024, '24a', '', null, true]) expect(parseElectionsCatalogSearch({ an })).toEqual({})
  })

  it('keeps a family label exactly as given: no trim, no case, no list', () => {
    for (const tip of ['parliamentary', ' local ', 'Local', 'local,presidential', 'ro:local:2024', 'ș']) {
      expect(parseElectionsCatalogSearch({ tip })).toEqual({ tip })
    }
  })

  it('reads a label the router parsed as JSON back as its text', () => {
    expect(parseElectionsCatalogSearch({ tip: 1 })).toEqual({ tip: '1' })
    expect(parseElectionsCatalogSearch({ tip: true })).toEqual({ tip: 'true' })
  })

  it('drops a label the API would refuse: empty, too long, or with control characters', () => {
    for (const tip of ['', 'a'.repeat(129), 'local\n', 'lo\u0000cal', ['local'], { in: ['local'] }]) {
      expect(parseElectionsCatalogSearch({ tip })).toEqual({})
    }
    expect(parseElectionsCatalogSearch({ tip: 'a'.repeat(128) })).toEqual({ tip: 'a'.repeat(128) })
  })

  it('takes a page from 1 to the last one GraphQL can carry', () => {
    expect(parseElectionsCatalogSearch({ pagina: 3 })).toEqual({ pagina: 3 })
    expect(parseElectionsCatalogSearch({ pagina: ELECTIONS_MAX_PAGE })).toEqual({ pagina: ELECTIONS_MAX_PAGE })
    for (const pagina of [0, -1, 1.5, ELECTIONS_MAX_PAGE + 1, '2']) expect(parseElectionsCatalogSearch({ pagina })).toEqual({})
  })

  it('bounds the page by GraphQL’s signed 32-bit Int, inside the API’s safe offset', () => {
    expect(ELECTIONS_MAX_PAGE).toBe(2_147_483_647)
    expect(Number.isSafeInteger((ELECTIONS_MAX_PAGE - 1) * 20)).toBe(true)
    expect(parseElectionsCatalogSearch({ pagina: 2_147_483_647 })).toEqual({ pagina: 2_147_483_647 })
    expect(parseElectionsCatalogSearch({ pagina: 2_147_483_648 })).toEqual({})
    expect(parseElectionContestsSearch({ pagina: 2_147_483_647 })).toEqual({ pagina: 2_147_483_647 })
    expect(parseElectionContestsSearch({ pagina: 2_147_483_648 })).toEqual({})
  })

  it('keeps each valid param when another is invalid', () => {
    expect(parseElectionsCatalogSearch({ an: 9999, tip: 'local', pagina: 2 })).toEqual({ tip: 'local', pagina: 2 })
  })
})

describe('an edition’s address', () => {
  it('takes the reported office and round exactly, and only the API’s scope types', () => {
    expect(parseElectionContestsSearch({ functie: 'local_council', arie: 'source_constituency', tur: 'final', pagina: 4 })).toEqual({
      functie: 'local_council',
      arie: 'source_constituency',
      tur: 'final',
      pagina: 4,
    })
    expect(parseElectionContestsSearch({ functie: ' Mayor ', tur: 1 })).toEqual({ functie: ' Mayor ', tur: '1' })
    expect(parseElectionContestsSearch({ arie: 'locality' })).toEqual({})
    expect(parseElectionContestsSearch({ arie: 'COUNTY' })).toEqual({})
  })
})

describe('the record keys', () => {
  it('accepts any key the API can look up, punctuation included, and nothing it would refuse', () => {
    for (const key of [CONTEST.contestKey, 'bec-local-2012-archive', 'a b/c?d#e%f', 'ș'.repeat(512)]) expect(isElectionRecordKey(key)).toBe(true)
    for (const key of ['', 'a'.repeat(513), 'bad\tkey', 'bad\u007fkey']) expect(isElectionRecordKey(key)).toBe(false)
  })
})

describe('the served records', () => {
  it('parses an edition whose reported year, round, date and grouping are missing, keeping them null', () => {
    const edition = electionEditionSchema.parse({ ...EDITION, reportedYear: null, eventKey: null })
    expect(edition).toMatchObject({ reportedYear: null, reportedRound: null, reportedDate: null, eventKey: null })
  })

  it('keeps a stored family label as stored, never correcting it', () => {
    expect(electionEditionSchema.parse(EDITION).reportedFamily).toBe('parliamentary')
  })

  it('reads a round label as text, not a finality', () => {
    expect(electionEditionSchema.parse({ ...EDITION, reportedRound: 'final' }).reportedRound).toBe('final')
  })

  it('refuses an edition missing a required field rather than inventing it', () => {
    const { reportedFamily: _omitted, ...missing } = EDITION
    expect(electionEditionSchema.safeParse(missing).success).toBe(false)
    expect(electionEditionSchema.safeParse({ ...EDITION, reportedYear: '2019' }).success).toBe(false)
    expect(electionEditionSchema.safeParse({ ...EDITION, readiness: { identity: 'DONE', sourceSelection: 'HELD' } }).success).toBe(false)
  })

  it('parses a contest with null chamber, constituency and scope label, and only the API’s scope types', () => {
    expect(electionContestSchema.parse({ ...CONTEST, scopeLabel: null })).toMatchObject({ chamber: null, constituencyCode: null, scopeLabel: null })
    expect(electionContestSchema.safeParse({ ...CONTEST, scopeType: 'locality' }).success).toBe(false)
  })

  it('requires a page’s exact total and its paging', () => {
    const page = { items: [EDITION], page: 1, pageSize: 20, total: 50, hasMore: true }
    expect(electionEditionPageSchema.parse(page).total).toBe(50)
    const { total: _total, ...noTotal } = page
    expect(electionEditionPageSchema.safeParse(noTotal).success).toBe(false)
    expect(electionEditionPageSchema.safeParse({ ...page, total: -1 }).success).toBe(false)
  })
})
