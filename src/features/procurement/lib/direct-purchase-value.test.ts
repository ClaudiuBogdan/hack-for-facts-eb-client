import { describe, expect, it } from 'vitest'
import { countedValueOf, reportedApartOf, supplierNameOf, valueOf, type DpValueFields } from './direct-purchase-value'

/**
 * The serving contract's example rows (release 1), each read as the page
 * shows it, and the combinations the contract does not allow, which the page
 * never shows as more than they support.
 */

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

const reason = (code: string) => ({ code, label: { ro: `ro:${code}`, en: `en:${code}` } })
const rule = (code: string, effect: string | null) => ({ code, effect, sentence: { ro: `ro:${code}`, en: `en:${code}` } })

describe('valueOf — the contract example rows', () => {
  it('counted as reported', () => {
    const value = valueOf(fields())
    expect(value).toEqual({ kind: 'counted', value: 12500, reported: 12500, symbolic: false })
    expect(countedValueOf(value)).toBe(12500)
    expect(reportedApartOf(value)).toBeNull()
  })

  it('corrected: both values and the rule', () => {
    const value = valueOf(fields({ reportedValue: 3150000, countedValue: 3150, valueCorrected: true, rule: rule('quantity_unit_mix', 'correct') }))
    expect(value).toEqual({ kind: 'corrected', value: 3150, reported: 3150000, rule: rule('quantity_unit_mix', 'correct') })
    expect(countedValueOf(value)).toBe(3150)
    expect(reportedApartOf(value)).toBe(3150000)
  })

  it.each([
    ['approximate_only', 1680000],
    ['exceeds_buyer_spending', 358324000],
  ])('excluded by review (%s): reported shown, not summed, reason and rule', (code, reported) => {
    const value = valueOf(fields({ reportedValue: reported, counted: false, countedValue: null, notCountedReason: reason('reviewed_entry_error'), rule: rule(code, 'exclude') }))
    expect(value).toEqual({ kind: 'not-counted', reported, reason: { code: 'reviewed_entry_error', label: reason('reviewed_entry_error').label }, rule: rule(code, 'exclude') })
    expect(countedValueOf(value)).toBeNull()
    expect(reportedApartOf(value)).toBe(reported)
  })

  it('an open review case is served as its current state: counted, no rule, no review label', () => {
    expect(valueOf(fields({ reportedValue: 188800000, countedValue: 188800000 }))).toEqual({ kind: 'counted', value: 188800000, reported: 188800000, symbolic: false })
  })

  it.each(['not_accepted', 'value_not_qualified'])('not counted (%s) with no rule', (code) => {
    const value = valueOf(fields({ reportedValue: 40000, counted: false, countedValue: null, notCountedReason: reason(code) }))
    expect(value).toMatchObject({ kind: 'not-counted', reported: 40000, reason: { code }, rule: null })
  })

  it('symbolic price: counted, flagged', () => {
    expect(valueOf(fields({ reportedValue: 0.01, countedValue: 0.01, symbolicPrice: true }))).toEqual({ kind: 'counted', value: 0.01, reported: 0.01, symbolic: true })
  })

  it('no closing value: not counted, nothing reported', () => {
    expect(valueOf(fields({ reportedValue: null, counted: false, countedValue: null, notCountedReason: reason('closing_value_missing') }))).toMatchObject({
      kind: 'not-counted',
      reported: null,
      reason: { code: 'closing_value_missing' },
    })
  })
})

describe('valueOf — combinations the contract does not allow', () => {
  it('counted with no counted value is not counted, and gives no reason it does not have', () => {
    const value = valueOf(fields({ countedValue: null }))
    expect(value).toEqual({ kind: 'not-counted', reported: 12500, reason: { code: 'other', label: { ro: null, en: null } }, rule: null })
    expect(countedValueOf(value)).toBeNull()
  })

  it('a correction without its rule sentence is still a correction: both values shown', () => {
    const value = valueOf(fields({ reportedValue: 3150000, countedValue: 3150, valueCorrected: true, rule: { code: 'quantity_unit_mix', effect: 'correct', sentence: { ro: ' ', en: null } } }))
    expect(value).toMatchObject({ kind: 'corrected', value: 3150, reported: 3150000, rule: { code: 'quantity_unit_mix' } })
    expect(reportedApartOf(value)).toBe(3150000)
    expect(valueOf(fields({ reportedValue: 3150000, countedValue: 3150, valueCorrected: true, rule: null }))).toMatchObject({ kind: 'corrected', rule: null })
  })

  it('a correction flag on a purchase not counted claims no corrected value', () => {
    const value = valueOf(fields({ counted: false, countedValue: 3150, valueCorrected: true, notCountedReason: reason('not_accepted'), rule: rule('quantity_unit_mix', 'correct') }))
    expect(value.kind).toBe('not-counted')
    expect(countedValueOf(value)).toBeNull()
  })

  it('an unknown reason code keeps the served sentence', () => {
    expect(valueOf(fields({ counted: false, countedValue: null, notCountedReason: reason('new_reason') }))).toMatchObject({ reason: { code: 'other', label: { ro: 'ro:new_reason' } } })
  })

  it('an unknown rule effect keeps the rule and its sentence', () => {
    expect(valueOf(fields({ counted: false, countedValue: null, notCountedReason: reason('reviewed_entry_error'), rule: rule('new_rule', 'flag') }))).toMatchObject({ rule: { code: 'new_rule', effect: null } })
  })
})

describe('supplierNameOf — D6', () => {
  it('a company is named, with its code', () => {
    expect(supplierNameOf({ displayKind: 'company', name: ' TEHNOSTRADE SRL ', cui: '17042060' })).toEqual({ kind: 'company', name: 'TEHNOSTRADE SRL', cui: '17042060' })
  })

  it('the natural-person row is never named', () => {
    expect(supplierNameOf({ displayKind: 'natural_person', name: null, cui: null })).toEqual({ kind: 'natural-person' })
  })

  it.each([
    ['a name served beside the natural-person kind', { displayKind: 'natural_person', name: 'Ion Popescu', cui: null }],
    ['an unknown kind', { displayKind: 'sole_trader', name: 'Popescu Ion PFA', cui: '12345678' }],
    ['no kind', { displayKind: null, name: 'Popescu Ion', cui: null }],
    ['a company with no name', { displayKind: 'company', name: '  ', cui: '17042060' }],
  ])('%s is a natural person', (_case, party) => {
    expect(supplierNameOf(party)).toEqual({ kind: 'natural-person' })
  })

  it('the buyer kind on a supplier is not a company', () => {
    expect(supplierNameOf({ displayKind: 'authority', name: 'Primaria X', cui: '123' })).toEqual({ kind: 'natural-person' })
  })

  it('no party is no supplier named, not a natural person', () => {
    expect(supplierNameOf(null)).toEqual({ kind: 'none' })
  })
})
