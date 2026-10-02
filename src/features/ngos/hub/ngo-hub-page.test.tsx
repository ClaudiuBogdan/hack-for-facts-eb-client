import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NgoHubPage } from './ngo-hub-page'
import { financeFixture } from './test/finance-fixture'
import { summaryFixture } from './test/summary-fixture'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))
vi.mock('@/hooks/useGeoJson', () => ({ useGeoJsonData: () => ({ data: undefined, isError: false, refetch: vi.fn() }) }))
// The search has its own tests; here it only has to be there, or not.
vi.mock('./ngo-hub-search', () => ({ NgoHubSearch: () => <div data-testid="hub-search" /> }))

vi.mock('@lingui/react/macro', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lingui/react/macro')>()
  return {
    ...actual,
    useLingui: () => ({
      i18n: { locale: 'ro', _: (message: string | { readonly id: string; readonly message?: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) },
    }),
  }
})

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({
    children,
    to,
    search,
    params,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly search?: Readonly<Record<string, string>>
    readonly params?: Readonly<Record<string, string>>
  }) => {
    const path = params?.cui ? to.replace('$cui', params.cui) : to
    return (
      <a href={search ? `${path}?${new URLSearchParams(search).toString()}` : path} {...props}>
        {children}
      </a>
    )
  },
}))

const SUMMARY = summaryFixture()
const FINANCE = financeFixture()

const href = (element: HTMLElement) => new URL(element.getAttribute('href') ?? '', 'http://localhost')
const figures = () => screen.getByRole('region', { name: 'Cifre-cheie' })
const band = (name: RegExp) => screen.getByRole('region', { name })
const renderPage = (props: Partial<Parameters<typeof NgoHubPage>[0]> = {}) =>
  render(<NgoHubPage summary={SUMMARY} finance={FINANCE} search={{}} registry {...props} />)

