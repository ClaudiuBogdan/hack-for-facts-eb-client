import { describe, expect, it } from 'vitest'
import { privateCompanyProfileSchema } from '@/schemas/private-company'
import {
  companyProfileResponseSchema,
  type CompanyProfileResponse,
} from './company-queries'
import { mapCompanyListItem, mapCompanyProfile } from './company-mappers'

/** A trimmed DEDEMAN-shaped response (values cross-checked vs prod). */
const dedemanResponse: CompanyProfileResponse = {
  company: {
    cui: '2816464',
    orgId: '1517396',
    name: 'DEDEMAN SRL',
    legalForm: 'SRL',
    codInmatriculare: 'J1992002621040',
    registrationDate: '1992-11-05',
    registrationDatePresent: true,
    headlineStatus: { code: '1048', label: 'funcțiune' },
    statusFlags: [{ code: '1048', label: 'funcțiune' }],
    territory: {
      sirutaCode: '20297',
      uatName: 'MUNICIPIUL BACĂU',
      countyName: 'JUDEŢUL BACĂU',
      matchConfidence: 'SAFE',
    },
    address: { display: '', county: 'Bacău', locality: 'Municipiul Bacău' },
    fiscal: {
      vatPayer: true,
      declaredFiscallyInactive: false,
      mainCaenCode: '4752',
      registeredName: 'DEDEMAN SRL',
      asOf: '2026-05-18',
    },
    caenActivities: [
      { code: '4752', rev: 'rev3', label: 'Comerț', source: 'onrc' },
    ],
    representatives: [{ name: 'PAVĂL ADRIAN', role: 'administrator' }],
    euBranches: [],
    publicMoney: null,
    asOf: { onrc: '2026-05-17', anaf: '2026-05-18' },
  },
  companyFinancials: {
    years: [
      { year: 2024, turnover: '12294042595.00', netProfit: '1636814708.00', netLoss: '0.00', employees: '12313' },
      { year: 2022, turnover: '11045879922.00', netProfit: '1702616369.00', netLoss: '0.00', employees: '12245' },
    ],
    trajectory: null,
  },
}

describe('mapCompanyProfile', () => {
  it('maps DEDEMAN into a schema-valid PrivateCompanyProfile', () => {
    const profile = mapCompanyProfile(dedemanResponse)
    expect(profile).not.toBeNull()
    // Round-trips through the UI schema (the contract the components consume).
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })

  it('coerces string Money/BigInt scalars to numbers and renames year→fiscalYear', () => {
    const profile = mapCompanyProfile(dedemanResponse)!
    expect(profile.financials).toHaveLength(2)
    const latest = profile.financials[0]
    expect(latest.fiscalYear).toBe(2024)
    expect(latest.turnover).toBe(12294042595)
    expect(latest.netProfit).toBe(1636814708)
    expect(latest.employees).toBe(12313)
    expect(latest.currency).toBe('RON')
  })

  it('maps the inactive side of the profit/loss pair (server "0.00") to null', () => {
    // DEDEMAN is profitable every year → netLoss "0.00" must become null, not 0,
    // so the financials table does not render a misleading "0 RON" loss.
    const profile = mapCompanyProfile(dedemanResponse)!
    for (const year of profile.financials) {
      expect(year.netLoss).toBeNull()
      expect(year.netProfit).not.toBeNull()
    }
  })

  it('maps uppercase SAFE match confidence to lowercase safe', () => {
    const profile = mapCompanyProfile(dedemanResponse)!
    expect(profile.geography?.matchConfidence).toBe('safe')
  })

  it('derives anafFound=true when financials are present', () => {
    const profile = mapCompanyProfile(dedemanResponse)!
    expect(profile.fiscal.anafFound).toBe(true)
  })

  it('synthesizes onrc + anaf sources from asOf without fabricating URLs', () => {
    const profile = mapCompanyProfile(dedemanResponse)!
    expect(profile.sources).toEqual([
      { id: 'onrc', snapshotDate: '2026-05-17' },
      { id: 'anaf', snapshotDate: '2026-05-18' },
    ])
  })

  it('returns null when company is null (unknown CUI → 404)', () => {
    const parsed = companyProfileResponseSchema.parse({
      company: null,
      companyFinancials: null,
    })
    expect(mapCompanyProfile(parsed)).toBeNull()
  })

  it('derives anafFound=false when no ANAF signal at all', () => {
    const noAnaf: CompanyProfileResponse = {
      company: {
        ...dedemanResponse.company!,
        fiscal: null,
        asOf: { onrc: '2026-05-17', anaf: null },
      },
      companyFinancials: { years: [], trajectory: null },
    }
    expect(mapCompanyProfile(noAnaf)!.fiscal.anafFound).toBe(false)
  })
})

