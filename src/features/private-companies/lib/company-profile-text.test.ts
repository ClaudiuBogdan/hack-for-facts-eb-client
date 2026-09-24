import { describe, expect, it, vi } from 'vitest'
import { buildCompanyProfileModel } from './company-profile-model'
import {
  changeNote,
  companySentence,
  countChangeNote,
  debtSentence,
  economyShares,
  financialLede,
  institutionName,
  moneyLede,
  moneyPeriod,
  nameLength,
  netChangeNote,
  statusNotice,
  statusText,
} from './company-profile-text'
import { balanceSummary, companyProfile, financialYear } from './company-profile.fixture'

// The page's language, pinned: the test environment activates English.
vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  getUserLocale: () => 'ro',
}))

/** Money as the page writes it: the figure, its scale and the unit held together by no-break spaces. */
const lei = (text: string) => text.replace(/ /gu, '\u00a0')

describe('the company in a sentence', () => {
  it('says what, where, since when and what it does, and only what the record has', () => {
    expect(companySentence(buildCompanyProfileModel(companyProfile()))).toBe(
      'Societate cu răspundere limitată din Gherla, Cluj, înregistrată în 2007. Activitatea principală: restaurante.',
    )
    expect(
      companySentence(
        buildCompanyProfileModel(
          companyProfile({ legalForm: null, registrationDate: null, geography: null, address: { display: '', county: null, locality: null }, fiscal: { ...companyProfile().fiscal, fiscalCaen: null } }),
        ),
      ),
    ).toBe('Firmă.')
  })

  it('lowers the activity’s first letter inside the sentence, not an acronym it starts with', () => {
    const withLabel = (label: string) =>
      companySentence(
        buildCompanyProfileModel(companyProfile({ caenActivities: [{ code: '5610', rev: 'rev2', label, source: 'onrc' }], registrationDate: null })),
      )
    expect(withLabel('Restaurante cu PVC')).toBe('Societate cu răspundere limitată din Gherla, Cluj. Activitatea principală: restaurante cu PVC.')
    expect(withLabel('TIC pentru restaurante')).toBe('Societate cu răspundere limitată din Gherla, Cluj. Activitatea principală: TIC pentru restaurante.')
  })

  it('sizes the heading by the name', () => {
    expect(['66 Jack SRL', 'ABC-CON-Internațional SRL', 'Societatea Națională de Transport Gaze Naturale Transgaz SA'].map(nameLength)).toEqual([
      'short',
      'medium',
      'long',
    ])
  })
})

describe('status', () => {
  const withStatus = (code: string, label: string) => buildCompanyProfileModel(companyProfile({ status: { code, label } }))

  it('says what a status out of business means for the figures, once', () => {
    expect(statusNotice(withStatus('1048', 'funcțiune'))).toBeNull()
    expect(statusNotice(withStatus('1084', 'radiată'))).toBe('Radiată din registrul comerțului: cifrele de mai jos sunt istoria ei.')
    expect(statusNotice(withStatus('1107', 'insolvență'))).toBe('În procedura insolvenței.')
    // The registry's own word, when it says more than the notice.
    expect(statusNotice(withStatus('1139', 'faliment'))).toBe('În procedura insolvenței: faliment.')
    expect(statusNotice(withStatus('1049', 'dizolvare'))).toBe('În dizolvare sau lichidare.')
  })

  it('writes the chip in the page’s words', () => {
    expect(statusText(withStatus('1048', 'funcțiune'))).toBe('În funcțiune')
    expect(statusText(withStatus('1107', 'insolvență'))).toBe('Insolvență')
    expect(statusText(buildCompanyProfileModel(companyProfile({ status: null })))).toBe('Stare necunoscută')
  })
})