describe('NgoHubPage', () => {
  beforeEach(() => navigate.mockReset())

  it('opens on the registry’s search beside the year’s largest NGOs, a resolved one opening its profile', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ONG-urile din România')
    expect(screen.getByTestId('hub-search')).toBeInTheDocument()
    const leaders = screen.getByRole('region', { name: 'Cele mai mari ONG-uri din registru, 2025' })
    expect(within(leaders).getAllByRole('listitem')).toHaveLength(3)
    expect(within(leaders).getByRole('link', { name: /ASOCIATIA A/ })).toHaveAttribute('href', '/ngos/100')
    // Every leader is an organisation the profile resolves, so each row opens it.
    expect(within(leaders).getByRole('link', { name: /FUNDATIA B/ })).toHaveAttribute('href', '/ngos/200')
    const utility = href(within(screen.getByRole('navigation', { name: 'Scurtături' })).getByRole('link', { name: 'De utilitate publică' }))
    expect(utility.pathname).toBe('/ngos/registry')
    expect(utility.searchParams.get('publicUtility')).toBe('yes')
  })

  it('shows the five largest NGOs, the rest behind „Arată mai multe"', () => {
    const [first] = FINANCE.leaders
    const leaders = Array.from({ length: 7 }, (_, index) => ({ ...first!, cui: String(900 + index), name: `ASOCIATIA ${index + 1}` }))
    renderPage({ finance: { ...FINANCE, leaders } })
    const card = screen.getByRole('region', { name: /Cele mai mari ONG-uri din registru/ })
    expect(within(card).getAllByRole('listitem')).toHaveLength(5)
    const more = within(card).getByRole('button', { name: 'Arată mai multe' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(more)
    expect(within(card).getAllByRole('listitem')).toHaveLength(7)
    expect(within(card).getByRole('button', { name: 'Arată mai puține' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('pins a bar of the numbered bands, each landing on its band', () => {
    renderPage()
    const bar = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    const links = within(bar).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#judete', '#ce-fac', '#bani', '#registru'])
    for (const link of links) expect(document.querySelector(link.getAttribute('href')!)).not.toBeNull()
  })

  it('leads with the four figures a reader comes for, each opening where it is broken down', () => {
    renderPage()
    const row = figures()
    expect(within(row).getByText('900')).toBeInTheDocument()
    expect(within(row).getByText('1,0')).toBeInTheDocument()
    expect(within(row).getByText('100')).toBeInTheDocument()
    expect(within(row).getByText('120')).toBeInTheDocument()
    expect(row).toHaveTextContent('La 20 septembrie 2026')
    // 2025 is a first release and 2024 a revision: no change between them, the vintage said instead.
    expect(row).toHaveTextContent('Prima publicare, 11 iunie 2026')
    expect(row).not.toHaveTextContent('față de 2024')
    expect(row).toHaveTextContent('80 cu venituri')
    expect(row).toHaveTextContent('100 în 2024')
    expect(href(within(row).getByRole('link', { name: /ONG-uri înregistrate/ })).searchParams.get('status')).toBe('Inregistrat')
    expect(within(row).getByRole('link', { name: /Venituri non-profit în 2025/ })).toHaveAttribute('href', '#bani')
    expect(within(row).getByRole('link', { name: /Noi în 2025/ })).toHaveAttribute('href', '#registru')
  })

  it('says a revised latest year is revised when it has no year of its own vintage to be set against', () => {
    const years = FINANCE.years.map((point) => ({ ...point, firstRelease: point.year !== 2025 }))
    renderPage({ finance: financeFixture({ years }) })
    expect(figures()).toHaveTextContent('Revizuită, 11 iunie 2026')
    expect(figures()).not.toHaveTextContent('Prima publicare')
  })

  it('says what NGOs do, ranked by organisations until the reader asks for revenue, kept in the URL', () => {
    renderPage()
    const domains = band(/Ce fac organizațiile non-profit/)
    expect(domains).toHaveTextContent('Dintre organizațiile cu un domeniu precis, cele mai multe sunt în sport: 20, iar cele mai mari venituri declarate le au cele din educație: 400,0 mil. lei.')
    const toggle = within(domains).getByRole('radiogroup', { name: 'Domeniile după' })
    expect(within(toggle).getByRole('radio', { name: 'Organizații' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(toggle).getByRole('radio', { name: 'Venituri' }))
    expect(navigate).toHaveBeenCalledTimes(1)
    const call = navigate.mock.calls[0]![0] as { search: (previous: Record<string, unknown>) => Record<string, unknown>; replace: boolean; resetScroll: boolean }
    expect(call).toMatchObject({ replace: true, resetScroll: false })
    expect(call.search({ indicator: 'noi' })).toEqual({ indicator: 'noi', domenii: 'venituri' })
  })

  it('ranks the domains by revenue from the URL', () => {
    renderPage({ search: { domenii: 'venituri' } })
    const first = within(screen.getByTestId('ngo-hub-domains')).getAllByRole('listitem')[0]!
    expect(first).toHaveTextContent('Educație')
  })

  it('says how the money is spread, where it comes from, and how it grew, with the statement its rule leaves out', () => {
    renderPage()
    const money = band(/Banii sectorului/)
    expect(money).toHaveTextContent('10 organizații cu venituri de peste 1 mil. lei au 90% din bani. 18 n-au avut niciun venit în 2025.')
    expect(within(money).getByTestId('ngo-hub-sizes')).toBeInTheDocument()
    expect(within(money).getByTestId('ngo-hub-sources')).toBeInTheDocument()
    expect(within(money).getByRole('slider', { name: 'Veniturile sectorului non-profit, pe an, 2023–2025' })).toHaveAttribute('aria-valuetext', '2025: 1,0\u00a0mld. lei (prima publicare)')
    expect(money).toHaveTextContent(
      'În lei ai fiecărui an, fără ajustare cu inflația. Cu linie întreruptă: 2025, la prima publicare, fără depunerile întârziate pe care le adaugă o revizuire. 2023: lăsată deoparte din sume o situație cu 5,0 mld. lei, peste pragul de 1 mld. lei; de verificat: e cât activele ei imobilizate. Total raportat 5,8 mld. lei; fără ea 800,0 mil. lei.',
    )
    // The statement itself, on its organisation's profile, at its year.
    expect(within(money).getByRole('link', { name: 'o situație financiară din 2023, pe profilul organizației' })).toHaveAttribute('href', expect.stringMatching(/^\/ngos\/1\?an=2023/))
    expect(money.querySelectorAll('[data-provisional]')).toHaveLength(1)
  })

  it('says why a statement is suspected, and both totals once for a year with two, unlinked where the profile is not there', () => {
    const finance = financeFixture({
      excluded: [
        { year: 2023, cui: '1', revenue: 5_000_000_000, equalsFixedAssets: false, profile: false },
        { year: 2023, cui: '2', revenue: 2_000_000_000, equalsFixedAssets: true, profile: true },
      ],
    })
    renderPage({ finance })
    const money = band(/Banii sectorului/)
    expect(money).toHaveTextContent(
      '2023: lăsată deoparte din sume o situație cu 5,0 mld. lei, peste pragul de 1 mld. lei, de verificat. 2023: lăsată deoparte din sume o situație cu 2,0 mld. lei, peste pragul de 1 mld. lei; de verificat: e cât activele ei imobilizate. Total raportat 7,8 mld. lei; fără ele 800,0 mil. lei.',
    )
    // Only the one with a profile links its statement.
    expect(within(money).getAllByRole('link', { name: /o situație financiară din 2023/ })).toHaveLength(1)
  })

  it('colours the counties per 10,000 residents by default, and the year’s new ones from the URL', () => {
    const { unmount } = renderPage()
    const counties = band(/Câte ONG-uri are județul tău/)
    expect(within(within(counties).getByRole('radiogroup', { name: 'Ce arată harta' })).getByRole('radio', { name: 'La 10.000 de locuitori' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(counties).toHaveTextContent('Media țării cuprinde și cele 50 de ONG-uri fără județ în registru.')
    const cluj = within(counties).getByRole('link', { name: /Cluj/ })
    expect(href(cluj).searchParams.get('county')).toBe('CLUJ')
    unmount()
    renderPage({ search: { indicator: 'noi' } })
    expect(band(/Câte ONG-uri are județul tău/)).toHaveTextContent('După anul din numărul de registru')
  })

  it('counts each county’s registered NGOs on the total layer, the ranking from zero under the word „ONG-uri"', () => {
    renderPage({ search: { indicator: 'total' } })
    const counties = band(/Câte ONG-uri are județul tău/)
    expect(within(within(counties).getByRole('radiogroup', { name: 'Ce arată harta' })).getByRole('radio', { name: 'Înregistrate' })).toHaveAttribute('aria-checked', 'true')
    expect(counties).toHaveTextContent('900 de ONG-uri înregistrate în țară, dintre care 50 fără județ în registru.')
    // The column says what the figures are; the legend's title already does.
    expect(counties).toHaveTextContent(/Județ\s*ONG-uri/)
    const cluj = within(counties).getAllByRole('link', { name: /Cluj/ })[0]!
    expect(href(cluj).searchParams.get('status')).toBe('Inregistrat')
  })

  it('keeps the map layer in the URL, the default one out of it', () => {
    renderPage({ search: { indicator: 'noi' } })
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Ce arată harta' })).getByRole('radio', { name: 'La 10.000 de locuitori' }))
    const call = navigate.mock.calls[0]![0] as { search: (previous: Record<string, unknown>) => Record<string, unknown> }
    expect(call.search({ indicator: 'noi', domenii: 'venituri' })).toEqual({ indicator: undefined, domenii: 'venituri' })
  })

  it('says how many NGOs a year brings, where every entry stands, and their legal forms', () => {
    renderPage()
    const years = band(/apar în fiecare an/)
    expect(years).toHaveTextContent('În 2025 au intrat în registru 120 de organizații noi, câte 0,3 pe zi.')
    expect(within(years).getByRole('slider', { name: 'ONG-uri noi în registru, pe an, 2023–2025' })).toBeInTheDocument()
    expect(href(within(years).getByRole('link', { name: /Dizolvate/ })).searchParams.get('status')).toBe('Dizolvata')
    expect(href(within(years).getByRole('link', { name: /Fundații/ })).searchParams.get('category')).toBe('foundation')
  })

  it('ends on three ways into the registry, each count the query it opens', () => {
    renderPage()
    const start = band(/De aici poți începe/)
    const cards = within(start).getAllByRole('link')
    expect(cards.map((card) => card.textContent)).toEqual([
      'De utilitate publică17 ONG-uri pe care registrul le trece ca fiind de utilitate publică.',
      'În lichidare25 de organizații în lichidare, încă în registru.',
      'Tot registrulFiecare ONG, după nume, județ, formă juridică și stare.',
    ])
    expect(href(cards[1]!).searchParams.get('status')).toBe('In Lichidare')
  })

  it('names both sources in the head, short, and in full at the foot', () => {
    renderPage()
    const head = screen.getByText((_, element) => element?.tagName === 'P' && (element.textContent ?? '').startsWith('Surse:'))
    expect(within(head).getByRole('link', { name: /^Registrul ONG/ })).toHaveAttribute('href', 'https://rnong.just.ro/registru-ong')
    expect(within(head).getByRole('link', { name: /^Situațiile financiare/ })).toHaveAttribute('href', FINANCE.source.dataset)
    // One date: the registry's last update.
    expect(head).toHaveTextContent(/^Surse: Registrul ONG ↗.*, 20 septembrie 2026 · Situațiile financiare ↗[^,]*$/)
    expect(screen.getByRole('link', { name: 'Registrul național ONG' })).toHaveAttribute('href', 'https://rnong.just.ro/registru-ong')
    expect(screen.getByRole('link', { name: 'Situațiile financiare ale organizațiilor non-profit' })).toHaveAttribute('href', FINANCE.source.dataset)
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'Ministerul Justiției, 20 septembrie 2026 · Situațiile financiare ale organizațiilor non-profit, Ministerul Finanțelor, 2023–2025 · Populația: INS, 1 ianuarie 2025',
    )
  })

  it('leaves the search, the start cards and every registry or profile link out where there is no NGO API', () => {
    renderPage({ registry: false })
    expect(screen.queryByTestId('hub-search')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /De aici poți începe/ })).not.toBeInTheDocument()
    const outward = screen.queryAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/ngos/'))
    expect(outward).toHaveLength(0)
    expect(within(figures()).getByRole('link', { name: /ONG-uri înregistrate/ })).toHaveAttribute('href', '#registru')
    // The counties still read, as plain rows.
    expect(band(/Câte ONG-uri are județul tău/)).toHaveTextContent('Cluj')
  })
})
