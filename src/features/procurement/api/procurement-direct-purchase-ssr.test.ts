import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DirectPurchase, DpContext } from '../lib/direct-purchase-model'

const status = vi.hoisted(() => ({ disclosureVersion: vi.fn<(options?: { readonly fresh?: boolean }) => Promise<string | null>>() }))
const api = vi.hoisted(() => ({ fetchDirectPurchase: vi.fn(), fetchDirectPurchaseContext: vi.fn() }))

vi.mock('./procurement-da-release-status', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./procurement-da-release-status')>()),
  disclosureVersion: status.disclosureVersion,
}))
vi.mock('./procurement-direct-purchase-api', () => api)
const release = vi.hoisted(() => ({ fetchPurchaseForPage: vi.fn() }))
vi.mock('./procurement-da-release-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./procurement-da-release-api')>()),
  fetchPurchaseForPage: release.fetchPurchaseForPage,
  // The D6 gate in front of it is the release API's own (tested there): here, the legacy read itself.
  fetchLegacyPurchase: (id: string, signal?: AbortSignal) => api.fetchDirectPurchase(id, signal),
}))
vi.mock('../lib/direct-purchase-model', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/direct-purchase-model')>()
  return {
    ...real,
    // A stand-in purchase has a context to read; a full one (its supplier marked) goes through the real gate.
    contextInputOf: (purchase: DirectPurchase) =>
      'listedOnly' in purchase.supplier ? real.contextInputOf(purchase) : { id: purchase.id, authorityCui: '4267117', supplierCui: '14837428', day: '2025-03-04', yearDay: '2025-03-04' },
  }
})

const { readProcurementDirectPurchaseForSsr } = await import('./procurement-direct-purchase-ssr')
const { DaReleaseOffError } = await import('./procurement-da-release-api')

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

  it('a purchase whose supplier is listed by its code with no party id: no context read (naming step 2b, root 24 November 2026)', async () => {
    const { mapReleasePurchase } = await import('../lib/direct-purchase-release')
    const { NO_NAMES } = await import('../lib/direct-purchase-model')
    const { rawReleaseDetail } = await import('../lib/direct-purchase-release.fixture')
    for (const supplier of [
      { displayKind: 'person_masked', partyId: null, name: 'Ion P*** PFA', fiscalCode: '30111222' },
      { displayKind: 'code_only', partyId: null, name: null, fiscalCode: '30111223' },
    ]) {
      const purchase = mapReleasePurchase(rawReleaseDetail({ supplier }), NO_NAMES)
      api.fetchDirectPurchase.mockResolvedValue(purchase)
      release.fetchPurchaseForPage.mockResolvedValue(purchase)
      const read = await readProcurementDirectPurchaseForSsr(purchase.id)
      // The page has no context, said as such: never one read for the pair.
      expect(read).toEqual({ id: purchase.id, purchase, context: null })
    }
    expect(api.fetchDirectPurchaseContext).not.toHaveBeenCalled()
  })

  it('a failed purchase read leaves the page to the browser, with no context lookup', async () => {
    api.fetchDirectPurchase.mockRejectedValue(new Error('down'))
    await expect(readProcurementDirectPurchaseForSsr('9000002')).resolves.toEqual({ id: '9000002' })
    expect(api.fetchDirectPurchaseContext).not.toHaveBeenCalled()
  })

  it('a release id while the release is off is not available yet: no purchase, no failed read, no context', async () => {
    release.fetchPurchaseForPage.mockRejectedValue(new DaReleaseOffError())
    await expect(readProcurementDirectPurchaseForSsr('a'.repeat(64))).resolves.toEqual({ id: 'a'.repeat(64), releaseOff: true })
    expect(api.fetchDirectPurchaseContext).not.toHaveBeenCalled()
  })
})
