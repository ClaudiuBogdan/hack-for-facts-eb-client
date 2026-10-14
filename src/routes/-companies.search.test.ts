import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ ...options, options }),
  redirect: (options: unknown) => ({ redirect: options }),
}))

type RouteOptions = {
  readonly beforeLoad: (input: { readonly location: { readonly search: Record<string, unknown> } }) => void
}

async function beforeLoad(search: Record<string, unknown>): Promise<unknown> {
  const { Route } = await import('./companies.search')
  try {
    ;(Route as unknown as { options: RouteOptions }).options.beforeLoad({ location: { search } })
  } catch (error) {
    return error
  }
  return undefined
}

describe('/companies/search, retired', () => {
  it('sends every address on for good: filters to the analysis, a CUI to its company, the rest to the front door', async () => {
    expect(await beforeLoad({ county: 'CJ', status: '1048', lang: 'en' })).toEqual({
      redirect: { to: '/companies/analytics', search: { lang: 'en', onrc_judet: 'CJ', onrc_stare: 1048 }, replace: true, statusCode: 301 },
    })
    expect(await beforeLoad({ q: '14399840' })).toEqual({
      redirect: { to: '/companies/$cui', params: { cui: '14399840' }, search: {}, replace: true, statusCode: 301 },
    })
    expect(await beforeLoad({})).toEqual({ redirect: { to: '/companies', search: {}, replace: true, statusCode: 301 } })
  })
})
