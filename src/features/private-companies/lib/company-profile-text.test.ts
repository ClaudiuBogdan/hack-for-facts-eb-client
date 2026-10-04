import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { admittedQualification } from '../mocks/fixtures/qualification'
import { buildCompanyProfileModel } from './company-profile-model'
import {
  changeNote,
  companySentence,
  countChangeNote,
  debtSentence,
  financialLede,
  institutionName,
  metricStatusLabel,
  moneyLede,
  moneyPeriod,
  nameLength,
  netChangeNote,
  netResultStatusLabel,
  notAssessedLabel,
  notAssessedNotice,
  otherBasisNotice,
  qualificationLede,
  statementPublisherLabel,
  statementStateLabel,
  statusNotice,
  statusText,
} from './company-profile-text'
import { balanceSummary, companyProfile, financialYear } from './company-profile.fixture'
import { notAssessed } from './financial-qualification'
import { MOCK_REGISTRY_ENVELOPE, mockRegistryEvidence, registryStateEvidence } from '../mocks/fixtures/registry'

// The page's language, pinned: the test environment activates English.
vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  getUserLocale: () => 'ro',
}))

/** Money as the page writes it: the figure, its scale and the unit held together by no-break spaces. */
const lei = (text: string) => text.replace(/ /gu, '\u00a0')

