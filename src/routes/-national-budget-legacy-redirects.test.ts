import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({ kind: 'redirect', options }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: redirectMock,
}))

type Guarded = { readonly beforeLoad: (input: { readonly search: Record<string, unknown> }) => void }

const explorer = async () => (await import('./budget-explorer')).Route as unknown as Guarded
const draft = async () => (await import('./buget-national-2026')).Route as unknown as Guarded

describe('the national budget pages that /national-budget replaced', () => {
  beforeEach(() => {
    vi.resetModules()
    redirectMock.mockClear()
  })

  it('sends a bare /budget-explorer to the national budget page, keeping the site keys', async () => {
    const route = await explorer()
    expect(() => route.beforeLoad({ search: { lang: 'en' } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith({ to: '/national-budget', search: { lang: 'en' }, replace: true, statusCode: 301 })
  })

  it('reads an explorer link that names only a year as that year of the national budget page, and drops the old revenue switch', async () => {
    const route = await explorer()
    expect(() => route.beforeLoad({ search: { year: 2024, accountCategory: 'vn' } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith({ to: '/national-budget', search: { an: 2024 }, replace: true, statusCode: 301 })
  })

  it('drops a year the national budget page cannot read', async () => {
    const route = await explorer()
    expect(() => route.beforeLoad({ search: { year: 'ieri' } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith({ to: '/national-budget', search: {}, replace: true, statusCode: 301 })
  })

  it.each([
    [{ filter: { county_codes: ['CJ'] } }],
    [{ view: 'treemap', year: 2023 }],
    [{ primary: 'ec' }],
    [{ treemapPath: '65' }],
  ])('keeps the explorer for a link with an explorer choice: %o', async (search) => {
    const route = await explorer()
    expect(() => route.beforeLoad({ search })).not.toThrow()
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('sends the retired 2026 draft page to the national budget page, its own keys left behind', async () => {
    const route = await draft()
    expect(() => route.beforeLoad({ search: { section: 'trend', currency: 'EUR', lang: 'en' } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith({ to: '/national-budget', search: { lang: 'en' }, replace: true, statusCode: 301 })
  })
})
