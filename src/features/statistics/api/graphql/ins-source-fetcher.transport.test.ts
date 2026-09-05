import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/config/env', () => ({
  env: { VITE_APP_ENVIRONMENT: 'test' },
  getApiBaseUrl: () => 'https://native.example.test',
}))
vi.mock('@/lib/auth', () => ({ getAuthToken: vi.fn() }))
import { getAuthToken } from '@/lib/auth'
import { fetchInsSourceVector } from './ins-source-fetcher'
import {
  getInsDatasetDetails,
  getInsDimensionValuesPage,
} from './ins-bootstrap-fetchers'

describe('native INS actual HTTP transport', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('posts anonymously to the native endpoint with descriptor and cells together', async () => {
    const response = {
      descriptor: {
        code: 'TEST',
        dimension_count: 2,
        dimensions: [
          { index: 0, type: 'TEMPORAL', classification_type: null },
          { index: 1, type: 'UNIT_OF_MEASURE', classification_type: null },
        ],
        metadata: {
          revision_id: '1',
          transform_contract_sha256: 'b'.repeat(64),
        },
      },
      insObservations: {
        nodes: [],
        pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false },
      },
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: response }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    const vector = await fetchInsSourceVector({
      datasetCode: 'TEST',
      signal: controller.signal,
    })
    expect(vector.observations).toEqual([])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://native.example.test/api/v1/graphql',
      expect.objectContaining({
        method: 'POST',
        signal: controller.signal,
      }),
    )
    const init = fetchMock.mock.calls[0][1]
    expect(init.headers).not.toHaveProperty('Authorization')
    expect(getAuthToken).not.toHaveBeenCalled()
    const body = JSON.parse(init.body)
    expect(body.query).toMatch(/descriptor:\s*insDataset/)
    expect(body.query).toContain('insObservations')
    expect(body.variables.datasetCode).toBe('TEST')
  })
})

describe('native INS bootstrap actual HTTP transport', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('reads metadata and dimension members without auth or a legacy endpoint', async () => {
    const descriptor = {
      id: 'TEST',
      code: 'TEST',
      data_status: 'AVAILABLE',
      dimension_count: 3,
      dimensions: [
        { index: 0, type: 'TERRITORIAL', classification_type: { code: 'D0' } },
        { index: 1, type: 'TEMPORAL', classification_type: null },
        { index: 2, type: 'UNIT_OF_MEASURE', classification_type: null },
      ],
      metadata: { revision_id: '1', transform_contract_sha256: 'b'.repeat(64) },
    }
    const responses = [
      { insDataset: descriptor },
      {
        descriptor,
        insDatasetDimensionValues: {
          nodes: [
            {
              nom_item_id: 0,
              dimension_type: 'TERRITORIAL',
              classification_value: { type_code: 'D0', code: '0' },
            },
          ],
          pageInfo: {
            totalCount: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      },
    ]
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify({ data: responses.shift() }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const signal = new AbortController().signal
    await getInsDatasetDetails('TEST', signal)
    await getInsDimensionValuesPage({
      datasetCode: 'TEST',
      dimensionIndex: 0,
      signal,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [url, init] of fetchMock.mock.calls) {
      expect(url).toBe('https://native.example.test/api/v1/graphql')
      expect(init.signal).toBe(signal)
      expect(init.headers).not.toHaveProperty('Authorization')
    }
    expect(getAuthToken).not.toHaveBeenCalled()
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).query).toMatch(
      /descriptor:\s*insDataset/,
    )
  })
})
