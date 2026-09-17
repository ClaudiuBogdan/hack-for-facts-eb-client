import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hubData } from '../test/hub-fixtures'
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

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
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

function stub(data: ReturnType<typeof hubData> | undefined, overrides: Partial<{ isPending: boolean }> = {}) {
  const refetch = vi.fn()
  useStatisticsHubMock.mockReturnValue({ data, isPending: overrides.isPending ?? false, isError: false, refetch })
  return { refetch }
}

describe('StatisticsHubPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useStatisticsHubMock.mockReset()
  })

  it('renders the figures, the national rows with their exact cell links, and the theme panel', () => {
    stub(hubData())
    render(<StatisticsHubPage search={{}} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fiecare localitate')
    // The figures band: the count-up carries the full number for readers.
    expect(screen.getAllByText('1.916').length).toBeGreaterThan(0)
    expect(screen.getAllByText('21.646.220').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3.239').length).toBeGreaterThan(0)

    const rows = screen.getByRole('heading', { name: /România/ }).closest('section')!
    const population = within(rows).getByRole('link', { name: /Populația după domiciliu/ })
    const href = population.getAttribute('href')!
    expect(href).toContain('/statistici/seturi/POP107D')
    const params = new URL(href, 'http://localhost').searchParams
    expect(params.get('teritoriu')).toBe('cod:RO')
    expect(params.getAll('clasificari')).toEqual(['D0:1', 'D1:105', 'D2:112'])
    expect(params.get('unitate')).toBe('9685')
    expect(params.get('frecventa')).toBe('ANNUAL')
    expect(within(population).getByText('21.646.220')).toBeInTheDocument()
    expect(within(population).getByText('persoane')).toBeInTheDocument()
    // The monthly share keeps its month and folds the percent into the value.
    const share = within(rows).getByRole('link', { name: /Șomeri înregistrați/ })
    expect(share).toHaveTextContent('mai 2026')
    expect(within(share).getByText('1,9%')).toBeInTheDocument()

    const themes = screen.getByRole('link', { name: /Statistică socială/ })
    expect(themes.getAttribute('href')).toContain('context=1')
    expect(themes).toHaveTextContent('844')
  })

  it('colours the map by the indicator in the URL and switches it through navigation, not state', () => {
    stub(hubData())
    render(<StatisticsHubPage search={{ indicator: 'somaj' }} />)

    const counties = screen.getByRole('heading', { name: /Unde stă județul tău/ }).closest('section')!
    expect(within(counties).getByRole('radio', { name: 'Rata șomajului' })).toHaveAttribute('aria-checked', 'true')
    const first = within(counties).getAllByRole('link', { name: /Teleorman|Ilfov/ })[0]!
    expect(first).toHaveTextContent('Teleorman')
    expect(first).toHaveTextContent('9,3%')
    expect(first.getAttribute('href')).toContain('/statistici/seturi/SOM103A')
    expect(new URL(first.getAttribute('href')!, 'http://localhost').searchParams.get('teritoriu')).toBe('cod:TR')

    fireEvent.click(within(counties).getByRole('radio', { name: 'Salariați' }))
    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ to: '/statistici', search: { indicator: 'salariati' }, replace: true }))

    fireEvent.click(within(counties).getByRole('radio', { name: 'Speranța de viață' }))
    expect(navigateMock).toHaveBeenLastCalledWith(expect.objectContaining({ search: {} }))
  })

  it('names an empty county layer instead of drawing a blank ranking', () => {
    const data = hubData()
    const emptied = data.counties!.map((layer) =>
      layer.code === 'POP217A' ? { ...layer, values: [], missingCounties: layer.values.map((county) => county.code) } : layer,
    )
    stub(hubData({ counties: emptied }))
    render(<StatisticsHubPage search={{}} />)
    const counties = screen.getByRole('heading', { name: /Unde stă județul tău/ }).closest('section')!
    expect(within(counties).getAllByText(/pentru 2025/).length).toBeGreaterThan(0)
    expect(within(counties).queryByRole('list')).not.toBeInTheDocument()
  })

  it('draws the 35-year band from the captured series and links each series with its span', () => {
    stub(hubData())
    render(<StatisticsHubPage search={{}} />)

    const change = screen.getByRole('heading', { name: /Ce s-a schimbat/ }).closest('section')!
    expect(within(change).getByRole('img', { name: /Născuți vii și Decedați, 1990–2025/ })).toBeInTheDocument()
    const births = within(change).getByRole('link', { name: 'Seria nașterilor' })
    const params = new URL(births.getAttribute('href')!, 'http://localhost').searchParams
    expect(params.get('din')).toBe('1990')
    expect(params.get('pana')).toBe('2025')
    expect(within(change).getByText(/-33,1% din 1990/)).toBeInTheDocument()
    expect(within(change).getByText(/\+7,9 ani din 1990/)).toBeInTheDocument()
  })

  it('spells out an INS quality flag next to the period instead of showing the raw letter', () => {
    const data = hubData()
    const flagged = data.indicators!.map((indicator) =>
      indicator.code === 'POP107D' ? { ...indicator, valueStatus: 'p' } : indicator,
    )
    stub(hubData({ indicators: flagged }))
    render(<StatisticsHubPage search={{}} />)
    const rows = screen.getByRole('heading', { name: /România/ }).closest('section')!
    const population = within(rows).getByRole('link', { name: /Populația după domiciliu/ }).closest('li')!
    expect(population).toHaveTextContent('date provizorii')
    expect(population).not.toHaveTextContent(/· p$/)
  })

  it('shows a failed section as a retry, never a blank, and keeps the others', () => {
    const { refetch } = stub(hubData({ counties: null, catalog: null, failures: ['counties', 'catalog'] }))
    render(<StatisticsHubPage search={{}} />)

    expect(screen.getAllByText('21.646.220').length).toBeGreaterThan(0)
    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(within(alerts[0]!).getByRole('button', { name: 'Încearcă din nou' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders skeletons while the first read is pending', () => {
    stub(undefined, { isPending: true })
    render(<StatisticsHubPage search={{}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
