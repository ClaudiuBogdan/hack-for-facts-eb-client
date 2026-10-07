import { describe, expect, it } from 'vitest'
import type { EnterpriseRead, IndicatorCell } from './enterprise.data'
import { amepipRuns, controlAgreement, controlGroups, controlRows, displayValue, exactDecimal, fractionToPercent, indicatorTables, type ControlRow } from './enterprise.model'

const cell = (overrides: Partial<IndicatorCell>): IndicatorCell => ({
  year: 2024,
  sourceSheet: 'Indicatori formular',
  version: '1',
  indicatorKey: 'k',
  kpiCode: 'GC_MEET',
  indicatorName: 'Numărul ședințelor',
  measureUnit: 'nr.',
  valueKind: 'number',
  rawValue: '9',
  numericValue: '9',
  booleanValue: null,
  ...overrides,
})

describe('the enterprise page’s values', () => {
  it('moves a fraction’s point two places, every digit kept', () => {
    expect(fractionToPercent('0.0113')).toBe('1.13')
    expect(fractionToPercent('0.5')).toBe('50')
    expect(fractionToPercent('-0.1218')).toBe('-12.18')
    expect(fractionToPercent('76.1984')).toBe('7619.84')
    expect(fractionToPercent('0.0001')).toBe('0.01')
    expect(fractionToPercent('0')).toBe('0')
    expect(fractionToPercent('-0')).toBe('0')
    expect(fractionToPercent('1e3')).toBe('1e3')
  })

  it('writes exact decimals in the reader’s separators, never rounding', () => {
    expect(exactDecimal('118049.709', 'ro')).toBe('118.049,709')
    expect(exactDecimal('118049.709', 'en')).toBe('118,049.709')
    expect(exactDecimal('-0.6121', 'ro')).toBe('−0,6121')
    expect(exactDecimal('n/a', 'ro')).toBe('n/a')
  })

  it('shows a checked ratio as a percent, market share and the form as written', () => {
    const tables = indicatorTables([
      cell({ sourceSheet: 'Indicatori calculati', kpiCode: 'FIN-MNP', measureUnit: '%', numericValue: '0.0113', rawValue: '0.0113' }),
      cell({ sourceSheet: 'Indicatori calculati', kpiCode: 'MS', measureUnit: '%', numericValue: '0.0142', rawValue: '0.0142' }),
      cell({ kpiCode: 'FIN-DP', measureUnit: '%', numericValue: '50', rawValue: '50' }),
    ])
    const margin = tables.calculated!.rows.find((row) => row.code === 'FIN-MNP')!
    const share = tables.calculated!.rows.find((row) => row.code === 'MS')!
    expect(displayValue(margin, '0.0113', 'ro')).toBe('1,13')
    expect(displayValue(share, '0.0142', 'ro')).toBe('0,0142')
    expect(tables.form).toBeNull()
  })

  it('keeps a form year only when more than the three trap KPIs are filled, and names the years it held back', () => {
    const tables = indicatorTables([
      cell({ year: 2021, kpiCode: 'FIN-DP', numericValue: '0' }),
      cell({ year: 2021, kpiCode: 'GC_MEET', valueKind: 'empty', numericValue: null, rawValue: null }),
      cell({ year: 2022, kpiCode: 'FIN-RCC', numericValue: '1.37' }),
      cell({ year: 2023, kpiCode: 'GC_MEET', numericValue: '9' }),
      cell({ year: 2023, kpiCode: 'FIN-DP', numericValue: '0.5' }),
    ])
    expect(tables.form!.years).toEqual([2023])
    expect(tables.withheldFormYears).toEqual([2021, 2022])
    expect(tables.form!.rows.find((row) => row.code === 'FIN-DP')!.values[2023]).toBe('0.5')
  })

  it('reads an empty cell as missing, never as zero', () => {
    const tables = indicatorTables([cell({ year: 2023 }), cell({ year: 2024, valueKind: 'empty', numericValue: null, rawValue: null })])
    expect(tables.form!.years).toEqual([2023])
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

describe('the enterprise page’s control rows', () => {
  const read = (edges: readonly { sourceFamily: 's1001' | 'json_apt'; authorityCui: string; authorityName: string }[]): EnterpriseRead => ({
    cui: '789401',
    profile: {
      cui: '789401',
      isCurrentMember: true,
      currentFamilies: ['s1001'],
      organization: null,
      registryObservations: [],
      authorityEdges: edges.map((edge) => ({ ...edge, authorityLevel: edge.sourceFamily === 's1001' ? 'local' : 'unknown', aptTypeId: null, enterpriseStatusRaw: 'ACTIV', sourceUrl: null })),
      sources: [],
      indicators: { pageInfo: { hasNextPage: false, endCursor: null }, edges: [] },
    },
    indicators: [],
    indicatorSnapshot: null,
    seap: { buyerDirect: null, buyerAwards: null, sellerDirect: null, sellerAwards: null },
    authorities: {},
    readAt: '2026-10-07T00:00:00Z',
  })

  it('puts ANAF’s list first, decodes the announcements’ entities and compares authorities by CUI', () => {
    const rows = controlRows(read([
      { sourceFamily: 'json_apt', authorityCui: '45699112', authorityName: 'ADI &quot;SIBIU&quot;' },
      { sourceFamily: 's1001', authorityCui: '4270740', authorityName: 'CONSILIUL LOCAL SIBIU' },
    ]))
    expect(rows.map((row) => row.source)).toEqual(['s1001', 'json_apt'])
    expect(rows[1]!.name).toBe('ADI "SIBIU"')
    expect(rows[1]!.level).toBeNull()
    expect(controlAgreement(rows)).toBe('different')
    expect(controlGroups(rows)).toHaveLength(2)
  })

  it('shows one authority two sources name, keeping both sources, though they spell it differently', () => {
    const rows: readonly ControlRow[] = controlRows(read([
      { sourceFamily: 's1001', authorityCui: '4420465', authorityName: 'CONSILIUL LOCAL AL SECTORULUI BUCURESTI' },
      { sourceFamily: 'json_apt', authorityCui: '4420465', authorityName: 'CONSILIUL LOCAL AL SECTORULUI 3 BUCURESTI' },
    ]))
    expect(controlAgreement(rows)).toBe('same')
    const groups = controlGroups(rows)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.rows.map((row) => row.source)).toEqual(['s1001', 'json_apt'])
  })
})
