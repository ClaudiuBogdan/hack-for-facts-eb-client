import { describe, expect, it } from 'vitest'
import { COMPANY_ANALYSIS_ACTIVITY_BASES } from '@/schemas/company-analytics'
import { COMPANY_ANAF_CAEN_FORMS, COMPANY_ANAF_ONRC_AGREEMENTS, type PrivateCompanyActivitySelection } from '@/schemas/private-company'
import { COMPANY_CAEN_CLASS_STATES, COMPANY_REGISTRY_COVERAGES } from '@/schemas/private-company-registry'
import { activity } from '../api/company-analytics.fixture'
import { ACTIVITY_SELECTIONS, activitySelectionFixture } from '../mocks/fixtures/activity-selection'
import {
  activityBasisLabel,
  activityDerivationText,
  activitySelectionTexts,
  activitySelectorText,
  activitySourceTag,
  activityText,
  anafFormText,
  caenClassStateText,
  truncatedObservationsText,
  unclassifiedActivityLabel,
} from './company-activity-text'

/**
 * The selection's words: a derived selection, never a principal (main)
 * activity; the only classified ONRC observation, never an exclusive one;
 * ANAF's code with its revision unpublished, never with one; an
 * uncatalogued code never a sector; no qualified selection never "no
 * activity"; each source's own date beside it.
 */

const PRINCIPAL = /principal|main activity/iu

function allTexts(selection: PrivateCompanyActivitySelection): string {
  return Object.values(activitySelectionTexts(selection)).filter(Boolean).join(' | ')
}

