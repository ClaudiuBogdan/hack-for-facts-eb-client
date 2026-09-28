import { describe, expect, it, vi } from 'vitest'
import { i18n } from '@lingui/core'
import { buyerProfile } from './buyer.fixture'
import {
  balanceLede,
  buyerKind,
  changeText,
  countyShareLede,
  decemberLede,
  headSentence,
  procedureLede,
  sellersLede,
  steadyLede,
  whatLede,
  whereLede,
  yearsLede,
} from './buyer-text'

vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

/**
 * The page's sentences hold for any buyer: each is computed from the read,
 * uses Romanian noun-count grammar („12 contracte", „21 de contracte"), and is
 * left out when the data would contradict it.
 */

const none = { count: 0, valued: 0, value: null, suppliers: 0 } as const

describe('the head', () => {
  it('says what the buyer is, where, and what it bought in the year', () => {
    expect(headSentence(buyerProfile())).toBe(
      'Oraș din județul Ilfov, cu 22.660 de locuitori. În 2025 a făcut 293 de achiziții directe, de 36,4\u00a0mil.\u00a0lei fără TVA, și a atribuit 12 contracte.',
    )
  })

  it('names a hospital, a buyer the budget platform does not know, and a year with nothing', () => {
    const hospital = buyerProfile({
      county: 'B',
      identity: { ...buyerProfile().identity, entityType: 'health', isTownHall: false, population: null },
      awards: { ...none, count: 0 },
    })
    // No award in the year, one framework agreement: said, so the year does not read as only direct.
    expect(headSentence(hospital)).toBe(
      'Unitate sanitară din București. În 2025 a făcut 293 de achiziții directe, de 36,4\u00a0mil.\u00a0lei fără TVA, și a semnat 1 acord-cadru.',
    )
    const unknown = buyerProfile({ identity: { ...buyerProfile().identity, entityType: null, isTownHall: false }, county: null })
    expect(buyerKind(unknown.identity)).toBe('Cumpărător public')
    expect(headSentence(buyerProfile({ direct: none, awards: none, frameworks: 0 }))).toContain('În 2025 nu are achiziții publicate în SEAP.')
    expect(headSentence(buyerProfile({ direct: none, awards: none, frameworks: 3 }))).toContain('În 2025 a semnat 3 acorduri-cadru.')
  })

  it('names a county council, a sector town hall and a state company for what they are', () => {
    const identity = buyerProfile().identity
    const council = buyerProfile({ county: 'CJ', identity: { ...identity, name: 'Județul Cluj', place: { kind: 'county', name: 'CLUJ', countyCode: 'CJ', countyName: 'CLUJ' }, population: { year: 2025, value: 745_520 } } })
    expect(headSentence(council)).toMatch(/^Consiliu județean, cu 745.520 de locuitori în județ\./)
    expect(buyerKind({ ...identity, place: { kind: 'sector', name: 'SECTORUL 3', countyCode: 'B', countyName: 'BUCUREȘTI' } })).toBe('Primărie de sector')
    expect(buyerKind({ ...identity, isTownHall: false, entityType: 'public_entity', name: 'Compania Naţională de Administrare a Infrastructurii Rutiere S.A.' })).toBe('Companie')
    expect(buyerKind({ ...identity, isTownHall: false, entityType: null, name: 'Regia Nationala a Padurilor Romsilva RA' })).toBe('Regie autonomă')
  })

  it('does not call a CUI with no record since 2019 a buyer', () => {
    const none = { count: 0, valued: 0, value: null, suppliers: 0 }
    const supplier = buyerProfile({ identity: { ...buyerProfile().identity, entityType: null, isTownHall: false }, direct: none, awards: none, frameworks: 0, directYears: [], awardYears: [] })
    expect(headSentence(supplier)).toBe('Nu apare ca cumpărător în SEAP din 2019 încoace.')
  })

  it('writes „de" before a count ending in 20–99 or 00 and not before 01–19', () => {
    const people = (value: number) => buyerProfile({ identity: { ...buyerProfile().identity, population: { year: 2025, value } } })
    expect(headSentence(people(3_553))).toContain('cu 3.553 de locuitori')
    expect(headSentence(people(21_016))).toContain('cu 21.016 locuitori')
  })

  it('writes a change as a signed, rounded percentage', () => {
    expect(changeText(36_404_737, 25_300_000)).toBe('+44%')
    expect(changeText(45, 50)).toBe('−10%')
    expect(changeText(1, 0)).toBeNull()
    expect(changeText(null, 1)).toBeNull()
  })
})

