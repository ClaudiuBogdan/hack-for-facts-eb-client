import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StatisticsLandingPage } from './statistics-landing-page'
import {
  createEmptyLandingData,
  createLandingQueryStub,
} from '../test/statistics-test-utils'

const { useStatisticsLandingMock } = vi.hoisted(() => ({
  useStatisticsLandingMock: vi.fn(),
}))

vi.mock('../hooks/use-statistics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/use-statistics')>()
  return {
    ...actual,
    useStatisticsLanding: () => useStatisticsLandingMock(),
  }
})

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: { readonly siruta?: string }
  }) => {
    const href =
      typeof to === 'string' && params?.siruta
        ? to.replace('$siruta', params.siruta)
        : to

    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

describe('StatisticsLandingPage', () => {
  beforeEach(() => {
    useStatisticsLandingMock.mockReturnValue(createLandingQueryStub())
  })

  it('renders title, coverage ribbon, dataset status, and catalog-only request action', () => {
    render(<StatisticsLandingPage search={{}} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Statistici' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/27 din 1\.898 seturi cu date disponibile/)).toBeInTheDocument()

    expect(screen.getAllByText('Date disponibile').length).toBeGreaterThan(0)
    expect(screen.getByText('Doar catalog')).toBeInTheDocument()
    expect(screen.getByText(/TUR101C/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cere set' })).toBeInTheDocument()
  })

  it('offers territory search instead of a hardcoded territory list', () => {
    render(<StatisticsLandingPage search={{}} />)

    expect(screen.getByLabelText('Caută un teritoriu')).toBeInTheDocument()
    expect(
      screen.getByText('Scrie cel puțin două caractere pentru a căuta.'),
    ).toBeInTheDocument()

    // The two SIRUTA codes that used to be hardcoded entry points.
    expect(screen.queryByRole('link', { name: /Municipiul Cluj-Napoca/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /Municipiul București/i })).toBeNull()
  })

  it('links onward to the dataset explorer and comparisons', () => {
    render(<StatisticsLandingPage search={{}} />)

    expect(
      screen.getByRole('link', { name: /Toate seturile de date/i }),
    ).toHaveAttribute('href', '/statistici/seturi')
    expect(
      screen.getByRole('link', { name: /Compară teritorii/i }),
    ).toHaveAttribute('href', '/statistici/comparatii')
  })

  it('shows an empty landing state when topDatasets is empty', () => {
    useStatisticsLandingMock.mockReturnValue(
      createLandingQueryStub({
        data: createEmptyLandingData(),
      }),
    )

    render(<StatisticsLandingPage search={{}} />)

    expect(screen.getByText('Nu există seturi de afișat')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Catalogul INS nu a returnat seturi pentru această suprafață.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('POP107D')).not.toBeInTheDocument()
    expect(screen.queryByText('TUR101C')).not.toBeInTheDocument()
  })

  it('shows an error state and retries through refetch', () => {
    const refetch = vi.fn()
    useStatisticsLandingMock.mockReturnValue(
      createLandingQueryStub({
        data: undefined,
        isError: true,
        isSuccess: false,
        refetch,
      }),
    )

    render(<StatisticsLandingPage search={{}} />)

    expect(screen.getByText('Nu am putut încărca statistica')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reîncearcă' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
