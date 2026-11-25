import { render, screen, within } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { HomeSectionNav } from './home-section-nav'

/** The pinned bar: the page's name and a link to each band, numbered unless the page numbers none of them. */

const SECTIONS = [
  { id: 'judete', label: 'Județe' },
  { id: 'domenii', label: 'Domenii' },
]

describe('HomeSectionNav', () => {
  it('numbers its bands by default, each link to its anchor', () => {
    render(<HomeSectionNav title="Pagina" sections={SECTIONS} />)
    const links = within(screen.getByRole('navigation', { name: 'Secțiunile paginii' })).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['01Județe', '02Domenii'])
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#judete', '#domenii'])
  })

  it('leaves the numbers out when the page asks, the links unchanged', () => {
    render(<HomeSectionNav title="Pagina" sections={SECTIONS} numbered={false} />)
    const links = within(screen.getByRole('navigation', { name: 'Secțiunile paginii' })).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Județe', 'Domenii'])
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#judete', '#domenii'])
  })
})
