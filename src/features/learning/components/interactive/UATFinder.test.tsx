import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, fireEvent, render, screen, waitFor } from '@/test/test-utils'
import type { UATFinderText } from './uat-finder-data'

const searchEntitiesMock = vi.fn()

vi.mock('@/lib/api/entities', () => ({
  searchEntities: (...args: unknown[]) => searchEntitiesMock(...args),
}))

vi.mock('@/lib/api/entity-analytics', () => ({
  fetchEntityAnalytics: vi.fn(),
}))

vi.mock('@/lib/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value,
}))

import { UATFinder } from './UATFinder'

/** The lesson's own copy, as the Romanian MDX passes it. */
const TEXT: UATFinderText = {
  title: 'Găsește-ți localitatea',
  subtitle: 'Caută o primărie',
  searchPlaceholder: 'Caută o localitate',
  recentSearchesLabel: 'Căutări recente',
  noResultsMessage: 'Nu s-au găsit rezultate pentru "{searchTerm}"',
  loadingMessage: 'Se încarcă',
  errorMessage: 'Eroare la încărcarea rezultatelor',
  typeLabel: 'Tip',
  countyLabel: 'Județ',
  populationLabel: 'Populație',
  totalBudgetLabel: 'Buget total',
  perCapitaLabel: 'Pe locuitor',
  dataYearLabel: 'Anul datelor',
  viewDetailsLabel: 'Detalii',
  compareLabel: 'Compară',
  viewOnMapLabel: 'Pe hartă',
  clearLabel: 'Șterge',
}

function searchFor(term: string) {
  const queryClient = createTestQueryClient()
  render(<UATFinder locale="ro" text={TEXT} finderId="test" />, { queryClient })
  const input = screen.getByRole('combobox', { name: TEXT.searchPlaceholder })
  act(() => input.focus())
  fireEvent.change(input, { target: { value: term } })
  return queryClient
}

describe('UATFinder search states', () => {
  beforeEach(() => {
    searchEntitiesMock.mockReset()
    window.localStorage.clear()
  })

  it('says a failed read failed, in the lesson’s own words, and never "no results"', async () => {
    searchEntitiesMock.mockRejectedValue(new Error('Entity search returned no result list'))
    searchFor('Sibiu')

    expect(await screen.findByRole('alert')).toHaveTextContent(TEXT.errorMessage)
    expect(screen.queryByText('Nu s-au găsit rezultate pentru "Sibiu"')).not.toBeInTheDocument()
  })

  it('says "no results" only for a read that succeeded with nothing', async () => {
    searchEntitiesMock.mockResolvedValue([])
    searchFor('Zzzz')

    expect(await screen.findByText('Nu s-au găsit rezultate pentru "Zzzz"')).toBeInTheDocument()
    expect(screen.queryByText(TEXT.errorMessage)).not.toBeInTheDocument()
  })

  it('lets a failed re-read of a cached search hide every old row, not sit beside them', async () => {
    searchEntitiesMock.mockResolvedValue([
      { cui: '4270740', name: 'Municipiul Sibiu', uat: { county_name: 'Sibiu', name: 'Sibiu' } },
    ])
    const queryClient = searchFor('Sibiu')
    await waitFor(() => expect(screen.getByText('Municipiul Sibiu')).toBeInTheDocument())

    // The same search is read again and the read fails; the query keeps its old rows.
    searchEntitiesMock.mockRejectedValue(new Error('Entity search returned no result list'))
    await act(async () => {
      await queryClient.refetchQueries()
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(TEXT.errorMessage)
    await waitFor(() => expect(screen.queryByText('Municipiul Sibiu')).not.toBeInTheDocument())
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.queryByText(/Nu s-au găsit rezultate/)).not.toBeInTheDocument()
  })

  it('lists what a successful read found', async () => {
    searchEntitiesMock.mockResolvedValue([
      { cui: '4270740', name: 'Municipiul Sibiu', uat: { county_name: 'Sibiu', name: 'Sibiu' } },
    ])
    searchFor('Sibiu')

    await waitFor(() => expect(screen.getByText('Municipiul Sibiu')).toBeInTheDocument())
    expect(screen.queryByText(TEXT.errorMessage)).not.toBeInTheDocument()
    expect(screen.queryByText(/Nu s-au găsit rezultate/)).not.toBeInTheDocument()
  })
})
