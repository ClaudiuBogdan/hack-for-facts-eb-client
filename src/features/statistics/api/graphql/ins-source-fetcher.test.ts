import { beforeEach, describe, expect, it, vi } from 'vitest'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchInsSourceVector } from './ins-source-fetcher'

vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))
const request = vi.mocked(graphqlQuery)
const descriptor = {
  code: 'TEST',
  dimension_count: 2,
  dimensions: [
    { index: 0, type: 'TEMPORAL', classification_type: null },
    { index: 1, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
  metadata: {
    revision_id: '9007199254740993',
    transform_contract_sha256: 'b'.repeat(64),
  },
}
const row = (year: number) => ({
  id: `v1:TEST:${year}:9685`,
  dataset_code: 'TEST',
  value: '123456789012345678.91',
  value_status: null,
  time_period: {
    iso_period: String(year),
    year,
    periodicity: 'ANNUAL',
    quarter: null,
    month: null,
  },
  territory: null,
  unit: { code: '9685', name_ro: 'Număr persoane', symbol: 'persoane' },
  classifications: [],
  dimensions: { geography: null },
})
const response = (year: number, more: boolean, previous = false) => ({
  descriptor,
  insObservations: {
    nodes: [row(year)],
    pageInfo: {
      totalCount: more ? -1 : 2,
      hasNextPage: more,
      hasPreviousPage: previous,
    },
  },
})

beforeEach(() => request.mockReset())

describe('native INS source vector transport', () => {
  it('requests each page and its descriptor in one anonymous cancellable operation', async () => {
    request
      .mockResolvedValueOnce(response(2024, true))
      .mockResolvedValueOnce(response(2023, false, true))
    const controller = new AbortController()
    const filter = { hasValue: true }
    const vector = await fetchInsSourceVector({
      datasetCode: 'TEST',
      pageSize: 1,
      filter,
      signal: controller.signal,
    })
    expect(vector.observations.map((item) => item.id)).toEqual([
      'v1:TEST:2024:9685',
      'v1:TEST:2023:9685',
    ])
    expect(vector.observations[0].value).toBe('123456789012345678.91')
    expect(vector.descriptor.metadata.revision_id).toBe('9007199254740993')
    expect(request).toHaveBeenCalledTimes(2)
    for (const [document, variables, options] of request.mock.calls) {
      expect(document).toContain('descriptor: insDataset(code: $datasetCode)')
      expect(document).toContain('insObservations(datasetCode: $datasetCode')
      expect(document).toContain('classification_type { code }')
      expect(document).toContain('metadata')
      expect(document).toContain('dimensions')
      expect(variables).toMatchObject({ datasetCode: 'TEST', limit: 1, filter })
      expect(options).toMatchObject({
        auth: 'none',
        signal: controller.signal,
        operationName: 'InsSourceObservations',
      })
    }
    expect(request.mock.calls.map((call) => call[1]?.offset)).toEqual([0, 1])
  })
  it('rejects identity loss instead of passing an unqualified legacy-shaped row downstream', async () => {
    const missingId = { ...row(2024), id: undefined }
    request.mockResolvedValueOnce({
      descriptor,
      insObservations: {
        nodes: [missingId],
        pageInfo: { totalCount: 1, hasNextPage: false, hasPreviousPage: false },
      },
    })
    await expect(
      fetchInsSourceVector({ datasetCode: 'TEST' }),
    ).rejects.toThrow()
  })
  it('rejects mismatched publications across HTTP requests without returning their combined cells', async () => {
    request.mockResolvedValueOnce(response(2024, true)).mockResolvedValueOnce({
      ...response(2023, false, true),
      descriptor: {
        ...descriptor,
        metadata: { ...descriptor.metadata, revision_id: '9007199254740994' },
      },
    })
    await expect(
      fetchInsSourceVector({ datasetCode: 'TEST' }),
    ).rejects.toMatchObject({ code: 'PUBLICATION_CHANGED' })
  })
  it('retains unsupported chart cadences as native metadata instead of pretending they are annual', async () => {
    const source = {
      ...row(2024),
      time_period: {
        ...row(2024).time_period,
        periodicity: 'SEMESTRIAL',
        iso_period: '2024-S1',
      },
    }
    request.mockResolvedValueOnce({
      descriptor,
      insObservations: {
        nodes: [source],
        pageInfo: { totalCount: 1, hasNextPage: false, hasPreviousPage: false },
      },
    })
    expect(
      (await fetchInsSourceVector({ datasetCode: 'TEST' })).observations[0]
        .time_period.periodicity,
    ).toBe('SEMESTRIAL')
  })
})
