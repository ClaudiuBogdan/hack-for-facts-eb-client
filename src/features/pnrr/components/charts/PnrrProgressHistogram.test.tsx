import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PnrrProgressHistogram } from './PnrrProgressHistogram'
import type { PnrrWorkerOverviewModel } from '../../workers/pnrr-worker-types'

vi.mock('recharts', () => ({
  BarChart: ({ children, data }: { readonly children: ReactNode; readonly data: readonly unknown[] }) => (
    <div data-testid="bar-chart" data-count={data.length}>
      {children}
    </div>
  ),
  Bar: ({ children }: { readonly children: ReactNode }) => (
    <div data-testid="bar">{children}</div>
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: { readonly children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}))

const HISTOGRAM: PnrrWorkerOverviewModel['histogram'] = {
  tech: {
    data: [
      { label: '0% -> 10%', count: 0, value: 0, color: '#6f6f6f' },
      { label: '50% -> 75%', count: 1, value: 100, color: '#3b82f6' },
    ],
    countCoveragePercent: 50,
    valueCoveragePercent: 50,
    validCount: 1,
    validValue: 100,
    totalRecordCount: 2,
    totalValue: 200,
  },
  fin: {
    data: [],
    countCoveragePercent: 0,
    valueCoveragePercent: 0,
    validCount: 0,
    validValue: 0,
    totalRecordCount: 2,
    totalValue: 200,
  },
  gap: {
    data: [],
    countCoveragePercent: 0,
    valueCoveragePercent: 0,
    validCount: 0,
    validValue: 0,
    totalRecordCount: 2,
    totalValue: 200,
  },
}

describe('PnrrProgressHistogram', () => {
  it('uses official record count as denominator for record-based coverage', () => {
    const { container } = render(<PnrrProgressHistogram model={HISTOGRAM} />)
    const text = container.textContent?.replace(/\s+/g, ' ').trim()

    expect(screen.getByRole('button', { name: 'Records' })).toBeInTheDocument()
    expect(text).toMatch(
      /1 of 2 (înregistrări cu date complete|records with complete data)/,
    )
    expect(text).not.toMatch(
      /1 of 1 (înregistrări cu date complete|records with complete data)/,
    )
  })
})
