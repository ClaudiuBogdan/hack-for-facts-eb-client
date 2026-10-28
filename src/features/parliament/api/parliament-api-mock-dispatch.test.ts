/**
 * The facade loads the mock modules on demand, so a live build carries none of
 * the fixtures. Mock mode must still answer from them, through the same calls.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const graphqlQueryMock = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graphql/graphql-client')>(
    '@/lib/graphql/graphql-client',
  )
  return { ...actual, graphqlQuery: (...args: unknown[]) => graphqlQueryMock(...args) }
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  graphqlQueryMock.mockReset()
})

describe('parliament facade — mock dispatch', () => {
  it('answers from the fixtures in mock mode, without a network read', async () => {
    vi.stubEnv('VITE_USE_MOCK_DATA', 'false')
    vi.stubEnv('VITE_MOCK_DATASETS', 'political-parliament')
    const { fetchParliamentHub, fetchParliamentAgendas, fetchParliamentFreshness } = await import('./parliament-api')

    const hub = await fetchParliamentHub()
    const agendas = await fetchParliamentAgendas(1)
    const freshness = await fetchParliamentFreshness()

    expect(hub.groups.length).toBeGreaterThan(0)
    expect(agendas.agendas.length).toBeGreaterThan(0)
    expect(freshness.lastLoadedAt).toBeDefined()
    expect(graphqlQueryMock).not.toHaveBeenCalled()
  })

  it('reads the API in live mode', async () => {
    vi.stubEnv('VITE_USE_MOCK_DATA', 'false')
    vi.stubEnv('VITE_MOCK_DATASETS', '')
    graphqlQueryMock.mockResolvedValue({ parliamentDataFreshness: { latestVoteDate: '2026-07-10', lastLoadedAt: null } })
    const { fetchParliamentFreshness } = await import('./parliament-api')

    expect(await fetchParliamentFreshness()).toEqual({ latestVoteDate: '2026-07-10' })
    expect(graphqlQueryMock).toHaveBeenCalledTimes(1)
  })
})
