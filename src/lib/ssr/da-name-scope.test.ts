import { describe, expect, it, vi } from 'vitest'
import { createNoStoreHeaders } from '@/lib/http-cache'
import { markDaSupplierNamed } from '@/lib/da-supplier-name-mark'
import { isNamedDaSupplier, isNamedDaSupplierBucket } from '@/features/procurement/lib/withheld-party'
import { supplierNameOf } from '@/features/procurement/lib/direct-purchase-value'
import { DA_DISCLOSURE_CACHE } from '@/features/procurement/lib/disclosure-cache'
import { asNoStore, withDaNameScope } from './da-name-scope'

/** A render with a DA route's public headers, as a production build writes them (`createPublicPageCacheHeaders` writes `no-store` under `vite dev`). */
const cacheable = () =>
  new Response('<html></html>', {
    status: 200,
    headers: {
      'Cache-Control': `public, max-age=0, s-maxage=${DA_DISCLOSURE_CACHE.sharedMaxAgeSeconds}, stale-while-revalidate=0`,
      'CDN-Cache-Control': `s-maxage=${DA_DISCLOSURE_CACHE.sharedMaxAgeSeconds}, stale-while-revalidate=0`,
      'Cloudflare-CDN-Cache-Control': 's-maxage=600',
      'Surrogate-Control': 'max-age=600',
      Vary: 'Accept-Encoding, Cookie',
      ETag: '"x"',
      'Content-Type': 'text/html',
    },
  })

/** Whether any header lets a cache keep the response: anything but `no-store` in every caching header a CDN reads. */
const keepable = (response: Response) =>
  response.headers.get('Cache-Control') !== 'no-store' ||
  response.headers.get('CDN-Cache-Control') !== 'no-store' ||
  ['Cloudflare-CDN-Cache-Control', 'Surrogate-Control', 'Expires', 'ETag', 'Last-Modified'].some((name) => response.headers.has(name))

const tick = () => new Promise((resolve) => setTimeout(resolve, 1))

describe('a render that names a direct-purchase supplier (root ruling 2026-11-22 under 22a47bb2)', () => {
  it('cannot go out with a cacheable header, whatever its route asked for', async () => {
    const namers = [
      () => isNamedDaSupplier({ displayKind: 'company' }),
      () => isNamedDaSupplierBucket({ key: '14837428', displayKind: 'company' }),
      () => supplierNameOf({ displayKind: 'company', name: 'Floraria Iris SRL', cui: '14837428' }),
    ]
    for (const name of namers) {
      const response = await withDaNameScope(async () => {
        await tick()
        name()
        await tick()
        return cacheable()
      })
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(response.headers.get('CDN-Cache-Control')).toBe('no-store')
      expect(keepable(response)).toBe(false)
      expect(response.headers.get('Content-Type')).toBe('text/html')
    }
  })

  it('a render that names none keeps its own headers', async () => {
    const response = await withDaNameScope(() => {
      isNamedDaSupplier({ displayKind: 'natural_person' })
      isNamedDaSupplier({ displayKind: null })
      isNamedDaSupplierBucket({ key: 'natural_person', displayKind: 'company' })
      supplierNameOf({ displayKind: 'company', name: ' ', cui: '1' })
      return cacheable()
    })
    expect(response.headers.get('CDN-Cache-Control')).toContain('s-maxage=600')
  })

  it('keeps each request to itself: a concurrent request that names one does not mark another', async () => {
    const [named, plain] = await Promise.all([
      withDaNameScope(async () => {
        await tick()
        markDaSupplierNamed()
        return cacheable()
      }),
      withDaNameScope(async () => {
        await tick()
        await tick()
        return cacheable()
      }),
    ])
    expect(named.headers.get('Cache-Control')).toBe('no-store')
    expect(plain.headers.get('CDN-Cache-Control')).toContain('s-maxage=600')
  })

  it('a mark outside any request changes nothing', async () => {
    markDaSupplierNamed()
    const response = await withDaNameScope(() => cacheable())
    expect(response.headers.get('CDN-Cache-Control')).toContain('s-maxage=600')
  })

  it('a name decided after the response was built is said on stderr', async () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    // A continuation of the same request after the handler returned (a deferred render).
    await withDaNameScope(() => {
      setTimeout(() => markDaSupplierNamed(), 5)
      return cacheable()
    })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(write).toHaveBeenCalledWith(expect.stringContaining('named after the response was built'))
    write.mockRestore()
  })

  it('copies a response whose headers are immutable', () => {
    const immutable = Response.redirect('https://example.test/', 302)
    const copy = asNoStore(immutable)
    expect(copy.status).toBe(302)
    expect(copy.headers.get('Cache-Control')).toBe('no-store')
  })

  it('a no-store render stays no-store', async () => {
    const response = await withDaNameScope(() => {
      markDaSupplierNamed()
      return new Response(null, { headers: createNoStoreHeaders() })
    })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})
