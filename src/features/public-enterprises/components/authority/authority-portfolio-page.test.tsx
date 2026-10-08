import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { PortfolioEnterprise } from '@/schemas/public-enterprise-portfolio'
import { portfolioFixture } from '../../lib/test/portfolio-fixture'
import { AuthorityPortfolioPage } from './authority-portfolio-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, hash, preload: _preload, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: Readonly<Record<string, string>>; readonly hash?: string; readonly preload?: string }) => (
    <a href={`${params?.cui ? to.replace('$cui', params.cui) : to}${hash ? `#${hash}` : ''}`} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('@lingui/react/macro', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lingui/react/macro')>()
  return {
    ...actual,
    useLingui: () => ({
      i18n: { locale: 'ro', _: (message: string | { readonly id: string; readonly message?: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) },
    }),
  }
})

const DEFAULTS = { ordine: 'cifra', lista: 'toate' } as const
const band = (id: string) => document.getElementById(id) as HTMLElement
/** The table's enterprise names, in their order. */
const tableNames = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('link')[0]!.textContent)

function renderPage(props: Partial<Parameters<typeof AuthorityPortfolioPage>[0]> = {}) {
  const onSearch = vi.fn()
  render(<AuthorityPortfolioPage portfolio={portfolioFixture('4374474')} search={DEFAULTS} onSearch={onSearch} {...props} />)
  return { onSearch }
}

