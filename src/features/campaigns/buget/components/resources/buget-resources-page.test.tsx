import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { BugetResourcesPage } from './buget-resources-page'

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

vi.mock('../../hooks/use-campaign-content', () => ({
  getCampaignResources: () => [
    {
      id: 'guide-1',
      title: { ro: 'Ghid buget', en: 'Budget guide' },
      url: 'https://example.com/guide',
      kind: 'guide',
    },
    {
      id: 'template-1',
      title: { ro: 'Model cerere', en: 'Request template' },
      description: { ro: 'Google Doc', en: 'Google Doc' },
      url: 'https://example.com/template',
      kind: 'template',
    },
    {
      id: 'tutorial-utilizare-platforma',
      title: { ro: 'Tutorial platforma', en: 'Platform tutorial' },
      url: 'https://example.com/tutorial',
      kind: 'tutorial',
    },
  ],
  getCampaignText: (value: { ro: string; en?: string }, locale: 'ro' | 'en') =>
    locale === 'en' ? (value.en ?? value.ro) : value.ro,
}))

vi.mock('../../constants', () => ({
  buildCampaignBudgetPath: (cui: string) => `/primarie/${cui}/buget`,
}))

describe('BugetResourcesPage', () => {
  it('renders page heading', () => {
    render(<BugetResourcesPage locale="ro" entityCui="4305857" />)

    expect(
      screen.getByRole('heading', { name: /Guides & templates/i }),
    ).toBeInTheDocument()
  })

  it('renders back link to challenges page', () => {
    render(<BugetResourcesPage locale="ro" entityCui="4305857" />)

    const backLink = screen.getByRole('link', { name: /Back to challenges/i })
    expect(backLink).toHaveAttribute('href', '/primarie/4305857/buget')
  })

  it('renders guide resources and filters out the tutorial resource', () => {
    render(<BugetResourcesPage locale="ro" entityCui="4305857" />)

    expect(screen.getByText('Ghid buget')).toBeInTheDocument()
    expect(screen.queryByText('Tutorial platforma')).not.toBeInTheDocument()
  })

  it('renders template resources with descriptions', () => {
    render(<BugetResourcesPage locale="ro" entityCui="4305857" />)

    expect(screen.getByText('Model cerere')).toBeInTheDocument()
    expect(screen.getByText('Google Doc')).toBeInTheDocument()
  })

  it('renders resource links as external links opening in new tab', () => {
    render(<BugetResourcesPage locale="ro" entityCui="4305857" />)

    const guideLink = screen.getByRole('link', { name: /Ghid buget/i })
    expect(guideLink).toHaveAttribute('href', 'https://example.com/guide')
    expect(guideLink).toHaveAttribute('target', '_blank')
    expect(guideLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows group labels for guides and templates', () => {
    render(<BugetResourcesPage locale="ro" entityCui="4305857" />)

    expect(screen.getByText('Ghiduri')).toBeInTheDocument()
    expect(screen.getByText('Modele')).toBeInTheDocument()
  })

  it('uses English group labels when locale is en', () => {
    render(<BugetResourcesPage locale="en" entityCui="4305857" />)

    expect(screen.getByText('Guides')).toBeInTheDocument()
    expect(screen.getByText('Templates')).toBeInTheDocument()
  })
})
