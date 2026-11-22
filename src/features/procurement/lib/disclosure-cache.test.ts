import { describe, expect, it, vi } from 'vitest'
import { dehydrate, hydrate, QueryClient, QueryObserver } from '@tanstack/react-query'
import { DA_QUERY_CACHE, DA_ROUTE_CACHE, removeDaQueriesWhenUnshown } from './disclosure-cache'
import { procurementBuyerQueryOptions, procurementBuyerRecordsQueryOptions } from '../hooks/use-procurement-buyer'
import { procurementSupplierDirectQueryOptions, procurementSupplierQueryOptions } from '../hooks/use-procurement-supplier'
import { procurementDirectPurchaseQueryOptions } from '../hooks/use-procurement-direct-purchase'
import { procurementHomeCategoriesQueryOptions, procurementHomeNationalQueryOptions } from '../hooks/use-procurement-home'
import { procurementSupplierSliceQueryOptions } from '../hooks/use-procurement-data'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
}))

/** D6 (root, 19 November 2026): direct-purchase answers are kept nowhere the client controls past their read, but the CDN. */
describe('direct-purchase caches in the browser', () => {
  it('a dated answer is never fresh past its read, marked as able to name a supplier, and kept half a minute only while no page has shown it', () => {
    expect(DA_QUERY_CACHE).toMatchObject({ staleTime: 0, gcTime: 30_000 })
    for (const options of [
      procurementBuyerQueryOptions('4267117', 'recent'),
      procurementBuyerRecordsQueryOptions('4267117', 'recent'),
      procurementSupplierQueryOptions('14837428', 'recent'),
      procurementSupplierDirectQueryOptions('14837428', 'recent'),
      procurementHomeNationalQueryOptions(2025),
      procurementHomeCategoriesQueryOptions(2025),
    ]) {
      expect(options).toMatchObject(DA_QUERY_CACHE)
    }
  })

  it('the reads the API now dates (API doc 10: the release purchase, the legacy detail and lists, the records connection) follow the dated rules', () => {
    expect(procurementDirectPurchaseQueryOptions('16957145')).toMatchObject(DA_QUERY_CACHE)
    expect(procurementSupplierSliceQueryOptions('14837428')).toMatchObject(DA_QUERY_CACHE)
  })

  it('a direct-purchase route keeps no loader data once left', async () => {
    expect(DA_ROUTE_CACHE).toEqual({ gcTime: 0, preloadGcTime: 0 })
    const routes = await Promise.all([
      import('@/routes/procurement/index'),
      import('@/routes/procurement/institutions/$cui'),
      import('@/routes/procurement/suppliers/$cui'),
      import('@/routes/procurement/direct-acquisitions/$id'),
      import('@/routes/procurement/contracts/$id'),
      import('@/routes/procurement/analytics'),
      import('@/routes/public-enterprises/$cui'),
    ])
    for (const route of routes) expect((route.Route as unknown as { options: object }).options).toMatchObject(DA_ROUTE_CACHE)
  })
})

