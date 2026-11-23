import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient, render, screen, within } from '@/test/test-utils'

const state = vi.hoisted(() => ({
  pathname: '/',
  searchStr: '',
  sentryConsent: false,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly search?: Record<string, string>
  }) => {
    const query = search ? `?${new URLSearchParams(search).toString()}` : ''
    return (
      <a href={`${to}${query}`} {...props}>
        {children}
      </a>
    )
  },
  useLocation: () => ({ pathname: state.pathname, searchStr: state.searchStr }),
}))

vi.mock('@/hooks/useSentryConsent', () => ({
  useSentryConsent: () => state.sentryConsent,
}))

// The footer is "in view" at once, so the status dot reads its feed.
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: () => {}, inView: true }),
}))

const statusFeed = (state: string) =>
  vi.fn(async () => new Response(JSON.stringify({ data: { attributes: { aggregate_state: state } } })))

const openSentryFeedback = vi.fn()
vi.mock('@/lib/sentry', () => ({
  openSentryFeedback: () => openSentryFeedback(),
}))

describe('AppFooter', () => {
  beforeEach(() => {
    state.pathname = '/'
    state.searchStr = ''
    state.sentryConsent = false
    openSentryFeedback.mockClear()
    vi.stubGlobal('fetch', statusFeed('operational'))
  })

  it('offers one navigation landmark with the project and legal links, and no list of sections', async () => {
    const { AppFooter } = await import('./AppFooter')
    render(<AppFooter />)

    const navs = screen.getAllByRole('navigation')
    expect(navs).toHaveLength(1)
    const nav = within(navs[0])

    expect(nav.getAllByRole('link')).toHaveLength(8)
    expect(nav.getByRole('link', { name: 'Politica de confidențialitate' })).toHaveAttribute('href', '/privacy')
    expect(nav.getByRole('link', { name: 'Termeni și condiții' })).toHaveAttribute('href', '/terms')
    expect(nav.getByRole('link', { name: 'Politica de cookie-uri' })).toHaveAttribute('href', '/cookie-policy')

    // Mail opens in place; pages elsewhere open in a new tab.
    const contact = nav.getByRole('link', { name: 'Contact' })
    expect(contact).toHaveAttribute('href', 'mailto:contact@transparenta.eu')
    expect(contact).not.toHaveAttribute('target')
    expect(nav.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/claudiuconstantinbogdan/')
    const github = nav.getByRole('link', { name: 'Cod sursă pe GitHub' })
    expect(github).toHaveAttribute('href', 'https://github.com/ClaudiuBogdan/hack-for-facts-eb-client')
    expect(github).toHaveAttribute('target', '_blank')
    expect(github).toHaveAttribute('rel', 'noreferrer noopener')
    expect(nav.getByRole('link', { name: /^Stare sistem/ })).toHaveAttribute('href', 'https://status.transparenta.eu')
  })

  it('sends the cookie settings link back to where the reader is', async () => {
    state.pathname = '/achizitii'
    state.searchStr = '?an=2025'
    const { AppFooter } = await import('./AppFooter')
    render(<AppFooter />)

    expect(screen.getByRole('link', { name: 'Setări cookie-uri' })).toHaveAttribute(
      'href',
      `/cookies?${new URLSearchParams({ redirect: '/achizitii?an=2025' }).toString()}`,
    )
  })

  it('names no data source: every page names its own', async () => {
    state.pathname = '/pnrr/proiecte'
    const { AppFooter } = await import('./AppFooter')
    render(<AppFooter />)
    expect(screen.queryByRole('link', { name: /mfinante|mfe\.gov/ })).not.toBeInTheDocument()
  })

  it('shows the state the status page reports, and none it could not read', async () => {
    const { AppFooter } = await import('./AppFooter')
    // Fresh clients: the state is kept for five minutes on a shared one.
    const first = render(<AppFooter />, { queryClient: createTestQueryClient() })
    const link = await screen.findByRole('link', { name: 'Stare sistem: funcțional' })
    expect(link.querySelector('[data-system-state]')).toHaveAttribute('data-system-state', 'operational')
    // Green needs no word on screen; any other state is written out.
    expect(link.querySelector('.sr-only')).toHaveTextContent(': funcțional')
    expect(fetch).toHaveBeenCalledWith('https://status.transparenta.eu/index.json')
    first.unmount()

    vi.stubGlobal('fetch', statusFeed('downtime'))
    const down = render(<AppFooter />, { queryClient: createTestQueryClient() })
    const downLink = await screen.findByRole('link', { name: 'Stare sistem: indisponibil' })
    expect(downLink.querySelector('.sr-only')).toBeNull()
    down.unmount()

    vi.stubGlobal('fetch', statusFeed('something-new'))
    const queryClient = createTestQueryClient()
    render(<AppFooter />, { queryClient })
    // Wait for the read to settle: before it, the dot is grey whatever the feed says.
    await vi.waitFor(() => expect(queryClient.getQueryState(['system-status'])?.status).toBe('success'))
    const unknown = screen.getByRole('link', { name: 'Stare sistem' })
    expect(unknown.querySelector('[data-system-state]')).toHaveAttribute('data-system-state', 'unknown')
  })

  it('offers the Sentry feedback dialog only with consent', async () => {
    const { AppFooter } = await import('./AppFooter')
    const { unmount } = render(<AppFooter />)
    expect(screen.queryByRole('button', { name: 'Trimite feedback' })).not.toBeInTheDocument()
    unmount()

    state.sentryConsent = true
    render(<AppFooter />)
    screen.getByRole('button', { name: 'Trimite feedback' }).click()
    expect(openSentryFeedback).toHaveBeenCalledTimes(1)
  })

  it('server-renders the scene as decoration and the links as content', async () => {
    const { AppFooter } = await import('./AppFooter')
    const html = renderToStaticMarkup(
      <QueryClientProvider client={createTestQueryClient()}>
        <AppFooter />
      </QueryClientProvider>,
    )

    expect(html).toContain('href="/privacy"')
    // The server does not read the status feed: the dot starts unknown.
    expect(html).toContain('data-system-state="unknown"')
    expect(html).toContain(`© ${new Date().getFullYear()} Transparenta.eu`)
    expect(html).toMatch(/class="tpz-scene" aria-hidden="true"/)
    // The artwork is gated behind the observer; only the no-script copy ships
    // the image URLs unconditionally.
    expect(html).toContain('<noscript>')
    expect(html).not.toContain('MUST_NOT_SHIP')
  })
})
