import { describe, expect, it, vi } from 'vitest'
import { FUNKY, FUNKY_STATEMENTS } from '@/features/ngos/organization/test/fixtures'

const api = vi.hoisted(() => ({ fetchNgoOrganization: vi.fn(), fetchNgoStatements: vi.fn() }))
vi.mock('@/features/ngos/organization/api', () => api)
vi.mock('@/features/ngos/organization/head', () => ({ buildNgoProfileHead: vi.fn(() => ({})) }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ ...options, options }),
  notFound: () => ({ notFound: true }),
}))

type Loader = (context: { readonly params: { readonly cui: string }; readonly abortController: AbortController }) => Promise<unknown>
const load = async (cui: string) => {
  const { Route } = (await import('./ngos.$cui')) as unknown as { readonly Route: { readonly options: { readonly loader: Loader } } }
  return Route.options.loader({ params: { cui }, abortController: new AbortController() })
}
const settled = (promise: Promise<unknown>) => promise.then((value) => ({ value }), (error: unknown) => ({ error }))

describe('the NGO profile route’s loader', () => {
  it('reads the profile, its purpose with it, and the statements at once and hands them over', async () => {
    api.fetchNgoOrganization.mockResolvedValueOnce(FUNKY)
    api.fetchNgoStatements.mockResolvedValueOnce(FUNKY_STATEMENTS)
    expect(await load('RO30339344')).toEqual({ organization: FUNKY, statementsRead: { status: 'ready', statements: FUNKY_STATEMENTS } })
    expect(api.fetchNgoOrganization).toHaveBeenLastCalledWith('30339344', expect.anything())
  })

  it('is not found for a CUI that is no CUI, or that no organisation holds', async () => {
    expect(await settled(load('abc'))).toEqual({ error: { notFound: true } })
    api.fetchNgoOrganization.mockResolvedValueOnce(null)
    api.fetchNgoStatements.mockResolvedValueOnce([])
    expect(await settled(load('123'))).toEqual({ error: { notFound: true } })
  })

  it('keeps the page when the statements fail, and fails it when the profile does', async () => {
    api.fetchNgoOrganization.mockResolvedValueOnce(FUNKY)
    api.fetchNgoStatements.mockRejectedValueOnce(new Error('502'))
    expect(await load('30339344')).toMatchObject({ statementsRead: { status: 'failed' } })
    api.fetchNgoOrganization.mockRejectedValueOnce(new Error('503'))
    api.fetchNgoStatements.mockResolvedValueOnce([])
    expect(await settled(load('30339344'))).toMatchObject({ error: { message: '503' } })
  })

  it('lets a navigation’s abort through the statements read', async () => {
    api.fetchNgoOrganization.mockResolvedValueOnce(FUNKY)
    api.fetchNgoStatements.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))
    expect(await settled(load('30339344'))).toMatchObject({ error: { name: 'AbortError' } })
  })
})
