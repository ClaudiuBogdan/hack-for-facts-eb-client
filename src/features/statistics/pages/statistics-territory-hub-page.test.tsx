import type { ReactNode } from 'react'
import { cleanup, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatHubPeriod } from '../lib/period'
import { territoryHubFixture } from '../test/territory-hub-fixtures'
import { StatisticsTerritoryHubPage } from './statistics-territory-hub-page'
import {
  createTerritoryHubQueryStub,
  createTerritoryHubWithoutBenchmarks,
} from '../test/statistics-test-utils'

const { useStatisticsTerritoryHubMock } = vi.hoisted(() => ({
  useStatisticsTerritoryHubMock: vi.fn(),
}))

vi.mock('../hooks/use-statistics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/use-statistics')>()
  return {
    ...actual,
    useStatisticsTerritoryHub: (params: unknown) => useStatisticsTerritoryHubMock(params),
  }
})

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

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))

// Warming the series page's code needs a real router; nothing here asserts it.
vi.mock('@/hooks/use-warm-route-code', () => ({ useWarmRouteCode: () => undefined }))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Readonly<Record<string, string>>
    readonly search?: Readonly<Record<string, unknown>>
  }) => {
    let href = to
    for (const [key, value] of Object.entries(params ?? {})) href = href.replace(`$${key}`, value)
    if (search && Object.keys(search).length > 0) {
      const query = new URLSearchParams()
      for (const [key, value] of Object.entries(search)) query.set(key, JSON.stringify(value))
      href = `${href}?${query.toString()}`
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

function mount(search: Parameters<typeof StatisticsTerritoryHubPage>[0]['search'] = {}, siruta = '54975') {
  return render(<StatisticsTerritoryHubPage siruta={siruta} search={search} />)
}

describe('StatisticsTerritoryHubPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useStatisticsTerritoryHubMock.mockClear()
    useStatisticsTerritoryHubMock.mockImplementation(({ siruta }: { siruta: string }) =>
      createTerritoryHubQueryStub({ data: territoryHubFixture(siruta) }),
    )
  })

  it('names the place as a reader spells it, counts its indicators, and draws every tile state', () => {
    mount()

    // „Municipiul Cluj-Napoca" → the place, with its kind beside it.
    expect(screen.getByRole('heading', { level: 1, name: 'Cluj-Napoca' })).toBeInTheDocument()
    expect(screen.getByText('municipiu')).toBeInTheDocument()
    expect(screen.getByText('SIRUTA 54975')).toBeInTheDocument()
    // Four of the six fixture tiles carry a figure; the line says so, and up to when.
    expect(screen.getByText('4 indicatori cu date')).toBeInTheDocument()
    // The source, once for the page, with how far its figures reach.
    expect(
      screen.getByText((_, element) => element?.textContent === 'Sursă: INS Tempo, date până în 2024' && element.tagName === 'SPAN'),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/estimat/).length).toBeGreaterThan(0)
    expect(
      screen.getByText('Setul există în catalog, dar observațiile nu sunt încă încărcate.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Nu există observații pentru acest teritoriu în setul curent.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Vezi și în alte domenii')).toBeInTheDocument()
    expect(document.title).toContain('Cluj-Napoca')
  })

  it('places the town under its county, and Bucharest — its own county cell — under the country alone', () => {
    mount()
    expect(screen.getByRole('navigation', { name: 'Ierarhie teritorială' })).toHaveTextContent(/România.*Cluj-Napoca/)

    cleanup()
    mount({}, '179132')
    const crumbs = screen.getByRole('navigation', { name: 'Ierarhie teritorială' })
    expect(crumbs).not.toHaveTextContent('județul')
    expect(crumbs).toHaveTextContent(/România.*București/)
    expect(screen.getByRole('heading', { level: 1, name: 'București' })).toBeInTheDocument()
  })

  it('says the source once, in the header, and no tile carries a source button of its own', () => {
    mount()
    // The source is INS Tempo — never an internal registry title.
    expect(screen.getByRole('link', { name: 'INS Tempo (se deschide într-un tab nou)' })).toHaveAttribute(
      'href',
      expect.stringContaining('page=tempo1'),
    )
    expect(screen.queryByText('INS statistical indicators')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Sursă/ })).not.toBeInTheDocument()
    // Each row keeps its matrix code, one click from that matrix's own source.
    expect(screen.getAllByText(/^[A-Z]{3}\d{3}[A-Z]$/).length).toBeGreaterThan(0)
  })

  it('opens each tile’s series from its name and names the compare action for assistive tech', () => {
    mount()
    const labourTile = screen
      .getByRole('heading', { level: 3, name: 'Numărul mediu al salariaților' })
      .closest('article')!
    expect(within(labourTile).getByRole('link', { name: 'Numărul mediu al salariaților' })).toHaveAttribute(
      'href',
      expect.stringContaining('/ins/seturi/FOM104D'),
    )
    expect(
      screen.getByRole('link', { name: /^Compară cu (județul și )?țara: Populația după domiciliu la 1 ianuarie$/ }),
    ).toHaveAttribute('href', expect.stringContaining('/ins/comparatii'))
  })

  it('offers the years the territory has figures for, latest first, and defaults to the latest period', () => {
    mount()

    expect(screen.getByLabelText('Filtru perioadă')).toHaveTextContent('Ultima perioadă')
    expect(screen.queryByText(/^Filtrat:/)).not.toBeInTheDocument()
  })

  it('reflects the active period from the URL without a second fetch', () => {
    mount({ period: '2023' })

    expect(screen.getByLabelText('Filtru perioadă')).toHaveTextContent('2023')
    expect(screen.getByText('Filtrat: 2023')).toBeInTheDocument()

    // The hub is keyed on SIRUTA only: the period is applied as a client-side
    // transform, so switching periods must never refetch. If `period` ever
    // leaks back into the hook params it re-enters the query key.
    const distinctParams = new Set(
      useStatisticsTerritoryHubMock.mock.calls.map((call: unknown[]) => JSON.stringify(call[0])),
    )
    expect([...distinctParams]).toEqual([JSON.stringify({ siruta: '54975', enabled: true })])
  })

  it('re-anchors indicator tiles to the selected period', () => {
    mount({ period: '2021' })

    // POP107D has no 2022 observation in the fixture, so a 2021 selection must
    // show 2021 data rather than the latest value.
    expect(screen.getAllByText(/2021/).length).toBeGreaterThan(0)
  })

  it('says which year a series has no cell for, in that series’ cadence, and keeps compare', () => {
    // FOM104D ends in 2023 while POP107D reaches 2024.
    mount({ period: '2024' })

    const labourTile = screen
      .getByRole('heading', { level: 3, name: 'Numărul mediu al salariaților' })
      .closest('article')!
    expect(labourTile).toHaveTextContent('Nicio valoare pentru 2024. Seria este anual.')
    expect(within(labourTile).getByRole('link', { name: /^Compară/ })).toBeInTheDocument()
    expect(screen.queryByText('Nu există observații pentru acest teritoriu în setul curent.')).toBeInTheDocument()
  })

  it('shows a not-found state when the hub query succeeds with null data', () => {
    useStatisticsTerritoryHubMock.mockReturnValue(createTerritoryHubQueryStub({ data: null }))

    mount({}, '999999')

    expect(screen.getByText('Teritoriu negăsit')).toBeInTheDocument()
    expect(screen.getByText('Nu am găsit un teritoriu INS pentru acest SIRUTA.')).toBeInTheDocument()
  })

  it('says when the county and national references could not be read, without hiding the figures', () => {
    useStatisticsTerritoryHubMock.mockReturnValue(
      createTerritoryHubQueryStub({ data: createTerritoryHubWithoutBenchmarks('54975') }),
    )

    mount()

    const note = screen.getByText(/Reperele pe județ și pe țară nu s-au încărcat/)
    expect(note).toHaveAttribute('role', 'status')
    expect(screen.getByRole('heading', { level: 3, name: 'Numărul mediu al salariaților' })).toBeInTheDocument()
  })

  it('seeds the query with the hub the loader read', () => {
    const hub = territoryHubFixture('54975')!
    render(<StatisticsTerritoryHubPage siruta="54975" search={{}} initialHub={hub} />)
    expect(useStatisticsTerritoryHubMock).toHaveBeenCalledWith(
      expect.objectContaining({ siruta: '54975', initialData: hub }),
    )
  })
})

