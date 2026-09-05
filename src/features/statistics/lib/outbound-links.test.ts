import { describe, expect, it } from 'vitest'
import {
  parseStatisticsComparisonsSearch,
  parseStatisticsDatasetDetailSearch,
  parseStatisticsDatasetExplorerSearch,
} from '@/schemas/statistics'
import {
  parseComparisonTokens,
  parseTerritoryPin,
  territoryPinToEntity,
} from './dataset-selection'
import { buildDatasetFilterInput } from './explorer-filter'
import {
  COMPARISON_EXAMPLE_PRESET,
  COMPARISON_PRESETS,
} from './comparison-presets'
import {
  EXAMPLE_DATASET_CODE,
  EXAMPLE_LAU_SIRUTA,
  LANDING_THEMES,
} from './landing-constants'

/**
 * Round-trip guards for every outbound link the feature emits: the emitted
 * search object is parsed through the TARGET route's schema and then fed to
 * exactly what the target reads. A link that survives here cannot land on a
 * dead page because the two sides drifted.
 */
describe('outbound links round-trip through their target schemas', () => {
  it('landing B3 example card → compare (mixed-level tokens)', () => {
    const emitted = {
      cod: EXAMPLE_DATASET_CODE,
      teritorii: [`siruta:${EXAMPLE_LAU_SIRUTA}`, 'cod:CJ', 'cod:RO'],
    }
    const parsed = parseStatisticsComparisonsSearch(emitted)
    const tokens = parseComparisonTokens(parsed.teritorii)
    expect(parsed.cod).toBe('FOM104D')
    expect(tokens.map((token) => token.level)).toEqual([
      'LAU',
      'NUTS3',
      'NATIONAL',
    ])
  })

  it('landing B2 decade row → dataset detail (county scope)', () => {
    const parsed = parseStatisticsDatasetDetailSearch({ teritoriu: 'cod:TR' })
    const entity = territoryPinToEntity(parseTerritoryPin(parsed.teritoriu))
    expect(entity).toEqual({ territoryCode: 'TR', territoryLevel: 'NUTS3' })
  })

  it('landing theme card → explorer (root-context prefilter)', () => {
    for (const theme of LANDING_THEMES) {
      const parsed = parseStatisticsDatasetExplorerSearch({
        context: theme.code,
        stare: 'available',
      })
      const filter = buildDatasetFilterInput(parsed)
      expect(filter.rootContextCode).toBe(theme.code)
      expect(filter.dataStatus).toEqual(['AVAILABLE'])
    }
  })

  it('hub tile → compare (siruta + county + country tokens)', () => {
    const emitted = {
      cod: 'POP107D',
      teritorii: ['siruta:54975', 'cod:CJ', 'cod:RO'],
    }
    const parsed = parseStatisticsComparisonsSearch(emitted)
    expect(parseComparisonTokens(parsed.teritorii)).toHaveLength(3)
  })

  it('every preset bundle parses and keeps all its territories', () => {
    for (const preset of [...COMPARISON_PRESETS, COMPARISON_EXAMPLE_PRESET]) {
      const parsed = parseStatisticsComparisonsSearch(
        preset.search as Record<string, unknown>,
      )
      const tokens = parseComparisonTokens(parsed.teritorii)
      expect(tokens.length).toBe(
        Array.isArray(preset.search.teritorii)
          ? preset.search.teritorii.length
          : 0,
      )
    }
  })
})
