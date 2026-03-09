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

vi.mock('../../hooks/use-campaign-content', () => ({
  getCampaignDefinition: () => ({
    title: {
      ro: 'Provocarea civică Bugete Locale 2026',
      en: 'Local Budgets Civic Challenge 2026',
    },
  }),
  getCampaignText: (value: { ro: string; en?: string }, locale: 'ro' | 'en') =>
    locale === 'en' ? (value.en ?? value.ro) : value.ro,
}))

describe('BugetLandingPage', () => {
  it('links the campaign CTA to the canonical selector route', () => {
    render(<BugetLandingPage locale="ro" />)

    expect(
      screen.getByRole('link', { name: /Începe provocarea/i }),
    ).toHaveAttribute('href', '/primarie')
  })
})
