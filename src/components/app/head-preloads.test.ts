import { describe, expect, it } from 'vitest'
import type { Manifest, RouterManagedTag } from '@tanstack/react-router'
import { getDeferredRootPreloads, withoutDeferredPreloads } from './head-preloads'

const manifest: Manifest = {
  routes: {
    __root__: {
      preloads: ['/assets/index-a.js', '/assets/clerk-b.js', { href: '/assets/utils-c.js' }],
      scripts: [{ attrs: { type: 'module', async: true, src: '/assets/index-a.js' } }],
    },
    '/ngos': { preloads: ['/assets/ngos-d.js'] },
  },
}

const preload = (href: string): RouterManagedTag => ({ tag: 'link', attrs: { rel: 'modulepreload', href } })

describe('getDeferredRootPreloads', () => {
  it('names every root chunk preload but the entry', () => {
    expect([...getDeferredRootPreloads(manifest)]).toEqual(['/assets/clerk-b.js', '/assets/utils-c.js'])
  })

  it('names nothing without a manifest or root preloads', () => {
    expect(getDeferredRootPreloads(undefined).size).toBe(0)
    expect(getDeferredRootPreloads({ routes: {} }).size).toBe(0)
  })
})

describe('withoutDeferredPreloads', () => {
  it('drops the deferred chunk preloads and keeps the entry, the route chunks and every other tag', () => {
    const stylesheet: RouterManagedTag = { tag: 'link', attrs: { rel: 'stylesheet', href: '/assets/index.css' } }
    const font: RouterManagedTag = { tag: 'link', attrs: { rel: 'preload', as: 'font', href: '/fonts/inter.woff2' } }
    const title: RouterManagedTag = { tag: 'title', children: 'Transparenta.eu' }
    const tags = [
      title,
      preload('/assets/index-a.js'),
      preload('/assets/clerk-b.js'),
      preload('/assets/utils-c.js'),
      preload('/assets/ngos-d.js'),
      stylesheet,
      font,
    ]

    expect(withoutDeferredPreloads({ tags, deferred: getDeferredRootPreloads(manifest) })).toEqual([
      title,
      preload('/assets/index-a.js'),
      preload('/assets/ngos-d.js'),
      stylesheet,
      font,
    ])
  })

  it('drops a classic script preload of a deferred chunk too', () => {
    const scriptPreload: RouterManagedTag = { tag: 'link', attrs: { rel: 'preload', as: 'script', href: '/assets/clerk-b.js' } }
    expect(withoutDeferredPreloads({ tags: [scriptPreload], deferred: new Set(['/assets/clerk-b.js']) })).toEqual([])
  })
})
