import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({ kind: 'redirect', options }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: redirectMock,
}))

type Guarded = { readonly beforeLoad: (input: { readonly search: Record<string, unknown> }) => void }

const route = async (load: () => Promise<{ readonly Route: unknown }>) => (await load()).Route as unknown as Guarded

/** The legislation pages the owner retired on 27 November 2026: their links forward, permanently. */
describe('the retired legislation pages', () => {
  beforeEach(() => {
    vi.resetModules()
    redirectMock.mockClear()
  })

  it('sends an Acte link to the search, its filters in the search’s keys and its language kept', async () => {
    const acts = await route(() => import('./acts/index'))
    expect(() => acts.beforeLoad({ search: { actType: 'lege', status: 'abrogat', lang: 'en' } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith({ to: '/legislation/search', search: { tip: 'lege', stare: 'abrogat', lang: 'en' }, replace: true, statusCode: 301 })
  })

  it('sends a bare Acte link to the acts in force', async () => {
    const acts = await route(() => import('./acts/index'))
    expect(() => acts.beforeLoad({ search: {} })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith({ to: '/legislation/search', search: { stare: 'in-vigoare' }, replace: true, statusCode: 301 })
  })

  it.each([
    ['gazette', () => import('./gazette')],
    ['guide', () => import('./guide')],
  ] as const)('sends /legislation/%s to the hub, keeping only the language', async (_name, load) => {
    const retired = await route(load)
    expect(() => retired.beforeLoad({ search: { year: 2010, part: 'PI', lang: 'en' } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith({ to: '/legislation', search: { lang: 'en' }, replace: true, statusCode: 301 })
  })
})
