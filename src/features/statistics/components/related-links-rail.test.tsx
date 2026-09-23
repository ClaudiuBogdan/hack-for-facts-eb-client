import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { resolveTerritoryIdentity } from '../lib/territory'
import { parseRelatedLinkSearchParam } from '../test/statistics-test-utils'
import { RelatedLinksRail } from './related-links-rail'

// The router is not mounted here; its Link is stood in for by an anchor
// that serialises the search the way the router does (JSON per key), so
// the hrefs can be read back the way the destination reads them.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly search?: Readonly<Record<string, unknown>>
  }) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(search ?? {})) query.set(key, JSON.stringify(value))
    return (
      <a href={`${to}?${query.toString()}`} {...props}>
        {children}
      </a>
    )
  },
}))

describe('RelatedLinksRail', () => {
  it('scopes the map and the budget explorer to the locality by SIRUTA', () => {
    const identity = resolveTerritoryIdentity({
      siruta: '54975',
      liveName: 'Municipiul Cluj-Napoca',
      liveLevel: 'LAU',
    })
    render(<RelatedLinksRail identity={identity} />)

    const budget = screen.getByRole('link', { name: /Explorer bugetar/i }).getAttribute('href')!
    expect(budget.startsWith('/budget-explorer?')).toBe(true)
    expect(parseRelatedLinkSearchParam(budget, 'filter')).toEqual(
      expect.objectContaining({ uat_ids: ['54975'], is_uat: true }),
    )
    expect(parseRelatedLinkSearchParam(budget, 'filter')).not.toHaveProperty('is_territorial_executive')

    const map = screen.getByRole('link', { name: /Hartă teritorială/i }).getAttribute('href')!
    expect(map.startsWith('/map?')).toBe(true)
    expect(parseRelatedLinkSearchParam(map, 'mapViewType')).toBe('UAT')
    expect(parseRelatedLinkSearchParam(map, 'activeView')).toBe('map')
    expect(parseRelatedLinkSearchParam(map, 'filters')).toMatchObject({ is_uat: true, uat_ids: ['54975'] })
    expect(parseRelatedLinkSearchParam(map, 'filters')).not.toHaveProperty('is_territorial_executive')
  })

  it('includes councils and halls in county links without excluding UATs', () => {
    const identity = resolveTerritoryIdentity({ siruta: 'CJ', liveName: 'Cluj', liveLevel: 'NUTS3', liveCountyCode: 'CJ' })
    render(<RelatedLinksRail identity={identity} />)
    const links = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('/map?') || href.startsWith('/budget-explorer?'))
    expect(links).toHaveLength(2)
    for (const href of links) {
      const filter = parseRelatedLinkSearchParam(href, href.startsWith('/map?') ? 'filters' : 'filter')
      expect(filter).toMatchObject({ county_codes: ['CJ'], is_territorial_executive: true })
      expect(filter).not.toHaveProperty('is_uat')
    }
    expect(parseRelatedLinkSearchParam(links.find((href) => href.startsWith('/map?'))!, 'mapViewType')).toBe('County')
  })

  it('keeps the rows, disabled and explained, for a level the destinations cannot scope', () => {
    const identity = resolveTerritoryIdentity({ siruta: 'RO11', liveName: 'Nord-Vest', liveLevel: 'NUTS2' })
    render(<RelatedLinksRail identity={identity} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getAllByText('Legătura are nevoie de un cod de județ din sursa teritorială.')).toHaveLength(2)
  })
})
