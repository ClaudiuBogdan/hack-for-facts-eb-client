import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { NO_NAMES } from '../../lib/direct-purchase-model'
import { procurementDirectPurchaseKeys } from '../../lib/direct-purchase-keys'
import { mapReleasePurchase } from '../../lib/direct-purchase-release'
import { RELEASE_CASES, RELEASE_ID } from '../../lib/direct-purchase-release.fixture'
import { ProcurementDirectPurchasePage } from './procurement-direct-purchase-page'

/**
 * A legacy link in the browser: the purchase's read followed it to the
 * release's purchase, so the page replaces the URL with the release's id,
 * keeps the purchase under that id only, and drops it from the legacy key.
 */

const navigate = vi.fn((_options: unknown) => Promise.resolve())
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { readonly children: ReactNode }) => <a>{children}</a>,
  useRouter: () => ({ routesById: {}, state: { matches: [] } }),
  useNavigate: () => navigate,
}))
vi.mock('../../api/procurement-direct-purchase-api', () => ({
  fetchDirectPurchase: vi.fn(() => new Promise(() => undefined)),
  fetchDirectPurchaseContext: vi.fn(() => new Promise(() => undefined)),
}))
vi.mock('../../api/procurement-da-release-api', () => ({ fetchPurchaseForPage: vi.fn(() => new Promise(() => undefined)) }))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

describe('a legacy link that leads to the release', () => {
  it('replaces the URL with the release id, and keeps the purchase under that id only', async () => {
    // Kept as the app keeps a query (the test client collects at once): the release route's own query picks it up.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    const purchase = mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES)
    const legacyId = '10120196'
    client.setQueryData(procurementDirectPurchaseKeys.purchase(legacyId), purchase)
    render(
      <QueryClientProvider client={client}>
        <ProcurementDirectPurchasePage id={legacyId} initialData={{ id: legacyId, purchase, context: null }} />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/procurement/direct-acquisitions/$id', params: { id: RELEASE_ID }, replace: true }))
    expect(client.getQueryData(procurementDirectPurchaseKeys.purchase(RELEASE_ID))).toBe(purchase)
    await waitFor(() => expect(client.getQueryData(procurementDirectPurchaseKeys.purchase(legacyId))).toBeUndefined())
  })

  it('a legacy purchase stays where it is', async () => {
    navigate.mockClear()
    const client = createTestQueryClient()
    const purchase = { ...mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES), id: '10120196', money: null }
    render(
      <QueryClientProvider client={client}>
        <ProcurementDirectPurchasePage id="10120196" initialData={{ id: '10120196', purchase, context: null }} />
      </QueryClientProvider>,
    )
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(navigate).not.toHaveBeenCalled()
  })
})