describe('mapCompanyListItem', () => {
  it('maps a list node and nulls registrationDate when not present', () => {
    const item = mapCompanyListItem({
      cui: '2816464',
      orgId: '1517396',
      name: 'DEDEMAN SRL',
      legalForm: 'SRL',
      headlineStatus: { code: '1048', label: 'funcțiune' },
      county: 'Bacău',
      vatPayer: true,
      declaredFiscallyInactive: false,
      registrationDate: '1992-11-05',
      registrationDatePresent: false,
    })
    expect(item.name).toBe('DEDEMAN SRL')
    expect(item.county).toBe('Bacău')
    expect(item.status).toEqual({ code: '1048', label: 'funcțiune' })
    expect(item.registrationDate).toBeNull()
  })
})

describe('mapCompanyProfile — public money and trajectory', () => {
  const withMoney = (publicMoney: NonNullable<
    CompanyProfileResponse['company']
  >['publicMoney']): CompanyProfileResponse => ({
    ...dedemanResponse,
    company: { ...dedemanResponse.company!, publicMoney },
  })

  it('never fabricates a zero for a per-flow total it cannot read', () => {
    const profile = mapCompanyProfile(
      withMoney({
        totalRon: '100.00',
        flowCount: 5,
        // An empty string coerces to 0 in JS — the exact trap a `?? 0` hides.
        byFlowType: [{ flowType: 'pnrr_subcontract', totalRon: '', count: 5 }],
      }),
    )
    expect(profile!.publicMoney!.byFlowType[0]!.totalRon).toBeNull()
  })

  it('keeps the per-flow rows when only the header total is unreadable', () => {
    // byFlowType comes from an independent aggregation; a bad header says
    // nothing about it, and dropping the rows is an undetectable false negative.
    const profile = mapCompanyProfile(
      withMoney({
        totalRon: 'n/a',
        flowCount: 3,
        byFlowType: [
          { flowType: 'procurement_contract', totalRon: '8766606.32', count: 172 },
        ],
      }),
    )
    expect(profile!.publicMoney).not.toBeNull()
    expect(profile!.publicMoney!.totalRon).toBeNull()
    expect(profile!.publicMoney!.byFlowType).toHaveLength(1)
  })

  it('stays null when the company appears in no flow at all', () => {
    expect(mapCompanyProfile(withMoney(null))!.publicMoney).toBeNull()
  })

  it('passes the server trajectory through without re-deriving the net result', () => {
    const profile = mapCompanyProfile({
      ...dedemanResponse,
      companyFinancials: {
        years: [],
        trajectory: {
          fromYear: 2024,
          toYear: 2025,
          turnoverDelta: '863792940.00',
          netResultDelta: '-1477503.00',
          employeesDelta: '389',
        },
      },
    })
    expect(profile!.financialTrajectory).toEqual({
      fromYear: 2024,
      toYear: 2025,
      turnoverDelta: 863_792_940,
      netResultDelta: -1_477_503,
      employeesDelta: 389,
    })
  })

  it('maps the balance-sheet summary, keeping an absent metric null not zero', () => {
    const profile = mapCompanyProfile({
      ...dedemanResponse,
      companyFinancials: {
        years: [
          {
            year: 2025,
            turnover: '1',
            netProfit: '1',
            netLoss: '0.00',
            employees: '1',
            summary: { totalEquity: '5110382928', debts: null },
          },
        ],
        trajectory: null,
      },
    })
    const summary = profile!.financials[0]!.summary!
    expect(summary.totalEquity).toBe(5_110_382_928)
    expect(summary.debts).toBeNull()
    // A metric the server never sent is absent, not zero.
    expect(summary.inventories).toBeNull()
  })
})
