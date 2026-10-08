import { afterEach, describe, expect, it, vi } from 'vitest'
import { PORTFOLIO_SNAPSHOT_VERSION } from '../lib/portfolio-index'
import { portfolioFixture } from '../lib/test/portfolio-fixture'
import { fetchAuthorityPortfolio } from './authority-portfolio-api'

const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

describe('a client-side navigation’s portfolio read', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the authority’s part from its JSON address, versioned by the snapshot, parsed', async () => {
    const fetchMock = respond(200, portfolioFixture('4270740'))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    expect(await fetchAuthorityPortfolio('4270740', { signal: controller.signal })).toEqual(portfolioFixture('4270740'))
    expect(fetchMock).toHaveBeenCalledWith(`/public-enterprises/authorities/4270740/portfolio.json?v=${encodeURIComponent(PORTFOLIO_SNAPSHOT_VERSION)}`, expect.objectContaining({ signal: controller.signal }))
  })

  it('answers null for an authority the server does not hold', async () => {
    vi.stubGlobal('fetch', respond(404, { error: 'not_found' }))
    expect(await fetchAuthorityPortfolio('99999999')).toBeNull()
  })

  it('fails loudly on a failed read or a body of another shape, never drawing a wrong page', async () => {
    vi.stubGlobal('fetch', respond(502, {}))
    await expect(fetchAuthorityPortfolio('4270740')).rejects.toThrow('502')
    vi.stubGlobal('fetch', respond(200, { ...portfolioFixture('4270740'), enterprises: [{ cui: '1' }] }))
    await expect(fetchAuthorityPortfolio('4270740')).rejects.toThrow()
  })
})
