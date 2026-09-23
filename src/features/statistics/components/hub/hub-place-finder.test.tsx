import type { ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@/test/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatisticsTerritorySearchRow } from '@/schemas/statistics'
import { HubPlaceFinder } from './hub-place-finder'

const { useTerritorySearchMock } = vi.hoisted(() => ({ useTerritorySearchMock: vi.fn() }))

vi.mock('../../hooks/use-territory-search', () => ({
  useTerritorySearch: (term: string | undefined) => useTerritorySearchMock(term),
}))

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: Readonly<Record<string, string>> }) => {
    let href = to
    for (const [key, value] of Object.entries(params ?? {})) href = href.replace(`$${key}`, value)
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

const row = (overrides: Partial<StatisticsTerritorySearchRow>): StatisticsTerritorySearchRow => ({
  code: '54975',
  siruta: '54975',
  name: 'Cluj-Napoca',
  level: 'LAU',
  countyCode: 'CJ',
  countyName: 'Cluj',
  ...overrides,
})

function stub(state: Partial<{ isLoading: boolean; isError: boolean; isSuccess: boolean; rows: readonly StatisticsTerritorySearchRow[] }>) {
  const refetch = vi.fn()
  useTerritorySearchMock.mockReturnValue({
    data: state.rows ? { rows: state.rows, totalCount: state.rows.length, hasNextPage: false } : undefined,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
    isSuccess: state.isSuccess ?? false,
    refetch,
  })
  return { refetch }
}

/** Types a term and lets the debounce commit it. */
function search(term: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Caută un teritoriu' }), { target: { value: term } })
  act(() => {
    vi.advanceTimersByTime(300)
  })
}

describe('HubPlaceFinder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useTerritorySearchMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('offers the quick tries before a term, and says nothing', () => {
    stub({})
    render(<HubPlaceFinder inputId="place" />)
    expect(screen.getByRole('link', { name: 'Cluj-Napoca' })).toHaveAttribute('href', '/ins/teritorii/54975')
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('announces the search, then how many places it found', () => {
    stub({ isLoading: true })
    render(<HubPlaceFinder inputId="place" />)
    search('cluj')
    expect(screen.getByRole('status')).toHaveTextContent('Se caută')
    expect(screen.queryByRole('link', { name: /Cluj/ })).not.toBeInTheDocument()

    stub({ isSuccess: true, rows: [row({}), row({ code: 'CJ', siruta: null, name: 'Cluj', level: 'NUTS3', countyCode: null, countyName: null })] })
    search('cluj-n')
    expect(screen.getByRole('status')).toHaveTextContent('2 teritorii găsite')
    // The town links into its page; the county is shown for orientation and does not.
    expect(screen.getByRole('link', { name: /Cluj-Napoca/ })).toHaveAttribute('href', '/ins/teritorii/54975')
    expect(screen.getByText('Alege o localitate din județ')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('says when nothing matched and when the search failed, with a retry', () => {
    stub({ isSuccess: true, rows: [] })
    render(<HubPlaceFinder inputId="place" />)
    search('zzzz')
    expect(screen.getByRole('status')).toHaveTextContent('Niciun teritoriu găsit')
    expect(screen.getByText('Niciun teritoriu nu se potrivește cu acest termen.')).toBeInTheDocument()

    const { refetch } = stub({ isError: true })
    search('zzzz2')
    expect(screen.getByRole('status')).toHaveTextContent('Căutarea nu a reușit')
    fireEvent.click(screen.getByRole('button', { name: 'Reîncearcă' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
