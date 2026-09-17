import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import type { StatisticsDatasetSummary } from '@/schemas/statistics'

// The row renders a TanStack <Link>; stub it so the row runs without a
// RouterProvider, keeping the href that gives the anchor its link role.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string
    params?: Record<string, string>
    children?: React.ReactNode
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </a>
  ),
}))

const { DatasetExplorerRow } = await import('./dataset-explorer-row')

const DATASET: StatisticsDatasetSummary = {
  code: 'SOM101B',
  nameRo: 'Șomerii înregistrați pe sexe',
  nameEn: null,
  periodicity: ['ANNUAL'],
  yearRange: [1991, 2024],
  hasUatData: false,
  hasCountyData: true,
  hasSiruta: false,
  dataStatus: 'available',
  latestPeriod: null,
  contextCode: '1508',
  contextNameRo: '4. SOMERI INREGISTRATI',
  contextPath: null,
}

function row(dataset: Partial<StatisticsDatasetSummary> = {}, filteredContextCode?: string) {
  return (
    <ul>
      <DatasetExplorerRow
        dataset={{ ...DATASET, ...dataset }}
        {...(filteredContextCode ? { filteredContextCode } : {})}
      />
    </ul>
  )
}

describe('DatasetExplorerRow', () => {
  it('names the row by the dataset and keeps the code as provenance', () => {
    render(row())

    const link = screen.getByRole('link', { name: 'Șomerii înregistrați pe sexe' })
    expect(link).toHaveAttribute('href', '/ins/seturi/SOM101B')
    expect(screen.getByText('SOM101B')).toBeInTheDocument()
    expect(screen.getByText('4. SOMERI INREGISTRATI')).toBeInTheDocument()
  })

  it('stops repeating the context the list is already filtered by', () => {
    render(row({}, '1508'))

    expect(screen.queryByText('4. SOMERI INREGISTRATI')).toBeNull()
    // The code is what tells one row from another, so it stays.
    expect(screen.getByText('SOM101B')).toBeInTheDocument()
  })

  it('keeps the context when a different one is filtered', () => {
    render(row({}, '1012'))

    expect(screen.getByText('4. SOMERI INREGISTRATI')).toBeInTheDocument()
  })

  it('offers the request action on a catalog-only row, above the row overlay', () => {
    render(row({ dataStatus: 'catalog-only' }))

    expect(screen.getByText('Doar catalog')).toBeInTheDocument()
    // The overlay covers the row, so the action has to sit in a lifted layer
    // or it cannot be clicked at all.
    const action = screen.getByRole('button', { name: 'Cere set' })
    expect(action.closest('span')).toHaveClass('relative', 'z-10')
  })

  it('falls back to the declared span when nothing is loaded yet', () => {
    render(row({ latestPeriod: null }))

    expect(screen.getByText('1991–2024')).toBeInTheDocument()
  })
})
