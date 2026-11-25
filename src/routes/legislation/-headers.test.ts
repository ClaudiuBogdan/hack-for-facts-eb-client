import { describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}))
vi.mock('@/lib/http-cache', () => ({
  createNoStoreHeaders: () => ({ 'Cache-Control': 'no-store' }),
  // the policy's own Vary, as the real helper writes it, so the test sees what each route asks for
  createPublicPageCacheHeaders: (policy: { readonly vary?: readonly string[] }) => ({ 'Cache-Control': 'public', Vary: (policy.vary ?? ['Accept-Encoding']).join(', ') }),
}))

type Headers = (input: { readonly loaderData?: { readonly seeded?: boolean }; readonly match?: { readonly status: string } }) => Record<string, string>

const routes: readonly (readonly [string, () => Promise<{ readonly Route: unknown }>])[] = [
  ['/legislation', () => import('./index')],
  ['/legislation/analytics', () => import('./analytics')],
]

/** Both legislation routes go out publicly cached only for a render proven whole. */
describe.each(routes)('%s headers', (_name, load) => {
  const headersOf = async () => ((await load()).Route as { readonly headers: Headers }).headers

  it('are public for a successful match whose server reads all answered, and vary on the reader\'s cookies', async () => {
    // the page renders in the reader's language and consent, read from their cookies, as the other hubs do
    expect((await headersOf())({ loaderData: { seeded: true }, match: { status: 'success' } })).toEqual({ 'Cache-Control': 'public', Vary: 'Accept-Encoding, Cookie' })
  })

  it('are no-store without loader data', async () => {
    expect((await headersOf())({ match: { status: 'success' } })).toEqual({ 'Cache-Control': 'no-store' })
    expect((await headersOf())({ loaderData: {}, match: { status: 'success' } })).toEqual({ 'Cache-Control': 'no-store' })
  })

  it('are no-store for an errored match, even with seeded loader data', async () => {
    expect((await headersOf())({ loaderData: { seeded: true }, match: { status: 'error' } })).toEqual({ 'Cache-Control': 'no-store' })
    expect((await headersOf())({ loaderData: { seeded: true } })).toEqual({ 'Cache-Control': 'no-store' })
  })

  it('are no-store when a server read failed (an expired memo met a 503)', async () => {
    expect((await headersOf())({ loaderData: { seeded: false }, match: { status: 'success' } })).toEqual({ 'Cache-Control': 'no-store' })
  })
})
