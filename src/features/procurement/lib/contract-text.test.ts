import { describe, expect, it, vi } from 'vitest'
import { cniRead, ctContext, plainRead } from './contract.fixture'
import { contractSheetOf, type ContractSheet, type CtOffers } from './contract-model'
import {
  amendmentsLede,
  associationNote,
  buyerYearText,
  criterionText,
  directText,
  estimateGap,
  fileText,
  headMoney,
  historyText,
  kindLabel,
  namesList,
  offersFate,
  offersFrom,
  republishedText,
  sellerYearText,
  valueBox,
  versionsText,
  yearFigures,
} from './contract-text'

vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

/**
 * The contract page's sentences: Romanian count grammar, the value said for
 * what it is, the association's and the versions' caveats, the amendments'
 * disagreement said first, the context by count — and nothing the data
 * would not support.
 */

/** The sentences keep a figure and its unit together (a no-break space); compared here as read. */
const spaced = (value: unknown): unknown => JSON.parse(JSON.stringify(value ?? null).replace(/\u00a0/gu, ' '))

const cni = contractSheetOf(cniRead())
const plain = contractSheetOf(plainRead())
const withValue = (sheet: ContractSheet, value: ContractSheet['value']): ContractSheet => ({ ...sheet, value })

describe('the record', () => {
  it('names its kind', () => {
    expect(kindLabel(cni)).toBe('Contract, în asociere')
    expect(kindLabel(plain)).toBe('Contract')
    expect(kindLabel({ ...plain, kind: 'framework' })).toBe('Acord-cadru')
    expect(kindLabel({ ...plain, kind: 'call-off' })).toBe('Contract subsecvent')
  })

  it('says its money short in the head, or why there is none to say', () => {
    expect(spaced(headMoney(plain.value))).toBe('3,1 mld. lei')
    expect(spaced(headMoney({ kind: 'converted', value: 1_200_000, currency: 'EUR' }))).toBe('1,2 mil. lei (echivalentul în lei al unei valori în EUR)')
    expect(spaced(headMoney({ kind: 'unverified', published: 3_234_147, reason: 'conflicting' }))).toBe('o valoare neverificată')
    expect(spaced(headMoney({ kind: 'missing', reason: 'foreign' }))).toBe('o valoare publicată doar în valută')
  })

  it('labels the value box for what it is, a dash beside SEAP’s figure when unchecked', () => {
    expect(spaced(valueBox(plain))).toEqual({ label: 'Valoarea contractului', figure: '3.068.398.862,94 lei', note: null, muted: false })
    expect(spaced(valueBox(withValue(plain, { kind: 'ceiling', value: 34_464 })))).toMatchObject({ label: 'Valoarea maximă', figure: '34.464 lei', muted: false })
    expect(spaced(valueBox(withValue(plain, { kind: 'unverified', published: 3_234_147, reason: 'conflicting' })))).toEqual({
      label: 'Valoarea',
      figure: '—',
      note: 'SEAP publică 3.234.147 lei, dar sursele SEAP nu se potrivesc între ele.',
      muted: true,
    })
  })

  it('says an association’s value is the whole contract’s', () => {
    expect(associationNote(cni.contract)).toBe('Valoarea e a întregului contract: SEAP o publică pe numele fiecăreia dintre cele 3 firme și nu spune cât revine fiecăreia.')
    expect(associationNote(plain.contract)).toBeNull()
  })

  it('says several values are not ranked — unless the notice’s value today is one of them', () => {
    expect(spaced(versionsText(cni.contract, null))).toBe('SEAP publică acest contract cu 3 valori diferite și nu spune care e în vigoare.')
    expect(spaced(versionsText(cni.contract, { value: 181_271_655.5, modified: 8 }))).toBe('SEAP publică acest contract cu 3 valori diferite; anunțul îl dă azi la 181,3 mil. lei, după 8 modificări.')
    expect(spaced(versionsText(plain.contract, null))).toBeNull()
  })

  it('leads the amendments with the first act whose reported values disagree with its text', () => {
    expect(spaced(amendmentsLede(cni))).toBe(
      'În SEAP: 4 acte adiționale. Valorile raportate nu se potrivesc cu textul actelor: actul nr. 5 spune +1,8 mil. lei, dar valoarea raportată se schimbă cu +171,8 mil. lei.',
    )
    expect(spaced(amendmentsLede(plain))).toBeNull()
  })

  it('names firms as a list', () => {
    expect(namesList(['Tehnostrade', 'Spedition UMB', 'SA & PE Construct'])).toBe('Tehnostrade, Spedition UMB și SA & PE Construct')
    expect(namesList(['Tehnostrade'])).toBe('Tehnostrade')
  })
})

