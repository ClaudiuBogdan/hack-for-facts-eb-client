import type { ReactNode } from 'react'
import { createTestQueryClient, fireEvent, render, screen, waitFor, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegalAnalyticsArgs, LegalAnalyticsView } from '@/schemas/legal-analytics'

let search: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => search,
}))

vi.mock('../../hooks/use-legislation', () => ({
  useLegislationStatusCounts: vi.fn(() => ({ data: {}, isError: false })),
  useLegislationFreshness: vi.fn(() => ({ data: undefined, isError: false })),
}))

type Read = (view: LegalAnalyticsView, args: LegalAnalyticsArgs) => Promise<unknown> | undefined

/** What a test answers itself; any other read is the mock lane's (the committed server answers). */
let intercept: Read = () => undefined
const calls: { readonly view: LegalAnalyticsView; readonly args: LegalAnalyticsArgs }[] = []

vi.mock('../../api/legal-analytics-api', async () => {
  const live = await vi.importActual<typeof import('../../api/legal-analytics-api.live')>('../../api/legal-analytics-api.live')
  const mock = await vi.importActual<typeof import('../../api/legal-analytics-api.mock')>('../../api/legal-analytics-api.mock')
  return {
    LegalAnalyticsError: live.LegalAnalyticsError,
    LEGAL_ANALYTICS_UNAVAILABLE: live.LEGAL_ANALYTICS_UNAVAILABLE,
    fetchLegalAnalytics: vi.fn((view: LegalAnalyticsView, args: LegalAnalyticsArgs) => {
      calls.push({ view, args })
      return intercept(view, args) ?? mock.fetchLegalAnalyticsMock(view, args)
    }),
  }
})

const { LegalAnalyticsError } = await import('../../api/legal-analytics-api')
const { fetchLegalAnalyticsMock } = await import('../../api/legal-analytics-api.mock')
const { LegislationAnalyticsPage } = await import('../legislation-analytics-page')

const actsCalls = () => calls.filter((call) => call.view === 'acts').map((call) => call.args.cursor ?? null)

/** The acts view's first page, with a next page to ask for. */
async function firstPage() {
  const page = await fetchLegalAnalyticsMock('acts', {})
  return { ...page, data: { ...page.data, next: 'cursor-1' } }
}

describe('the analysis page and its reads', () => {
  beforeEach(() => {
    search = {}
    calls.length = 0
    intercept = () => undefined
  })

  it('never shows the previous question\'s figures under a new question while its answer loads', async () => {
    let answerStock: (value: unknown) => void = () => undefined
    intercept = (view, args) =>
      view === 'summary' && args.population === 'stock' ? new Promise((resolve) => (answerStock = resolve)) : undefined
    const client = createTestQueryClient()
    const page = render(<LegislationAnalyticsPage />, { queryClient: client })
    // the flow: 227.202 acts in the selection
    expect(await screen.findByText('acte în selecție')).toBeInTheDocument()
    expect(screen.getByText(/din 227\.202 \(ce s-a publicat\)/)).toBeInTheDocument()

    // the reader switches to the stock; its answer has not arrived
    search = { populatie: 'stoc' }
    page.rerender(<LegislationAnalyticsPage />)
    await waitFor(() => expect(calls.some((call) => call.view === 'summary' && call.args.population === 'stock')).toBe(true))
    // nothing of the flow's answer stands under the stock's heading
    expect(screen.queryByText('acte în selecție')).not.toBeInTheDocument()
    expect(screen.queryByText(/din 227\.202 \(ce s-a publicat\)/)).not.toBeInTheDocument()

    answerStock(await fetchLegalAnalyticsMock('summary', { population: 'stock' }))
    expect(await screen.findByText('acte în selecție')).toBeInTheDocument()
    expect(screen.getByText(/\(legislația așa cum este\)/)).toBeInTheDocument()
  })

  it('starts the acts list again from its first page when the server refuses the cursor', async () => {
    let refusals = 0
    intercept = (view, args) => {
      if (view !== 'acts') return undefined
      if (args.cursor === undefined) return firstPage()
      refusals += 1
      return Promise.reject(new LegalAnalyticsError('invalid', 'the cursor belongs to another layer', 400, 'cursor'))
    }
    render(<LegislationAnalyticsPage />, { queryClient: createTestQueryClient() })
    const acts = await screen.findByRole('region', { name: 'Actele din selecție' })
    fireEvent.click(await within(acts).findByRole('button', { name: 'Mai multe acte' }))
    // first page, the refused cursor, then the first page again: the same cursor is not sent twice
    await waitFor(() => expect(actsCalls()).toEqual([null, 'cursor-1', null]))
    expect(refusals).toBe(1)
    expect(await within(acts).findAllByRole('link')).not.toHaveLength(0)
    expect(screen.queryByText(/Întrebarea nu se potrivește/)).not.toBeInTheDocument()
  })

  it('keeps the acts already listed when the next page fails', async () => {
    intercept = (view, args) => {
      if (view !== 'acts') return undefined
      if (args.cursor === undefined) return firstPage()
      // a rate limit: refused, and not retried
      return Promise.reject(new LegalAnalyticsError('failed', 'too many requests', 429))
    }
    render(<LegislationAnalyticsPage />, { queryClient: createTestQueryClient() })
    const acts = await screen.findByRole('region', { name: 'Actele din selecție' })
    const listed = (await within(acts).findAllByRole('link')).length
    expect(listed).toBeGreaterThan(0)
    fireEvent.click(within(acts).getByRole('button', { name: 'Mai multe acte' }))
    expect(await within(acts).findByText(/Următoarele acte nu s-au încărcat/)).toBeInTheDocument()
    expect(within(acts).getAllByRole('link')).toHaveLength(listed)
    // one request for the next page, not three
    expect(actsCalls()).toEqual([null, 'cursor-1'])
    expect(within(acts).getByRole('button', { name: 'Mai multe acte' })).toBeEnabled()
  })
})
