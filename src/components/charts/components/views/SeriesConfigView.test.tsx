/**
 * SeriesConfigView Component Tests
 *
 * This file tests the SeriesConfigView component which provides
 * configuration interface for chart series.
 *
 * Pattern: Complex Multi-type Editor Testing
 * - Mock useChartStore hook
 * - Mock child components (SeriesFilter, CalculationConfig, etc.)
 * - Test series type selection
 * - Test quick actions
 * - Test advanced settings toggle
 * - Test not found state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { SeriesConfigView } from './SeriesConfigView'
import type { Chart, SeriesConfiguration } from '@/schemas/charts'

// ============================================================================
// POLYFILLS
// ============================================================================

// ResizeObserver is required by Radix UI's Collapsible component
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = ResizeObserverMock

// ============================================================================
// MOCKS
// ============================================================================

// Mock Lingui
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}))

// Mock TanStack Router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/components/ui/select', async () => {
  const React = await import('react')
  const SelectContext = React.createContext<{ onValueChange?: (value: string) => void } | null>(null)

  const Select = ({ value, onValueChange, children }: any) => (
    <SelectContext.Provider value={{ onValueChange }}>
      <div data-testid="mock-select" data-value={value}>
        {children}
      </div>
    </SelectContext.Provider>
  )

  const SelectTrigger = ({ children }: any) => <div>{children}</div>
  const SelectValue = ({ placeholder }: any) => <span>{placeholder}</span>
  const SelectContent = ({ children }: any) => <div>{children}</div>
  const SelectItem = ({ value, children }: any) => {
    const context = React.useContext(SelectContext)
    return (
      <button type="button" onClick={() => context?.onValueChange?.(value)}>
        {children}
      </button>
    )
  }

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
})

// Mock Analytics
vi.mock('@/lib/analytics', () => ({
  Analytics: {
    capture: vi.fn(),
    EVENTS: {
      AlertCreateStarted: 'AlertCreateStarted',
    },
  },
}))

// Mock alert utilities
vi.mock('@/lib/alert-links', () => ({
  buildAlertFromFilter: () => ({ id: 'alert-1' }),
}))

vi.mock('@/schemas/alerts', () => ({
  createEmptyAlert: () => ({ id: 'alert-1' }),
}))

// Mock chart store
const mockUpdateSeries = vi.fn()
const mockDeleteSeries = vi.fn()
const mockGoToOverview = vi.fn()
const mockGoToConfig = vi.fn()

const createMockSeries = (overrides: Partial<SeriesConfiguration> = {}): SeriesConfiguration => ({
  id: 'series-1',
  type: 'line-items-aggregated-yearly',
  enabled: true,
  label: 'Test Series',
  unit: 'RON',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  filter: {
    account_category: 'ch',
    normalization: 'total',
  },
  config: { color: '#0000ff', showDataLabels: false },
  ...overrides,
})

const mockChart: Chart = {
  id: 'chart-1',
  title: 'Test Chart',
  config: {
    chartType: 'line',
    color: '#000000',
    showLegend: true,
    showTooltip: true,
    showGridLines: true,
    editAnnotations: true,
    showAnnotations: true,
  },
  series: [createMockSeries()],
  annotations: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

vi.mock('../../hooks/useChartStore', () => ({
  useChartStore: () => ({
    chart: mockChart,
    seriesId: 'series-1',
    updateSeries: mockUpdateSeries,
    deleteSeries: mockDeleteSeries,
    goToOverview: mockGoToOverview,
    goToConfig: mockGoToConfig,
  }),
}))

// Mock copy/paste hooks
const mockDuplicateSeries = vi.fn()
const mockCopySeries = vi.fn()
vi.mock('../../hooks/useCopyPaste', () => ({
  useCopyPasteChart: () => ({
    duplicateSeries: mockDuplicateSeries,
    copySeries: mockCopySeries,
  }),
}))

// Mock generateRandomColor
vi.mock('../chart-renderer/utils', () => ({
  generateRandomColor: () => '#00ff00',
}))

// Mock child components
vi.mock('../series-config/SeriesFilter', () => ({
  SeriesFilter: ({ seriesId }: { seriesId: string }) => (
    <div data-testid="series-filter">SeriesFilter for {seriesId}</div>
  ),
}))

vi.mock('../series-config/CalculationConfig', () => ({
  CalculationConfig: () => <div data-testid="calculation-config">CalculationConfig</div>,
}))

vi.mock('../series-config/CustomSeriesDataEditor', () => ({
  CustomSeriesDataEditor: () => <div data-testid="custom-series-editor">CustomSeriesDataEditor</div>,
}))

vi.mock('../series-config/CustomSeriesValueEditor', () => ({
  CustomSeriesValueEditor: () => <div data-testid="custom-series-value-editor">CustomSeriesValueEditor</div>,
}))

vi.mock('../series-config/StaticSeriesEditor', () => ({
  StaticSeriesEditor: () => <div data-testid="static-series-editor">StaticSeriesEditor</div>,
}))

vi.mock('../series-config/InsSeriesEditor', () => ({
  InsSeriesEditor: () => <div data-testid="ins-series-editor">InsSeriesEditor</div>,
}))

vi.mock('../series-config/DataLabelSelector', () => ({
  DataLabelSelector: () => <div data-testid="data-label-selector">DataLabelSelector</div>,
}))

vi.mock('../series-config/UnitInput', () => ({
  UnitInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input data-testid="unit-input" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

// Mock DebouncedStatusInput
vi.mock('@/components/ui/debounced-status-input', () => ({
  DebouncedStatusInput: ({ value, onDebouncedChange, id, placeholder, changingText, changedText }: any) => (
    <input
      data-testid={`debounced-input-${id}`}
      id={id}
      value={value}
      onChange={(e) => onDebouncedChange(e.target.value)}
      placeholder={placeholder}
      data-changing-text={changingText}
      data-changed-text={changedText}
    />
  ),
}))

// ============================================================================
// TESTS
// ============================================================================

describe('SeriesConfigView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chart data
    mockChart.series = [createMockSeries()]
  })

  describe('rendering', () => {
    it('renders configure series heading', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText('Configure Series')).toBeInTheDocument()
    })

    it('renders breadcrumb navigation', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText('Chart')).toBeInTheDocument()
      expect(screen.getByText('Chart Config')).toBeInTheDocument()
      expect(screen.getByText('Config')).toBeInTheDocument()
    })

    it('renders view chart button', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText('View Chart')).toBeInTheDocument()
    })

    it('renders series label input', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText(/Series Label/)).toBeInTheDocument()
    })

    it('renders series type selector', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText('Series Type')).toBeInTheDocument()
    })

    it('renders active switch', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('renders series color label', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText('Series Color')).toBeInTheDocument()
    })
  })

  describe('quick actions', () => {
    it('renders create alert button for line-items series', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText('Create Alert')).toBeInTheDocument()
    })

    it('renders duplicate button', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText('Duplicate')).toBeInTheDocument()
    })

    it('renders copy button', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText('Copy')).toBeInTheDocument()
    })

    it('calls duplicateSeries when duplicate is clicked', () => {
      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Duplicate'))

      expect(mockDuplicateSeries).toHaveBeenCalledWith('series-1')
    })

    it('calls copySeries when copy is clicked', () => {
      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Copy'))

      expect(mockCopySeries).toHaveBeenCalledWith('series-1')
    })
  })

  describe('navigation', () => {
    it('calls goToOverview when View Chart is clicked', () => {
      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('View Chart'))

      expect(mockGoToOverview).toHaveBeenCalled()
    })

    it('calls goToConfig when Chart Configuration is clicked', () => {
      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Chart Configuration'))

      expect(mockGoToConfig).toHaveBeenCalled()
    })

    it('calls goToOverview when Chart breadcrumb is clicked', () => {
      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Chart'))

      expect(mockGoToOverview).toHaveBeenCalled()
    })

    it('calls goToConfig when Chart Config breadcrumb is clicked', () => {
      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Chart Config'))

      expect(mockGoToConfig).toHaveBeenCalled()
    })
  })

  describe('advanced settings', () => {
    it('shows advanced settings toggle', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText('Show advanced settings')).toBeInTheDocument()
    })

    it('toggles to hide advanced settings when clicked', () => {
      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Show advanced settings'))

      expect(screen.getByText('Hide advanced settings')).toBeInTheDocument()
    })

    it('shows data labels setting when advanced is expanded', () => {
      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Show advanced settings'))

      expect(screen.getByText('Show Data Labels')).toBeInTheDocument()
    })

    it('shows data label offset when advanced is expanded', () => {
      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Show advanced settings'))

      expect(screen.getByText('Data Label Offset')).toBeInTheDocument()
    })

    it('shows x-axis prefix setting when advanced is expanded', () => {
      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Show advanced settings'))

      expect(screen.getByText('X-Axis Prefix To Remove')).toBeInTheDocument()
    })

    it('passes catalog status words to both debounced inputs, never the generic English defaults (CQA-12)', () => {
      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Show advanced settings'))

      for (const id of ['series-label', 'x-axis-prefix-to-remove']) {
        const input = screen.getByTestId(`debounced-input-${id}`)
        expect(input).toHaveAttribute('data-changing-text', 'Changing…')
        expect(input).toHaveAttribute('data-changed-text', 'Changed')
      }
    })

    it('shows INS advanced controls for ins-series', () => {
      mockChart.series = [
        createMockSeries({
          type: 'ins-series' as any,
          datasetCode: 'POP107D',
          aggregation: 'sum',
          hasValue: true,
        } as any),
      ] as any

      render(<SeriesConfigView />)
      fireEvent.click(screen.getByText('Show advanced settings'))

      expect(screen.getByText('Aggregation')).toBeInTheDocument()
      expect(screen.getByText('Only observations with values')).toBeInTheDocument()
      expect(screen.getByLabelText('Aggregation help')).toBeInTheDocument()
      expect(
        screen.getByText('Use the total of all matching observations in each period.')
      ).toBeInTheDocument()
    })

    it('does not show INS advanced controls for non-INS series', () => {
      render(<SeriesConfigView />)
      fireEvent.click(screen.getByText('Show advanced settings'))

      expect(screen.queryByText('Aggregation')).not.toBeInTheDocument()
      expect(screen.queryByText('Only observations with values')).not.toBeInTheDocument()
    })
  })

  describe('series type conditional rendering', () => {
    it('shows SeriesFilter for line-items-aggregated-yearly', () => {
      render(<SeriesConfigView />)

      expect(screen.getByTestId('series-filter')).toBeInTheDocument()
    })

    it('shows SeriesFilter for commitments-analytics', () => {
      mockChart.series = [
        createMockSeries({
          type: 'commitments-analytics' as any,
          metric: 'CREDITE_ANGAJAMENT',
          filter: {
            report_type: 'PRINCIPAL_AGGREGATED',
            report_period: { type: 'YEAR', selection: { interval: { start: '2024', end: '2024' } } },
          },
        } as any),
      ] as any

      render(<SeriesConfigView />)

      expect(screen.getByTestId('series-filter')).toBeInTheDocument()
    })

    it('does not show unit input for line-items series', () => {
      render(<SeriesConfigView />)

      expect(screen.queryByTestId('unit-input')).not.toBeInTheDocument()
    })

    it('does not show unit input for commitments series', () => {
      mockChart.series = [
        createMockSeries({
          type: 'commitments-analytics' as any,
          metric: 'CREDITE_ANGAJAMENT',
          filter: {
            report_type: 'PRINCIPAL_AGGREGATED',
            report_period: { type: 'YEAR', selection: { interval: { start: '2024', end: '2024' } } },
          },
        } as any),
      ] as any

      render(<SeriesConfigView />)

      expect(screen.queryByTestId('unit-input')).not.toBeInTheDocument()
    })

    it('shows InsSeriesEditor for ins-series', () => {
      mockChart.series = [
        createMockSeries({
          type: 'ins-series' as any,
          datasetCode: 'POP107D',
          aggregation: 'sum',
          hasValue: true,
        } as any),
      ] as any

      render(<SeriesConfigView />)

      expect(screen.getByTestId('ins-series-editor')).toBeInTheDocument()
    })

    it('does not show create alert button for commitments series', () => {
      mockChart.series = [
        createMockSeries({
          type: 'commitments-analytics' as any,
          metric: 'CREDITE_ANGAJAMENT',
          filter: {
            report_type: 'PRINCIPAL_AGGREGATED',
            report_period: { type: 'YEAR', selection: { interval: { start: '2024', end: '2024' } } },
          },
        } as any),
      ] as any

      render(<SeriesConfigView />)

      expect(screen.queryByText('Create Alert')).not.toBeInTheDocument()
    })

    it('normalizes report type when switching from commitments to line-items', () => {
      const commitmentsSeries = createMockSeries({
        type: 'commitments-analytics' as any,
        metric: 'CREDITE_ANGAJAMENT',
        filter: {
          report_type: 'PRINCIPAL_AGGREGATED',
          report_period: { type: 'YEAR', selection: { interval: { start: '2024', end: '2024' } } },
        },
      } as any)

      mockChart.series = [commitmentsSeries] as any

      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Line Items Aggregated Yearly'))

      expect(mockUpdateSeries).toHaveBeenCalledWith('series-1', expect.any(Function))
      const lastCall = mockUpdateSeries.mock.calls[mockUpdateSeries.mock.calls.length - 1]
      const updateCallback = lastCall?.[1] as ((prev: any) => any) | undefined
      expect(updateCallback).toBeDefined()

      const nextSeries = updateCallback?.(commitmentsSeries)
      expect(nextSeries?.type).toBe('line-items-aggregated-yearly')
      expect(nextSeries?.filter.report_type).toBe('Executie bugetara agregata la nivel de ordonator principal')
    })
  })

  describe('delete functionality', () => {
    it('renders delete series button', () => {
      render(<SeriesConfigView />)

      expect(screen.getByText('Delete Series')).toBeInTheDocument()
    })

    it('delete button has trash icon', () => {
      render(<SeriesConfigView />)

      expect(document.querySelector('.lucide-trash-2')).toBeInTheDocument()
    })
  })

  describe('series not found', () => {
    it('shows not found message when series does not exist', () => {
      mockChart.series = []

      render(<SeriesConfigView />)

      expect(screen.getByText('Series not found')).toBeInTheDocument()
    })

    it('shows back to configuration button when not found', () => {
      mockChart.series = []

      render(<SeriesConfigView />)

      expect(screen.getByText('Back to Configuration')).toBeInTheDocument()
    })

    it('calls goToConfig when back button is clicked in not found state', () => {
      mockChart.series = []

      render(<SeriesConfigView />)

      fireEvent.click(screen.getByText('Back to Configuration'))

      expect(mockGoToConfig).toHaveBeenCalled()
    })
  })

  describe('color controls', () => {
    it('renders color input', () => {
      render(<SeriesConfigView />)

      const colorInput = screen.getByLabelText('Series Color')
      expect(colorInput).toBeInTheDocument()
    })

    it('renders random color button', () => {
      render(<SeriesConfigView />)

      // RotateCcw icon should be present
      expect(document.querySelector('.lucide-rotate-ccw')).toBeInTheDocument()
    })

    it('calls updateSeriesConfig when color changes', () => {
      render(<SeriesConfigView />)

      const colorInput = screen.getByLabelText('Series Color')
      fireEvent.change(colorInput, { target: { value: '#ff0000' } })

      expect(mockUpdateSeries).toHaveBeenCalled()
    })
  })

  describe('active toggle', () => {
    it('renders active switch in checked state', () => {
      render(<SeriesConfigView />)

      const activeSwitch = screen.getByRole('switch', { name: /active/i })
      expect(activeSwitch).toBeChecked()
    })

    it('calls updateSeries when active switch is toggled', () => {
      render(<SeriesConfigView />)

      const activeSwitch = screen.getByRole('switch', { name: /active/i })
      fireEvent.click(activeSwitch)

      expect(mockUpdateSeries).toHaveBeenCalled()
    })
  })
})
