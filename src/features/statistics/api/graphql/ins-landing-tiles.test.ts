import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { LANDING_NATIONAL_DATASET_CODES } from '../../lib/landing-constants'
import { fetchNativeLandingTiles } from './ins-landing-tiles'
const dataset = {
  id: 'TEST',
  code: 'TEST',
  data_status: 'AVAILABLE',
  periodicity: ['ANNUAL'],
  dimension_count: 4,
  metadata: {
    revision_id: '1',
    custody_sha256: 'a'.repeat(64),
    transform_contract_sha256: 'b'.repeat(64),
  },
  dimensions: [
    { index: 0, type: 'CLASSIFICATION', classification_type: { code: 'D0' } },
    { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' } },
    { index: 2, type: 'TEMPORAL', classification_type: null },
    { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
}
const observation = {
  id: 'original',
  dataset_code: 'TEST',
  value: '12.340' as string | null,
  value_status: null as string | null,
  time_period: { iso_period: '2025', year: 2025, periodicity: 'ANNUAL' },
  unit: { code: '0' },
  classifications: [
    { id: 'c0', type_code: 'D0', code: '0' },
    { id: 'c1', type_code: 'D1', code: '1' },
  ],
  dimensions: {
    geography: {
      pairs: [[1, 1]],
      resolution: 'EXACT',
      flags: [],
      qualified: false,
      resolvedTerritory: { code: 'B', level: 'NUTS3' },
      contextTerritory: null,
      applicableRules: [],
    },
  },
}

function outcomes() {
  return LANDING_NATIONAL_DATASET_CODES.map((code) => ({
    dataset: { ...dataset, code, id: code },
    observation: {
      ...observation,
      dataset_code: code,
      dimensions: {
        geography: {
          ...observation.dimensions.geography,
          resolvedTerritory: { code: 'RO', level: 'NATIONAL' },
        },
      },
    },
    latestPeriod: '2025',
    hasData: true,
    matchStrategy: 'PREFERRED_CLASSIFICATION',
    geographicWitnesses: [],
  }))
}
describe('national native landing tiles boundary', () => {
  beforeEach(() => vi.resetAllMocks())
  it('preserves exact values and statuses, including explicit null-valued cells, over anonymous transport', async () => {
    const latest = outcomes()
    latest[0].observation.value = '12345678901234567890.012300'
    latest[0].observation.value_status = 'p'
    latest[1].observation.value = null
    vi.mocked(graphqlQuery).mockResolvedValue({ latest })
    const signal = new AbortController().signal
    const result = await fetchNativeLandingTiles(signal)
    expect(result.nativeContract).toBe('native-v2')
    expect(result.nationalValues[1]).toMatchObject({
      value: null,
      hasData: true,
      period: '2025',
    })
    expect(result.nationalValues[0]).toMatchObject({
      value: '12345678901234567890.012300',
      valueStatus: 'p',
    })
    expect(vi.mocked(graphqlQuery).mock.calls[0][2]).toEqual({
      auth: 'none',
      signal,
    })
  })
  it.each([
    'scope',
    'display-scope',
    'decimal',
    'period',
    'missing-status',
    'duplicate-dataset',
    'missing-dataset',
  ])('rejects %s instead of publishing a national tile', async (problem) => {
    const latest: unknown[] = outcomes()
    const first = latest[0] as ReturnType<typeof outcomes>[number]
    if (problem === 'scope')
      first.observation.dimensions.geography.resolvedTerritory = {
        code: 'CJ',
        level: 'NUTS3',
      }
    if (problem === 'display-scope')
      Object.assign(first.observation, {
        territory: { code: 'CJ', level: 'NUTS3' },
      })
    if (problem === 'decimal') first.observation.value = '12garbage'
    if (problem === 'period') first.observation.time_period.year = 2024
    if (problem === 'missing-status')
      Reflect.deleteProperty(first.observation, 'value_status')
    if (problem === 'duplicate-dataset') latest[1] = latest[0]
    if (problem === 'missing-dataset') latest.pop()
    vi.mocked(graphqlQuery).mockResolvedValue({ latest })
    await expect(fetchNativeLandingTiles()).rejects.toThrow()
  })
  it('propagates cancellation and transport failure without fabricated no-data', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(fetchNativeLandingTiles(controller.signal)).rejects.toThrow()
    expect(graphqlQuery).not.toHaveBeenCalled()
    vi.mocked(graphqlQuery).mockRejectedValue(new Error('unavailable'))
    await expect(fetchNativeLandingTiles()).rejects.toThrow('unavailable')
  })
})
