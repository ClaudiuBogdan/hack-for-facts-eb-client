import { describe, expect, it, vi } from 'vitest'

/**
 * Root ruling 2026-11-22 under API 22a47bb2, through the real server entry: a
 * request whose loaders name a DA supplier goes out `no-store`, whatever its
 * route's headers; one that names none keeps them. The framework's handler is
 * stood in for by one that runs a "loader" and answers with a route's public
 * DA headers, as TanStack Start does after `router.load()`.
 */
const start = vi.hoisted(() => ({ handle: null as null | ((request: Request) => Promise<Response>) }))

vi.mock('@tanstack/react-start/server', () => ({
  createStartHandler: () => (request: Request) => start.handle!(request),
  defaultStreamHandler: vi.fn(),
  getResponseStatus: vi.fn(),
}))
vi.mock('@/lib/i18n-server-catalogs', () => ({ installServerCatalogs: () => undefined }))
vi.mock('@/lib/i18n-request-scope', () => ({ installRequestScopedI18n: () => undefined, runWithRequestI18n: <T,>(callback: () => T) => callback() }))

const server = (await import('./server')).default
const { isNamedDaSupplier } = await import('@/features/procurement/lib/withheld-party')

const publicPage = () =>
  new Response('<html>…</html>', {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=0', 'CDN-Cache-Control': 's-maxage=600, stale-while-revalidate=0', 'Content-Type': 'text/html' },
  })

const request = () => new Request('https://dev-chronos.transparenta.eu/procurement/direct-acquisitions/x')

describe('src/server.ts', () => {
  it('a request whose loader names a DA supplier cannot go out cacheable', async () => {
    start.handle = async () => {
      await Promise.resolve()
      isNamedDaSupplier({ displayKind: 'company' })
      return publicPage()
    }
    const response = await (server.fetch as unknown as (request: Request) => Promise<Response>)(request())
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('CDN-Cache-Control')).toBe('no-store')
  })

  it('a request that names none keeps its route headers', async () => {
    start.handle = async () => {
      isNamedDaSupplier({ displayKind: 'natural_person' })
      return publicPage()
    }
    const response = await (server.fetch as unknown as (request: Request) => Promise<Response>)(request())
    expect(response.headers.get('CDN-Cache-Control')).toContain('s-maxage=600')
  })
})
