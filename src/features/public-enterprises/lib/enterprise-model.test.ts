import { describe, expect, it } from 'vitest'
import {
  amepipRuns,
  amepipYears,
  authorityKind,
  boardPanel,
  cellValue,
  controlAgreement,
  controlGroups,
  controlRows,
  displayValue,
  downLanes,
  exactDecimal,
  fractionToPercent,
  indicatorTables,
  isCheckedFraction,
  isFunctioning,
  s1001State,
  shownKind,
} from './enterprise-model'
import { TURSIB_PROFILE, enterpriseReadFixture, indicatorCell } from './test/enterprise-fixture'

describe('who controls the enterprise', () => {
  const rows = controlRows(enterpriseReadFixture())

  it('lists ANAF’s list first, each source its own row, the authority’s kind from its budget record', () => {
    expect(rows.map((row) => [row.source, row.authorityCui])).toEqual([
      ['s1001', '4270740'],
      ['json_apt', '45699112'],
    ])
    expect(rows[0]).toMatchObject({ name: 'CONSILIUL LOCAL SIBIU', level: 'local', kind: 'municipality', statusInList: 'ACTIV', hasBudget: true })
    expect(rows[1]).toMatchObject({ level: null, kind: 'unresolved', statusInList: null, hasBudget: false })
  })

  it('reads a name the API fills with the CUI as no name', () => {
    expect(rows[1]!.budgetName).toBeNull()
  })

  it('names the authority’s other enterprises, never the enterprise itself, and keeps the list’s total', () => {
    expect(rows[0]!.peers).toEqual({
      total: 4,
      others: [
        { cui: '2684932', name: 'URBANA SA' },
        { cui: '3097146', name: 'DRUMURI ŞI PRESTĂRI CONSTRUCŢII SA' },
        { cui: '3097148', name: 'PIEŢE SIBIU SA' },
      ],
    })
  })

  it('compares the sources by CUI: different authorities stay two rows', () => {
    expect(controlAgreement(rows)).toBe('different')
    expect(controlGroups(rows)).toHaveLength(2)
  })

  it('shows one authority two sources name, both sources kept, though they spell it differently', () => {
    const edges = [
      { sourceFamily: 's1001', authorityCui: '4420465', authorityName: 'CONSILIUL LOCAL AL SECTORULUI BUCURESTI', authorityLevel: 'local', enterpriseStatusRaw: 'ACTIV' },
      { sourceFamily: 'json_apt', authorityCui: '4420465', authorityName: 'CONSILIUL LOCAL AL SECTORULUI 3 BUCURESTI', authorityLevel: 'unknown', enterpriseStatusRaw: null },
    ]
    const same = controlRows(enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: edges }, authorities: {} }))
    expect(controlAgreement(same)).toBe('same')
    expect(controlGroups(same).map((group) => group.rows.map((row) => row.source))).toEqual([['s1001', 'json_apt']])
  })

  it('never takes two missing CUIs for the same authority', () => {
    const edges = [
      { sourceFamily: 's1001', authorityCui: null, authorityName: 'CONSILIUL LOCAL X', authorityLevel: 'local', enterpriseStatusRaw: 'ACTIV' },
      { sourceFamily: 'json_apt', authorityCui: null, authorityName: 'CONSILIUL LOCAL Y', authorityLevel: 'unknown', enterpriseStatusRaw: null },
    ]
    const rows = controlRows(enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: edges }, authorities: {} }))
    expect(controlAgreement(rows)).toBe('different')
    expect(controlGroups(rows)).toHaveLength(2)
  })

  it('decodes the announcements’ entities and leaves out a source it does not know', () => {
    const edges = [
      { sourceFamily: 'json_apt', authorityCui: '1', authorityName: 'ADI &quot;SIBIU&quot;', authorityLevel: 'unknown', enterpriseStatusRaw: null },
      { sourceFamily: 'new_lane', authorityCui: '2', authorityName: 'X', authorityLevel: 'local', enterpriseStatusRaw: null },
    ]
    const read = controlRows(enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: edges }, authorities: {} }))
    expect(read.map((row) => row.name)).toEqual(['ADI "SIBIU"'])
  })

  it('without the authorities’ read, says nothing it did not read', () => {
    const unread = controlRows(enterpriseReadFixture({ authorities: null }))
    expect(unread[0]).toMatchObject({ kind: 'unresolved', hasBudget: false, peers: null, budgetName: null })
  })

  it('reads the authority’s kind off its budget record only, and shows it only for a local one', () => {
    expect(authorityKind({ organization: null, territory: { kind: 'town' }, reference: { entityType: 'uat' }, budget: null })).toBe('town')
    expect(authorityKind({ organization: null, territory: { kind: 'sector' }, reference: { entityType: 'public_entity' }, budget: null })).toBe('public_entity')
    expect(authorityKind({ organization: null, territory: { kind: 'planet' }, reference: { entityType: 'uat' }, budget: null })).toBe('unresolved')
    expect(authorityKind(null)).toBe('unresolved')
    expect(shownKind({ ...rows[0]!, kind: 'public_entity' })).toBeNull()
    expect(shownKind(rows[0]!)).toBe('municipality')
  })
})

