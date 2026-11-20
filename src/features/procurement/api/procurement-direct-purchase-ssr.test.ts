import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DirectPurchase, DpContext } from '../lib/direct-purchase-model'

const status = vi.hoisted(() => ({ disclosureVersion: vi.fn<(options?: { readonly fresh?: boolean }) => Promise<string | null>>() }))
const api = vi.hoisted(() => ({ fetchDirectPurchase: vi.fn(), fetchDirectPurchaseContext: vi.fn() }))

vi.mock('./procurement-da-release-status', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./procurement-da-release-status')>()),
  disclosureVersion: status.disclosureVersion,
}))
vi.mock('./procurement-direct-purchase-api', () => api)
vi.mock('../lib/direct-purchase-model', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/direct-purchase-model')>()),
  contextInputOf: (purchase: DirectPurchase) => ({ id: purchase.id, authorityCui: '4267117', supplierCui: '14837428', day: '2025-03-04', yearDay: '2025-03-04' }),
}))

const { readProcurementDirectPurchaseForSsr } = await import('./procurement-direct-purchase-ssr')

const purchaseOf = (id: string) => ({ id, partial: false, supplier: { cui: '14837428' } }) as unknown as DirectPurchase
const context = { partial: false } as unknown as DpContext

describe('readProcurementDirectPurchaseForSsr (D6: nothing kept in the server process)', () => {
  beforeEach(() => {
    status.disclosureVersion.mockReset()
    api.fetchDirectPurchase.mockReset()
    api.fetchDirectPurchaseContext.mockReset()
    api.fetchDirectPurchaseContext.mockResolvedValue(context)
  })

  it('reads the purchase and its context on every render, the context by the code the purchase read just served', async () => {
    api.fetchDirectPurchase.mockResolvedValue(purchaseOf('9000001'))
    await expect(readProcurementDirectPurchaseForSsr('9000001')).resolves.toMatchObject({ id: '9000001', context })
    await readProcurementDirectPurchaseForSsr('9000001')
    expect(api.fetchDirectPurchase).toHaveBeenCalledTimes(2)
    expect(api.fetchDirectPurchaseContext).toHaveBeenCalledTimes(2)
    // The status is not consulted: nothing is keyed by it.
    expect(status.disclosureVersion).not.toHaveBeenCalled()
  })

  it('a failed purchase read leaves the page to the browser, with no context lookup', async () => {
    api.fetchDirectPurchase.mockRejectedValue(new Error('down'))
    await expect(readProcurementDirectPurchaseForSsr('9000002')).resolves.toEqual({ id: '9000002' })
    expect(api.fetchDirectPurchaseContext).not.toHaveBeenCalled()
  })
})