describe('the award notice’s data, where it arrives', () => {
  const offers: CtOffers = { received: 3, admitted: 1, unaccepted: 2, nonconformed: null, withdrawn: null, sme: 2, eu: 1, nonEu: null }

  it('says the offers, what became of them and who sent them', () => {
    expect(offersFate(offers)).toBe('1 admisă · 2 inacceptabile')
    expect(offersFrom(offers)).toBe('2 de la IMM-uri · 1 dintr-un alt stat UE')
    expect(offersFate({ ...offers, received: 1, admitted: 1, unaccepted: null })).toBe('admisă')
  })

  it('says how far the contract came from the estimate, and the criterion as a reader writes it', () => {
    expect(spaced(estimateGap(4_300_406_164.41, 3_068_398_862.94))).toBe('contractul: cu 29% sub estimare')
    expect(spaced(estimateGap(100, 100.2))).toBeNull()
    expect(criterionText('Cel mai bun raport calitate - pret')).toBe('cel mai bun raport calitate–preț')
  })

  it('names an export file by its quarter and year', () => {
    expect(fileText({ year: '2024', quarter: '2' })).toBe('T2 2024')
    expect(fileText({ year: '2010', quarter: null })).toBe('2010')
  })

  it('says how often the award notice was republished', () => {
    expect(republishedText(1, '1 octombrie 2025')).toBe('republicat o dată, pe 1 octombrie 2025')
    expect(republishedText(8, '28 aprilie 2026')).toBe('republicat de 8 ori, ultima dată pe 28 aprilie 2026')
  })
})

describe('the context, by count', () => {
  it('tells the pair since 2019', () => {
    expect(spaced(historyText(ctContext(), false))).toBe('Din 2019 încoace, instituția i-a atribuit firmei 21 de contracte și 1 acord-cadru; primul, în 2019.')
    expect(spaced(historyText(ctContext({ years: [{ year: 2021, awards: 1, frameworks: 0, direct: 0, directLei: null }] }), false))).toBe('Din 2019 încoace, e singurul contract dintre ele.')
    expect(spaced(historyText(ctContext({ years: null }), false))).toBeNull()
  })

  it('adds the direct purchases, with their money only when every year has it', () => {
    expect(spaced(directText(ctContext()))).toBe('Firma i-a vândut și direct: 1 achiziție directă, 12.000 lei.')
    expect(spaced(directText(ctContext({ years: [{ year: 2020, awards: 0, frameworks: 0, direct: 2, directLei: null }] })))).toBe('Firma i-a vândut și direct: 2 achiziții directe.')
  })

  it('tells each side’s year — the year in progress through its cutoff month', () => {
    expect(spaced(buyerYearText(ctContext()))).toBe('În 2021, instituția a atribuit 1.447 de contracte, 15 acestei firme; și 12 acorduri-cadru, 1 acestei firme.')
    expect(spaced(sellerYearText(ctContext(), false))).toBe('Pentru firmă: în 2021 a câștigat 16 contracte, 15 de la această instituție.')
    const progress = ctContext({ year: 2026, through: '2026-05', seller: { awards: 1 }, pair: { awards: 1, frameworks: 0 } })
    expect(spaced(sellerYearText(progress, false))).toBe('Pentru firmă, e singurul contract câștigat în 2026 (până în mai).')
  })

  it('never calls a framework’s page „the only contract", and says an institution that awarded only frameworks so', () => {
    const one = ctContext({ seller: { awards: 1 }, pair: { awards: 1, frameworks: 1 } })
    expect(spaced(sellerYearText(one, true))).toBe('Pentru firmă: în 2021 a câștigat un singur contract, de la această instituție.')
    expect(spaced(buyerYearText(ctContext({ buyer: { awards: 0, frameworks: 12 }, pair: { awards: 0, frameworks: 1 } })))).toBe(
      'În 2021, instituția nu a atribuit contracte, doar 12 acorduri-cadru, 1 acestei firme.',
    )
  })

  it('says nothing for a side whose read failed', () => {
    expect(spaced(buyerYearText(ctContext({ buyer: null })))).toBeNull()
    expect(spaced(sellerYearText(ctContext({ pair: null }), false))).toBeNull()
  })

  it('reads a year’s column', () => {
    expect(yearFigures({ year: 2025, awards: 1, frameworks: 41, direct: 14, directLei: null })).toBe('1 contract, 41 de acorduri-cadru, 14 achiziții directe')
    expect(yearFigures({ year: 2020, awards: 0, frameworks: 0, direct: 0, directLei: null })).toBe('nimic între ele')
  })
})
