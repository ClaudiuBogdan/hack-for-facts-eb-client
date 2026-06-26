import { fireEvent, render, screen, within } from '@/test/test-utils'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ngoDomainCoverage } from '@/features/ngos/mocks/ngo-mocks'
import { NgoLandingPage } from './ngo-landing-page'

const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  Link: ({
    children,
    to,
    params,
    search,
  }: {
    readonly children: ReactNode
    readonly to?: string
    readonly params?: Record<string, string>
    readonly search?: Record<string, unknown>
  }) => {
    const resolvedTo = to?.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? `$${key}`)
    const query = search
      ? `?${new URLSearchParams(
          Object.entries(search).reduce<Record<string, string>>((acc, [key, value]) => {
            if (value != null) acc[key] = String(value)
            return acc
          }, {}),
        ).toString()}`
      : ''
    return <a href={`${resolvedTo ?? '#'}${query}`}>{children}</a>
  },
}))

const coverageQueryState = {
  data: undefined as typeof ngoDomainCoverage | undefined,
  isLoading: false,
  isFetching: false,
  isError: false,
}

vi.mock('../hooks/use-ngos', () => ({
  useNgoDomainCoverage: () => coverageQueryState,
}))

describe('NgoLandingPage', () => {
  beforeEach(() => {
    coverageQueryState.data = undefined
    coverageQueryState.isLoading = false
    coverageQueryState.isFetching = false
    coverageQueryState.isError = false
    navigateMock.mockReset()
  })

  it('renders source coverage matrix with loaded, stale, pending, and name-only states', () => {
    render(<NgoLandingPage initialCoverage={ngoDomainCoverage} />)

    expect(screen.getByRole('heading', { name: 'Acoperirea surselor' })).toBeInTheDocument()

    const loadedCards = screen.getAllByText('ANOFM (RUEIS)')
    expect(loadedCards.length).toBeGreaterThan(0)
    expect(screen.getAllByText('În direct').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Posibil depășit').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Parțial')).toBeInTheDocument()
    expect(screen.getAllByText('Doar referință').length).toBeGreaterThanOrEqual(2)

    expect(screen.getByText('MMuncii (servicii)')).toBeInTheDocument()
    expect(screen.getByText('ANAF (financiar)')).toBeInTheDocument()
    expect(screen.getByText('MJ (registru ONG)')).toBeInTheDocument()
    expect(screen.getAllByText('doar referinta dupa nume').length).toBeGreaterThanOrEqual(2)
  })

  it('renders known gaps and deferred MJ/SGG surfaces', () => {
    render(<NgoLandingPage initialCoverage={ngoDomainCoverage} />)

    expect(screen.getByText('Limite cunoscute')).toBeInTheDocument()
    for (const gap of ngoDomainCoverage.knownGaps) {
      expect(screen.getByText(gap)).toBeInTheDocument()
    }

    expect(screen.getByText('Urmatoarele suprafete')).toBeInTheDocument()
    expect(screen.getByText('Registru MJ dupa nume')).toBeInTheDocument()
    expect(screen.getByText('Utilitate publica SGG')).toBeInTheDocument()
    expect(screen.getAllByText('amanat').length).toBeGreaterThanOrEqual(2)
  })

  it('normalizes an RO CUI prefix and navigates to the profile route', () => {
    render(<NgoLandingPage initialCoverage={ngoDomainCoverage} />)

    const searchForm = screen.getByRole('search')
    fireEvent.change(within(searchForm).getByLabelText('Cauta ONG dupa CUI'), {
      target: { value: 'RO12345678' },
    })
    fireEvent.submit(searchForm)

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/ong-uri/$cui',
      params: { cui: '12345678' },
      search: { tab: 'identitate' },
    })
  })

  it('shows summary counts derived from coverage rows', () => {
    render(<NgoLandingPage initialCoverage={ngoDomainCoverage} />)

    expect(screen.getByText('4931')).toBeInTheDocument()
    expect(screen.getByText('19.929')).toBeInTheDocument()
    expect(screen.getByText('2 surse incarcate dar vechi')).toBeInTheDocument()
    expect(screen.getByText('Referinte neconfirmate')).toBeInTheDocument()
  })
})
