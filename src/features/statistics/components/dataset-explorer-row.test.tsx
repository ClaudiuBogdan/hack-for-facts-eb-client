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

// The row names things in the reader's language; the tests pick it here.
const locale = vi.hoisted(() => ({ current: 'ro' }))
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: React.ReactNode }) => <>{children}</>,
  useLingui: () => ({ i18n: { locale: locale.current } }),
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
  contextCode: '1508',
  contextNameRo: '4. SOMERI INREGISTRATI',
  contextNameEn: '4. REGISTERED UNEMPLOYED',
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
    const action = screen.getByRole('button', { name: /^Cere setul /})
    expect(action.closest('span')).toHaveClass('relative', 'z-10')
  })

  it('shows the span INS declares, and says whose span it is', () => {
    render(row())

    const span = screen.getByText('1991–2024')
    expect(span).toHaveTextContent('interval publicat de INS: 1991–2024')
    expect(screen.queryByText('Interval necunoscut')).not.toBeInTheDocument()
  })

  it('names every cadence INS declares, and leaves out one it has no word for', () => {
    render(row({ periodicity: ['ANNUAL', 'OTHER', 'WEEKLY'] }))

    expect(screen.getByText('Anual, Altă periodicitate')).toBeInTheDocument()
  })

  it('falls back to the English name when INS published no Romanian one', () => {
    render(row({ nameRo: null, nameEn: 'Registered unemployed by sex' }))

    expect(screen.getByRole('link', { name: 'Registered unemployed by sex' })).toBeInTheDocument()
  })

  it('reads in English, context included, for an English reader', () => {
    locale.current = 'en'
    try {
      render(row({ nameEn: 'Registered unemployed by sex' }))
      expect(screen.getByRole('link', { name: 'Registered unemployed by sex' })).toBeInTheDocument()
      expect(screen.getByText('4. REGISTERED UNEMPLOYED')).toBeInTheDocument()
      expect(screen.queryByText('4. SOMERI INREGISTRATI')).not.toBeInTheDocument()
    } finally {
      locale.current = 'ro'
    }
  })
})