describe('what it buys', () => {
  it('names the leading category while it holds a fifth of the money and leads every bucket', () => {
    const profile = buyerProfile()
    // Under a half is the largest share, never „most".
    expect(whatLede(profile.categories.direct, 'direct', 2025, i18n)).toBe(
      'Categoria cu cei mai mulți bani ai achizițiilor directe din 2025: alte lucrări de construcții, cu 23%. Urmează proiectare și inginerie, cu 15%.',
    )
    expect(whatLede(profile.categories.contract, 'contract', 2025, i18n)).toBe(
      'Mai mult de jumătate din valoarea contractelor atribuite în 2025 (64%) a mers pe alte lucrări de construcții.',
    )
  })

  it('keeps an acronym whole mid-sentence, and says a whole share as all of it', () => {
    const it = { category: { key: 'it', label: { id: 'IT și telecomunicații', message: 'IT și telecomunicații' }, prefixes: ['72'] }, value: 40, count: 4, share: 0.4 }
    const roads = { ...buyerProfile().categories.direct[0]!, value: 60, share: 0.6 }
    expect(whatLede([it as never, { ...roads, share: 0.3, value: 30 }], 'direct', 2025, i18n)).toContain(': IT și telecomunicații, cu 40%.')
    expect(whatLede([{ ...roads, share: 1, value: 100 }], 'contract', 2025, i18n)).toBe('Toată valoarea contractelor atribuite în 2025 a mers pe alte lucrări de construcții.')
  })

  it('says nothing when no named category reaches a fifth', () => {
    const [first] = buyerProfile().categories.direct
    expect(whatLede([{ ...first!, share: 0.15 }], 'direct', 2025, i18n)).toBeNull()
  })
})

describe('who sells', () => {
  it('sums the top five firms and names the largest when it holds a tenth', () => {
    expect(sellersLede(buyerProfile())).toBe(
      'Cinci firme au primit 44% din banii achizițiilor directe din 2025; au vândut 72 de firme în total. Cea mai mare sumă, 13%, a mers la Upper Level SRL.',
    )
  })

  it('says nothing about value shares when the server ranked by count', () => {
    const profile = buyerProfile()
    expect(sellersLede(buyerProfile({ directSuppliers: { ...profile.directSuppliers, rankedBy: 'count' } }))).toBeNull()
  })

  it('names one steady seller, and counts them when they are many', () => {
    const profile = buyerProfile()
    expect(steadyLede(profile, profile.supplierYears, 2025)).toBe('Costalex Construct SRL i-a vândut aproape în fiecare an din 2019 încoace.')
    expect(steadyLede(profile, profile.supplierYears.slice(1), 2025)).toBeNull()
  })
})

