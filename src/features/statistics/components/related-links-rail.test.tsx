import { render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { resolveTerritoryIdentity, buildTerritoryRelatedLinks } from '../lib/territory'
import { RelatedLinksRail } from './related-links-rail'
import { parseRelatedLinkSearchParam } from '../test/statistics-test-utils'

describe('RelatedLinksRail', () => {
  it('encodes evidence search params including from=statistici-teritoriu and siruta', () => {
    const identity = resolveTerritoryIdentity({
      siruta: '54975',
      liveName: 'Municipiul Cluj-Napoca',
      liveLevel: 'LAU',
    })
    const links = buildTerritoryRelatedLinks({ identity })

    render(<RelatedLinksRail links={links} originSiruta="54975" />)

    const budgetLink = screen.getByRole('link', { name: /Explorer bugetar/i })
    const href = budgetLink.getAttribute('href')
    expect(href).toBeTruthy()

    expect(parseRelatedLinkSearchParam(href!, 'from')).toBe('statistici-teritoriu')
    expect(parseRelatedLinkSearchParam(href!, 'siruta')).toBe('54975')
    expect(parseRelatedLinkSearchParam(href!, 'filter')).not.toHaveProperty('is_territorial_executive')
    const mapHref = screen.getAllByRole('link').map(link => link.getAttribute('href') ?? '')
      .find(value => value.startsWith('/map?'))
    expect(mapHref).toBeDefined()
    expect(parseRelatedLinkSearchParam(mapHref!, 'filters')).toMatchObject({ is_uat: true, uat_ids: ['54975'] })
    expect(parseRelatedLinkSearchParam(mapHref!, 'filters')).not.toHaveProperty('is_territorial_executive')
    expect(parseRelatedLinkSearchParam(href!, 'filter')).toEqual(
      expect.objectContaining({
        uat_ids: ['54975'],
        is_uat: true,
      }),
    )
  })

  it('includes councils and halls in county links without excluding UATs', () => {
    const identity = resolveTerritoryIdentity({ siruta: 'CJ', liveName: 'Cluj', liveLevel: 'NUTS3', liveCountyCode: 'CJ' })
    render(<RelatedLinksRail links={buildTerritoryRelatedLinks({ identity })} originSiruta="CJ" />)
    const links = screen.getAllByRole('link').map(link => link.getAttribute('href') ?? '')
      .filter(href => href.startsWith('/map?') || href.startsWith('/budget-explorer?'))
    expect(links).toHaveLength(2)
    for (const href of links) {
      const filter = parseRelatedLinkSearchParam(href, href.startsWith('/map?') ? 'filters' : 'filter')
      expect(filter).toMatchObject({ county_codes: ['CJ'], is_territorial_executive: true })
      expect(filter).not.toHaveProperty('is_uat')
    }
  })

  it('shows a fallback message when no links are available', () => {
    render(<RelatedLinksRail links={[]} originSiruta="54975" />)

    expect(
      screen.getByText('Legături indisponibile pentru acest nivel.'),
    ).toBeInTheDocument()
  })
})
