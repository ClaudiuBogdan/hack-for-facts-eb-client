import { describe, expect, it } from 'vitest'
import { PORTFOLIO, type PortfolioAuthority, type PortfolioEnterprise } from './portfolio.data'
import {
  disagreements,
  figureOf,
  flagsOf,
  measureValue,
  missingFigure,
  portfolioFigures,
  portfolioRows,
  rankBy,
  sortRows,
  sourceTallies,
  statusGroups,
  type PortfolioRow,
} from './portfolio.model'
import { headSentence } from './portfolio.text'

const authority = (cui: string): PortfolioAuthority => PORTFOLIO.authorities.find((candidate) => candidate.cui === cui)!
const rowsOf = (cui: string) => portfolioRows(authority(cui), PORTFOLIO.enterprises)

const enterprise = (overrides: Omit<Partial<PortfolioEnterprise>, 'financials'> & { readonly financials?: Partial<PortfolioEnterprise['financials']> }): PortfolioEnterprise => ({
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

describe('the authority portfolio', () => {
  it('puts the list’s enterprises first, then those only the announcements name', () => {
    const rows = rowsOf('4374474')
    expect(rows.filter((candidate) => candidate.inList)).toHaveLength(3)
    expect(rows.slice(3).every((candidate) => !candidate.inList && candidate.inAnnouncements)).toBe(true)
    expect(rows).toHaveLength(5)
  })

  it('says where the two sources part, each from this authority’s side', () => {
    const sibiu = disagreements('4270740', rowsOf('4270740'))
    expect(sibiu).toHaveLength(1)
    expect(sibiu[0]).toMatchObject({ kind: 'announcements-elsewhere', row: { enterprise: { cui: '789401' } }, others: [{ source: 'json_apt', cui: '45699112' }] })
    const adi = disagreements('45699112', rowsOf('45699112'))
    expect(adi).toEqual([expect.objectContaining({ kind: 'list-elsewhere', others: [expect.objectContaining({ source: 's1001', cui: '4270740' })] })])
  })

  it('counts each source apart, every part adding up to the page', () => {
    const rows = rowsOf('11795573')
    const tallies = sourceTallies(rows)
    expect(tallies.list).toEqual([
      { key: 'active', count: 13, tone: 'active' },
      { key: 'inactive', count: 56, tone: 'warning' },
    ])
    for (const source of Object.values(tallies)) expect(source.reduce((sum, part) => sum + part.count, 0)).toBe(rows.length)
  })

  it('flags only what is not „in business", in the source’s words', () => {
    expect(flagsOf(enterprise({}))).toEqual([])
    expect(flagsOf(enterprise({ amepip: { year: 2024, status: 'funcţiune, reorganizare - fuziune prin absorbţie' }, registry: { code: '1084', label: 'radiată' }, fiscallyInactive: true }))).toEqual([
      { kind: 'amepip', year: 2024, status: 'funcţiune, reorganizare - fuziune prin absorbţie' },
      { kind: 'registry', state: 'struck-off', label: 'radiată' },
      { kind: 'fiscal' },
    ])
    // A registry with conflicting evidence is not a flag: it says nothing sure.
    expect(flagsOf(enterprise({ registry: { code: null, label: null } }))).toEqual([])
  })

  it('shows a zero as a zero, sorts a missing value last and never ranks either', () => {
    const zero = enterprise({ cui: 'zero', name: 'ZERO SA', financials: { turnover: '0' } })
    const none = enterprise({ cui: 'none', name: 'ALFA SA', financials: { filed: false, turnover: null, newestYear: 2016 } })
    const big = enterprise({ cui: 'big', financials: { turnover: '5000' } })
    const rows = [row(none), row(zero), row(big)]
    expect(figureOf(zero, 'cifra')).toBe('0')
    expect(sortRows(rows, 'cifra').map((candidate) => candidate.enterprise.cui)).toEqual(['big', 'zero', 'none'])
    expect(rankBy(rows, 'cifra').ranked.map((candidate) => candidate.enterprise.cui)).toEqual(['big'])
    expect(missingFigure(none, 'cifra', 2024)).toEqual({ kind: 'older', year: 2016 })
    expect(missingFigure(enterprise({ financials: { filed: false, newestYear: 2025 } }), 'cifra', 2024)).toEqual({ kind: 'newer', year: 2025 })
    expect(missingFigure(enterprise({ financials: { filed: false, newestYear: null } }), 'cifra', 2024)).toEqual({ kind: 'never' })
    // A filed statement whose value the evaluator held back says why, per value: Hidroelectrica's 2024 net result.
    const held = PORTFOLIO.enterprises['13267213']!
    expect(figureOf(held, 'pierdere')).toBeNull()
    expect(missingFigure(held, 'pierdere', 2024)).toEqual({ kind: 'held', reason: 'profile' })
    expect(missingFigure(enterprise({ financials: { turnover: null, statuses: { turnover: 'missing', employees: 'reported', net: 'reported' } } }), 'cifra', 2024)).toEqual({ kind: 'missing' })
  })

  it('ranks a loss by its size, the largest loss first, and sorts the table’s net result from the lowest', () => {
    const small = enterprise({ cui: 'small', financials: { net: '-10' } })
    const large = enterprise({ cui: 'large', financials: { net: '-2000.5' } })
    const profit = enterprise({ cui: 'profit', financials: { net: '30' } })
    expect(measureValue(large, 'pierdere')).toBe('2000.5')
    expect(measureValue(profit, 'pierdere')).toBeNull()
    expect(rankBy([row(small), row(profit), row(large)], 'pierdere').ranked.map((candidate) => candidate.enterprise.cui)).toEqual(['large', 'small'])
    expect(sortRows([row(profit), row(small), row(large)], 'pierdere').map((candidate) => candidate.enterprise.cui)).toEqual(['large', 'small', 'profit'])
  })

  it('groups by the list’s word, in its order', () => {
    expect(statusGroups(rowsOf('11795573')).map((group) => [group.state, group.rows.length])).toEqual([
      ['active', 13],
      ['inactive', 56],
    ])
  })

  it('counts enterprises, never money, and says when SEAP left a count unknown', () => {
    const figures = portfolioFigures([row(enterprise({ seap: null })), row(enterprise({ financials: { net: '-1' } })), row(enterprise({ financials: { filed: false, net: null } }))])
    expect(figures).toEqual({ filed: 2, netReported: 2, loss: 1, buyers: 2, sellers: 0, seapUnknown: 1 })
  })

  it('says what each source gives the authority, with the source', () => {
    expect(headSentence(authority('45699112'), rowsOf('45699112'), 'ro')).toBe(
      'După anunțurile de selecție AMEPIP, controlează o întreprindere; lista ANAF a întreprinderilor publice o pune sub altă autoritate.',
    )
    expect(headSentence(authority('4270740'), rowsOf('4270740'), 'ro')).toBe(
      'După lista ANAF a întreprinderilor publice, controlează 4 întreprinderi. Anunțurile de selecție AMEPIP o numesc pentru 2 dintre ele. Pentru una dintre cele din listă, anunțurile numesc altă autoritate.',
    )
  })
})
