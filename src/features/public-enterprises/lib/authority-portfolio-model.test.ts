import { describe, expect, it } from 'vitest'
import type { PortfolioEnterprise } from '@/schemas/public-enterprise-portfolio'
import {
  activityCounts,
  amepipYearSpan,
  countyCounts,
  disagreements,
  downLanes,
  figureOf,
  filterRows,
  flagsOf,
  heldReasons,
  isSourceDown,
  listState,
  missingFigure,
  portfolioFigures,
  portfolioRows,
  registryLabels,
  sortRows,
  sourceTallies,
  type PortfolioRow,
} from './authority-portfolio-model'
import { PORTFOLIO_FIXTURE, portfolioFixture } from './test/portfolio-fixture'

type EnterpriseOverrides = Omit<Partial<PortfolioEnterprise>, 'financials'> & { readonly financials?: Partial<PortfolioEnterprise['financials']> }

const enterprise = (overrides: EnterpriseOverrides = {}): PortfolioEnterprise => ({
  cui: '1',
  name: 'TEST SA',
  legalForm: 'SA',
  county: 'CLUJ',
  caen: '4931',
  s1001: { status: 'ACTIV' },
  amepip: { year: 2024, status: 'funcţiune' },
  registry: { code: '1048', label: 'funcțiune' },
  fiscallyInactive: false,
  edges: [],
  seap: { buyerDirect: 1, buyerAwards: 0, supplierDirect: 0 },
  ...overrides,
  financials: {
    filed: true,
    turnover: '100',
    employees: '3',
    implausibleEmployees: null,
    net: '5',
    newestYear: 2025,
    statuses: { turnover: 'reported', employees: 'reported', net: 'reported' },
    ...overrides.financials,
  },
})
const row = (value: PortfolioEnterprise, inList = true): PortfolioRow => ({ enterprise: value, inList, inAnnouncements: false })
const cuis = (rows: readonly PortfolioRow[]) => rows.map((candidate) => candidate.enterprise.cui)

