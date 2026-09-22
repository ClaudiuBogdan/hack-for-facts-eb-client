import { describe, expect, it } from 'vitest'
import {
  classificationPinMap,
  encodeClassificationPin,
  encodeTerritoryPin,
  parseClassificationPin,
  parseClassificationPins,
  parseTerritoryPin,
  removeClassificationPin,
  territoryPinFromValue,
  upsertClassificationPin,
} from './dataset-selection'

describe('classification pin codec', () => {
  it('round-trips a pin', () => {
    const pin = { typeCode: 'SEXE', valueCode: 'total' }
    expect(parseClassificationPin(encodeClassificationPin(pin))).toEqual(pin)
  })

  it('round-trips a list', () => {
    const pins = ['SEXE:total', 'VARSTA:0-14']
    expect(parseClassificationPins(pins).map(encodeClassificationPin)).toEqual(pins)
  })

  it.each([
    ['no separator', 'SEXE'],
    ['empty type', ':total'],
    ['empty value', 'SEXE:'],
    ['two separators', 'SEXE:total:extra'],
    ['empty string', ''],
  ])('degrades malformed input (%s) to null', (_label, input) => {
    expect(parseClassificationPin(input)).toBeNull()
  })

  it('drops malformed entries from a list rather than throwing', () => {
    expect(parseClassificationPins(['SEXE:total', 'garbage', 'VARSTA:0-14'])).toEqual([
      { typeCode: 'SEXE', valueCode: 'total' },
      { typeCode: 'VARSTA', valueCode: '0-14' },
    ])
  })

  it('keeps the first pin when a type repeats', () => {
    expect(parseClassificationPins(['SEXE:total', 'SEXE:feminin'])).toEqual([
      { typeCode: 'SEXE', valueCode: 'total' },
    ])
  })

  it('upserts by type instead of appending', () => {
    const next = upsertClassificationPin(['SEXE:total', 'VARSTA:0-14'], {
      typeCode: 'SEXE',
      valueCode: 'feminin',
    })
    expect(next).toEqual(['SEXE:feminin', 'VARSTA:0-14'])
  })

  it('appends a pin for a type that is not yet present', () => {
    expect(upsertClassificationPin(['SEXE:total'], { typeCode: 'VARSTA', valueCode: '0-14' })).toEqual(
      ['SEXE:total', 'VARSTA:0-14'],
    )
  })

  it('removes exactly one type', () => {
    expect(removeClassificationPin(['SEXE:total', 'VARSTA:0-14'], 'SEXE')).toEqual([
      'VARSTA:0-14',
    ])
  })

  it('maps pins by type', () => {
    expect([...classificationPinMap(['SEXE:total']).entries()]).toEqual([
      ['SEXE', 'total'],
    ])
  })
})

describe('territory pin codec', () => {
  it('round-trips a siruta pin', () => {
    expect(parseTerritoryPin('siruta:54975')).toEqual({ kind: 'siruta', value: '54975' })
    expect(encodeTerritoryPin({ kind: 'siruta', value: '54975' })).toBe('siruta:54975')
  })

  it('round-trips a county-code pin', () => {
    expect(parseTerritoryPin('cod:CJ')).toEqual({ kind: 'cod', value: 'CJ' })
    expect(encodeTerritoryPin({ kind: 'cod', value: 'CJ' })).toBe('cod:CJ')
  })

  it.each(['54975', 'siruta:', 'nuts:CJ', 'siruta:CJ-01', 'cod:CJ:extra', ''])(
    'degrades malformed pin %s to null',
    (input) => {
      expect(parseTerritoryPin(input)).toBeNull()
    },
  )

  it('degrades an absent pin to null', () => {
    expect(parseTerritoryPin(undefined)).toBeNull()
  })

  it('prefers the SIRUTA code when a dimension value has both', () => {
    expect(territoryPinFromValue({ siruta_code: '54975', code: '54975' })).toEqual({
      kind: 'siruta',
      value: '54975',
    })
  })

  it('falls back to the territory code for counties, which have no SIRUTA', () => {
    expect(territoryPinFromValue({ siruta_code: null, code: 'CJ' })).toEqual({
      kind: 'cod',
      value: 'CJ',
    })
  })
})
