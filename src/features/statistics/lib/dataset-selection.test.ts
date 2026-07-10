import { describe, expect, it } from 'vitest'
import type { InsDimension } from '@/schemas/ins'
import {
  areAllClassificationsPinned,
  buildObservationFilter,
  classificationPinMap,
  encodeClassificationPin,
  encodeTerritoryPin,
  isObservationsQueryEnabled,
  isSeriesFullyPinned,
  isTotalOption,
  missingScopeRequirements,
  parseClassificationPin,
  parseClassificationPins,
  parseTerritoryPin,
  removeClassificationPin,
  resolvePeriodicity,
  resolveYearWindow,
  territoryPinFromValue,
  upsertClassificationPin,
} from './dataset-selection'

const TEMPORAL: InsDimension = { index: 0, type: 'TEMPORAL' }
const TERRITORIAL: InsDimension = { index: 1, type: 'TERRITORIAL' }
const SEXE: InsDimension = {
  index: 2,
  type: 'CLASSIFICATION',
  classification_type: { code: 'SEXE' },
}
const VARSTA: InsDimension = {
  index: 3,
  type: 'CLASSIFICATION',
  classification_type: { code: 'VARSTA' },
}
const UNIT: InsDimension = { index: 4, type: 'UNIT_OF_MEASURE' }

