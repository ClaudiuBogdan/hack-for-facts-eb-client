import { render, screen } from '@/test/test-utils'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { portfolioFixture } from '@/features/public-enterprises/lib/test/portfolio-fixture'

const pageProps = vi.fn()
const navigate = vi.fn()
let search: Record<string, unknown> = {}
const loaderData = { portfolio: portfolioFixture('4270740'), seo: {} }

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useLoaderData: () => loaderData,
    useSearch: () => search,
    useNavigate: () => navigate,
  }),
  Link: ({ children }: { readonly children: unknown }) => children,
}))
vi.mock('@/features/public-enterprises/components/authority/authority-portfolio-page', () => ({
  AuthorityPortfolioPage: (props: Record<string, unknown>) => {
    pageProps(props)
    return <div data-testid="portfolio-page" />
  },
}))
vi.mock('@/features/public-enterprises/components/authority/authority-states', () => ({
  AuthorityPortfolioLoadError: ({ onRetry }: { readonly onRetry: () => void }) => (
    <button type="button" data-testid="load-error" onClick={onRetry}>
      retry
    </button>
  ),
}))

type Options = { readonly component: ComponentType; readonly notFoundComponent?: ComponentType; readonly errorComponent: ComponentType }

async function options(): Promise<Options> {
  const { Route } = await import('./$cui.lazy')
  return (Route as unknown as { readonly options: Options }).options
}

type SearchWriter = { readonly search: (previous: Record<string, unknown>) => Record<string, unknown>; readonly replace: boolean; readonly resetScroll: boolean }

describe('/public-enterprises/authorities/$cui route page', () => {
  beforeEach(() => {
    search = {}
    pageProps.mockReset()
    navigate.mockReset()
  })

  it('renders the loader’s portfolio with the address’s order and filter, the defaults filled in', async () => {
    search = { ordine: 'rezultat' }
    const { component: Page } = await options()
    render(<Page />)
    expect(screen.getByTestId('portfolio-page')).toBeInTheDocument()
    expect(pageProps.mock.lastCall?.[0]).toMatchObject({ portfolio: loaderData.portfolio, search: { ordine: 'rezultat', lista: 'toate' } })
  })

  it('writes a choice to the address in place, a default left out, without reading again', async () => {
    const { component: Page } = await options()
    render(<Page />)
    const { onSearch } = pageProps.mock.lastCall?.[0] as { readonly onSearch: (patch: Record<string, string>) => void }
    onSearch({ lista: 'inactive' })
    const first = navigate.mock.lastCall?.[0] as SearchWriter
    expect(first).toMatchObject({ replace: true, resetScroll: false })
    expect(first.search({ ordine: 'nume', lang: 'en' })).toEqual({ ordine: 'nume', lang: 'en', lista: 'inactive' })
    onSearch({ ordine: 'cifra' })
    expect((navigate.mock.lastCall?.[0] as SearchWriter).search({ ordine: 'nume', lista: 'inactive' })).toEqual({ ordine: undefined, lista: 'inactive' })
  })

  it('leaves the not-found page to the eager file, and retries a failed read by reloading the page', async () => {
    const { notFoundComponent, errorComponent: Failed } = await options()
    // A path the params reject fails before this file loads: its page is the eager route's.
    expect(notFoundComponent).toBeUndefined()
    // The retry reloads the document, which the server renders whole: a read refused for another deploy's snapshot is not asked again.
    const reload = vi.fn()
    const realLocation = window.location
    Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, reload } })
    try {
      render(<Failed />)
      screen.getByTestId('load-error').click()
      expect(reload).toHaveBeenCalled()
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
    }
  })
})
