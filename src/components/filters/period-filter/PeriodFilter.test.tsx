/**
 * PeriodFilter Component Tests
 *
 * This file demonstrates the testing pattern for components with internal state
 * and user interactions. The PeriodFilter allows users to select time periods
 * (year, quarter, month) and choose between specific dates or intervals.
 *
 * Pattern: Component with State Testing
 * - Test initial rendering with default/provided values
 * - Test state changes via user interactions
 * - Test callback invocations with correct parameters
 * - Mock i18n dependencies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { PeriodFilter } from './PeriodFilter'
import type { ReportPeriodInput } from '@/schemas/reporting'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Lingui Trans component
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock Lingui i18n instance
vi.mock('@lingui/core', () => ({
  i18n: {
    locale: 'en',
  },
}))

// Mock @/lib/utils to avoid lingui macro imports
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}))

// Helper to create a year period value
const createYearPeriod = (year: string): ReportPeriodInput => ({
  type: 'YEAR',
  selection: { dates: [year as `${number}`] },
})

// Helper to create a quarter period value
const createQuarterPeriod = (yearQuarter: string): ReportPeriodInput => ({
  type: 'QUARTER',
  selection: { dates: [yearQuarter as `${number}-Q${1 | 2 | 3 | 4}`] },
})

// Helper to create an interval period value
const createIntervalPeriod = (
  start: string,
  end: string
): ReportPeriodInput => ({
  type: 'YEAR',
  selection: {
    interval: {
      start: start as `${number}`,
      end: end as `${number}`,
    },
  },
})

// ============================================================================
// TESTS
// ============================================================================

describe('PeriodFilter', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders period type selection', () => {
      render(<PeriodFilter onChange={mockOnChange} />)

      expect(screen.getByText('Period Type')).toBeInTheDocument()
      expect(screen.getByText('Yearly')).toBeInTheDocument()
      expect(screen.getByText('Quarterly')).toBeInTheDocument()
      expect(screen.getByText('Monthly')).toBeInTheDocument()
    })

    it('renders selection mode toggle', () => {
      render(<PeriodFilter onChange={mockOnChange} />)

      expect(screen.getByText('Selection Mode')).toBeInTheDocument()
      expect(screen.getByText('Dates')).toBeInTheDocument()
      expect(screen.getByText('Interval')).toBeInTheDocument()
    })

    it('renders with YEAR type by default when no value provided', () => {
      render(<PeriodFilter onChange={mockOnChange} />)

      // The Yearly button should be selected (pressed)
      const yearlyButton = screen.getByRole('radio', { name: /yearly/i })
      expect(yearlyButton).toHaveAttribute('aria-checked', 'true')
    })

    it('renders with provided value', () => {
      const value = createQuarterPeriod('2024-Q1')

      render(<PeriodFilter value={value} onChange={mockOnChange} />)

      // The Quarterly button should be selected
      const quarterlyButton = screen.getByRole('radio', { name: /quarterly/i })
      expect(quarterlyButton).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('period type selection', () => {
    it('calls onChange when switching to quarterly', () => {
      render(<PeriodFilter onChange={mockOnChange} />)

      fireEvent.click(screen.getByRole('radio', { name: /quarterly/i }))

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'QUARTER',
        })
      )
    })

    it('calls onChange when switching to monthly', () => {
      render(<PeriodFilter onChange={mockOnChange} />)

      fireEvent.click(screen.getByRole('radio', { name: /monthly/i }))

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MONTH',
        })
      )
    })

    it('calls onChange when switching back to yearly', () => {
      const value = createQuarterPeriod('2024-Q1')

      render(<PeriodFilter value={value} onChange={mockOnChange} />)

      fireEvent.click(screen.getByRole('radio', { name: /yearly/i }))

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'YEAR',
        })
      )
    })
  })

  describe('selection mode', () => {
    it('shows dates selection by default', () => {
      render(<PeriodFilter onChange={mockOnChange} />)

      const datesButton = screen.getByRole('radio', { name: /^dates$/i })
      expect(datesButton).toHaveAttribute('aria-checked', 'true')
    })

    it('switches to interval mode when clicked', () => {
      render(<PeriodFilter onChange={mockOnChange} />)

      fireEvent.click(screen.getByRole('radio', { name: /interval/i }))

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selection: expect.objectContaining({
            interval: expect.objectContaining({
              start: expect.any(String),
              end: expect.any(String),
            }),
          }),
        })
      )
    })

    it('renders interval controls when interval mode is selected', () => {
      const value = createIntervalPeriod('2020', '2024')

      render(<PeriodFilter value={value} onChange={mockOnChange} />)

      // Should have two select triggers for start and end
      const selectTriggers = screen.getAllByRole('combobox')
      expect(selectTriggers.length).toBe(2)
    })
  })

  describe('date selection', () => {
    it('renders year buttons for yearly period type', () => {
      render(<PeriodFilter onChange={mockOnChange} />)

      // Should show years in the toggle group (component uses defaultYearRange: 2016-2025)
      expect(screen.getByRole('radio', { name: '2025' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: '2024' })).toBeInTheDocument()
    })

    it('calls onChange when selecting a year', () => {
      render(<PeriodFilter onChange={mockOnChange} />)

      const yearButton = screen.getByRole('radio', { name: '2023' })
      fireEvent.click(yearButton)

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'YEAR',
        selection: { dates: ['2023'] },
      })
    })

    it('allows deselecting when allowDeselect is true', () => {
      const value = createYearPeriod('2023')

      render(
        <PeriodFilter
          value={value}
          onChange={mockOnChange}
          allowDeselect={true}
        />
      )

      // Click the already selected year to deselect
      fireEvent.click(screen.getByRole('radio', { name: '2023' }))

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'YEAR',
        selection: { dates: [] },
      })
    })

    it('prevents deselecting when allowDeselect is false', () => {
      const value = createYearPeriod('2023')

      render(
        <PeriodFilter
          value={value}
          onChange={mockOnChange}
          allowDeselect={false}
        />
      )

      // Click the already selected year - should not call onChange with empty selection
      fireEvent.click(screen.getByRole('radio', { name: '2023' }))

      // Should not have been called or should maintain the value
      const calls = mockOnChange.mock.calls
      const emptySelection = calls.find(
        (call) => call[0]?.selection?.dates?.length === 0
      )
      expect(emptySelection).toBeUndefined()
    })
  })

  describe('quarterly selection', () => {
    it('renders quarters for each year when quarterly type is selected', () => {
      // Use a value with quarterly type to see the quarters grid
      const quarterlyValue = createQuarterPeriod('2024-Q1')

      render(<PeriodFilter value={quarterlyValue} onChange={mockOnChange} />)

      // Should show Q1, Q2, Q3, Q4 buttons
      expect(screen.getAllByText('Q1').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Q2').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Q3').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Q4').length).toBeGreaterThan(0)
    })
  })

  describe('monthly selection', () => {
    it('renders months for each year when monthly type is selected', () => {
      // Use a value with monthly type to see the months grid
      const monthlyValue: ReportPeriodInput = {
        type: 'MONTH',
        selection: { dates: ['2024-01'] },
      }

      render(<PeriodFilter value={monthlyValue} onChange={mockOnChange} />)

      // Should show month labels with year headers (component uses defaultYearRange: 2016-2025)
      const yearSection = screen.getByText('2025').closest('div')
      expect(yearSection).toBeInTheDocument()
    })
  })

  describe('interval selection', () => {
    it('updates start date when changed', () => {
      const value = createIntervalPeriod('2020', '2024')

      render(<PeriodFilter value={value} onChange={mockOnChange} />)

      // Find the start select (first combobox)
      const selectTriggers = screen.getAllByRole('combobox')
      fireEvent.click(selectTriggers[0])

      // Select a different year
      const option = screen.getByRole('option', { name: '2021' })
      fireEvent.click(option)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selection: expect.objectContaining({
            interval: expect.objectContaining({
              start: '2021',
            }),
          }),
        })
      )
    })

    it('updates end date when changed', () => {
      const value = createIntervalPeriod('2020', '2024')

      render(<PeriodFilter value={value} onChange={mockOnChange} />)

      // Find the end select (second combobox)
      const selectTriggers = screen.getAllByRole('combobox')
      fireEvent.click(selectTriggers[1])

      // Select a different year
      const option = screen.getByRole('option', { name: '2023' })
      fireEvent.click(option)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selection: expect.objectContaining({
            interval: expect.objectContaining({
              end: '2023',
            }),
          }),
        })
      )
    })
  })

  describe('edge cases', () => {
    it('handles switching from interval to dates mode', () => {
      const value = createIntervalPeriod('2020', '2024')

      render(<PeriodFilter value={value} onChange={mockOnChange} />)

      // Switch to dates mode
      fireEvent.click(screen.getByRole('radio', { name: /^dates$/i }))

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selection: expect.objectContaining({
            dates: expect.any(Array),
          }),
        })
      )
    })

    it('maintains type when switching selection modes', () => {
      const value: ReportPeriodInput = {
        type: 'QUARTER',
        selection: { dates: ['2024-Q1'] },
      }

      render(<PeriodFilter value={value} onChange={mockOnChange} />)

      // Switch to interval mode
      fireEvent.click(screen.getByRole('radio', { name: /interval/i }))

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'QUARTER',
        })
      )
    })
  })

  describe('constraints', () => {
    it('disables unsupported period types', () => {
      render(
        <PeriodFilter
          onChange={mockOnChange}
          allowedPeriodTypes={['YEAR']}
        />
      )

      expect(screen.getByRole('radio', { name: /yearly/i })).toBeEnabled()
      expect(screen.getByRole('radio', { name: /quarterly/i })).toBeDisabled()
      expect(screen.getByRole('radio', { name: /monthly/i })).toBeDisabled()
    })

    it('auto-clamps unsupported type to first allowed type', async () => {
      render(
        <PeriodFilter
          value={{
            type: 'MONTH',
            selection: { dates: ['2024-01'] },
          }}
          onChange={mockOnChange}
          allowedPeriodTypes={['YEAR']}
        />
      )

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'YEAR',
          })
        )
      })
    })

    it('renders only years within custom year range', () => {
      render(
        <PeriodFilter
          onChange={mockOnChange}
          yearRange={{ start: 2023, end: 2024 }}
        />
      )

      expect(screen.getByRole('radio', { name: '2024' })).toBeEnabled()
      expect(screen.getByRole('radio', { name: '2023' })).toBeEnabled()
      expect(screen.queryByRole('radio', { name: '2025' })).not.toBeInTheDocument()
      expect(screen.queryByRole('radio', { name: '2022' })).not.toBeInTheDocument()
    })

    it('renders custom year range outside default bounds', () => {
      render(
        <PeriodFilter
          onChange={mockOnChange}
          yearRange={{ start: 1990, end: 1992 }}
        />
      )

      expect(screen.getByRole('radio', { name: '1992' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: '1991' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: '1990' })).toBeInTheDocument()
      expect(screen.queryByRole('radio', { name: '2025' })).not.toBeInTheDocument()
    })

    it('keeps years enabled when year range is not provided', () => {
      render(<PeriodFilter onChange={mockOnChange} />)

      expect(screen.getByRole('radio', { name: '2025' })).toBeEnabled()
      expect(screen.getByRole('radio', { name: '2024' })).toBeEnabled()
      expect(screen.getByRole('radio', { name: '2023' })).toBeEnabled()
    })
  })
})


describe('preserved map selection', () => {
  it('does not shorten a saved interval when source coverage is smaller', () => {
    const onChange=vi.fn();
    render(<PeriodFilter preserveSelection value={createIntervalPeriod('2025','2026')} onChange={onChange} yearRange={{start:2020,end:2025}} />);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('2026')).toBeInTheDocument();
  });
  it('offers valid start options when a saved end is beyond available coverage', async () => {
    render(<PeriodFilter preserveSelection value={createIntervalPeriod('2025','2026')} onChange={vi.fn()} yearRange={{start:2020,end:2025}} />);
    fireEvent.keyDown(screen.getAllByRole('combobox')[0]!,{key:'ArrowDown'});
    expect(await screen.findByRole('option',{name:'2020'})).toBeInTheDocument();
    expect(screen.getByRole('option',{name:'2025'})).toBeInTheDocument();
  });
  it('offers valid end options when a saved start precedes available coverage', async () => {
    render(<PeriodFilter preserveSelection value={createIntervalPeriod('2019','2025')} onChange={vi.fn()} yearRange={{start:2020,end:2025}} />);
    fireEvent.keyDown(screen.getAllByRole('combobox')[1]!,{key:'ArrowDown'});
    expect(await screen.findByRole('option',{name:'2020'})).toBeInTheDocument();
    expect(screen.getByRole('option',{name:'2025'})).toBeInTheDocument();
  });
  it('keeps a saved frequency even when current metadata no longer lists it', () => {
    const onChange=vi.fn();
    render(<PeriodFilter preserveSelection value={createQuarterPeriod('2025-Q4')} onChange={onChange} allowedPeriodTypes={['YEAR']} />);
    expect(onChange).not.toHaveBeenCalled();
  });
});