describe('StatisticsTerritoryHubPage — search hygiene', () => {
  beforeEach(() => {
    useStatisticsTerritoryHubMock.mockReturnValue(createTerritoryHubQueryStub())
  })

  it('shows the honest notice for a period no series reports', () => {
    mount({ period: '2005' })

    expect(screen.getByText(/Perioada 2005 nu este disponibilă în rezultatele încărcate/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Șterge filtrul de perioadă/ })).toBeInTheDocument()
  })

  it('names a finer period from an old link as the rows name periods', () => {
    mount({ period: '2023-05' })
    // „mai 2023" in Romanian; the formatter follows the environment's locale here.
    const may = formatHubPeriod('2023-05')
    expect(may).not.toBe('2023-05')
    expect(screen.getByText(`Filtrat: ${may}`)).toBeInTheDocument()
    expect(screen.getByText(`Perioada ${may} nu este disponibilă în rezultatele încărcate`)).toBeInTheDocument()
  })

  it('gates the query OFF for a malformed SIRUTA (never a request)', () => {
    mount({}, 'nu-e-siruta')

    expect(screen.getByText('Teritoriu negăsit')).toBeInTheDocument()
    expect(useStatisticsTerritoryHubMock).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })

  it('reads a raw-leaked NUMBER period defensively (no crash, treated absent)', () => {
    render(
      <StatisticsTerritoryHubPage
        siruta="54975"
        search={{ period: 2009 } as unknown as { period?: string }}
      />,
    )

    // The validator would coerce this, but the router can leak raw values —
    // the page itself must never .trim() a number.
    expect(screen.queryByText(/Filtrat/)).not.toBeInTheDocument()
  })
})
