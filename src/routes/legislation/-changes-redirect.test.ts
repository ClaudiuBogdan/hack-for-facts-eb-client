import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({ kind: 'redirect', options }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: redirectMock,
}))

type Guarded = { readonly beforeLoad: (input: { readonly search: Record<string, unknown> }) => void }

/** The Modificări page's earlier keys forward, for good, to the redesign's (owner, 28 November 2026). */
describe('old Modificări links', () => {
  beforeEach(() => {
    vi.resetModules()
    redirectMock.mockClear()
  })

  const changes = async () => (await import('./changes')).Route as unknown as Guarded

  it('forwards an old view to the new keys, the language kept', async () => {
    const route = await changes()
    expect(() => route.beforeLoad({ search: { view: 'nedatate', since: '2026-01-01', lang: 'en' } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith({ to: '/legislation/changes', search: { fila: 'fara-data', lang: 'en' }, replace: true, statusCode: 301 })
  })

  it('lets a link in the new keys through', async () => {
    const route = await changes()
    expect(() => route.beforeLoad({ search: { fila: 'legi-noi', fel: 'promulgare' } })).not.toThrow()
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
