import { describe, expect, it } from 'vitest'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from './http-cache'

describe('createPublicPageCacheHeaders', () => {
  it('keeps every page out of shared caches, whatever policy the route asks for (CACHE-002)', () => {
    for (const policy of [
      { sharedMaxAgeSeconds: 600, staleWhileRevalidateSeconds: 3600 },
      { browserMaxAgeSeconds: 3600, sharedMaxAgeSeconds: 3600, staleWhileRevalidateSeconds: 604_800, vary: ['Accept-Encoding', 'Cookie'] },
    ]) {
      expect(createPublicPageCacheHeaders(policy)).toEqual({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' })
    }
  })
})

describe('createNoStoreHeaders', () => {
  it('stores nothing anywhere', () => {
    expect(createNoStoreHeaders()).toEqual({ 'Cache-Control': 'no-store' })
  })
})
