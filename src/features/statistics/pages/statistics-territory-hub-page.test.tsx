import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockStatisticsTerritoryHub } from '../mocks/statistics-fixtures'
import { StatisticsTerritoryHubPage } from './statistics-territory-hub-page'
import {
  createPartialTerritoryHub,
  createTerritoryHubQueryStub,
} from '../test/statistics-test-utils'

const { useStatisticsTerritoryHubMock } = vi.hoisted(() => ({
  useStatisticsTerritoryHubMock: vi.fn(),
}))

vi.mock('../hooks/use-statistics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/use-statistics')>()
  return {
    ...actual,
    useStatisticsTerritoryHub: (params: unknown) =>
      useStatisticsTerritoryHubMock(params),
  }
})

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
  useLingui: () => ({
    i18n: {
      locale: 'ro',
      _: (message: string | { readonly id: string; readonly message?: string }) =>
        typeof message === 'string' ? message : message.message ?? message.id,
    },
  }),
}))

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))

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
    readonly params?: { readonly siruta?: string }
    readonly search?: Record<string, string>
  }) => {
    let href =
      typeof to === 'string' && params?.siruta
        ? to.replace('$siruta', params.siruta)
        : to

    if (search && Object.keys(search).length > 0) {
      const query = new URLSearchParams(search).toString()
      href = `${href}?${query}`
    }

    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

describe('StatisticsTerritoryHubPage', () => {
  beforeEach(() => {
    useStatisticsTerritoryHubMock.mockImplementation(({ siruta }: { siruta: string }) =>
      createTerritoryHubQueryStub({
        data: getMockStatisticsTerritoryHub(siruta),
      }),
    )
  })

  it('renders territory identity, coverage, indicator values, and related links', () => {
    render(<StatisticsTerritoryHubPage siruta="54975" search={{}} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Municipiul Cluj-Napoca' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/54975/).length).toBeGreaterThan(0)
    expect(screen.getByText(/27 din 1\.898 seturi cu date disponibile/)).toBeInTheDocument()
    expect(screen.getByText('Status valoare: Estimat')).toBeInTheDocument()
    expect(
      screen.getByText('Setul există în catalog, dar observațiile nu sunt încă încărcate.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Nu există observații pentru acest teritoriu în setul curent.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Vezi și în alte domenii')).toBeInTheDocument()
  })

  it('opens the source provenance drawer from an indicator tile', async () => {
    render(<StatisticsTerritoryHubPage siruta="54975" search={{}} />)

    const labourTile = screen
      .getByRole('heading', { level: 3, name: 'Câmpul muncii pe localități' })
      .closest('article')
    expect(labourTile).not.toBeNull()
    fireEvent.click(within(labourTile!).getByRole('button', { name: 'Sursă' }))

    expect(await screen.findByText('Proveniență INS')).toBeInTheDocument()
    expect(screen.getByText('INS statistical indicators')).toBeInTheDocument()
    expect(screen.getAllByText(/FOM104D/).length).toBeGreaterThan(0)
    expect(
      screen.getByRole('link', { name: /Deschide matricea în INS Tempo/i }),
    ).toHaveAttribute(
      'href',
      expect.stringContaining('ind=FOM104D'),
    )
  })

  it('defaults the period select to the latest period', () => {
    render(<StatisticsTerritoryHubPage siruta="54975" search={{}} />)

    expect(screen.getByLabelText('Filtru perioadă')).toHaveTextContent(
      'Ultima perioadă',
    )
    expect(screen.queryByText(/^Filtrat:/)).not.toBeInTheDocument()
  })

  it('reflects the active period from the URL without a second fetch', () => {
    render(
      <StatisticsTerritoryHubPage siruta="54975" search={{ period: '2023' }} />,
    )

    expect(screen.getByLabelText('Filtru perioadă')).toHaveTextContent('2023')
    expect(screen.getByText('Filtrat: 2023')).toBeInTheDocument()

    // The hub is keyed on SIRUTA only: the period is applied as a client-side
    // transform, so switching periods must never refetch. If `period` ever
    // leaks back into the hook params it re-enters the query key.
    const distinctParams = new Set(
      useStatisticsTerritoryHubMock.mock.calls.map((call: unknown[]) =>
        JSON.stringify(call[0]),
      ),
    )
    expect([...distinctParams]).toEqual([
      JSON.stringify({ siruta: '54975', enabled: true }),
    ])
  })

  it('re-anchors indicator tiles to the selected period', () => {
    render(
      <StatisticsTerritoryHubPage siruta="54975" search={{ period: '2021' }} />,
    )

    // POP107D has no 2022 observation in the fixture, so a 2021 selection must
    // show 2021 data rather than the latest value.
    expect(screen.getAllByText(/2021/).length).toBeGreaterThan(0)
  })

  it('shows a not-found state when the hub query succeeds with null data', () => {
    useStatisticsTerritoryHubMock.mockReturnValue(
      createTerritoryHubQueryStub({
        data: null,
      }),
    )

    render(<StatisticsTerritoryHubPage siruta="999999" search={{}} />)

    expect(screen.getByText('Teritoriu negăsit')).toBeInTheDocument()
    expect(
      screen.getByText('Nu am găsit un teritoriu INS pentru acest SIRUTA.'),
    ).toBeInTheDocument()
  })

  it('shows a partial coverage note when hub.partial is true', () => {
    useStatisticsTerritoryHubMock.mockReturnValue(
      createTerritoryHubQueryStub({
        data: createPartialTerritoryHub('54975'),
      }),
    )

    render(<StatisticsTerritoryHubPage siruta="54975" search={{}} />)

    expect(
      screen.getByText('Rezultate parțiale — unele serii pot lipsi.'),
    ).toBeInTheDocument()
  })
})

describe('StatisticsTerritoryHubPage — search hygiene', () => {
  beforeEach(() => {
    useStatisticsTerritoryHubMock.mockReturnValue(createTerritoryHubQueryStub())
  })

  it('shows the honest notice for a period no series reports', () => {
    render(
      <StatisticsTerritoryHubPage siruta="54975" search={{ period: '2005' }} />,
    )

    expect(
      screen.getByText(/Perioada 2005 nu este disponibilă în rezultatele încărcate/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Șterge filtrul de perioadă/ }),
    ).toBeInTheDocument()
  })

  it('gates the query OFF for a malformed SIRUTA (never a request)', () => {
    render(<StatisticsTerritoryHubPage siruta="nu-e-siruta" search={{}} />)

    expect(screen.getByText('Teritoriu negăsit')).toBeInTheDocument()
    expect(useStatisticsTerritoryHubMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
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