describe('changes', () => {
  it('writes a change as a percent only where a percent does not lie', () => {
    expect(changeNote(100, 103.8, 2024)).toBe('+3,8% față de 2024')
    expect(changeNote(1_350, 1_000_000, 2024)).toBe('de 741 ori față de 2024')
    expect(changeNote(100, 1_250, 2024)).toBe('de 12,5 ori față de 2024')
    expect(changeNote(100, 100, 2024)).toBe('la fel ca în 2024')
    expect(changeNote(0, 100, 2024)).toBeNull()
    expect(changeNote(null, 100, 2024)).toBeNull()
  })

  it('says a net result that crossed zero in words', () => {
    const profit = financialYear(2024, { netProfit: 4_100_000 })
    const loss = financialYear(2025, { netProfit: 0, netLoss: 27_800_000 })
    expect(netChangeNote(profit, loss)).toBe(`în 2024: profit de ${lei('4,1 mil. lei')}`)
    expect(netChangeNote(loss, profit)).toBe(`în 2025: pierdere de ${lei('27,8 mil. lei')}`)
    expect(netChangeNote(financialYear(2024, { netProfit: 200 }), financialYear(2025, { netProfit: 150 }))).toBe('-25,0% față de 2024')
    expect(netChangeNote(null, loss)).toBeNull()
  })

  it('counts people up and down', () => {
    expect(countChangeNote(7_207, 6_701, 2024)).toBe('-506 față de 2024')
    expect(countChangeNote(2, 2, 2024)).toBe('la fel ca în 2024')
    expect(countChangeNote(null, 2, 2024)).toBeNull()
  })
})

describe('financialLede', () => {
  it('compares the newest year with the one before, and counts a long run of losses', () => {
    const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024].map((year) => financialYear(year, { turnover: 100, netProfit: 0, netLoss: 10 }))
    years.push(financialYear(2025, { turnover: 50, netProfit: 0, netLoss: 20 }))
    expect(financialLede(buildCompanyProfileModel(companyProfile({ financials: years })))).toBe(
      'În 2025, cifra de afaceri a scăzut cu 50,0%, iar pierderea a crescut. A încheiat cu pierdere 8 ani din 8.',
    )
  })

  it('says a newest statement is old news before anything else', () => {
    const model = buildCompanyProfileModel(companyProfile({ financials: [financialYear(2019, { turnover: 10, netProfit: 1 })] }))
    expect(financialLede(model)).toBe('Ultimul bilanț publicat este pe 2019.')
  })

  it('says nothing for a company that never filed', () => {
    expect(financialLede(buildCompanyProfileModel(companyProfile()))).toBeNull()
  })
})

describe('debtSentence', () => {
  const withBalance = (debts: number | null, totalEquity: number | null) =>
    debtSentence(buildCompanyProfileModel(companyProfile({ financials: [financialYear(2025, { summary: balanceSummary({ debts, totalEquity }) })] })))

  it('sets debts against equity, and says so when equity is gone', () => {
    expect(withBalance(10_500_000_000, 36_700_000_000)).toBe(`Datoriile, de ${lei('10,5 mld. lei')}, sunt 28,6% din capitalurile proprii.`)
    expect(withBalance(3_600_000_000, 673_300_000)).toBe(`Datoriile, de ${lei('3,6 mld. lei')}, sunt de 5,3 ori capitalurile proprii.`)
    expect(withBalance(38_900_000, -22_600_000)).toBe(`Datorii de ${lei('38,9 mil. lei')}, cu capitalurile proprii negative (${lei('-22,6 mil. lei')}).`)
    expect(withBalance(0, 10)).toBeNull()
  })
})

