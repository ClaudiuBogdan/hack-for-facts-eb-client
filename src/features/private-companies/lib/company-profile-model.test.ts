import { describe, expect, it } from 'vitest'
import type { CompanyHubSnapshot } from './hub-snapshot-types'
import { COMPANY_HUB_SNAPSHOT } from './hub-snapshot'
import { buildCompanyProfileModel, displayCompanyName, netResultOf, placeLabel, sizeClassOf } from './company-profile-model'
import { companyProfile, financialYear } from './company-profile.fixture'

/**
 * The model is what keeps the page honest for any company: a gap in the
 * statements stays a gap, money without an amount is counted and never summed
 * as zero, a commitment is never a payment, and a share of the economy under
 * 1% is not said at all.
 */

describe('displayCompanyName', () => {
  it('writes a registry name in capitals the way a heading reads it', () => {
    expect(displayCompanyName('OMV PETROM SA')).toBe('OMV Petrom SA')
    expect(displayCompanyName('PROFI ROM FOOD SRL')).toBe('Profi ROM Food SRL')
    expect(displayCompanyName('66 JACK SRL')).toBe('66 Jack SRL')
  })

  it('keeps initials, dotted forms and ampersands as written, and function words lower case', () => {
    expect(displayCompanyName('A & B IDEATICA S.R.L.')).toBe('A & B Ideatica S.R.L.')
    expect(displayCompanyName('SOCIETATEA NAŢIONALĂ DE TRANSPORT GAZE NATURALE TRANSGAZ SA')).toBe(
      'Societatea Națională de Transport Gaze Naturale Transgaz SA',
    )
  })

  it('capitalises each part of a hyphenated name, in comma-below letters', () => {
    expect(displayCompanyName('ABC-CON-INTERNAŢIONAL SRL')).toBe('ABC-CON-Internațional SRL')
  })
})

describe('placeLabel', () => {
  it('drops the kind of locality and names the county only when it adds something', () => {
    expect(placeLabel('Municipiul Botoşani', 'Botoşani')).toBe('Botoșani')
    expect(placeLabel('Municipiul Gherla', 'Cluj')).toBe('Gherla, Cluj')
    expect(placeLabel('Bucureşti Sectorul 1', 'Bucureşti')).toBe('București, Sectorul 1')
  })

  it('falls back to the county, and to nothing', () => {
    expect(placeLabel(null, 'Cluj')).toBe('Cluj')
    expect(placeLabel(null, null)).toBeNull()
  })
})

describe('netResultOf', () => {
  it('reads a loss beside the zero profit ANAF writes, and nothing when neither side is reported', () => {
    expect(netResultOf(financialYear(2024, { netProfit: 0, netLoss: 1200 }))).toBe(-1200)
    expect(netResultOf(financialYear(2024, { netProfit: 5000, netLoss: null }))).toBe(5000)
    expect(netResultOf(financialYear(2024))).toBeNull()
  })
})

describe('sizeClassOf', () => {
  it('counts people as the hub does', () => {
    expect([null, 0, 9, 10, 49, 50, 249, 250].map(sizeClassOf)).toEqual([null, 'none', 'micro', 'small', 'small', 'medium', 'medium', 'large'])
  })
})

