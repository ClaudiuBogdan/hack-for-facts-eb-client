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

vi.mock('@tanstack/react-router', () => ({
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
    useStatisticsTerritoryHubMock.mockImplementation(
      ({ siruta, search }: { siruta: string; search?: { period?: string } }) =>
        createTerritoryHubQueryStub({
          data: getMockStatisticsTerritoryHub(siruta, search),
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

  it('renders period filter links with default selection and preserved search hrefs', () => {
    render(<StatisticsTerritoryHubPage siruta="54975" search={{}} />)

    const latestLink = screen.getByRole('link', { name: 'Ultima perioadă' })
    expect(latestLink).toHaveAttribute('aria-current', 'true')
    expect(latestLink).toHaveAttribute('href', '/statistici/teritorii/54975')

    const period2023Link = screen.getByRole('link', { name: '2023' })
    expect(period2023Link).not.toHaveAttribute('aria-current')
    expect(period2023Link).toHaveAttribute(
      'href',
      '/statistici/teritorii/54975?period=2023',
    )
  })

  it('marks the active period filter when search.period is set', () => {
    render(
      <StatisticsTerritoryHubPage siruta="54975" search={{ period: '2023' }} />,
    )

    expect(screen.getByText('Filtrat: 2023')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2023' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('link', { name: 'Ultima perioadă' })).not.toHaveAttribute(
      'aria-current',
    )
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