describe('the authority portfolio’s model', () => {
  it('says which sources put each enterprise under the authority, the list’s first', () => {
    const rows = portfolioRows(portfolioFixture('4374474'))
    expect(rows.map((candidate) => [candidate.enterprise.cui, candidate.inList, candidate.inAnnouncements])).toEqual([
      ['2112140', true, false],
      ['35332932', true, false],
      ['43119855', true, false],
      ['14071095', false, true],
      ['7392416', false, true],
    ])
  })

  it('reads where the two sources part from this authority’s side, the announcements naming no one not one of them', () => {
    expect(disagreements('4270740', portfolioRows(portfolioFixture('4270740')))).toEqual([
      expect.objectContaining({ kind: 'announcements-elsewhere', row: expect.objectContaining({ enterprise: expect.objectContaining({ cui: '789401' }) }), others: [expect.objectContaining({ cui: '45699112' })] }),
    ])
    expect(disagreements('45699112', portfolioRows(portfolioFixture('45699112')))).toEqual([
      expect.objectContaining({ kind: 'list-elsewhere', others: [expect.objectContaining({ source: 's1001', cui: '4270740' })] }),
    ])
    const hunedoara = disagreements('4374474', portfolioRows(portfolioFixture('4374474')))
    expect(hunedoara.map((part) => [part.kind, part.row.enterprise.cui])).toEqual([
      ['announcements-elsewhere', '43119855'],
      ['list-elsewhere', '14071095'],
      ['list-elsewhere', '7392416'],
    ])
    // Only the announcements put it here and ANAF's list names no authority for it: said as such.
    const unnamed = row(enterprise({ cui: '9', s1001: null, edges: [{ source: 'json_apt', cui: '77', name: 'X' }] }), false)
    expect(disagreements('77', [{ ...unnamed, inAnnouncements: true }])).toEqual([{ kind: 'list-none', row: { ...unnamed, inAnnouncements: true } }])
  })

  it('says a lane that was down when read', () => {
    const portfolio = portfolioFixture('4270740')
    expect(isSourceDown(portfolio, 's1001')).toBe(false)
    const down = { ...portfolio, sources: portfolio.sources.map((source) => (source.family === 's1001' ? { ...source, laneStatus: 'unavailable' } : source)) }
    expect(isSourceDown(down, 's1001')).toBe(true)
    expect(downLanes(down)).toEqual({ list: true, announcements: false, amepip: false })
  })

  it('counts ANAF’s list’s word over the enterprises it puts here, and says where it has the others, so the row agrees with the head', () => {
    const rows = portfolioRows(portfolioFixture('4374474'))
    const tallies = sourceTallies(rows, '4374474')
    // Three in the list under the council (two active, one inactive); the two only the announcements put here are in the list under another authority.
    expect(tallies.list).toEqual([
      { key: 'active', count: 2, tone: 'active' },
      { key: 'inactive', count: 1, tone: 'warning' },
      { key: 'elsewhere', count: 2, tone: 'unknown' },
    ])
    expect(tallies.fiscal).toEqual([
      { key: 'active', count: 4, tone: 'active' },
      { key: 'inactive', count: 1, tone: 'warning' },
    ])
    for (const source of Object.values(tallies)) expect(source.reduce((sum, part) => sum + part.count, 0)).toBe(rows.length)
    // Listed with no authority named, and not listed at all, are said apart.
    const unnamed = { enterprise: enterprise({ cui: 'u', edges: [] }), inList: false, inAnnouncements: true }
    const absent = { enterprise: enterprise({ cui: 'a', s1001: null }), inList: false, inAnnouncements: true }
    expect(sourceTallies([unnamed, absent], '77').list.map((part) => part.key)).toEqual(['unnamed', 'absent'])
  })

  it('never reads a lane that was down as „none": its source is one part, „not read", and no comparison is made with it', () => {
    const portfolio = portfolioFixture('45699112')
    const listDown = { list: true, announcements: false, amepip: false }
    const rows = portfolioRows(portfolio).map((candidate) => ({ ...candidate, enterprise: { ...candidate.enterprise, s1001: null, edges: candidate.enterprise.edges.filter((edge) => edge.source !== 's1001') } }))
    expect(sourceTallies(rows, '45699112', listDown).list).toEqual([{ key: 'unread', count: 1, tone: 'unknown' }])
    expect(listState(rows[0]!.enterprise, listDown)).toBe('unread')
    expect(disagreements('45699112', rows, listDown)).toEqual([])
    expect(filterRows(rows, 'altele', '45699112', listDown)).toHaveLength(1)
    const amepipDown = { list: false, announcements: false, amepip: true }
    expect(sourceTallies([row(enterprise({ amepip: null }))], '1', amepipDown).amepip.map((part) => part.key)).toEqual(['#unread'])
    // With the announcements down, no enterprise of the list is said to be named elsewhere by them.
    const sibiu = portfolioRows(portfolioFixture('4270740'))
    expect(disagreements('4270740', sibiu, { list: false, announcements: true, amepip: false })).toEqual([])
  })

  it('counts each source apart; AMEPIP’s own words are parts of their own', () => {
    // AMEPIP's own words are a part of their own; none and a blank status are kept apart.
    const amepip = sourceTallies([row(enterprise({ amepip: { year: 2023, status: 'faliment' } })), row(enterprise({ amepip: null })), row(enterprise({ amepip: { year: 2024, status: ' ' } }))], '1').amepip
    expect(amepip.map((part) => [part.key, part.tone])).toEqual([
      ['#blank', 'unknown'],
      ['#none', 'unknown'],
      ['faliment', 'warning'],
    ])
    // A company record without its fiscal flag is not „no record".
    expect(sourceTallies([row(enterprise({ fiscallyInactive: null })), row(enterprise({ fiscallyInactive: null, registry: null }))], '1').fiscal.map((part) => part.key)).toEqual(['unknown', 'none'])
    expect(amepipYearSpan(portfolioRows(portfolioFixture('4374474')))).toEqual({ from: 2024, to: 2024 })
    expect(amepipYearSpan([row(enterprise({ amepip: null }))])).toBeNull()
  })

  it('names the registry’s own labels for a grouped state', () => {
    const rows = [row(enterprise({ registry: { code: '1049', label: 'dizolvare' } })), row(enterprise({ registry: { code: '1052', label: 'lichidare' } }))]
    expect(registryLabels(rows, 'dissolution')).toBe('dizolvare, lichidare')
    expect(registryLabels(rows, 'struck-off')).toBeNull()
  })

  it('flags only what is not „in business", in the source’s words; a registry whose evidence conflicts flags nothing', () => {
    expect(flagsOf(enterprise())).toEqual([])
    expect(flagsOf(enterprise({ amepip: { year: 2024, status: 'funcţiune, reorganizare - fuziune prin absorbţie' }, registry: { code: '1084', label: 'radiată' }, fiscallyInactive: true }))).toEqual([
      { kind: 'amepip', year: 2024, status: 'funcţiune, reorganizare - fuziune prin absorbţie' },
      { kind: 'registry', state: 'struck-off', label: 'radiată' },
      { kind: 'fiscal' },
    ])
    expect(flagsOf(enterprise({ registry: { code: null, label: null } }))).toEqual([])
    expect(flagsOf(enterprise({ registry: null }))).toEqual([])
  })

  it('reads the list’s word, a blank or unknown cell apart from not being listed', () => {
    expect(listState(enterprise({ s1001: { status: ' activ ' } }))).toBe('active')
    expect(listState(enterprise({ s1001: { status: 'INACTIV' } }))).toBe('inactive')
    expect(listState(enterprise({ s1001: { status: null } }))).toBe('blank')
    expect(listState(enterprise({ s1001: null }))).toBe('absent')
  })

  it('shows a zero as a zero and says why a figure is missing, per value', () => {
    const zero = PORTFOLIO_FIXTURE.enterprises['43119855']!
    expect(figureOf(zero, 'turnover')).toBe('0')
    const older = PORTFOLIO_FIXTURE.enterprises['2112140']!
    expect(missingFigure(older, 'turnover')).toEqual({ kind: 'last', year: 2017 })
    // Only the newest year is kept: a later statement says nothing of the years before it.
    expect(missingFigure(enterprise({ financials: { filed: false, newestYear: 2025 } }), 'turnover')).toEqual({ kind: 'last', year: 2025 })
    expect(missingFigure(enterprise({ financials: { filed: false, newestYear: null } }), 'net')).toEqual({ kind: 'never' })
    const held = enterprise({ financials: { net: null, statuses: { turnover: 'reported', employees: 'reported', net: 'held_profile' } } })
    expect(missingFigure(held, 'net')).toEqual({ kind: 'held', reason: 'profile' })
    expect(missingFigure(enterprise({ financials: { turnover: null, statuses: { turnover: 'missing', employees: 'reported', net: 'reported' } } }), 'turnover')).toEqual({ kind: 'missing' })
    expect(missingFigure(enterprise({ financials: { employees: null, statuses: { turnover: 'reported', employees: 'unassessed', net: 'reported' } } }), 'employees')).toEqual({ kind: 'not-admitted' })
    expect([...heldReasons([row(held), row(enterprise())], ['turnover', 'employees', 'net'])]).toEqual(['profile'])
  })

  it('sorts the largest first, the lowest net result first, and the rows with no value after, by name', () => {
    const rows = [
      row(enterprise({ cui: 'none', name: 'ALFA SA', financials: { filed: false, turnover: null, net: null, newestYear: 2016 } })),
      row(enterprise({ cui: 'zero', name: 'ZERO SA', financials: { turnover: '0', net: '0' } })),
      row(enterprise({ cui: 'big', name: 'BETA SA', financials: { turnover: '5000', net: '-2000.5' } })),
      row(enterprise({ cui: 'small', name: 'GAMA SA', financials: { turnover: '90', net: '-10' } })),
    ]
    expect(cuis(sortRows(rows, 'cifra'))).toEqual(['big', 'small', 'zero', 'none'])
    expect(cuis(sortRows(rows, 'rezultat'))).toEqual(['big', 'small', 'zero', 'none'])
    expect(cuis(sortRows(rows, 'nume'))).toEqual(['none', 'big', 'small', 'zero'])
  })

  it('filters by the list’s word, the rest being a blank cell or not listed', () => {
    const rows = [row(enterprise({ cui: 'a' })), row(enterprise({ cui: 'i', s1001: { status: 'INACTIV' } })), row(enterprise({ cui: 'b', s1001: { status: null } })), row(enterprise({ cui: 'n', s1001: null }), false)]
    expect(cuis(filterRows(rows, 'toate', '77'))).toEqual(['a', 'i', 'b', 'n'])
    expect(cuis(filterRows(rows, 'active', '77'))).toEqual(['a'])
    expect(cuis(filterRows(rows, 'inactive', '77'))).toEqual(['i'])
    expect(cuis(filterRows(rows, 'altele', '77'))).toEqual(['b', 'n'])
    // As the panel reads it: an active enterprise the list puts under another authority is not „active" here.
    const hunedoara = portfolioRows(portfolioFixture('4374474'))
    expect(cuis(filterRows(hunedoara, 'active', '4374474'))).toEqual(['35332932', '43119855'])
    expect(cuis(filterRows(hunedoara, 'altele', '4374474'))).toEqual(['14071095', '7392416'])
  })

  it('counts by activity and seat, none on record last', () => {
    const rows = [row(enterprise({ caen: '3600' })), row(enterprise({ caen: '3700', county: 'ALBA' })), row(enterprise({ caen: null, county: null })), row(enterprise({ caen: '3601' }))]
    expect(activityCounts(rows)).toEqual([
      { key: '36', count: 2 },
      { key: '37', count: 1 },
      { key: null, count: 1 },
    ])
    expect(countyCounts(rows)).toEqual([
      { key: 'CLUJ', count: 2 },
      { key: 'ALBA', count: 1 },
      { key: null, count: 1 },
    ])
  })

  it('counts enterprises, never money, each SEAP count with what SEAP left unanswered for it', () => {
    expect(portfolioFigures(portfolioRows(portfolioFixture('4374474')))).toEqual({ filed: 4, netReported: 4, loss: 1, buyers: 3, buyersUnknown: 0, directSellers: 2, directSellersUnknown: 0 })
    const figures = portfolioFigures([row(enterprise({ seap: null })), row(enterprise({ financials: { net: '-1' } })), row(enterprise({ financials: { filed: false, net: null } }))])
    expect(figures).toEqual({ filed: 2, netReported: 2, loss: 1, buyers: 2, buyersUnknown: 1, directSellers: 0, directSellersUnknown: 1 })
    // One unanswered field never hides what is known: a known buyer stays counted, a known seller zero stays a zero.
    expect(portfolioFigures([row(enterprise({ seap: { buyerDirect: 1, buyerAwards: null, supplierDirect: 0 } }))])).toMatchObject({ buyers: 1, buyersUnknown: 0, directSellers: 0, directSellersUnknown: 0 })
  })
})
