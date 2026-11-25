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
    // the unit tests run on the mock lane
    isLegalAnalyticsMock: () => true,
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

function renderPage(queryClient = createTestQueryClient()) {
  return render(<LegislationPage />, { queryClient })
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
    expect(screen.queryByRole('navigation', { name: 'Paginile legislației' })).not.toBeInTheDocument()
  })

  it('shows each headline figure from its own field of its own answer', async () => {
    // The fixture's head and summary agree on their totals; the head here is told apart from the summary, so a
    // figure read from the competing field (summary.total, head.totals.actsWithText) cannot pass.
    intercept = (view, args) =>
      view === 'head'
        ? fetchLegalAnalyticsMock('head', args).then((answer) => ({ ...answer, data: { ...answer.data, total: 230_001, totals: { ...answer.data.totals, actsWithText: 1_234 } } }))
        : undefined
    const expected = { acts: 230_001, text: summary.withText, rules: head.totals.inStock, versions: summary.withVersions }
    expect(new Set([...Object.values(expected), summary.total, 1_234]).size).toBe(6)
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
    const issuers = await screen.findByRole('region', { name: 'Actele după emitent' })
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

  it('names the sections by their data, with no running numbers', async () => {
    renderPage()
    for (const title of ['Ultimele modificări', 'Actele după fel', 'Actele după emitent', 'Acte după anul actului', 'Legături între acte', 'Numerele Monitorului Oficial']) {
      expect(await screen.findByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    }
    const bar = screen.getByRole('navigation', { name: 'Secțiunile paginii' })
    expect(bar).not.toHaveTextContent(/0\d/)
    expect(within(bar).getByRole('link', { name: 'Fel' })).toHaveAttribute('href', '#feluri')
  })

  it('keeps the reading of the kind of act in the open, by its figures', async () => {
    renderPage()
    const felul = await screen.findByTestId('legal-hub-felul')
    expect(within(felul).getByText('Numărate separat')).toBeInTheDocument()
    expect(within(felul).getByText(/Citite independent 385 de acte/)).toBeInTheDocument()
    // a share of all acts, said in the open (227.202 takes the „few" form in Romanian: „227.202 acte")
    expect(within(felul).getByText('Procente din toate cele 227.202 acte publicate.')).toBeInTheDocument()
  })

  it('gives each ordinance statistic the API gives on its own, publication to publication', async () => {
    renderPage()
    const links = await screen.findByTestId('legal-hub-links')
    expect(links).toHaveTextContent(
      'De la prima publicare în Monitorul Oficial a ordonanței la prima publicare în Monitorul Oficial a legii: mediana: 198 de zile; un sfert dintre ele: cel mult 127 de zile; un sfert: cel puțin 375 de zile; măsurate pe 4.132 de trimiteri.',
    )
  })

  it('says a sole quartile alone, and leaves out what the API does not give, never reading it as zero', async () => {
    intercept = (view, args) =>
      view === 'links'
        ? fetchLegalAnalyticsMock('links', args).then((answer) => ({
            ...answer,
            data: { ...answer.data, days: answer.data.days.map((d) => (d.kind === 'approves_ordinance' ? { ...d, median: null, p75: null } : d)) },
          }))
        : undefined
    renderPage()
    const links = await screen.findByTestId('legal-hub-links')
    expect(links).toHaveTextContent('a legii: un sfert dintre ele: cel mult 127 de zile; măsurate pe 4.132 de trimiteri.')
    expect(links).not.toHaveTextContent('mediana')
    expect(links).not.toHaveTextContent('cel puțin')
  })

  it('hides the leading acts when a refetch of them fails, never keeping names the server no longer gave', async () => {
    const client = createTestQueryClient()
    renderPage(client)
    expect(await screen.findByTestId('legal-hub-head-acts')).toBeInTheDocument()
    intercept = (view) => (view === 'acts' ? Promise.reject(new LegalAnalyticsError('failed', 'boom', 500)) : undefined)
    await client.refetchQueries({ queryKey: ['legal', 'analytics', 'acts'] }).catch(() => undefined)
    await waitFor(() => expect(screen.queryByTestId('legal-hub-head-acts')).not.toBeInTheDocument(), { timeout: 8000 })
    expect(screen.getByText('Această parte nu s-a încărcat.')).toBeInTheDocument()
  })

  it('dates the analysis by when the layer was built, not when it was published', async () => {
    intercept = (view, args) =>
      view === 'head'
        ? fetchLegalAnalyticsMock('head', args).then((answer) => ({
            ...answer,
            layer: { ...answer.layer, builtAt: '2026-11-20T10:00:00Z', publishedAt: '2026-11-24T22:39:00Z' },
          }))
        : undefined
    renderPage()
    const sources = screen.getByTestId('legal-hub-sources')
    // the build day (20), in whatever form the test locale writes a date, never the publication day (24)
    await waitFor(() => expect(sources).toHaveTextContent(/generat pe (November 20, 2026|20 noiembrie 2026)/))
    expect(sources).not.toHaveTextContent(/generat pe (November 24|24 noiembrie)/)
  })

  it('opens the Monitorul Oficial note on the publication alone', async () => {
    renderPage()
    const gazette = await screen.findByRole('region', { name: 'Numerele Monitorului Oficial' })
    fireEvent.click(within(gazette).getByRole('button', { name: 'Despre Monitorul Oficial' }))
    const note = await screen.findByRole('dialog', { name: 'Despre Monitorul Oficial' })
    expect(note).toHaveTextContent('Numerele din date, toate părțile. Un număr arată când a fost publicat un act.')
    expect(note).not.toHaveTextContent(/efecte|în vigoare|scrisă în act/)
  })

  it('makes each start card its name and its count, the stock with its provisional definition', async () => {
    renderPage()
    const start = await screen.findByTestId('legal-hub-start')
    await waitFor(() => expect(start).toHaveTextContent(`${ro(head.totals.inStock)} de acte, definiție provizorie`))
    expect(start).not.toHaveTextContent('Analiză')
  })

  it('never says a Monitorul Oficial issue makes its acts take effect', async () => {
    renderPage()
    const gazette = await screen.findByRole('region', { name: 'Numerele Monitorului Oficial' })
    expect(gazette).not.toHaveTextContent(/produce efecte/)
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
