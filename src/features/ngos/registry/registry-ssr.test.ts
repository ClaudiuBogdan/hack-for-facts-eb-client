import { beforeEach, describe, expect, it, vi } from 'vitest'
import { i18n } from '@lingui/core'
import { row, snapshot } from './test/fixtures'

const api = vi.hoisted(() => ({ fetchRegistryRecords: vi.fn() }))
vi.mock('./api', () => api)

i18n.load('ro', {})
i18n.activate('ro')

const page = (overrides: Partial<typeof snapshot> = {}) => ({
  edges: [{ cursor: 'a', node: row() }],
  pageInfo: { hasNextPage: true, endCursor: 'a' },
  snapshot: { ...snapshot, ...overrides },
})

describe('the registry’s read for the server’s render', () => {
  beforeEach(() => api.fetchRegistryRecords.mockReset())

  it('reads the first page and counts the selection from the whole registry, the counts staying on the server', async () => {
    const { readRegistryForSsr } = await import('./registry-ssr')
    api.fetchRegistryRecords.mockResolvedValueOnce(page())
    const { seed, complete } = await readRegistryForSsr({ county: 'cluj', status: 'Radiat' })
    expect(complete).toBe(true)
    expect(seed.key).toBe(JSON.stringify({ county: 'CLUJ', status: 'Radiat' }))
    expect(seed.tally?.total).toBe(354)
    // A county's localities travel with it: its „Pe localități" reads them.
    expect(seed.tally?.by.localitate.length).toBeGreaterThan(0)
    expect(api.fetchRegistryRecords).toHaveBeenCalledWith({ county: { eq: 'CLUJ' }, status: { eq: 'Radiat' } }, expect.objectContaining({ first: 100 }))
  })

  it('sends the country’s tally without its ~3,000 localities, which no tab of it shows', async () => {
    const { readRegistryForSsr } = await import('./registry-ssr')
    api.fetchRegistryRecords.mockResolvedValueOnce(page())
    const { seed } = await readRegistryForSsr({})
    expect(seed.tally?.total).toBe(141_226)
    expect(seed.tally?.by.localitate).toEqual([])
  })

  it('counts nothing from counts of another export, nor a name, which the counts do not keep', async () => {
    const { readRegistryForSsr } = await import('./registry-ssr')
    api.fetchRegistryRecords.mockResolvedValueOnce(page({ id: 'ngos:mj_rnong:registry_export:newer' }))
    expect((await readRegistryForSsr({})).seed.tally).toBeNull()
    api.fetchRegistryRecords.mockResolvedValueOnce(page())
    expect((await readRegistryForSsr({ q: 'banca' })).seed.tally).toBeNull()
  })

  it('renders without the first page when the read fails, and says the render is not to be cached', async () => {
    const { readRegistryForSsr } = await import('./registry-ssr')
    api.fetchRegistryRecords.mockRejectedValueOnce(new Error('down'))
    expect(await readRegistryForSsr({ status: 'Radiat' })).toEqual({
      seed: { key: JSON.stringify({ status: 'Radiat' }), page: null, tally: null, readAt: expect.any(Number) },
      complete: false,
    })
  })
})