describe('buildCompanyProfileModel', () => {
  it('keeps every year from the first statement to the last, the gaps as gaps', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        financials: [financialYear(2011, { turnover: 100 }), financialYear(2008, { turnover: 50 }), financialYear(2013, { turnover: 80, employees: 3 })],
      }),
    )
    expect(model.span).toEqual([2008, 2009, 2010, 2011, 2012, 2013])
    expect(model.missingYears).toEqual([2009, 2010, 2012])
    expect(model.series.turnover.map((point) => point.value)).toEqual([50, null, null, 100, null, 80])
    expect(model.latest?.fiscalYear).toBe(2013)
    // The year before the newest had no statement: nothing to compare with.
    expect(model.previous).toBeNull()
  })

  it('draws the head from the last five years with a statement, not the last five calendar years', () => {
    const years = [2010, 2011, 2012, 2013, 2014, 2015, 2019].map((year) => financialYear(year, { turnover: year, netProfit: 1, employees: 2 }))
    const model = buildCompanyProfileModel(companyProfile({ financials: years }))
    expect(model.recent.years).toEqual([2012, 2013, 2014, 2015, 2019])
    // A newest statement older than the year before the snapshot's is old news.
    expect(model.stale).toBe(true)
  })

  it('counts the years that ended in a loss', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        financials: [financialYear(2022, { netProfit: 0, netLoss: 10 }), financialYear(2023, { netProfit: 4 }), financialYear(2024, { netLoss: 3 })],
      }),
    )
    expect(model.lossYears).toBe(2)
  })

  it('has no figures at all for a company that never filed', () => {
    const model = buildCompanyProfileModel(companyProfile())
    expect(model.latest).toBeNull()
    expect(model.span).toEqual([])
    expect(model.recent.years).toEqual([])
    expect(model.sizeClass).toBeNull()
  })

  it('reads the registry status by its code', () => {
    const kind = (code: string) => buildCompanyProfileModel(companyProfile({ status: { code, label: 'x' } })).status.kind
    expect(kind('1048')).toBe('active')
    expect(kind('1084')).toBe('struck-off')
    expect(kind('1107')).toBe('insolvency')
    expect(kind('1049')).toBe('dissolution')
    expect(kind('9999')).toBe('other')
    expect(buildCompanyProfileModel(companyProfile({ status: null })).status).toEqual({ kind: 'other', label: null })
  })

  it('groups the authorised activities of the newest revision by division, the largest first', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        caenActivities: [
          { code: '4711', rev: 'rev2', label: 'Comerț', source: 'onrc' },
          { code: '4719', rev: 'rev2', label: 'Alt comerț', source: 'onrc' },
          { code: '5610', rev: 'rev2', label: 'Restaurante', source: 'onrc' },
          { code: '4711', rev: 'rev1', label: 'Vechi', source: 'onrc' },
          { code: '4711', rev: null, label: 'ANAF', source: 'anaf' },
        ],
        fiscal: { vatPayer: true, inactive: false, anafFound: true, asOfDate: '2026-07-04', fiscalCaen: { code: '4711', rev: null } },
      }),
    )
    expect(model.activities.revision).toBe('rev2')
    expect(model.activities.total).toBe(3)
    expect(model.activities.groups.map((group) => [group.division, group.activities.length])).toEqual([
      ['47', 2],
      ['56', 1],
    ])
    expect(model.mainActivity).toMatchObject({ code: '4711', label: 'Comerț', division: '47' })
  })

  it('names a main activity only from a revision that can mean it', () => {
    const activities = [
      { code: '6210', rev: 'rev3', label: 'Activități de realizare a soft-ului la comandă', source: 'onrc' as const },
      { code: '6210', rev: 'rev1', label: 'Transporturi aeriene regulate', source: 'onrc' as const },
      { code: '6210', rev: null, label: null, source: 'anaf' as const },
    ]
    const withFiscal = (rev: string | null) =>
      buildCompanyProfileModel(
        companyProfile({
          caenActivities: activities,
          fiscal: { vatPayer: null, inactive: null, anafFound: true, asOfDate: '2026-07-04', fiscalCaen: { code: '6210', rev } },
        }),
      ).mainActivity?.label
    // A known revision names the code from its own nomenclature only.
    expect(withFiscal('rev1')).toBe('Transporturi aeriene regulate')
    expect(withFiscal('rev2')).toBe('6210')
    // ANAF rarely says which: Rev.2 first, then Rev.3 — never an older meaning of the same digits.
    expect(withFiscal(null)).toBe('Activități de realizare a soft-ului la comandă')
  })

  it('counts Rev.3 vehicle repair under the division the snapshot keeps it in', () => {
    const model = buildCompanyProfileModel(
      companyProfile({ fiscal: { vatPayer: null, inactive: null, anafFound: true, asOfDate: '2026-07-04', fiscalCaen: { code: '9531', rev: 'rev3' } } }),
    )
    expect(model.mainActivity).toMatchObject({ code: '9531', label: '9531', division: '45' })
  })

  it('keeps public money as the source split it: amounts summed, unvalued records counted, commitments apart', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        publicMoney: {
          totalRon: null,
          flowCount: 0,
          byFlowType: [
            { flowType: 'direct_acquisition', totalRon: 3_000, count: 4 },
            { flowType: 'procurement_contract', totalRon: 90_000, count: 2 },
            { flowType: 'pnrr_payment', totalRon: 0, count: 1 },
            { flowType: 'pnrr_commitment', totalRon: 500_000, count: 1 },
          ],
          byYear: [
            { year: 2020, flowType: 'procurement_contract', totalRon: 90_000, count: 2 },
            { year: 2023, flowType: 'direct_acquisition', totalRon: 2_000, count: 3 },
            { year: null, flowType: 'direct_acquisition', totalRon: 1_000, count: 1 },
            { year: 2023, flowType: 'pnrr_payment', totalRon: 0, count: 1 },
            { year: 2024, flowType: 'pnrr_commitment', totalRon: 500_000, count: 1 },
          ],
        },
      }),
    )
    const { money } = model
    expect(money.flows.map((flow) => [flow.flowType, flow.total, flow.receipt])).toEqual([
      ['procurement_contract', 90_000, true],
      ['direct_acquisition', 3_000, true],
      // A zero beside a count is a record with no published amount, not a free payment.
      ['pnrr_payment', null, true],
      ['pnrr_commitment', 500_000, false],
    ])
    expect(money.received).toBe(93_000)
    expect(money.receivedCount).toBe(7)
    expect(money.unvaluedCount).toBe(1)
    expect(money.commitments).toEqual({ total: 500_000, count: 1 })
    expect(money.undated).toEqual({ total: 1_000, count: 1, unvalued: 0 })
    // The commitment's year is not a year of payments; the years between are kept, empty.
    expect([money.firstYear, money.lastYear]).toEqual([2020, 2023])
    expect(money.byYear.map((year) => [year.year, year.contracts, year.direct, year.other, year.unvalued])).toEqual([
      [2020, 90_000, 0, 0, 0],
      [2021, 0, 0, 0, 0],
      [2022, 0, 0, 0, 0],
      [2023, 0, 2_000, 0, 1],
    ])
  })

  it('keeps a reversal in the sums: a negative amount is published, not missing', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        publicMoney: {
          totalRon: null,
          flowCount: 0,
          byFlowType: [{ flowType: 'pnrr_payment', totalRon: 500, count: 3 }],
          byYear: [
            { year: 2023, flowType: 'pnrr_payment', totalRon: 1_000, count: 2 },
            { year: 2024, flowType: 'pnrr_payment', totalRon: -500, count: 1 },
          ],
        },
      }),
    )
    expect(model.money.unvaluedCount).toBe(0)
    expect(model.money.byYear.map((year) => [year.year, year.other])).toEqual([
      [2023, 1_000],
      [2024, -500],
    ])
  })

  it('calls only the calendar year in progress a part of a year, never a company’s last active year', () => {
    const withMoneyTo = (year: number) =>
      companyProfile({
        publicMoney: {
          totalRon: null,
          flowCount: 0,
          byFlowType: [{ flowType: 'direct_acquisition', totalRon: 300, count: 2 }],
          byYear: [
            { year: 2019, flowType: 'direct_acquisition', totalRon: 100, count: 1 },
            { year, flowType: 'direct_acquisition', totalRon: 200, count: 1 },
          ],
        },
      })
    const now = new Date(2026, 8, 24)
    expect(buildCompanyProfileModel(withMoneyTo(2026), { now }).money.openYear).toBe(2026)
    // A company whose last contract was in 2023 has a whole 2023.
    expect(buildCompanyProfileModel(withMoneyTo(2023), { now }).money.openYear).toBeNull()
  })

  it('counts records with no amount from the flows when the source gives no years', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        publicMoney: {
          totalRon: null,
          flowCount: 0,
          byFlowType: [
            { flowType: 'pnrr_payment', totalRon: null, count: 3 },
            { flowType: 'direct_acquisition', totalRon: 500, count: 1 },
          ],
          byYear: [],
        },
      }),
    )
    expect(model.money.unvaluedCount).toBe(3)
    expect([model.money.firstYear, model.money.undated.count]).toEqual([null, 0])
  })

  it('writes the registry’s status and activity names in comma-below letters', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        status: { code: '1049', label: 'dizolvare judiciară conform Legii 31/1990 (fără lichidare) - radiere din oficiu - ş' },
        caenActivities: [{ code: '5610', rev: 'rev2', label: 'Restaurante şi baruri', source: 'onrc' }],
      }),
    )
    expect(model.status.label).toContain('ș')
    expect(model.mainActivity?.label).toBe('Restaurante și baruri')
  })

  it('says a share of the economy only from 1%, and only for what the company can be placed in', () => {
    const snapshot: CompanyHubSnapshot = {
      ...COMPANY_HUB_SNAPSHOT,
      fiscalYear: 2025,
      national: { ...COMPANY_HUB_SNAPSHOT.national, turnover: 1_000_000 },
      sectors: [{ division: '56', activeFirms: 10, turnover: 20_000, employees: 1_000 }],
      counties: COMPANY_HUB_SNAPSHOT.counties.map((county) => (county.code === 'CJ' ? { ...county, turnover: 200_000 } : county)),
    }
    const model = buildCompanyProfileModel(companyProfile({ financials: [financialYear(2025, { turnover: 5_000, employees: 5 })] }), { snapshot })
    expect(model.place).toEqual({ label: 'Gherla, Cluj', county: 'Cluj', countyCode: 'CJ' })
    expect(model.context).toEqual({
      year: 2025,
      sectorTurnoverShare: 0.25,
      // 5 of 1.000: under the floor.
      sectorEmployeesShare: null,
      countyTurnoverShare: 0.025,
      nationalTurnoverShare: null,
    })
  })
})
