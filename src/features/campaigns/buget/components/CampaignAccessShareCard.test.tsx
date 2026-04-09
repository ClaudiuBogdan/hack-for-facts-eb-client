import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CampaignAccessShareCard,
  CampaignLandingShareCard,
} from './CampaignAccessShareCard'

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

describe('CampaignAccessShareCard', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('renders the campaign branding and CTA link', () => {
    render(<CampaignAccessShareCard entityCui="4305857" locale="ro" />)

    const expectedHref = '/primarie/4305857/buget/provocari'

    expect(screen.getByAltText('Funky Citizens')).toBeInTheDocument()
    expect(screen.getByText('Challenges')).toBeInTheDocument()
    expect(screen.getByText('Eyes on Local Budgets')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open campaign' }),
    ).toHaveAttribute('href', expectedHref)
  })

  it('keeps the english locale on the generated campaign link', () => {
    render(<CampaignAccessShareCard entityCui="4305857" locale="en" />)

    const expectedHref = '/primarie/4305857/buget/provocari?lang=en'

    expect(
      screen.getByRole('link', { name: 'Open campaign' }),
    ).toHaveAttribute('href', expectedHref)
  })
})

describe('CampaignLandingShareCard', () => {
  it('links directly to the campaign landing page', () => {
    render(<CampaignLandingShareCard />)

    expect(
      screen.getByRole('link', { name: 'Open campaign' }),
    ).toHaveAttribute('href', '/provocare')
  })
})
