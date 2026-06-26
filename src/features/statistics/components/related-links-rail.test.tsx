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
    expect(parseRelatedLinkSearchParam(href!, 'filter')).toEqual(
      expect.objectContaining({
        uat_ids: ['54975'],
        is_uat: true,
      }),
    )
  })

  it('shows a fallback message when no links are available', () => {
    render(<RelatedLinksRail links={[]} originSiruta="54975" />)

    expect(
      screen.getByText('Legături indisponibile pentru acest nivel.'),
    ).toBeInTheDocument()
  })
})
