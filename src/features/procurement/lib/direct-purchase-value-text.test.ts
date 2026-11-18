import { describe, expect, it, vi } from 'vitest'
import { valueOf, type DpValueFields } from './direct-purchase-value'
import { correctionText, inTotalsText, notCountedText, ruleText, supplierNameText, valueFigure, valueFigureLabel } from './direct-purchase-value-text'

const locale = vi.hoisted(() => ({ current: 'ro' }))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => locale.current }))

/** What the page says about the money and the supplier: the API's sentences in the page's language, framed, never invented. */

const NBSP = ' '

const fields = (over: Partial<DpValueFields> = {}): DpValueFields => ({
  reportedValue: 12500,
  counted: true,
  countedValue: 12500,
  notCountedReason: null,
  valueCorrected: false,
  rule: null,
  symbolicPrice: false,
  ...over,
})

const corrected = valueOf(
  fields({
    reportedValue: 3150000,
    countedValue: 3150,
    valueCorrected: true,
    rule: { code: 'quantity_unit_mix', effect: 'correct', sentence: { ro: 'Folosim cantitatea declarată.', en: 'We use the quantity stated for the purchase.' } },
  }),
)

const excluded = valueOf(
  fields({
    reportedValue: 1680000,
    counted: false,
    countedValue: null,
    notCountedReason: { code: 'reviewed_entry_error', label: { ro: 'Exclusă după verificare: vezi regula.', en: 'Left out after review: see the rule.' } },
    rule: { code: 'approximate_only', effect: 'exclude', sentence: { ro: 'O lăsăm în afara totalurilor.', en: 'We leave the purchase out of spending totals.' } },
  }),
)

describe('the value figure', () => {
  it('counted: the value, excluding VAT', () => {
    const value = valueOf(fields())
    expect(valueFigureLabel(value)).toBe('Valoarea, fără TVA')
    expect(valueFigure(value)).toBe(`12.500${NBSP}lei`)
    expect(inTotalsText(value)).toBe('Intră în totaluri.')
  })

  it('corrected: the corrected value, and both values said', () => {
    expect(valueFigureLabel(corrected)).toBe('Valoarea corectată, fără TVA')
    expect(valueFigure(corrected)).toBe(`3.150${NBSP}lei`)
    expect(inTotalsText(corrected)).toBe('Intră în totaluri cu valoarea corectată.')
    if (corrected.kind !== 'corrected') throw new Error('expected a correction')
    expect(correctionText(corrected)).toBe(`SEAP raportează 3.150.000${NBSP}lei; numărăm 3.150${NBSP}lei.`)
  })

  it('not counted: the reported value, labelled as reported, with no VAT claim', () => {
    expect(valueFigureLabel(excluded)).toBe('Valoarea raportată în SEAP')
    expect(valueFigure(excluded)).toBe(`1.680.000${NBSP}lei`)
    expect(inTotalsText(excluded)).toBe('Nu intră în totaluri.')
  })

  it('no closing value: a dash', () => {
    expect(valueFigure(valueOf(fields({ reportedValue: null, counted: false, countedValue: null, notCountedReason: null })))).toBe('—')
  })
})

describe("the API's sentences, in the page's language", () => {
  it('Romanian', () => {
    locale.current = 'ro'
    if (excluded.kind !== 'not-counted' || !excluded.rule || corrected.kind !== 'corrected') throw new Error('fixture')
    expect(notCountedText(excluded.reason)).toBe('Exclusă după verificare: vezi regula.')
    expect(ruleText(excluded.rule)).toBe('O lăsăm în afara totalurilor.')
    expect(ruleText(corrected.rule)).toBe('Folosim cantitatea declarată.')
  })

  it('English', () => {
    locale.current = 'en'
    if (excluded.kind !== 'not-counted' || !excluded.rule) throw new Error('fixture')
    expect(notCountedText(excluded.reason)).toBe('Left out after review: see the rule.')
    expect(ruleText(excluded.rule)).toBe('We leave the purchase out of spending totals.')
    locale.current = 'ro'
  })

  it('a reason with no sentence says nothing', () => {
    expect(notCountedText({ code: 'other', label: { ro: null, en: null } })).toBeNull()
  })
})

describe('the supplier (D6)', () => {
  it('a company by its name', () => {
    expect(supplierNameText({ kind: 'company', name: 'TEHNOSTRADE SRL', cui: '17042060' })).toBe('Tehnostrade SRL')
  })

  it('anyone else as a natural person', () => {
    expect(supplierNameText({ kind: 'natural-person' })).toBe('Persoană fizică')
  })

  it('no supplier, said', () => {
    expect(supplierNameText({ kind: 'none' })).toBe('Furnizor neindicat în SEAP')
  })
})
