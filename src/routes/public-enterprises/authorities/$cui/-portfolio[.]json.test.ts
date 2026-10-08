import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const readAuthorityPortfolio = vi.fn()
vi.mock('@/features/public-enterprises/lib/portfolio-index', () => ({ PORTFOLIO_SNAPSHOT_VERSION: 'abc123' }))
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => options }))
vi.mock('@/features/public-enterprises/api/authority-portfolio-server', () => ({ readAuthorityPortfolio }))

type Handler = (input: { readonly request: Request; readonly params: { readonly cui: string } }) => Promise<Response>

const ask = (cui: string, version: string | null = 'abc123') => ({
  request: new Request(`https://transparenta.eu/public-enterprises/authorities/${cui}/portfolio.json${version === null ? '' : `?v=${version}`}`),
  params: { cui },
})

async function importRoute() {
  const { Route } = await import('./portfolio[.]json')
  return (Route as unknown as { readonly server: { readonly handlers: { readonly GET: Handler; readonly HEAD: Handler } } }).server.handlers
}

describe('the portfolio’s JSON route', () => {
  beforeEach(() => {
    readAuthorityPortfolio.mockReset()
    vi.stubEnv('DEV', false)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('serves the authority’s part for its own snapshot, cached a day, never indexed', async () => {
    readAuthorityPortfolio.mockResolvedValue({ authority: { cui: '4270740' }, enterprises: [] })
    const { GET, HEAD } = await importRoute()
    const response = await GET(ask('4270740'))
    expect(readAuthorityPortfolio).toHaveBeenCalledWith('4270740')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=86400')
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex')
    expect(await response.json()).toEqual({ authority: { cui: '4270740' }, enterprises: [] })
    const head = await HEAD(ask('4270740'))
    expect(head.status).toBe(200)
    expect(await head.text()).toBe('')
  })

  it('answers 404 for an authority it does not hold, and for a path that is not a canonical CUI, without reading', async () => {
    readAuthorityPortfolio.mockResolvedValue(null)
    const { GET } = await importRoute()
    const missing = await GET(ask('99999999'))
    expect(missing.status).toBe(404)
    expect(missing.headers.get('Cache-Control')).toContain('no-store')
    readAuthorityPortfolio.mockClear()
    for (const cui of ['0123', 'RO4270740', '__proto__']) expect((await GET(ask(cui))).status).toBe(404)
    expect(readAuthorityPortfolio).not.toHaveBeenCalled()
  })

  it('refuses another snapshot’s version with a 409 nothing keeps, and serves an unversioned ask uncached', async () => {
    readAuthorityPortfolio.mockResolvedValue({ authority: { cui: '4270740' }, enterprises: [] })
    const { GET } = await importRoute()
    const stale = await GET(ask('4270740', 'old999'))
    expect(stale.status).toBe(409)
    expect(stale.headers.get('Cache-Control')).toContain('no-store')
    expect(readAuthorityPortfolio).not.toHaveBeenCalled()
    const bare = await GET(ask('4270740', null))
    expect(bare.status).toBe(200)
    expect(bare.headers.get('Cache-Control')).toContain('no-store')
  })
})
