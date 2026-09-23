import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NgoHubPage } from './ngo-hub-page'
import { summaryFixture } from './test/summary-fixture'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))
vi.mock('@/hooks/useGeoJson', () => ({ useGeoJsonData: () => ({ data: undefined, isError: false, refetch: vi.fn() }) }))
// The search has its own tests; here it only has to be there, or not.
vi.mock('./ngo-registry-search', () => ({ NgoRegistrySearch: () => <div data-testid="registry-search" /> }))

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
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly search?: Readonly<Record<string, string>>
  }) => (
    <a href={search ? `${to}?${new URLSearchParams(search).toString()}` : to} {...props}>
      {children}
    </a>
  ),
}))

const SUMMARY = summaryFixture()

const href = (element: HTMLElement) => new URL(element.getAttribute('href') ?? '', 'http://localhost')
const figures = () => screen.getByRole('region', { name: 'Cifre-cheie' })

describe('NgoHubPage', () => {
  beforeEach(() => navigate.mockReset())

  it('opens on the registry’s search and its legal forms, each opening its registered NGOs', () => {
    render(<NgoHubPage summary={SUMMARY} search={{}} registry />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ONG-urile din România')
    expect(screen.getByTestId('registry-search')).toBeInTheDocument()
    const utility = href(screen.getByRole('link', { name: 'ONG-urile de utilitate publică' }))
    expect(utility.pathname).toBe('/ong-uri/registru')
    expect(utility.searchParams.get('publicUtility')).toBe('yes')
    expect(utility.searchParams.get('status')).toBe('Inregistrat')
    const foundations = screen.getByRole('link', { name: /Fundații/ })
    expect(foundations).toHaveTextContent('Fundații10011%')
    expect(href(foundations).searchParams.get('category')).toBe('foundation')
  })

  it('leads with the four figures a reader comes for, each opening where it is explained', () => {
    render(<NgoHubPage summary={SUMMARY} search={{}} registry />)
    const band = figures()
    expect(within(band).getByText('900')).toBeInTheDocument()
    expect(within(band).getByText('120')).toBeInTheDocument()
    expect(within(band).getByText('75,0')).toBeInTheDocument()
    expect(within(band).getByText('17')).toBeInTheDocument()
    expect(band).toHaveTextContent('În registru la 20 septembrie 2026')
    expect(band).toHaveTextContent('100 în 2024')
    expect(band).toHaveTextContent('Populația rezidentă la 1 ianuarie 2025')
    expect(href(within(band).getByRole('link', { name: /ONG-uri înregistrate/ })).searchParams.get('status')).toBe('Inregistrat')
    expect(within(band).getByRole('link', { name: /Noi în 2025/ })).toHaveAttribute('href', '#an-de-an')
    expect(href(within(band).getByRole('link', { name: /De utilitate publică/ })).searchParams.get('publicUtility')).toBe('yes')
    // Nothing about the pipeline behind the page.
    expect(screen.queryByText(/rânduri|run \d|incarcare prod/i)).not.toBeInTheDocument()
  })

  it('colours the counties per 10,000 residents by default, naming the NGOs no county holds', () => {
    render(<NgoHubPage summary={SUMMARY} search={{}} registry />)
    const toggle = screen.getByRole('radiogroup', { name: 'Ce arată harta' })
    expect(within(toggle).getByRole('radio', { name: 'La 10.000 de locuitori' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('ONG-uri înregistrate la 10.000 de locuitori')).toBeInTheDocument()
    expect(screen.getByText('50 de ONG-uri înregistrate nu au județ în registru și intră doar în cifra țării')).toBeInTheDocument()
  })

  it('keeps the layer chosen in the URL', () => {
    render(<NgoHubPage summary={SUMMARY} search={{}} registry />)
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Ce arată harta' })).getByRole('radio', { name: 'Noi în 2025' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/ong-uri', search: { indicator: 'noi' }, replace: true, resetScroll: false })
  })

  it('draws the year’s new NGOs from the URL, with the ones no county holds', () => {
    render(<NgoHubPage summary={SUMMARY} search={{ indicator: 'noi' }} registry />)
    expect(screen.getByText('ONG-uri noi în registru în 2025')).toBeInTheDocument()
    expect(screen.getByText('5 dintre cele noi în 2025 nu au județ în registru și intră doar în cifra țării')).toBeInTheDocument()
  })

  it('says how many NGOs a year brings, and where every entry stands', () => {
    render(<NgoHubPage summary={SUMMARY} search={{}} registry />)
    const years = screen.getByRole('region', { name: /apar în fiecare an/ })
    expect(years).toHaveTextContent('În 2025 au intrat în registru 120 de organizații noi, câte 0,3 pe zi.')
    expect(within(years).getByRole('slider', { name: 'ONG-uri noi în registru, pe an, 2023–2025' })).toBeInTheDocument()
    // The chart says what a year is: the one in the registry number, not the date an entry last changed.
    expect(years).toHaveTextContent('După anul din numărul de registru')
    const dissolved = within(years).getByRole('link', { name: /Dizolvate/ })
    expect(dissolved).toHaveTextContent('Dizolvate151,5%')
    expect(href(dissolved).searchParams.get('status')).toBe('Dizolvata')
  })

  it('names its sources with the export date', () => {
    render(<NgoHubPage summary={SUMMARY} search={{}} registry />)
    expect(screen.getByRole('link', { name: 'Registrul național ONG' })).toHaveAttribute('href', 'https://rnong.just.ro/registru-ong')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('exportul din 20 septembrie 2026. Populația: INS, 1 ianuarie 2025.')
  })

  it('leaves the search and every registry link out where there is no registry', () => {
    render(<NgoHubPage summary={SUMMARY} search={{}} registry={false} />)
    expect(screen.queryByTestId('registry-search')).not.toBeInTheDocument()
    const registryLinks = screen.queryAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/ong-uri/registru'))
    expect(registryLinks).toHaveLength(0)
    expect(within(figures()).getByRole('link', { name: /ONG-uri înregistrate/ })).toHaveAttribute('href', '#pe-judete')
    // Public utility has no band of its own to open.
    expect(within(figures()).queryByRole('link', { name: /De utilitate publică/ })).not.toBeInTheDocument()
    expect(figures()).toHaveTextContent('De utilitate publică')
  })
})