/** Root ruling 2026-11-22 under API 22a47bb2: a DA supplier name is kept past no page that showed it. */
describe('removeDaQueriesWhenUnshown', () => {
  const setup = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const stop = removeDaQueriesWhenUnshown(client.getQueryCache())
    return { client, stop }
  }
  const observe = (client: QueryClient, key: readonly unknown[], options: object) =>
    new QueryObserver(client, { queryKey: key, queryFn: () => Promise.resolve({ supplier: 'Floraria Iris SRL' }), ...options })
  const watch = (client: QueryClient, key: readonly unknown[], options: object) => observe(client, key, options).subscribe(() => undefined)
  const find = (client: QueryClient, key: readonly unknown[]) => client.getQueryCache().find({ queryKey: key })
  /** Past the commit the removal waits for. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 5))

  it('removes a direct-purchase query once the last page showing it unmounts', async () => {
    const { client } = setup()
    const key = ['procurement', 'da', 1]
    const first = watch(client, key, DA_QUERY_CACHE)
    const second = watch(client, key, DA_QUERY_CACHE)
    await find(client, key)?.promise
    first()
    await settle()
    expect(client.getQueryData(key)).toBeDefined()
    second()
    await settle()
    expect(find(client, key)).toBeUndefined()
  })

  it('removes one still in flight', async () => {
    const { client } = setup()
    const key = ['procurement', 'da', 2]
    const unsubscribe = watch(client, key, { ...DA_QUERY_CACHE, queryFn: () => new Promise(() => undefined) })
    expect(find(client, key)?.state.fetchStatus).toBe('fetching')
    unsubscribe()
    await settle()
    expect(find(client, key)).toBeUndefined()
  })

  it('keeps the query for a page that takes over the same key in the same commit; that page reads it again, as any mount does', async () => {
    const { client } = setup()
    const key = ['procurement', 'da', 5]
    const reads = vi.fn(() => Promise.resolve({ supplier: 'Floraria Iris SRL' }))
    const leaving = watch(client, key, { ...DA_QUERY_CACHE, queryFn: reads })
    await find(client, key)?.promise
    const query = find(client, key)
    // The incoming page's observer is made during its render, before the old page's cleanup runs.
    const incoming = observe(client, key, { ...DA_QUERY_CACHE, queryFn: reads })
    leaving()
    const stay = incoming.subscribe(() => undefined)
    await settle()
    expect(find(client, key)).toBe(query)
    // The page's own read since was its first: the seed rule reads again on mount.
    expect(reads).toHaveBeenCalledTimes(2)
    stay()
    await settle()
    expect(find(client, key)).toBeUndefined()
  })

  it('an unmarked observer of the same key does not clear the mark', async () => {
    const { client } = setup()
    const key = ['procurement', 'da', 6]
    const marked = watch(client, key, DA_QUERY_CACHE)
    await find(client, key)?.promise
    const plain = watch(client, key, { staleTime: 60_000 })
    marked()
    plain()
    await settle()
    expect(find(client, key)).toBeUndefined()
  })

  it('leaves other queries to their own lifetime', async () => {
    const { client } = setup()
    const key = ['procurement', 'contract', 1]
    const unsubscribe = watch(client, key, { staleTime: 60_000 })
    await find(client, key)?.promise
    unsubscribe()
    await settle()
    expect(client.getQueryData(key)).toBeDefined()
  })

  it('a page seeded by its loader (initialData) does not read on mount, and its seed goes when the page is left', async () => {
    const { client } = setup()
    const key = ['procurement', 'da', 7]
    const reads = vi.fn(() => Promise.resolve({ supplier: 'other' }))
    const unsubscribe = watch(client, key, { ...DA_QUERY_CACHE, queryFn: reads, initialData: { supplier: 'Floraria Iris SRL' } })
    await settle()
    expect(reads).not.toHaveBeenCalled()
    expect(client.getQueryData(key)).toEqual({ supplier: 'Floraria Iris SRL' })
    unsubscribe()
    await settle()
    expect(find(client, key)).toBeUndefined()
  })

  it('a marked prefetch stays marked when an unmarked observer is the one that shows it', async () => {
    const { client } = setup()
    const key = ['procurement', 'da', 8]
    await client.prefetchQuery({ queryKey: key, queryFn: () => ({ supplier: 'Floraria Iris SRL' }), ...DA_QUERY_CACHE })
    const unsubscribe = watch(client, key, { staleTime: 60_000 })
    unsubscribe()
    await settle()
    expect(find(client, key)).toBeUndefined()
  })

  it('leaves a hydrated seed that no page has shown yet, and removes it once its page is left', async () => {
    const server = new QueryClient()
    const key = ['procurement', 'da', 3]
    await server.prefetchQuery({ queryKey: key, queryFn: () => ({ supplier: 'Floraria Iris SRL' }) })
    const { client } = setup()
    hydrate(client, dehydrate(server))
    await settle()
    expect(client.getQueryData(key)).toBeDefined()
    const unsubscribe = watch(client, key, DA_QUERY_CACHE)
    unsubscribe()
    await settle()
    expect(find(client, key)).toBeUndefined()
  })

  it('stops when unsubscribed, a pending removal included', async () => {
    const { client, stop } = setup()
    const key = ['procurement', 'da', 4]
    const unsubscribe = watch(client, key, DA_QUERY_CACHE)
    await find(client, key)?.promise
    unsubscribe()
    stop()
    await settle()
    expect(client.getQueryData(key)).toBeDefined()
  })
})
