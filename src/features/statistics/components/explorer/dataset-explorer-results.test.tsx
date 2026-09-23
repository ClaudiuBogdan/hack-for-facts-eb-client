import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { StatisticsDatasetPage, StatisticsDatasetSummary } from '@/schemas/statistics'
import { DatasetExplorerResults, type DatasetExplorerResultsQuery } from './dataset-explorer-results'

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
  useLingui: () => ({ i18n: { locale: 'ro' } }),
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

function dataset(code: string): StatisticsDatasetSummary {
  return {
    code,
    nameRo: `Setul ${code}`,
    nameEn: null,
    periodicity: ['ANNUAL'],
    yearRange: [2000, 2024],
    hasUatData: true,
    hasCountyData: true,
    hasSiruta: true,
    dataStatus: 'available',
    contextCode: '1508',
    contextNameRo: 'Context',
    contextNameEn: null,
    contextPath: null,
  }
}

function page(codes: readonly string[], totalCount: number, hasNextPage: boolean): StatisticsDatasetPage {
  return { datasets: codes.map(dataset), totalCount, hasNextPage }
}

function query(overrides: Partial<DatasetExplorerResultsQuery> & { readonly data?: StatisticsDatasetPage }): DatasetExplorerResultsQuery {
  return {
    data: undefined,
    isPending: false,
    isError: false,
    isPlaceholderData: false,
    refetch: vi.fn<DatasetExplorerResultsQuery['refetch']>(),
    ...overrides,
  }
}

const skeletonRows = (band: HTMLElement) => within(band).queryByTestId('explorer-skeleton-rows')

describe('DatasetExplorerResults', () => {
  it('draws the row anatomy while the first read is in flight, busy and with no rows', () => {
    render(<DatasetExplorerResults query={query({ isPending: true })} search={{}} onSearchChange={vi.fn()} />)
    const band = screen.getByRole('region')
    expect(band).toHaveAttribute('aria-busy', 'true')
    expect(skeletonRows(band)).not.toBeNull()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('keeps the rows, the count and the pager while a refine loads, and says the band is busy', () => {
    const onSearchChange = vi.fn()
    render(
      <DatasetExplorerResults
        query={query({ data: page(['A', 'B'], 60, true), isPlaceholderData: true })}
        search={{ pagina: 2 }}
        onSearchChange={onSearchChange}
      />,
    )
    const band = screen.getByRole('region')
    expect(band).toHaveAttribute('aria-busy', 'true')
    expect(skeletonRows(band)).toBeNull()
    const list = within(band).getByRole('list', { name: 'Rezultate' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(list.className).toContain('opacity-60')
    expect(band).toHaveTextContent('60 de seturi de date')
    expect(band).toHaveTextContent('Pagina 2 din 3')
    // Forward is inert until the page lands (its flag is the old page's);
    // back is always safe, and the pager stays mounted for it.
    expect(within(band).getByRole('button', { name: 'Următoarea' })).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(within(band).getByRole('button', { name: 'Anterioară' }))
    expect(onSearchChange).toHaveBeenCalledWith({ pagina: undefined })
  })

  it('does not let a placeholder page forward past the end it came from', () => {
    const onSearchChange = vi.fn()
    render(
      <DatasetExplorerResults
        query={query({ data: page(['A'], 60, true), isPlaceholderData: true })}
        search={{ pagina: 3 }}
        onSearchChange={onSearchChange}
      />,
    )
    const next = screen.getByRole('button', { name: 'Următoarea' })
    expect(next).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(next)
    expect(onSearchChange).not.toHaveBeenCalled()
  })

  it('draws the skeleton, not an empty state, while a refine leaves an empty page', () => {
    render(
      <DatasetExplorerResults
        query={query({ data: page([], 1898, false), isPlaceholderData: true })}
        search={{ pagina: 76 }}
        onSearchChange={vi.fn()}
      />,
    )
    const band = screen.getByRole('region')
    expect(band).toHaveAttribute('aria-busy', 'true')
    expect(skeletonRows(band)).not.toBeNull()
    expect(band).toHaveTextContent('1.898 de seturi de date')
    expect(screen.queryByText(/nu există/)).not.toBeInTheDocument()
    expect(screen.queryByText('Catalogul INS este gol')).not.toBeInTheDocument()
  })

  it('names a page past the end and leads to the last one', () => {
    const onSearchChange = vi.fn()
    render(<DatasetExplorerResults query={query({ data: page([], 1898, false) })} search={{ pagina: 999 }} onSearchChange={onSearchChange} />)
    expect(screen.getByRole('region')).not.toHaveAttribute('aria-busy')
    expect(screen.getByText('Pagina 999 nu există')).toBeInTheDocument()
    expect(screen.getByText('Rezultatele au 76 de pagini.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mergi la ultima pagină' }))
    expect(onSearchChange).toHaveBeenCalledWith({ pagina: 76 })
  })

  it('offers to clear the filters when they match nothing, and calls an empty catalog empty', () => {
    const onSearchChange = vi.fn()
    const { unmount } = render(<DatasetExplorerResults query={query({ data: page([], 0, false) })} search={{ q: 'zzzz' }} onSearchChange={onSearchChange} />)
    expect(screen.getByText('Niciun set nu corespunde filtrelor')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Șterge filtrele' }))
    expect(onSearchChange).toHaveBeenCalledWith({})
    unmount()

    render(<DatasetExplorerResults query={query({ data: page([], 0, false) })} search={{}} onSearchChange={onSearchChange} />)
    expect(screen.getByText('Catalogul INS este gol')).toBeInTheDocument()
  })

  it('shows the failure with a retry that keeps the filters', () => {
    const refetch = vi.fn<DatasetExplorerResultsQuery['refetch']>()
    render(<DatasetExplorerResults query={query({ isError: true, refetch })} search={{ q: 'pop' }} onSearchChange={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Nu am putut încărca seturile de date')
    fireEvent.click(screen.getByRole('button', { name: 'Reîncearcă' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
