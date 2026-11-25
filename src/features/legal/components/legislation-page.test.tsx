import type { ReactNode } from 'react'
import { createTestQueryClient, fireEvent, render, screen, waitFor, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegalAnalyticsArgs, LegalAnalyticsView } from '@/schemas/legal-analytics'
import { legislationAnalyticsFixture } from '../mocks/fixtures/legislation-analytics'
import { legislationFreshnessFixture } from '../mocks/fixtures/legislation-freshness'

let search: Record<string, unknown> = {}
const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search: _search, params: _params, hash: _hash, preload: _preload, ...props }: Record<string, unknown> & { readonly children: ReactNode; readonly to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
  useSearch: () => search,
  useLocation: () => ({ hash: '', pathname: '/legislation' }),
}))

vi.mock('../hooks/use-legislation', () => ({
  useLegislationFreshness: vi.fn(() => ({ data: legislationFreshnessFixture, isPending: false, isError: false })),
}))

// The site's search loads its own module after the page: not what these tests are about.
vi.mock('@/features/landing/components/search/deferred-landing-search', () => ({
  DeferredLandingSearch: () => <input aria-label="Caută" />,
}))

type Read = (view: LegalAnalyticsView, args: LegalAnalyticsArgs) => Promise<unknown> | undefined

/** What a test answers itself; any other read is the mock lane's (the committed server answers). */
let intercept: Read = () => undefined
const calls: { readonly view: LegalAnalyticsView; readonly args: LegalAnalyticsArgs }[] = []

vi.mock('../api/legal-analytics-api', async () => {
  const live = await vi.importActual<typeof import('../api/legal-analytics-api.live')>('../api/legal-analytics-api.live')
  const mock = await vi.importActual<typeof import('../api/legal-analytics-api.mock')>('../api/legal-analytics-api.mock')
  return {
    LegalAnalyticsError: live.LegalAnalyticsError,
    LEGAL_ANALYTICS_UNAVAILABLE: live.LEGAL_ANALYTICS_UNAVAILABLE,
    fetchLegalAnalytics: vi.fn((view: LegalAnalyticsView, args: LegalAnalyticsArgs) => {
      calls.push({ view, args })
      return intercept(view, args) ?? mock.fetchLegalAnalyticsMock(view, args)
    }),
  }
})

const { LegalAnalyticsError } = await import('../api/legal-analytics-api')
const { fetchLegalAnalyticsMock } = await import('../api/legal-analytics-api.mock')
const { LegislationPage } = await import('./legislation-page')

const head = legislationAnalyticsFixture.head.data
const summary = legislationAnalyticsFixture.summary.data
const ro = (n: number) => n.toLocaleString('ro-RO')

function renderPage() {
  return render(<LegislationPage />, { queryClient: createTestQueryClient() })
}

/** A figure tile's own figure, as a reader hears it (the count-up's readable copy). */
async function figureOf(key: string): Promise<string> {
  const tile = await screen.findByTestId(`legal-hub-figure-${key}`)
  await waitFor(() => expect(tile.querySelector('dd .sr-only')).not.toBeNull())
  return tile.querySelector('dd .sr-only')?.textContent ?? ''
}

