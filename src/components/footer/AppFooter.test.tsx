import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@/test/test-utils'

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
  })

  it('offers one navigation landmark with the platform, legal and project links', async () => {
    const { AppFooter } = await import('./AppFooter')
    render(<AppFooter />)

    const navs = screen.getAllByRole('navigation')
    expect(navs).toHaveLength(1)
    const nav = within(navs[0])

    expect(nav.getByRole('link', { name: 'Analiza entităților' })).toHaveAttribute('href', '/entity-analytics')
    expect(nav.getByRole('link', { name: 'Hărți' })).toHaveAttribute('href', '/map')
    expect(nav.getByRole('link', { name: 'Grafice' })).toHaveAttribute('href', '/charts')
    expect(nav.getByRole('link', { name: 'Politica de confidențialitate' })).toHaveAttribute('href', '/privacy')
    expect(nav.getByRole('link', { name: 'Termeni și condiții' })).toHaveAttribute('href', '/terms')
    expect(nav.getByRole('link', { name: 'Politica de cookie-uri' })).toHaveAttribute('href', '/cookie-policy')

    const github = nav.getByRole('link', { name: 'Cod sursă pe GitHub' })
    expect(github).toHaveAttribute('href', 'https://github.com/ClaudiuBogdan/hack-for-facts-eb-client')
    expect(github).toHaveAttribute('rel', 'noreferrer noopener')
    expect(nav.getByRole('link', { name: 'Stare sistem' })).toHaveAttribute('href', 'https://status.transparenta.eu')
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

  it('names the data source, and the PNRR one on PNRR pages', async () => {
    const { AppFooter } = await import('./AppFooter')
    const { unmount } = render(<AppFooter />)
    expect(screen.getByRole('link', { name: 'mfinante.gov.ro' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /mfe\.gov\.ro/ })).not.toBeInTheDocument()
    unmount()

    state.pathname = '/pnrr/proiecte'
    render(<AppFooter />)
    expect(screen.getByRole('link', { name: 'mfe.gov.ro/pnrr-dashboard' })).toBeInTheDocument()
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
    const html = renderToStaticMarkup(<AppFooter />)

    expect(html).toContain('href="/privacy"')
    expect(html).toContain(`© ${new Date().getFullYear()} Transparenta.eu`)
    expect(html).toMatch(/class="tpz-scene" aria-hidden="true"/)
    // The artwork is gated behind the observer; only the no-script copy ships
    // the image URLs unconditionally.
    expect(html).toContain('<noscript>')
    expect(html).not.toContain('MUST_NOT_SHIP')
  })
})
