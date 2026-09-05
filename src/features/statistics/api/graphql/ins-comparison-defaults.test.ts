import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchInsComparisonDefaults } from './ins-comparison-defaults'
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
  value: '12.340',
  value_status: null,
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
const good = {
  dataset,
  observation,
  latestPeriod: '2025',
  hasData: true,
  matchStrategy: 'PREFERRED_CLASSIFICATION',
  geographicWitnesses: [],
}
const empty = {
  dataset,
  observation: null,
  latestPeriod: null,
  hasData: false,
  matchStrategy: 'NO_DATA',
  geographicWitnesses: [],
}
const request = {
  datasetCode: 'TEST',
  entities: [
    { territoryCode: 'B', territoryLevel: 'NUTS3' as const },
    { sirutaCode: '179132' },
  ],
}
describe('native comparison defaults operation', () => {
  beforeEach(() => vi.clearAllMocks())
  it('batches variable-only entities anonymously and preserves genuine no-data', async () => {
    vi.mocked(graphqlQuery).mockResolvedValue({
      dataset,
      d0: [good],
      d1: [empty],
    })
    const signal = new AbortController().signal
    const result = await fetchInsComparisonDefaults({ ...request, signal })
    expect(result.latest.map((v) => v.hasData)).toEqual([true, false])
    expect(graphqlQuery).toHaveBeenCalledTimes(1)
    const [query, variables, options] = vi.mocked(graphqlQuery).mock.calls[0]
    expect(query).toContain('d1: insLatestDatasetValues')
    expect(query).not.toContain('179132')
    expect(variables).toMatchObject({
      entity0: request.entities[0],
      entity1: request.entities[1],
    })
    expect(options).toEqual({ auth: 'none', signal })
  })
  it.each([
    { dataset, d0: [good] },
    { dataset, d0: [good], d1: [] },
    { dataset, d0: [good], d1: [{ ...empty, hasData: true }] },
    {
      dataset,
      d0: [good],
      d1: [{ ...empty, dataset: { ...dataset, metadata: null } }],
    },
    {
      dataset,
      d0: [good],
      d1: [
        {
          ...empty,
          dataset: {
            ...dataset,
            metadata: { ...dataset.metadata, revision_id: '2' },
          },
        },
      ],
    },
    {
      dataset,
      d0: [good],
      d1: [
        {
          ...empty,
          dataset: {
            ...dataset,
            metadata: { ...dataset.metadata, custody_sha256: 'c'.repeat(64) },
          },
        },
      ],
    },
  ])(
    'rejects missing, malformed or differently published outcomes %#',
    async (response) => {
      vi.mocked(graphqlQuery).mockResolvedValue(response)
      await expect(fetchInsComparisonDefaults(request)).rejects.toThrow()
    },
  )
  it.each([
    [null, 'UNKNOWN'],
    [
      { ...dataset, data_status: 'CATALOG_ONLY', metadata: null },
      'CATALOG_ONLY',
    ],
  ])(
    'distinguishes dataset availability from transport failure %#',
    async (value, reason) => {
      vi.mocked(graphqlQuery).mockResolvedValue({ dataset: value })
      await expect(fetchInsComparisonDefaults(request)).rejects.toMatchObject({
        name: 'ComparisonDatasetError',
        reason,
      })
    },
  )
  it('propagates transport errors without converting them to no-data', async () => {
    vi.mocked(graphqlQuery).mockRejectedValue(new Error('unavailable'))
    await expect(fetchInsComparisonDefaults(request)).rejects.toThrow(
      'unavailable',
    )
  })
  it('does not start a request after cancellation', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      fetchInsComparisonDefaults({ ...request, signal: controller.signal }),
    ).rejects.toThrow()
    expect(graphqlQuery).not.toHaveBeenCalled()
  })
})
