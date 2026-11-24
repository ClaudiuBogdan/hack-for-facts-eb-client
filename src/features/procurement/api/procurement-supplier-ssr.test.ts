import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'

const profile = vi.hoisted(() => vi.fn())
const direct = vi.hoisted(() => vi.fn())
vi.mock('./procurement-supplier-api', () => ({
  SUPPLIER_LARGEST_RECORDS: 5,
  fetchProcurementSupplier: (...args: unknown[]) => profile(...args),
  fetchProcurementSupplierDirect: (...args: unknown[]) => direct(...args),
}))

import { readProcurementSupplierForSsr } from './procurement-supplier-ssr'

const refused = (field = 'supplierCui') => new GraphQLRequestError('GraphQL errors: organization identifier is not publicly served', { graphQLErrors: [{ message: 'organization identifier is not publicly served', extensions: { code: 'INVALID_INPUT', type: 'InvalidInput', field } }] })
const legacyOff = () => new GraphQLRequestError('GraphQL errors: legacy procurement data is not served by this API', { graphQLErrors: [{ message: 'legacy procurement data is not served by this API', extensions: { code: 'SERVICE_UNAVAILABLE' } }] })

describe('readProcurementSupplierForSsr', () => {
  beforeEach(() => {
    profile.mockReset()
    direct.mockReset()
  })

  it('answers 404 when the API refuses the code, in whichever read the refusal comes', async () => {
    profile.mockRejectedValueOnce(refused())
    direct.mockResolvedValueOnce([])
    await expect(readProcurementSupplierForSsr('12345678901', 2025)).resolves.toEqual({ choice: 2025, notFound: true })
    // Legacy switched off: the profile fails on its contracts first, the direct read carries the refusal.
    profile.mockRejectedValueOnce(legacyOff())
    direct.mockRejectedValueOnce(refused())
    await expect(readProcurementSupplierForSsr('12345678901', 2025)).resolves.toEqual({ choice: 2025, notFound: true })
  })

  it('keeps a failed read a failed read, never a 404', async () => {
    profile.mockRejectedValueOnce(legacyOff())
    direct.mockResolvedValueOnce([])
    await expect(readProcurementSupplierForSsr('14837428', 2025)).resolves.toEqual({ choice: 2025, direct: [] })
    // The direct read refusing another part (a sort the API withholds) is no verdict on the code: the profile stands.
    const shown = { identity: { cui: '14837428' } }
    profile.mockResolvedValueOnce(shown)
    direct.mockRejectedValueOnce(refused('sort'))
    await expect(readProcurementSupplierForSsr('14837428', 2025)).resolves.toEqual({ choice: 2025, profile: shown })
  })
})