describe('the sources’ lanes', () => {
  it('names the lanes the API reports unavailable, and none when it reports them all', () => {
    expect(downLanes(TURSIB_PROFILE)).toEqual([])
    const down = { ...TURSIB_PROFILE, sources: TURSIB_PROFILE.sources.map((source) => (source.family === 's1001' ? { ...source, laneStatus: 'unavailable' } : source)) }
    expect(downLanes(down)).toEqual(['s1001'])
  })
})

describe('what each source says of its status', () => {
  it('reads ANAF’s list and AMEPIP’s years, each in its own words', () => {
    expect(s1001State(TURSIB_PROFILE)).toEqual({ listed: true, raw: 'ACTIV' })
    expect(s1001State({ ...TURSIB_PROFILE, registryObservations: [] })).toEqual({ listed: false, raw: null })
    expect(amepipYears(TURSIB_PROFILE).map((entry) => entry.status)).toEqual(Array(6).fill('funcțiune'))
    expect(isFunctioning('funcţiune')).toBe(true)
    expect(isFunctioning('este sub incidenţa Legii nr. 85/2014, faliment')).toBe(false)
  })

  it('runs AMEPIP’s years together while their words are the same', () => {
    expect(
      amepipRuns([
        { year: 2019, status: 'funcțiune' },
        { year: 2020, status: 'funcțiune' },
        { year: 2021, status: 'faliment' },
        { year: 2023, status: 'faliment' },
      ]),
    ).toEqual([
      { from: 2019, to: 2020, status: 'funcțiune' },
      { from: 2021, to: 2021, status: 'faliment' },
      { from: 2023, to: 2023, status: 'faliment' },
    ])
  })
})

describe('AMEPIP’s tables', () => {
  const tables = indicatorTables(enterpriseReadFixture().indicators!)

  it('keeps a form year only when more than the three trap KPIs are filled, and names the years it held back', () => {
    expect(tables.form!.years).toEqual([2023, 2024])
    expect(tables.withheldFormYears).toEqual([2021, 2022])
    expect(tables.calculated!.years).toEqual([2023, 2024])
  })

  it('reads an empty cell as missing, never as zero, and an unknown kind as written', () => {
    expect(tables.form!.rows.find((row) => row.code === 'GC_IND')!.values[2024]).toBeNull()
    expect(cellValue(indicatorCell({ valueKind: 'date', rawValue: '2024-12-31', numericValue: null }))).toBe('2024-12-31')
    expect(cellValue(indicatorCell({ valueKind: 'boolean', booleanValue: true, rawValue: 'DA', numericValue: null }))).toBe('DA')
    expect(cellValue(indicatorCell({ valueKind: 'boolean', booleanValue: true, rawValue: null, numericValue: null }))).toBe('true')
  })

  it('shows a checked ratio as a percent; market share and the form as written', () => {
    const margin = tables.calculated!.rows.find((row) => row.code === 'FIN-MNP')!
    const share = tables.calculated!.rows.find((row) => row.code === 'MS')!
    const dividends = tables.form!.rows.find((row) => row.code === 'FIN-DP')!
    expect([margin.fraction, share.fraction, dividends.fraction]).toEqual([true, false, false])
    // Only the five ratios checked against the statements: the operating margin could not be.
    expect(isCheckedFraction('Indicatori calculati', 'FIN-ROA', '%')).toBe(true)
    expect(isCheckedFraction('Indicatori calculati', 'FIN-MPE', '%')).toBe(false)
    expect(isCheckedFraction('Indicatori formular', 'FIN-MNP', '%')).toBe(false)
    expect(displayValue(margin, '0.0113', 'ro')).toBe('1,13')
    expect(displayValue(share, '0.0142', 'ro')).toBe('0,0142')
    expect(displayValue(dividends, '0.5', 'ro')).toBe('0,5')
  })

  it('groups the form by its own code prefixes', () => {
    expect([...new Set(tables.form!.rows.map((row) => row.group))]).toEqual(['finance', 'governance', 'people'])
  })

  it('opens on the newest form’s board answers, else the newest ratios', () => {
    expect(boardPanel(tables)).toMatchObject({ kind: 'form', year: 2024 })
    expect(boardPanel(tables)!.rows.map((row) => row.code)).toEqual(['W_TE', 'GC_MEET', 'GC_IND', 'GC_BEN', 'FIN-DP'])
    expect(boardPanel({ ...tables, form: null })).toMatchObject({ kind: 'calculated', year: 2024 })
    expect(boardPanel({ calculated: null, form: null, withheldFormYears: [] })).toBeNull()
  })
})

describe('exact decimals', () => {
  it('moves a fraction’s point two places, every digit kept', () => {
    expect(fractionToPercent('0.0113')).toBe('1.13')
    expect(fractionToPercent('0.5')).toBe('50')
    expect(fractionToPercent('-0.1218')).toBe('-12.18')
    expect(fractionToPercent('76.1984')).toBe('7619.84')
    expect(fractionToPercent('0.0001')).toBe('0.01')
    expect(fractionToPercent('-0')).toBe('0')
    expect(fractionToPercent('1e3')).toBe('1e3')
  })

  it('writes them in the reader’s separators, never rounding', () => {
    expect(exactDecimal('118049.709', 'ro')).toBe('118.049,709')
    expect(exactDecimal('118049.709', 'en')).toBe('118,049.709')
    expect(exactDecimal('-0.6121', 'ro')).toBe('−0,6121')
    expect(exactDecimal('n/a', 'ro')).toBe('n/a')
  })
})
