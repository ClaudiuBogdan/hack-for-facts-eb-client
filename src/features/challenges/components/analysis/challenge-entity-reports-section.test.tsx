import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReportConnection } from '@/lib/api/entities'
import type { PeriodDate, ReportPeriodInput } from '@/schemas/reporting'
import { ChallengeEntityReportsSection } from './challenge-entity-reports-section'

const useReportsConnectionMock = vi.fn()

vi.mock('@/lib/hooks/useEntityDetails', () => ({
  useReportsConnection: (...args: unknown[]) => useReportsConnectionMock(...args),
}))

function createReportsConnection(totalCount = 6): ReportConnection {
  return {
    nodes: [
      {
        report_id: 'report-3',
        reporting_year: 2025,
        report_type: 'PRINCIPAL_AGGREGATED',
        report_date: '1753920000000',
        download_links: ['https://example.com/report-3.pdf'],
        main_creditor: { cui: '4305857', name: 'Municipiul Cluj-Napoca' },
        budgetSector: {
          sector_id: '2',
          sector_description: 'Buget local',
        },
      },
      {
        report_id: 'report-1',
        reporting_year: 2025,
        report_type: 'PRINCIPAL_AGGREGATED',
        report_date: '1761868800000',
        download_links: [
          'https://example.com/report-1.xml',
          'https://example.com/report-1.pdf',
          'https://example.com/report-1.xlsx',
        ],
        main_creditor: { cui: '4305857', name: 'Municipiul Cluj-Napoca' },
        budgetSector: {
          sector_id: '2',
          sector_description: 'Buget local',
        },
      },
      {
        report_id: 'report-2',
        reporting_year: 2025,
        report_type: 'PRINCIPAL_AGGREGATED',
        report_date: '1759190400000',
        download_links: ['https://example.com/report-2.xlsx'],
        main_creditor: { cui: '4305857', name: 'Municipiul Cluj-Napoca' },
        budgetSector: {
          sector_id: '2',
          sector_description: 'Buget local',
        },
      },
      {
        report_id: 'report-4',
        reporting_year: 2025,
        report_type: 'PRINCIPAL_AGGREGATED',
        report_date: '1751241600000',
        download_links: ['https://example.com/report-4.pdf'],
        main_creditor: { cui: '4305857', name: 'Municipiul Cluj-Napoca' },
        budgetSector: {
          sector_id: '2',
          sector_description: 'Buget local',
        },
      },
      {
        report_id: 'report-5',
        reporting_year: 2025,
        report_type: 'PRINCIPAL_AGGREGATED',
        report_date: '1748649600000',
        download_links: ['https://example.com/report-5.pdf'],
        main_creditor: { cui: '4305857', name: 'Municipiul Cluj-Napoca' },
        budgetSector: {
          sector_id: '2',
          sector_description: 'Buget local',
        },
      },
      {
        report_id: 'report-6',
        reporting_year: 2025,
        report_type: 'PRINCIPAL_AGGREGATED',
        report_date: '1745971200000',
        download_links: ['https://example.com/report-6.pdf'],
        main_creditor: { cui: '4305857', name: 'Municipiul Cluj-Napoca' },
        budgetSector: {
          sector_id: '2',
          sector_description: 'Buget local',
        },
      },
    ],
    pageInfo: {
      totalCount,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  }
}

function createYearReportPeriod(year: number): ReportPeriodInput {
  return {
    type: 'YEAR',
    selection: {
      interval: {
        start: String(year) as PeriodDate,
        end: String(year) as PeriodDate,
      },
    },
  }
}

function createQuarterReportPeriod(
  year: number,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
): ReportPeriodInput {
  return {
    type: 'QUARTER',
    selection: {
      interval: {
        start: `${year}-${quarter}` as PeriodDate,
        end: `${year}-${quarter}` as PeriodDate,
      },
    },
  }
}

function renderReportsSection(
  props: Partial<ComponentProps<typeof ChallengeEntityReportsSection>> = {},
) {
  return render(
    <ChallengeEntityReportsSection
      locale="ro"
      entityCui="4305857"
      reportPeriod={createYearReportPeriod(2025)}
      reportType="PRINCIPAL_AGGREGATED"
      {...props}
    />,
  )
}

describe('ChallengeEntityReportsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useReportsConnectionMock.mockReturnValue({
      data: createReportsConnection(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
  })

  it('renders the newest 5 reports by default', () => {
    renderReportsSection()

    const reportRows = screen.getAllByRole('listitem')

    expect(reportRows).toHaveLength(5)
    expect(reportRows[0]).toHaveTextContent('octombrie 2025')
    expect(reportRows[1]).toHaveTextContent('septembrie 2025')
    expect(reportRows[2]).toHaveTextContent('iulie 2025')
    expect(screen.queryByText('Aprilie 2025')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Arată încă 1 raport' }),
    ).toBeInTheDocument()
  })

  it('expands inline and then collapses back to the top 5', () => {
    renderReportsSection()

    fireEvent.click(screen.getByRole('button', { name: 'Arată încă 1 raport' }))

    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByText('Aprilie 2025')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Arată mai puține' }),
    ).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Arată mai puține' }))

    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByText('Aprilie 2025')).not.toBeInTheDocument()
  })

  it('refreshes when the selected period changes and collapses the list', () => {
    const { rerender } = renderReportsSection()

    fireEvent.click(screen.getByRole('button', { name: 'Arată încă 1 raport' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(6)

    useReportsConnectionMock.mockReturnValue({
      data: {
        nodes: [
          {
            report_id: 'report-2024',
            reporting_year: 2024,
            report_type: 'PRINCIPAL_AGGREGATED',
            report_date: '1735603200000',
            download_links: ['https://example.com/report-2024.pdf'],
            main_creditor: { cui: '4305857', name: 'Municipiul Cluj-Napoca' },
            budgetSector: {
              sector_id: '2',
              sector_description: 'Buget local',
            },
          },
        ],
        pageInfo: {
          totalCount: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })

    rerender(
      <ChallengeEntityReportsSection
        locale="ro"
        entityCui="4305857"
        reportPeriod={createYearReportPeriod(2024)}
        reportType="PRINCIPAL_AGGREGATED"
      />,
    )

    expect(useReportsConnectionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          reporting_year: 2024,
          report_type: 'PRINCIPAL_AGGREGATED',
        }),
      }),
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Decembrie 2024')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Arată mai puține' }),
    ).not.toBeInTheDocument()
  })

  it('refreshes when the report type changes', () => {
    const { rerender } = renderReportsSection()

    useReportsConnectionMock.mockReturnValue({
      data: {
        nodes: [
          {
            report_id: 'detailed-report',
            reporting_year: 2025,
            report_type: 'DETAILED',
            report_date: '1761868800000',
            download_links: ['https://example.com/detailed.xml'],
            main_creditor: { cui: '4305857', name: 'Municipiul Cluj-Napoca' },
            budgetSector: {
              sector_id: '2',
              sector_description: 'Buget local',
            },
          },
        ],
        pageInfo: {
          totalCount: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })

    rerender(
      <ChallengeEntityReportsSection
        locale="ro"
        entityCui="4305857"
        reportPeriod={createYearReportPeriod(2025)}
        reportType="DETAILED"
      />,
    )

    expect(useReportsConnectionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          reporting_year: 2025,
          report_type: 'DETAILED',
        }),
      }),
    )
    expect(screen.getByText('Executie bugetara detaliata')).toBeInTheDocument()
  })

  it('shows loading, empty, and error states', () => {
    useReportsConnectionMock.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    })

    const { rerender } = renderReportsSection()

    expect(screen.getByText('Rapoarte financiare')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)

    useReportsConnectionMock.mockReturnValueOnce({
      data: {
        nodes: [],
        pageInfo: {
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })

    rerender(
      <ChallengeEntityReportsSection
        locale="ro"
        entityCui="4305857"
        reportPeriod={createYearReportPeriod(2025)}
        reportType="PRINCIPAL_AGGREGATED"
      />,
    )

    expect(
      screen.getByText(/Nu am găsit rapoarte publicate pentru 2025/i),
    ).toBeInTheDocument()

    const refetchMock = vi.fn()
    useReportsConnectionMock.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: refetchMock,
    })

    rerender(
      <ChallengeEntityReportsSection
        locale="ro"
        entityCui="4305857"
        reportPeriod={createYearReportPeriod(2025)}
        reportType="PRINCIPAL_AGGREGATED"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Încearcă din nou' }))
    expect(refetchMock).toHaveBeenCalledTimes(1)
  })

  it('renders semantic download links and toggle controls', () => {
    renderReportsSection()

    expect(screen.getByRole('button', { name: 'Arată încă 1 raport' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'Descarcă PDF publicat la 31 octombrie 2025',
      }),
    ).toHaveAttribute('href', 'https://example.com/report-1.pdf')
    expect(
      screen.getByRole('link', {
        name: 'Descarcă XLSX publicat la 31 octombrie 2025',
      }),
    ).toHaveAttribute('href', 'https://example.com/report-1.xlsx')
    expect(
      screen.getByRole('link', {
        name: 'Descarcă XML publicat la 31 octombrie 2025',
      }),
    ).toHaveAttribute('href', 'https://example.com/report-1.xml')
  })

  it('uses the reporting period for quarterly filters and shows the selected period label', () => {
    renderReportsSection({
      reportPeriod: createQuarterReportPeriod(2025, 'Q2'),
    })

    expect(useReportsConnectionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          reporting_period: '2025-Q2',
          report_type: 'PRINCIPAL_AGGREGATED',
        }),
      }),
    )
    expect(screen.getByText(/Perioadă selectată 2025-Q2/i)).toBeInTheDocument()
  })

  it('passes the main creditor filter when present', () => {
    renderReportsSection({
      mainCreditorCui: '4305858',
    })

    expect(useReportsConnectionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          main_creditor_cui: '4305858',
        }),
      }),
    )
  })
})
