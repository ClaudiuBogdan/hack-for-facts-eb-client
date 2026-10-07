import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({ kind: 'redirect', options }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: redirectMock,
}))

type Guarded = {
  readonly beforeLoad: (input: {
    readonly search: Record<string, unknown>
    readonly params?: Record<string, string>
  }) => void
}

const frontDoor = async () => (await import('./index')).Route as unknown as Guarded
const profile = async () => (await import('./$cui')).Route as unknown as Guarded

describe('the retired mock-era public-enterprise pages', () => {
  beforeEach(() => {
    vi.resetModules()
    redirectMock.mockClear()
  })

  it('sends the front door to its new address for good, keeping only the language', async () => {
    const route = await frontDoor()
    expect(() => route.beforeLoad({ search: { lang: 'en', q: 'apa', county: ['CJ'], status: ['active'] } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith({ to: '/public-enterprises', search: { lang: 'en' }, replace: true, statusCode: 301 })
  })

  it('sends a profile to the enterprise page for good, its tab left behind', async () => {
    const route = await profile()
    expect(() => route.beforeLoad({ params: { cui: '10020943' }, search: { tab: 'indicatori' } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith({
      to: '/public-enterprises/$cui',
      params: { cui: '10020943' },
      search: {},
      replace: true,
      statusCode: 301,
    })
  })

  it('drops a leading zero an old link wrote', async () => {
    const route = await profile()
    expect(() => route.beforeLoad({ params: { cui: 'RO0010020943' }, search: {} })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith(expect.objectContaining({ params: { cui: '10020943' } }))
  })

  it('reads a CUI written with its prefix as its digits', async () => {
    const route = await profile()
    expect(() => route.beforeLoad({ params: { cui: 'RO-10020943' }, search: { lang: 'en' } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith(
      expect.objectContaining({ params: { cui: '10020943' }, search: { lang: 'en' } }),
    )
  })

  it.each(['abc', 'abc1', '2019-10020943'])('passes %s on as written, for the enterprise page to answer', async (cui) => {
    const route = await profile()
    expect(() => route.beforeLoad({ params: { cui }, search: {} })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith(expect.objectContaining({ params: { cui } }))
  })
})
