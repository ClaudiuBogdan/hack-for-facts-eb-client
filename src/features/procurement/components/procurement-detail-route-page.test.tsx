import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProcurementRecordDetail } from '@/schemas/procurement'
import type { DetailRecord } from '../lib/detail-config'

const useProcurementRecordDetailMock = vi.fn()

vi.mock('../hooks/use-procurement-data', () => ({
  useProcurementRecordDetail: (...args: readonly unknown[]) =>
    useProcurementRecordDetailMock(...args),
}))

// The detail page itself is 100 lines of presentation over the full envelope;
// this suite is about which of the four states the container picks.
vi.mock('./procurement-detail-page', () => ({
  ProcurementDetailPage: ({ grain }: { readonly grain: string }) => (
    <article data-testid="detail-page" data-grain={grain} />
  ),
}))

import { ProcurementDetailRoutePage } from './procurement-detail-route-page'

const DETAIL = {
  record: { id: 'CT-1', sourceSystem: 'sicap', sourceUrl: null },
  related: {
    procedure: null,
    contracts: [],
    modifications: [],
    duplicates: [],
    perLotWinners: null,
    ted: null,
  },
} as unknown as ProcurementRecordDetail<DetailRecord>

function mockQuery(state: Record<string, unknown>) {
  useProcurementRecordDetailMock.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    isRefetching: false,
    error: null,
    refetch: vi.fn(),
    ...state,
  })
}

describe('ProcurementDetailRoutePage', () => {
  beforeEach(() => {
    useProcurementRecordDetailMock.mockReset()
  })

  it('shows a skeleton while the record is in flight on a client navigation', () => {
    mockQuery({ isPending: true })

    render(<ProcurementDetailRoutePage grain="contracts" id="CT-1" />)

    expect(
      screen.getByTestId('procurement-detail-skeleton'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('detail-page')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the record once the query lands', () => {
    mockQuery({ data: DETAIL })

    render(<ProcurementDetailRoutePage grain="contracts" id="CT-1" />)

    expect(screen.getByTestId('detail-page')).toHaveAttribute(
      'data-grain',
      'contracts',
    )
  })

  it('renders the server-rendered payload immediately, with no skeleton', () => {
    // SSR path: the loader awaited the fetch and handed it over, so the very
    // first client render must already be the page.
    mockQuery({ data: DETAIL })

    render(
      <ProcurementDetailRoutePage
        grain="procedures"
        id="P-1"
        initialDetail={DETAIL}
      />,
    )

    expect(useProcurementRecordDetailMock).toHaveBeenCalledWith(
      'procedures',
      'P-1',
      DETAIL,
    )
    expect(screen.getByTestId('detail-page')).toBeInTheDocument()
  })

  it('reports a failed request as an error, not as a missing record', () => {
    // A 500 is not evidence that the record is absent — claiming otherwise
    // asserts something about the data the response does not support.
    mockQuery({ isError: true, error: new Error('boom') })

    render(<ProcurementDetailRoutePage grain="contracts" id="CT-1" />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(/could not be found/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-page')).not.toBeInTheDocument()
  })

  it('reports a genuinely absent record as not found', () => {
    // The API answered and said there is no such record.
    mockQuery({ data: null })

    render(<ProcurementDetailRoutePage grain="contracts" id="CT-999" />)

    expect(screen.getByText(/could not be found/i)).toBeInTheDocument()
    expect(screen.getByText(/CT-999/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps showing the record when a background refetch fails', () => {
    // `isError` with data still present is a failed *refetch*; blowing the page
    // away for it would lose good data the user is reading.
    mockQuery({ data: DETAIL, isError: true, error: new Error('boom') })

    render(<ProcurementDetailRoutePage grain="contracts" id="CT-1" />)

    expect(screen.getByTestId('detail-page')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
