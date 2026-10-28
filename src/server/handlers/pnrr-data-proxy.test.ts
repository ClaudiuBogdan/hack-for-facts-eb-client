import { brotliDecompressSync, gunzipSync, gzipSync } from 'node:zlib'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PNRR_SNAPSHOT_PREFIX } from '@/features/pnrr/lib/snapshot'
import { handlePnrrRawDataRequest } from './pnrr-data-proxy'

// The upstream file is gzip of indented JSON; one value has more digits than
// a double keeps, so minifying must not change what a reader parses.
const INDICATORS = {
  items: [{ alocat_eur: 21410527592.990002, nr_proiecte: 21785, eticheta: 'Național' }],
  hasMore: false,
}
const UPSTREAM_TEXT = JSON.stringify(INDICATORS, null, 4)
const fetchUpstream = vi.fn(
  async () => new Response(gzipSync(UPSTREAM_TEXT), { status: 200 }),
)

function rawRequest(
  query: string,
  headers: Record<string, string> = {},
): Request {
  return new Request(`https://example.test/api/pnrr/raw/indicators${query}`, {
    headers,
  })
}

describe('handlePnrrRawDataRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchUpstream)
  })

  it('serves the versioned file as immutable, minified and brotli-compressed, with an ETag', async () => {
    const response = await handlePnrrRawDataRequest(
      'indicators',
      rawRequest(`?v=${PNRR_SNAPSHOT_PREFIX}`, {
        'accept-encoding': 'gzip, deflate, br, zstd',
      }),
    )
    const body = brotliDecompressSync(Buffer.from(await response.arrayBuffer()))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    )
    expect(response.headers.get('content-encoding')).toBe('br')
    expect(response.headers.get('vary')).toBe('Accept-Encoding')
    expect(response.headers.get('etag')).toMatch(/^"[\w-]+-min-br"$/)
    expect(body.toString('utf8')).toBe(JSON.stringify(JSON.parse(UPSTREAM_TEXT)))
    expect(JSON.parse(body.toString('utf8'))).toEqual(JSON.parse(UPSTREAM_TEXT))
  })

  it('answers 304 to a matching If-None-Match', async () => {
    const first = await handlePnrrRawDataRequest(
      'indicators',
      rawRequest(`?v=${PNRR_SNAPSHOT_PREFIX}`, { 'accept-encoding': 'br' }),
    )
    const etag = first.headers.get('etag') ?? ''

    const second = await handlePnrrRawDataRequest(
      'indicators',
      rawRequest(`?v=${PNRR_SNAPSHOT_PREFIX}`, {
        'accept-encoding': 'br',
        'if-none-match': `W/${etag}`,
      }),
    )

    expect(second.status).toBe(304)
    expect(second.headers.get('etag')).toBe(etag)
    expect(await second.text()).toBe('')
  })

  it('sends gzip to a client without brotli, under another ETag', async () => {
    const response = await handlePnrrRawDataRequest(
      'indicators',
      rawRequest(`?v=${PNRR_SNAPSHOT_PREFIX}`, {
        'accept-encoding': 'gzip, br;q=0',
      }),
    )
    const body = gunzipSync(Buffer.from(await response.arrayBuffer()))

    expect(response.headers.get('content-encoding')).toBe('gzip')
    expect(response.headers.get('etag')).toMatch(/-min-gz"$/)
    expect(JSON.parse(body.toString('utf8'))).toEqual(INDICATORS)
  })

  it('sends the upstream text to a client that accepts no encoding', async () => {
    const response = await handlePnrrRawDataRequest(
      'indicators',
      rawRequest(`?v=${PNRR_SNAPSHOT_PREFIX}`),
    )

    expect(response.headers.get('content-encoding')).toBeNull()
    expect(response.headers.get('etag')).toMatch(/^"[\w-]+"$/)
    expect(await response.text()).toBe(UPSTREAM_TEXT)
  })

  it('keeps the short cache for an unversioned or other-version URL', async () => {
    for (const query of ['', '?v=20250101']) {
      const response = await handlePnrrRawDataRequest(
        'indicators',
        rawRequest(query, { 'accept-encoding': 'br' }),
      )

      expect(response.headers.get('cache-control')).toBe(
        'public, max-age=60, s-maxage=3600, stale-while-revalidate=600',
      )
    }
  })
})
