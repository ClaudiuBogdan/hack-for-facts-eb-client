import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/lib/queryClient'
import { companyProfile } from '../lib/company-profile.fixture'
import { privateCompanyProfileQueryKey, privateCompanyProfileQueryOptions } from './use-private-company-profile'

/**
 * The company profile read as the route loader and the page share it, through
 * the app's own query client: every completed read is its own answer object,
 * even when it equals the last one — the page withdraws an answer by identity
 * when a dependent read finds the company gone, and a fresh read that finds it
 * again must reach the page as a new answer. Until such a read completes, the
 * cache answers with the object it holds.
 */

const api = vi.hoisted(() => ({ profile: vi.fn<(cui: string) => Promise<unknown>>() }))

vi.mock('../api/private-company-api', () => ({
  fetchPrivateCompanyProfile: (cui: string) => api.profile(cui),
}))

const CUI = companyProfile().cui ?? ''

describe('privateCompanyProfileQueryOptions', () => {
  beforeEach(() => {
    api.profile.mockReset()
  })

  it('keeps each completed read as its own answer, even one deep-equal to the last', async () => {
    const client = createQueryClient()
    const first = companyProfile({ legalName: 'PREZENT SRL' })
    const again = companyProfile({ legalName: 'PREZENT SRL' })
    expect(again).toEqual(first)
    api.profile.mockResolvedValueOnce(first).mockResolvedValueOnce(again)

    expect(await client.fetchQuery(privateCompanyProfileQueryOptions(CUI))).toBe(first)
    // Never fresh past its read (D6, root: its public money carries direct purchases): asked again, it is read again —
    // and that completed read is its own object, not the earlier one it equals.
    expect(await client.fetchQuery(privateCompanyProfileQueryOptions(CUI))).toBe(again)
    expect(api.profile).toHaveBeenCalledTimes(2)
    expect(client.getQueryData(privateCompanyProfileQueryKey(CUI))).toBe(again)
    expect(client.getQueryData(privateCompanyProfileQueryKey(CUI))).not.toBe(first)
  })
})
