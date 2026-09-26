import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HUB_NATIONAL_SPECS, hubData, hubIndicator } from '../test/hub-fixtures'
import { StatisticsHubPage } from './statistics-hub-page'

const { navigateMock, useStatisticsHubMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useStatisticsHubMock: vi.fn(),
}))

vi.mock('../hooks/use-statistics-hub', () => ({
  useStatisticsHub: (initial: unknown) => useStatisticsHubMock(initial),
}))

// jsdom has no active UI locale; the hub formats in the reader's, so pin it.
vi.mock('../lib/format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/format')>()
  return { ...actual, activeNumberLocale: () => 'ro-RO' }
})

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
}))

// Warming the series page's code needs a real router; nothing here asserts it.
vi.mock('@/hooks/use-warm-route-code', () => ({ useWarmRouteCode: () => undefined }))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  // The address holds no params here: the localities' map opens on its defaults.
  useRouter: () => ({ latestLocation: { pathname: '/ins' } }),
  useSearch: ({ select }: { readonly select?: (search: object) => unknown }) => select?.({}),
  Link: ({
    children,
    to,
    params,
    search,
    preload: _preload,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Readonly<Record<string, string>>
    readonly search?: Readonly<Record<string, unknown>>
    readonly preload?: string
  }) => {
    let href = to
    if (params) {
      for (const [key, value] of Object.entries(params)) href = href.replace(`$${key}`, value)
    }
    if (search) {
      const query = new URLSearchParams()
      for (const [key, value] of Object.entries(search)) {
        if (Array.isArray(value)) for (const item of value) query.append(key, String(item))
        else if (value !== undefined) query.append(key, String(value))
      }
      href += `?${query.toString()}`
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
  useLingui: () => ({
    i18n: {
      locale: 'ro',
      _: (message: string | { readonly id: string; readonly message?: string }) =>
        typeof message === 'string' ? message : (message.message ?? message.id),
    },
  }),
}))

function stub(
  data: ReturnType<typeof hubData> | undefined,
  overrides: Partial<{ isPending: boolean; isPlaceholderData: boolean; isFetching: boolean }> = {},
) {
  const refetch = vi.fn()
  useStatisticsHubMock.mockReturnValue({
    data,
    isPending: overrides.isPending ?? false,
    isPlaceholderData: overrides.isPlaceholderData ?? false,
    isFetching: overrides.isFetching ?? false,
    isError: false,
    refetch,
  })
  return { refetch }
}

