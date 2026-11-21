import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, render, screen, within } from '@/test/test-utils'
import { LANDING_GROUPS, visibleGroups } from '@/features/landing/lib/landing-groups'
import { NATIONAL_FACTS, formatFact, formatValue } from '@/features/landing/lib/national-facts'
import { MARGIN_FIELD_MIN_WIDTH_PX } from '@/features/landing/lib/margin-field'
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
  useSearch: (options?: { readonly select?: (search: Record<string, unknown>) => unknown }) => (options?.select ? options.select(address.search) : address.search),
}))

/** The address the page reads, changed by a test as a navigation would. */
const address = vi.hoisted(() => ({ search: {} as Record<string, unknown> }))

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
    // Two comboboxes: the search field, and the budget map's picker at the foot of the page.
    expect(screen.getAllByRole('combobox').filter((element) => element.tagName === 'INPUT')).toHaveLength(1)
    expect(screen.getByRole('combobox', { name: /Harta afișată/ })).toBeInTheDocument()

    const shortcuts = screen.getByRole('navigation', { name: 'Scurtături' })
    expect(within(shortcuts).getAllByRole('link')).toHaveLength(3)

    // Every group is a labelled section whose heading carries its real title.
    // Under test the `msg` macro is mocked to the source string itself.
    for (const group of visibleGroups()) {
      const title = group.title as unknown as string
      expect(screen.getByRole('region', { name: title })).toBeInTheDocument()
    }
    // The areas switched off in this build (`src/config/feature-flags.ts`) are not linked; the ones on are.
    expect(document.querySelector('a[href="/investitii-publice"]')).toBeNull()
    expect(document.querySelector('a[href="/alegeri"]')).not.toBeNull()
  })

  it('opens with the field filled from a search link, and a new term starts it afresh while the map keeps the draft', async () => {
    const user = userEvent.setup()
    try {
      address.search = { q: 'primaria cluj' }
      const page = render(<LandingPage />, { queryClient: createTestQueryClient() })
      const field = () => screen.getAllByRole<HTMLInputElement>('combobox')[0]
      expect(field()).toHaveValue('primaria cluj')
      // The reader edits; the budget map writes its own key: the draft stays.
      await user.clear(field())
      await user.type(field(), 'ciorna')
      address.search = { q: 'primaria cluj', harta: 'venituri' }
      page.rerender(<LandingPage />)
      expect(field()).toHaveValue('ciorna')
      // Another term (a link, Back): the field starts with it.
      address.search = { q: 2816464, harta: 'venituri' }
      page.rerender(<LandingPage />)
      expect(field()).toHaveValue('2816464')
      // No term: an empty field.
      address.search = { harta: 'venituri' }
      page.rerender(<LandingPage />)
      expect(field()).toHaveValue('')
    } finally {
      address.search = {}
    }
  })

  it('shows the margin field only from the breakpoint the field module names', () => {
    render(<LandingPage />, { queryClient: createTestQueryClient() })

    // The class is what hides the field; the module is what script asks. They must agree.
    const wrapper = document.querySelector('canvas[data-field-canvas]')?.closest('.hidden')
    expect(wrapper?.classList).toContain(`min-[${MARGIN_FIELD_MIN_WIDTH_PX}px]:block`)
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
