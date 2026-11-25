import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mapContractAward } from '@/features/procurement/lib/contract-award-model'
import { rawAward, RECORD_ID } from '@/features/procurement/lib/contract-award.fixture'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: () => notFoundError,
  redirect: (options: unknown) => ({ redirect: options }),
}))

const readForSsr = vi.fn()
vi.mock('@/features/procurement/api/procurement-contract-award-ssr', () => ({
  readContractAwardForSsr: (...args: unknown[]) => readForSsr(...args),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))
vi.mock('@/lib/i18n', () => ({ translatorFor: () => ({ _: (message: unknown) => String(message) }) }))

const { Route } = await import('./contract-awards/$id')

interface QueryClientStub {
  readonly prefetchQuery: ReturnType<typeof vi.fn>
  readonly getQueryData: ReturnType<typeof vi.fn>
}
const route = Route as unknown as {
  readonly loader: (input: { readonly context: { readonly queryClient: QueryClientStub }; readonly params: { readonly id: string } }) => Promise<Record<string, unknown>>
  readonly headers: (input: { readonly loaderData?: Record<string, unknown> }) => Record<string, string>
  readonly head: (input: {
    readonly params: { readonly id: string }
    readonly loaderData?: Record<string, unknown>
    readonly match: { readonly context: { readonly locale: string; readonly queryClient: QueryClientStub } }
  }) => { readonly meta: readonly Record<string, string>[] }
}

const queryClient = (): QueryClientStub => ({ prefetchQuery: vi.fn(() => new Promise(() => undefined)), getQueryData: vi.fn(() => undefined) })

/** Runs `body` with `globalThis.window` removed: the real loader-blocking sniff then says „server". */
async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', { value: realWindow, configurable: true, writable: true })
  }
}

const found = (id = RECORD_ID) => ({ id, read: { kind: 'found', award: mapContractAward(rawAward().award), reanchored: id !== RECORD_ID } })

/** `/procurement/contract-awards/$id` (PROC-KB0Z step 1): a 302 for an earlier build's id, a 404, and never a kept render. */
describe('contract-award route', () => {
  beforeEach(() => readForSsr.mockReset())

  it('serves a found award, and redirects an earlier build’s id to the current one', async () => {
    readForSsr.mockResolvedValueOnce(found())
    await expect(asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: RECORD_ID } }))).resolves.toMatchObject({ id: RECORD_ID })
    readForSsr.mockResolvedValueOnce(found('e_licitatie:ca:99:11'))
    await expect(asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: 'e_licitatie:ca:99:11' } }))).rejects.toEqual({
      redirect: { to: '/procurement/contract-awards/$id', params: { id: RECORD_ID }, replace: true, statusCode: 302 },
    })
  })

  it('is a 404 for no such award only: an award before 2021 and the switch off are pages of their own', async () => {
    readForSsr.mockResolvedValueOnce({ id: RECORD_ID, read: { kind: 'missing' } })
    await expect(asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: RECORD_ID } }))).rejects.toBe(notFoundError)
    readForSsr.mockResolvedValueOnce({ id: RECORD_ID, read: { kind: 'outside' } })
    await expect(asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: RECORD_ID } }))).resolves.toMatchObject({ read: { kind: 'outside' } })
    readForSsr.mockResolvedValueOnce({ id: RECORD_ID, off: true })
    await expect(asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: RECORD_ID } }))).resolves.toMatchObject({ off: true })
  })

  it('keeps no render in any cache, and keeps an award not shown from search engines', () => {
    const headers = route.headers({ loaderData: found() })
    expect(headers['Cache-Control']).toContain('no-store')
    expect(headers['CDN-Cache-Control']).toBe('no-store')
    const context = { locale: 'ro', queryClient: queryClient() }
    const shown = route.head({ params: { id: RECORD_ID }, loaderData: found(), match: { context } })
    expect(shown.meta.some((tag) => tag.name === 'robots')).toBe(false)
    expect(shown.meta[0]?.title).toContain('Reabilitare școala gimnazială nr. 2 — ORAȘUL OTOPENI')
    const outside = route.head({ params: { id: RECORD_ID }, loaderData: { id: RECORD_ID, read: { kind: 'outside' } }, match: { context } })
    expect(outside.meta).toContainEqual({ name: 'robots', content: 'noindex' })
  })
})