describe('AuthorityPortfolioPage', () => {
  it('names the authority, says what each source gives it, and links its budget', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Consiliul Judetean Hunedoara')
    expect(screen.getByText(/După lista ANAF a întreprinderilor publice, controlează 3 întreprinderi\./u)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bugetul autorității/u })).toHaveAttribute('href', '/entities/4374474')
    expect(screen.getByText(/citite pe 7 octombrie 2026/u)).toBeInTheDocument()
  })

  it('gives each source its own tally beside the head, never one merged status', () => {
    renderPage()
    const panel = screen.getByRole('region', { name: 'Ce spune fiecare sursă' })
    for (const title of ['Lista ANAF a întreprinderilor publice', 'AMEPIP, 2024', 'Registrul comerțului', 'ANAF, contribuabili inactivi']) expect(within(panel).getByText(title)).toBeInTheDocument()
    expect(within(panel).getByText('În lista contribuabililor inactivi')).toBeInTheDocument()
  })

  it('counts enterprises in the figures, never money', () => {
    renderPage()
    const figures = screen.getByRole('region', { name: 'Cifre-cheie' })
    // The sales are direct purchases only: supplier contract awards are not read.
    for (const label of ['Cu bilanț pe 2024', 'Pe pierdere în 2024', 'Cumpără prin SEAP', 'Vând prin achiziții directe']) expect(within(figures).getByText(label)).toBeInTheDocument()
    expect(within(figures).getByText('din 5')).toBeInTheDocument()
    expect(figures.textContent).not.toMatch(/lei/u)
  })

  it('lists every enterprise by 2024 turnover, a zero shown and a missing statement said once, the sources’ marks under each name', () => {
    renderPage()
    expect(tableNames()).toEqual(['APA Prod SA', 'APA Serv Valea Jiului SA', 'Parc Industrial Călan S.R.L.', 'Societatea de Transport Public Zonal Greenline Valea Jiului S.R.L.', 'Drumuri și Poduri SA'])
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows[4]).toHaveTextContent('0 lei')
    // What the announcements say of it is the disagreements band's, said once.
    expect(rows[4]).not.toHaveTextContent('anunțurile numesc altă autoritate')
    expect(rows[5]!.textContent?.match(/ultimul bilanț: 2017/gu)).toHaveLength(3)
    expect(within(rows[5]!).getAllByText('ultimul bilanț: 2017').filter((node) => !node.classList.contains('sr-only'))).toHaveLength(1)
    expect(rows[5]).toHaveTextContent('inactivă fiscal la ANAF')
    // Where the list has it is the list column's to say, once: no chip repeats it.
    expect(rows[1]).toHaveTextContent('În listă, sub altă autoritate')
    expect(rows[1]).not.toHaveTextContent('doar în anunțurile AMEPIP')
    expect(within(rows[1]!).getByRole('link', { name: 'APA Prod SA' })).toHaveAttribute('href', '/public-enterprises/14071095')
  })

  it('reads its order and filter from the address and writes a new one there', () => {
    const { onSearch } = renderPage({ search: { ordine: 'rezultat', lista: 'active' } })
    // Active in the list under this council: the two the list puts under other authorities are „Altele", as in the panel.
    expect(tableNames()).toEqual(['Societatea de Transport Public Zonal Greenline Valea Jiului S.R.L.', 'Parc Industrial Călan S.R.L.'])
    // The net result's column is hidden on a phone: the order says itself there.
    expect(screen.getByText('Ordonate după rezultatul net din 2024, de la cel mai mic.')).toHaveClass('lg:hidden')
    expect(screen.getByRole('columnheader', { name: /Rezultat net/u })).toHaveAttribute('aria-sort', 'ascending')
    fireEvent.click(screen.getByRole('button', { name: /Salariați/u }))
    expect(onSearch).toHaveBeenCalledWith({ ordine: 'salariati' })
    fireEvent.click(screen.getByRole('radio', { name: 'Inactive' }))
    expect(onSearch).toHaveBeenCalledWith({ lista: 'inactive' })
  })

  it('says where the two sources part, the other authority linked to its own portfolio', () => {
    renderPage()
    const sources = band('surse')
    expect(within(sources).getByText(/La 3 întreprinderi, cele două surse nu numesc aceeași autoritate/u)).toBeInTheDocument()
    expect(within(sources).getAllByRole('link').some((link) => link.getAttribute('href') === '/public-enterprises/authorities/24669224')).toBe(true)
  })

  it('shows what they do and where from five enterprises on, one county said in words', () => {
    renderPage()
    expect(within(band('domenii')).getByText(/Toate au sediul în Hunedoara/u)).toBeInTheDocument()
    render(<AuthorityPortfolioPage portfolio={portfolioFixture('4270740')} search={DEFAULTS} onSearch={vi.fn()} />)
    expect(document.querySelectorAll('#domenii')).toHaveLength(1)
  })

  it('says an enterprise whose only name is its CUI by its CUI', () => {
    const portfolio = portfolioFixture('4270740')
    const placeholder = { ...portfolio.enterprises[0]!, name: portfolio.enterprises[0]!.cui }
    render(<AuthorityPortfolioPage portfolio={{ ...portfolio, enterprises: [placeholder, ...portfolio.enterprises.slice(1)] }} search={DEFAULTS} onSearch={vi.fn()} />)
    expect(screen.getByRole('link', { name: `Întreprinderea cu CUI ${placeholder.cui}` })).toHaveAttribute('href', `/public-enterprises/${placeholder.cui}`)
  })

  it('puts every row in the document, past two dozen hidden until „all"', () => {
    const portfolio = portfolioFixture('4270740')
    const many = Array.from({ length: 30 }, (_, index) => ({ ...portfolio.enterprises[0]!, cui: String(1000 + index), name: `FIRMA ${String(index).padStart(2, '0')} SA`, financials: { ...portfolio.enterprises[0]!.financials, turnover: String(100_000 - index) } }))
    render(<AuthorityPortfolioPage portfolio={{ ...portfolio, authority: { ...portfolio.authority, s1001: many.map((enterprise) => enterprise.cui), jsonApt: [] }, enterprises: many }} search={DEFAULTS} onSearch={vi.fn()} />)
    const rows = within(screen.getByRole('table')).getAllByRole('row', { hidden: true }).slice(1)
    expect(rows).toHaveLength(30)
    expect(rows.filter((row) => row.classList.contains('hidden'))).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: 'Toate cele 30' }))
    expect(rows.filter((row) => row.classList.contains('hidden'))).toHaveLength(0)
  })

  it('says why a value is held under the table, once', () => {
    const portfolio = portfolioFixture('4270740')
    const held: PortfolioEnterprise = { ...portfolio.enterprises[0]!, financials: { ...portfolio.enterprises[0]!.financials, net: null, statuses: { turnover: 'reported', employees: 'reported', net: 'held_profile' } } }
    render(<AuthorityPortfolioPage portfolio={{ ...portfolio, enterprises: [held, ...portfolio.enterprises.slice(1)] }} search={DEFAULTS} onSearch={vi.fn()} />)
    expect(screen.getByText('reținut')).toBeInTheDocument()
    expect(screen.getAllByText(/„Reținut”: verificarea bilanțurilor ține valoarea deoparte/u)).toHaveLength(1)
  })
})
