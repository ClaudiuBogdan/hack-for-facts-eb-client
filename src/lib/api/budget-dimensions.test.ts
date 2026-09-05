import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({ getApiBaseUrl: () => 'https://api.example.com' }))
vi.mock('@/lib/auth', () => ({ getAuthToken: vi.fn() }))
vi.mock('@/lib/logger', () => ({ createLogger: () => ({ info: vi.fn(), error: vi.fn() }) }))

import { getAuthToken } from '@/lib/auth'
import { fetchBudgetSectors, fetchFundingSources } from '@/features/national-budget/national-budget-api'
import { getAllFunctionalClassifications, getFunctionalClassificationLabels, getBudgetSectorLabels, getFundingSourceLabels } from './labels'
import { fetchBudgetDimensionNodes } from './budget-dimensions'

const fetchMock = vi.fn()
const page = (nodes: unknown[], totalCount: number, hasNextPage: boolean) => ({
  nodes, pageInfo: { totalCount, hasNextPage },
})
const respond = (field: string, value: unknown) => new Response(JSON.stringify({ data: { [field]: value } }))
const requestAt = (index: number) => {
  const init = fetchMock.mock.calls[index]?.[1] as RequestInit
  return { init, body: JSON.parse(String(init.body)) as { query: string; variables: Record<string, unknown> } }
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('native budget catalog reads', () => {
  it('collects beyond the classification cap and forwards cancellation without auth', async () => {
    const rows = Array.from({ length: 2001 }, (_, n) => ({ code: String(n + 1), name: `Name ${n}` }))
    fetchMock.mockResolvedValueOnce(respond('functionalClassifications', page(rows.slice(0, 2000), 2001, true)))
      .mockResolvedValueOnce(respond('functionalClassifications', page(rows.slice(2000), 2001, false)))
    const signal = new AbortController().signal
    expect(await getAllFunctionalClassifications(signal)).toEqual(rows)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(Array(2).fill('https://api.example.com/api/v1/graphql'))
    expect(requestAt(0).body.variables).toEqual({ limit: 2000, offset: 0 })
    expect(requestAt(1).body.variables).toEqual({ limit: 2000, offset: 2000 })
    expect(requestAt(1).init.signal).toBe(signal)
    expect(getAuthToken).not.toHaveBeenCalled()
    expect(requestAt(0).body.query).toContain('pageInfo { totalCount hasNextPage }')
  })

  it('retrieves every selected label when the server returns smaller pages', async () => {
    fetchMock.mockResolvedValueOnce(respond('functionalClassifications', page([{ code: '01', name: 'A' }], 2, true)))
      .mockResolvedValueOnce(respond('functionalClassifications', page([{ code: '02', name: 'B' }], 2, false)))
    expect(await getFunctionalClassificationLabels(['01', '02'])).toEqual([{ id: '01', label: 'A' }, { id: '02', label: 'B' }])
    expect(requestAt(1).body.variables).toEqual({ codes: ['01', '02'], limit: 2000, offset: 1 })
  })

  it('keeps sector and funding limits within their server cap', async () => {
    fetchMock.mockResolvedValueOnce(respond('budgetSectors', page([], 0, false)))
      .mockResolvedValueOnce(respond('fundingSources', page([], 0, false)))
    await fetchBudgetSectors()
    await fetchFundingSources()
    expect(requestAt(0).body.variables).toEqual({ limit: 200, offset: 0 })
    expect(requestAt(1).body.variables).toEqual({ limit: 200, offset: 0 })
  })

  it.each([
    ['stalled', page([], 2, true)],
    ['premature completion', page([{ code: '01' }], 2, false)],
    ['invalid count', page([], -1, false)],
  ])('rejects %s pagination instead of returning partial labels', async (_name, value) => {
    fetchMock.mockResolvedValueOnce(respond('functionalClassifications', value))
    await expect(getFunctionalClassificationLabels(['01', '02'])).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects overlapping pages even when their row counts appear complete', async () => {
    fetchMock.mockResolvedValueOnce(respond('functionalClassifications', page([{ code: '01', name: 'A' }], 2, true)))
      .mockResolvedValueOnce(respond('functionalClassifications', page([{ code: '01', name: 'A' }], 2, false)))
    await expect(getAllFunctionalClassifications()).rejects.toThrow('duplicate')
  })

  it('rejects a changed catalog count across pages', async () => {
    fetchMock.mockResolvedValueOnce(respond('functionalClassifications', page([{ code: '01' }], 2, true)))
      .mockResolvedValueOnce(respond('functionalClassifications', page([{ code: '02' }], 3, true)))
    await expect(getAllFunctionalClassifications()).rejects.toThrow('changed during pagination')
  })

  it('does not swallow a request cancellation', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'))
    const signal = new AbortController().signal
    await expect(fetchBudgetDimensionNodes('query Catalog { budgetSectors { nodes { sector_id } } }', 'budgetSectors', {}, signal)).rejects.toThrow('cancelled')
    expect(requestAt(0).init.signal).toBe(signal)
  })
})


// The native filter contract requires IDs, even when JSON carries strings.
// Assert the actual wire declaration; live API probes also validate these documents.
it.each([
  { field: 'budgetSectors', prefix: 'sector', fetchLabels: getBudgetSectorLabels },
  { field: 'fundingSources', prefix: 'source', fetchLabels: getFundingSourceLabels },
])('uses GraphQL ID variables for $field label lookups', async ({ field, prefix, fetchLabels }) => {
  fetchMock.mockResolvedValueOnce(respond(field, page([{ [`${prefix}_id`]: '1', [`${prefix}_description`]: 'Name' }], 1, false)))
  expect(await fetchLabels(['1'])).toEqual([{ id: '1', label: 'Name' }])
  const idDeclaration = /\$ids:\s*(\[[^\]]+\])/u.exec(requestAt(0).body.query)?.[1]
  expect(idDeclaration).toBe('[ID!]')
})
