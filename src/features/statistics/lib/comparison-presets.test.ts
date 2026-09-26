import { describe, expect, it } from 'vitest'
import { HUB_EXAMPLE_PLACES } from './landing-constants'
import {
  COMPARISON_EXAMPLE_PRESET,
  COMPARISON_PRESET_PLACES,
  COMPARISON_PRESETS,
  COMPARISON_QUICK_INDICATORS,
  knownComparisonPlaceName,
  quickIndicatorLabel,
} from './comparison-presets'

describe('knownComparisonPlaceName', () => {
  it('names every locality a preset or the worked example points at', () => {
    const sirutas = [...COMPARISON_PRESETS, COMPARISON_EXAMPLE_PRESET]
      .flatMap((preset) => preset.search.teritorii ?? [])
      .filter((token): token is string => typeof token === 'string' && token.startsWith('siruta:'))
      .map((token) => token.slice('siruta:'.length))
    expect(sirutas.length).toBeGreaterThan(0)
    for (const siruta of sirutas) expect(knownComparisonPlaceName(siruta)).toEqual(expect.any(String))
  })

  it('covers the hub examples and the presets’ own municipalities, and nothing else', () => {
    expect(knownComparisonPlaceName('69900')).toBe('Craiova')
    expect(knownComparisonPlaceName('40198')).toBe('Brașov')
    for (const place of [...HUB_EXAMPLE_PLACES, ...COMPARISON_PRESET_PLACES]) {
      expect(knownComparisonPlaceName(place.siruta)).toBe(place.name)
    }
    expect(knownComparisonPlaceName('143450')).toBeNull()
  })
})

describe('quickIndicatorLabel', () => {
  it('gives the quick label from the code alone, and null for any other matrix', () => {
    expect(quickIndicatorLabel('FOM104D')).toBe(COMPARISON_QUICK_INDICATORS.find((entry) => entry.code === 'FOM104D')!.label)
    expect(quickIndicatorLabel('GOS108A')).toBeNull()
    expect(quickIndicatorLabel('')).toBeNull()
  })
})
