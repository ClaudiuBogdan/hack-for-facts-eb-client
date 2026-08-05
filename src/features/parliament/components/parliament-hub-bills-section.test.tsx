import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { ParliamentBillSummary } from '@/schemas/parliament'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: ReactNode
    to: string
    params?: Record<string, string>
    search?: Record<string, unknown>
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const useParliamentBills = vi.fn()
const useParliamentBillActivity = vi.fn()

vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentBills: () => useParliamentBills() as unknown,
  useParliamentBillActivity: () => useParliamentBillActivity() as unknown,
}))

const { ParliamentHubBillsSection } = await import(
  './parliament-hub-bills-section'
)

const idle = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
}

function bill(billId: string): ParliamentBillSummary {
  return {
    billId,
    title: `Proiect ${billId}`,
    chamber: 'camera_deputatilor',
    lastUpdatedAt: '2026-05-13',
  } as unknown as ParliamentBillSummary
}

const NO_RECORDS = /Nu există proiecte de lege disponibile/

beforeEach(() => {
  useParliamentBills.mockReturnValue(idle)
  useParliamentBillActivity.mockReturnValue({ ...idle, data: { days: [] } })
})

describe('parliament hub bills — a failed read is not "no draft laws"', () => {
  it('renders the failure state, NOT "no bills available", when the query errors', () => {
    useParliamentBills.mockReturnValue({
      ...idle,
      isError: true,
      error: new Error('GraphQL request failed'),
    })

    render(<ParliamentHubBillsSection />)

    const alerts = screen.getAllByRole('alert')
    expect(
      alerts.some((node) =>
        /Proiectele de lege nu au putut fi încărcate/.test(
          node.textContent ?? '',
        ),
      ),
    ).toBe(true)
    expect(screen.queryByText(NO_RECORDS)).toBeNull()
  })

  it('offers a retry that refetches', () => {
    const refetch = vi.fn()
    useParliamentBills.mockReturnValue({
      ...idle,
      isError: true,
      error: new Error('boom'),
      refetch,
    })

    render(<ParliamentHubBillsSection />)
    screen.getByRole('button', { name: /Reîncearcă/ }).click()

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('still says "no bills available" for a genuinely EMPTY success', () => {
    useParliamentBills.mockReturnValue({ ...idle, data: { bills: [] } })

    render(<ParliamentHubBillsSection />)

    expect(screen.getByText(NO_RECORDS)).toBeInTheDocument()
    expect(
      screen.queryByText(/Proiectele de lege nu au putut fi încărcate/),
    ).toBeNull()
  })

  it('keeps the bills already on screen when a background refetch fails', () => {
    useParliamentBills.mockReturnValue({
      ...idle,
      isError: true,
      error: new Error('refetch failed'),
      data: { bills: [bill('b-1')] },
    })

    render(<ParliamentHubBillsSection />)

    expect(screen.getByText('Proiect b-1')).toBeInTheDocument()
    expect(
      screen.queryByText(/Proiectele de lege nu au putut fi încărcate/),
    ).toBeNull()
  })
})
