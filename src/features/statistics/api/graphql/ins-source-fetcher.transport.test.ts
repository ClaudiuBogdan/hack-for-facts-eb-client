import { describe, expect, it, vi } from 'vitest'
vi.mock('@/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/config/env')>()),
  getApiBaseUrl: () => 'https://native.example.test',
}))
vi.mock('@/lib/auth', () => ({ getAuthToken: vi.fn() }))
import { getAuthToken } from '@/lib/auth'
import { fetchInsSourceVector } from './ins-source-fetcher'

describe('native INS actual HTTP transport', () => {
  it('posts anonymously to the native endpoint with descriptor and cells together', async () => {
    const response = {
      descriptor: { code: 'TEST', dimension_count: 2,
        dimensions: [
          { index: 0, type: 'TEMPORAL', classification_type: null },
          { index: 1, type: 'UNIT_OF_MEASURE', classification_type: null },
        ],
        metadata: { revision_id: '1', transform_contract_sha256: 'b'.repeat(64) },
      },
      insObservations: { nodes: [], pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false } },
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: response }), {
      status: 200, headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    const vector = await fetchInsSourceVector({ datasetCode: 'TEST', signal: controller.signal })
    expect(vector.observations).toEqual([])
    expect(fetchMock).toHaveBeenCalledWith('https://native.example.test/api/v1/graphql', expect.objectContaining({
      method: 'POST', signal: controller.signal,
    }))
    const init = fetchMock.mock.calls[0][1]
    expect(init.headers).not.toHaveProperty('Authorization')
    expect(getAuthToken).not.toHaveBeenCalled()
    const body = JSON.parse(init.body)
    expect(body.query).toMatch(/descriptor:\s*insDataset/)
    expect(body.query).toContain('insObservations')
    expect(body.variables.datasetCode).toBe('TEST')
  })
})
