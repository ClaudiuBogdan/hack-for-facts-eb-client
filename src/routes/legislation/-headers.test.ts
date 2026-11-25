import { describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}))

type Headers = (input: { readonly loaderData?: { readonly seeded?: boolean }; readonly match?: { readonly status: string } }) => Record<string, string>

const routes: readonly (readonly [string, () => Promise<{ readonly Route: unknown }>])[] = [
  ['/legislation', () => import('./index')],
  ['/legislation/analytics', () => import('./analytics')],
]

const PRIVATE = { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' }

/**
 * Both legislation routes are never stored by a shared cache, on every path (root, 25 November 2026; CACHE-001):
 * they render in the reader's language from a cookie, and the CDN does not key on `Vary: Cookie`.
 */
describe.each(routes)('%s headers', (_name, load) => {
  const headersOf = async () => ((await load()).Route as { readonly headers: Headers }).headers

  it('are private, no-store for a whole render, with no Vary on cookies', async () => {
    const headers = (await headersOf())({ loaderData: { seeded: true }, match: { status: 'success' } })
    expect(headers).toEqual(PRIVATE)
    expect(headers).not.toHaveProperty('Vary')
  })

  it('are private, no-store without loader data, for an errored match and after a refused read', async () => {
    const headersFn = await headersOf()
    expect(headersFn({ match: { status: 'success' } })).toEqual(PRIVATE)
    expect(headersFn({ loaderData: { seeded: true }, match: { status: 'error' } })).toEqual(PRIVATE)
    expect(headersFn({ loaderData: { seeded: false }, match: { status: 'success' } })).toEqual(PRIVATE)
  })
})