describe('where, when and how', () => {
  it("gives the home county's share, and the capital's past a tenth", () => {
    expect(whereLede(buyerProfile())).toBe(
      '51% din banii achizițiilor directe au mers la firme din Ilfov, județul instituției. 34% au mers la firme din București.',
    )
  })

  it('tells a trend of half or more since 2019, in each year’s lei, and a December that holds 15% of the year or more', () => {
    // 28,4 to 36,4 mil. lei is +28%, less than prices rose: no sentence.
    expect(yearsLede(buyerProfile())).toBeNull()
    const doubled = buyerProfile({ directYears: [{ year: 2019, value: 18_000_000, count: 200 }, { year: 2025, value: 36_404_737, count: 293 }] })
    expect(yearsLede(doubled)).toBe(
      'Între 2019 și 2025, achizițiile directe au crescut de la 18,0\u00a0mil.\u00a0lei la 36,4\u00a0mil.\u00a0lei pe an, în lei ai fiecărui an.',
    )
    expect(decemberLede(buyerProfile())).toBe('Decembrie a adus 16% din banii achizițiilor directe ale anului, de 1,9 ori cât o lună obișnuită.')
    const flat = buyerProfile({ directMonths: buyerProfile().directMonths.map((month) => ({ ...month, value: 1_000_000 })) })
    expect(decemberLede(flat)).toBeNull()
  })

  it('says a year in progress bought only directly so far, not for the year', () => {
    const only = buyerProfile({ awards: { count: 0, valued: 0, value: null, suppliers: 0 }, frameworks: 0 })
    expect(balanceLede(only)).toBe('În 2025 a cumpărat doar direct, din catalogul SEAP: nicio procedură nu s-a încheiat cu un contract atribuit.')
    expect(balanceLede({ ...only, year: 2026, through: '2026-05' })).toBe(
      'Până în mai 2026 a cumpărat doar direct, din catalogul SEAP: nicio procedură nu s-a încheiat încă cu un contract atribuit.',
    )
  })

  it('reads the years to the last complete one from the year in progress: a part year is no year’s total', () => {
    const years = [
      { year: 2019, value: 18_000_000, count: 200 },
      { year: 2025, value: 36_404_737, count: 293 },
      { year: 2026, value: 2_600_000, count: 46 },
    ]
    expect(yearsLede(buyerProfile({ year: 2026, through: '2026-05', directYears: years }))).toContain('au crescut de la 18,0')
    // Its months stop at the cutoff: no December to weigh.
    const part = buyerProfile({ year: 2026, through: '2026-05', directMonths: buyerProfile().directMonths.map((month, index) => ({ ...month, month: `2026-${month.month.slice(5)}`, value: index < 5 ? 1_000_000 : null })) })
    expect(decemberLede(part)).toBeNull()
  })

  it('counts the awards negotiated without a notice, with the count grammar', () => {
    expect(procedureLede(buyerProfile())).toBe('Toate cele 12 contracte atribuite în 2025 au avut un anunț public.')
    const mixed = buyerProfile({
      procedures: [
        { key: 'Licitatie deschisa', count: 18 },
        { key: 'Negociere fara publicare prealabila', count: 3 },
      ],
    })
    expect(procedureLede(mixed)).toBe('3 din cele 21 de contracte atribuite în 2025 au fost negociate fără anunț prealabil.')
    expect(procedureLede(buyerProfile({ procedures: [] }))).toBeNull()
    // Awards with no procedure on record: never „all had a notice".
    expect(procedureLede(buyerProfile({ proceduresUnlisted: 6 }))).toBeNull()
    const one = buyerProfile({ procedures: [{ key: 'Licitatie deschisa', count: 11 }, { key: 'Negociere fara publicare prealabila', count: 1 }] })
    expect(procedureLede(one)).toBe('Un contract din cele 12 contracte atribuite în 2025 a fost negociat fără anunț prealabil.')
  })

  it('sets direct purchases beside contract awards without summing them', () => {
    expect(balanceLede(buyerProfile())).toBe('Cumpără mai ales direct: la fiecare contract atribuit, 24 de achiziții directe.')
    expect(balanceLede(buyerProfile({ awards: none, frameworks: 0 }))).toContain('a cumpărat doar direct')
    // Framework agreements signed: it did not buy only directly.
    expect(balanceLede(buyerProfile({ awards: none, frameworks: 2 }))).toBeNull()
    expect(balanceLede(buyerProfile({ direct: none }))).toBeNull()
  })

  it('gives the county share from 1%', () => {
    expect(countyShareLede(buyerProfile())).toBe(
      'Instituția a făcut 6,5% din achizițiile directe ale tuturor cumpărătorilor publici din județul Ilfov în 2025, după valoare.',
    )
    expect(countyShareLede(buyerProfile({ countyShare: { county: 'IF', share: 0.004 } }))).toBeNull()
  })
})
