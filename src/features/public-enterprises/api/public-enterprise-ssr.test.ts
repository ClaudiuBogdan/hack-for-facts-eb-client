import { describe, expect, it, vi } from 'vitest'

const { fetchPublicEnterprise, fetchPrivateCompanyProfile, fetchProcurementBuyer } = vi.hoisted(() => ({
  fetchPublicEnterprise: vi.fn(),
  fetchPrivateCompanyProfile: vi.fn(),
  fetchProcurementBuyer: vi.fn(),
}))
vi.mock('./public-enterprise-api', () => ({ fetchPublicEnterprise }))
vi.mock('@/features/private-companies/api/private-company-api', () => ({ fetchPrivateCompanyProfile }))
vi.mock('@/features/procurement/api/procurement-buyer-api', () => ({ fetchProcurementBuyer }))
const disclosure = vi.hoisted(() => ({ version: 'v1' as string | null }))
vi.mock('@/features/procurement/api/procurement-da-release-status', () => ({ disclosureVersion: () => Promise.resolve(disclosure.version) }))

import { enterpriseReadFixture } from '../lib/test/enterprise-fixture'
import { isCompleteServerRead, readPublicEnterpriseForSsr } from './public-enterprise-ssr'

describe('the enterprise page’s server reads', () => {
  it('reads the three side by side, the buyer for the last twelve months', async () => {
    fetchPublicEnterprise.mockResolvedValueOnce(enterpriseReadFixture())
    fetchPrivateCompanyProfile.mockResolvedValueOnce(null)
    fetchProcurementBuyer.mockResolvedValueOnce({ partial: false })
    const read = await readPublicEnterpriseForSsr('789401')
    expect(read).toEqual({ enterprise: enterpriseReadFixture(), company: null, buyer: { partial: false }, disclosureKnown: true, disclosure: 'v1', disclosureReadAt: expect.any(Number) })
    expect(fetchProcurementBuyer).toHaveBeenCalledWith('789401', 'recent', expect.any(AbortSignal))
    expect(isCompleteServerRead(read)).toBe(true)
  })

  it('reads the company\'s public money (its incoming direct purchases) and the buyer profile on every render, never kept (D6)', async () => {
    fetchPublicEnterprise.mockResolvedValue(enterpriseReadFixture({ cui: '11054545' }))
    fetchPrivateCompanyProfile.mockReset().mockResolvedValue(null)
    fetchProcurementBuyer.mockReset().mockResolvedValue({ partial: false })
    await readPublicEnterpriseForSsr('11054545')
    await readPublicEnterpriseForSsr('11054545')
    expect(fetchPrivateCompanyProfile).toHaveBeenCalledTimes(2)
    expect(fetchProcurementBuyer).toHaveBeenCalledTimes(2)
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

  it('keeps no render, and no buyer profile, whose disclosure publication cannot be read (D6)', () => {
    expect(isCompleteServerRead({ enterprise: enterpriseReadFixture(), company: null, buyer: { partial: false } as never, disclosureKnown: false })).toBe(false)
    expect(isCompleteServerRead({ enterprise: enterpriseReadFixture(), company: null, buyer: { partial: false } as never, disclosureKnown: true })).toBe(true)
  })

  it('does not cache a render from a partial read', () => {
    expect(isCompleteServerRead({ enterprise: enterpriseReadFixture({ partial: true }), company: null, buyer: { partial: false } as never })).toBe(false)
    expect(isCompleteServerRead({ enterprise: enterpriseReadFixture(), company: null, buyer: { partial: true } as never })).toBe(false)
  })
})