describe('StatisticsHubPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useStatisticsHubMock.mockReset()
  })

  it('opens on the four headline figures, each linked to its exact national cell', () => {
    stub(hubData())
    render(<StatisticsHubPage search={{}} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Statistica oficială')
    const band = screen.getByRole('region', { name: 'Cifre-cheie' })
    // The count-up carries the full number for readers; inflation is the
    // index less 100, at the index's own precision.
    expect(within(band).getByText('10,85')).toBeInTheDocument()
    expect(within(band).getByText('5.914')).toBeInTheDocument()
    expect(within(band).getByText('3,2')).toBeInTheDocument()
    expect(within(band).getByText('19.043.151')).toBeInTheDocument()
    expect(band).toHaveTextContent('mai 2026 față de mai 2025')
    expect(band).toHaveTextContent('lei')
    expect(band).toHaveTextContent('decembrie 2025')
    expect(band).toHaveTextContent('Populația rezidentă la 1 ianuarie 2025')

    // A matrix with no geography axis is linked without a territory.
    const inflation = new URL(within(band).getByRole('link', { name: /Inflația anuală/ }).getAttribute('href')!, 'http://localhost')
    expect(inflation.pathname).toBe('/ins/seturi/IPC102E')
    expect(inflation.searchParams.get('teritoriu')).toBeNull()
    expect(inflation.searchParams.getAll('clasificari')).toEqual(['D0:12668'])
    expect(inflation.searchParams.get('frecventa')).toBe('MONTHLY')
    const population = new URL(within(band).getByRole('link', { name: /Locuitori/ }).getAttribute('href')!, 'http://localhost')
    expect(population.pathname).toBe('/ins/seturi/POP105A')
    expect(population.searchParams.get('teritoriu')).toBe('cod:RO')

    // Nothing about the database behind the page.
    expect(screen.queryByText(/1\.916/)).not.toBeInTheDocument()
    expect(screen.queryByText(/3\.239/)).not.toBeInTheDocument()
  })

  it('leaves a headline out when INS published no number for it', () => {
    const data = hubData()
    const blocked = data.indicators!.map((indicator) =>
      indicator.code === 'IPC102E' ? { ...indicator, value: null, valueStatus: ':' } : indicator,
    )
    stub(hubData({ indicators: blocked }))
    render(<StatisticsHubPage search={{}} />)
    const band = screen.getByRole('region', { name: 'Cifre-cheie' })
    expect(within(band).queryByRole('link', { name: /Inflația anuală/ })).not.toBeInTheDocument()
    expect(within(band).getByRole('link', { name: /Salariul mediu net/ })).toBeInTheDocument()
  })

  it('spells out an INS flag on a headline figure, as the rows do', () => {
    const data = hubData()
    const flagged = data.indicators!.map((indicator) =>
      indicator.code === 'FOM106D' ? { ...indicator, valueStatus: 'p' } : indicator,
    )
    stub(hubData({ indicators: flagged }))
    render(<StatisticsHubPage search={{}} />)
    const band = screen.getByRole('region', { name: 'Cifre-cheie' })
    expect(band).toHaveTextContent('decembrie 2025, date provizorii')
  })

  it('lists the national series with their exact cell links, without repeating the headline figures', () => {
    stub(hubData())
    render(<StatisticsHubPage search={{}} />)

    const rows = screen.getByRole('heading', { name: /an de an/ }).closest('section')!
    const employees = within(rows).getByRole('link', { name: /Salariați/ })
    const href = employees.getAttribute('href')!
    expect(href).toContain('/ins/seturi/FOM104D')
    const params = new URL(href, 'http://localhost').searchParams
    expect(params.get('teritoriu')).toBe('cod:RO')
    expect(params.getAll('clasificari')).toEqual(['D0:112', 'D1:112'])
    expect(params.get('unitate')).toBe('9685')
    expect(params.get('frecventa')).toBe('ANNUAL')
    expect(within(employees).getByText('5.453.155')).toBeInTheDocument()
    expect(within(employees).getByText('persoane')).toBeInTheDocument()
    expect(within(rows).getAllByRole('listitem')).toHaveLength(6)
    expect(within(rows).queryByText(/Populația|Rata șomajului|Inflația/)).not.toBeInTheDocument()
    expect(rows).toHaveTextContent('Trăim mai mult')
  })

  it('leaves out the national lede when a series it speaks for is missing', () => {
    stub(hubData({ indicators: HUB_NATIONAL_SPECS.filter((spec) => spec.code !== 'TUR104E').map(hubIndicator) }))
    render(<StatisticsHubPage search={{}} />)
    const rows = screen.getByRole('heading', { name: /an de an/ }).closest('section')!
    expect(within(rows).getAllByRole('listitem')).toHaveLength(5)
    expect(rows).not.toHaveTextContent('Trăim mai mult')
  })

  it('offers the eight domains by what they hold, not by how many matrices they count', () => {
    stub(hubData())
    render(<StatisticsHubPage search={{}} />)
    const social = screen.getByRole('link', { name: /Statistică socială/ })
    expect(social.getAttribute('href')).toContain('context=1')
    expect(social).toHaveTextContent('Populație, muncă și salarii, educație, sănătate')
    expect(social).not.toHaveTextContent(/\d/)
  })

  it('searches INS datasets in the site search field, with its own hint', () => {
    stub(hubData())
    render(<StatisticsHubPage search={{}} />)
    const field = screen.getByPlaceholderText('Salariu, inflație, populație sau cod INS...')
    expect(field).toHaveAttribute('aria-label', 'Statistici INS · Salariu, inflație, populație sau cod INS...')
  })

  it('colours the map by the indicator in the URL and switches it through navigation, not state', () => {
    stub(hubData())
    render(<StatisticsHubPage search={{ indicator: 'somaj' }} />)

    const counties = screen.getByRole('heading', { name: /Unde se situează județul tău/ }).closest('section')!
    expect(within(counties).getByRole('radio', { name: 'Șomaj' })).toHaveAttribute('aria-checked', 'true')
    // The ranked list's first row: the map's links are named for their county, not ranked.
    const first = within(counties).getAllByRole('link', { name: /Teleorman|Ilfov/ }).find((link) => link.closest('li'))!
    expect(first).toHaveTextContent('Teleorman')
    expect(first).toHaveTextContent('9,3%')
    expect(first.getAttribute('href')).toContain('/ins/seturi/SOM103A')
    expect(new URL(first.getAttribute('href')!, 'http://localhost').searchParams.get('teritoriu')).toBe('cod:TR')

    fireEvent.click(within(counties).getByRole('radio', { name: 'Salariul net' }))
    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/ins', replace: true }))
    // The indicator is merged into the address: the localities' map keeps its own params.
    const searchOf = () => (navigateMock.mock.lastCall![0] as { search: (previous: object) => object }).search
    expect(searchOf()({ harta: 'apa', judet: 'CJ' })).toEqual({ harta: 'apa', judet: 'CJ', indicator: 'salariu' })

    fireEvent.click(within(counties).getByRole('radio', { name: 'Speranța de viață' }))
    expect(searchOf()({ indicator: 'salariu', harta: 'apa' })).toEqual({ indicator: undefined, harta: 'apa' })
  })

  it('names an empty county layer instead of drawing a blank ranking', () => {
    const data = hubData()
    const emptied = data.counties!.map((layer) =>
      layer.code === 'POP217A' ? { ...layer, values: [], missingCounties: layer.values.map((county) => county.code) } : layer,
    )
    stub(hubData({ counties: emptied }))
    render(<StatisticsHubPage search={{}} />)
    const counties = screen.getByRole('heading', { name: /Unde se situează județul tău/ }).closest('section')!
    expect(within(counties).getAllByText(/pentru 2025/).length).toBeGreaterThan(0)
    expect(within(counties).queryByRole('list')).not.toBeInTheDocument()
  })

  it('compares 1990 with now beside the births-and-deaths chart, and links each series with its span', () => {
    stub(hubData())
    render(<StatisticsHubPage search={{}} />)

    const change = screen.getByRole('heading', { name: /Ce s-a schimbat/ }).closest('section')!
    expect(within(change).getByRole('slider', { name: /Născuți vii și Decedați, 1990–2025/ })).toBeInTheDocument()
    expect(change).toHaveTextContent('Din 1992, în fiecare an au murit mai mulți oameni decât s-au născut.')
    expect(change).not.toHaveTextContent(/captură/i)

    const births = within(change).getByRole('link', { name: /Născuți vii/ })
    expect(births).toHaveTextContent('-53,7%')
    const params = new URL(births.getAttribute('href')!, 'http://localhost').searchParams
    expect(params.get('din')).toBe('1990')
    expect(params.get('pana')).toBe('2025')
    expect(within(change).getByRole('link', { name: /Speranța de viață/ })).toHaveTextContent('+7,9 ani')
    expect(within(change).getByRole('link', { name: /Salariați/ })).toHaveTextContent('-33,1%')
    // Tourist arrivals are captured from 2001: no 1990 to compare with.
    expect(within(change).queryByRole('link', { name: /Sosiri/ })).not.toBeInTheDocument()
  })

  it('brings a series forward in the chart while its row is pointed at', () => {
    stub(hubData())
    render(<StatisticsHubPage search={{}} />)
    const change = screen.getByRole('heading', { name: /Ce s-a schimbat/ }).closest('section')!
    const lines = () => [...change.querySelectorAll('svg path[fill="none"]')].map((path) => path.getAttribute('class') ?? '')
    expect(lines().some((line) => line.includes('opacity-30'))).toBe(false)
    fireEvent.pointerEnter(within(change).getByRole('link', { name: /Decedați/ }), { pointerType: 'mouse' })
    // Deaths is drawn first, births over it: births recedes.
    expect(lines()).toEqual([expect.not.stringContaining('opacity-30'), expect.stringContaining('opacity-30')])
  })

  it('spells out an INS quality flag next to the period instead of showing the raw letter', () => {
    const data = hubData()
    const flagged = data.indicators!.map((indicator) =>
      indicator.code === 'FOM104D' ? { ...indicator, valueStatus: 'p' } : indicator,
    )
    stub(hubData({ indicators: flagged }))
    render(<StatisticsHubPage search={{}} />)
    const rows = screen.getByRole('heading', { name: /an de an/ }).closest('section')!
    const employees = within(rows).getByRole('link', { name: /Salariați/ }).closest('li')!
    expect(employees).toHaveTextContent('date provizorii')
    expect(employees).not.toHaveTextContent(/· p$/)
  })

  it('shows a failed section as a retry, never a blank, and keeps the others', () => {
    const { refetch } = stub(hubData({ counties: null, failures: ['counties'] }))
    render(<StatisticsHubPage search={{}} />)

    expect(screen.getAllByText('19.043.151').length).toBeGreaterThan(0)
    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeGreaterThanOrEqual(1)
    fireEvent.click(within(alerts[0]!).getByRole('button', { name: 'Încearcă din nou' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders skeletons while the first read is pending', () => {
    stub(undefined, { isPending: true })
    render(<StatisticsHubPage search={{}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('keeps a partial server read pending, not failed, while the browser reads it again', () => {
    stub(hubData({ counties: null, failures: ['counties'] }), { isPlaceholderData: true, isFetching: true })
    render(<StatisticsHubPage search={{}} />)
    expect(screen.getAllByText('19.043.151').length).toBeGreaterThan(0)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Încearcă din nou' })).not.toBeInTheDocument()
  })

  it('shows no retry for a county layer INS no longer publishes, only for one that failed', () => {
    stub(hubData({ counties: [], failures: [] }))
    const { unmount } = render(<StatisticsHubPage search={{}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('INS nu a publicat încă valorile pe județe ale acestui indicator.')).toBeInTheDocument()
    unmount()

    stub(hubData({ counties: [], failures: ['counties'] }))
    render(<StatisticsHubPage search={{}} />)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('keeps the figures the server rendered when the browser cannot read them again', () => {
    const initial = hubData({ counties: null, failures: ['counties'] })
    useStatisticsHubMock.mockReturnValue({ data: undefined, isPending: false, isPlaceholderData: false, isFetching: false, isError: true, refetch: vi.fn() })
    render(<StatisticsHubPage search={{}} initialHub={initial} />)
    expect(screen.getAllByText('19.043.151').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('stays quiet when the read answered with no figure for a band', () => {
    stub(hubData({ indicators: [] }))
    render(<StatisticsHubPage search={{}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const band = screen.getByRole('region', { name: 'Cifre-cheie' })
    expect(band).toHaveTextContent('INS nu a publicat încă aceste cifre.')
    expect(screen.getByText('INS nu a publicat încă aceste serii.')).toBeInTheDocument()
  })

  it('puts the localities’ map after the counties, as its head and its place until the reader nears it', () => {
    stub(hubData())
    render(<StatisticsHubPage search={{}} />)
    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(headings.indexOf('Unde se situează localitatea ta')).toBe(headings.indexOf('Unde se situează județul tău') + 1)
    const band = screen.getByRole('region', { name: 'Unde se situează localitatea ta' })
    // jsdom's observer never fires: the map, its code and its snapshot stay unloaded.
    expect(within(band).queryByRole('img')).not.toBeInTheDocument()
    expect(within(band).queryByRole('searchbox')).not.toBeInTheDocument()
  })
})