describe('the profile selection', () => {
  it.each(Object.entries(ACTIVITY_SELECTIONS))('%s: says it is derived, never a principal activity', (_name, selection) => {
    expect(allTexts(selection)).not.toMatch(PRINCIPAL)
  })

  it('every basis, form, agreement and coverage state words without "principal"', () => {
    for (const form of COMPANY_ANAF_CAEN_FORMS) {
      for (const agreement of COMPANY_ANAF_ONRC_AGREEMENTS) {
        for (const caenCoverage of COMPANY_REGISTRY_COVERAGES) {
          for (const basis of ['onrc_single_class', 'onrc_class_anaf_numeric_match', 'onrc_multiple_classes', 'anaf_fiscal_code', 'anaf_fiscal_uncatalogued', 'no_qualified_selection'] as const) {
            const texts = allTexts(activitySelectionFixture({ basis, anafCodeForm: form, agreement, caenCoverage, classKeyCount: 2 }))
            expect(texts).not.toMatch(PRINCIPAL)
            expect(texts).not.toBe('')
          }
        }
      }
    }
  })

  it('names the only classified ONRC observation, and says it is not exclusive', () => {
    const texts = activitySelectionTexts(ACTIVITY_SELECTIONS.onrcSingleClass)
    expect(texts.kicker).toBe('Activitate selectată (derivată) · CAEN 6201')
    expect(texts.basis).toContain('Singura activitate clasificată observată în ediția ONRC')
    expect(texts.basis).toContain('nu înseamnă că firma e autorizată doar pentru ea')
  })

  it('explains a numeric match as one of several classes chosen by ANAF’s digits, revision unpublished', () => {
    const texts = activitySelectionTexts(ACTIVITY_SELECTIONS.onrcNumericMatch)
    expect(texts.basis).toBe(
      'Una dintre cele 3 activități clasificate din ediția ONRC, aleasă pentru că are aceleași cifre ca codul CAEN fiscal ANAF (revizie nepublicată). Selecție derivată, nu o informație publicată de ONRC sau ANAF.',
    )
    // The match is the basis sentence: not said twice.
    expect(texts.agreement).toBeNull()
    expect(activitySelectionTexts(activitySelectionFixture({ basis: 'onrc_class_anaf_numeric_match', classKeyCount: 25 })).basis).toContain('Una dintre cele 25 de activități')
  })

  it('names ANAF’s code as the fiscal code with its revision unpublished', () => {
    const texts = activitySelectionTexts(ACTIVITY_SELECTIONS.anafConsensus)
    expect(texts.kicker).toBe('Activitate selectată (derivată) · cod CAEN fiscal ANAF, revizie nepublicată')
    expect(texts.basis).toContain('codul CAEN fiscal ANAF, revizie nepublicată')
  })

  it('keeps an uncatalogued ANAF code a source observation, never a classified sector', () => {
    expect(activitySelectionTexts(ACTIVITY_SELECTIONS.anafUncatalogued).basis).toContain('e o observație din sursă, nu un domeniu clasificat')
  })

  it('never says a company without a qualified selection has no activity', () => {
    expect(activitySelectionTexts(ACTIVITY_SELECTIONS.shortTokenOnly).basis).toBe(
      'Nicio selecție calificată. Asta nu înseamnă că firma nu are activitate: acoperirea și înscrierile de mai jos arată ce există.',
    )
  })

  it('shows the edition’s date and ANAF’s date beside the selection, and says when one is missing', () => {
    expect(activitySelectionTexts(ACTIVITY_SELECTIONS.onrcSingleClass).dates).toMatch(/^ediția ONRC publicată pe .+2026 · ANAF, situația la .+2026$/u)
    expect(activitySelectionTexts(activitySelectionFixture({ editionSourceDate: null, anafStatusDate: null })).dates).toBe('ediția ONRC mock-1 (dată de publicare necunoscută) · ANAF: fără dată de stare')
  })

  it('words every coverage state', () => {
    const coverage = (caenCoverage: PrivateCompanyActivitySelection['caenCoverage']) => activitySelectionTexts(activitySelectionFixture({ caenCoverage })).coverage
    expect(coverage('complete')).toBe('Înscrierile CAEN ale firmei din ediție sunt complete.')
    expect(coverage('complete_empty')).toMatch(/^Nicio activitate observată în ediția ONRC publicată pe .+\.$/u)
    expect(coverage('partial')).toBe('Doar o parte a înscrierilor CAEN e atribuită firmei: lista poate fi incompletă.')
    expect(coverage('unresolved')).toBe('Legături nerezolvate: lista poate fi incompletă.')
  })

  it('words every agreement, and every unusable ANAF form', () => {
    const agreement = (fields: Partial<PrivateCompanyActivitySelection>) => activitySelectionTexts(activitySelectionFixture(fields)).agreement
    expect(agreement({ agreement: 'match_one_key' })).toBe('Codul CAEN fiscal ANAF 6201 (revizie nepublicată) are aceleași cifre ca activitatea clasificată din ediție.')
    expect(agreement({ agreement: 'match_multiple_revisions', anafCode: '5211' })).toContain('din revizii CAEN diferite')
    expect(agreement({ agreement: 'differs', anafCode: '7022' })).toBe('Codul CAEN fiscal ANAF 7022 (revizie nepublicată) nu se regăsește printre activitățile clasificate din ediție.')
    expect(agreement({ agreement: 'no_class_key' })).toBeNull()
    expect(agreement({ agreement: 'anaf_missing' })).toBe('ANAF nu are un cod CAEN fiscal pentru firmă.')
    expect(agreement({ agreement: 'anaf_placeholder', anafCode: '0000' })).toBe('Codul CAEN fiscal ANAF 0000 este un cod substitut și nu e folosit la selecție.')
    expect(agreement({ agreement: 'anaf_not_usable', anafCodeForm: 'short', anafCode: '62', anafCodeUsable: false })).toBe(
      'Codul CAEN fiscal ANAF 62 nu e folosit la selecție: cod scurt în sursă (regula anaf-caen-form-policy-v1).',
    )
    expect(agreement({ agreement: 'anaf_not_usable', anafCodeForm: 'invalid', anafCode: null, anafCodeUsable: null, anafCaenFormPolicy: null })).toBe('Codul CAEN fiscal ANAF nu e folosit la selecție: cod nevalid în sursă.')
    expect(new Set(COMPANY_ANAF_CAEN_FORMS.map(anafFormText)).size).toBe(COMPANY_ANAF_CAEN_FORMS.length)
  })

  it('names a three-digit ANAF source code without claiming a lost zero, and says it was not used when the database says so — the form as the reason', () => {
    expect(anafFormText('three_digit')).toBe('cod sursă din trei cifre, completat de normalizator; interpretare necalificată')
    expect(activitySelectionTexts(ACTIVITY_SELECTIONS.threeDigitNotUsable).agreement).toBe(
      'Codul CAEN fiscal ANAF 0111 nu e folosit la selecție: cod sursă din trei cifre, completat de normalizator; interpretare necalificată (regula anaf-caen-form-policy-v1).',
    )
    // The database's verdict wins over any agreement it was paired with.
    expect(activitySelectionTexts(activitySelectionFixture({ agreement: 'differs', anafCodeForm: 'unbound', anafCodeUsable: false })).agreement).toContain('nu e folosit la selecție: observația ANAF')
    // A hypothetical policy that admits it: the match stands, the padding and the unqualified interpretation are said.
    expect(activitySelectionTexts(activitySelectionFixture({ anafCode: '0111', anafCodeForm: 'three_digit', anafCodeUsable: true })).agreement).toBe(
      'Codul CAEN fiscal ANAF 0111 (revizie nepublicată) are aceleași cifre ca activitatea clasificată din ediție. Codul ANAF are trei cifre în sursă; normalizatorul îl completează cu un zero, iar interpretarea lui nu e calificată.',
    )
  })

  it('says a four-digit placeholder the database calls unusable is a placeholder, never a form problem', () => {
    for (const anafCode of ['0000', '9999']) {
      const text = activitySelectionTexts(activitySelectionFixture({ anafCode, anafCodeForm: 'four_digit', anafCodeUsable: false, agreement: 'anaf_placeholder' })).agreement
      expect(text).toBe(`Codul CAEN fiscal ANAF ${anafCode} este un cod substitut și nu e folosit la selecție.`)
      expect(text).not.toContain(anafFormText('four_digit'))
      expect(text).not.toMatch(/regula/u)
    }
    expect(activitySelectionTexts(ACTIVITY_SELECTIONS.unresolvedPlaceholder).agreement).toBe('Codul CAEN fiscal ANAF 0000 este un cod substitut și nu e folosit la selecție.')
    // Any other unusable code still says its form.
    expect(activitySelectionTexts(activitySelectionFixture({ anafCode: '62', anafCodeForm: 'short', anafCodeUsable: false, agreement: 'differs' })).agreement).toBe(
      'Codul CAEN fiscal ANAF 62 nu e folosit la selecție: cod scurt în sursă (regula anaf-caen-form-policy-v1).',
    )
  })

  it('counts the edition’s exact observations, classes and unqualified rows', () => {
    expect(activitySelectionTexts(ACTIVITY_SELECTIONS.truncated).counts).toBe(
      '1.090 de observații CAEN în ediție · 312 activități clasificate · 7 observații necalificate (cod scurt, revizie necunoscută, cod fără denumire sau neinterpretabil)',
    )
    expect(activitySelectionTexts(ACTIVITY_SELECTIONS.onrcSingleClass).counts).toBe('O observație CAEN în ediție · o activitate clasificată · nicio observație necalificată')
  })

  it('says how many observations the edition has when the list shows fewer', () => {
    expect(truncatedObservationsText(1090, 500)).toBe('1.090 de observații CAEN în ediție; se afișează 500.')
  })
})

