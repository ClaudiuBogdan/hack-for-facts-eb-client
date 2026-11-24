import { describe, expect, it, vi } from 'vitest'
import { createNoStoreHeaders } from '@/lib/http-cache'
import { markDaSupplierNamed } from '@/lib/da-supplier-name-mark'
import { isNamedDaSupplier, isShownDaSupplierBucket } from '@/features/procurement/lib/withheld-party'
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
      () => isShownDaSupplierBucket({ key: '14837428', displayKind: 'company' }),
      () => supplierNameOf({ displayKind: 'company', name: 'Floraria Iris SRL', cui: '14837428' }),
      // Step 2: a masked name, or a code alone, is shown too.
      () => isShownDaSupplierBucket({ key: '30111222', displayKind: 'person_masked', displayName: 'Ion P*** PFA' }),
      () => supplierNameOf({ displayKind: 'code_only', name: null, cui: '30111222' }),
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
      isShownDaSupplierBucket({ key: 'natural_person', displayKind: 'company' })
      isShownDaSupplierBucket({ key: '30111222', displayKind: 'some_future_kind' })
      supplierNameOf({ displayKind: 'company', name: ' ', cui: '1' })
      supplierNameOf({ displayKind: 'code_only', name: null, cui: null })
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

  it('says a late name once a request, and not at all for a response no cache keeps', async () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const late = (response: () => Response) =>
      withDaNameScope(() => {
        // A deferred render naming several suppliers after the response was built.
        setTimeout(() => {
          markDaSupplierNamed()
          markDaSupplierNamed()
          markDaSupplierNamed()
        }, 5)
        return response()
      })
    await late(cacheable)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(write.mock.calls.filter(([text]) => String(text).includes('named after the response was built'))).toHaveLength(1)
    write.mockClear()
    // Each request says its own: a second keepable one is said again.
    await late(cacheable)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(write.mock.calls.filter(([text]) => String(text).includes('named after the response was built'))).toHaveLength(1)
    write.mockClear()
    // Responses no cache keeps — the buyer page's route sends no-store itself; `no-store` among other directives, in any case,
    // with validators beside it: nothing to say.
    for (const headers of <Record<string, string>[]>[
      { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' },
      { 'Cache-Control': 'private, No-Store', ETag: '"x"', 'Last-Modified': 'Mon, 23 Nov 2026 10:00:00 GMT', Expires: '0' },
    ]) {
      await late(() => new Response('<html></html>', { status: 200, headers: { ...headers, 'Content-Type': 'text/html' } }))
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(write.mock.calls.filter(([text]) => String(text).includes('named after the response was built'))).toHaveLength(0)
    // A cache could keep these: said, each.
    for (const headers of <Record<string, string>[]>[
      { 'Cache-Control': 'public, max-age=600, no-storex' },
      { 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'max-age=600, ext="no-store"' },
      { 'Cache-Control': 'no-store', 'Surrogate-Control': 'max-age=600' },
    ]) {
      await late(() => new Response('<html></html>', { status: 200, headers }))
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(write.mock.calls.filter(([text]) => String(text).includes('named after the response was built'))).toHaveLength(3)
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