describe('LegislationPage, the legislation hub', () => {
  beforeEach(() => {
    search = {}
    calls.length = 0
    intercept = () => undefined
    navigateMock.mockReset()
  })

  it('opens with the way home, the title and no tab bar', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('LegislațiaRomâniei')
    const here = screen.getByRole('navigation', { name: 'Ești aici' })
    expect(within(here).getByRole('link', { name: /Acasă/ })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('navigation', { name: 'Secțiuni Legislație' })).not.toBeInTheDocument()
  })

  it('shows each headline figure from its own field of its own answer', async () => {
    // distinct numbers, so a figure read from the wrong field cannot pass
    const expected = { acts: head.total, text: summary.withText, rules: head.totals.inStock, versions: summary.withVersions }
    expect(new Set(Object.values(expected)).size).toBe(4)
    renderPage()
    for (const [key, value] of Object.entries(expected)) expect(await figureOf(key)).toBe(ro(value))
    expect(screen.getByText('Legislația de bază')).toBeInTheDocument()
  })

  it('never puts a status figure or a status word beside the stock', async () => {
    renderPage()
    await figureOf('rules')
    const figures = screen.getByTestId('legal-hub-figures')
    expect(figures).not.toHaveTextContent(/în vigoare|valabil|azi\b|abrogat/i)
  })

  it('ranks the top five acts in the head, whatever the answer holds', async () => {
    expect(legislationAnalyticsFixture.acts.data.rows.length).toBeGreaterThan(5)
    renderPage()
    const card = await screen.findByTestId('legal-hub-head-acts')
    expect(within(card).getAllByRole('link')).toHaveLength(5)
    expect(calls.find((call) => call.view === 'acts')?.args).toEqual({ order: 'amended', limit: 5 })
  })

  it('never shows the other ranking\'s acts under a new title while it loads', async () => {
    let answerCited: (value: unknown) => void = () => undefined
    intercept = (view, args) => (view === 'acts' && args.order === 'cited' ? new Promise((resolve) => (answerCited = resolve)) : undefined)
    const page = renderPage()
    expect(await screen.findByTestId('legal-hub-head-acts')).toBeInTheDocument()
    search = { clasament: 'citate' }
    page.rerender(<LegislationPage />)
    expect(await screen.findByRole('heading', { name: 'Cele mai citate acte' })).toBeInTheDocument()
    expect(screen.queryByTestId('legal-hub-head-acts')).not.toBeInTheDocument()
    expect(screen.getByTestId('legal-hub-head-acts-pending')).toBeInTheDocument()
    answerCited(await fetchLegalAnalyticsMock('acts', { order: 'cited', limit: 5 }))
    expect(await screen.findByTestId('legal-hub-head-acts')).toBeInTheDocument()
  })

  it('writes the ranking into the address', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('radio', { name: 'Citări' }))
    const call = navigateMock.mock.calls[0]?.[0] as { search: (p: Record<string, unknown>) => Record<string, unknown> }
    expect(call.search({})).toEqual({ clasament: 'citate' })
  })

  it('keeps the rest of the page when one band fails', async () => {
    intercept = (view) => (view === 'breakdown' ? Promise.reject(new LegalAnalyticsError('failed', 'boom', 500)) : undefined)
    renderPage()
    const issuers = await screen.findByRole('region', { name: 'Cine emite' })
    expect(await within(issuers).findByText('Această parte nu s-a încărcat.')).toBeInTheDocument()
    expect(await screen.findByTestId('legal-hub-felul')).toBeInTheDocument()
    expect(await figureOf('acts')).toBe(ro(head.total))
  })

  it('says a figure did not load, never a zero', async () => {
    intercept = (view) => (view === 'summary' ? Promise.reject(new LegalAnalyticsError('failed', 'boom', 500)) : undefined)
    renderPage()
    const tile = await screen.findByTestId('legal-hub-figure-text')
    expect(await within(tile).findByText('Cifra nu s-a încărcat.')).toBeInTheDocument()
    expect(within(tile).getByText('—')).toBeInTheDocument()
  })

  it('says under mock mode that the data is a fixture', () => {
    // the unit tests run on the mock lane (VITE_LEGAL_USE_LIVE_API=false)
    renderPage()
    expect(screen.getByText('Date demonstrative (mock)')).toBeInTheDocument()
  })

  it('says when the analysis was generated, in the sources line', async () => {
    renderPage()
    const sources = screen.getByTestId('legal-hub-sources')
    await waitFor(() => expect(sources).toHaveTextContent(`Analiza: stratul ${legislationAnalyticsFixture.head.layer.layerId}, generat pe`))
  })
})
