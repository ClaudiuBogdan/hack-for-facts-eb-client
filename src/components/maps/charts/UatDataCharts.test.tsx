/**
 * UatDataCharts Component Tests
 *
 * This file tests the UatDataCharts component which is a wrapper that
 * composes UatTopNBarChart, ChartPreview and UatPopulationSpendingScatterPlot.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { UatDataCharts } from './UatDataCharts'
import type { HeatmapUATDataPoint, HeatmapCountyDataPoint } from '@/schemas/heatmap'
import type { AnalyticsFilterType } from '@/schemas/charts'

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('./UatTopNBarChart', () => ({
  UatTopNBarChart: ({
    data,
    valueKey,
    nameKey,
    topN,
    chartTitle,
  }: {
    data: unknown[]
    valueKey: string
    nameKey: string
    topN: number
    chartTitle: string
  }) => (
    <div
      data-testid="top-n-bar-chart"
      data-count={data.length}
      data-value-key={valueKey}
      data-name-key={nameKey}
      data-top-n={topN}
      data-title={chartTitle}
    />
  ),
}))

vi.mock('@/components/charts/components/chart-preview/ChartPreview', () => ({
  ChartPreview: ({ chart }: { chart: { title?: string; series?: Array<{ filter?: { entity_cuis?: string[] } }> } }) => (
    <div
      data-testid="evolution-chart-preview"
      data-title={chart.title ?? ''}
      data-series-count={String(chart.series?.length ?? 0)}
      data-entity-cuis={(chart.series ?? [])
        .map((series) => series.filter?.entity_cuis?.[0])
        .filter((entityId): entityId is string => Boolean(entityId))
        .join(',')}
    />
  ),
}))

vi.mock('./UatPopulationSpendingScatterPlot', () => ({
  UatPopulationSpendingScatterPlot: ({
    data,
    chartTitle,
  }: {
    data: unknown[]
    chartTitle: string
  }) => (
    <div
      data-testid="scatter-plot"
      data-count={data.length}
      data-title={chartTitle}
    />
  ),
}))

const mockMapState: {
  filters: {
    normalization: string | undefined
    currency: string | undefined
  }
} = {
  filters: {
    normalization: 'total',
    currency: 'RON',
  },
}

vi.mock('@/hooks/useMapFilter', () => ({
  useMapFilter: () => ({
    mapState: mockMapState,
  }),
}))

vi.mock('@/lib/hooks/useUserCurrency', () => ({
  useUserCurrency: () => ['RON', vi.fn()],
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: any) => (
    <a
      href={typeof to === 'string' ? to : '/charts/$chartId'}
      data-testid="open-chart-shortcut"
      data-to={String(to)}
      data-chart-id={params?.chartId}
      data-search-chart-id={search?.chart?.id}
      {...props}
    >
      {children}
    </a>
  ),
}))

// ============================================================================
// TEST DATA
// ============================================================================

const datesEffectiveFilter = {
  account_category: 'ch',
  report_period: {
    type: 'YEAR',
    selection: {
      dates: ['2025'],
    },
  },
} as unknown as AnalyticsFilterType

const intervalEffectiveFilter = {
  account_category: 'ch',
  report_period: {
    type: 'YEAR',
    selection: {
      interval: {
        start: '2016',
        end: '2025',
      },
    },
  },
} as unknown as AnalyticsFilterType

const createUatDataPoint = (
  name: string,
  code: string,
  totalAmount: number
): HeatmapUATDataPoint => ({
  uat_id: `id-${code}`,
  uat_code: code,
  uat_name: name,
  siruta_code: `siruta-${code}`,
  county_code: 'CJ',
  county_name: 'Cluj',
  population: 100000,
  amount: totalAmount,
  total_amount: totalAmount,
  per_capita_amount: totalAmount / 100000,
})

const createCountyDataPoint = (
  countyName: string,
  countyCode: string,
  countyEntityCui: string,
  totalAmount: number
): HeatmapCountyDataPoint => ({
  county_code: countyCode,
  county_name: countyName,
  county_population: 200000,
  amount: totalAmount,
  total_amount: totalAmount,
  per_capita_amount: totalAmount / 200000,
  county_entity: {
    cui: countyEntityCui,
    name: countyName,
  },
})

const uatData = [
  createUatDataPoint('Cluj', 'cui-cluj', 1_000_000),
  createUatDataPoint('Bucharest', 'cui-bucharest', 2_000_000),
]

const countyData = [
  createCountyDataPoint('Cluj', 'CJ', 'county-cui-cluj', 1_000_000),
  createCountyDataPoint('Timis', 'TM', 'county-cui-timis', 500_000),
]

// ============================================================================
// TESTS
// ============================================================================

describe('UatDataCharts', () => {
  beforeEach(() => {
    mockMapState.filters = {
      normalization: 'total',
      currency: 'RON',
    }
  })

  describe('empty state', () => {
    it('renders empty message when data is null', () => {
      render(<UatDataCharts data={null as unknown as []} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(
        screen.getByText('No data available to display charts.')
      ).toBeInTheDocument()
    })

    it('renders empty message when data is empty array', () => {
      render(<UatDataCharts data={[]} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(
        screen.getByText('No data available to display charts.')
      ).toBeInTheDocument()
    })
  })

  describe('UAT view', () => {
    it('renders both baseline charts for UAT view', () => {
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toBeInTheDocument()
      expect(screen.getByTestId('scatter-plot')).toBeInTheDocument()
    })

    it('passes correct nameKey for UAT view', () => {
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toHaveAttribute(
        'data-name-key',
        'uat_name'
      )
    })

    it('passes data to child components', () => {
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toHaveAttribute(
        'data-count',
        '2'
      )
      expect(screen.getByTestId('scatter-plot')).toHaveAttribute(
        'data-count',
        '2'
      )
    })

    it('sets topN to 15', () => {
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toHaveAttribute(
        'data-top-n',
        '15'
      )
    })
  })

  describe('County view', () => {
    it('renders both baseline charts for County view', () => {
      render(<UatDataCharts data={countyData} mapViewType="County" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toBeInTheDocument()
      expect(screen.getByTestId('scatter-plot')).toBeInTheDocument()
    })

    it('passes correct nameKey for County view', () => {
      render(<UatDataCharts data={countyData} mapViewType="County" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toHaveAttribute(
        'data-name-key',
        'county_name'
      )
    })
  })

  describe('interval evolution chart', () => {
    it('renders evolution chart when report period is interval', () => {
      const { container } = render(
        <UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={intervalEffectiveFilter} />
      )

      expect(screen.getByTestId('evolution-chart-preview')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /open in chart editor/i })).toBeInTheDocument()
      const cards = container.querySelectorAll('.border.rounded-lg')
      expect(cards.length).toBe(3)
    })

    it('does not render evolution chart when report period uses dates mode', () => {
      const { container } = render(
        <UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />
      )

      expect(screen.queryByTestId('evolution-chart-preview')).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /open in chart editor/i })).not.toBeInTheDocument()
      const cards = container.querySelectorAll('.border.rounded-lg')
      expect(cards.length).toBe(2)
    })

    it('passes chart route shape to shortcut link', () => {
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={intervalEffectiveFilter} />)

      const shortcut = screen.getByRole('link', { name: /open in chart editor/i })
      expect(shortcut).toHaveAttribute('data-to', '/charts/$chartId')
      expect(shortcut).toHaveAttribute('data-chart-id')
      expect(shortcut).toHaveAttribute('data-search-chart-id')
      expect(shortcut.getAttribute('data-chart-id')).toBe(shortcut.getAttribute('data-search-chart-id'))
    })

    it('builds evolution series using UAT top entity codes', () => {
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={intervalEffectiveFilter} />)

      const evolutionChart = screen.getByTestId('evolution-chart-preview')
      expect(evolutionChart).toHaveAttribute('data-series-count', '2')
      expect(evolutionChart).toHaveAttribute('data-entity-cuis', 'cui-bucharest,cui-cluj')
    })

    it('builds evolution series using county entity CUIs in county view', () => {
      render(<UatDataCharts data={countyData} mapViewType="County" effectiveFilter={intervalEffectiveFilter} />)

      const evolutionChart = screen.getByTestId('evolution-chart-preview')
      expect(evolutionChart).toHaveAttribute('data-series-count', '2')
      expect(evolutionChart).toHaveAttribute('data-entity-cuis', 'county-cui-cluj,county-cui-timis')
    })
  })

  describe('normalization handling', () => {
    it('handles total normalization', () => {
      mockMapState.filters.normalization = 'total'
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toBeInTheDocument()
    })

    it('handles per_capita normalization', () => {
      mockMapState.filters.normalization = 'per_capita'
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toBeInTheDocument()
    })

    it('handles total_euro normalization', () => {
      mockMapState.filters.normalization = 'total_euro'
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toBeInTheDocument()
    })

    it('handles per_capita_euro normalization', () => {
      mockMapState.filters.normalization = 'per_capita_euro'
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toBeInTheDocument()
    })

    it('defaults to total when normalization is undefined', () => {
      mockMapState.filters.normalization = undefined
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toBeInTheDocument()
    })
  })

  describe('chart configuration', () => {
    it('passes valueKey as total_amount', () => {
      render(<UatDataCharts data={uatData} mapViewType="UAT" effectiveFilter={datesEffectiveFilter} />)

      expect(screen.getByTestId('top-n-bar-chart')).toHaveAttribute(
        'data-value-key',
        'total_amount'
      )
    })
  })
})
