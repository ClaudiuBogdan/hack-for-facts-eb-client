import { describe, expect, it, vi } from 'vitest'

const { fetchPublicEnterprise, fetchPrivateCompanyProfile, fetchProcurementBuyer } = vi.hoisted(() => ({
  fetchPublicEnterprise: vi.fn(),
  fetchPrivateCompanyProfile: vi.fn(),
  fetchProcurementBuyer: vi.fn(),
}))
vi.mock('./public-enterprise-api', () => ({ fetchPublicEnterprise }))
vi.mock('@/features/private-companies/api/private-company-api', () => ({ fetchPrivateCompanyProfile }))
vi.mock('@/features/procurement/api/procurement-buyer-api', () => ({ fetchProcurementBuyer }))

import { enterpriseReadFixture } from '../lib/test/enterprise-fixture'
import { isCompleteServerRead, readPublicEnterpriseForSsr } from './public-enterprise-ssr'

describe('the enterprise page’s server reads', () => {
  it('reads the three side by side, the buyer for the last twelve months', async () => {
    fetchPublicEnterprise.mockResolvedValueOnce(enterpriseReadFixture())
    fetchPrivateCompanyProfile.mockResolvedValueOnce(null)
    fetchProcurementBuyer.mockResolvedValueOnce({ partial: false })
    const read = await readPublicEnterpriseForSsr('789401')
    expect(read).toEqual({ enterprise: enterpriseReadFixture(), company: null, buyer: { partial: false } })
    expect(fetchProcurementBuyer).toHaveBeenCalledWith('789401', 'recent', expect.any(AbortSignal))
    expect(isCompleteServerRead(read)).toBe(true)
  })

  it('leaves a failed read out, the others standing, and the render uncached', async () => {
    fetchPublicEnterprise.mockResolvedValueOnce(enterpriseReadFixture({ cui: '13267213' }))
    fetchPrivateCompanyProfile.mockRejectedValueOnce(new Error('down'))
    fetchProcurementBuyer.mockResolvedValueOnce({ partial: false })
    const read = await readPublicEnterpriseForSsr('13267213')
    expect(read.company).toBeUndefined()
    expect(read.enterprise?.cui).toBe('13267213')
    expect(isCompleteServerRead(read)).toBe(false)
  })

  it('does not cache a render from a partial read', () => {
    expect(isCompleteServerRead({ enterprise: enterpriseReadFixture({ partial: true }), company: null, buyer: { partial: false } as never })).toBe(false)
    expect(isCompleteServerRead({ enterprise: enterpriseReadFixture(), company: null, buyer: { partial: true } as never })).toBe(false)
  })
})