describe('classification pin codec', () => {
  it('round-trips a pin', () => {
    const pin = { type: 'SEXE', value: 'total' }
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
      { type: 'SEXE', value: 'total' },
      { type: 'VARSTA', value: '0-14' },
    ])
  })

  it('keeps the first pin when a type repeats', () => {
    expect(parseClassificationPins(['SEXE:total', 'SEXE:feminin'])).toEqual([
      { type: 'SEXE', value: 'total' },
    ])
  })

  it('upserts by type instead of appending', () => {
    const next = upsertClassificationPin(['SEXE:total', 'VARSTA:0-14'], {
      type: 'SEXE',
      value: 'feminin',
    })
    expect(next).toEqual(['SEXE:feminin', 'VARSTA:0-14'])
  })

  it('appends a pin for a type that is not yet present', () => {
    expect(upsertClassificationPin(['SEXE:total'], { type: 'VARSTA', value: '0-14' })).toEqual(
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

describe('isObservationsQueryEnabled', () => {
  const dimensions = [TEMPORAL, TERRITORIAL, SEXE, UNIT]

  it('blocks an unscoped query — the 23.6M-row scan', () => {
    expect(isObservationsQueryEnabled({ dimensions, search: {} })).toBe(false)
  })

  it('blocks while the dimension list is unknown, even with a territory pinned', () => {
    // Details not resolved yet: we cannot prove the dataset is non-territorial,
    // and guessing wrong costs a 30-second timeout.
    const search = { teritoriu: 'siruta:54975' }
    expect(isObservationsQueryEnabled({ dimensions: null, search })).toBe(false)
    expect(isObservationsQueryEnabled({ dimensions: undefined, search })).toBe(false)
    expect(isObservationsQueryEnabled({ dimensions: [], search })).toBe(false)
  })

  it('allows a query once a territory is pinned', () => {
    expect(
      isObservationsQueryEnabled({ dimensions, search: { teritoriu: 'siruta:54975' } }),
    ).toBe(true)
  })

  it('ignores a malformed territory pin', () => {
    expect(
      isObservationsQueryEnabled({ dimensions, search: { teritoriu: 'garbage' } }),
    ).toBe(false)
  })

  it('allows a query when the dataset has no territorial dimension', () => {
    expect(
      isObservationsQueryEnabled({ dimensions: [TEMPORAL, SEXE, UNIT], search: {} }),
    ).toBe(true)
  })

  it('allows a query when every classification is pinned', () => {
    expect(
      isObservationsQueryEnabled({
        dimensions: [TEMPORAL, TERRITORIAL, SEXE, VARSTA],
        search: { clasificari: ['SEXE:total', 'VARSTA:0-14'] },
      }),
    ).toBe(true)
  })

  it('blocks when only some classifications are pinned', () => {
    expect(
      isObservationsQueryEnabled({
        dimensions: [TEMPORAL, TERRITORIAL, SEXE, VARSTA],
        search: { clasificari: ['SEXE:total'] },
      }),
    ).toBe(false)
  })

  it('does not treat "zero classifications" as "all classifications pinned"', () => {
    expect(
      areAllClassificationsPinned({ dimensions: [TEMPORAL, TERRITORIAL], search: {} }),
    ).toBe(false)
    expect(
      isObservationsQueryEnabled({ dimensions: [TEMPORAL, TERRITORIAL], search: {} }),
    ).toBe(false)
  })

  it('names the missing pins', () => {
    expect(
      missingScopeRequirements({
        dimensions: [TEMPORAL, TERRITORIAL, SEXE, VARSTA],
        search: { clasificari: ['SEXE:total'] },
      }),
    ).toEqual({ needsTerritory: true, missingClassificationTypes: ['VARSTA'] })
  })
})

describe('isSeriesFullyPinned', () => {
  const dimensions = [TEMPORAL, TERRITORIAL, SEXE, UNIT]

  it('requires territory, every classification and a unit', () => {
    expect(
      isSeriesFullyPinned({
        dimensions,
        search: { teritoriu: 'siruta:54975', clasificari: ['SEXE:total'], unitate: 'PERS' },
      }),
    ).toBe(true)
  })

  it('is false while the unit is unpinned', () => {
    expect(
      isSeriesFullyPinned({
        dimensions,
        search: { teritoriu: 'siruta:54975', clasificari: ['SEXE:total'] },
      }),
    ).toBe(false)
  })

  it('needs no unit pin when the dataset has no unit dimension', () => {
    expect(
      isSeriesFullyPinned({
        dimensions: [TEMPORAL, TERRITORIAL, SEXE],
        search: { teritoriu: 'siruta:54975', clasificari: ['SEXE:total'] },
      }),
    ).toBe(true)
  })
})

describe('buildObservationFilter', () => {
  it('maps a siruta pin to sirutaCodes', () => {
    expect(buildObservationFilter({ search: { teritoriu: 'siruta:54975' } })).toEqual({
      sirutaCodes: ['54975'],
    })
  })

  it('maps a county pin to territoryCodes plus an explicit NUTS3 level', () => {
    expect(buildObservationFilter({ search: { teritoriu: 'cod:CJ' } })).toEqual({
      territoryCodes: ['CJ'],
      territoryLevels: ['NUTS3'],
    })
  })

  it('sends classification value codes, deduplicated', () => {
    expect(
      buildObservationFilter({ search: { clasificari: ['SEXE:total', 'VARSTA:total'] } }),
    ).toEqual({ classificationValueCodes: ['total'] })
  })

  it('sends a year interval only when the user pinned one', () => {
    expect(buildObservationFilter({ search: {}, yearRange: [2015, 2024] })).toEqual({})

    expect(
      buildObservationFilter({ search: { din: 2018 }, yearRange: [2015, 2024] }).period,
    ).toEqual({ type: 'YEAR', selection: { interval: { start: '2018', end: '2024' } } })
  })

  it('drops a malformed territory pin instead of filtering by garbage', () => {
    expect(buildObservationFilter({ search: { teritoriu: 'nuts:CJ' } })).toEqual({})
  })
})

describe('resolveYearWindow', () => {
  it('falls back to the dataset range', () => {
    expect(resolveYearWindow({ search: {}, yearRange: [2015, 2024] })).toEqual({
      from: 2015,
      to: 2024,
    })
  })

  it('swaps an inverted window rather than returning an empty range', () => {
    expect(resolveYearWindow({ search: { din: 2024, pana: 2015 }, yearRange: null })).toEqual({
      from: 2015,
      to: 2024,
    })
  })

  it('returns null when nothing bounds the window', () => {
    expect(resolveYearWindow({ search: {}, yearRange: null })).toBeNull()
  })
})

describe('resolvePeriodicity', () => {
  it('uses the dataset periodicity when it has only one', () => {
    expect(resolvePeriodicity({ search: {}, periodicity: ['ANNUAL'] })).toBe('ANNUAL')
  })

  it('needs an explicit pin when the dataset has several', () => {
    expect(resolvePeriodicity({ search: {}, periodicity: ['QUARTERLY', 'MONTHLY'] })).toBeNull()
    expect(
      resolvePeriodicity({
        search: { frecventa: 'QUARTERLY' },
        periodicity: ['QUARTERLY', 'MONTHLY'],
      }),
    ).toBe('QUARTERLY')
  })
})

describe('isTotalOption', () => {
  it.each(['Total', 'total', 'TOTAL judet'])('matches %s', (label) => {
    expect(isTotalOption(label)).toBe(true)
  })

  it.each(['Subtotal', 'Masculin', '', null, undefined])('does not match %s', (label) => {
    expect(isTotalOption(label)).toBe(false)
  })
})
