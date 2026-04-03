import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { BugetLandingPage } from './buget-landing-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: any) => {
    const query = search ? new URLSearchParams(search).toString() : ''
    const href = typeof to === 'string'
      ? `${to}${query ? `?${query}` : ''}`
      : '#'

    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

vi.mock('@/lib/analytics', () => ({
  Analytics: {
    EVENTS: {
      CampaignLandingCtaToSearchClicked: 'CampaignLandingCtaToSearchClicked',
    },
    capture: vi.fn(),
  },
}))

describe('BugetLandingPage', () => {
  it('links the campaign CTA to the canonical selector route', () => {
    render(<BugetLandingPage locale="ro" />)

    const ctaLinks = screen.getAllByRole('link', { name: /Începe provocarea/i })
    for (const link of ctaLinks) {
      expect(link).toHaveAttribute('href', '/primarie')
    }
  })

  it('renders the hashtag badge and Funky Citizens logo', () => {
    render(<BugetLandingPage locale="ro" />)

    expect(screen.getByText('#ProvocareCivică2026')).toBeInTheDocument()
    expect(screen.getByAltText('Funky Citizens')).toBeInTheDocument()
  })

  it('renders the title with exclamation mark', () => {
    render(<BugetLandingPage locale="ro" />)

    expect(screen.getByText(/bugetele locale!/)).toBeInTheDocument()
  })

  it('shows the campaign terms and conditions link on the landing page', () => {
    render(<BugetLandingPage locale="ro" />)

    expect(
      screen.getByRole('link', { name: /termenii și condițiile campaniei/i }),
    ).toHaveAttribute('href', '/provocare/termeni-si-conditii')
  })

  it('renders the FAQ section with all questions', () => {
    render(<BugetLandingPage locale="ro" />)

    expect(screen.getByText('Întrebări frecvente')).toBeInTheDocument()
    expect(screen.getByText(/Trebuie să știu ceva despre bugete/)).toBeInTheDocument()
    expect(screen.getByText(/Cât timp îmi ia pe săptămână/)).toBeInTheDocument()
    expect(screen.getByText(/Ce se întâmplă dacă mă înscriu/)).toBeInTheDocument()
  })
})
