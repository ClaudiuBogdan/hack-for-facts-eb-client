/**
 * EntityReportControls Component Tests
 *
 * This file tests the EntityReportControls component which provides
 * controls for selecting reporting period, type, and normalization.
 *
 * Pattern: Controlled Form Component Testing
 * - Mock Lingui
 * - Test period type transitions (YEAR → QUARTER → MONTH)
 * - Test conditional rendering (quarter/month selectors)
 * - Test normalization options
 * - Test callbacks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { EntityReportControls } from './EntityReportControls'
import type { EntityDetailsData } from '@/lib/api/entities'
import type { ReportPeriodType, TQuarter, TMonth, GqlReportType } from '@/schemas/reporting'

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

// Mock i18n locale
vi.mock('@lingui/core', () => ({
  i18n: {
    locale: 'en',
  },
}))

// Mock reporting schema helpers
vi.mock('@/schemas/reporting', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/schemas/reporting')>()
  return {
    ...actual,
    makeSingleTimePeriod: (type: string, dateFilter: string) => ({
      period: type,
      start_date: dateFilter,
      end_date: dateFilter,
    }),
    getQuarterEndMonth: (quarter: string) => {
      const map: Record<string, string> = { Q1: '03', Q2: '06', Q3: '09', Q4: '12' }
      return map[quarter] || '03'
    },
    getQuarterForMonth: (monthNum: number) => {
      if (monthNum <= 3) return 'Q1'
      if (monthNum <= 6) return 'Q2'
      if (monthNum <= 9) return 'Q3'
      return 'Q4'
    },
  }
})

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

const createMockEntity = (overrides: Partial<EntityDetailsData> = {}): EntityDetailsData => ({
  cui: 'entity-123',
  name: 'Test Entity',
  is_uat: true,
  entity_type: 'uat',
  parents: [],
  default_report_type: 'PRINCIPAL_AGGREGATED' as GqlReportType,
  ...overrides,
} as EntityDetailsData)

// ============================================================================
// TESTS
// ============================================================================

describe('EntityReportControls', () => {
  const mockOnChange = vi.fn()
  const mockOnPrefetch = vi.fn()

  const defaultProps = {
    periodType: 'YEAR' as ReportPeriodType,
    year: 2024,
    quarter: 'Q1' as TQuarter,
    month: '01' as TMonth,
    onChange: mockOnChange,
    onPrefetch: mockOnPrefetch,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders reporting filters heading', () => {
      render(<EntityReportControls {...defaultProps} />)

      expect(screen.getByText('Reporting filters')).toBeInTheDocument()
    })

    it('renders period label', () => {
      render(<EntityReportControls {...defaultProps} />)

      expect(screen.getByText('Period')).toBeInTheDocument()
    })

    it('renders period type options', () => {
      render(<EntityReportControls {...defaultProps} />)

      expect(screen.getByText('Yearly')).toBeInTheDocument()
      expect(screen.getByText('Quarterly')).toBeInTheDocument()
      expect(screen.getByText('Monthly')).toBeInTheDocument()
    })

    it('renders year label', () => {
      render(<EntityReportControls {...defaultProps} />)

      expect(screen.getByText('Year')).toBeInTheDocument()
    })

    it('renders normalization label', () => {
      render(<EntityReportControls {...defaultProps} />)

      expect(screen.getByText('Normalization')).toBeInTheDocument()
    })

    it('renders normalization options', () => {
      render(<EntityReportControls {...defaultProps} />)

      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('Per capita')).toBeInTheDocument()
      expect(screen.getByText('% of GDP')).toBeInTheDocument()
    })

    it('renders report type label', () => {
      render(<EntityReportControls {...defaultProps} />)

      expect(screen.getByText('Report type')).toBeInTheDocument()
    })

    it('renders report type options', () => {
      render(<EntityReportControls {...defaultProps} />)

      expect(screen.getByText('Main creditor aggregated')).toBeInTheDocument()
      expect(screen.getByText('Secondary creditor aggregated')).toBeInTheDocument()
      expect(screen.getByText('Detailed')).toBeInTheDocument()
    })
  })

  describe('period type selection', () => {
    it('does not show quarter selector in YEAR mode', () => {
      render(<EntityReportControls {...defaultProps} periodType="YEAR" />)

      expect(screen.queryByText('Quarter')).not.toBeInTheDocument()
    })

    it('does not show month selector in YEAR mode', () => {
      render(<EntityReportControls {...defaultProps} periodType="YEAR" />)

      expect(screen.queryByText('Month')).not.toBeInTheDocument()
    })

    it('shows quarter selector in QUARTER mode', () => {
      render(<EntityReportControls {...defaultProps} periodType="QUARTER" />)

      expect(screen.getByText('Quarter')).toBeInTheDocument()
      expect(screen.getByText('Q1')).toBeInTheDocument()
      expect(screen.getByText('Q2')).toBeInTheDocument()
      expect(screen.getByText('Q3')).toBeInTheDocument()
      expect(screen.getByText('Q4')).toBeInTheDocument()
    })

    it('shows month selector in MONTH mode', () => {
      render(<EntityReportControls {...defaultProps} periodType="MONTH" />)

      expect(screen.getByText('Month')).toBeInTheDocument()
    })

    it('calls onChange when period type changes to QUARTER', () => {
      render(<EntityReportControls {...defaultProps} periodType="YEAR" />)

      const quarterlyButton = screen.getByText('Quarterly')
      fireEvent.click(quarterlyButton)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          report_period: expect.any(Object),
        })
      )
    })

    it('calls onChange when period type changes to MONTH', () => {
      render(<EntityReportControls {...defaultProps} periodType="YEAR" />)

      const monthlyButton = screen.getByText('Monthly')
      fireEvent.click(monthlyButton)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          report_period: expect.any(Object),
        })
      )
    })
  })

  describe('year selection', () => {
    it('renders year options', () => {
      render(<EntityReportControls {...defaultProps} year={2024} />)

      // Should show current year and several past years
      expect(screen.getByText('2024')).toBeInTheDocument()
      expect(screen.getByText('2023')).toBeInTheDocument()
    })

    it('calls onChange when year is selected', () => {
      render(<EntityReportControls {...defaultProps} year={2024} />)

      const yearButton = screen.getByText('2023')
      fireEvent.click(yearButton)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          report_period: expect.any(Object),
        })
      )
    })
  })

  describe('quarter selection', () => {
    it('calls onChange when quarter is selected', () => {
      render(<EntityReportControls {...defaultProps} periodType="QUARTER" quarter="Q1" />)

      const q2Button = screen.getByText('Q2')
      fireEvent.click(q2Button)

      expect(mockOnChange).toHaveBeenCalled()
    })
  })

  describe('month selection', () => {
    it('renders month options in MONTH mode', () => {
      render(<EntityReportControls {...defaultProps} periodType="MONTH" />)

      // Months are formatted with Intl.DateTimeFormat
      // They appear as "01 Jan.", "02 Feb.", etc.
      expect(screen.getByText(/01.*Jan/i)).toBeInTheDocument()
    })

    it('calls onChange when month is selected', () => {
      render(<EntityReportControls {...defaultProps} periodType="MONTH" month="01" />)

      // Find a different month button
      const monthButton = screen.getByText(/02.*Feb/i)
      fireEvent.click(monthButton)

      expect(mockOnChange).toHaveBeenCalled()
    })
  })

  describe('normalization selection', () => {
    it('enables per capita when entity is UAT', () => {
      const entity = createMockEntity({ is_uat: true })
      render(<EntityReportControls {...defaultProps} entity={entity} />)

      const perCapitaButton = screen.getByText('Per capita')
      expect(perCapitaButton).not.toBeDisabled()
    })

    it('disables per capita when entity is county council but not UAT', () => {
      const entity = createMockEntity({ is_uat: false, entity_type: 'admin_county_council' })
      render(<EntityReportControls {...defaultProps} entity={entity} />)

      const perCapitaButton = screen.getByText('Per capita')
      expect(perCapitaButton).toBeDisabled()
    })

    it('disables per capita when entity is not UAT', () => {
      const entity = createMockEntity({ is_uat: false, entity_type: 'other' })
      render(<EntityReportControls {...defaultProps} entity={entity} />)

      const perCapitaButton = screen.getByText('Per capita')
      expect(perCapitaButton).toBeDisabled()
    })

    it('calls onChange when normalization is changed to total', () => {
      const entity = createMockEntity({ is_uat: true })
      render(
        <EntityReportControls
          {...defaultProps}
          entity={entity}
          normalization="per_capita"
        />
      )

      const totalButton = screen.getByText('Total')
      fireEvent.click(totalButton)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          normalization: 'total',
        })
      )
    })
  })

  describe('report type selection', () => {
    it('calls onChange when report type is changed', () => {
      render(<EntityReportControls {...defaultProps} reportType="PRINCIPAL_AGGREGATED" />)

      const detailedButton = screen.getByText('Detailed')
      fireEvent.click(detailedButton)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          report_type: 'DETAILED',
        })
      )
    })
  })

  describe('main creditor selection', () => {
    it('does not render main creditor when no parents', () => {
      const entity = createMockEntity({ parents: [] })
      render(<EntityReportControls {...defaultProps} entity={entity} />)

      expect(screen.queryByText('Main creditor')).not.toBeInTheDocument()
    })

    it('renders main creditor when entity has parents', () => {
      const entity = createMockEntity({
        cui: 'child-entity',
        parents: [
          { cui: 'parent-1', name: 'Parent Entity' },
        ],
      })
      render(<EntityReportControls {...defaultProps} entity={entity} />)

      expect(screen.getByText('Main creditor')).toBeInTheDocument()
      expect(screen.getByText('All')).toBeInTheDocument()
      expect(screen.getByText('Parent Entity')).toBeInTheDocument()
    })

    it('excludes self from creditor options', () => {
      const entity = createMockEntity({
        cui: 'entity-123',
        parents: [
          { cui: 'entity-123', name: 'Self Entity' }, // Same CUI as entity
          { cui: 'parent-1', name: 'Parent Entity' },
        ],
      })
      render(<EntityReportControls {...defaultProps} entity={entity} />)

      expect(screen.queryByText('Self Entity')).not.toBeInTheDocument()
      expect(screen.getByText('Parent Entity')).toBeInTheDocument()
    })

    it('calls onChange when creditor is selected', () => {
      const entity = createMockEntity({
        cui: 'child-entity',
        parents: [
          { cui: 'parent-1', name: 'Parent Entity' },
        ],
      })
      render(<EntityReportControls {...defaultProps} entity={entity} />)

      const parentButton = screen.getByText('Parent Entity')
      fireEvent.click(parentButton)

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          main_creditor_cui: 'parent-1',
        })
      )
    })
  })

  describe('prefetch on hover', () => {
    it('calls onPrefetch when year is hovered', () => {
      render(<EntityReportControls {...defaultProps} />)

      const yearButton = screen.getByText('2023')
      fireEvent.mouseEnter(yearButton)

      expect(mockOnPrefetch).toHaveBeenCalled()
    })

    it('calls onPrefetch when period type is hovered', () => {
      render(<EntityReportControls {...defaultProps} />)

      const quarterlyButton = screen.getByText('Quarterly')
      fireEvent.mouseEnter(quarterlyButton)

      expect(mockOnPrefetch).toHaveBeenCalled()
    })
  })

  describe('without callbacks', () => {
    it('renders without onChange', () => {
      render(
        <EntityReportControls
          periodType="YEAR"
          year={2024}
          quarter="Q1"
          month="01"
        />
      )

      expect(screen.getByText('Reporting filters')).toBeInTheDocument()
    })

    it('does not throw when clicking without onChange', () => {
      render(
        <EntityReportControls
          periodType="YEAR"
          year={2024}
          quarter="Q1"
          month="01"
        />
      )

      const yearlyButton = screen.getByText('Yearly')
      expect(() => fireEvent.click(yearlyButton)).not.toThrow()
    })
  })
})
