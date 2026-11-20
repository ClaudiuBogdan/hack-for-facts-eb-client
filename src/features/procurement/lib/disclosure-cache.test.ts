import { describe, expect, it, vi } from 'vitest'
import { DA_QUERY_CACHE, DA_ROUTE_CACHE } from './disclosure-cache'
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
  it('a dated answer is never fresh past its read and goes half a minute after no page shows it', () => {
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