describe('public money', () => {
  const withMoney = (byFlowType: { flowType: string; totalRon: number | null; count: number }[], byYear: { year: number | null; flowType: string; totalRon: number | null; count: number }[]) =>
    buildCompanyProfileModel(companyProfile({ publicMoney: { totalRon: null, flowCount: 0, byFlowType, byYear } }))

  it('sums the published values without calling a contract a payment, and calls the sum a lower bound when some carry none', () => {
    const model = withMoney(
      [
        { flowType: 'procurement_contract', totalRon: 514_500_000, count: 70 },
        { flowType: 'direct_acquisition', totalRon: 3_400_000, count: 29 },
        { flowType: 'pnrr_payment', totalRon: null, count: 2 },
      ],
      [
        { year: 2016, flowType: 'procurement_contract', totalRon: 514_500_000, count: 70 },
        { year: 2025, flowType: 'direct_acquisition', totalRon: 3_400_000, count: 29 },
        { year: 2025, flowType: 'pnrr_payment', totalRon: null, count: 2 },
      ],
    )
    expect(moneyLede(model)).toBe(
      `Din 2016, firma apare în 70 de contracte, 29 de achiziții directe și 2 plăți din bani publici, cu valori publicate de ${lei('517,9 mil. lei')}.` +
        ' Pentru contracte și achiziții directe, valoarea e cea atribuită, nu ce s-a plătit efectiv.' +
        ' 2 înregistrări nu au valoare publicată, deci suma e o limită de jos.',
    )
    expect(moneyPeriod(model)).toBe('2016–2025')
  })

  it('says a period with records of no year apart', () => {
    const model = withMoney([{ flowType: 'direct_acquisition', totalRon: 168_068, count: 547 }], [
      { year: 2023, flowType: 'direct_acquisition', totalRon: 100_000, count: 400 },
      { year: null, flowType: 'direct_acquisition', totalRon: 68_068, count: 147 },
    ])
    expect(moneyPeriod(model)).toBe('2023 și fără an')
    expect(moneyLede(model)).toBe(
      `Firma apare în 547 de achiziții directe din bani publici, cu valori publicate de ${lei('168.068 lei')}; o parte nu are an în sursă.` +
        ' Pentru contracte și achiziții directe, valoarea e cea atribuită, nu ce s-a plătit efectiv.',
    )
  })

  it('says no period when the source gives no years, rather than records with no year', () => {
    const model = withMoney([{ flowType: 'pnrr_payment', totalRon: 90_000, count: 3 }], [])
    expect(moneyLede(model)).toBe(`Firma apare în 3 plăți din bani publici, cu valori publicate de ${lei('90.000 lei')}.`)
  })

  it('says payments are payments, and no amount when none was published', () => {
    const paid = withMoney([{ flowType: 'pnrr_payment', totalRon: 90_000, count: 3 }], [{ year: 2024, flowType: 'pnrr_payment', totalRon: 90_000, count: 3 }])
    expect(moneyLede(paid)).toBe(`În 2024, firma apare în 3 plăți din bani publici, cu valori publicate de ${lei('90.000 lei')}.`)
    const unvalued = withMoney([{ flowType: 'pnrr_payment', totalRon: 0, count: 2 }], [{ year: 2024, flowType: 'pnrr_payment', totalRon: 0, count: 2 }])
    expect(moneyLede(unvalued)).toBe('Firma apare în 2 plăți din bani publici, fără nicio valoare publicată.')
  })

  it('says nothing about money a company never received', () => {
    expect(moneyLede(buildCompanyProfileModel(companyProfile()))).toBeNull()
  })

  it('names an institution SEAP published without a name by what it has', () => {
    expect(institutionName('  ', '29469839')).toBe('Instituție fără nume publicat (CUI 29469839)')
    expect(institutionName(null, null)).toBe('Instituție fără nume publicat')
    expect(institutionName('COMUNA BREBENI', '1')).toBe('COMUNA BREBENI')
  })
})

describe('economyShares', () => {
  it('lists only the shares the model kept, and only those the page can name', () => {
    const model = buildCompanyProfileModel(companyProfile())
    const shares = economyShares({
      ...model,
      context: { year: 2025, sectorTurnoverShare: 0.756, sectorEmployeesShare: null, countyTurnoverShare: 0.029, nationalTurnoverShare: 0.011 },
    })
    expect(shares).toEqual([
      { key: 'sector-turnover', share: 0.756 },
      { key: 'county', share: 0.029 },
      { key: 'national', share: 0.011 },
    ])
    // With no division to name, a sector share is not said.
    expect(
      economyShares({ ...model, mainActivity: null, context: { year: 2025, sectorTurnoverShare: 0.5, sectorEmployeesShare: 0.5, countyTurnoverShare: null, nationalTurnoverShare: null } }),
    ).toEqual([])
  })
})
