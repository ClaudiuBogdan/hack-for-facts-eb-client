import { describe, expect, it } from 'vitest'
import {
  resolveEntityPageCanonicalPathname,
  resolveEntityPageIndexability,
  resolveEntityPageRoutePolicy,
  resolveEntityPageShareImagePathname,
} from './entity-page-route-policy'

describe('entity-page-route-policy', () => {
  it('keeps /entities as the indexed canonical owner', () => {
    expect(
      resolveEntityPageCanonicalPathname({
        routeId: 'entities',
        cui: '4305857',
      }),
    ).toBe('/entities/4305857')
    expect(
      resolveEntityPageShareImagePathname({
        routeId: 'entities',
        cui: '4305857',
      }),
    ).toBe('/entities/4305857/share-image.png')
    expect(
      resolveEntityPageIndexability({
        routeId: 'entities',
        cui: '4305857',
      }),
    ).toBe(true)
  })

  it('keeps /primarie non-canonical and non-indexable during migration', () => {
    expect(
      resolveEntityPageCanonicalPathname({
        routeId: 'primarie',
        cui: '4305857',
      }),
    ).toBe('/entities/4305857')
    expect(
      resolveEntityPageShareImagePathname({
        routeId: 'primarie',
        cui: '4305857',
      }),
    ).toBe('/entities/4305857/share-image.png')
    expect(
      resolveEntityPageIndexability({
        routeId: 'primarie',
        cui: '4305857',
      }),
    ).toBe(false)
  })

  it('encodes and trims the cui in generated pathnames', () => {
    const policy = resolveEntityPageRoutePolicy({
      routeId: 'primarie',
      cui: ' 12/34 ',
    })

    expect(policy).toEqual({
      routeId: 'primarie',
      canonicalPathname: '/entities/12%2F34',
      shareImagePathname: '/entities/12%2F34/share-image.png',
      isIndexable: false,
    })
  })
})
