import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, render, screen, within } from '@/test/test-utils'
import { LANDING_GROUPS } from '@/features/landing/lib/landing-groups'
import { NATIONAL_FACTS, formatFact, formatValue } from '@/features/landing/lib/national-facts'
import { ANGELS, FOUNDER } from '@/features/landing/lib/people'
import { getUserLocale } from '@/lib/utils'
import { LandingPage } from './landing-page'

/** Figures are written in the active locale's separators; the test env mocks it. */
const locale = getUserLocale() === 'en' ? 'en' : 'ro'

/**
 * The page's contract, as far as a unit test can hold it.
 *
 * Two things matter here and both are about the server. First, every word on
 * the page has to be in the HTML the server sends — the reveal, the scramble
 * and the count-up all decorate text that is already there, and a reader whose
 * JavaScript never arrives gets the whole page. Second, nothing that was ever a
 * prototype marker may survive, because `yarn build:validate` greps the build
 * for it.
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, preload: _preload, ...props }: { readonly children: ReactNode; readonly to: string; readonly preload?: unknown }) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

vi.mock('@/features/campaigns/buget/components/CampaignAccessShareCard', () => ({
  CampaignLandingShareCard: () => <div>Campaign card</div>,
}))

vi.mock('@/features/parliament/components/parliament-promo-card', () => ({
  ParliamentPromoCard: () => <div>Parliament card</div>,
}))

const fetchEntityAnalytics = vi.fn()
vi.mock('@/lib/api/entity-analytics', () => ({
  fetchEntityAnalytics: (...args: readonly unknown[]) => fetchEntityAnalytics(...args),
  entityRankingFilter: (filter: unknown) => filter,
}))

vi.mock('@/features/entity-search/api/entity-search-api.live', () => ({
  searchEntitiesLive: vi.fn(),
}))

describe('LandingPage', () => {
  beforeEach(() => {
    fetchEntityAnalytics.mockReset()
    fetchEntityAnalytics.mockResolvedValue({ nodes: [], pageInfo: { totalCount: 3295, hasNextPage: false, hasPreviousPage: false } })
  })

  it('server-renders every word and nothing that must not ship', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={createTestQueryClient()}>
        <LandingPage />
      </QueryClientProvider>,
    )

    expect(html).toContain('decizii informate')
    for (const group of LANDING_GROUPS) {
      for (const entry of group.entries.filter((candidate) => candidate.gate === undefined)) {
        expect(html).toContain(`href="${entry.to}"`)
      }
    }
    for (const fact of NATIONAL_FACTS) {
      expect(html).toContain(formatFact(fact, locale))
    }
    expect(html).toContain(FOUNDER.name)
    for (const angel of ANGELS) expect(html).toContain(angel.name)

    expect(html).not.toContain('MUST_NOT_SHIP')
    expect(html).not.toContain('data-dev-marker')
    // No hidden state in the server HTML: the reveal arms client-side only.
    expect(html).not.toContain('data-reveal="pending"')
  })

  it('renders the search, the shortcuts and the index as reachable controls', () => {
    render(<LandingPage />, { queryClient: createTestQueryClient() })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/decizii informate/)
    expect(screen.getByRole('combobox')).toBeInTheDocument()

    const shortcuts = screen.getByRole('navigation', { name: 'Scurtături' })
    expect(within(shortcuts).getAllByRole('link')).toHaveLength(3)

    // Every group is a labelled section whose heading carries its real title.
    // Under test the `msg` macro is mocked to the source string itself.
    for (const group of LANDING_GROUPS) {
      const title = group.title as unknown as string
      expect(screen.getByRole('region', { name: title })).toBeInTheDocument()
    }
  })

  it('omits the institution count until it is served', async () => {
    let resolve: (value: unknown) => void = () => {}
    fetchEntityAnalytics.mockReturnValue(new Promise((r) => { resolve = r }))
    render(<LandingPage />, { queryClient: createTestQueryClient() })

    expect(screen.queryByText(/instituții cu execuție/)).not.toBeInTheDocument()
    resolve({ nodes: [], pageInfo: { totalCount: 3295, hasNextPage: false, hasPreviousPage: false } })
    expect(await screen.findByText(/instituții cu execuție/)).toBeInTheDocument()
    expect(screen.getByText(formatValue(3295, 0, locale))).toBeInTheDocument()
  })

  it('never prints a stand-in count when the request fails', async () => {
    fetchEntityAnalytics.mockRejectedValue(new Error('down'))
    render(<LandingPage />, { queryClient: createTestQueryClient() })
    // Give the query a tick to settle into its error state.
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByText(/instituții cu execuție/)).not.toBeInTheDocument()
    expect(screen.getByText(/seturi de date/)).toBeInTheDocument()
  })
})