describe('the company in a sentence', () => {
  it('says what, where and what it declared to ANAF, and only what the record has — never a year', () => {
    // ANAF published no CAEN revision for 5610: the sentence names no activity rather than borrow the registry's name.
    expect(companySentence(buildCompanyProfileModel(companyProfile()))).toBe('Societate cu răspundere limitată din Gherla, Cluj.')
    expect(
      companySentence(buildCompanyProfileModel(companyProfile({ fiscal: { ...companyProfile().fiscal, fiscalCaen: { code: '5610', rev: 'rev2' } } }))),
    ).toBe('Societate cu răspundere limitată din Gherla, Cluj. Activitatea principală declarată la ANAF: restaurante.')
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
        buildCompanyProfileModel(
          companyProfile({
            caenActivities: [{ code: '5610', rev: 'rev2', label, source: 'onrc' }],
            fiscal: { ...companyProfile().fiscal, fiscalCaen: { code: '5610', rev: 'rev2' } },
            registrationDate: null,
          }),
        ),
      )
    expect(withLabel('Restaurante cu PVC')).toBe('Societate cu răspundere limitată din Gherla, Cluj. Activitatea principală declarată la ANAF: restaurante cu PVC.')
    expect(withLabel('TIC pentru restaurante')).toBe('Societate cu răspundere limitată din Gherla, Cluj. Activitatea principală declarată la ANAF: TIC pentru restaurante.')
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
    // No consensus in the edition: said as such, never „unknown" or a guess.
    expect(statusText(buildCompanyProfileModel(companyProfile({ status: null })))).toBe('Stare neconfirmată în registru')
  })

  it('says a conflict as a conflict, naming the „în funcțiune" observation among the others', () => {
    const registry = mockRegistryEvidence({ identifier: 'J1', name: 'X SRL', legalForm: 'SRL', recordedDate: null, countyCode: null, countyName: null, statusCodes: ['1048', '1084'], caen: [] })
    const model = buildCompanyProfileModel(companyProfile({ status: null, registry }))
    expect(statusText(model)).toBe('Stări diferite în registru')
    expect(statusNotice(model)).toBe(
      'Înscrierile din registru au stări diferite, între care una „în funcțiune”; toate sunt listate în secțiunea Registru, niciuna nu e aleasă.',
    )
  })

  it('says a CUI outside the edition is outside the edition, never unregistered; an unpublished registry as a state', () => {
    const outside = buildCompanyProfileModel(companyProfile({ status: null, registry: registryStateEvidence(MOCK_REGISTRY_ENVELOPE, 'not_in_edition') }))
    expect(statusText(outside)).toBe('Fără profil în ediția ONRC')
    expect(statusNotice(outside)).toBe('Ediția ONRC afișată nu are un profil public calificat pentru acest CUI. Asta nu înseamnă că firma nu este înregistrată.')
    const unpublished = buildCompanyProfileModel(
      companyProfile({ status: null, registry: registryStateEvidence({ ...MOCK_REGISTRY_ENVELOPE, state: 'unpublished', editionId: null }, 'unpublished') }),
    )
    expect(statusText(unpublished)).toBe('Registru indisponibil')
    expect(statusNotice(unpublished)).toMatch(/nu are încă o ediție publicată.*nu sunt disponibile, nu lipsesc/u)
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
      'În 2025, cifra de afaceri a scăzut cu 50,0%, iar pierderea a crescut. A încheiat cu pierdere 8 ani din cei 8 cu rezultat net admis.',
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

describe('qualification in words (CD-14)', () => {
  /** A statement as the evaluator held it: these statuses over the admitted defaults. */
  const held = (year: number, values: Parameters<typeof financialYear>[1], statuses: Parameters<typeof admittedQualification>[1]) => {
    const base = financialYear(year, values)
    return { ...base, qualification: admittedQualification(base, statuses) }
  }

  it('compares nothing held, nothing across policies, and counts losses only among reported results', () => {
    const before = financialYear(2024, { turnover: 100, netProfit: 0, netLoss: 10 })
    const turnoverHeld = held(2025, { turnover: 50, netProfit: 0, netLoss: 20 }, { turnover: 'held_observation' })
    // No turnover movement from a held turnover; the sentence has nothing else to stand on.
    expect(financialLede(buildCompanyProfileModel(companyProfile({ financials: [before, turnoverHeld] })))).toBeNull()
    const otherPolicy = { ...financialYear(2025, { netProfit: 0, netLoss: 20 }), qualification: { ...financialYear(2025, { netProfit: 0, netLoss: 20 }).qualification, policySha256: 'b2'.repeat(32) } }
    expect(netChangeNote(before, otherPolicy)).toBeNull()
    const years = [2018, 2019, 2020, 2021].map((year) => financialYear(year, { turnover: 100, netProfit: 0, netLoss: 10 }))
    years.push(held(2022, { turnover: 100, netProfit: 0, netLoss: 10 }, { net_loss: 'held_observation', net_result: 'held_component' }))
    years.push(financialYear(2023, { turnover: 50, netProfit: 0, netLoss: 20 }))
    // Six statements, five reported results: the held 2022 is neither a loss nor a profit here,
    // and the sentence says its count is of the admitted results, and how many it leaves out (D1-C04).
    expect(financialLede(buildCompanyProfileModel(companyProfile({ financials: years })))).toBe(
      'Ultimul bilanț publicat este pe 2023. În 2023, cifra de afaceri a scăzut cu 50,0%. A încheiat cu pierdere 5 ani din cei 5 cu rezultat net admis. Rezultatul net al încă unui bilanț nu e numărat: lipsește, e reținut, nu a fost calificat sau ține de altă politică.',
    )
    // A statement on another basis is left out of the count the same way.
    const rebased = years.map((year) => (year.fiscalYear === 2018 ? { ...year, qualification: { ...year.qualification, releaseId: '1' } } : year))
    expect(financialLede(buildCompanyProfileModel(companyProfile({ financials: rebased })))).toBe(
      'Ultimul bilanț publicat este pe 2023. În 2023, cifra de afaceri a scăzut cu 50,0%. A încheiat cu pierdere 4 ani din cei 4 cu rezultat net admis. Rezultatul net al altor 2 bilanțuri nu e numărat: lipsește, e reținut, nu a fost calificat sau ține de altă politică.',
    )
  })

  it('says the loss count is of the admitted results in English too (D1-C04)', () => {
    // A live entry of the English catalog, not an obsolete `#~` one.
    const catalog = readFileSync(resolve(process.cwd(), 'src/locales/en/messages.po'), 'utf8')
    const entry = (source: RegExp) => catalog.split('\n\n').find((block) => source.test(block))
    expect(entry(/^msgid "\{lossYears, plural, one \{A încheiat cu pierdere un an din cei \{counted\} cu rezultat net admis/m)).toMatch(
      /msgstr "\{lossYears, plural, one \{It made a loss in one of the \{counted\} years with an admitted net result\.\} other \{It made a loss in # of the \{counted\} years with an admitted net result\.\}\}"/,
    )
    expect(entry(/^msgid "\{uncounted, plural, one \{Rezultatul net al încă unui bilanț nu e numărat/m)).toMatch(/msgstr "\{uncounted, plural, one \{The net result of one more statement is not counted: .*other \{The net results of # more statements are not counted: /)
  })

  it('sets no ratio on a held balance value', () => {
    const debtsHeld = held(2025, { summary: balanceSummary({ debts: 10, totalEquity: 5 }) }, { debts: 'held_observation' })
    expect(debtSentence(buildCompanyProfileModel(companyProfile({ financials: [debtsHeld] })))).toBeNull()
    const equityHeld = held(2025, { summary: balanceSummary({ debts: 10, totalEquity: 5 }) }, { total_equity: 'held_profile' })
    expect(debtSentence(buildCompanyProfileModel(companyProfile({ financials: [equityHeld] })))).toBe(`Datorii de ${lei('10 lei')} la sfârșitul lui 2025.`)
  })

  it('names the policy and a statement it could not assess', () => {
    const model = buildCompanyProfileModel(companyProfile({ financials: [financialYear(2025, { turnover: 5 })] }))
    expect(qualificationLede(model)).toBe(
      'Cifrele, graficele și comparațiile folosesc doar valorile admise de politica de calificare companies-analytics-admission-2026-10-02-q1, aprobată pe 2026-10-02. Admisă înseamnă extrasă și încadrată după regulile politicii, nu verificată economic.',
    )
    expect(notAssessedNotice(model)).toBeNull()
    const unassessed = buildCompanyProfileModel(
      companyProfile({ financials: [{ ...financialYear(2025, { turnover: 5 }), qualification: notAssessed('qualification_unavailable') }] }),
    )
    expect(qualificationLede(unassessed)).toBeNull()
    expect(notAssessedNotice(unassessed)).toBe(
      'Bilanțul pe 2025 nu a putut fi calificat (calificarea nu este disponibilă acum): valorile lui sunt cele publicate de sursă și nu intră în cifre, grafice sau comparații.',
    )
    expect(metricStatusLabel('held_observation')).toBe('reținută după verificare')
    expect(metricStatusLabel(null)).toBe('necalificată')
    expect(notAssessedLabel('a-reason-from-the-future')).toBe('politica de calificare nu poate fi aplicată')
  })

  it('names the basis of the series, the statements outside it, and each statement’s state (D1-C01, D1-C03)', () => {
    const years = [2021, 2022, 2023].map((year) => financialYear(year, { turnover: 10 }))
    const unassessedNewest = buildCompanyProfileModel(
      companyProfile({ financials: [...years, { ...financialYear(2024, { turnover: 5 }), qualification: notAssessed('qualification_unavailable') }] }),
    )
    // The series still stand on 2021–2023: the page names their policy, and the newest's state.
    expect(qualificationLede(unassessedNewest)).toMatch(/politica de calificare companies-analytics-admission-2026-10-02-q1/u)
    expect(notAssessedNotice(unassessedNewest)).toMatch(/^Bilanțul pe 2024 nu a putut fi calificat/u)
    expect(otherBasisNotice(unassessedNewest)).toBeNull()
    expect(unassessedNewest.qualification.statements.map(statementStateLabel)).toEqual([
      'necalificat (calificarea nu este disponibilă acum)',
      'toate valorile admise',
      'toate valorile admise',
      'toate valorile admise',
    ])

    const rebased = buildCompanyProfileModel(
      companyProfile({ financials: years.map((year) => (year.fiscalYear < 2023 ? { ...year, qualification: { ...year.qualification, policySha256: 'b2'.repeat(32) } } : year)) }),
    )
    expect(otherBasisNotice(rebased)).toBe(
      'Bilanțurile pe 2021–2022 au fost calificate după altă politică sau altă ediție a datelor: nu intră în grafice, comparații și numărătoarea pierderilor alături de ceilalți ani; valorile lor sunt listate mai jos.',
    )
    expect(rebased.qualification.statements.map(statementStateLabel)).toEqual([
      'toate valorile admise',
      'calificat după altă politică sau altă ediție a datelor',
      'calificat după altă politică sau altă ediție a datelor',
    ])
    expect(statementPublisherLabel('mfp')).toBe('Ministerul Finanțelor')
    expect(statementPublisherLabel(null)).toBe('sursă nenumită')
  })

  it('explains a held derived net without a value, apart from its published components (D1-C02)', () => {
    const fourSixFour = held(2024, { netProfit: 120, employees: 7 }, { gross_loss: 'held_profile', net_loss: 'missing', net_result: 'held_profile' })
    const [statement] = buildCompanyProfileModel(companyProfile({ financials: [fourSixFour] })).qualification.statements
    // Every published value admitted, the derived net held: the heading says both.
    expect(statementStateLabel(statement!)).toBe('valorile publicate admise; rezultatul net reținut')
    expect(statement?.netResult).toEqual({ status: 'held_profile', value: null })
    expect(netResultStatusLabel('held_profile')).toBe('reținut: pentru această formă de bilanț nu se calculează din profit și pierdere')
    expect(netResultStatusLabel('held_component')).toBe('reținut: profitul sau pierderea publicată e reținută')
    expect(netResultStatusLabel('missing')).toBe('nu se poate calcula: nici profitul, nici pierderea nu sunt publicate')
    const heldTurnover = held(2024, { turnover: 1, employees: 2 }, { turnover: 'held_observation' })
    expect(statementStateLabel(buildCompanyProfileModel(companyProfile({ financials: [heldTurnover] })).qualification.statements[0]!)).toBe(
      '1 valoare ținută în afara cifrelor',
    )
  })
})
