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
      id: 'reference-1',
      title: { ro: 'Resursă suplimentară', en: 'Additional resource' },
      description: { ro: 'Lectură suplimentară', en: 'Further reading' },
      url: 'https://example.com/reference',
      kind: 'reference',
    },
    {
      id: 'tutorial-buget-local',
      title: { ro: 'Tutorial pagină localitate', en: 'Locality page tutorial' },
      url: 'https://example.com/tutorial-local',
      kind: 'tutorial',
    },
    {
      id: 'template-1',
      title: { ro: 'Model cerere', en: 'Request template' },
      description: { ro: 'Google Doc', en: 'Google Doc' },
      url: 'https://example.com/template',
      kind: 'template',
    },
    {
      id: 'tutorial-buget-clasificatii',
      title: { ro: 'Tutorial clasificări', en: 'Budget classifications tutorial' },
      url: 'https://example.com/tutorial-classifications',
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

  it('renders guides, videos, and templates', () => {
    render(<BugetResourcesPage locale="ro" entityCui="4305857" />)

    expect(screen.getByText('Ghid buget')).toBeInTheDocument()
    expect(screen.getByText('Tutorial pagină localitate')).toBeInTheDocument()
    expect(screen.getByText('Tutorial clasificări')).toBeInTheDocument()
    expect(screen.getByText('Resursă suplimentară')).toBeInTheDocument()
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
    expect(screen.getByText('Video')).toBeInTheDocument()
    expect(screen.getByText('Modele')).toBeInTheDocument()
  })

  it('uses English group labels when locale is en', () => {
    render(<BugetResourcesPage locale="en" entityCui="4305857" />)

    expect(screen.getByText('Guides')).toBeInTheDocument()
    expect(screen.getByText('Videos')).toBeInTheDocument()
    expect(screen.getByText('Templates')).toBeInTheDocument()
  })
})
