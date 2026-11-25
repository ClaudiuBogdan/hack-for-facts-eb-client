import type { ReactNode } from 'react'
import { createTestQueryClient, render, screen, waitFor } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { LegalAnalyticsError } from '../../api/legal-analytics-api.live'
import { AnalyticsProblem } from './analytics-notes'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

vi.mock('../../hooks/use-legislation', () => ({
  useLegislationStatusCounts: vi.fn(() => ({ data: {}, isError: false })),
  useLegislationFreshness: vi.fn(() => ({ data: undefined, isError: false })),
  useLegislationFrontDoor: vi.fn(() => ({ data: undefined, isLoading: false, isError: true })),
}))

// Every analytics read is refused as the API refuses it before the first layer is published (503).
vi.mock('../../api/legal-analytics-api', async () => {
  const live = await vi.importActual<typeof import('../../api/legal-analytics-api.live')>(
    '../../api/legal-analytics-api.live',
  )
  return {
    LegalAnalyticsError: live.LegalAnalyticsError,
    LEGAL_ANALYTICS_UNAVAILABLE: live.LEGAL_ANALYTICS_UNAVAILABLE,
    fetchLegalAnalytics: vi.fn(() =>
      Promise.reject(new live.LegalAnalyticsError('unavailable', 'No legislation analytics layer is published.', 503)),
    ),
  }
})

const { LegislationAnalyticsPage } = await import('../legislation-analytics-page')
const { LegislationPage } = await import('../legislation-page')

/** The designed 503 state: no published layer yet (or the server is busy) is said calmly, never as a failure. */
describe('the analytics „not published yet" panel', () => {
  it('says the analysis is being prepared for a 503, and something else for other failures', () => {
    const { rerender } = render(<AnalyticsProblem error={new LegalAnalyticsError('unavailable', 'x', 503)} />)
    expect(screen.getByRole('status')).toHaveTextContent('Analiza se pregătește')
    rerender(<AnalyticsProblem error={new LegalAnalyticsError('invalid', 'x', 400)} />)
    expect(screen.getByRole('status')).toHaveTextContent('Întrebarea nu se potrivește')
    rerender(<AnalyticsProblem error={new Error('network')} />)
    expect(screen.getByRole('status')).toHaveTextContent('Nu am putut încărca această parte')
  })

  it('renders the panel at once when the server read was refused, as the server render does', () => {
    // first render, before any browser read settles: what the server renders
    const page = render(<LegislationAnalyticsPage analyticsUnavailable />, { queryClient: createTestQueryClient() })
    expect(screen.getByText('Analiza se pregătește')).toBeInTheDocument()
    page.unmount()
    render(<LegislationPage analyticsUnavailable />, { queryClient: createTestQueryClient() })
    expect(screen.getByText('Analiza se pregătește')).toBeInTheDocument()
  })

  it('renders no panel at first without the server refusal (placeholders until the read answers)', () => {
    render(<LegislationAnalyticsPage />, { queryClient: createTestQueryClient() })
    expect(screen.queryByText('Analiza se pregătește')).not.toBeInTheDocument()
  })

  it('shows the panel on the analysis page when no layer is published', async () => {
    render(<LegislationAnalyticsPage />, { queryClient: createTestQueryClient() })
    await waitFor(() => expect(screen.getAllByText('Analiza se pregătește').length).toBeGreaterThan(0))
    expect(screen.queryByText('acte în selecție')).not.toBeInTheDocument()
  })

  it('keeps the front door usable: search and notes stay, the analytics bands say they are being prepared', async () => {
    render(<LegislationPage />, { queryClient: createTestQueryClient() })
    await waitFor(() => expect(screen.getAllByText('Analiza se pregătește').length).toBeGreaterThan(0))
    expect(screen.getByText(/nu modifică statutul actelor pe care le vizează/)).toBeInTheDocument()
    expect(screen.queryByText('acte în corpus')).not.toBeInTheDocument()
  })
})