describe('observations', () => {
  it('says what a non-class row is; a short token is ambiguous between a class and a group', () => {
    expect(caenClassStateText('short_token')).toBe('cod scurt în sursă — clasă/grupă ambiguă')
    expect(caenClassStateText('class')).toBeNull()
    expect(caenClassStateText(null)).toBeNull()
    for (const state of COMPANY_CAEN_CLASS_STATES.filter((value) => value !== 'class')) expect(caenClassStateText(state)).not.toBeNull()
  })
})

describe('the analysis and the hub', () => {
  it('names every basis and unclassified bucket without "principal"', () => {
    for (const basis of COMPANY_ANALYSIS_ACTIVITY_BASES) {
      expect(activityBasisLabel(basis)).not.toMatch(PRINCIPAL)
      expect(unclassifiedActivityLabel(basis)).not.toMatch(PRINCIPAL)
    }
    expect(unclassifiedActivityLabel('NO_QUALIFIED_SELECTION')).toBe('Fără selecție calificată (nu înseamnă fără activitate)')
    expect(unclassifiedActivityLabel('ANAF_FISCAL_UNCATALOGUED')).toBe('Cod CAEN fiscal ANAF necatalogat (observație din sursă, nu un domeniu)')
    expect(activityDerivationText('2026-09-30')).not.toMatch(PRINCIPAL)
  })

  it('tags ONRC with its revision and ANAF as revision unpublished, never with one', () => {
    expect(activitySourceTag(activity())).toBe('ONRC Rev.2')
    expect(activitySourceTag(activity({ source: 'ANAF', revision: 'rev2' }))).toBe('ANAF · revizie nepublicată')
    expect(activitySourceTag(activity({ source: null }))).toBeNull()
  })

  it('writes an ANAF code with the catalog’s agreed text or its alternatives, never as an exact revision', () => {
    expect(activityText(activity())).toBe('6201 · Activități de realizare a soft-ului la comandă (software orientat client)')
    expect(activityText(activity({ source: 'ANAF', revision: null, label: 'Comerț', descriptionStatus: 'CONSENSUS', descriptions: [{ revision: 'rev2', label: 'Comerț' }, { revision: 'rev3', label: 'Comerț' }] }))).toBe(
      '6201 · Comerț (revizie nepublicată)',
    )
    expect(activityText(activity({ source: 'ANAF', revision: null, label: null, descriptionStatus: 'MISSING' }))).toBe('6201 (cod CAEN fiscal ANAF, revizie nepublicată)')
    expect(activitySelectorText({ source: 'ANAF', code: '6201' })).toBe('6201 (ANAF, revizie nepublicată)')
    expect(activitySelectorText({ source: 'ONRC', code: '6201', revision: 'rev3' })).toBe('6201 (ONRC Rev.3)')
  })
})
