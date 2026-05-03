import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { usePnrrData } from '../hooks/usePnrrData'
import { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import { PnrrDashboard } from './PnrrDashboard'

vi.mock('../hooks/usePnrrData', () => ({
  usePnrrData: vi.fn(),
}))

vi.mock('../hooks/usePnrrFilterState', () => ({
  usePnrrFilterState: vi.fn(),
}))

vi.mock('../lib/PnrrCurrencyProvider', () => ({
  PnrrCurrencyProvider: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}))

vi.mock('./PnrrHeader', () => ({
  PnrrHeader: ({ actions }: { readonly actions: ReactNode }) => (
    <header data-testid="pnrr-header">{actions}</header>
  ),
}))

vi.mock('./PnrrSkeleton', () => ({
  PnrrContentSkeleton: () => <div data-testid="pnrr-content-skeleton" />,
}))

vi.mock('./tabs/PnrrOverview', () => ({
  PnrrOverview: () => <div data-testid="pnrr-overview" />,
}))

vi.mock('./tabs/PnrrProjectsView', () => ({
  PnrrProjectsView: () => <div data-testid="pnrr-projects" />,
}))

vi.mock('./tabs/PnrrAnomaliesView', () => ({
  PnrrAnomaliesView: () => <div data-testid="pnrr-anomalies" />,
}))

vi.mock('./tabs/PnrrBeneficiariesView', () => ({
  PnrrBeneficiariesView: () => <div data-testid="pnrr-beneficiaries" />,
}))

vi.mock('./PnrrMapView', () => ({
  PnrrMapView: () => <div data-testid="pnrr-map" />,
}))

vi.mock('./filters/PnrrFilterSheet', () => ({
  PnrrFilterSheet: () => null,
  PnrrFilterTriggerButton: () => <button type="button">Filters</button>,
}))

vi.mock('./filters/PnrrInfoSheet', () => ({
  PnrrInfoSheet: () => null,
}))

vi.mock('./table/PnrrExportButton', () => ({
  PnrrExportButton: () => null,
}))

function makeFilterState(
  overrides: Partial<ReturnType<typeof usePnrrFilterState>> = {},
): ReturnType<typeof usePnrrFilterState> {
  return {
    search: {
      view: 'overview',
      page: 1,
      pageSize: 25,
      sortBy: 'value',
      sortOrder: 'desc',
      onlyAnomalies: false,
      excludeMicro: false,
      granularity: 'county',
      includeNational: false,
    },
    setView: vi.fn(),
    showBeneficiaryProjects: vi.fn(),
    showUatView: vi.fn(),
    setSearch: vi.fn(),
    setBeneficiarySearch: vi.fn(),
    setBeneficiaryCui: vi.fn(),
    setUatFilter: vi.fn(),
    setUatFilters: vi.fn(),
    setComponents: vi.fn(),
    setCounties: vi.fn(),
    setFundingSources: vi.fn(),
    setMeasures: vi.fn(),
    setCris: vi.fn(),
    setProgressCategories: vi.fn(),
    setOnlyAnomalies: vi.fn(),
    setExcludeMicro: vi.fn(),
    setAnomalyTypes: vi.fn(),
    setDataQualitySignalTypes: vi.fn(),
    setGranularity: vi.fn(),
    setEntityTypes: vi.fn(),
    setBeneficiaryTypes: vi.fn(),
    setIncludeNational: vi.fn(),
    setSorting: vi.fn(),
    setPagination: vi.fn(),
    setMapView: vi.fn(),
    clearFilters: vi.fn(),
    ...overrides,
  }
}

describe('PnrrDashboard', () => {
  it('shows a retryable error state when the dataset fails to load', () => {
    const refetch = vi.fn()
    vi.mocked(usePnrrData).mockReturnValue({
      data: undefined,
      error: new Error('Failed to fetch PNRR projects'),
      isError: true,
      isLoading: false,
      isRefetching: false,
      refetch,
    } as unknown as ReturnType<typeof usePnrrData>)
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState())

    render(<PnrrDashboard />)

    expect(
      screen.queryByTestId('pnrr-content-skeleton'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Could not load PNRR data')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
